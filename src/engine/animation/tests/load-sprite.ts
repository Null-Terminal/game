import { loadSprite } from "#engine/animation/load-sprite";

export async function loadSpritePixels(removeBackground = true) {
  const source = new OffscreenCanvas(2, 1);
  const sourceContext = source.getContext("2d")!;

  sourceContext.fillStyle = "#FF0000";
  sourceContext.fillRect(0, 0, 1, 1);
  sourceContext.fillStyle = "#00FF00";
  sourceContext.fillRect(1, 0, 1, 1);

  const blob = await source.convertToBlob({ type: "image/png" });
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadSprite(url, removeBackground ? { removeBackground: "#00FF00" } : {});

    try {
      const canvas = new OffscreenCanvas(2, 1);
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);

      const red = Array.from(context.getImageData(0, 0, 1, 1).data);
      const background = Array.from(context.getImageData(1, 0, 1, 1).data);

      return { red, background };

    } finally {
      image.close();
    }

  } finally {
    URL.revokeObjectURL(url);
  }
}
