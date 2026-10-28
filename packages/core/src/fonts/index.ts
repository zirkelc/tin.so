import manifest from "./fonts.generated.json" with { type: "json" };

export type FontFace = {
  weight: number;
  italic: boolean;
  /** Path relative to the fonts directory of this package */
  file: string;
  /** Family name inside the font file, which resvg uses to match the face */
  family: string;
};

export type FontMetrics = {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  lineGap: number;
};

export type CodeFont = {
  id: string;
  name: string;
  kind: "code";
  faces: Array<FontFace>;
  metrics: FontMetrics & { advance: number };
};

export type UiFont = {
  id: string;
  name: string;
  kind: "ui";
  faces: Array<FontFace>;
  metrics: FontMetrics & { advances: Record<string, number> };
};

export type Font = CodeFont | UiFont;

/** Reads a font file by its path relative to the fonts directory */
export type FontLoader = (file: string) => Promise<Uint8Array>;

const FONTS = manifest as Array<Font>;

export const CODE_FONTS = FONTS.filter((font): font is CodeFont => font.kind === "code");

export const CODE_FONT_IDS = CODE_FONTS.map((font) => font.id);

export const DEFAULT_CODE_FONT = "jetbrains-mono";

export const UI_FONT = FONTS.find((font): font is UiFont => font.kind === "ui")!;

export function getCodeFont(id: string): CodeFont {
  const font = CODE_FONTS.find((font) => font.id === id);
  if (!font) throw new Error(`Unknown font "${id}". Available fonts: ${CODE_FONT_IDS.join(", ")}`);
  return font;
}

/** Picks the face that matches the style best: the exact face, then the regular face of the same style */
export function getFace(font: Font, style: { bold?: boolean; italic?: boolean } = {}): FontFace {
  const regular = font.faces[0]!;
  const weight = style.bold ? 700 : regular.weight;
  const italic = style.italic ?? false;
  return (
    font.faces.find((face) => face.weight === weight && face.italic === italic) ??
    font.faces.find((face) => face.weight === weight && !face.italic) ??
    regular
  );
}

/**
 * The CSS font family of a face. The first name is for browsers, which load the faces with @font-face
 * rules under that name. The second name is the family inside the file, for resvg. The names stay
 * unquoted, because resvg does not match a quoted name that follows another name.
 */
export function cssFontFamily(font: Font, face: FontFace): string {
  return `ci-${font.id}, ${face.family}`;
}

/** Width of a text in the UI font, for title layout. Characters outside of ASCII count as an "M". */
export function measureUiText(text: string, fontSize: number): number {
  const { advances, unitsPerEm } = UI_FONT.metrics;
  let width = 0;
  for (const char of text) width += advances[char] ?? advances["M"]!;
  return (width / unitsPerEm) * fontSize;
}
