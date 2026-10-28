import { describe, expect, test } from "vite-plus/test";
import {
  addPngMetadata,
  createImageMetadata,
  PNG_KEYWORDS,
  readImageSpec,
  svgMetadata,
} from "../src/metadata.ts";

const SPEC = {
  theme: "vercel",
  windows: [{ panes: [{ title: "<a>.ts", code: 'const a = "]]>&";\n// ü 日本 \u001b[0m ￿' }] }],
};

// The spec as an image stores it, with the version
const STORED = { v: 1, ...SPEC };

// The smallest PNG: the signature, a header for a 1x1 image, empty image data and the end
function tinyPng(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

function chunkTypes(png: Uint8Array): Array<string> {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const types: Array<string> = [];
  for (let offset = 8; offset + 12 <= png.length; offset += 12 + view.getUint32(offset)) {
    types.push(new TextDecoder().decode(png.subarray(offset + 4, offset + 8)));
  }
  return types;
}

const encoder = new TextEncoder();

// CRC-32 of the PNG specification, for chunks that the tests build by hand
function crc32(bytes: Uint8Array): number {
  let crc = 0xffff_ffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? 0xedb8_8320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffff_ffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(encoder.encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

async function zlib(text: string): Promise<Uint8Array> {
  const stream = new Blob([encoder.encode(text)])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** A PNG of the first format: the spec as a compressed iTXt chunk and the link, after the header */
async function legacyPng(spec: unknown, link: string): Promise<Uint8Array> {
  const png = tinyPng();
  const linkChunk = chunk("tEXt", encoder.encode(`code-image:link\0${link}`));
  const specChunk = chunk(
    "iTXt",
    new Uint8Array([
      ...encoder.encode("code-image:spec"),
      0,
      1,
      0,
      0,
      0,
      ...(await zlib(JSON.stringify(spec))),
    ]),
  );
  return new Uint8Array([...png.subarray(0, 33), ...linkChunk, ...specChunk, ...png.subarray(33)]);
}

function findChunk(png: Uint8Array, keyword: string): number {
  return png.findIndex(
    (_, index) => new TextDecoder().decode(png.subarray(index, index + keyword.length)) === keyword,
  );
}

describe("addPngMetadata", () => {
  test("should put the text chunks after the header", async () => {
    // Arrange
    const metadata = await createImageMetadata(SPEC, "https://example.com/editor");

    // Act
    const png = await addPngMetadata(tinyPng(), metadata);

    // Assert
    expect(chunkTypes(png)).toEqual(["IHDR", "tEXt", "tEXt", "tEXt", "IEND"]);
  });

  test("should round trip the spec", async () => {
    // Arrange
    const png = await addPngMetadata(tinyPng(), await createImageMetadata(SPEC));

    // Act
    const spec = await readImageSpec(png);

    // Assert
    expect(spec).toEqual(STORED);
  });

  test("should store the spec only once, in the link", async () => {
    // Arrange
    const metadata = await createImageMetadata(SPEC);

    // Act
    const png = await addPngMetadata(tinyPng(), metadata);

    // Assert
    const text = new TextDecoder("latin1").decode(png);
    expect(text.includes(`${PNG_KEYWORDS.link}\0${metadata.link}`)).toBe(true);
    expect(text.includes("code-image:spec")).toBe(false);
  });

  test("should read a PNG of the first format", async () => {
    // Arrange
    const png = await legacyPng(STORED, "https://example.com/#spec=bad");

    // Act
    const spec = await readImageSpec(png);

    // Assert
    expect(spec).toEqual(STORED);
  });

  test("should read the link of a PNG of the first format when its spec chunk is bad", async () => {
    // Arrange
    const { link } = await createImageMetadata(SPEC);
    const png = await legacyPng(STORED, link);
    const index = findChunk(png, "code-image:spec");
    png[index + "code-image:spec".length + 8] ^= 0xff;

    // Act
    const spec = await readImageSpec(png);

    // Assert
    expect(spec).toEqual(STORED);
  });

  test("should keep an input that is not a PNG", async () => {
    // Arrange
    const input = new Uint8Array([1, 2, 3]);

    // Act
    const output = await addPngMetadata(input, await createImageMetadata(SPEC));

    // Assert
    expect(output).toBe(input);
  });
});

describe("svgMetadata", () => {
  test("should round trip the spec with markup and special characters", async () => {
    // Arrange
    const element = svgMetadata(await createImageMetadata(SPEC));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">${element}</svg>`;

    // Act
    const spec = await readImageSpec(svg);

    // Assert
    expect(element).not.toContain("<a>");
    expect(element).not.toContain("]]>");
    expect(element.startsWith('<metadata><tin xmlns="urn:tin.so:metadata:1"')).toBe(true);
    expect(spec).toEqual(STORED);
  });

  test("should read the spec from SVG bytes", async () => {
    // Arrange
    const svg = `<svg>${svgMetadata(await createImageMetadata(SPEC))}</svg>`;

    // Act
    const spec = await readImageSpec(new TextEncoder().encode(svg).buffer);

    // Assert
    expect(spec).toEqual(STORED);
  });
});

describe("readImageSpec", () => {
  test("should read an SVG of the first format", async () => {
    // Arrange
    const json = JSON.stringify(STORED).replaceAll("&", "&amp;").replaceAll("<", "&lt;");
    const svg = `<svg><metadata><code-image xmlns="urn:code-image:metadata:1" link="x">${json}</code-image></metadata></svg>`;

    // Act
    const spec = await readImageSpec(svg);

    // Assert
    expect(spec).toEqual(STORED);
  });

  test("should return undefined for a link that inflates past the size limit", async () => {
    // Arrange
    const huge = { windows: [{ panes: [{ code: "a".repeat(17 * 1_024 * 1_024) }] }] };
    const svg = `<svg>${svgMetadata(await createImageMetadata(huge))}</svg>`;

    // Act
    const spec = await readImageSpec(svg);

    // Assert
    expect(spec).toBe(undefined);
  });

  test("should return undefined for a PNG without metadata", async () => {
    // Act
    const spec = await readImageSpec(tinyPng());

    // Assert
    expect(spec).toBe(undefined);
  });

  test("should return undefined for an SVG without metadata", async () => {
    // Act
    const spec = await readImageSpec('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>');

    // Assert
    expect(spec).toBe(undefined);
  });

  test("should return undefined for a code-image element of another namespace", async () => {
    // Act
    const spec = await readImageSpec('<svg><code-image xmlns="x">{"a":1}</code-image></svg>');

    // Assert
    expect(spec).toBe(undefined);
  });

  test("should return undefined for a bad CRC of every chunk", async () => {
    // Arrange
    const png = await addPngMetadata(tinyPng(), await createImageMetadata(SPEC));
    const types = chunkTypes(png);
    const view = new DataView(png.buffer);
    let offset = 8;
    for (const _ of types) {
      const length = view.getUint32(offset);
      png[offset + 8 + length] ^= 0xff;
      offset += 12 + length;
    }

    // Act
    const spec = await readImageSpec(png);

    // Assert
    expect(spec).toBe(undefined);
  });

  test("should read a cut-off PNG only when the whole link chunk is left", async () => {
    // Arrange
    const png = await addPngMetadata(tinyPng(), await createImageMetadata(SPEC));
    const linkEnd = findChunk(png, "IEND") - 4;
    const lengths = Array.from({ length: png.length }, (_, length) => length);

    // Act
    const specs = await Promise.all(
      lengths.map((length) => readImageSpec(png.subarray(0, length))),
    );

    // Assert
    expect(specs.slice(0, linkEnd).every((spec) => spec === undefined)).toBe(true);
    expect(
      specs.slice(linkEnd).every((spec) => JSON.stringify(spec) === JSON.stringify(STORED)),
    ).toBe(true);
  });

  test("should return undefined for a chunk length larger than the file", async () => {
    // Arrange
    const png = tinyPng();
    new DataView(png.buffer).setUint32(33, 0xffff_ffff);

    // Act
    const spec = await readImageSpec(png);

    // Assert
    expect(spec).toBe(undefined);
  });

  test("should return undefined for a bad link", async () => {
    // Arrange
    const png = await legacyPng(STORED, "https://example.com/#spec=bad");
    const index = findChunk(png, "code-image:spec");
    png.fill(0x41, index + "code-image:spec".length + 6, index + "code-image:spec".length + 20);

    // Act
    const spec = await readImageSpec(png);

    // Assert
    expect(spec).toBe(undefined);
  });

  test("should return undefined for a bad SVG", async () => {
    // Arrange
    const inputs = [
      "",
      "<code-image ",
      '<svg><code-image xmlns="urn:code-image:metadata:1">{"a":</code-image></svg>',
      '<svg><code-image xmlns="urn:code-image:metadata:1" link="%%">&#xffffff;</code-image></svg>',
      new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
    ];

    // Act
    const specs = await Promise.all(inputs.map((input) => readImageSpec(input)));

    // Assert
    expect(specs).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });
});

describe("spec version in images", () => {
  test("should put version 1 into the metadata of a spec without a version", async () => {
    // Act
    const metadata = await createImageMetadata(SPEC);

    // Assert
    expect(metadata.spec).toEqual(STORED);
  });

  test("should keep the version of a spec in the metadata", async () => {
    // Arrange
    const spec = { ...SPEC, v: 1 };

    // Act
    const metadata = await createImageMetadata(spec);

    // Assert
    expect(metadata.spec).toBe(spec);
  });

  test("should change the chrome field of an older spec in an image", async () => {
    // Arrange
    const old = { windows: [{ chrome: "tabs", panes: [{ code: "x" }] }] };
    const svg = `<svg>${svgMetadata(await createImageMetadata(old))}</svg>`;

    // Act
    const spec = await readImageSpec(svg);

    // Assert
    expect(spec).toEqual({
      v: 1,
      windows: [{ titleBar: false, tabs: true, panes: [{ code: "x" }] }],
    });
  });
});
