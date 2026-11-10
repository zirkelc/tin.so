/**
 * Writes the theme previews of the editor: a few lines of the start example as colored tokens,
 * and the colors that the example uses most, for each theme and mode. The real highlighter makes
 * them, so the previews show the colors that an image in the theme has.
 */
import { writeFile } from "node:fs/promises";
import { getSyntax, highlight, type Mode, THEMES } from "@tin.so/core";
import { DEFAULT_SPEC } from "../src/state.ts";

const OUT_FILE = new URL("../src/theme-previews.json", import.meta.url);

// The lines of the start example that the preview window shows
const PREVIEW_LINES = [0, 3, 4, 6];
const PALETTE_SIZE = 6;

const code = DEFAULT_SPEC.windows[0]!.panes[0]!.code;
const previews: Record<string, Partial<Record<Mode, unknown>>> = {};

for (const theme of THEMES) {
  previews[theme.id] = {};
  for (const mode of ["dark", "light"] as const) {
    if (!theme.syntax[mode]) continue;
    const syntax = getSyntax(theme, mode);
    const lines = await highlight(code, "tsx", theme, mode, syntax);

    // Each word is a token of its color and length, and a space is a token without a color
    const tokens = PREVIEW_LINES.map((index) =>
      lines[index]!.flatMap((token) =>
        token.content
          .split(/(\s+)/)
          .filter((part) => part.length > 0)
          .map((part) => [
            /^\s+$/.test(part) ? null : token.color.slice(0, 7).toLowerCase(),
            part.length,
          ]),
      ),
    );

    const weights = new Map<string, number>();
    for (const line of lines) {
      for (const token of line) {
        const color = token.color.slice(0, 7).toLowerCase();
        const characters = token.content.replace(/\s/g, "").length;
        if (characters === 0 || color === syntax.foreground.slice(0, 7).toLowerCase()) continue;
        weights.set(color, (weights.get(color) ?? 0) + characters);
      }
    }
    const palette = [...weights]
      .sort((a, b) => b[1] - a[1])
      .slice(0, PALETTE_SIZE)
      .map(([color]) => color);

    previews[theme.id]![mode] = { lines: tokens, palette };
  }
}

await writeFile(OUT_FILE, `${JSON.stringify(previews)}\n`);
console.log(`Wrote the previews of ${THEMES.length} themes`);
