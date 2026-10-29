# @tin.so/core

Renders code images from a JSON spec, to SVG and PNG. One image can show several snippets: windows next to each other or below each other, panes in a window, and popovers that point to a word. It has all [ray.so](https://ray.so) themes, line highlights, text styles and colors, tabs with file icons, and fixed aspect ratios for social media.

The pipeline is `spec → Shiki tokens → layout → SVG → PNG` and needs no browser. The layout puts every character on a monospace grid with the metrics of the bundled fonts, and [resvg](https://github.com/linebender/resvg) (WebAssembly) rasterizes the SVG. The same code runs in Node and in the browser.

This package is the renderer of the [tin.so](https://tin.so) web editor and of the [`tin` CLI](https://www.npmjs.com/package/tin.so). To make images from the command line, use the CLI.

## Installation

```bash
npm install @tin.so/core
```

Node 22.18 or later.

## Usage

```ts
import { writeFile } from "node:fs/promises";
import { render } from "@tin.so/core/node";

const png = await render({
  theme: "vercel",
  windows: [
    {
      tabs: true,
      titleBar: false,
      panes: [
        {
          title: "main.ts",
          code: 'import plans from "./plans.toml";\n\nplans.free.price;',
          highlight: [3],
          annotations: [
            { line: 1, match: "plans", code: "const plans: {\n  free: { price: 0 };\n}" },
          ],
        },
        { title: "plans.toml", code: "[free]\nprice = 0" },
      ],
    },
  ],
});

await writeFile("plans.png", png);
```

`render(spec, { format: "svg" })` gives an SVG with the fonts inside it. `scale` sets the pixel ratio of a PNG (default 2). By default, the image contains the spec and a link that opens it in the web editor. `metadata: false` turns this off.

`createLink(spec)` gives that link without an image:

```ts
import { createLink } from "@tin.so/core";

const link = await createLink(spec); // https://tin.so/#spec=…
```

## The spec

A spec is JSON with the image settings, its windows, the panes of each window, and the code of each pane. Only `windows`, `panes` and `code` are required.

```json
{
  "$schema": "https://tin.so/schema/v1.json",
  "theme": "candy",
  "windows": [{ "panes": [{ "title": "main.ts", "code": "const a = 1;" }] }]
}
```

| Level  | Fields                                                                                                                                       |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Image  | `theme`, `mode`, `background`, `padding`, `font`, `lineNumbers`, `direction`, `gap`, `aspectRatio`, `width`, `height`, `windows`             |
| Window | `panes`, `split`, `titleBar`, `tabs`, `frame`, `controls`, `title`, `width`, `height`, `x`, `y`                                              |
| Pane   | `code`, `title`, `language`, `highlight`, `marks` (bold, italic, colors, highlighter fills), `annotations` (popovers), `icon`, `lineNumbers` |

The full spec, with a description, a default and the limits of each field, is the JSON Schema at [`https://tin.so/schema/v1.json`](https://tin.so/schema/v1.json). `specJsonSchema()` gives the same schema.

- **Versions:** the `$schema` URL (`/schema/v1.json`) or the field `v` gives the version of the spec. A spec without both is version 1. A new version comes only with a change that can break a spec. New optional fields and new themes, fonts or languages come without one.
- **Your own data:** keys that start with `x-` are ignored in every object.
- **Errors:** an invalid spec throws a `SpecError` that names each problem with its path, for example `windows.0.panes.0.annotations.0.match: "plnas" (occurrence 1) is not in line 1`.

## API

| Function                                                 | What it does                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `render(spec, options?)`                                 | Renders a spec to PNG or SVG bytes, in Node (`@tin.so/core/node`)                          |
| `parseSpec(input)`                                       | Checks a spec and fills in the defaults. Throws a `SpecError`                              |
| `layout(spec, options?)`                                 | Highlights the code and places the windows, panes and popovers. Gives a `Scene`            |
| `toSvg(scene, options?)`                                 | Writes the SVG of a scene, optionally with embedded fonts and metadata                     |
| `initPng(load)`, `svgToPng(svg, fonts, options?)`        | Loads the resvg WebAssembly once, then rasterizes an SVG                                   |
| `loadSceneFonts(scene, loadFont)`                        | Loads the font files that a scene uses                                                     |
| `createLink(spec, appUrl?)`, `readLink(link)`            | Writes a spec into an editor link, and reads it back                                       |
| `encodeSpec(spec)`, `decodeSpec(encoded)`                | The compressed spec of a link, without the URL                                             |
| `readImageSpec(image)`                                   | Reads the spec from a PNG or SVG that has the metadata. Gives `undefined` for other images |
| `specJsonSchema()`, `SPEC_SCHEMA_URL`                    | The JSON Schema of the spec, and its URL                                                   |
| `THEME_IDS`, `CODE_FONT_IDS`, `LANGUAGE_IDS`, `ICON_IDS` | The ids that the spec accepts                                                              |

### In the browser

Import from `@tin.so/core`, and give the steps that read files a loader, because the browser has no file system:

```ts
import { initPng, layout, loadSceneFonts, svgToPng, toSvg } from "@tin.so/core";

const scene = await layout(spec);
// loadFont gets a path in the fonts/ directory of this package, for example "fira-code/fira-code-400.ttf"
const fonts = await loadSceneFonts(scene, loadFont);
await initPng(() => fetch(wasmUrl)); // the index_bg.wasm file of @resvg/resvg-wasm
const png = await svgToPng(toSvg(scene), fonts.values());
```

## Scripts

- `pnpm port-themes` fetches the ray.so themes at a pinned commit and writes `src/themes/*.json`.
- `pnpm download-fonts` downloads the fonts to `fonts/` and writes their metrics to `src/fonts/fonts.generated.json`.
- `pnpm generate-icons` writes the language icons from Simple Icons.

## License

MIT. The themes come from ray.so (MIT), the file icon from Lucide (ISC), the language icons from Simple Icons (CC0), and the fonts are under the SIL Open Font License, except Commit Mono (MIT). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
