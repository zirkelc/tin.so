export type JsonTokenKind = "key" | "string" | "number" | "literal" | "punctuation";

export type JsonToken = { text: string; kind?: JsonTokenKind };

// A string with an optional colon after it, a literal, a number, or a punctuation mark
const TOKEN =
  /("(?:\\.|[^"\\\n])*"?)(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\],]/g;

/**
 * Splits JSON text into tokens for syntax highlighting. Text that is not JSON, such as white
 * space or an error, is a token without a kind, so that the tokens always give the full text.
 */
export function jsonTokens(text: string): Array<JsonToken> {
  const tokens: Array<JsonToken> = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > last) tokens.push({ text: text.slice(last, match.index) });
    const [all, string, colon] = match;
    if (string !== undefined) {
      tokens.push({ text: string, kind: colon ? "key" : "string" });
      if (colon) tokens.push({ text: colon, kind: "punctuation" });
    } else if (/^[{}[\],]$/.test(all)) {
      tokens.push({ text: all, kind: "punctuation" });
    } else {
      tokens.push({ text: all, kind: /^[-\d]/.test(all) ? "number" : "literal" });
    }
    last = match.index + all.length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last) });
  return tokens;
}
