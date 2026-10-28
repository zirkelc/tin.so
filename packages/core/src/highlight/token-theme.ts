/**
 * Adapted from ray.so (MIT, https://github.com/raycast/ray-so), which adapted it from the Shiki
 * css-variables theme. Each rule colors a TextMate scope with a placeholder that names a key of the
 * theme syntax, so one highlight pass works for all themes and modes.
 */
import type { ThemeRegistration } from "shiki";
import type { Syntax } from "../themes/index.ts";

const PREFIX = "var(--token-";

const color = (key: keyof Syntax) => `${PREFIX}${key})`;

/** Resolves a token color from the placeholder theme to a color of the syntax */
export function resolveTokenColor(placeholder: string | undefined, syntax: Syntax): string {
  if (!placeholder?.startsWith(PREFIX)) return placeholder ?? syntax.foreground;
  const key = placeholder.slice(PREFIX.length, -1) as keyof Syntax;
  return syntax[key] ?? syntax.foreground;
}

export const TOKEN_THEME: ThemeRegistration = {
  name: "code-image-tokens",
  type: "dark",
  colors: {
    "editor.foreground": color("foreground"),
    "editor.background": "#00000000",
  },
  tokenColors: [
    {
      scope: [
        "keyword.operator.accessor",
        "meta.group.braces.round.function.arguments",
        "meta.template.expression",
        "markup.fenced_code meta.embedded.block",
      ],
      settings: { foreground: color("foreground") },
    },
    { scope: "emphasis", settings: { fontStyle: "italic" } },
    {
      scope: ["strong", "markup.heading.markdown", "markup.bold.markdown"],
      settings: { fontStyle: "bold" },
    },
    { scope: ["markup.italic.markdown"], settings: { fontStyle: "italic" } },
    {
      scope: "meta.link.inline.markdown",
      settings: { fontStyle: "underline", foreground: color("link") },
    },
    {
      scope: [
        "string",
        "markup.fenced_code",
        "markup.inline",
        "string.quoted.docstring.multi.python",
      ],
      settings: { foreground: color("string") },
    },
    {
      scope: [
        "comment",
        "string.quoted.docstring.multi",
        "meta.diff.header.from-file",
        "meta.diff.header.to-file",
      ],
      settings: { foreground: color("comment") },
    },
    {
      scope: [
        "constant.numeric",
        "constant.language",
        "constant.other.placeholder",
        "constant.character.format.placeholder",
        "variable.language.this",
        "variable.other.object",
        "variable.other.class",
        "variable.other.constant",
        "meta.property-name",
        "meta.property-value",
        "support",
      ],
      settings: { foreground: color("constant") },
    },
    {
      scope: [
        "keyword",
        "storage.modifier",
        "storage.type",
        "storage.control.clojure",
        "entity.name.function.clojure",
        "entity.name.tag.yaml",
        "support.function.node",
        "support.type.property-name.json",
        "punctuation.separator.key-value",
        "punctuation.definition.template-expression",
      ],
      settings: { foreground: color("keyword") },
    },
    { scope: "variable.parameter.function", settings: { foreground: color("parameter") } },
    {
      scope: [
        "support.function",
        "entity.name.type",
        "entity.other.inherited-class",
        "meta.function-call",
        "meta.instance.constructor",
        "entity.other.attribute-name",
        "entity.name.function",
        "constant.keyword.clojure",
      ],
      settings: { foreground: color("function") },
    },
    {
      scope: [
        "entity.name.tag",
        "string.quoted",
        "string.regexp",
        "string.interpolated",
        "string.template",
        "string.unquoted.plain.out.yaml",
        "keyword.other.template",
      ],
      settings: { foreground: color("stringExpression") },
    },
    {
      scope: [
        "punctuation.definition.arguments",
        "punctuation.definition.dict",
        "punctuation.separator",
        "meta.function-call.arguments",
      ],
      settings: { foreground: color("punctuation") },
    },
    {
      scope: ["markup.underline.link", "punctuation.definition.metadata.markdown"],
      settings: { foreground: color("link") },
    },
    {
      scope: ["beginning.punctuation.definition.list.markdown"],
      settings: { foreground: color("string") },
    },
    {
      scope: [
        "punctuation.definition.string.begin.markdown",
        "punctuation.definition.string.end.markdown",
        "string.other.link.title.markdown",
        "string.other.link.description.markdown",
      ],
      settings: { foreground: color("keyword") },
    },
    {
      scope: ["constant.numeric.decimal", "constant.language.boolean", "meta.var.exp.ts"],
      settings: { foreground: color("number") },
    },
    { scope: ["meta.objectliteral"], settings: { foreground: color("objectLiteral") } },
    { scope: ["support.variable.property"], settings: { foreground: color("property") } },
    {
      scope: ["punctuation.definition.deleted.diff", "markup.deleted.diff"],
      settings: { foreground: color("diffDeleted") },
    },
    {
      scope: ["punctuation.definition.inserted.diff", "markup.inserted.diff"],
      settings: { foreground: color("diffInserted") },
    },
  ],
};
