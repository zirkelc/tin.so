import { initWasm, type InitInput, Resvg } from "@resvg/resvg-wasm";
import { type FontLoader, UI_FONT } from "./fonts/index.ts";
import type { Scene } from "./layout.ts";
import { addPngMetadata, type ImageMetadata } from "./metadata.ts";

export type PngOptions = {
  /** Pixel ratio of the image. The default 2 matches a retina screen. */
  scale?: number;
  /** Writes text chunks with the spec and the editor link. false or no value writes none. */
  metadata?: ImageMetadata | false;
};

let initialized: Promise<void> | undefined;

/**
 * Loads the resvg WebAssembly module once. Call it before the first PNG render. The function gives
 * the module only when it is not loaded yet, and a failed load runs again on the next call.
 */
export function initPng(load: () => InitInput | Promise<InitInput>): Promise<void> {
  if (!initialized) {
    const loading = Promise.resolve()
      .then(load)
      .then((wasm) => initWasm(wasm));
    initialized = loading;
    loading.catch(() => {
      if (initialized === loading) initialized = undefined;
    });
  }
  return initialized;
}

/** The font files that a scene uses, by their path relative to the fonts directory */
export function sceneFontFiles(scene: Scene): Array<string> {
  return [...scene.font.faces, ...UI_FONT.faces].map((face) => face.file);
}

export async function loadSceneFonts(
  scene: Scene,
  loadFont: FontLoader,
): Promise<Map<string, Uint8Array>> {
  const files = sceneFontFiles(scene);
  const buffers = await Promise.all(files.map(loadFont));
  return new Map(files.map((file, index) => [file, buffers[index]!]));
}

/** Rasterizes an SVG of a scene. The fonts must contain every face that the SVG uses. */
export async function svgToPng(
  svg: string,
  fonts: Iterable<Uint8Array>,
  options: PngOptions = {},
): Promise<Uint8Array> {
  if (!initialized) throw new Error("The PNG renderer is not ready: call initPng() first");
  await initialized;

  const resvg = new Resvg(svg, {
    fitTo: { mode: "zoom", value: options.scale ?? 2 },
    font: { fontBuffers: [...fonts] },
  });
  let png: Uint8Array;
  try {
    const image = resvg.render();
    png = image.asPng();
    image.free();
  } finally {
    resvg.free();
  }
  return options.metadata ? addPngMetadata(png, options.metadata) : png;
}
