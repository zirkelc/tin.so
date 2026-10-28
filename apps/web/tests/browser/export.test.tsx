import { readImageSpec } from "@tin.so/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { mountApp, PNG_SIGNATURE, pngSize, previewSvg, remountApp, unmountApp } from "./app.tsx";

type Download = { name: string; blob: Blob };

// A PNG at a large scale takes some time, more on a busy machine
const EXPORT_WAIT = { timeout: 10_000 };

let downloads: Array<Download>;

/** Stops the file downloads of the page, and keeps the file name and the content of each */
function interceptDownloads() {
  downloads = [];
  const blobs = new Map<string, Blob>();
  const createObjectURL = URL.createObjectURL.bind(URL);
  vi.spyOn(URL, "createObjectURL").mockImplementation((object) => {
    const url = createObjectURL(object);
    if (object instanceof Blob) blobs.set(url, object);
    return url;
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    const blob = blobs.get(this.href);
    if (this.download && blob) downloads.push({ name: this.download, blob });
  });
}

function exportOptions() {
  return page.getByRole("button", { name: "More export options" });
}

// The name of a checked action starts with a check mark
function exportAction(label: string) {
  return page.getByRole("menuitemradio", { name: new RegExp(`${label}$`) });
}

function scaleOption(scale: number) {
  return page.getByRole("radio", { name: `${scale}x` });
}

beforeEach(() => {
  interceptDownloads();
});

afterEach(() => {
  vi.restoreAllMocks();
  unmountApp();
});

describe("export menu", () => {
  test("should save a PNG file of the image at the default scale", async () => {
    // Arrange
    await mountApp();
    const svg = previewSvg()!;
    const width = Number(svg.getAttribute("width"));
    const height = Number(svg.getAttribute("height"));

    // Act
    await page.getByRole("button", { name: "Save PNG", exact: true }).click();

    // Assert
    await expect.poll(() => downloads.length, EXPORT_WAIT).toBe(1);
    const [download] = downloads;
    expect(download!.name).toBe("main.png");
    expect(download!.blob.type).toBe("image/png");
    const bytes = new Uint8Array(await download!.blob.arrayBuffer());
    expect(bytes.slice(0, 8)).toEqual(PNG_SIGNATURE);
    expect(pngSize(bytes)).toEqual({ width: width * 2, height: height * 2 });
  });

  test("should save a PNG file at the scale of the menu", async () => {
    // Arrange
    await mountApp();
    const svg = previewSvg()!;
    const width = Number(svg.getAttribute("width"));
    await exportOptions().click();
    await scaleOption(4).click();

    // Act
    await exportAction("Save PNG").click();

    // Assert
    await expect.poll(() => downloads.length, EXPORT_WAIT).toBe(1);
    const bytes = new Uint8Array(await downloads[0]!.blob.arrayBuffer());
    expect(pngSize(bytes).width).toBe(width * 4);
  });

  test("should save an SVG file and make it the action of the main button", async () => {
    // Arrange
    await mountApp();
    await exportOptions().click();

    // Act
    await exportAction("Save SVG").click();

    // Assert
    await expect.poll(() => downloads.length, EXPORT_WAIT).toBe(1);
    expect(downloads[0]!.name).toBe("main.svg");
    expect(downloads[0]!.blob.type).toBe("image/svg+xml");
    await expect.element(page.getByRole("button", { name: "Save SVG", exact: true })).toBeVisible();
  });

  test("should keep the scale and the action after a reload", async () => {
    // Arrange
    await mountApp();
    await exportOptions().click();
    await scaleOption(1).click();
    await exportAction("Save SVG").click();

    // Act
    await remountApp();
    await exportOptions().click();

    // Assert
    await expect.element(scaleOption(1)).toHaveAttribute("aria-checked", "true");
    await expect.element(scaleOption(2)).toHaveAttribute("aria-checked", "false");
    await expect.element(exportAction("Save SVG")).toHaveAttribute("aria-checked", "true");
    expect(JSON.parse(localStorage.getItem("code-image:export")!)).toEqual({
      action: "svg",
      scale: 1,
      metadata: true,
    });
  });

  test("should save the spec in the PNG, and no spec without the switch", async () => {
    // Arrange
    await mountApp();
    await page.getByRole("button", { name: "Save PNG", exact: true }).click();
    await expect.poll(() => downloads.length, EXPORT_WAIT).toBe(1);
    await exportOptions().click();
    await page.getByRole("menuitemcheckbox", { name: /Embed the spec$/ }).click();

    // Act
    await page.getByRole("button", { name: "Save PNG", exact: true }).click();

    // Assert
    await expect.poll(() => downloads.length, EXPORT_WAIT).toBe(2);
    const [withSpec, without] = await Promise.all(
      downloads.map(async ({ blob }) => readImageSpec(blob)),
    );
    // The image carries the version of the spec
    const spec = JSON.parse(JSON.stringify(window.tin.getSpec()));
    expect(withSpec).toEqual({ v: 1, ...spec });
    expect(without).toBe(undefined);
  });
});
