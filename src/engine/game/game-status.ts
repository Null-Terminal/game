import type { Game } from "#engine/game";
import type { World } from "#engine/game/world";

enum State {
  Playing,
  Paused,
  Finished,
  Restarting,
}

export class GameStatus {
  static readonly State = State;

  readonly #game: Game;

  #state: State = State.Playing;
  #loadingLevel = false;

  constructor(game: Game) {
    this.#game = game;
  }

  get playing() {
    return this.#state === State.Playing;
  }

  get paused() {
    return this.#state === State.Paused;
  }

  get finished() {
    return this.#state === State.Finished;
  }

  get restarting() {
    return this.#state === State.Restarting;
  }

  get loadingLevel() {
    return this.#loadingLevel;
  }

  async runLevelLoad(load: () => Promise<World>): Promise<World> {
    const game = this.#game;
    const { events } = game;

    if (game.destroyed || this.#loadingLevel) {
      throw new Error("Game.status: game is destroyed or a level is already loading");
    }

    this.#loadingLevel = true;
    game.canvas.pause();

    try {
      game.emitter.emit(events.levelLoading, null);

      let world: World;

      try {
        world = await load();

      } catch (err) {
        game.emitter.emit(events.levelLoadFailed, err);
        throw err;
      }

      game.emitter.emit(events.levelLoaded, world);
      return world;

    } finally {
      this.#loadingLevel = false;

      if (this.playing && !game.destroyed) {
        game.canvas.resume();
      }
    }
  }

  pause() {
    if (!this.playing) {
      return;
    }

    this.#set(State.Paused);
    this.#game.canvas.pause();
  }

  resume() {
    if (!this.paused) {
      return;
    }

    this.#set(State.Playing);

    if (!this.loadingLevel) {
      this.#game.canvas.resume();
    }
  }

  togglePause() {
    if (this.paused) {
      this.resume();

    } else {
      this.pause();
    }
  }

  finish() {
    if (!this.playing) {
      return;
    }

    this.#set(State.Finished);
    this.#game.canvas.pause();

    alert("Вы проиграли!");
    void this.restart().catch(console.error);
  }

  async restart() {
    if (this.restarting || this.loadingLevel) {
      return;
    }

    this.#set(State.Restarting);
    this.#game.canvas.pause();

    try {
      await this.#game.reloadLevel();
      this.#set(State.Playing);
      this.#game.canvas.resume();

    } catch (error) {
      if (!this.#game.destroyed) {
        this.#set(State.Finished);
      }

      throw error;
    }
  }

  #set(state: State) {
    if (this.#game.destroyed) {
      throw new Error("Game.status: called on destroyed game");
    }

    this.#state = state;
  }
}
