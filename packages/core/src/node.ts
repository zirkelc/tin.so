import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type { FontLoader } from "./fonts/index.ts";
import { layout, type Scene } from "./layout.ts";
import { createImageMetadata, METADATA_BY_DEFAULT } from "./metadata.ts";
import { initPng, loadSceneFonts, svgToPng } from "./png.ts";
import { toSvg } from "./svg.ts";

export * from "./index.ts";

export type RenderFormat = "png" | "svg";

export type RenderOptions = {
  format?: RenderFormat;
  /** Pixel ratio of a PNG */
  scale?: number;
  /** Writes the spec and an editor link into the image. false turns it off. */
  metadata?: boolean;
  /** The web app of the editor link in the metadata */
  appUrl?: string;
};

export type RenderSceneOptions = RenderOptions & {
  /** The spec of the scene. The image has metadata only when the spec is given. */
  spec?: unknown;
};

// The fonts directory is next to both src/ and dist/
const FONTS_DIR = new URL("../fonts/", import.meta.url);

export const loadFont: FontLoader = async (file) =>
  new Uint8Array(await readFile(new URL(file, FONTS_DIR)));

function wasmPath(): string {
  return createRequire(import.meta.url).resolve("@resvg/resvg-wasm/index_bg.wasm");
}

/** Renders a spec to a PNG, or to an SVG with embedded fonts */
export async function render(spec: unknown, options: RenderOptions = {}): Promise<Uint8Array> {
  return renderScene(await layout(spec), { ...options, spec });
}

/** Renders the scene of a layout, so that a caller that needs the scene lays out only once */
export async function renderScene(
  scene: Scene,
  options: RenderSceneOptions = {},
): Promise<Uint8Array> {
  const fonts = await loadSceneFonts(scene, loadFont);
  const metadata =
    options.spec !== undefined && (options.metadata ?? METADATA_BY_DEFAULT)
      ? await createImageMetadata(options.spec, options.appUrl)
      : undefined;

  if (options.format === "svg") {
    return new TextEncoder().encode(toSvg(scene, { embedFonts: fonts, metadata }));
  }

  await initPng(() => readFile(wasmPath()));
  return svgToPng(toSvg(scene), fonts.values(), { scale: options.scale, metadata });
}
