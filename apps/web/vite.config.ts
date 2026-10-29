import { SPEC_SCHEMA_URL, specJsonSchema } from "@tin.so/core";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

// The links of the site. An environment variable or a .env file can replace each one.
const SITE_DEFAULTS = {
  VITE_GITHUB_URL: "https://github.com/zirkelc/tin.so",
};

type Site = typeof SITE_DEFAULTS;

// The JSON Schema of the spec on the site, at the path of its URL, for editors and agents
const SCHEMA_PATH = new URL(SPEC_SCHEMA_URL).pathname.slice(1);

function specSchemaFile(): Plugin {
  const source = `${JSON.stringify(specJsonSchema(), null, 2)}\n`;
  return {
    name: "tin:spec-schema",
    configureServer(server) {
      server.middlewares.use(`/${SCHEMA_PATH}`, (_request, response) => {
        response.setHeader("Content-Type", "application/schema+json");
        response.end(source);
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: SCHEMA_PATH, source });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const site: Site = {
    VITE_GITHUB_URL: env.VITE_GITHUB_URL || SITE_DEFAULTS.VITE_GITHUB_URL,
  };
  return {
    plugins: [react(), specSchemaFile()],
    define: Object.fromEntries(
      Object.entries(site).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
    ),
    server: { port: 5_173 },
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            environment: "node",
            include: ["tests/*.test.ts"],
          },
        },
        {
          extends: true,
          test: {
            name: "browser",
            include: ["tests/browser/**/*.test.{ts,tsx}"],
            browser: {
              enabled: true,
              provider: playwright(),
              headless: true,
              // The editor has a sidebar and a stage, so it needs a desktop viewport
              viewport: { width: 1_280, height: 800 },
              instances: [{ browser: "chromium" }],
            },
          },
        },
      ],
    },
  };
});
