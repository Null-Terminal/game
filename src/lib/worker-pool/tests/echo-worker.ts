export interface EchoRequest {
  value: number;
  delay?: number;
  fail?: boolean;
  data?: ArrayBuffer;
}

export function createEchoWorkerUrl() {
  const source = `
    self.onmessage = ({ data: { id, payload } }) => {
      setTimeout(() => {
        if (payload.fail) {
          self.postMessage({ id, error: "Requested failure" });
        } else {
          self.postMessage({ id, value: payload.data?.byteLength ?? payload.value });
        }
      }, payload.delay ?? 0);
    };
  `;

  return URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
}
