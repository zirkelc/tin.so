/**
 * Downloads the fonts as static TTF files (resvg cannot read WOFF2) together with their licenses,
 * and writes the metrics that the layout needs, so that it can place glyphs without a browser.
 */
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as fontkit from "fontkit";

type Face = { weight: number; italic: boolean };

type FontSource =
  | {
      id: string;
      name: string;
      kind: "code" | "ui";
      google: string;
      licenseDir: string;
      faces: Array<Face>;
    }
  | { id: string; name: string; kind: "code" | "ui"; github: CommitMonoSource; faces: Array<Face> };

type CommitMonoSource = { repo: string; tag: string; asset: string };

const FONTS_DIR = new URL("../fonts/", import.meta.url);
const METRICS_FILE = new URL("../src/fonts/fonts.generated.json", import.meta.url);

const regular = (weight: number): Array<Face> => [
  { weight, italic: false },
  { weight: 700, italic: false },
];
const withItalic = (weight: number): Array<Face> => [...regular(weight), { weight, italic: true }];

// The default weights match the ones ray.so uses for each font
const SOURCES: Array<FontSource> = [
  {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    kind: "code",
    google: "JetBrains Mono",
    licenseDir: "ofl/jetbrainsmono",
    faces: withItalic(500),
  },
  {
    id: "geist-mono",
    name: "Geist Mono",
    kind: "code",
    google: "Geist Mono",
    licenseDir: "ofl/geistmono",
    faces: regular(400),
  },
  {
    id: "ibm-plex-mono",
    name: "IBM Plex Mono",
    kind: "code",
    google: "IBM Plex Mono",
    licenseDir: "ofl/ibmplexmono",
    faces: withItalic(500),
  },
  {
    id: "fira-code",
    name: "Fira Code",
    kind: "code",
    google: "Fira Code",
    licenseDir: "ofl/firacode",
    faces: regular(400),
  },
  {
    id: "roboto-mono",
    name: "Roboto Mono",
    kind: "code",
    google: "Roboto Mono",
    licenseDir: "ofl/robotomono",
    faces: withItalic(400),
  },
  {
    id: "commit-mono",
    name: "Commit Mono",
    kind: "code",
    github: { repo: "eigilnikolajsen/commit-mono", tag: "v1.143", asset: "CommitMono-1.143.zip" },
    faces: withItalic(400),
  },
  {
    id: "space-mono",
    name: "Space Mono",
    kind: "code",
    google: "Space Mono",
    licenseDir: "ofl/spacemono",
    faces: withItalic(400),
  },
  {
    id: "source-code-pro",
    name: "Source Code Pro",
    kind: "code",
    google: "Source Code Pro",
    licenseDir: "ofl/sourcecodepro",
    faces: withItalic(400),
  },
  {
    id: "google-sans-code",
    name: "Google Sans Code",
    kind: "code",
    google: "Google Sans Code",
    licenseDir: "ofl/googlesanscode",
    faces: withItalic(400),
  },
  {
    id: "inter",
    name: "Inter",
    kind: "ui",
    google: "Inter",
    licenseDir: "ofl/inter",
    faces: [
      { weight: 400, italic: false },
      { weight: 500, italic: false },
    ],
  },
];

async function fetchBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function fileName(id: string, face: Face): string {
  return `${id}-${face.weight}${face.italic ? "-italic" : ""}.ttf`;
}

// Without a browser user agent, the Google Fonts API serves static TTF files
async function downloadGoogle(family: string, faces: Array<Face>): Promise<Map<string, Buffer>> {
  const axis = faces.map((face) => `${face.italic ? 1 : 0},${face.weight}`).sort();
  const url = `https://fonts.googleapis.com/css2?family=${family.replaceAll(" ", "+")}:ital,wght@${axis.join(";")}`;
  const css = (await fetchBuffer(url)).toString("utf8");

  const files = new Map<string, Buffer>();
  for (const block of css.split("@font-face").slice(1)) {
    const italic = /font-style:\s*italic/.test(block);
    const weight = Number(/font-weight:\s*(\d+)/.exec(block)?.[1]);
    const src = /url\((https:[^)]+\.ttf)\)/.exec(block)?.[1];
    if (!src) throw new Error(`No TTF source for ${family} ${weight}`);
    files.set(fileName("", { weight, italic }), await fetchBuffer(src));
  }
  return files;
}

async function downloadCommitMono(
  source: CommitMonoSource,
): Promise<{ files: Map<string, Buffer>; license: Buffer }> {
  const dir = await mkdtemp(join(tmpdir(), "commit-mono-"));
  const zip = join(dir, source.asset);
  await writeFile(
    zip,
    await fetchBuffer(
      `https://github.com/${source.repo}/releases/download/${source.tag}/${source.asset}`,
    ),
  );
  execFileSync("unzip", ["-q", "-o", zip, "-d", dir]);

  const root = join(dir, source.asset.replace(".zip", ""));
  const files = new Map<string, Buffer>();
  for (const face of withItalic(400)) {
    const name = `CommitMono-${face.weight}-${face.italic ? "Italic" : "Regular"}.ttf`;
    files.set(fileName("", face), await readFile(join(root, "ttfautohint", name)));
  }
  return { files, license: await readFile(join(root, "license.txt")) };
}

// resvg matches the typographic family (name ID 16) first, and the legacy family (name ID 1) when it is missing
function familyName(buffer: Buffer): string {
  const font = fontkit.create(buffer) as fontkit.Font;
  return font.getName("preferredFamily", "en") ?? font.familyName;
}

function measure(buffer: Buffer, kind: "code" | "ui") {
  const font = fontkit.create(buffer) as fontkit.Font;
  const metrics = {
    unitsPerEm: font.unitsPerEm,
    ascender: font.hhea.ascent,
    descender: font.hhea.descent,
    lineGap: font.hhea.lineGap,
  };

  if (kind === "code") {
    return { ...metrics, advance: font.glyphForCodePoint("0".codePointAt(0)!).advanceWidth };
  }

  // Proportional UI fonts need an advance per character to measure titles
  const advances: Record<string, number> = {};
  for (let code = 32; code < 127; code++) {
    advances[String.fromCodePoint(code)] = font.glyphForCodePoint(code).advanceWidth;
  }
  return { ...metrics, advances };
}

async function main() {
  const manifest = [];

  for (const source of SOURCES) {
    const dir = new URL(`${source.id}/`, FONTS_DIR);
    await mkdir(dir, { recursive: true });

    let files: Map<string, Buffer>;
    let license: Buffer;
    if ("google" in source) {
      files = await downloadGoogle(source.google, source.faces);
      license = await fetchBuffer(
        `https://raw.githubusercontent.com/google/fonts/main/${source.licenseDir}/OFL.txt`,
      );
    } else {
      ({ files, license } = await downloadCommitMono(source.github));
    }

    const faces = [];
    for (const face of source.faces) {
      const buffer = files.get(fileName("", face));
      if (!buffer)
        throw new Error(
          `Missing face ${face.weight} ${face.italic ? "italic" : ""} for ${source.id}`,
        );
      const file = fileName(source.id, face);
      await writeFile(new URL(file, dir), buffer);
      faces.push({ ...face, file: `${source.id}/${file}`, family: familyName(buffer) });
    }
    await writeFile(new URL("LICENSE.txt", dir), license);

    const primary = files.get(fileName("", source.faces[0]))!;
    manifest.push({
      id: source.id,
      name: source.name,
      kind: source.kind,
      faces,
      metrics: measure(primary, source.kind),
    });
    console.log(`Downloaded ${source.name} (${faces.length} faces)`);
  }

  await writeFile(METRICS_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
}

await main();
