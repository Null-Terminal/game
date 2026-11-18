import { Camera, Game, RenderCanvas, World } from "#engine/game";
import type { WorldObjects } from "#engine/game";

const query = new URLSearchParams(location.search);

const person = import("#game/person-object");
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

const game = Game.camera(new Camera({
  smoothness: 0.3,
  deadZone: { left: 40, right: 40, top: 25, bottom: 25 },
  limit: { y: 0 }
})).create(canvas, {
  sleep: { distanceScreens: 3 },
});

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
    loading.hidden = false;
    loading.classList.add("loading-error");
    loadingMessage.textContent = "Не удалось загрузить мир";
  }
);

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

function enableDebug(objects: WorldObjects) {
  for (const [, options] of objects) {
    if (options != null) {
      options.debug = { ...options.debug, bounds: true, label: true, inspect: true };
    }
  }
}
