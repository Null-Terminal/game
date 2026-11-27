interface TextureEntry {
  texture: WebGLTexture;
  bytes: number;
  smoothing?: boolean;
}

// Ограничение кэша защищает долгую игру от накопления текстур прошлых уровней
const MAX_TEXTURE_BYTES = 384 * 1024 * 1024;

export class WebGLTextureCache {
  readonly #gl: WebGL2RenderingContext;
  readonly #textures = new Map<ImageBitmap, TextureEntry>();

  #bound: WebGLTexture | null = null;
  #bytes = 0;
  #uploads = 0;
  #evictions = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.#gl = gl;
  }

  get stats() {
    return {
      entries: this.#textures.size,
      bytes: this.#bytes,
      uploads: this.#uploads,
      evictions: this.#evictions
    };
  }

  bind(image: ImageBitmap, smoothing: boolean) {
    const gl = this.#gl;

    const entry = this.#get(image);

    if (entry.texture !== this.#bound) {
      gl.bindTexture(gl.TEXTURE_2D, entry.texture);
      this.#bound = entry.texture;
    }

    if (entry.smoothing !== smoothing) {
      const filter = smoothing ? gl.LINEAR : gl.NEAREST;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      entry.smoothing = smoothing;
    }
  }

  release(image: ImageBitmap) {
    const entry = this.#textures.get(image);

    if (entry == null) {
      return;
    }

    this.#textures.delete(image);
    this.#bytes -= entry.bytes;
    this.#gl.deleteTexture(entry.texture);

    if (this.#bound === entry.texture) {
      this.#bound = null;
    }
  }

  clear() {
    for (const { texture } of this.#textures.values()) {
      this.#gl.deleteTexture(texture);
    }

    this.invalidate();
  }

  // После потери WebGL-контекста старые дескрипторы уже недействительны
  invalidate() {
    this.#textures.clear();
    this.#bytes = 0;
    this.#bound = null;
  }

  #get(image: ImageBitmap): TextureEntry {
    const cached = this.#textures.get(image);

    if (cached != null) {
      // Map хранит порядок использования: старые записи удаляются первыми
      this.#textures.delete(image);
      this.#textures.set(image, cached);
      return cached;
    }

    const gl = this.#gl;
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);

    this.#bound = texture;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    this.#uploads++;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const entry = { texture, bytes: image.width * image.height * 4 };
    this.#textures.set(image, entry);
    this.#bytes += entry.bytes;

    if (this.#bytes > MAX_TEXTURE_BYTES) {
      const oldest = this.#textures.keys();

      while (this.#bytes > MAX_TEXTURE_BYTES && this.#textures.size > 1) {
        const image = oldest.next().value!;

        this.#evictions++;
        this.release(image);
      }
    }

    return entry;
  }
}
