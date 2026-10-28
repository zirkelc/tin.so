self.onmessage = (event: MessageEvent<{ n: number }>) => {
  self.postMessage(event.data.n + 1);
};
