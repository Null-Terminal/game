export interface LoadedImage {
  readonly image: HTMLImageElement;
  readonly width: number;
  readonly height: number;
}

const imageCache = new WeakMap<File, LoadedImage>();

export function loadImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const fromCache = imageCache.get(file);

    if (fromCache != null) {
      resolve(fromCache);
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result;

      if (typeof result !== "string") {
        reject(new Error("Failed to load image"));
        return;
      }

      const image = new Image();

      image.onload = () => {
        const loadedImage = {
          image,
          width: image.width,
          height: image.height
        };

        imageCache.set(file, loadedImage);
        resolve(loadedImage);
      };

      image.onerror = (...args) => {
        reject(args.at(-1));
      };

      image.src = result;
    };

    reader.onerror = () => {
      console.error("Failed to read file");
    };

    reader.readAsDataURL(file);
  });
}
