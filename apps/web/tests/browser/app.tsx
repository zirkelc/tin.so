import { readLink, type SpecInput, THEMES } from "@tin.so/core";
import { createRoot, type Root } from "react-dom/client";
import { expect } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { App } from "../../src/App.tsx";
import "../../src/styles.css";

let mounted: { root: Root; container: HTMLElement } | undefined;

/** Renders the real app and waits until the first preview shows */
export async function mountApp(): Promise<void> {
  const container = document.createElement("div");
  container.id = "root";
  document.body.append(container);
  const root = createRoot(container);
  root.render(<App />);
  mounted = { root, container };
  await expect.element(codeField(1)).toBeVisible();
}

/** Removes the app, but keeps the state that it keeps in the page, as a reload of the page does */
export async function remountApp(): Promise<void> {
  mounted?.root.unmount();
  mounted?.container.remove();
  mounted = undefined;
  await mountApp();
}

/** Removes the app and the state that it keeps in the page */
export function unmountApp(): void {
  mounted?.root.unmount();
  mounted?.container.remove();
  mounted = undefined;
  localStorage.clear();
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
}

export function codeField(window: number, pane = 1) {
  return page.getByRole("textbox", { name: `Code of window ${window}, pane ${pane}` });
}

/** The spec in the fragment of the page URL */
export async function specInUrl(): Promise<SpecInput | undefined> {
  return (await readLink(window.location.href)) as SpecInput | undefined;
}

export function themeId(name: string): string | undefined {
  return THEMES.find((theme) => theme.name === name)?.id;
}

export function themeName(id: string | undefined): string | undefined {
  return THEMES.find((theme) => theme.id === id)?.name;
}

/** The trigger of the theme list. Its label is a separate element, so a role query cannot find it. */
export function themeTrigger() {
  const field = [...document.querySelectorAll(".field.select")].find(
    (element) => element.querySelector(".field-label")?.textContent === "Theme",
  );
  const button = field?.querySelector("button");
  if (!button) throw new Error("Missing theme field");
  return page.elementLocator(button);
}

/** The SVG of the preview image */
export function previewSvg(): SVGSVGElement | null {
  return document.querySelector(".canvas-image svg");
}

/** Reads the size of a PNG file from its header */
export function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

export const PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function dataUrlBytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
