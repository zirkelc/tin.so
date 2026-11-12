<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/web/public/logo-dark.svg">
    <img alt="tin.so" src="apps/web/public/logo-light.svg" height="64">
  </picture>
</h1>

<p align="center"><strong>Beautiful code images. For humans and agents.</strong></p>

<p align="center">
  <a href="https://tin.so">Web editor</a> ·
  <a href="#cli">CLI</a> ·
  <a href="#agent-skill">Agent skill</a> ·
  <a href="#the-spec">Spec</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/tin.so"><img alt="npm" src="https://img.shields.io/npm/v/tin.so?color=6e40c9"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-6e40c9"></a>
</p>

<p align="center">
  <img alt="Two files in one window, with a popover that shows the type of a variable and a highlighted line" src="docs/images/hero.png" width="860">
</p>

tin.so makes images of code that show more than one snippet: split panes, stacked windows and popovers that point to a word. Highlight lines, give any part of the code a style or a color, and pick one of 14 editor themes and a background. People use the [web editor](https://tin.so), and agents use the [CLI](#cli) and the [agent skill](#agent-skill). Both use the same renderer, so they make the same image without a server or a browser.

## Web editor

<p align="center">
  <img alt="The tin.so web editor with the image settings on the left and a code window on a gradient background" src="docs/images/editor.png" width="860">
</p>

Open [tin.so](https://tin.so), type or paste your code into the window, and save a PNG or SVG. You need no account, and your code stays in your browser: the image renders on your computer, and a shared link keeps the image in the URL fragment, which never goes to a server.

## Features

### Several snippets in one image

<p align="center">
  <img alt="Two windows that overlap: an editor with index.html above main.tsx, and a terminal" src="docs/images/layout.png" width="560">
</p>

An image can show more than one file. Split a window into panes, put several windows below each other or side by side, or place windows freely and let them overlap.

- Split a window into panes, side by side or below each other.
- Put several windows below each other or side by side.
- Place windows anywhere in a free layout, where they can overlap.
- Resize the image at its edges. With an aspect ratio, the image keeps the ratio.

### Arrange windows

- Move and resize windows, panes and popovers with the mouse. A window snaps to the center of the image and to the other windows.
- Select several windows with a box, with Shift-click or with ⌘A, then align or distribute them.
- Change the order of overlapping windows as in Figma, with ⌘] and ⌘[.
- Duplicate windows with ⌘D, and copy and paste them with ⌘C and ⌘V, also from one browser tab to another.
- A toolbar above the selected windows and the right-click menus give the actions for each window.
- Zoom in and out, or fit the image to the screen.

### Popovers

<p align="center">
  <img alt="A popover below the word fetch that shows the signature of the function, in light mode" src="docs/images/popover.png" width="700">
</p>

A popover points to a word in the code and looks like the hover card of an editor. Use it to show a type, a signature or a value next to the code that uses it.

- Select a word, right-click and choose "Add popover".
- A popover has its own code and language.
- Move and resize a popover. Double-click it to put it back below its word.

### Highlights, styles and colors

<p align="center">
  <img alt="Code with line numbers, a highlighted line, a bold yellow number, a struck-through comment, a green fill and an underlined pink word" src="docs/images/marks.png" width="560">
</p>

Show the reader where to look. Highlight full lines, or give any part of a line a style, a text color or a fill.

- Highlight lines. Option-click a line, or right-click the code.
- Give a highlight a color, such as blue for a note or red for an error, in the Highlight submenu of the code. The lines get a tint of the color and a bar at the left edge.
- Bold, italic, underline and strikethrough on any part of a line, also in popovers.
- A wavy line below a part of a line, as an editor marks an error, in the red of the theme.
- Text colors and fills from a palette of 16 colors, or any hex color in a spec. The fill is translucent, as a highlighter.
- Select code in the image to open a panel with the colors and the styles.
- Highlights, styles and popovers stay on their lines when you edit the code.
- Line numbers for all panes or for one pane.

### Themes

<p align="center">
  <img alt="The same function in all 14 themes" src="docs/images/themes.png" width="860">
</p>

- 14 themes of code editors: Ayu, Catppuccin, Dracula, GitHub, Material, Night Owl, Nord, One Dark, Rosé Pine, Solarized, SynthWave '84, Tokyo Night, Vitesse and VS Code. The code has the exact colors of the original theme. Most themes have a dark and a light variant, and the mode switch selects one.
- Point to a theme, a background or a font in its list to see it on the image at once.
- 9 code fonts: JetBrains Mono, Geist Mono, IBM Plex Mono, Fira Code, Roboto Mono, Commit Mono, Space Mono, Source Code Pro and Google Sans Code.

### Backgrounds

<p align="center">
  <img alt="The 55 background presets: colors, gradients and meshes" src="docs/images/backgrounds.png" width="860">
</p>

- 55 presets of colors, gradients and meshes, a color picker, and your own CSS linear or radial gradients.
- An opacity slider, down to a transparent image.
- Padding around the windows.

### Sizes for social media

<p align="center">
  <img alt="A Python window in the Catppuccin theme on a violet gradient, in the 16:9 format" src="docs/images/social.png" width="560">
</p>

- Aspect ratio presets in the editor: 16:9 (X post, YouTube), 1.91:1 (Open Graph, LinkedIn), 1:1, 4:5 (Instagram), 9:16 (Story, Reels, TikTok), 4:3 (slides), 3:2 and 2:1.
- Any aspect ratio from 1:10 to 10:1 in a spec. The windows stay in the center.

### Windows

<p align="center">
  <img alt="Four windows side by side in the Dracula theme: a terminal with gray controls, a window with color controls and a tab, a window with only a tab, and a window without a title bar" src="docs/images/windows.png" width="860">
</p>

- A title bar with a title, or no title bar.
- A solid title bar, with its own color and a line below it. The title, the controls and the style of the title bar are together in its own box in the window settings.
- Gray window controls, or red, yellow and green as in macOS.
- A tab for each pane, with the file name and the icon of the language or any icon from a list.
- No window: the code goes directly on the background.
- Edit the titles and the file names directly in the image.

### Code

<p align="center">
  <img alt="One window with Rust, Python and SQL side by side in the One Dark theme, each tab with the icon of its language" src="docs/images/code.png" width="860">
</p>

- Type the code directly in the image.
- Syntax highlighting with Shiki for all its languages. The language comes from the file name, or you select it: the popular languages are at the top, and the search also finds other names, such as "bash" for Shell.
- Terminal output with its color codes, in the terminal colors of the theme. Code with color codes gets the language Terminal Output (`ansi`) by itself, for example from `oxlint --color | tin`.
- An example for each of the 242 languages.
- Format the code with Prettier, for JavaScript, TypeScript, JSON, CSS, HTML, Markdown, YAML and more.
- Edit the full spec as JSON, with each problem shown while you type.

### Export

- Save a PNG (1x, 2x or 4x) or an SVG, or copy the image to the clipboard.
- Copy an image of only one window or of the selected windows.
- A short message over the image confirms each copy and save, with the file name of a saved image, or tells you when it failed.
- The SVG contains the fonts, so it looks the same everywhere.
- The image file holds its spec. Drop it into the editor to edit the image again, or render it again with the CLI and other options, such as `tin auth.png --theme dracula -o auth-dark.png`.
- The image renders on your computer, with no server and no browser screenshot.

### Share

- Copy a link that opens the same image in the editor.
- The link holds the image in the URL fragment, so it never goes to a server.
- The address bar always holds the current image, so a reload or a bookmark keeps it.

### Keyboard shortcuts

| Keys             | Action                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------- |
| ⌘B, ⌘I, ⌘U, ⌘⇧X  | Bold, italic, underline, strikethrough                                                      |
| ⇧⌥F              | Format the code                                                                             |
| ⌥-click          | Highlight a line                                                                            |
| ⌘A, Esc          | Select all windows, clear the selection                                                     |
| ⌘D               | Duplicate the selected window                                                               |
| ⌘C, ⌘V           | Copy and paste windows                                                                      |
| ⌘], ⌘⇧], ⌘[, ⌘⇧[ | Bring the selected window forward or to front, or send it backward or to back (free layout) |
| ⌫                | Remove the selected windows or popover                                                      |
| ?                | Show all shortcuts                                                                          |

## CLI

The `tin` CLI renders code files, code on stdin or a JSON spec to a PNG or SVG on your machine, with no browser and no account. Every image comes with a link that opens the same image in the web editor, so a person can change it by hand.

```bash
npx tin.so main.ts        # run it without an installation
npm install -g tin.so     # or install the tin command
```

It needs Node 22.18 or later.

```bash
# One file
tin main.ts

# Two files side by side in one window, with tabs
tin schema.ts route.ts --tabs --no-title-bar -o api.png

# Each file in its own window, with a theme
tin worker.ts main.ts --windows --theme tokyo-night

# Code from the clipboard, copied back as an image
pbpaste | tin --title main.ts --copy

# An image for a post on X
tin main.ts --aspect-ratio 16:9 --background "linear-gradient(135deg, #1e1b4b, #f472b6)"

# A spec, for popovers, highlights and styles
tin spec.json

# An image that tin made, again with another theme
tin auth.png --theme dracula -o auth-dark.png

# Only the editor link, opened in the browser
tin link main.ts --open
```

| Command                | What it does                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `tin [render] <input>` | Renders code files, code from stdin or a spec to a PNG or SVG. `render` is the default command |
| `tin link <input>`     | Prints the editor link without an image. `--copy` copies it, `--open` opens it in the browser  |
| `tin themes`           | Lists the themes                                                                               |
| `tin languages`        | Lists the languages                                                                            |
| `tin fonts`            | Lists the fonts                                                                                |
| `tin schema`           | Prints the JSON Schema of the spec                                                             |
| `tin skill`            | Prints the agent skill and how to add it                                                       |
| `tin help [command]`   | Shows the help of tin, or of a command. `tin <command> --help` is the same                     |
| `tin --version`        | Prints the version of tin. `tin -v` is the same                                                |

- Render several files in one image: one pane per file, or one window per file with `--windows`.
- Pipe code from the clipboard or another command, and copy the image back with `--copy`.
- Options set the theme, mode, font, background, padding, line numbers and aspect ratio.
- The CLI prints the saved file and an editor link, or JSON with `--json`.
- An error names the closest option, theme or font, and an invalid spec gives a list of all its problems.

The [CLI README](packages/cli/README.md) lists all options.

## Agent skill

The [tin skill](skills/tin/SKILL.md) shows coding agents such as Claude Code, Codex and Cursor how to use the CLI. With the skill, you can ask your agent for "an image of this function for X" or "the schema and the route side by side, with the type of `user` as a popover", and the agent writes the command or the spec, renders the image and gives you the file and the editor link.

```bash
npx skills add zirkelc/tin.so
```

In Claude Code, you can install the skill as a plugin:

```
/plugin install tin --marketplace zirkelc/tin.so
```

### Agents in a browser

The web editor has a versioned API on `window.tin` for agents that drive a browser instead of the CLI: read and set a spec, wait until the first image is ready, and export an image, with or without the spec in the file.

```js
await window.tin.ready;
await window.tin.setSpec(spec); // rejects with the issues of an invalid spec
const { dataUrl, width, height } = await window.tin.export({ format: "png", scale: 2 });
```

## The spec

A spec is JSON that describes the whole image: its windows, the panes of each window, and the code of each pane with its highlights, styles and popovers. The web editor, the CLI, the links and the image files all use the same spec. This spec makes the image at the top of this README, without the code of `schema.ts`:

```json
{
  "$schema": "https://tin.so/schema/v1.json",
  "windows": [
    {
      "tabs": true,
      "titleBar": false,
      "panes": [
        { "title": "schema.ts", "code": "import { z } from \"zod\";\n…" },
        {
          "title": "route.ts",
          "code": "import { User } from \"./schema\";\n…",
          "highlight": [4],
          "annotations": [{ "line": 4, "match": "user", "code": "const user: {\n  id: string;\n…" }]
        }
      ]
    }
  ]
}
```

- [`packages/core/src/spec.ts`](packages/core/src/spec.ts) defines the spec. Its JSON Schema is at `https://tin.so/schema/v1.json`, and `tin schema` prints it. A spec file with `"$schema"` gets checks and completion in editors such as VS Code.
- The spec has a version, so old links and image files keep working when the spec changes.
- Keys that start with `x-` hold data of other tools. The renderer ignores them.

The [spec reference of the skill](skills/tin/references/spec.md) explains every field with examples.

## Development

```bash
pnpm install
pnpm dev     # starts the web editor on http://localhost:5173
pnpm ready   # check, build and test everything
```

[docs/development.md](docs/development.md) describes the packages, the tests, the image scripts and the deploy. [docs/releases.md](docs/releases.md) describes the releases.

## License

[MIT](LICENSE). The editor themes come from their projects, most of them through Shiki (MIT or Apache 2.0), the file icon from Lucide (ISC), the language icons from Simple Icons (CC0), and the fonts are under the SIL Open Font License, except Commit Mono (MIT). See [`packages/core/THIRD_PARTY_NOTICES.md`](packages/core/THIRD_PARTY_NOTICES.md).

<!--
TODO (not shown on GitHub)

- Raycast extension: make a code image from the selected text or the clipboard, with the CLI or the core package.
- VS Code extension: make a code image of the selected code, with the file name and the language of the editor.
- PWA: install the web editor as an app, with offline use and the share target for code and images.
- Hidden watermark: a weak pattern in the pixels of a PNG that marks it as made with tin.so (about 32 bits: a marker and a version, no user or image ID). Phase 1 survives JPEG at the same size (8×8 DCT blocks, repeated bits, a `tin detect` command and a check on drop in the editor), about 1 to 2 days. Phase 2 survives scaling, cropping and screenshots (a sync pattern or a scale search), about a week, with an open result. Risk: noise or banding in the smooth gradients and flat panels of code images. The privacy notice must mention it. A cheap alternative is an optional visible "tin.so" text in a corner.
- Ambient backgrounds: the spec values "ambient-blur" (a blurred and larger copy of the code behind the window, about 260 ms for each export), "ambient-code" (a mesh of the 3 colors that cover the most characters of the code) and "ambient-theme" (a mesh of the keyword, string, function and constant colors of the theme). The renderer, its tests and the Ambient tab of the background panel are done. To enable them, set `AMBIENT_ENABLED` to true in `packages/core/src/ambient.ts`, unskip the ambient tests of the renderer and the editor, move the keywords to the accepted list of the spec tests, add them to the description of `background` in the spec, and update spec.md, SKILL.md and the Features list. Open question: keep both meshes, or only one of them.
- Branding: upload a logo image and move it in the image, for example a company logo in a corner. The spec keeps its position and size.
- Saved preferences: the web editor and the CLI keep the last theme, mode, background, font and other image settings as local state, so a user does not have to give them again. The editor keeps them in the browser storage (it keeps only the export format now). The CLI keeps them in a config file, for example `~/.config/tin/config.json`, with a command to show and reset them. A value in a spec or an option always comes first. Open question: does the CLI save the values of each run, or only the values that `tin config set` writes, so that the output of an agent does not change from one run to the next?
-->
