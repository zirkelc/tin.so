import { base64UrlToBytes, bytesToBase64Url } from "./base64.ts";
import { migrateLegacySpec, stampSpecVersion } from "./migrate.ts";

/**
 * The hosted web app. The CLI takes another app from its TIN_APP_URL environment variable,
 * for example the local editor during development.
 */
export const DEFAULT_APP_URL = "https://tin.so/";

const HASH_KEY = "spec=";

export type DecodeOptions = {
  /** The largest size of the inflated spec in bytes, so that a hostile input cannot use much memory */
  maxBytes?: number;
};

async function compress(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Inflates data, or returns undefined when the data is bad or larger than the limit */
export async function inflate(
  bytes: Uint8Array,
  format: CompressionFormat,
  limit = Number.POSITIVE_INFINITY,
): Promise<Uint8Array | undefined> {
  const reader = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream(format))
    .getReader();
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
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/**
 * Compresses a spec into a URL-safe string. A spec without a version gets version 1, so that the
 * link keeps its meaning when a later version changes the format.
 */
export async function encodeSpec(spec: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(stampSpecVersion(spec)));
  return bytesToBase64Url(await compress(json));
}

/**
 * Reads a spec from a string of the encoder, with the fields of older links changed. Throws for
 * bad data and for a spec larger than the limit.
 */
export async function decodeSpec(encoded: string, options: DecodeOptions = {}): Promise<unknown> {
  const json = await inflate(base64UrlToBytes(encoded), "deflate-raw", options.maxBytes);
  if (!json) throw new Error("The link has bad data or a spec that is too large");
  return migrateLegacySpec(JSON.parse(new TextDecoder().decode(json)));
}

/**
 * A link that opens the spec in the web app. The spec is in the fragment, so it never goes to a
 * server and has no length limit of a request line.
 */
export async function createLink(spec: unknown, appUrl: string = DEFAULT_APP_URL): Promise<string> {
  const url = new URL(appUrl);
  url.hash = `${HASH_KEY}${await encodeSpec(spec)}`;
  return url.toString();
}

/** Reads the spec from the fragment of a link, or returns undefined when the fragment has none */
export async function readLink(link: string, options: DecodeOptions = {}): Promise<unknown> {
  const hash = new URL(link).hash.slice(1);
  if (!hash.startsWith(HASH_KEY)) return undefined;
  return decodeSpec(hash.slice(HASH_KEY.length), options);
}
