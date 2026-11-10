import { METADATA_BY_DEFAULT, type SpecInput } from "@tin.so/core";
import { blobToDataUrl, type ImageFormat, renderImage } from "./renderer.ts";

/**
 * A small, versioned API on the page for agents that drive a browser. It saves them from
 * clicking buttons or reading the page structure, which can change at any time.
 */
export type TinApi = {
  version: 1;
  /** Resolves after the first preview is ready */
  ready: Promise<void>;
  getSpec: () => SpecInput;
  /** Validates the spec and shows it. Rejects with the list of issues for an invalid spec. */
  setSpec: (spec: SpecInput) => Promise<void>;
  /** Renders the current spec. PNG is the same image that the CLI makes. */
  export: (options?: {
    format?: ImageFormat;
    scale?: number;
    /** Writes the spec and an editor link into the image file */
    metadata?: boolean;
  }) => Promise<{ dataUrl: string; width: number; height: number }>;
};

declare global {
  interface Window {
    tin: TinApi;
  }
}

type Bindings = {
  getSpec: () => SpecInput;
  setSpec: (spec: SpecInput) => Promise<void>;
};

let markReady: () => void;
const ready = new Promise<void>((resolve) => (markReady = resolve));

export function markApiReady(): void {
  markReady();
}

export function installApi(bindings: Bindings): void {
  window.tin = {
    version: 1,
    ready,
    getSpec: bindings.getSpec,
    setSpec: bindings.setSpec,
    export: async ({ format = "png", scale = 2, metadata = METADATA_BY_DEFAULT } = {}) => {
      const spec = bindings.getSpec();
      const { blob, width, height } = await renderImage(spec, format, scale, metadata);
      return { dataUrl: await blobToDataUrl(blob), width, height };
    },
  };
}
