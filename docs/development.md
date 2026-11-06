# Development

## Packages

| Path            | What                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `packages/core` | The renderer: `spec → Shiki tokens → layout → SVG → PNG (resvg-wasm)`. Runs in Node and in the browser. |
| `packages/cli`  | The `tin` CLI: renders code files or a JSON spec to PNG or SVG, and prints an editor link.              |
| `apps/web`      | The web editor (Vite + React), deployed to Cloudflare as static assets.                                 |
| `skills/tin`    | The agent skill for the CLI.                                                                            |

## Setup

```bash
pnpm install
pnpm dev        # builds the packages, then starts the web editor on http://localhost:5173
pnpm ready      # check, build and test everything
pnpm run deploy # deploy the web editor to Cloudflare
```

The browser tests of the web editor run in headless Chromium with Vitest browser mode. A new machine needs the browser once: `pnpm --filter @tin.so/web exec playwright install chromium`.

The links of the CLI open the hosted editor. To open the local editor instead, set `TIN_APP_URL=http://localhost:5173/`. The GitHub links of the site come from `VITE_GITHUB_URL` (see `apps/web/.env.example`).

The example images of the README are specs in `apps/web/scripts/generate-readme-images.ts`. Run `pnpm --filter @tin.so/web generate-readme-images` after a change to the renderer, the themes or the backgrounds. The social image, the app icons and the logo of the README come from `generate-og-image`, and the theme previews of the theme list from `generate-theme-previews`. The screenshot of the editor (`docs/images/editor.png`) is a manual screenshot at 1440 × 860 px with a pixel ratio of 2.

The site loads no analytics script. The visitor counts come from the analytics of the tin.so zone in Cloudflare, which count the requests on the server. The privacy notice is `apps/web/privacy.html`. Change it when the site starts to send data to a new service.

The release steps are in [releases.md](releases.md).
