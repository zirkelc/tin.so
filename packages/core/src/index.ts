export * from "./fonts/index.ts";
export {
  AUTO_ICON,
  FILE_ICON,
  getIcon,
  ICON_IDS,
  NO_ICON,
  resolveIcon,
  type Icon,
} from "./icons/index.ts";
export { isSpecSchemaUrl, SPEC_SCHEMA_URL, specJsonSchema } from "./json-schema.ts";
export {
  createLink,
  type DecodeOptions,
  decodeSpec,
  DEFAULT_APP_URL,
  encodeSpec,
  readLink,
} from "./link.ts";
export {
  highlight,
  inferLanguage,
  isKnownLanguage,
  LANGUAGE_IDS,
  PLAIN_TEXT,
  resolveLanguage,
  type HighlightedLine,
  type Token,
} from "./highlight/index.ts";
export {
  FONT_SIZE,
  LINE_HEIGHT,
  cellCount,
  MAC_HEADER,
  POPOVER,
  TAB_HEADER,
  WINDOW_RADIUS,
  layout,
  type LayoutOptions,
  normalizeCode,
  type PaneBox,
  type Rect,
  type Scene,
  type TextMetrics,
  type WindowBox,
} from "./layout.ts";
export {
  addPngMetadata,
  createImageMetadata,
  type ImageMetadata,
  METADATA_BY_DEFAULT,
  PNG_KEYWORDS,
  readImageSpec,
  SOFTWARE,
  SVG_NAMESPACE,
} from "./metadata.ts";
export {
  EXTENSION_PREFIX,
  IMPLICIT_SPEC_VERSION,
  migrateLegacySpec,
  schemaVersion,
  stampSpecVersion,
} from "./migrate.ts";
export { initPng, loadSceneFonts, sceneFontFiles, svgToPng, type PngOptions } from "./png.ts";
export {
  expandLineRanges,
  LATEST_SPEC_VERSION,
  ANNOTATION_TYPES,
  MARK_STYLES,
  parseSpec,
  SPEC_LIMITS,
  SpecError,
  SpecSchema,
  type MarkStyle,
  type PaneSpec,
  type Spec,
  type SpecInput,
  type WindowSpec,
} from "./spec.ts";
export { toSvg, type SvgOptions } from "./svg.ts";
export * from "./themes/index.ts";
