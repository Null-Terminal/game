import type { Game } from "#engine/game";

enum State {
  Playing,
  Paused,
  Finished,
  Restarting,
}

export class GameStatus {
  static readonly State = State;

  readonly #game: Game;

  constructor(game: Game) {
    this.#game = game;
  }

  get playing() {
    return this.#game._statusValue === State.Playing;
  }

  get paused() {
    return this.#game._statusValue === State.Paused;
  }

  get finished() {
    return this.#game._statusValue === State.Finished;
  }

  get restarting() {
    return this.#game._statusValue === State.Restarting;
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
    this.#game.canvas.resume();
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
    this.restart();
  }

  restart() {
    if (this.restarting) {
      return;
    }

    this.#set(State.Restarting);
    location.reload();
  }

  #set(state: State) {
    if (this.#game.destroyed) {
      throw new Error("Game.status: called on destroyed game");
    }

    this.#game._statusValue = state;
  }
}
