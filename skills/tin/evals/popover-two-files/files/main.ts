const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

worker.onmessage = (event) => console.log(event.data);
worker.postMessage({ n: 41 });
