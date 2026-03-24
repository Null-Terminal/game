export interface LoadedImage {
  readonly image: HTMLImageElement;
  readonly width: number;
  readonly height: number;
}

const imageCache = new WeakMap<File, Promise<LoadedImage>>();

export function loadImage(file: File): Promise<LoadedImage> {
  const fromCache = imageCache.get(file);

  if (fromCache != null) {
    return fromCache;
  }

  const { promise, resolve, reject } = Promise.withResolvers<LoadedImage>();

  imageCache.set(file, promise);

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

      resolve(loadedImage);
    };

    image.onerror = () => {
      reject(new Error(`Failed to load image ${result}`));
    };

    image.src = result;
  };

  reader.onerror = () => {
    reject(reader.error);
  };

  reader.readAsDataURL(file);

  return promise;
}
