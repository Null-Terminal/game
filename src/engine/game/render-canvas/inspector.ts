import { LoadedAnimation } from "#engine/animation";

import type { RenderCanvas } from "#engine/game/render-canvas";
import type { GameObject } from "#engine/game-objects/game-object";
import type { PlayableAnimation } from "#engine/game-objects/game-object/types";

export interface InspectionEntry {
  go: GameObject;
  left: number;
  top: number;
  right: number;
  bottom: number;
  frame: number | null;
  animation: PlayableAnimation | null;
  part: string | null;
}

interface InspectionHit {
  entry: InspectionEntry;
  drawOrder: number;
}

export class RenderCanvasInspector {
  readonly #entries: InspectionEntry[] = [];

  constructor(canvas: RenderCanvas) {
    const entries = this.#entries;

    const clear = canvas.emitter.on(canvas.events.beforeRender, () => {
      entries.length = 0;
    });

    const onClick = (event: MouseEvent) => {
      const rect = canvas.canvas.getBoundingClientRect();

      const x = (event.clientX - rect.left) * canvas.width / rect.width;
      const y = (event.clientY - rect.top) * canvas.height / rect.height;

      const hits: InspectionHit[] = [];

      for (let index = 0; index < entries.length; index++) {
        const entry = entries[index]!;

        if (entry.go.destroyed || x < entry.left || x >= entry.right || y < entry.top || y >= entry.bottom) {
          continue;
        }

        hits.push({ entry, drawOrder: index + 1 });
      }

      if (hits.length > 0) {
        const selected = event.ctrlKey ? hits : hits.slice(-1);
        console.table(selected.map(({ entry, drawOrder }) => this.#row(entry, drawOrder)));
      }
    };

    canvas.canvas.addEventListener("click", onClick, { signal: canvas.abortSignal });

    canvas.onDestroy(() => {
      clear.dispose();
      entries.length = 0;
    });
  }

  record(entry: InspectionEntry) {
    this.#entries.push(entry);
  }

  #row({ go, left, top, right, bottom, frame, animation: partAnimation, part }: InspectionEntry, drawOrder: number) {
    const playing = partAnimation;
    let animation: string | null = null;

    if (playing instanceof LoadedAnimation) {
      animation = playing.name || "animation";

    } else if (playing != null) {
      animation = playing.name || "procedural";
    }

    const layer = Object.entries(go.canvas.events).find(([, event]) => event === go.redrawEvent)?.[0] ?? "custom";

    const states: string[] = [];

    if (go.status.paused) {
      states.push("paused");
    }

    if (go.status.sleeping) {
      states.push("sleeping");
    }

    const status = states.length > 0 ? states.join(", ") : "active";

    return {
      drawOrder,
      layer,
      type: go.constructor.name,
      name: go.options.name ?? null,
      part: part ?? null,
      x: go.x,
      y: go.y,
      width: go.width,
      height: go.height,
      bbox: go.bbox?.join(", ") ?? null,
      screenBounds: `${left}, ${top}, ${right}, ${bottom}`,
      status,
      animation,
      frame: frame == null ? null : frame + 1,
      pool: go.poolPointer.join(":")
    };
  }
}
