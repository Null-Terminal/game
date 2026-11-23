let context: AudioContext | null = null;

const sounds = new Map<string, Promise<AudioBuffer>>();

export interface LoadedSound {
  readonly buffer: AudioBuffer;
  readonly loop: boolean;
  readonly volume: number;
  readonly category?: "effects" | "music";
}

export function getAudioContext(): AudioContext {
  if (context != null) {
    return context;
  }

  context = new AudioContext();

  const resume = () => {
    if (context?.state === "suspended") {
      void context.resume().catch(() => {});
    }
  };

  document.addEventListener("keydown", resume, { capture: true });
  document.addEventListener("pointerdown", resume, { capture: true });

  return context;
}

export function loadSound(url: string): Promise<AudioBuffer> {
  const existing = sounds.get(url);

  if (existing != null) {
    return existing;
  }

  const pending = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Cannot load sound "${url}": HTTP ${response.status}`);
    }

    return getAudioContext().decodeAudioData(await response.arrayBuffer());
  });

  sounds.set(url, pending);
  void pending.catch(() => sounds.delete(url));

  return pending;
}
