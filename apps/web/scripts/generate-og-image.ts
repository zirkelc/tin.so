/**
 * Writes the images that links and home screens show: the social preview (1200 × 630) with the
 * logo, the name, the headline and a code image from the renderer, and the icons of home screens.
 */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import {
  initPng,
  layout,
  loadFont,
  loadSceneFonts,
  svgToPng,
  toSvg,
  UI_FONT,
} from "@tin.so/core/node";

const PUBLIC = new URL("../public/", import.meta.url);
const WIDTH = 1200;
const HEIGHT = 630;
const HEADLINE = ["Beautiful code images.", "For humans and agents."];

await initPng(() =>
  readFile(createRequire(import.meta.url).resolve("@resvg/resvg-wasm/index_bg.wasm")),
);

const sql = `SELECT name, count(*) AS stars
FROM repos
WHERE language = 'TypeScript'
GROUP BY name
ORDER BY stars DESC
LIMIT 10;`;
const python = `import duckdb

rows = duckdb.sql(open("top.sql").read())
for name, stars in rows.fetchall():
    print(f"{name}: {stars}")`;

// One window with a query and the script that runs it, side by side on a transparent background
const scene = await layout({
  theme: "github",
  backgroundOpacity: 0,
  padding: 0,
  windows: [
    {
      tabs: true,
      titleBar: false,
      split: "row",
      panes: [
        { title: "top.sql", code: sql },
        { title: "main.py", code: python, highlight: [4] },
      ],
    },
  ],
});
const fonts = await loadSceneFonts(scene, loadFont);
const NAME_FONT = {
  family: "JetBrains Mono",
  file: "jetbrains-mono/jetbrains-mono-700.ttf",
  size: 58,
};
for (const file of ["inter/inter-400.ttf", NAME_FONT.file]) fonts.set(file, await loadFont(file));
const code = toSvg(scene);
const codeWidth = 1_040;
const codeHeight = (codeWidth / scene.width) * scene.height;
// The bottom edge of the image cuts off the window
const codeTop = 400;

const logo = await readFile(new URL("logo.svg", PUBLIC), "utf8");

// Places an SVG in the outer one, in place of its own size
function nested(svg: string, x: number, y: number, width: number, height: number): string {
  const [root] = svg.match(/<svg[^>]*>/)!;
  const placed = root
    .replace(/ (width|height)="[^"]*"/g, "")
    .replace("<svg", `<svg x="${x}" y="${y}" width="${width}" height="${height}"`);
  return svg.replace(root, placed);
}

const text = (y: number, fill: string, value: string) =>
  `<text x="${WIDTH / 2}" y="${y}" text-anchor="middle" font-family="${UI_FONT.name}" font-size="48" font-weight="400" fill="${fill}" letter-spacing="-0.5">${value}</text>`;

// The name is a metal plate: a shadow below, a vertical metal gradient, and a light band over "tin"
const LOGO_SIZE = 72;
const GAP = 18;
// JetBrains Mono advances 0.6 em per character, less 2 px of letter spacing
const nameWidth = 6 * (NAME_FONT.size * 0.6 - 2);
const logoX = WIDTH / 2 - (LOGO_SIZE + GAP + nameWidth) / 2;
const nameX = logoX + LOGO_SIZE + GAP;
const name = (y: number, fill: string) =>
  `<text x="${nameX}" y="${y}" font-family="${NAME_FONT.family}" font-size="${NAME_FONT.size}" font-weight="700" letter-spacing="-2" ${fill}>tin.so</text>`;

// The dusk gradient fades into black toward the top
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<defs>
<linearGradient id="dusk" x1="0" y1="${HEIGHT}" x2="${WIDTH}" y2="0" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#0d1117"/><stop offset="0.55" stop-color="#6e40c9"/><stop offset="1" stop-color="#f78166"/>
</linearGradient>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="${HEIGHT}" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#05060a" stop-opacity="1"/><stop offset="0.4" stop-color="#05060a" stop-opacity="0.8"/><stop offset="0.9" stop-color="#05060a" stop-opacity="0"/>
</linearGradient>
<linearGradient id="plate" x1="0" y1="72" x2="0" y2="120" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#e4e4ea"/><stop offset="0.45" stop-color="#a6a6b0"/><stop offset="0.55" stop-color="#8a8a94"/><stop offset="1" stop-color="#c8c8d0"/>
</linearGradient>
<linearGradient id="sheen" x1="${nameX}" y1="130" x2="${nameX + nameWidth / 2}" y2="60" gradientUnits="userSpaceOnUse">
<stop offset="0.3" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.7" stop-color="#ffffff" stop-opacity="0"/>
</linearGradient>
</defs>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#dusk)"/>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#fade)"/>
${nested(logo, logoX, 60, LOGO_SIZE, LOGO_SIZE)}
${name(120, 'fill="#000000" fill-opacity="0.6"')}
${name(118, 'fill="url(#plate)"')}
${name(118, 'fill="url(#sheen)"')}
${text(240, "#e8e8ee", HEADLINE[0]!)}
${text(302, "#9d9daa", HEADLINE[1]!)}
${nested(code, (WIDTH - codeWidth) / 2, codeTop, codeWidth, codeHeight)}
</svg>`;

const ogPng = await svgToPng(og, fonts.values(), { scale: 1 });
await writeFile(new URL("og.png", PUBLIC), ogPng);

// The app icons are the logo tile on the dark canvas, because a home screen fills transparent
// corners with its own color
const icon = (size: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" fill="#0d1117"/>${nested(logo, size / 10, size / 10, (size * 8) / 10, (size * 8) / 10)}</svg>`;
const ICONS: Array<[string, number]> = [
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
];
for (const [file, size] of ICONS) {
  await writeFile(new URL(file, PUBLIC), await svgToPng(icon(size), [], { scale: 1 }));
}

console.log(`Wrote og.png (${WIDTH} × ${HEIGHT}) and ${ICONS.map(([file]) => file).join(", ")}`);
