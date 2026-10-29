# tin.so

The `tin` CLI makes images of code (code screenshots) on your machine, without a browser and without an account. Give it code files, pipe code to it, or give it a JSON spec for an image with several windows, panes and popovers. It saves a PNG or SVG, or copies the image to the clipboard, and prints a link that opens the same image in the [tin.so](https://tin.so) web editor.

It has all [ray.so](https://ray.so) themes, line highlights, text styles and colors, tabs with file icons, and fixed aspect ratios for social media. An [agent skill](https://github.com/zirkelc/tin.so/tree/main/skills/tin) shows coding agents how to use it.

## Installation

```bash
npx tin.so main.ts        # run it without an installation
npm install -g tin.so     # or install the tin command
```

Node 22.18 or later.

## Usage

```bash
# One file
tin main.ts

# Two files side by side in one window, with tabs
tin main.ts plans.toml --tabs --no-title-bar -o plans.png

# Each file in its own window, with a theme
tin worker.ts main.ts --windows --theme midnight

# Code from stdin, copied to the clipboard
pbpaste | tin --title main.ts --copy

# An image for a post on X
tin main.ts --aspect-ratio 16:9

# A JSON spec, for popovers, highlights and styles
tin spec.json

# Only the editor link, opened in the browser
tin link main.ts --open
```

Each run prints the file and an `Edit:` link. The image file also contains the spec and the link, so you can drop it into the editor later and change it. `--no-metadata` turns this off.

## Commands

| Command                | What it does                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `tin [render] <input>` | Renders code files, code from stdin or a spec to a PNG or SVG. `render` is the default command |
| `tin link <input>`     | Prints the editor link without an image. `--copy` copies it, `--open` opens it in the browser  |
| `tin themes`           | Lists the themes                                                                               |
| `tin languages`        | Lists the languages                                                                            |
| `tin fonts`            | Lists the fonts                                                                                |
| `tin schema`           | Prints the JSON Schema of the spec                                                             |
| `tin help [command]`   | Shows the help of tin, or of a command. `tin <command> --help` is the same                     |

A file with the name of a command needs a path, such as `./themes`.

## Options

| Option                                  | What it does                                                         |
| --------------------------------------- | -------------------------------------------------------------------- |
| `-o, --output <path>`                   | The output file. A name that ends with `.svg` gives an SVG           |
| `-f, --format <png\|svg>`               | The image format (default: from the output name, else PNG)           |
| `-s, --scale <n>`                       | The pixel ratio of a PNG (default: 2)                                |
| `-c, --copy`                            | Copies the PNG to the clipboard. Writes no file unless `-o` is given |
| `-t, --theme <id>`                      | The theme (default: `candy`)                                         |
| `-m, --mode <dark\|light>`              | The color mode (default: dark)                                       |
| `--font <id>`                           | The code font (default: the font of the theme)                       |
| `--padding <px>`                        | The space around the windows (default: 64)                           |
| `--no-background`                       | A transparent background                                             |
| `--line-numbers`                        | Shows line numbers                                                   |
| `--aspect-ratio <w:h>`                  | `16:9` for X, `1.91:1` for LinkedIn, `1:1`, `4:5`, `9:16`            |
| `--tabs`                                | A tab with the file icon and name above each pane                    |
| `--no-title-bar`                        | Hides the title bar with the window controls                         |
| `--no-frame`                            | No window: the code goes directly on the background                  |
| `--controls <gray\|color>`              | The colors of the window controls (default: gray)                    |
| `--split <row\|column>`                 | Panes side by side or below each other (default: row)                |
| `--windows`                             | Each file in its own window                                          |
| `--direction <column\|row>`             | Windows below each other or side by side (default: column)           |
| `--title <name>`, `-l, --language <id>` | The file name and the language of code from stdin or `--code`        |
| `--code <text>`                         | Code as text, without stdin                                          |
| `--spec`, `--no-spec`                   | Reads the input as a spec, or as plain code (default: detect)        |
| `--no-metadata`                         | Writes no spec and no link into the image                            |
| `--json`                                | Prints the result as JSON                                            |

`tin --help` has the full list. An unknown option is an error that names the closest option.

## Specs

A spec is JSON that describes the whole image: its windows, the panes of each window, and the code of each pane with its highlights, styles and popovers. On stdin, JSON is a spec only when its `"$schema"` is the URL of the tin spec schema. Other text, also other JSON, is code.

```bash
tin -o hover.png <<'EOF'
{
  "$schema": "https://tin.so/schema/v1.json",
  "windows": [
    {
      "panes": [
        {
          "title": "user.ts",
          "code": "const user = await getUser(id);",
          "annotations": [{ "line": 1, "match": "user", "code": "const user: { id: string }" }]
        }
      ]
    }
  ]
}
EOF
```

`tin schema` prints the full JSON Schema, with a description, a default and the limits of each field. The [`@tin.so/core`](https://www.npmjs.com/package/@tin.so/core) README has an overview.

## Environment

- `TIN_APP_URL` changes the web editor of the links (default: `https://tin.so/`).
- `--copy` uses `osascript` on macOS, `wl-copy` or `xclip` on Linux, and PowerShell on Windows.

## License

MIT
