<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/web/public/logo-dark.svg">
    <img alt="tin.so" src="apps/web/public/logo-light.svg" height="64">
  </picture>
</h1>

> Life's too short for ugly code

Create images of code, with several snippets in one image: split panes, stacked windows, popovers that point to a token, 14 editor themes such as GitHub, Dracula, Nord and Catppuccin, and gradient backgrounds. A web editor for people, and a CLI and a skill for agents. Both use the same renderer, so they make the same image. Neither needs a server or a browser to render.

## Features

### Several snippets in one image

- Split a window into panes, side by side or below each other.
- Stack several windows in one image, below each other or side by side.
- Put windows anywhere in a free layout, and let them overlap. The image grows when a window gets larger. Reset the layout to go back to padding and direction.
- Resize windows and panes in the image. In a spec, set the size of each pane, each window, the image and the gap between the windows in px.
- Any aspect ratio from 1:10 to 10:1 in a spec, alone or with a width or a height. Aspect ratio presets in the editor: 16:9 (X post, YouTube), 1.91:1 (Open Graph, LinkedIn), 1:1, 4:5 (Instagram), 9:16 (Story, Reels, TikTok), 4:3 (slides), 3:2 and 2:1. The windows stay in the center.
- Add panes to the right or below, and remove a pane with its × button in the image.
- Add, duplicate (⌘D) and remove windows.
- Copy and paste windows with ⌘C and ⌘V, also from one browser tab to another. The clipboard gets the windows as spec JSON, and a paste of any spec JSON with windows adds them. In the free layout, a pasted window moves a little down and to the right.
- Resize the whole image at its right edge, its bottom edge or its corner. With an aspect ratio, the image keeps the ratio. Double-click a handle to fit the image to the windows again.
- Center a window horizontally or vertically in the image.

### Windows

- A title bar with the window controls and a title, or no title bar.
- Gray window controls, or red, yellow and green as in macOS. Click the controls in the image to switch.
- A tab above each pane, with the icon of the language and the file name.
- An icon per tab: the icon of the language, a file icon, no icon, or any icon from the list. Click a tab icon in the image to pick another icon from a list with search.
- No window: the code goes directly on the background.
- Turn the window, the title bar, the tabs and the control colors on and off with the toggle buttons in the Frame row.
- Edit the window title and the file names of the tabs directly in the image.
- The editor finds the language from the file name ("Auto (TypeScript)"), or you select it.

### Code

- Syntax highlighting with Shiki, for all Shiki languages.
- A short example for each of the 242 languages. When you pick a language for a pane that has no code or still has an example, the pane gets the example of that language with a typical file name, such as `main.py` or `Dockerfile`. Code that you wrote stays.
- The language comes from the file name, also for extensions such as `.ex`, `.sol`, `.ml` and `.service`.
- Highlight lines and ranges of lines.
- Bold, italic, underline and strikethrough on any part of a line, in the code and in popovers. Select code and right-click "Clear styles" to remove its styles, colors and fills.
- A text color and a fill on any part of a line, in the code and in popovers, from a palette of 16 colors in the editor, or any hex color with or without alpha in a spec. The fill is translucent, as a highlighter, so the code stays readable.
- Select code or popover code in the image to open a panel above the selection with the text colors, the fills and the styles. "None" removes a text color or a fill, "Clear" removes all styles and colors of the selection, and the panel shows the current colors and styles.
- Highlights, styles and popovers stay on their lines when you add or remove lines above them, also when several lines have the same text. Deleting a line removes its highlight and styles, also in popover code, and its popovers move to the line of the edit.
- Popovers below a word that look like the hover card of an editor, for example to show a type. A popover has its own code and language. It is a little lighter than its window in dark mode and darker in light mode, so it stands out from the code below it. A spec can give a popover or a window its own background color in place of the theme color. Select a word in one line, right-click and choose "Add popover". The popover starts with the selected word as its code.
- The window card in the sidebar lists the popovers of each pane, with their word and line. A click on a row selects the popover and shows its settings below the row, the pointer on a row highlights the popover in the image, and a row marks a popover whose word is no longer in the code.
- Click a popover to select it. Its right-click menu and the sidebar reset, fit or remove it, the sidebar sets its language, and ⌫ removes it.
- Move a popover, and resize it at its corner. Double-click it to put it back below its word.
- A notice shows popovers whose word is no longer in the code, with a Remove button.
- Line numbers in all panes with one switch in the Image section, or per pane with the switch of the pane, which overrides the image. The switch of the image resets all panes.
- Format the code with Prettier: JavaScript, JSX, TypeScript, TSX, JSON, JSONC, JSON5, CSS, SCSS, Less, HTML, Vue, Markdown, YAML and GraphQL. The format keeps the code on few lines: an object that fits goes on one line, and the line width follows the aspect ratio (100 characters for an image without an aspect ratio or one of 1.5:1 or wider such as 16:9, 88 for 4:3, 72 for 1:1 and 4:5, and 60 for 9:16).
- Tab inserts two spaces in the code, in a popover and in the JSON editor.

### Themes and look

- 14 themes of code editors from Shiki: Ayu, Catppuccin, Dracula, GitHub, Material, Night Owl, Nord, One Dark, Rosé Pine, Solarized, SynthWave '84, Tokyo Night, Vitesse and VS Code. The code has the exact colors of the original theme, and the window has its background. A theme with a dark and a light variant, such as Catppuccin Mocha and Latte, follows the mode switch. Dracula and Tokyo Night also have their official light variants (Alucard and Tokyo Night Light), which Shiki does not have. A theme with only one mode turns off the mode switch. The default theme is GitHub.
- The theme list shows each theme name with a small preview (its own background with a window that shows real lines of the start example in the theme colors, in the current mode), and it has a search field. The theme list and the font list stay open after a choice and close with their X button, Escape or a click outside. The closed Theme field shows the colors of the theme as dots after its name. A new page opens with a React counter in the GitHub theme. The Format field shows only the aspect ratio, and its list also names the places that use it.
- Move the mouse over a theme, a background tile or a font, or use the arrow keys, to see it on the image at once. When the mouse leaves the list, or with Escape, the image goes back to what you had before. A click or Enter keeps it.
- 9 code fonts: JetBrains Mono, Geist Mono, IBM Plex Mono, Fira Code, Roboto Mono, Commit Mono, Space Mono, Source Code Pro and Google Sans Code. The font list shows each name in its own font.
- Padding around the windows: 16, 32, 64 or 128 px in the editor (Auto in the free layout), from 0 to 256 px in a spec.
- Each theme gives the image its own background for each mode, such as a gradient from dark to blue for VS Code dark and a soft peach and blue mesh for VS Code light. The Background field below the theme shows it as a bar with an opacity slider under it (0 % is a transparent image). The bar opens a panel with the tabs Gradient (a field with the CSS of the gradient and tiles of the gradient and mesh presets), Color (tiles of solid color presets) and Custom (a color picker with a saturation and brightness square, a hue slider, an eyedropper where the browser has one, and R, G and B fields). Each tile shows the preset with a small window of the theme on it and its name under it. The presets are in order of color: grays first, then by hue, and from dark to light within a hue. A new theme resets the background to its own and keeps the opacity. A spec or the CLI can use any color or CSS gradient: linear-gradient and radial-gradient, in several layers with a color as the last layer. The spec field `backgroundOpacity` (0 to 1) sets the opacity.

### Export

- Save a PNG or an SVG, or copy the image to the clipboard.
- PNG at 1x, 2x or 4x. The editor keeps your last export option.
- The saved file takes its name from the first pane, for example `main.png`.
- Copy an image of only one window or of the selected windows.
- The SVG contains the fonts, so it shows the same everywhere.
- The PNG and the SVG contain an editor link that holds the full spec, "tin.so" as the software and the editor URL as the source. The image stores the spec only once, in the link, so the metadata adds less than 1 KB. The "Embed the spec" switch in the export menu turns this off.
- Drop an exported PNG or SVG into the editor to edit the image again, with all its windows, code and settings.
- The image renders on your computer, with no server and no browser screenshot. The web editor and the CLI make the same image.

### Web editor

- Type the code directly in the image.
- Right-click code to highlight lines, clear styles, add or remove popovers and format the code.
- Option-click a line to highlight it, as in ray.so.
- Right-click a window to duplicate it, fit it to the code, reset its position, center it, change its layer, format its code, copy its image or remove it.
- Right-click the background to add a window, select all windows, reset the layout or copy the image.
- Move windows with the mouse. Drag one of the selected windows to move all of them. A moved or resized window snaps, and guide lines show, when it aligns with the center of the image or with the edges and centers of other windows.
- Resize a window at its edges and corners, panes at the divider between them, and a popover at its corner. Double-click to fit them to the code again.
- Select several windows with a box, with Shift-click or with ⌘A. Align or distribute them (distribute needs 3 or more), copy their image, copy them as spec with ⌘C, or remove them.
- A toolbar above the selected window: add a pane to the right or below, center, format and remove, and in the free layout with 2 or more windows also bring to front and send to back.
- A toolbar above several selected windows: align in 6 ways, distribute, copy their image and remove. Right-click the selected windows for the same actions.
- Sidebar notices have a one-click fix. The free layout has a Reset button, and a window or pane with a fixed size has a Fit button.
- In the free layout, change the order of overlapping windows as in Figma: bring forward (⌘]), bring to front (⌘⇧]), send backward (⌘[) and send to back (⌘⇧[).
- The window list in the sidebar outlines a window in the image when you point to it. Shift-click or ⌘-click selects several windows.
- Zoom in and out, fit the image to the screen, or show it at 100%. The image size shows below the image.
- Keyboard shortcuts: ⌘B, ⌘I, ⌘U and ⌘⇧X for styles, ⇧⌥F to format, ⌥-click to highlight a line, ⌘A and Esc to select, ⌘D to duplicate, ⌘C and ⌘V to copy and paste windows, ⌘[ ⌘] ⌘⇧[ ⌘⇧] for the layers, ⌫ to remove. The ? button in the toolbar, or the ? key, opens an about dialog with all shortcuts, the commands for the CLI and the agent skill, and links to the privacy notice and the legal notice.
- Edit the full spec as JSON, with syntax colors and each problem shown while you type.
- Short messages confirm a copied image, window or link, and tell you when a copy or an export fails. A dropped file gives "Opened main.png", "has no tin.so spec" or "has an invalid spec". A link with an invalid spec opens the default image with a message. Problems in the spec show above the image.

### Share

- Copy a link that opens the same image in the editor.
- The link contains the full image in the URL fragment, so it never goes to a server.
- The address bar always holds the current image, so a reload or a bookmark keeps it.

### For agents

- A CLI that renders code files or a JSON spec to PNG or SVG, with no browser. Rendering is the default command: `tin main.ts` is `tin render main.ts`, and options can come before the files (`tin --theme dracula main.ts`).
- Pipe plain code to the CLI: `pbpaste | tin --title main.ts --copy`. `--title` gives the language and the file name, and `--language` sets the language. JSON on stdin without a title becomes a JSON image. `--code 'x = 1'` gives the code as text.
- A spec on stdin starts with `"$schema"` (the URL of `tin schema`), which tells the CLI that it is a spec and not code. A `.json` file is a spec when it has this `"$schema"` or a `windows` array. `--spec` and `--no-spec` turn off the detection.
- Set the output file (`-o`), the format (`-f png|svg`, or from the file extension) and the PNG scale (`-s`, default 2). The default output never replaces an input file. The CLI stops and asks for `-o`.
- `tin link` prints an editor link for a spec, files or code on stdin, and makes no image. `tin link main.ts --open` opens the link in the browser, and `--copy` copies the link.
- Copy the image to the clipboard from the CLI with `--copy` (macOS, Linux and Windows), with or without a file.
- Render several files in one command: one pane per file, or one window per file.
- CLI options set the theme, mode, font, padding, background (a color, `#from,#to` or a CSS gradient), background opacity (0 to 1), line numbers, direction and aspect ratio, also over the fields of a spec. The window options (tabs, title bar, frame, controls and split) are for code files and `--code`.
- `--no-metadata` writes no spec into the image file.
- The CLI prints the saved file, its size and a link that opens the image in the web editor, so a person can change it. With `--json` it prints this as JSON.
- The CLI lists the themes, languages and fonts, and prints the JSON Schema of the spec.
- Help per command (`tin link --help`) with only the options of that command. `tin --help` shows the options of rendering first, then the commands. An unknown option is an error that names the closest option (`Unknown option --them for render, did you mean --theme?`), and an unknown theme or font names the closest one. Fixed choices such as `--format png|svg` and `--mode dark|light` reject other values.
- `TIN_APP_URL` sets the web editor of the links.
- An agent skill that shows agents how to use the CLI. Add it with `npx skills add zirkelc/tin.so`, and `tin skill` prints this command and the other ways to add it. `tin skill --print` prints the skill itself for agents without skills, so the skill always matches the installed CLI.
- A versioned API on `window.tin` for agents that drive a browser: read and set a spec, wait until the first image is ready, and export an image, with or without the spec in the file.
- An invalid spec gives an error that lists every issue with its path, such as unknown fields, missing fields, unknown languages, and images larger than 8192 px.
- A JSON Schema of the spec on the site. A spec file with `"$schema"` gets checks and completion in editors such as VS Code.
- A versioned spec (`"v": 1`, or the version in the `$schema` URL, such as `/schema/v1.json`). Links and image files carry the version, so they keep working when the spec changes. Old links and images without a version still open, and a spec from a newer version gives the error "Update tin.so". A `v` that does not agree with the `$schema` URL is an error.
- Keys that start with `x-` hold data of other tools in any object of a spec. The renderer ignores them, so they never make a spec invalid.
- Unknown fields and unknown theme, font or icon ids are errors that say to check the name or to update tin.so, so a typo or a newer spec does not give a wrong image.
- Limits keep images safe to render: 50 windows, 20 panes per window, 100,000 characters of code per pane or popover, 200 popovers, 200 marks (styles and colors) and 1,000 highlight entries per pane, titles up to 200 characters, and sides up to 8192 px.

## Packages

| Path            | What                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `packages/core` | The renderer: `spec → Shiki tokens → layout → SVG → PNG (resvg-wasm)`. Runs in Node and in the browser. |
| `packages/cli`  | The `tin` CLI: renders code files or a JSON spec to PNG or SVG, and prints an editor link.              |
| `apps/web`      | The web editor (Vite + React), deployed to Cloudflare as static assets.                                 |
| `skills/tin`    | The agent skill for the CLI.                                                                            |

## Development

```bash
pnpm install
pnpm dev        # builds the packages, then starts the web editor on http://localhost:5173
pnpm ready      # check, build and test everything
```

The browser tests of the web editor run in headless Chromium with Vitest browser mode. A new machine needs the browser once: `pnpm --filter @tin.so/web exec playwright install chromium`.

The links of the CLI open the hosted editor. To open the local editor instead, set `TIN_APP_URL=http://localhost:5173/`. The GitHub links of the site come from `VITE_GITHUB_URL` (see `apps/web/.env.example`).

The site loads no analytics script. The visitor counts come from the analytics of the tin.so zone in Cloudflare, which count the requests on the server. The privacy notice is `apps/web/privacy.html`. Change it when the site starts to send data to a new service.

### Releases

[Release Please](https://github.com/googleapis/release-please-action) makes the releases from conventional commits (`feat:`, `fix:` and so on). `@tin.so/core` and `tin.so` always get the same version.

1. A push to `main` runs the `release` job in `.github/workflows/ci.yml`. It opens or updates a release PR with the new versions and the changelogs.
2. When you merge the release PR, Release Please makes the tags (`core-v…`, `cli-v…`) and the GitHub releases.
3. A published GitHub release runs `.github/workflows/release.yml`. It publishes each package whose version is not on npm yet, with npm Trusted Publishing and provenance. Do not rename this file, because npm checks its name.

The setup needs a `RELEASE_PLEASE_TOKEN` secret (a fine-grained PAT with read and write access to `Contents` and `Pull requests`), and a Trusted Publisher for `zirkelc/tin.so` and `release.yml` on the npm access page of each package. The web editor is not part of a release: deploy it with `pnpm run deploy`.

## The spec

```json
{
  "$schema": "https://tin.so/schema/v1.json",
  "theme": "github",
  "windows": [
    {
      "titleBar": false,
      "tabs": true,
      "split": "row",
      "panes": [
        {
          "title": "main.ts",
          "code": "import plans from \"./plans.toml\";",
          "annotations": [{ "line": 1, "match": "plans", "code": "const plans: { ... }" }]
        },
        { "title": "plans.toml", "code": "[free]\nprice = 0", "highlight": [2] }
      ]
    }
  ]
}
```

`packages/core/src/spec.ts` defines the spec with valibot. Its JSON Schema is on the site at `https://tin.so/schema/v1.json`, and `tin schema` prints it. Add the `"$schema"` field to a spec file, and editors such as VS Code check the spec and complete its fields. A link from the CLI or the editor carries the spec in the URL fragment (`#spec=<deflate + base64url>`), so it never goes to a server.

## Agents in a browser

The web editor has a versioned API on `window.tin` for agents that drive a browser instead of the CLI:

```js
await window.tin.ready;
await window.tin.setSpec(spec); // rejects with the issues of an invalid spec
const { dataUrl, width, height } = await window.tin.export({ format: "png", scale: 2 });
```

## License

[MIT](LICENSE). The window style comes from [ray.so](https://github.com/raycast/ray-so) (MIT), the editor themes from their projects, most of them through Shiki (MIT or Apache 2.0), the file icon from Lucide (ISC), the language icons from Simple Icons (CC0), and the fonts are under the SIL Open Font License, except Commit Mono (MIT). See [`packages/core/THIRD_PARTY_NOTICES.md`](packages/core/THIRD_PARTY_NOTICES.md).

<!--
TODO (not shown on GitHub)

- Raycast extension: make a code image from the selected text or the clipboard, with the CLI or the core package.
- VS Code extension: make a code image of the selected code, with the file name and the language of the editor.
- PWA: install the web editor as an app, with offline use and the share target for code and images.
- Hidden watermark: a weak pattern in the pixels of a PNG that marks it as made with tin.so (about 32 bits: a marker and a version, no user or image ID). Phase 1 survives JPEG at the same size (8×8 DCT blocks, repeated bits, a `tin detect` command and a check on drop in the editor), about 1 to 2 days. Phase 2 survives scaling, cropping and screenshots (a sync pattern or a scale search), about a week, with an open result. Risk: noise or banding in the smooth gradients and flat panels of code images. The privacy notice must mention it. A cheap alternative is an optional visible "tin.so" text in a corner.
- Ambient backgrounds: the spec values "ambient-blur" (a blurred and larger copy of the code behind the window, about 260 ms for each export), "ambient-code" (a mesh of the 3 colors that cover the most characters of the code) and "ambient-theme" (a mesh of the keyword, string, function and constant colors of the theme). The renderer, its tests and the Ambient tab of the background panel are done. To enable them, set `AMBIENT_ENABLED` to true in `packages/core/src/ambient.ts`, unskip the ambient tests of the renderer and the editor, move the keywords to the accepted list of the spec tests, add them to the description of `background` in the spec, and update spec.md, SKILL.md and the Features list. Open question: keep both meshes, or only one of them.
- Branding: upload a logo image and move it in the image, for example a company logo in a corner. The spec keeps its position and size.
-->
