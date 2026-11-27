import { getAudioContext, type LoadedSound } from "#engine/audio";
import { isInRange } from "#/utils/validators";

import { ifAlive } from "#engine/game-objects/decorators";
import { ServantObject } from "#engine/game-objects/servant-object";

import type { GameObject } from "#engine/game-objects/game-object";

type PlayingSource = { source: AudioBufferSourceNode; gain: GainNode };

export class GameObjectSound extends ServantObject {
  readonly #playing = new Map<LoadedSound, PlayingSource | null>();

  #volume = 1;
  #cleanup: (() => void) | null = null;

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
        playing.gain.gain.value = sound.volume * volume;
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
  }

  #startSource(sound: LoadedSound) {
    const context = getAudioContext();
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.loop = sound.loop;
    source.buffer = sound.buffer;
    source.connect(gain);

    gain.gain.value = sound.volume * this.#volume;
    gain.connect(this.go.game.audio.output(sound.category));

    const playing = { source, gain };

    source.onended = () => {
      source.disconnect();
      gain.disconnect();

      if (this.#playing.get(sound) === playing) {
        this.#playing.delete(sound);
      }
    };

    this.#playing.set(sound, playing);
    source.start();

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
}
