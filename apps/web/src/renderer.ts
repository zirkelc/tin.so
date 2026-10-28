import {
  createImageMetadata,
  type Font,
  initPng,
  layout,
  loadSceneFonts,
  type Scene,
  svgToPng,
  toSvg,
  UI_FONT,
} from "@tin.so/core";
import wasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";
import { cached } from "./cache.ts";

export type ImageFormat = "png" | "svg";

export type Rendered = { scene: Scene; svg: string };

// The bundled fonts of the core package, served as static assets
const FONT_URLS = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("../../../packages/core/fonts/**/*.ttf", {
      query: "?url",
      import: "default",
      eager: true,
    }),
  ).map(([path, url]) => [path.slice(path.indexOf("/fonts/") + "/fonts/".length), url]),
);

const fontBytes = new Map<string, Promise<Uint8Array>>();
const registeredFaces = new Map<string, Promise<void>>();

// A missing file can come back as the HTML page of the app, so the type of the response must be a font
async function fetchFont(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || type.includes("text/html")) {
    throw new Error(`Could not load the font ${url}: ${response.status} ${type}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function loadFont(file: string): Promise<Uint8Array> {
  const url = FONT_URLS[file];
  if (!url) return Promise.reject(new Error(`Missing font file ${file}`));
  return cached(fontBytes, file, () => fetchFont(url));
}

/** Registers the faces of a font under the family name that the SVG uses for browsers */
async function registerFont(font: Font): Promise<void> {
  await Promise.all(
    font.faces.map((face) =>
      cached(registeredFaces, face.file, async () => {
        const fontFace = new FontFace(
          `ci-${font.id}`,
          (await loadFont(face.file)) as BufferSource,
          {
            weight: String(face.weight),
            style: face.italic ? "italic" : "normal",
          },
        );
        document.fonts.add(await fontFace.load());
      }),
    ),
  );
}

// The editor shows a new empty line at the end at once, and the image file is the same as the preview
const LAYOUT_OPTIONS = { keepTrailingLines: true };

/** Lays out a spec and writes the preview SVG, after the fonts that it uses are loaded */
export async function renderPreview(spec: unknown): Promise<Rendered> {
  const scene = await layout(spec, LAYOUT_OPTIONS);
  await Promise.all([registerFont(scene.font), registerFont(UI_FONT)]);
  return { scene, svg: toSvg(scene) };
}

/** Renders the image file. PNG uses resvg, so it is the same image that the CLI makes. */
export async function renderImage(
  spec: unknown,
  format: ImageFormat,
  scale: number,
  embedSpec: boolean,
): Promise<{ blob: Blob; width: number; height: number }> {
  const scene = await layout(spec, LAYOUT_OPTIONS);
  const fonts = await loadSceneFonts(scene, loadFont);
  // The link in the metadata opens this editor, at the address it runs on
  const metadata =
    embedSpec &&
    (await createImageMetadata(spec, `${window.location.origin}${window.location.pathname}`));

  if (format === "svg") {
    const svg = toSvg(scene, { embedFonts: fonts, metadata });
    return {
      blob: new Blob([svg], { type: "image/svg+xml" }),
      width: scene.width,
      height: scene.height,
    };
  }

  await initPng(() => fetch(wasmUrl));
  const png = await svgToPng(toSvg(scene), fonts.values(), { scale, metadata });
  return {
    blob: new Blob([png as BlobPart], { type: "image/png" }),
    width: scene.width * scale,
    height: scene.height * scale,
  };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
