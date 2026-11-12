export async function sampleFrameIntervals(durationSeconds: number): Promise<number[]> {
  return new Promise((resolve) => {
    const times: number[] = [];
    let previous = 0;
    let started = 0;

    function sample(now: number) {
      if (started === 0) {
        started = now;
      }

      if (previous !== 0) {
        times.push(now - previous);
      }

      previous = now;

      if (now - started < durationSeconds * 1000) {
        requestAnimationFrame(sample);

      } else {
        resolve(times);
      }
    }

    requestAnimationFrame(sample);
  });
}
