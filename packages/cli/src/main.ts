import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import {
  CODE_FONT_IDS,
  CODE_FONTS,
  createLink,
  DEFAULT_APP_URL,
  DEFAULT_CODE_FONT,
  isSpecSchemaUrl,
  LANGUAGE_IDS,
  layout,
  renderScene,
  SPEC_SCHEMA_URL,
  SpecError,
  specJsonSchema,
  THEME_IDS,
  THEMES,
} from "@tin.so/core/node";
import {
  type ArgsDef,
  type CommandDef,
  defineCommand,
  type ParsedArgs,
  renderUsage,
  runCommand,
} from "citty";
import {
  checkOptions,
  closest,
  defineArgs,
  didYouMean,
  stripAnsi,
  UsageError,
  wantsHelp,
} from "./args.ts";
import { BrowserError, openUrl } from "./browser.ts";
import { ClipboardError, copyImage, copyText } from "./clipboard.ts";

export { UsageError } from "./args.ts";

export type Io = {
  cwd: string;
  env: Record<string, string | undefined>;
  // The operating system, as in process.platform. It selects the clipboard and browser tools.
  platform: string;
  // False when the output is not a terminal. Help and errors then contain no color codes.
  color: boolean;
  // True when stdin is a terminal. Without input arguments, tin reads stdin only when it is not.
  stdinIsTTY: boolean;
  readStdin: () => Promise<string>;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
};

const CODE_ARGS = defineArgs({
  code: {
    type: "string",
    valueHint: "text | -",
    description: 'Plain code as text, or "-" for code from stdin. It is never read as a spec.',
  },
  title: {
    type: "string",
    valueHint: "name",
    description:
      "File name of the code from stdin or --code, also sets the language from its extension",
  },
  language: {
    type: "string",
    alias: "l",
    valueHint: "id",
    description:
      "Language of the code from stdin or --code (default: from --title, json for JSON, else plain text)",
  },
  spec: {
    type: "boolean",
    description: 'Read the input as a spec, also without "$schema" (default: detect)',
    negativeDescription: "Read the input as plain code, never as a spec",
  },
});

const OUTPUT_ARGS = defineArgs({
  output: {
    type: "string",
    alias: "o",
    valueHint: "path",
    description: "Output file (default: name of the input + .png)",
  },
  format: {
    type: "enum",
    alias: "f",
    options: ["png", "svg"],
    description: "Image format (default: from the output extension, else png)",
  },
  scale: {
    type: "string",
    alias: "s",
    valueHint: "n",
    description: "Pixel ratio of a PNG (default: 2)",
  },
  copy: {
    type: "boolean",
    alias: "c",
    description:
      "Copy the PNG to the clipboard. Writes no file unless -o is given. Uses osascript (macOS), wl-copy or xclip (Linux), PowerShell (Windows).",
  },
  metadata: {
    type: "boolean",
    description: "Write the spec and an editor link into the image file (default)",
    negativeDescription: "Do not write the spec and an editor link into the image file",
  },
  json: { type: "boolean", description: "Print the result as JSON" },
});

const LINK_OUTPUT_ARGS = defineArgs({
  copy: {
    type: "boolean",
    alias: "c",
    description:
      "Copy the link to the clipboard. Uses pbcopy (macOS), wl-copy or xclip (Linux), clip or PowerShell (Windows).",
  },
  open: {
    type: "boolean",
    description:
      "Open the link in the default browser. Uses open (macOS), xdg-open (Linux), start (Windows).",
  },
  json: { type: "boolean", description: "Print the result as JSON: { link, copied, opened }" },
});
// Image options also override the fields of a spec
const IMAGE_ARGS = defineArgs({
  theme: {
    type: "string",
    alias: "t",
    valueHint: "id",
    description: "Theme (default: candy). Run tin themes for the list.",
  },
  mode: {
    type: "enum",
    alias: "m",
    options: ["dark", "light"],
    description: "Color mode (default: dark)",
  },
  font: {
    type: "string",
    valueHint: "id",
    description: "Code font (default: the font of the theme). Run tin fonts for the list.",
  },
  padding: {
    type: "string",
    valueHint: "px",
    description: "Space around the windows (default: 64)",
  },
  background: {
    type: "boolean",
    description: "Show the background of the theme (default)",
    negativeDescription: "Transparent background",
  },
  "line-numbers": { type: "boolean", description: "Show line numbers" },
  direction: {
    type: "enum",
    options: ["column", "row"],
    description: "Stack the windows below each other or side by side (default: column)",
  },
  "aspect-ratio": {
    type: "string",
    valueHint: "w:h",
    description: "Aspect ratio of the image, such as 16:9 for an X post",
  },
});

// Window options apply to code files and --code. A spec sets them per window.
const WINDOW_ARGS = defineArgs({
  tabs: { type: "boolean", description: "Show a tab with icon and file name above each pane" },
  "title-bar": {
    type: "boolean",
    description: "Show the title bar with the window controls (default)",
    negativeDescription: "Hide the title bar with the window controls",
  },
  frame: {
    type: "boolean",
    description: "Put the code in a window (default)",
    negativeDescription: "No window: the code goes directly on the background",
  },
  controls: {
    type: "enum",
    options: ["gray", "color"],
    description: "Colors of the window controls (default: gray)",
  },
  split: {
    type: "enum",
    options: ["row", "column"],
    description: "Put the panes side by side or below each other (default: row)",
  },
  windows: {
    type: "boolean",
    description: "Put each file in its own window, not in one split window",
  },
});

const INPUT_ARG = defineArgs({
  input: {
    type: "positional",
    required: false,
    valueHint: "file... | -",
    description:
      'Code files (one pane per file), a spec file, or "-" for stdin. Without input, tin reads stdin. A file with the name of a command needs a path, such as ./themes.',
  },
});

const SOURCE_ARGS = { ...INPUT_ARG, ...CODE_ARGS, ...IMAGE_ARGS, ...WINDOW_ARGS };
const RENDER_ARGS = { ...SOURCE_ARGS, ...OUTPUT_ARGS };
const LINK_ARGS = { ...SOURCE_ARGS, ...LINK_OUTPUT_ARGS };

type SourceValues = Partial<ParsedArgs<typeof SOURCE_ARGS>>;
type RenderValues = Partial<ParsedArgs<typeof RENDER_ARGS>>;
type LinkValues = Partial<ParsedArgs<typeof LINK_ARGS>>;

const EXAMPLE_SPEC = JSON.stringify({
  $schema: SPEC_SCHEMA_URL,
  windows: [{ panes: [{ title: "a.py", code: "print(1)" }] }],
});

const EXAMPLES = `Examples:
  tin main.ts
  tin main.ts plans.toml --tabs --no-title-bar -o plans.png
  tin worker.ts main.ts --windows --theme midnight
  pbpaste | tin --title main.ts --copy
  cat query.sql | tin --language sql -o query.png
  tin --code 'x = 1' --language python
  echo '${EXAMPLE_SPEC}' | tin -o a.png
  tin link main.ts --open
`;

const LINK_EXAMPLES = `Examples:
  tin link main.ts plans.toml --tabs
  tin link main.ts --open
  pbpaste | tin link --title main.ts --copy
`;

const DETECTION_NOTE = `Input:
  Text on stdin is a spec only when it is a JSON object whose "$schema" is the URL of the
  spec schema ("$id" in tin schema: ${SPEC_SCHEMA_URL}).
  Other text, also other JSON, is plain code. A .json file is a spec when it has this
  "$schema" or a "windows" array, else it is code. --spec and --no-spec skip the detection.
`;

const APP_URL_NOTE = `Set TIN_APP_URL to change the web editor of the links (default: ${DEFAULT_APP_URL}).\n`;

const NO_INPUT =
  "No input. Give code files, pipe code or a spec to stdin, or use --code.\nRun tin --help for the options.";

function appUrl(io: Io): string {
  return io.env.TIN_APP_URL ?? DEFAULT_APP_URL;
}

function toNumber(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number))
    throw new UsageError(`--${name} must be a number, received "${value}"`);
  return number;
}

function checkChoice(
  value: string | undefined,
  choices: Array<string>,
  name: string,
  list: string,
) {
  if (value === undefined || choices.includes(value)) return;
  throw new UsageError(
    `Unknown ${name} "${value}"${didYouMean(value, choices)}\nRun tin ${list} for the list.`,
  );
}

/** Top-level spec fields from the options. Options that are not given leave the spec as it is. */
function specOverrides(values: SourceValues): Record<string, unknown> {
  checkChoice(values.theme, THEME_IDS, "theme", "themes");
  checkChoice(values.font, CODE_FONT_IDS, "font", "fonts");
  const overrides: Record<string, unknown> = {
    theme: values.theme,
    mode: values.mode,
    font: values.font,
    padding: toNumber(values.padding, "padding"),
    direction: values.direction,
    aspectRatio: values["aspect-ratio"],
    background: values.background,
    lineNumbers: values["line-numbers"],
  };
  return Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== undefined));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The parsed JSON of the text, or undefined when the text is not JSON */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function hasSpecSchema(json: unknown, io: Io): boolean {
  return isRecord(json) && isSpecSchemaUrl(json.$schema, appUrl(io));
}

/** Parses the text of an input that --spec marks as a spec */
function parseSpecText(text: string, source: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new UsageError(
      `--spec needs a JSON spec, but ${source} is not valid JSON: ${(error as Error).message}`,
    );
  }
}

async function readStdin(io: Io): Promise<string> {
  const text = await io.readStdin();
  if (text.trim() === "") throw new UsageError(`Stdin is empty. ${NO_INPUT}`);
  return text;
}

function windowFromOptions(values: SourceValues, panes: Array<unknown>): Record<string, unknown> {
  const window: Record<string, unknown> = {
    tabs: values.tabs,
    titleBar: values["title-bar"],
    frame: values.frame,
    controls: values.controls,
    split: values.split,
  };
  return {
    ...Object.fromEntries(Object.entries(window).filter(([, value]) => value !== undefined)),
    panes,
  };
}

type Source = { spec: unknown; name: string };

async function specFromFiles(files: Array<string>, values: SourceValues, io: Io): Promise<Source> {
  const panes = await Promise.all(
    files.map(async (file) => ({
      title: basename(file),
      code: await readFile(resolve(io.cwd, file), "utf8"),
    })),
  );
  const spec = {
    windows: values.windows
      ? panes.map((pane) => windowFromOptions(values, [pane]))
      : [windowFromOptions(values, panes)],
  };
  return { spec, name: basename(files[0]!, extname(files[0]!)) };
}

/**
 * A spec with one window and one pane for plain code. Code that is a JSON object or array gets
 * the language json when no title or language is given.
 */
function specFromCode(code: string, values: SourceValues): Source {
  const parsed =
    values.title === undefined && values.language === undefined ? parseJson(code) : undefined;
  const isJson = typeof parsed === "object" && parsed !== null;
  const language = values.language ?? (isJson ? "json" : undefined);
  const pane = {
    ...(values.title !== undefined && { title: values.title }),
    ...(language !== undefined && { language }),
    code,
  };
  const name = values.title ? basename(values.title, extname(values.title)) : "tin";
  return { spec: { windows: [windowFromOptions(values, [pane])] }, name };
}

/** Reads stdin as a spec or as plain code, from the options or from the "$schema" of the JSON */
async function specFromStdin(values: SourceValues, io: Io): Promise<Source> {
  const text = await readStdin(io);
  if (values.spec === true) return { spec: parseSpecText(text, "stdin"), name: "tin" };
  const codeOptions = values.title !== undefined || values.language !== undefined;
  if (values.spec === false || codeOptions) return specFromCode(text, values);
  const json = parseJson(text);
  if (hasSpecSchema(json, io)) return { spec: json, name: "tin" };
  if (isRecord(json) && Array.isArray(json.windows))
    io.stderr(
      `The JSON on stdin has "windows" but not the "$schema" of a tin spec, so tin renders it as code.\nTo render it as a spec, add "$schema": "${SPEC_SCHEMA_URL}" or use --spec.\n`,
    );
  return specFromCode(text, values);
}

/** Reads one file as a spec when --spec says so, or when it is JSON that looks like a spec */
async function specFromFile(file: string, values: SourceValues, io: Io): Promise<Source | null> {
  if (values.spec === false) return null;
  if (values.spec === undefined && extname(file) !== ".json") return null;
  const text = await readFile(resolve(io.cwd, file), "utf8");
  const name = basename(file, extname(file));
  if (values.spec === true) return { spec: parseSpecText(text, file), name };
  const json = parseJson(text);
  // A spec from before the "$schema" field has a windows array
  if (hasSpecSchema(json, io) || (isRecord(json) && Array.isArray(json.windows)))
    return { spec: json, name };
  return null;
}

async function readSource(values: SourceValues, io: Io): Promise<Source> {
  const positionals = values._ ?? [];
  const codeOptions = values.title !== undefined || values.language !== undefined;
  if (values.spec === true && values.code !== undefined)
    throw new UsageError("--spec cannot be used with --code, which gives plain code");
  if (values.spec === true && codeOptions)
    throw new UsageError("--title and --language are for plain code, not for a spec");

  if (values.code !== undefined) {
    if (positionals.length > 0)
      throw new UsageError(
        `--code cannot be used with input files or a spec, received "${positionals.join(" ")}"`,
      );
    return specFromCode(values.code === "-" ? await readStdin(io) : values.code, values);
  }

  if (positionals.length === 0 || (positionals.length === 1 && positionals[0] === "-")) {
    if (positionals.length === 0 && io.stdinIsTTY) throw new UsageError(NO_INPUT);
    return specFromStdin(values, io);
  }
  if (positionals.includes("-"))
    throw new UsageError('"-" reads stdin and cannot be used together with input files');
  if (codeOptions)
    throw new UsageError(
      "--title and --language are for code from stdin or --code. A file gets them from its name.",
    );
  if (positionals.length === 1) {
    const spec = await specFromFile(positionals[0]!, values, io);
    if (spec) return spec;
  } else if (values.spec === true) {
    throw new UsageError(`--spec takes one input, received ${positionals.length} files`);
  }
  return specFromFiles(positionals, values, io);
}

async function buildSpec(values: SourceValues, io: Io) {
  const { spec, name } = await readSource(values, io);
  return { spec: { ...(spec as Record<string, unknown>), ...specOverrides(values) }, name };
}

async function renderCommand(values: RenderValues, io: Io) {
  const { spec, name } = await buildSpec(values, io);
  const format =
    values.format ?? (values.output && extname(values.output) === ".svg" ? "svg" : "png");
  if (values.copy && format !== "png")
    throw new UsageError(`--copy needs a PNG image, received the format "${format}"`);
  const scale = toNumber(values.scale, "scale") ?? 2;
  if (scale <= 0) throw new UsageError(`--scale must be larger than 0, received "${values.scale}"`);
  // With --copy and no -o, the image goes only to the clipboard
  const output =
    values.copy && !values.output ? null : resolve(io.cwd, values.output ?? `${name}.${format}`);
  // The default output has the name of the first input, so an input such as logo.svg must not get lost
  const inputs = (values._ ?? []).map((input) => resolve(io.cwd, input));
  if (output && !values.output && inputs.includes(output))
    throw new UsageError(
      `The image would replace its input file ${output}. Use -o to give another output file.`,
    );

  const scene = await layout(spec);
  const image = await renderScene(scene, {
    format,
    scale,
    spec,
    appUrl: appUrl(io),
    ...(values.metadata === false && { metadata: false }),
  });
  if (output) await writeFile(output, image);
  if (values.copy) await copyImage(image, { platform: io.platform, env: io.env });
  const link = await createLink(spec, appUrl(io));

  const factor = format === "png" ? scale : 1;
  const result = {
    file: output,
    format,
    width: scene.width * factor,
    height: scene.height * factor,
    copied: values.copy === true,
    link,
  };
  if (values.json) {
    io.stdout(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  const size = `${result.width}×${result.height}`;
  if (output) io.stdout(`Saved ${output} (${size})\n`);
  if (values.copy) io.stdout(`Copied the image to the clipboard (${size})\n`);
  io.stdout(`Edit: ${link}\n`);
}

/**
 * Prints the editor link. Without --json, stdout gets the link before the copy and the open, so
 * the link is in the output also when one of them fails. The notes about them go to stderr, so
 * that stdout has only the link.
 */
async function linkCommand(values: LinkValues, io: Io) {
  const { spec } = await buildSpec(values, io);
  await layout(spec);
  const link = await createLink(spec, appUrl(io));
  if (!values.json) io.stdout(`${link}\n`);
  if (values.copy) {
    await copyText(link, { platform: io.platform, env: io.env });
    if (!values.json) io.stderr("Copied the link to the clipboard\n");
  }
  if (values.open) {
    await openUrl(link, { platform: io.platform });
    if (!values.json) io.stderr("Opened the link in the browser\n");
  }
  if (values.json) {
    const result = { link, copied: values.copy === true, opened: values.open === true };
    io.stdout(`${JSON.stringify(result, null, 2)}\n`);
  }
}

const SKILL_URL = "https://github.com/zirkelc/tin.so/tree/main/skills/tin";

/**
 * The folder of the skill: the copy in the package, or the skill folder of the repository when
 * the CLI runs from its sources
 */
const SKILL_DIRS = [
  new URL("../skill/", import.meta.url),
  new URL("../../../skills/tin/", import.meta.url),
];

const SKILL_ARGS = {
  print: {
    type: "boolean",
    description: "Print the skill itself, for an agent that cannot add skills",
  },
  reference: {
    type: "positional",
    required: false,
    description: "With --print: a reference of the skill to print, such as spec",
  },
} as const satisfies ArgsDef;

async function skillCommand(values: Partial<ParsedArgs<typeof SKILL_ARGS>>, io: Io) {
  if (!values.print) {
    if (values.reference) throw new UsageError("A reference needs --print: tin skill --print spec");
    io.stdout(SKILL_TEXT);
    return;
  }
  const dir = SKILL_DIRS.find((candidate) => existsSync(new URL("SKILL.md", candidate)));
  if (!dir) throw new UsageError(`The skill is not in this package. Get it from ${SKILL_URL}`);
  const references = (await readdir(new URL("references/", dir)))
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.slice(0, -".md".length));
  if (values.reference) {
    if (!references.includes(values.reference)) {
      throw new UsageError(
        `Unknown reference "${values.reference}". The references are: ${references.join(", ")}`,
      );
    }
    io.stdout(await readFile(new URL(`references/${values.reference}.md`, dir), "utf8"));
    return;
  }
  const skill = await readFile(new URL("SKILL.md", dir), "utf8");
  // The links in the skill point to files, so the note says how to print them
  const note = references.map((name) => `- references/${name}.md: tin skill --print ${name}`);
  io.stdout(`${skill}\n---\n\nPrint the references of this skill with:\n\n${note.join("\n")}\n`);
}

const SKILL_TEXT = `The tin skill shows coding agents how to make code images with this CLI.

Add it with the skills CLI, for Claude Code, Codex, Cursor and other agents:

  npx skills add zirkelc/tin.so

Or copy the folder ${SKILL_URL}
into the skills folder of your agent: ~/.claude/skills/tin for Claude Code, or
~/.agents/skills/tin for the agents that read .agents/skills.
Use .claude/skills or .agents/skills in a project to add it only there.

An agent without skills can read the skill from this CLI: tin skill --print
`;

// The context data of each command is the Io of the run
const COMMANDS = {
  render: defineCommand({
    meta: {
      name: "render",
      description:
        "Render code files, code from stdin or a spec to a PNG or SVG (default command: `tin main.ts` is `tin render main.ts`)",
    },
    args: RENDER_ARGS,
    run: ({ args, data }) => renderCommand(args, data),
  }),
  link: defineCommand({
    meta: {
      name: "link",
      description:
        "Print a link that opens the image in the web editor, without an image. It can copy or open the link.",
    },
    args: LINK_ARGS,
    run: ({ args, data }) => linkCommand(args, data),
  }),
  themes: defineCommand({
    meta: { name: "themes", description: "List the themes" },
    run: ({ data }) => {
      for (const theme of THEMES.filter((theme) => !theme.hidden)) {
        const modes = Object.keys(theme.syntax).join("/");
        const font = CODE_FONT_IDS.includes(theme.font ?? "") ? theme.font : DEFAULT_CODE_FONT;
        data.stdout(`${theme.id.padEnd(14)}${theme.name.padEnd(14)}${modes.padEnd(12)}${font}\n`);
      }
    },
  }),
  languages: defineCommand({
    meta: { name: "languages", description: "List the languages" },
    run: ({ data }) => data.stdout(`${LANGUAGE_IDS.join("\n")}\n`),
  }),
  fonts: defineCommand({
    meta: { name: "fonts", description: "List the fonts" },
    run: ({ data }) => {
      for (const font of CODE_FONTS) data.stdout(`${font.id.padEnd(18)}${font.name}\n`);
    },
  }),
  schema: defineCommand({
    meta: { name: "schema", description: "Print the JSON Schema of the spec" },
    run: ({ data }) => data.stdout(`${JSON.stringify(specJsonSchema(), null, 2)}\n`),
  }),
  skill: defineCommand({
    meta: {
      name: "skill",
      description:
        "Show how to add the tin skill to a coding agent, or print the skill with --print",
    },
    args: SKILL_ARGS,
    run: ({ args, data }) => skillCommand(args, data),
  }),
  // The router in main shows the help, so this command only gives the entry in the list
  help: defineCommand({
    meta: { name: "help", description: "Show the help of tin, or of a command: tin help link" },
  }),
} satisfies Record<string, CommandDef<any>>;

type CommandName = keyof typeof COMMANDS;

// The root help shows the usage of render, because render is the default command
const ROOT = defineCommand({
  meta: {
    name: "tin",
    description:
      "Renders code images from code files, code on stdin or a JSON spec, without a browser",
  },
  args: RENDER_ARGS,
});

function isCommand(name: string | undefined): name is CommandName {
  return name !== undefined && Object.hasOwn(COMMANDS, name);
}

function commandList(): string {
  const names = Object.keys(COMMANDS);
  const width = Math.max(...names.map((name) => name.length)) + 4;
  const lines = Object.entries(COMMANDS).map(
    ([name, command]) =>
      `  ${name.padEnd(width)}${(command.meta as { description: string }).description}`,
  );
  return `COMMANDS\n\n${lines.join("\n")}\n\nUse tin <command> --help for more information about a command.\n`;
}

async function help(name: CommandName | undefined): Promise<string> {
  if (!name || name === "help")
    return `${await renderUsage(ROOT)}\n\n${commandList()}\n${EXAMPLES}\n${DETECTION_NOTE}\n${APP_URL_NOTE}`;
  const usage = await renderUsage(COMMANDS[name], ROOT);
  if (name === "render") return `${usage}\n${EXAMPLES}\n${DETECTION_NOTE}\n${APP_URL_NOTE}`;
  if (name === "link") return `${usage}\n${LINK_EXAMPLES}\n${DETECTION_NOTE}\n${APP_URL_NOTE}`;
  return `${usage}\n`;
}

/**
 * A first argument that is not a file and is close to a command name is a typo of the command,
 * not a file that does not exist.
 */
function checkCommandTypo(arg: string, io: Io) {
  if (arg.startsWith("-") || existsSync(resolve(io.cwd, arg))) return;
  const command = closest(arg, Object.keys(COMMANDS));
  if (command)
    throw new UsageError(
      `Unknown command or file "${arg}", did you mean ${command}?\nRun tin --help for the commands.`,
    );
}

/** Reads stdin only once, so that the router and the command can both use it */
function onceStdin(io: Io): Io {
  let stdin: Promise<string> | undefined;
  return { ...io, readStdin: () => (stdin ??= io.readStdin()) };
}

/**
 * Runs the CLI and returns the exit code. A first argument that is a command name runs that
 * command, also when a file with that name exists. All other arguments go to render.
 */
export async function main(args: Array<string>, systemIo: Io): Promise<number> {
  const io = onceStdin(systemIo);
  const plain = (text: string) => (io.color ? text : stripAnsi(text));
  const [first] = args;
  const explicit = isCommand(first);
  const name: CommandName = explicit ? first : "render";
  const rest = explicit ? args.slice(1) : args;
  try {
    if (name === "help") {
      const topic = rest[0];
      io.stdout(plain(await help(isCommand(topic) ? topic : undefined)));
      return 0;
    }
    if (wantsHelp(rest)) {
      io.stdout(plain(await help(explicit ? name : undefined)));
      return 0;
    }
    // tin without arguments and without code on stdin shows the help
    if (args.length === 0 && (io.stdinIsTTY || (await io.readStdin()).trim() === "")) {
      io.stdout(plain(await help(undefined)));
      return 0;
    }
    if (!explicit && first !== undefined) checkCommandTypo(first, io);
    const others = Object.entries(COMMANDS)
      .filter(([other]) => other !== name)
      .map(([other, command]) => ({ name: other, args: (command.args ?? {}) as ArgsDef }));
    checkOptions(rest, { name, args: (COMMANDS[name].args ?? {}) as ArgsDef }, others);
    await runCommand(COMMANDS[name], { rawArgs: rest, data: io });
    return 0;
  } catch (error) {
    if (
      error instanceof SpecError ||
      error instanceof UsageError ||
      error instanceof ClipboardError ||
      error instanceof BrowserError
    ) {
      io.stderr(`${error.message}\n`);
      return 1;
    }
    // Errors of the argument parser, for example an invalid value of an enum option
    if (error instanceof Error && error.name === "CLIError") {
      io.stderr(plain(`${error.message}\nRun tin ${name} --help for the options.\n`));
      return 1;
    }
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      io.stderr(`${error.message}\n`);
      return 1;
    }
    throw error;
  }
}
