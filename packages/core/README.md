# @tin.so/core

Renders code images from a JSON spec. The pipeline is `spec → Shiki tokens → layout → SVG → PNG` and needs no browser: the layout places every character on a monospace grid with the metrics of the bundled fonts, and [resvg](https://github.com/linebender/resvg) (WebAssembly) rasterizes the SVG. The same code runs in Node and in the browser.

```ts
import { render } from "@tin.so/core/node";

const png = await render({
  theme: "vercel",
  windows: [
    {
      titleBar: false,
      tabs: true,
      split: "row",
      panes: [
        { title: "main.ts", code: 'import plans from "./plans.toml";' },
        { title: "plans.toml", code: "[free]\nprice = 0" },
      ],
    },
  ],
});
```

## Scripts

- `pnpm port-themes` fetches the ray.so themes at a pinned commit and writes `src/themes/*.json`.
- `pnpm download-fonts` downloads the fonts to `fonts/` and writes their metrics to `src/fonts/fonts.generated.json`.

## Attribution

- The themes, the token colors and the frame styles come from [ray.so](https://github.com/raycast/ray-so) (MIT).
- The fonts are under the SIL Open Font License, except Commit Mono (MIT). Each font directory contains its license.
- The file icon is from [Lucide](https://lucide.dev) (ISC), the language icons from [Simple Icons](https://simpleicons.org) (CC0).
