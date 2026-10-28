import { base64UrlToBytes, bytesToBase64Url } from "./base64.ts";
import { migrateLegacySpec, stampSpecVersion } from "./migrate.ts";

/**
 * The hosted web app. The CLI takes another app from its TIN_APP_URL environment variable,
 * for example the local editor during development.
 */
export const DEFAULT_APP_URL = "https://code-image.zirkelc.workers.dev/";

const HASH_KEY = "spec=";

async function transform(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const response = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Compresses a spec into a URL-safe string. A spec without a version gets version 1, so that the
 * link keeps its meaning when a later version changes the format.
 */
export async function encodeSpec(spec: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(stampSpecVersion(spec)));
  return bytesToBase64Url(await transform(json, new CompressionStream("deflate-raw")));
}

/** Reads a spec from a string of the encoder, with the fields of older links changed */
export async function decodeSpec(encoded: string): Promise<unknown> {
  const json = await transform(base64UrlToBytes(encoded), new DecompressionStream("deflate-raw"));
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
export async function readLink(link: string): Promise<unknown> {
  const hash = new URL(link).hash.slice(1);
  if (!hash.startsWith(HASH_KEY)) return undefined;
  return decodeSpec(hash.slice(HASH_KEY.length));
}
