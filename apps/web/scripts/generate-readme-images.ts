/**
 * Writes the example images of the README to docs/images: each image is a spec that the renderer
 * draws, and the theme grid puts one small image of each theme next to the others.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import {
  BACKGROUNDS,
  initPng,
  layout,
  loadFont,
  loadSceneFonts,
  render,
  svgToPng,
  THEMES,
  toSvg,
  UI_FONT,
} from "@tin.so/core/node";

const OUT = new URL("../../../docs/images/", import.meta.url);
const SCHEMA = "https://tin.so/schema/v1.json";

await initPng(() =>
  readFile(createRequire(import.meta.url).resolve("@resvg/resvg-wasm/index_bg.wasm")),
);
await mkdir(OUT, { recursive: true });

// Places an SVG in the outer one, in place of its own size. Its ids get a prefix, because the
// images of the renderer use the same ids for their gradients and clip paths.
let nestedCount = 0;
function nested(source: string, x: number, y: number, width: number, height: number): string {
  const prefix = `n${nestedCount++}-`;
  const svg = source
    .replace(/ id="([^"]+)"/g, ` id="${prefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${prefix}$1"`);
  const [root] = svg.match(/<svg[^>]*>/)!;
  const placed = root
    .replace(/ (width|height)="[^"]*"/g, "")
    .replace("<svg", `<svg x="${x}" y="${y}" width="${width}" height="${height}"`);
  return svg.replace(root, placed);
}

const schema = `import { z } from "zod";

export const User = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
});`;
const route = `import { User } from "./schema";

export async function GET(req: Request) {
  const user = await db.users.find(req.id);
  return Response.json(User.parse(user));
}`;

const SPECS: Record<string, object> = {
  // Two files in one window, a popover with the type of a word, and a highlighted line
  hero: {
    windows: [
      {
        tabs: true,
        titleBar: false,
        panes: [
          { title: "schema.ts", code: schema },
          {
            title: "route.ts",
            code: route,
            highlight: [4],
            annotations: [
              {
                line: 4,
                match: "user",
                code: "const user: {\n  id: string;\n  name: string;\n  email: string;\n}",
              },
            ],
          },
        ],
      },
    ],
  },
  // Windows in a free layout that overlap, each with its own panes
  layout: {
    theme: "tokyo-night",
    windows: [
      {
        x: 64,
        y: 64,
        title: "Editor",
        controls: "color",
        tabs: true,
        titleBar: false,
        split: "column",
        panes: [
          {
            title: "index.html",
            code: `<html>\n  <body>\n    <div id="root"></div>\n    <script src="main.tsx"></script>\n  </body>\n</html>`,
          },
          {
            title: "main.tsx",
            code: `import { createRoot } from "react-dom/client";\nimport { App } from "./App";\n\nconst root = document.getElementById("root")!;\ncreateRoot(root).render(<App />);`,
          },
        ],
      },
      {
        x: 360,
        y: 330,
        title: "Terminal",
        controls: "color",
        panes: [
          {
            language: "shellsession",
            code: `$ npm run dev\n\n  VITE v7.1.0  ready in 212 ms\n\n  Local:   http://localhost:5173/`,
          },
        ],
      },
    ],
  },
  // Line highlights, text styles, text colors and highlighter fills
  marks: {
    theme: "vscode",
    lineNumbers: true,
    windows: [
      {
        panes: [
          {
            title: "pricing.ts",
            code: `export const plans = {\n  free: { price: 0, seats: 1 },\n  pro: { price: 12, seats: 5 },\n  team: { price: 30, seats: 20 },\n};\n\n// var total = plans.pro.price * seats;\nconst total = plans.pro.price * seats;`,
            highlight: [3],
            marks: [
              { line: 3, match: "pro", style: "strong" },
              { line: 3, match: "12", style: "strong", color: "#fcd34d" },
              { line: 7, match: "var total = plans.pro.price * seats;", style: "strikethrough" },
              { line: 8, match: "const", background: "#22c55e40" },
              { line: 8, match: "seats", style: "underline", color: "#f472b6" },
            ],
          },
        ],
      },
    ],
  },
  // A popover in light mode, as the hover card of an editor
  popover: {
    theme: "github",
    mode: "light",
    windows: [
      {
        panes: [
          {
            title: "fetch.ts",
            code: `const response = await fetch("https://api.github.com/repos/zirkelc/tin.so");\nconst repo = await response.json();\nconsole.log(repo.stargazers_count);`,
            annotations: [
              {
                line: 1,
                match: "fetch",
                code: "function fetch(\n  input: RequestInfo | URL,\n  init?: RequestInit,\n): Promise<Response>",
              },
            ],
          },
        ],
      },
    ],
  },
  // Three window styles side by side: a title bar, a title bar with tabs, and tabs only
  windows: {
    theme: "dracula",
    direction: "row",
    windows: [
      {
        title: "Terminal",
        panes: [{ language: "shellsession", code: `$ npx tin.so main.rs\nSaved main.png` }],
      },
      {
        title: "api",
        controls: "color",
        tabs: true,
        panes: [
          {
            title: "health.go",
            code: `func health(w http.ResponseWriter) {\n\tw.WriteHeader(200)\n}`,
          },
        ],
      },
      {
        tabs: true,
        titleBar: false,
        panes: [
          { title: "Dockerfile", code: `FROM node:22-alpine\nCOPY . .\nCMD ["node", "main.js"]` },
        ],
      },
    ],
  },
  // One window with three languages, each pane with the icon of its language
  code: {
    theme: "one-dark",
    windows: [
      {
        tabs: true,
        titleBar: false,
        split: "row",
        panes: [
          {
            title: "main.rs",
            code: `fn main() {\n    let names = ["tin", "so"];\n    for name in names {\n        println!("{name}");\n    }\n}`,
          },
          {
            title: "app.py",
            code: `from dataclasses import dataclass\n\n@dataclass\nclass User:\n    name: str\n    admin: bool = False`,
          },
          {
            title: "query.sql",
            code: `SELECT name, email\nFROM users\nWHERE admin\nORDER BY name;`,
          },
        ],
      },
    ],
  },
  // An image for a post on X, with a gradient background
  social: {
    theme: "catppuccin",
    aspectRatio: "16:9",
    background: "linear-gradient(135deg, #1e1b4b 0%, #7c3aed 55%, #f472b6 100%)",
    windows: [
      {
        controls: "color",
        panes: [
          {
            title: "fib.py",
            code: `from functools import cache\n\n@cache\ndef fib(n: int) -> int:\n    return n if n < 2 else fib(n - 1) + fib(n - 2)\n\nprint(fib(100))  # 354224848179261915075`,
          },
        ],
      },
    ],
  },
};

for (const [name, spec] of Object.entries(SPECS)) {
  const png = await render({ $schema: SCHEMA, ...spec }, { scale: 2, metadata: false });
  await writeFile(new URL(`${name}.png`, OUT), png);
}

// The themes: one small image of each theme, with its name below, in rows of 4
const snippet = `function greet(name: string) {\n  // Say hello\n  return \`Hello, \${name}!\`;\n}`;
const COLUMNS = 4;
const CELL_WIDTH = 440;
const LABEL = 44;
const cells: Array<{ svg: string; width: number; height: number; name: string }> = [];
const fonts = new Map<string, Uint8Array>();
for (const theme of THEMES) {
  const scene = await layout({
    $schema: SCHEMA,
    theme: theme.id,
    padding: 32,
    windows: [{ panes: [{ title: "greet.ts", code: snippet }] }],
  });
  for (const [file, buffer] of await loadSceneFonts(scene, loadFont)) fonts.set(file, buffer);
  cells.push({ svg: toSvg(scene), width: scene.width, height: scene.height, name: theme.name });
}
fonts.set("inter/inter-500.ttf", await loadFont("inter/inter-500.ttf"));
const cellHeight = Math.max(...cells.map((cell) => (cell.height * CELL_WIDTH) / cell.width));
const GAP = 24;
const rows = Math.ceil(cells.length / COLUMNS);
const gridWidth = COLUMNS * CELL_WIDTH + (COLUMNS - 1) * GAP;
const gridHeight = rows * (cellHeight + LABEL) + (rows - 1) * GAP;

const grid = cells
  .map((cell, index) => {
    const x = (index % COLUMNS) * (CELL_WIDTH + GAP);
    const y = Math.floor(index / COLUMNS) * (cellHeight + LABEL + GAP);
    const height = (cell.height * CELL_WIDTH) / cell.width;
    return `${nested(cell.svg, x, y, CELL_WIDTH, height)}
<text x="${x + CELL_WIDTH / 2}" y="${y + height + 30}" text-anchor="middle" font-family="${UI_FONT.name}" font-size="20" font-weight="500" fill="#8b949e">${cell.name}</text>`;
  })
  .join("\n");
const themes = `<svg xmlns="http://www.w3.org/2000/svg" width="${gridWidth}" height="${gridHeight}" viewBox="0 0 ${gridWidth} ${gridHeight}">${grid}</svg>`;
await writeFile(new URL("themes.png", OUT), await svgToPng(themes, fonts.values(), { scale: 1 }));

// The background presets as small tiles, in the order of the editor
const TILE = 96;
const TILE_GAP = 8;
const PER_ROW = 16;
const tileRows = Math.ceil(BACKGROUNDS.length / PER_ROW);
const tilesWidth = PER_ROW * TILE + (PER_ROW - 1) * TILE_GAP;
const tilesHeight = tileRows * (TILE * 0.625) + (tileRows - 1) * TILE_GAP;
const tiles = await Promise.all(
  BACKGROUNDS.map(async (preset, index) => {
    const scene = await layout({
      $schema: SCHEMA,
      background: preset.css,
      width: 160,
      height: 100,
      padding: 0,
      windows: [{ frame: false, panes: [{ code: " " }] }],
    });
    const x = (index % PER_ROW) * (TILE + TILE_GAP);
    const y = Math.floor(index / PER_ROW) * (TILE * 0.625 + TILE_GAP);
    return `<clipPath id="tile-${index}"><rect x="${x}" y="${y}" width="${TILE}" height="${TILE * 0.625}" rx="8"/></clipPath><g clip-path="url(#tile-${index})">${nested(toSvg(scene), x, y, TILE, TILE * 0.625)}</g>`;
  }),
);
const backgrounds = `<svg xmlns="http://www.w3.org/2000/svg" width="${tilesWidth}" height="${tilesHeight}" viewBox="0 0 ${tilesWidth} ${tilesHeight}">${tiles.join("")}</svg>`;
await writeFile(
  new URL("backgrounds.png", OUT),
  await svgToPng(backgrounds, fonts.values(), { scale: 1 }),
);

console.log(`Wrote ${Object.keys(SPECS).length + 2} images to docs/images`);
