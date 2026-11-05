import { Camera, Game, RenderCanvas, World } from "#engine/game";

const query = new URLSearchParams(location.search);

const person = import("#game/person-object");

const canvas = new RenderCanvas(document.getElementById("game") as HTMLCanvasElement, {
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#080E1F",
  showFPS: true,
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const game = Game.camera(new Camera({
  smoothness: 0.3,
  deadZone: { left: 350, right: 350, top: 250, bottom: 250 },
  limit: { y: 0 }
})).create(canvas);

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
  const { createDemoWorld } = await import("#game/world");

  const objects = createDemoWorld(query.get("seams") === "1");

  const { PersonObject } = await person;
  const player = World.of([[PersonObject, { y: 230, x: 100 }]]);

  return new World({ objects: [...objects, ...player] });
});
