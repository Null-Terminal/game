import { getAudioContext, type LoadedSound } from "#engine/audio";
import { isInRange } from "#/utils/validators";

import { ifAlive } from "#engine/game-objects/decorators";
import { ServantObject } from "#engine/game-objects/servant-object";

import type { GameObject } from "#engine/game-objects/game-object";
import type { Subscription } from "#lib/event-emitter";

type PlayingSource = { source: AudioBufferSourceNode; gain: GainNode };

export class GameObjectSound extends ServantObject {
  readonly #playing = new Map<LoadedSound, PlayingSource | null>();

  #volume = 1;
  #cleanup: (() => void) | null = null;
  #falloffUpdates: Subscription | null = null;

  get volume() {
    return this.#volume;
  }

  set volume(volume: number) {
    if (!isInRange(volume, 0, 1)) {
      throw new RangeError(`${this.constructor.name}.volume: expected a value between 0 and 1`);
    }

    this.#volume = volume;

    for (const [sound, playing] of this.#playing) {
      if (playing != null) {
        playing.gain.gain.value = this.#gainFor(sound);
      }
    }
  }

  constructor(go: GameObject) {
    super(go);
  }

  @ifAlive
  play(sound: LoadedSound) {
    if (!isInRange(sound.volume, 0, 1)) {
      throw new RangeError(`${this.constructor.name}.play: volume must be between 0 and 1`);
    }

    const { falloff } = sound;

    if (falloff != null) {
      const { near, far } = falloff;

      const validNear = Number.isFinite(near) && near >= 0;
      const validFar = Number.isFinite(far) && far > near;

      if (!validNear || !validFar) {
        throw new RangeError(`${this.constructor.name}.play: falloff must satisfy 0 <= near < far`);
      }
    }

    this.#ensureSubscribed();
    this.stop(sound);

    this.#playing.set(sound, null);
    this.#syncPlayback();
  }

  @ifAlive
  ensurePlaying(sound: LoadedSound) {
    if (!this.#playing.has(sound)) {
      this.play(sound);
    }
  }

  stop(sound: LoadedSound) {
    const playing = this.#playing.get(sound);

    if (playing != null) {
      this.#stopSource(sound, playing);
    }

    this.#playing.delete(sound);
    this.#stopFalloffUpdatesIfIdle();
  }

  reset() {
    this.#cleanup?.();
    this.#volume = 1;
  }

  #ensureSubscribed() {
    if (this.#cleanup != null) {
      return;
    }

    const { go } = this;
    const sleep = go.status.events.sleepChange.on(() => this.#syncPlayback());
    const canvasPause = go.canvas.events.pauseChange.on(() => this.#syncPlayback());

    this.#cleanup = () => {
      this.#cleanup = null;

      sleep.dispose();
      canvasPause.dispose();

      for (const sound of this.#playing.keys()) {
        this.stop(sound);
      }
    };
  }

  #syncPlayback() {
    const { go } = this;
    const { sleeping } = go.status;

    for (const [sound, playing] of this.#playing) {
      if (sleeping || go.canvas.paused) {
        if (playing != null) {
          this.#stopSource(sound, playing);
        }

        if (!sound.loop) {
          this.#playing.delete(sound);
        }

      } else if (playing == null) {
        this.#startSource(sound);
      }
    }

    this.#stopFalloffUpdatesIfIdle();
  }

  #startSource(sound: LoadedSound) {
    const context = getAudioContext();
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.loop = sound.loop;
    source.buffer = sound.buffer;
    source.connect(gain);

    gain.gain.value = this.#gainFor(sound);
    gain.connect(this.go.game.audio.output(sound.category));

    const playing = { source, gain };

    source.onended = () => {
      source.disconnect();
      gain.disconnect();

      if (this.#playing.get(sound) === playing) {
        this.#playing.delete(sound);
        this.#stopFalloffUpdatesIfIdle();
      }
    };

    this.#playing.set(sound, playing);
    source.start();

    if (sound.falloff != null) {
      this.#falloffUpdates ??= this.go.canvas.events.ui.on(() => {
        for (const [activeSound, active] of this.#playing) {
          if (active != null && activeSound.falloff != null) {
            active.gain.gain.value = this.#gainFor(activeSound);
          }
        }
      });
    }

    if (context.state === "suspended") {
      void context.resume().catch(() => {});
    }
  }

  #stopSource(sound: LoadedSound, { source, gain }: PlayingSource) {
    this.#playing.set(sound, null);
    source.stop();
    source.disconnect();
    gain.disconnect();
  }

  #gainFor(sound: LoadedSound): number {
    const volume = sound.volume * this.#volume;
    const { falloff } = sound;

    if (falloff == null) {
      return volume;
    }

    const { go } = this;
    const { camera, canvas } = go.game;
    const { target } = camera;
    const listenerX = target == null ? camera.x + canvas.width / 2 : target.x + target.width / 2;
    const listenerY = target == null ? camera.y + canvas.height / 2 : target.y + target.height / 2;
    const distance = Math.hypot(go.x + go.width / 2 - listenerX, go.y + go.height / 2 - listenerY);

    if (!Number.isFinite(distance) || distance >= falloff.far) {
      return 0;
    }

    if (distance <= falloff.near) {
      return volume;
    }

    return volume * (falloff.far - distance) / (falloff.far - falloff.near);
  }

  #stopFalloffUpdatesIfIdle() {
    if (this.#falloffUpdates == null) {
      return;
    }

    for (const [sound, playing] of this.#playing) {
      if (playing != null && sound.falloff != null) {
        return;
      }
    }

    this.#falloffUpdates.dispose();
    this.#falloffUpdates = null;
  }
}
