import type { AnimationParameters, RawAnimationParameters, SpriteRegion } from "#/animation-definition";

export class AnimationParametersForm {
  readonly #form: HTMLFormElement;

  constructor(form: HTMLFormElement) {
    this.#form = form;
  }

  read(): RawAnimationParameters | null {
    const form = this.#form;
    const durationMin = this.#input("durationMin");
    const durationMax = this.#input("durationMax");

    durationMin.setCustomValidity("");
    durationMax.setCustomValidity("");

    if ((durationMin.value === "") !== (durationMax.value === "")) {
      const missing = durationMin.value === "" ? durationMin : durationMax;
      missing.setCustomValidity("Укажите обе границы длительности кадра");
      missing.closest("details")!.open = true;
      missing.reportValidity();
      return null;
    }

    if (durationMin.value !== "" && durationMin.valueAsNumber > durationMax.valueAsNumber) {
      durationMax.setCustomValidity("Максимум должен быть не меньше минимума");
      durationMax.closest("details")!.open = true;
      durationMax.reportValidity();
      return null;
    }

    const width = this.#readRegion("Width");
    const height = this.#readRegion("Height");

    if (width === null || height === null) {
      return null;
    }

    const offsetX = this.#optionalNumber("offsetX");
    const offsetY = this.#optionalNumber("offsetY");
    const order = form.elements.namedItem("order") as HTMLSelectElement;

    const params: RawAnimationParameters = {
      speed: this.#input("speed").valueAsNumber,
      scale: this.#input("scale").valueAsNumber,
      opacity: this.#input("opacity").valueAsNumber,
      loopFrom: this.#input("loopFrom").valueAsNumber,
      order: order.value
    };

    const maxWidth = this.#optionalNumber("maxWidth");
    const maxHeight = this.#optionalNumber("maxHeight");

    if (maxWidth !== undefined) {
      params.maxWidth = maxWidth;
    }

    if (maxHeight !== undefined) {
      params.maxHeight = maxHeight;
    }

    if (durationMin.value !== "") {
      params.frameDurationRange = [durationMin.valueAsNumber, durationMax.valueAsNumber];
    }

    if (offsetX !== undefined || offsetY !== undefined) {
      params.visualOffset = {};

      if (offsetX !== undefined) {
        params.visualOffset.x = offsetX;
      }

      if (offsetY !== undefined) {
        params.visualOffset.y = offsetY;
      }
    }

    if (width !== undefined || height !== undefined) {
      params.repeat = {};

      if (width !== undefined) {
        params.repeat.width = width;
      }

      if (height !== undefined) {
        params.repeat.height = height;
      }
    }

    return params;
  }

  write(params: Readonly<AnimationParameters>) {
    const form = this.#form;

    this.#setNumber("speed", params.speed);
    this.#setNumber("scale", params.scale);
    this.#setNumber("opacity", params.opacity);
    this.#setNumber("loopFrom", params.loopFrom);
    (form.elements.namedItem("order") as HTMLSelectElement).value = params.order;

    this.#setNumber("maxWidth", params.maxWidth);
    this.#setNumber("maxHeight", params.maxHeight);
    this.#setNumber("durationMin", params.frameDurationRange?.[0]);
    this.#setNumber("durationMax", params.frameDurationRange?.[1]);
    this.#setNumber("offsetX", params.visualOffset?.x);
    this.#setNumber("offsetY", params.visualOffset?.y);

    this.#setRegion("Width", params.repeat?.width);
    this.#setRegion("Height", params.repeat?.height);

    const hasAdvancedSettings = params.opacity !== 1 || params.loopFrom !== 0 ||
      params.maxWidth != null || params.maxHeight != null || params.frameDurationRange != null ||
      params.visualOffset != null || params.repeat != null;

    form.querySelector("details")!.open = hasAdvancedSettings;
  }

  #input(name: string) {
    const element = this.#form.elements.namedItem(name);

    if (!(element instanceof HTMLInputElement)) {
      throw new Error(`Animation setting ${name} is missing`);
    }

    return element;
  }

  #optionalNumber(name: string) {
    const element = this.#input(name);
    return element.value === "" ? undefined : element.valueAsNumber;
  }

  #readRegion(axis: "Width" | "Height") {
    const names = ["X", "Y", "Width", "Height"].map((name) => `repeat${axis}${name}`);
    const fields = names.map((name) => this.#input(name));
    const filled = fields.filter((field) => field.value !== "");

    for (const field of fields) {
      field.setCustomValidity("");
    }

    if (filled.length === 0) {
      return undefined;
    }

    if (filled.length !== fields.length) {
      const missing = fields.find((field) => field.value === "")!;
      missing.setCustomValidity("Заполните все четыре координаты области повтора");
      missing.closest("details")!.open = true;
      missing.reportValidity();
      return null;
    }

    return {
      x: fields[0]!.valueAsNumber,
      y: fields[1]!.valueAsNumber,
      width: fields[2]!.valueAsNumber,
      height: fields[3]!.valueAsNumber
    };
  }

  #setNumber(name: string, value?: number) {
    const field = this.#input(name);
    field.value = value == null ? "" : String(value);
    field.setCustomValidity("");
  }

  #setRegion(axis: "Width" | "Height", region?: SpriteRegion) {
    this.#setNumber(`repeat${axis}X`, region?.x);
    this.#setNumber(`repeat${axis}Y`, region?.y);
    this.#setNumber(`repeat${axis}Width`, region?.width);
    this.#setNumber(`repeat${axis}Height`, region?.height);
  }
}
