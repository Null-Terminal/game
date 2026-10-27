/**
 * Делает прозрачными пиксели цвета фона. Для насыщенного ключа также удаляет
 * его тёмные оттенки и ослабляет цветной ореол по краям изображения.
 */
export function removeTargetColor(
  color: ArrayLike<number>,
  data: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance: number,
  expandChroma: boolean
): void {
  if (color.length !== 3 && color.length !== 4) {
    throw new TypeError("Color must have 3 (RGB) or 4 (RGBA) channels");
  }

  // У RGBA-массива четвёртый элемент — прозрачность, в расчёте цвета он не участвует
  const keyMax = Math.max(color[0]!, color[1]!, color[2]!);
  const keyMin = Math.min(color[0]!, color[1]!, color[2]!);
  const keyRange = keyMax - keyMin;

  const chromatic = expandChroma && keyRange >= 64;
  const dominant = color[0] === keyMax ? 0 : color[1] === keyMax ? 1 : 2;
  const otherChannels = [0, 1, 2].filter(channel => channel !== dominant);

  // У такого ключа один канал заметно ярче двух остальных: например, зелёный у #00ff00
  const primaryKey = chromatic &&
    keyMax - Math.max(color[otherChannels[0]!]!, color[otherChannels[1]!]!) >= 160;

  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] === 0) {
      continue;
    }

    if (matchesColor(color, data, offset, tolerance)) {
      data[offset + 3] = 0;
      continue;
    }

    if (!chromatic) {
      continue;
    }

    if (primaryKey) {
      // У тёмного фона ведущий канал всё ещё преобладает, даже если остальные примешаны
      const primaryValue = data[offset + dominant]!;
      const otherValue = Math.max(data[offset + otherChannels[0]!]!, data[offset + otherChannels[1]!]!);

      if (primaryValue >= 55 && primaryValue - otherValue >= 18) {
        data[offset + 3] = 0;
      }

    } else {
      // Для смешанного цвета сравниваем пиксель с пропорционально затемнённым ключом
      const pixelMax = Math.max(data[offset]!, data[offset + 1]!, data[offset + 2]!);
      const matchesShade = pixelMax >= 55 && pixelMax <= keyMax &&
        matchesColor(color, data, offset, tolerance, pixelMax / keyMax);

      if (matchesShade) {
        data[offset + 3] = 0;
      }
    }
  }

  if (chromatic) {
    // Вес показывает, насколько каждый канал характерен для цвета ключа
    const weights = [0, 1, 2].map(channel => (color[channel]! - keyMin) / keyRange);
    removeColorSpillAtEdges(weights, data, width, height);
  }
}

function matchesColor(
  color: ArrayLike<number>,
  data: Uint8ClampedArray,
  offset: number,
  tolerance: number,
  shade = 1
): boolean {
  return Math.abs(data[offset]! - color[0]! * shade) <= tolerance &&
    Math.abs(data[offset + 1]! - color[1]! * shade) <= tolerance &&
    Math.abs(data[offset + 2]! - color[2]! * shade) <= tolerance;
}

function removeColorSpillAtEdges(
  weights: readonly number[],
  data: Uint8ClampedArray,
  width: number,
  height: number
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;

      if (data[offset + 3] === 0) {
        continue;
      }

      let anchorMin = 255;
      let anchorMax = 0;
      let coloredMax = 0;

      for (let channel = 0; channel < 3; channel++) {
        const value = data[offset + channel]!;

        if (weights[channel]! <= 0.25) {
          anchorMin = Math.min(anchorMin, value);
          anchorMax = Math.max(anchorMax, value);

        } else {
          coloredMax = Math.max(coloredMax, value);
        }
      }

      if (anchorMin >= 80 || anchorMax >= 120 || coloredMax <= 40 || coloredMax <= anchorMin + 10) {
        continue;
      }

      // Ослабляем ореол только возле уже удалённого фона
      let nextToKey = false;

      for (let dy = -2; dy <= 2 && !nextToKey; dy++) {
        const ny = y + dy;

        if (ny < 0 || ny >= height) {
          continue;
        }

        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;

          if (nx < 0 || nx >= width) {
            continue;
          }

          if (data[(ny * width + nx) * 4 + 3] === 0) {
            nextToKey = true;
            break;
          }
        }
      }

      if (!nextToKey) {
        continue;
      }

      // Уменьшаем избыток цвета ключа, сохраняя остальные каналы пикселя
      const target = Math.round(anchorMin + (anchorMax - anchorMin) * 0.25 + 8);

      let spill = 0;

      for (let channel = 0; channel < 3; channel++) {
        const weight = weights[channel]!;

        if (weight > 0) {
          spill = Math.max(spill, (data[offset + channel]! - target) / weight);
        }
      }

      for (let channel = 0; channel < 3; channel++) {
        data[offset + channel] = Math.round(data[offset + channel]! - spill * weights[channel]!);
      }
    }
  }
}
