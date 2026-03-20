import { Sprite } from "#sprite-editor/sprite";

const settings = document.getElementById("sprite-settings");

const grid = document.getElementById("sprite-grid");

if (!(settings instanceof HTMLFormElement) || !(grid instanceof HTMLDivElement)) {
  throw new Error("Failed to initialize sprite editor");
}

(function init(settings, grid) {
  getSettingElement("generate").addEventListener("click", (e) => {
    e.preventDefault();

    console.log("Sprite settings submitted");

    const sprite = getSettingElement("sprite");
    const length = asNum(getSettingElement("length"));

    const width = asNum(getSettingElement("width"));
    const height = asNum(getSettingElement("height"));

    void generateGrid(sprite.files![0]!, length, width, height);
  });

  getSettingElement("render").addEventListener("click", (e) => {
    e.preventDefault();

    void mergeAndDownload(
      grid.querySelectorAll("canvas")
    );

    function mergeCanvasesHorizontally(canvases: NodeListOf<HTMLCanvasElement>): Promise<HTMLCanvasElement> {
      return new Promise((resolve, reject) => {
        if (!canvases || canvases.length === 0) {
          reject(new Error("No canvases provided"));
          return;
        }

        // Вычисляем общую ширину и максимальную высоту
        let totalWidth = 0;
        let maxHeight = 0;

        for (const canvas of canvases) {
          totalWidth += canvas.width;
          maxHeight = Math.max(maxHeight, canvas.height);
        }

        // Создаем результирующий canvas
        const resultCanvas = document.createElement("canvas");
        resultCanvas.width = totalWidth;
        resultCanvas.height = maxHeight;

        const ctx = resultCanvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Cannot get 2D context"));
          return;
        }

        // Заливаем фон белым (опционально)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, totalWidth, maxHeight);

        // Рисуем каждый canvas на результирующем
        let currentX = 0;

        for (const canvas of canvases) {
          // Вычисляем позицию по Y для центрирования по вертикали
          const y = (maxHeight - canvas.height) / 2;

          ctx.drawImage(canvas, currentX, y);
          currentX += canvas.width;
        }

        resolve(resultCanvas);
      });
    }


    async function mergeAndDownload(canvases: NodeListOf<HTMLCanvasElement>, filename: string = "merged.png", format: "png" | "jpeg" = "png"): Promise<void> {
      const mergedCanvas = await mergeCanvasesHorizontally(canvases);

      const link = document.createElement("a");
      link.download = filename;
      link.href = mergedCanvas.toDataURL(`image/${format}`);
      link.click();
    }
  });

  function asNum(input: HTMLInputElement) {
    return parseInt(input.value, 10);
  }

  function getSettingElement<T extends HTMLInputElement>(name: string): T {
    const elem = settings.elements.namedItem(name);

    if (elem == null) {
      throw new Error("Failed to find settings element");
    }

    return elem as T;
  }

  async function generateGrid(file: File, length: number, width: number, height: number) {
    const frag = document.createDocumentFragment();

    for (let i = 1; i < length; i++) {
      const s = new Sprite(file, { width, height });
      frag.appendChild(s.container);
    }

    grid.appendChild(frag);
  }
})(settings, grid);
