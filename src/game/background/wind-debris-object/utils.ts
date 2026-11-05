import type { SeededRandom } from "#/utils/seeded-random";

import type { WindRange } from "#game/background/wind-debris-object/types";

export function sampleWindRange(random: SeededRandom, [min, max]: WindRange): number {
  return min + random.next() * (max - min);
}
