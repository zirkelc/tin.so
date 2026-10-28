import { escapeXml } from "./frames/draw.ts";
import { createLink, DEFAULT_APP_URL, readLink } from "./link.ts";
import { migrateLegacySpec, stampSpecVersion } from "./migrate.ts";

/**
 * Whether a render writes the metadata when the caller does not say. This is the one place to
 * change the default.
 */
export const METADATA_BY_DEFAULT = true;

/** The name of the program in the metadata of an image */
export const SOFTWARE = "tin.so";

/** The keywords of the PNG text chunks */
export const PNG_KEYWORDS = {
  software: "Software",
  source: "Source",
  link: "tin.so:link",
} as const;

/** The namespace of the metadata element in an SVG */
export const SVG_NAMESPACE = "urn:tin.so:metadata:1";

/**
 * The keywords and the SVG element of the first image format, which stored the spec a second time
 * next to the link. The reader still reads them, so that older images open.
 */
const LEGACY = {
  link: "code-image:link",
  spec: "code-image:spec",
  element: "code-image",
  namespace: "urn:code-image:metadata:1",
} as const;

const OUR_KEYWORDS: ReadonlySet<string> = new Set([PNG_KEYWORDS.link, LEGACY.link, LEGACY.spec]);

/**
 * The data that an exported image carries, so that the editor can open the image again. The image
 * stores only the link, because the link holds the whole spec.
 */
export type ImageMetadata = {
  /** The spec input, as the user wrote it, with its version */
  spec: unknown;
  /** A link that opens the spec in the editor */
  link: string;
};

// Limits for the reader, so that a bad or hostile file cannot use much memory
const MAX_INPUT_BYTES = 64 * 1_024 * 1_024;
const MAX_CHUNK_BYTES = 4 * 1_024 * 1_024;
const MAX_SPEC_BYTES = 16 * 1_024 * 1_024;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const IHDR_END = PNG_SIGNATURE.length + 8 + 13 + 4;

/**
 * Makes the metadata of a spec. The link opens the spec in the editor at the app URL. A spec
 * without a version gets version 1.
 */
export async function createImageMetadata(
  spec: unknown,
  appUrl: string = DEFAULT_APP_URL,
): Promise<ImageMetadata> {
  const stamped = stampSpecVersion(spec);
  return { spec: stamped, link: await createLink(stamped, appUrl) };
}

/** The app URL of a link, without the spec in the fragment */
function sourceUrl(link: string): string {
  const url = new URL(link);
  url.hash = "";
  return url.toString();
}

/** The metadata element of an SVG: the program, the app URL and the editor link */
export function svgMetadata(metadata: ImageMetadata): string {
  const attributes = [
    `xmlns="${SVG_NAMESPACE}"`,
    `software="${SOFTWARE}"`,
    `source="${escapeXml(sourceUrl(metadata.link))}"`,
    `link="${escapeXml(metadata.link)}"`,
  ].join(" ");
  return `<metadata><tin ${attributes}/></metadata>`;
}

// CRC-32 of the PNG specification
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(parts: Array<Uint8Array>): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(encoder.encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

// The keyword and the text must be ASCII, which is the same in Latin-1 and UTF-8
function textChunk(keyword: string, text: string): Uint8Array {
  return pngChunk(
    "tEXt",
    concat([encoder.encode(keyword), new Uint8Array([0]), encoder.encode(text)]),
  );
}

/** Inflates zlib data, or returns undefined when the data is bad or larger than the limit */
async function inflate(bytes: Uint8Array, limit: number): Promise<Uint8Array | undefined> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  const reader = stream.getReader();
  const parts: Array<Uint8Array> = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel().catch(() => undefined);
        return undefined;
      }
      parts.push(value);
    }
  } catch {
    return undefined;
  }
  return concat(parts);
}

function isPng(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/**
 * Adds text chunks after the header of a PNG: the program, the app URL and the editor link. A PNG
 * without the expected header comes back unchanged.
 */
export async function addPngMetadata(
  png: Uint8Array,
  metadata: ImageMetadata,
): Promise<Uint8Array> {
  if (!isPng(png) || png.length < IHDR_END || decoder.decode(png.subarray(12, 16)) !== "IHDR") {
    return png;
  }
  return concat([
    png.subarray(0, IHDR_END),
    textChunk(PNG_KEYWORDS.software, SOFTWARE),
    textChunk(PNG_KEYWORDS.source, sourceUrl(metadata.link)),
    textChunk(PNG_KEYWORDS.link, metadata.link),
    png.subarray(IHDR_END),
  ]);
}

type TextEntry = { compressed: boolean; text: Uint8Array };

/** Reads a tEXt or iTXt chunk with one of our keywords. Other chunks give undefined. */
function readTextChunk(
  type: string,
  data: Uint8Array,
): { keyword: string; entry: TextEntry } | undefined {
  const end = data.indexOf(0);
  if (end < 1 || end > 79) return undefined;
  const keyword = decoder.decode(data.subarray(0, end));
  if (!OUR_KEYWORDS.has(keyword)) return undefined;

  if (type === "tEXt")
    return { keyword, entry: { compressed: false, text: data.subarray(end + 1) } };

  // The iTXt fields after the keyword: compression flag, method, language tag and translated keyword
  const flag = data[end + 1];
  const method = data[end + 2];
  if (flag === undefined || method === undefined || (flag === 1 && method !== 0)) return undefined;
  const language = data.indexOf(0, end + 3);
  const translated = language < 0 ? -1 : data.indexOf(0, language + 1);
  if (translated < 0) return undefined;
  return { keyword, entry: { compressed: flag === 1, text: data.subarray(translated + 1) } };
}

/** Finds our text chunks in a PNG. It stops at the end of the file or at a chunk that is cut off. */
function readPngEntries(png: Uint8Array): Map<string, TextEntry> {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const entries = new Map<string, TextEntry>();
  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= png.length) {
    const length = view.getUint32(offset);
    const end = offset + 12 + length;
    if (end > png.length) break;
    const type = decoder.decode(png.subarray(offset + 4, offset + 8));
    if (type === "IEND") break;
    if ((type === "tEXt" || type === "iTXt") && length <= MAX_CHUNK_BYTES) {
      const data = png.subarray(offset + 8, offset + 8 + length);
      const found = readTextChunk(type, data);
      const crc = view.getUint32(offset + 8 + length);
      if (
        found &&
        !entries.has(found.keyword) &&
        crc === crc32(png.subarray(offset + 4, offset + 8 + length))
      ) {
        entries.set(found.keyword, found.entry);
      }
    }
    offset = end;
  }
  return entries;
}

async function entryText(entry: TextEntry | undefined): Promise<string | undefined> {
  if (!entry) return undefined;
  if (!entry.compressed) return decoder.decode(entry.text);
  const bytes = await inflate(entry.text, MAX_SPEC_BYTES);
  return bytes && decoder.decode(bytes);
}

function parseSpecJson(json: string | undefined): unknown {
  if (json === undefined) return undefined;
  try {
    const spec: unknown = JSON.parse(json);
    return typeof spec === "object" && spec !== null ? migrateLegacySpec(spec) : undefined;
  } catch {
    return undefined;
  }
}

async function specFromLink(link: string | undefined): Promise<unknown> {
  if (!link) return undefined;
  try {
    const spec = await readLink(link);
    return typeof spec === "object" && spec !== null ? spec : undefined;
  } catch {
    return undefined;
  }
}

async function readPngSpec(png: Uint8Array): Promise<unknown> {
  const entries = readPngEntries(png);
  const fromLink = await specFromLink(await entryText(entries.get(PNG_KEYWORDS.link)));
  if (fromLink !== undefined) return fromLink;
  // An image of the first format
  const legacy = parseSpecJson(await entryText(entries.get(LEGACY.spec)));
  return legacy ?? specFromLink(await entryText(entries.get(LEGACY.link)));
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function unescapeXml(text: string): string {
  return text.replace(
    /&(#x[0-9a-fA-F]{1,6}|#\d{1,7}|amp|lt|gt|quot|apos);/g,
    (match, name: string) => {
      if (!name.startsWith("#")) return ENTITIES[name]!;
      const code = name[1] === "x" ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1));
      return code <= 0x10_ffff ? String.fromCodePoint(code) : match;
    },
  );
}

/** The value of the link attribute of an element tag, unescaped */
function linkAttribute(tag: string): string | undefined {
  const link = /\slink=(?:"([^"]*)"|'([^']*)')/.exec(tag);
  return link ? unescapeXml(link[1] ?? link[2]!) : undefined;
}

function readSvgSpec(svg: string): Promise<unknown> | undefined {
  const start = svg.indexOf("<tin ");
  if (start >= 0) {
    const end = svg.indexOf(">", start);
    const tag = end < 0 ? "" : svg.slice(start, end);
    if (tag.includes(SVG_NAMESPACE)) return specFromLink(linkAttribute(tag));
  }
  return readLegacySvgSpec(svg);
}

/** An SVG of the first format, with the spec as the text of the element and the link */
function readLegacySvgSpec(svg: string): Promise<unknown> | undefined {
  const start = svg.indexOf(`<${LEGACY.element} `);
  if (start < 0) return undefined;
  const tagEnd = svg.indexOf(">", start);
  const close = svg.indexOf(`</${LEGACY.element}>`, tagEnd);
  if (tagEnd < 0 || close < 0) return undefined;
  const tag = svg.slice(start, tagEnd);
  if (!tag.includes(LEGACY.namespace)) return undefined;

  const spec = parseSpecJson(unescapeXml(svg.slice(tagEnd + 1, close)));
  if (spec !== undefined) return Promise.resolve(spec);
  return specFromLink(linkAttribute(tag));
}

/**
 * Reads the spec from a PNG or an SVG that this package made with metadata, with the fields of
 * older specs changed. It returns undefined for other images and for bad or cut-off files, and it
 * does not throw.
 */
export async function readImageSpec(
  input: Uint8Array | ArrayBuffer | Blob | string,
): Promise<unknown> {
  try {
    if (typeof input === "string") {
      return input.length > MAX_INPUT_BYTES ? undefined : await readSvgSpec(input);
    }
    const size = input instanceof Blob ? input.size : input.byteLength;
    if (size > MAX_INPUT_BYTES) return undefined;
    const bytes =
      input instanceof Blob
        ? new Uint8Array(await input.arrayBuffer())
        : input instanceof Uint8Array
          ? input
          : new Uint8Array(input);
    if (isPng(bytes)) return await readPngSpec(bytes);
    return await readSvgSpec(decoder.decode(bytes));
  } catch {
    return undefined;
  }
}
