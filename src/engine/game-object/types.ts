import type { Handlers } from "#/event-emitter";

import type { BBoxTuple } from "#engine/rtree";
import type { LoadedAnimation } from "#engine/animation-loader";

export type Animations = Record<string, LoadedAnimation>;
export type AnimationEvents<T extends Animations> = { [K in keyof T]: Handlers<string> };

export interface Effects {
  scale?: number;
  speed?: number;
  flipX?: boolean;
  flipY?: boolean;
}

export type GameObjectOptions =
  {
    x?: number;
    y?: number;
    effects?: Effects;
  } |

  {
    bbox?: BBoxTuple;
    effects?: Effects;
  };
