import "#game/menu";
import "#game/touch-controls";

import { Camera, Game, RenderCanvas, World, type WorldObjects } from "#engine/game";
import { createGameStorage } from "#engine/storage";

import { GameInput } from "#game/input";
import { loadProjectSettings } from "#game/settings";

import type { GameMenu } from "#game/menu";
import type { GameTouchControls } from "#game/touch-controls";

const query = new URLSearchParams(location.search);

const person = import("#game/characters/person-object");
const demoWorld = import("#game/world");

const canvas = new RenderCanvas(document.getElementById("game") as HTMLCanvasElement, {
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#080E1F",
  showFPS: true,
  backend: query.get("renderer") === "2d" ? "2d" : "webgl"
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const settings = await loadProjectSettings(createGameStorage());

const game = Game
  .camera(new Camera({
    smoothness: 0.3,
    deadZone: { left: 40, right: 40, top: 25, bottom: 25 },
    limit: { y: 0 }
  }))

  .settings(settings)
  .input((game) => new GameInput(game))
  .create(canvas, { startPaused: true });

const menu = document.querySelector("game-menu") as GameMenu;
menu.mount(game, loadInitialWorld);

const touchControls = document.querySelector("game-touch-controls") as GameTouchControls;
touchControls.mount(game, game.input);

const loading = document.getElementById("loading")!;
const loadingMessage = document.getElementById("loading-message")!;

game.onLevelLoad(
  () => {
    loading.hidden = false;
    loading.classList.remove("loading-error");
    loadingMessage.textContent = "Загрузка мира…";
  },

  () => {
    loading.hidden = true;
  },

  () => {
    loading.hidden = true;
  }
);

async function loadInitialWorld() {
  await game.loadLevel(async () => {
    const { PersonObject } = await person;
    const player = World.of([[PersonObject, { y: 230, x: 100 }]]);

    if (query.get("debug") === "1") {
      enableDebug(player);
    }

    const { createDemoArenas } = await demoWorld;
    const arenas = createDemoArenas(query.get("seams") === "1", query.get("debug") === "1");

    return new World({
      persistentObjects: player,
      arenas
    });
  });
}

function enableDebug(objects: WorldObjects) {
  for (const [, options] of objects) {
    if (options != null) {
      options.debug = { ...options.debug, bounds: true, label: true, inspect: true };
    }
  }
}
