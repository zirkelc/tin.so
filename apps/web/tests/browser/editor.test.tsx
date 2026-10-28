import { DEFAULT_THEME, encodeSpec, type SpecInput, UI_FONT } from "@tin.so/core";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { DEFAULT_SPEC } from "../../src/state.ts";
import {
  codeField,
  mountApp,
  previewSvg,
  specInUrl,
  themeId,
  themeName,
  themeTrigger,
  unmountApp,
} from "./app.tsx";

const TWO_WINDOWS: SpecInput = {
  windows: [
    { panes: [{ title: "a.ts", code: "const a = 1;" }] },
    { panes: [{ title: "b.ts", code: "const b = 2;" }] },
  ],
};

function windowRow(name: string) {
  return page.getByRole("button", { name, exact: true });
}

function windowCount(): number {
  return document.querySelectorAll(".window-row").length;
}

afterEach(() => {
  unmountApp();
});

describe("preview", () => {
  test("should render the default image", async () => {
    // Act
    await mountApp();

    // Assert
    await expect.poll(() => previewSvg()).not.toBeNull();
    const svg = previewSvg()!;
    const size = `${svg.getAttribute("width")} × ${svg.getAttribute("height")}`;
    await expect.element(page.getByText(size)).toBeVisible();
    await expect.element(codeField(1, 1)).toHaveValue(DEFAULT_SPEC.windows[0]!.panes[0]!.code);
    await expect.element(codeField(1, 2)).toHaveValue(DEFAULT_SPEC.windows[0]!.panes[1]!.code);
  });

  test("should load the fonts of the image", async () => {
    // Act
    await mountApp();

    // Assert
    await expect
      .poll(() =>
        [...document.fonts].some(
          (face) => face.family === `ci-${UI_FONT.id}` && face.status === "loaded",
        ),
      )
      .toBe(true);
  });

  test("should write the default spec into the URL fragment", async () => {
    // Act
    await mountApp();

    // Assert
    // A link carries the version of the spec
    await expect.poll(() => specInUrl()).toEqual({ v: 1, ...DEFAULT_SPEC });
  });

  test("should write typed code into the spec in the URL fragment", async () => {
    // Arrange
    await mountApp();

    // Act
    await userEvent.fill(codeField(1, 2), "[team]\nprice = 30");

    // Assert
    await expect
      .poll(async () => (await specInUrl())?.windows[0]?.panes[1]?.code)
      .toBe("[team]\nprice = 30");
    await expect.poll(() => previewSvg()?.textContent).toContain("team");
  });
});

describe("links", () => {
  test("should open the spec of a link", async () => {
    // Arrange
    const spec: SpecInput = { theme: "mono", windows: [{ panes: [{ code: "echo linked" }] }] };
    window.history.replaceState(null, "", `#spec=${await encodeSpec(spec)}`);

    // Act
    await mountApp();

    // Assert
    await expect.element(codeField(1)).toHaveValue("echo linked");
    await expect.element(themeTrigger()).toHaveTextContent("Mono");
  });

  test("should show a message and the default image for a link with an invalid spec", async () => {
    // Arrange
    const spec = { theme: "no-such-theme", windows: [{ panes: [{ code: "x" }] }] };
    window.history.replaceState(null, "", `#spec=${await encodeSpec(spec)}`);

    // Act
    await mountApp();

    // Assert
    await expect
      .element(page.getByText("The link has an invalid spec, so the default image shows"))
      .toBeVisible();
    await expect.element(codeField(1)).toHaveValue(DEFAULT_SPEC.windows[0]!.panes[0]!.code);
  });
});

describe("theme", () => {
  test("should change the theme with a click on an option", async () => {
    // Arrange
    await mountApp();

    // Act
    await themeTrigger().click();
    await page.getByRole("option", { name: "Mono", exact: true }).click();

    // Assert
    await expect.poll(async () => (await specInUrl())?.theme).toBe("mono");
    await expect.element(themeTrigger()).toHaveTextContent("Mono");
    await expect.element(page.getByRole("listbox", { name: "Theme" })).not.toBeInTheDocument();
  });

  test("should find a theme with the search field", async () => {
    // Arrange
    await mountApp();
    await themeTrigger().click();

    // Act
    await userEvent.fill(page.getByRole("textbox", { name: "Search Theme" }), "midnight");
    await userEvent.keyboard("{Enter}");

    // Assert
    await expect.poll(async () => (await specInUrl())?.theme).toBe("midnight");
  });

  test("should preview a theme with the arrow keys", async () => {
    // Arrange
    await mountApp();
    await themeTrigger().click();

    // Act
    await userEvent.keyboard("{ArrowDown}");

    // Assert
    const activeName = document.querySelector(".select-option.active .select-value")?.textContent;
    expect(activeName).not.toBe(themeName(DEFAULT_THEME));
    await expect.poll(async () => (await specInUrl())?.theme).toBe(themeId(activeName ?? ""));
    await expect.element(page.getByRole("listbox", { name: "Theme" })).toBeVisible();
  });

  test("should restore the theme with Escape after a preview", async () => {
    // Arrange
    await mountApp();
    await themeTrigger().click();
    await userEvent.keyboard("{ArrowDown}");
    await expect.poll(async () => (await specInUrl())?.theme).not.toBe(DEFAULT_THEME);

    // Act
    await userEvent.keyboard("{Escape}");

    // Assert
    await expect.poll(async () => (await specInUrl())?.theme).toBe(DEFAULT_THEME);
    await expect.element(themeTrigger()).toHaveTextContent(themeName(DEFAULT_THEME)!);
    await expect.element(page.getByRole("listbox", { name: "Theme" })).not.toBeInTheDocument();
  });
});

describe("windows", () => {
  test("should select a window in the list of windows", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(TWO_WINDOWS);

    // Act
    await windowRow("b.ts").click();

    // Assert
    await expect.element(windowRow("b.ts")).toHaveAttribute("aria-pressed", "true");
    await expect.element(windowRow("a.ts")).toHaveAttribute("aria-pressed", "false");
    await expect.element(windowRow("b.ts")).toHaveAttribute("aria-expanded", "true");
  });

  test("should add a window to the selection with a shift-click", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(TWO_WINDOWS);
    await windowRow("b.ts").click();

    // Act
    await windowRow("a.ts").click({ modifiers: ["Shift"] });

    // Assert
    await expect.element(windowRow("a.ts")).toHaveAttribute("aria-pressed", "true");
    await expect.element(windowRow("b.ts")).toHaveAttribute("aria-pressed", "true");
    await expect.element(page.getByText("2 selected")).toBeVisible();
    await expect.element(page.getByRole("toolbar", { name: "2 windows" })).toBeVisible();
  });

  test("should select a window with a click in its code", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(TWO_WINDOWS);
    await windowRow("b.ts").click();

    // Act
    await codeField(1).click();

    // Assert
    await expect.element(windowRow("a.ts")).toHaveAttribute("aria-pressed", "true");
    await expect.element(windowRow("b.ts")).toHaveAttribute("aria-pressed", "false");
  });

  test("should duplicate the selected window with Cmd+D", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(TWO_WINDOWS);
    await windowRow("b.ts").click();

    // Act
    await userEvent.keyboard("{Control>}d{/Control}");

    // Assert
    await expect.poll(windowCount).toBe(3);
    await expect.poll(async () => (await specInUrl())?.windows.length).toBe(3);
    const codes = window.tin.getSpec().windows.map((item) => item.panes[0]?.code);
    expect(codes).toEqual(["const a = 1;", "const b = 2;", "const b = 2;"]);
  });

  test("should remove the selected window with Delete", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(TWO_WINDOWS);
    await windowRow("b.ts").click();

    // Act
    await userEvent.keyboard("{Delete}");

    // Assert
    await expect.poll(windowCount).toBe(1);
    await expect.poll(async () => (await specInUrl())?.windows.length).toBe(1);
    await expect.element(codeField(1)).toHaveValue("const a = 1;");
  });

  test("should keep the last window on Delete", async () => {
    // Arrange
    await mountApp();
    const row = windowRow("main.ts, plans.toml 2 panes");
    await expect.element(row).toHaveAttribute("aria-pressed", "true");

    // Act
    await userEvent.keyboard("{Delete}");

    // Assert
    expect(window.tin.getSpec().windows.length).toBe(1);
    await expect.element(row).toHaveAttribute("aria-pressed", "true");
  });
});

describe("copy and paste", () => {
  test("should paste copied windows as new windows", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(TWO_WINDOWS);
    await windowRow("b.ts").click();
    const clipboard = new DataTransfer();
    document.body.dispatchEvent(
      new ClipboardEvent("copy", { bubbles: true, clipboardData: clipboard }),
    );

    // Act
    document.body.dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, clipboardData: clipboard }),
    );

    // Assert
    await expect.poll(windowCount).toBe(3);
    const codes = window.tin.getSpec().windows.map((item) => item.panes[0]?.code);
    expect(codes).toEqual(["const a = 1;", "const b = 2;", "const b = 2;"]);
  });

  test("should paste no window from other text", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(TWO_WINDOWS);
    const clipboard = new DataTransfer();
    clipboard.setData("text/plain", "const c = 3;");

    // Act
    document.body.dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, clipboardData: clipboard }),
    );

    // Assert
    await expect.poll(windowCount).toBe(2);
  });
});

describe("open an image", () => {
  test("should open the spec of a dropped image", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(TWO_WINDOWS);
    const { dataUrl } = await window.tin.export({ format: "png", scale: 1 });
    const bytes = Uint8Array.from(atob(dataUrl.split(",")[1]!), (char) => char.charCodeAt(0));
    await window.tin.setSpec(DEFAULT_SPEC);
    const files = new DataTransfer();
    files.items.add(new File([bytes], "two.png", { type: "image/png" }));

    // Act
    window.dispatchEvent(new DragEvent("drop", { cancelable: true, dataTransfer: files }));

    // Assert
    await expect.poll(windowCount).toBe(2);
    await expect.element(codeField(2)).toHaveValue("const b = 2;");
  });
});

describe("author", () => {
  test("should link to the about page and the X account of the author", async () => {
    // Act
    await mountApp();

    // Assert
    await expect
      .element(page.getByRole("link", { name: "@zirkelc on X" }))
      .toHaveAttribute("href", "https://x.com/zirkelc");
    await expect
      .element(page.getByRole("link", { name: "About" }))
      .toHaveAttribute("href", "/about");
  });
});

describe("style panel", () => {
  test("should color and style the selected text", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({
      windows: [{ panes: [{ title: "a.ts", code: "const a = 1;" }] }],
    });
    await codeField(1).click();
    await userEvent.keyboard(
      "{Home}{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}",
    );
    const panel = page.getByRole("toolbar", { name: "Text style" });
    await expect.element(panel).toBeVisible();

    // Act
    await panel.getByRole("button", { name: "Text Red" }).click();
    await panel.getByRole("button", { name: "Bold" }).click();

    // Assert
    await expect
      .poll(() => window.tin.getSpec().windows[0]?.panes[0]?.marks)
      .toEqual([
        { line: 1, match: "const", occurrence: 1, color: "#f43f5e" },
        { line: 1, match: "const", occurrence: 1, style: "strong" },
      ]);
    await expect
      .element(panel.getByRole("button", { name: "Bold" }))
      .toHaveAttribute("aria-pressed", "true");
  });

  test("should clear the styles and colors of the selected text", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({
      windows: [
        {
          panes: [
            {
              title: "a.ts",
              code: "const a = 1;",
              marks: [{ line: 1, match: "const", style: "strong", color: "#f43f5e" }],
            },
          ],
        },
      ],
    });
    await codeField(1).click();
    await userEvent.keyboard(
      "{Home}{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}",
    );

    // Act
    await page
      .getByRole("toolbar", { name: "Text style" })
      .getByRole("button", { name: "Clear" })
      .click();

    // Assert
    await expect.poll(() => window.tin.getSpec().windows[0]?.panes[0]?.marks).toEqual([]);
  });

  test("should color and style the selected text of a popover", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({
      windows: [
        {
          panes: [
            {
              title: "a.ts",
              code: "const plans = 1;",
              annotations: [{ line: 1, match: "plans", code: "type Plans = number" }],
            },
          ],
        },
      ],
    });
    await page.getByRole("textbox", { name: "Code of popover 1 of window 1, pane 1" }).click();
    await userEvent.keyboard(
      "{Home}{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}",
    );
    const panel = page.getByRole("toolbar", { name: "Text style" });

    // Act
    await panel.getByRole("button", { name: "Fill Yellow" }).click();
    await userEvent.keyboard("{Control>}b{/Control}");

    // Assert
    await expect
      .poll(() => window.tin.getSpec().windows[0]?.panes[0]?.annotations?.[0]?.marks)
      .toEqual([
        { line: 1, match: "type", occurrence: 1, background: "#fcd34d40" },
        { line: 1, match: "type", occurrence: 1, style: "strong" },
      ]);
    expect(window.tin.getSpec().windows[0]?.panes[0]?.marks).toBe(undefined);
  });

  test("should select a word of a popover that is not selected with one double-click", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({
      windows: [
        {
          panes: [
            {
              title: "a.ts",
              code: "const plans = 1;",
              annotations: [{ line: 1, match: "plans", code: "type Plans = number" }],
            },
          ],
        },
      ],
    });
    const popover = page.getByRole("textbox", { name: "Code of popover 1 of window 1, pane 1" });

    // Act
    await popover.dblClick({ position: { x: 4, y: 4 } });

    // Assert
    await expect.element(page.getByRole("toolbar", { name: "Text style" })).toBeVisible();
    const field = popover.element() as HTMLTextAreaElement;
    expect(field.value.slice(field.selectionStart, field.selectionEnd)).toBe("type");
  });

  test("should hide the panel without a selection", async () => {
    // Act
    await mountApp();
    await codeField(1).click();

    // Assert
    await expect.element(page.getByRole("toolbar", { name: "Text style" })).not.toBeInTheDocument();
  });
});
