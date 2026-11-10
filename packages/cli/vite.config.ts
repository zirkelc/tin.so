import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/cli.ts"],
    dts: false,
  },
  test: {
    // Load citty through Vitest, so that a test can load it again with another environment
    server: { deps: { inline: ["citty"] } },
  },
});
