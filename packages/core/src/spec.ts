import * as v from "valibot";
import { CODE_FONT_IDS } from "./fonts/index.ts";
import { isKnownLanguage } from "./highlight/index.ts";
import { AUTO_ICON, ICON_IDS, NO_ICON } from "./icons/index.ts";
import {
  IMPLICIT_SPEC_VERSION,
  migrateLegacySpec,
  schemaVersion,
  withoutExtensions,
} from "./migrate.ts";
import { DEFAULT_THEME, LISTED_THEME_IDS, THEME_IDS } from "./themes/index.ts";

const LINE_RANGE = /^\d+(-\d+)?$/;
const RATIO = /^\d+(\.\d+)?:\d+(\.\d+)?$/;
// The largest line number of a highlight, so that a range cannot make millions of lines
const MAX_LINE = 100_000;
// The aspect ratio of the image is at most 10 times wider than high, or 10 times higher than wide
const MAX_RATIO = 10;

// Limits of the input, so that a spec cannot make the layout use much time or memory
export const SPEC_LIMITS = {
  // Characters of the code in a pane or in a popover
  codeLength: 100_000,
  windows: 50,
  panesPerWindow: 20,
  annotationsPerPane: 200,
  marksPerPane: 200,
  highlightsPerPane: 1_000,
  // Characters of a pane title or a window title
  titleLength: 200,
  // The largest distance of a position or an offset from 0, in px
  position: 8_192,
  // The largest width or height of the image, a window, a pane or a popover, in px
  size: 8_192,
} as const;

const LANGUAGE_HINT = 'Run "tin languages" to list the ids, or use "auto" or "text"';

/**
 * A range such as "3-5", with its start not after its end. A value in another format passes, so
 * that only the format check reports it.
 */
function isLineRange(range: string): boolean {
  if (!LINE_RANGE.test(range)) return true;
  const [start, end = start] = range.split("-").map(Number) as [number, number?];
  return start >= 1 && start <= end! && end! <= MAX_LINE;
}

// A value in another format passes, so that only the format check reports it
function isRatio(ratio: string): boolean {
  if (!RATIO.test(ratio)) return true;
  const [width, height] = ratio.split(":").map(Number) as [number, number];
  return width > 0 && height > 0 && width / height <= MAX_RATIO && height / width <= MAX_RATIO;
}

// A description goes into the JSON Schema, which agents read to write a spec
const describe = <SCHEMA extends v.GenericSchema>(schema: SCHEMA, description: string) =>
  v.pipe(schema, v.description(description));

const size = (min: number) =>
  v.optional(v.pipe(v.number(), v.minValue(min), v.maxValue(SPEC_LIMITS.size)));

// A position or an offset in px. A number schema refuses NaN, and the range refuses Infinity.
const position = () =>
  v.pipe(v.number(), v.minValue(-SPEC_LIMITS.position), v.maxValue(SPEC_LIMITS.position));

const code = () =>
  v.pipe(
    v.string(),
    v.maxLength(
      SPEC_LIMITS.codeLength,
      (issue) =>
        `The code has ${issue.received} characters, at most ${SPEC_LIMITS.codeLength.toLocaleString("en-US")}`,
    ),
  );

const title = () => v.pipe(v.string(), v.maxLength(SPEC_LIMITS.titleLength));

// "auto" infers the language. Other values must be a language that the highlighter knows.
const language = () =>
  v.pipe(
    v.string(),
    v.check(
      (language) => language === "auto" || isKnownLanguage(language),
      (issue) => `unknown language ${issue.received}. ${LANGUAGE_HINT}`,
    ),
  );

const list = <SCHEMA extends v.GenericSchema>(schema: SCHEMA, max: number, name: string) =>
  v.pipe(
    v.array(schema),
    v.maxLength(max, (issue) => `${issue.received} ${name}, at most ${max}`),
  );

export const MARK_STYLES = ["strong", "emphasis", "underline", "strikethrough"] as const;

// A hex color with 3, 4, 6 or 8 digits, as CSS and SVG read it
const HEX_COLOR = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const hexColor = () => v.pipe(v.string(), v.regex(HEX_COLOR, 'Use a hex color such as "#ff5c57"'));

const MarkSchema = v.strictObject({
  line: describe(v.pipe(v.number(), v.integer(), v.minValue(1)), "Line of the text, from 1"),
  match: describe(v.pipe(v.string(), v.minLength(1)), "Text in the line to mark"),
  occurrence: describe(
    v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 1),
    "Which occurrence of the match in the line, from 1",
  ),
  style: describe(
    v.optional(v.picklist(MARK_STYLES)),
    "strong (bold), emphasis (italic), underline or strikethrough",
  ),
  color: describe(v.optional(hexColor()), 'Text color, as a hex color such as "#ff5c57"'),
  background: describe(
    v.optional(hexColor()),
    'Fill behind the text, as a hex color such as "#ffd60a" or "#ffd60a40" with alpha',
  ),
});

// A mark without a style and without colors changes nothing, so it is an error
const MarkWithEffectSchema = v.pipe(
  MarkSchema,
  v.check(
    (mark) => mark.style !== undefined || mark.color !== undefined || mark.background !== undefined,
    "A mark needs a style, a color or a background",
  ),
);

// The kinds of annotations. A popover is the only kind today, and later kinds get a new value.
export const ANNOTATION_TYPES = ["popover"] as const;

const AnnotationSchema = v.strictObject({
  type: describe(
    v.optional(v.picklist(ANNOTATION_TYPES), "popover"),
    "Kind of the annotation. popover is a card below the text, as the hover card of an editor",
  ),
  line: describe(v.pipe(v.number(), v.integer(), v.minValue(1)), "Line of the anchor, from 1"),
  match: describe(
    v.pipe(v.string(), v.minLength(1)),
    "Text in the line that the popover points to",
  ),
  occurrence: describe(
    v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 1),
    "Which occurrence of the match in the line, from 1",
  ),
  code: describe(
    code(),
    `Content of the popover, for example a type. At most ${SPEC_LIMITS.codeLength} characters`,
  ),
  language: describe(
    v.optional(language()),
    'Language of the popover: a Shiki language id or alias, or "text" (default: the pane language). Run "tin languages" to list the ids',
  ),
  offsetX: describe(
    v.optional(position(), 0),
    `Moves the popover to the right (negative: to the left) from its place below the text, in px, from -${SPEC_LIMITS.position} to ${SPEC_LIMITS.position}`,
  ),
  offsetY: describe(
    v.optional(position(), 0),
    `Moves the popover down (negative: up) from its place below the text, in px, from -${SPEC_LIMITS.position} to ${SPEC_LIMITS.position}`,
  ),
  width: describe(size(40), "Width of the popover in px (default: fit the code)"),
  height: describe(size(32), "Height of the popover in px (default: fit the code)"),
  marks: describe(
    v.optional(list(MarkWithEffectSchema, SPEC_LIMITS.marksPerPane, "marks"), []),
    `Text styles and colors on parts of a line of the popover code, as in a pane. At most ${SPEC_LIMITS.marksPerPane}`,
  ),
});

const PaneSchema = v.strictObject({
  title: describe(
    v.optional(title()),
    `File name in the header, also used to infer the language. At most ${SPEC_LIMITS.titleLength} characters`,
  ),
  language: describe(
    v.optional(language(), "auto"),
    'Shiki language id or alias, "text", or "auto" to infer it from the title. Run "tin languages" to list the ids. An unknown language is an error',
  ),
  code: describe(
    code(),
    `The code of the pane. At most ${SPEC_LIMITS.codeLength} characters. The image is at most ${SPEC_LIMITS.size} px wide and high`,
  ),
  highlight: describe(
    v.optional(
      list(
        v.union([
          v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(MAX_LINE)),
          v.pipe(
            v.string(),
            v.regex(LINE_RANGE, 'Use a line number or a range such as "3-5"'),
            v.check(isLineRange, `Use a range from a line to a later line, at most ${MAX_LINE}`),
          ),
        ]),
        SPEC_LIMITS.highlightsPerPane,
        "highlight entries",
      ),
      [],
    ),
    `Lines to highlight: line numbers from 1, or ranges such as "3-5" with the start not after the end. Lines are at most ${MAX_LINE}, and a pane has at most ${SPEC_LIMITS.highlightsPerPane} entries`,
  ),
  icon: describe(
    v.optional(v.picklist([AUTO_ICON, NO_ICON, ...ICON_IDS]), AUTO_ICON),
    'Icon in the tab: "auto" for the icon of the language, "file", "none", or an icon id',
  ),
  lineNumbers: describe(v.optional(v.boolean()), "Show line numbers (default: the spec value)"),
  annotations: describe(
    v.optional(list(AnnotationSchema, SPEC_LIMITS.annotationsPerPane, "annotations"), []),
    `Popovers below a text, as the hover card of an editor. At most ${SPEC_LIMITS.annotationsPerPane}`,
  ),
  marks: describe(
    v.optional(list(MarkWithEffectSchema, SPEC_LIMITS.marksPerPane, "marks"), []),
    `Text styles and colors on parts of a line: bold, italic, underline or strikethrough, a text color and a fill. At most ${SPEC_LIMITS.marksPerPane}`,
  ),
  size: describe(
    size(24),
    "Width of the pane in a row split, or height in a column split, in px (default: fit the code)",
  ),
});

const WindowSchema = v.strictObject({
  frame: describe(
    v.optional(v.boolean(), true),
    "Draw the window. false puts the code directly on the background, without title bar and tabs",
  ),
  titleBar: describe(
    v.optional(v.boolean(), true),
    "A title bar with the window controls and the title",
  ),
  tabs: describe(
    v.optional(v.boolean(), false),
    "A tab with an icon and the pane title above each pane, below the title bar",
  ),
  controls: describe(
    v.optional(v.picklist(["gray", "color"]), "gray"),
    "Window controls in the title bar: gray, or red, yellow and green as in macOS",
  ),
  title: describe(
    v.optional(title()),
    "Title in the title bar (default: the title of a single pane without tabs)",
  ),
  split: describe(
    v.optional(v.picklist(["row", "column"]), "row"),
    "Panes side by side (row) or below each other (column)",
  ),
  width: describe(size(48), "Width of the window in px (default: fit the panes)"),
  height: describe(size(48), "Height of the window in px (default: fit the panes)"),
  x: describe(
    v.optional(position()),
    `Left edge of the window in the image, in px, from -${SPEC_LIMITS.position} to ${SPEC_LIMITS.position}. A window with x or y does not follow direction, gap and padding`,
  ),
  y: describe(
    v.optional(position()),
    `Top edge of the window in the image, in px, from -${SPEC_LIMITS.position} to ${SPEC_LIMITS.position}`,
  ),
  panes: describe(
    v.pipe(list(PaneSchema, SPEC_LIMITS.panesPerWindow, "panes"), v.minLength(1)),
    `The panes of the window, each with its code. From 1 to ${SPEC_LIMITS.panesPerWindow}`,
  ),
});

/**
 * Versions of the spec format.
 *
 * - Increase v only for a breaking change: a field that changes its meaning, gets a new name or
 *   goes away, a changed default, a value that a list no longer has (a theme, font, icon or
 *   language id), or a smaller limit. Specs leave out the defaults, so a new default changes old
 *   images. A new optional field, a new value or a larger limit does not increase v, because older
 *   specs stay valid.
 * - The version is v, or the version of the $schema URL (/schema/v<number>.json) without v. When
 *   both are there, they must be the same. A spec without both is version 1, now and in all later
 *   versions, because older specs have neither.
 * - Keys that start with "x-" are for other tools. The renderer ignores them in every object.
 * - For a new version, add its schema (with v as a required literal of the new number) to
 *   SPEC_SCHEMAS, a function that changes a parsed spec of the version before into the new
 *   version to MIGRATIONS, and increase LATEST_SPEC_VERSION. The schema of the latest version is
 *   SpecSchema, and the types below come from it.
 */
export const LATEST_SPEC_VERSION = 1;

const SpecV1Schema = v.pipe(
  v.strictObject({
    $schema: describe(
      v.optional(v.pipe(v.string(), v.url())),
      "URL of the JSON Schema of the spec, so that an editor can check the spec and complete its fields. Its path names the version, such as /schema/v1.json, which counts as v. The CLI also uses it to tell a spec from other JSON",
    ),
    v: describe(
      v.optional(v.literal(1), IMPLICIT_SPEC_VERSION),
      "Version of the spec format. Leave it out or use 1. Without v, the version of the $schema URL counts, and without both, the version is 1",
    ),
    theme: describe(v.optional(v.picklist(THEME_IDS), DEFAULT_THEME), "The theme. tin themes lists them."),
    mode: describe(
      v.optional(v.picklist(["dark", "light"]), "dark"),
      "Color mode. A theme with only one mode ignores it",
    ),
    background: describe(
      v.optional(v.boolean(), true),
      "Gradient background. false is transparent",
    ),
    padding: describe(
      v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(256)), 64),
      "Space around the windows in px",
    ),
    font: describe(
      v.optional(v.picklist(CODE_FONT_IDS)),
      "Code font (default: the font of the theme)",
    ),
    lineNumbers: describe(v.optional(v.boolean()), "Show line numbers in all panes"),
    direction: describe(
      v.optional(v.picklist(["column", "row"]), "column"),
      "Windows below each other (column) or side by side (row)",
    ),
    gap: describe(
      v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(256)), 24),
      "Space between the windows in px",
    ),
    aspectRatio: describe(
      v.optional(
        v.pipe(
          v.string(),
          v.regex(RATIO, 'Use a ratio such as "16:9"'),
          v.check(isRatio, `Use a ratio from 1:${MAX_RATIO} to ${MAX_RATIO}:1`),
        ),
      ),
      `Aspect ratio of the image as "width:height", such as "16:9", from 1:${MAX_RATIO} to ${MAX_RATIO}:1. Without width and height, the image grows in one direction to the ratio and centers the windows. With width, the height is width / ratio. With height, the width is height * ratio. Do not use it together with both width and height. The image is at most ${SPEC_LIMITS.size} px wide and high`,
    ),
    width: describe(
      size(16),
      `Width of the image in px, at most ${SPEC_LIMITS.size} (default: fit the windows and the padding). With aspectRatio, it also gives the height. The image cuts off windows outside of it`,
    ),
    height: describe(
      size(16),
      `Height of the image in px, at most ${SPEC_LIMITS.size} (default: fit the windows and the padding). With aspectRatio, it also gives the width. The image cuts off windows outside of it`,
    ),
    windows: describe(
      v.pipe(list(WindowSchema, SPEC_LIMITS.windows, "windows"), v.minLength(1)),
      `The windows of the image, painted in this order, so that the last window is in front. From 1 to ${SPEC_LIMITS.windows}`,
    ),
  }),
  v.forward(
    v.partialCheck(
      [["aspectRatio"], ["width"], ["height"]],
      (spec) =>
        spec.aspectRatio === undefined || spec.width === undefined || spec.height === undefined,
      "Use aspectRatio with width or with height, not with both. Remove one of the three fields",
    ),
    ["aspectRatio"],
  ),
);

/** The schema of the latest spec version */
export const SpecSchema = SpecV1Schema;

// The schema of each version, by its number
const SPEC_SCHEMAS: Record<number, v.GenericSchema> = { 1: SpecV1Schema };

// Changes a parsed spec of a version into the next version, by the number of the version before
const MIGRATIONS: Record<number, (spec: unknown) => unknown> = {};

/** The spec as a user writes it, with optional fields */
export type SpecInput = v.InferInput<typeof SpecSchema>;

/** The spec with all defaults applied */
export type Spec = v.InferOutput<typeof SpecSchema>;
export type WindowSpec = Spec["windows"][number];
export type PaneSpec = WindowSpec["panes"][number];
export type AnnotationSpec = PaneSpec["annotations"][number];
export type MarkSpec = PaneSpec["marks"][number];
export type MarkStyle = MarkSpec["style"];

export class SpecError extends Error {
  readonly issues: Array<string>;

  constructor(issues: Array<string>) {
    super(`Invalid spec:\n${issues.map((issue) => `  - ${issue}`).join("\n")}`);
    this.name = "SpecError";
    this.issues = issues;
  }
}

function formatIssue(issue: v.BaseIssue<unknown>): string {
  const path = v.getDotPath(issue) ?? "(root)";
  if (issue.type === "strict_object" && issue.expected === "never")
    return `${path}: unknown field. Check the name, or update tin.so, because a newer version can support it`;
  if (issue.type === "strict_object" && issue.input === undefined)
    return `${path}: required field missing`;
  if (issue.type === "picklist" && issue.expected) {
    // A wrong theme names only the listed themes
    const expected =
      path === "theme"
        ? LISTED_THEME_IDS.map((id) => JSON.stringify(id)).join(" | ")
        : issue.expected;
    return `${path}: expected one of ${expected}, received ${issue.received}. Check the value, or update tin.so, because a newer version can support it`;
  }
  return `${path}: ${issue.message}`;
}

/**
 * The version of a spec input: v, or the version of the $schema URL without v. A spec without
 * both is version 1.
 */
function readVersion(input: unknown): number {
  const fromSchema = schemaVersion(input);
  const field =
    typeof input === "object" && input !== null && "v" in input
      ? (input as { v: unknown }).v
      : undefined;
  if (field === undefined) {
    const version = fromSchema ?? IMPLICIT_SPEC_VERSION;
    if (version < 1)
      throw new SpecError([`$schema: the URL names version ${version}, but versions start at 1`]);
    return checkSupported(version, "$schema");
  }
  if (typeof field !== "number" || !Number.isInteger(field) || field < 1)
    throw new SpecError([
      `v: the version must be a whole number from 1, received ${typeof field === "number" ? field : (JSON.stringify(field) ?? typeof field)}`,
    ]);
  if (fromSchema !== undefined && fromSchema !== field)
    throw new SpecError([
      `v: the spec has version ${field}, but its $schema URL names version ${fromSchema}. Make them the same, or remove one`,
    ]);
  return checkSupported(field, "v");
}

function checkSupported(version: number, path: string): number {
  if (version > LATEST_SPEC_VERSION)
    throw new SpecError([
      `${path}: This spec has version ${version}, but this tin.so supports up to version ${LATEST_SPEC_VERSION}. Update tin.so.`,
    ]);
  return version;
}

/**
 * Validates a spec and applies the defaults. It first removes the keys of other tools and changes
 * the fields of older specs, then validates the spec with the schema of its version and changes it
 * to the latest version. Throws a SpecError that lists every issue.
 */
export function parseSpec(input: unknown): Spec {
  const migrated = migrateLegacySpec(withoutExtensions(input));
  const version = readVersion(migrated);
  const result = v.safeParse(SPEC_SCHEMAS[version]!, migrated);
  if (!result.success) throw new SpecError(result.issues.map(formatIssue));
  let spec: unknown = result.output;
  for (let from = version; from < LATEST_SPEC_VERSION; from++) spec = MIGRATIONS[from]!(spec);
  return spec as Spec;
}

/** Expands highlight entries such as [2, "4-6"] to a set of line numbers, up to the last line */
export function expandLineRanges(
  ranges: PaneSpec["highlight"],
  lastLine: number = MAX_LINE,
): Set<number> {
  const lines = new Set<number>();
  for (const range of ranges) {
    if (typeof range === "number") {
      lines.add(range);
      continue;
    }
    const [start, end = start] = range.split("-").map(Number) as [number, number?];
    for (let line = start; line <= Math.min(end!, lastLine); line++) lines.add(line);
  }
  return lines;
}
