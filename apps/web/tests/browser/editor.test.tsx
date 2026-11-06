import {
  BACKGROUNDS,
  CODE_FONTS,
  DEFAULT_THEME,
  encodeSpec,
  getFrameColors,
  type SpecInput,
  THEMES,
  UI_FONT,
} from "@tin.so/core";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { DEFAULT_SPEC } from "../../src/state.ts";
import {
  codeField,
  mountApp,
  previewSvg,
  selectTrigger,
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

// One window with a popover on the word "plans"
const POPOVER_SPEC: SpecInput = {
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
    await expect.element(codeField(1)).toHaveValue(DEFAULT_SPEC.windows[0]!.panes[0]!.code);
  });

  test("should show the logo and the name in the header", async () => {
    // Act
    await mountApp();

    // Assert
    const heading = page.getByRole("heading", { name: "tin.so" });
    await expect.element(heading).toBeVisible();
    const logo = heading.element().querySelector<HTMLImageElement>("img.logo")!;
    await expect.poll(() => logo.naturalWidth).toBe(256);
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
    await userEvent.fill(codeField(1), "const team = 30;");

    // Assert
    await expect
      .poll(async () => (await specInUrl())?.windows[0]?.panes[0]?.code)
      .toBe("const team = 30;");
    await expect.poll(() => previewSvg()?.textContent).toContain("team");
  });
});

describe("links", () => {
  test("should open the spec of a link", async () => {
    // Arrange
    const spec: SpecInput = { theme: "nord", windows: [{ panes: [{ code: "echo linked" }] }] };
    window.history.replaceState(null, "", `#spec=${await encodeSpec(spec)}`);

    // Act
    await mountApp();

    // Assert
    await expect.element(codeField(1)).toHaveValue("echo linked");
    await expect.element(themeTrigger()).toHaveTextContent("Nord");
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
  test("should change the theme with a click on an option and keep the list open", async () => {
    // Arrange
    await mountApp();

    // Act
    await themeTrigger().click();
    await page.getByRole("option", { name: "Nord", exact: true }).click();

    // Assert
    await expect.poll(async () => (await specInUrl())?.theme).toBe("nord");
    await expect.element(themeTrigger()).toHaveTextContent("Nord");
    await expect.element(page.getByRole("listbox", { name: "Theme" })).toBeVisible();
    // The check mark of the chosen option is part of its name
    await expect
      .element(page.getByRole("option", { name: /^Nord/ }))
      .toHaveAttribute("aria-selected", "true");
  });

  test("should close the theme list with its close button", async () => {
    // Arrange
    await mountApp();
    await themeTrigger().click();
    const list = page.getByRole("listbox", { name: "Theme" });
    await expect.element(list).toBeVisible();

    // Act
    await page.getByRole("button", { name: "Close" }).click();

    // Assert
    await expect.element(list).not.toBeInTheDocument();
  });

  test("should show the colors that the selected theme gives code in the closed theme field", async () => {
    // Arrange
    await mountApp();

    // Act
    await window.tin.setSpec({ ...DEFAULT_SPEC, theme: "vscode" });

    // Assert
    await expect.element(themeTrigger()).toHaveTextContent("VS Code");
    const dots = [...themeTrigger().element().querySelectorAll<HTMLElement>(".theme-palette span")];
    const colors = dots.map((dot) => dot.style.backgroundColor);
    // The blue of keywords such as const and function, which the summary colors of the theme lack
    expect(colors).toContain("rgb(86, 156, 214)");
    expect(colors.length).toBe(7);
  });

  test("should show each theme with its background and a window in its colors", async () => {
    // Arrange
    await mountApp();
    const theme = THEMES.find((theme) => theme.id === "nord")!;

    // Act
    await themeTrigger().click();

    // Assert
    const option = page.getByRole("option", { name: "Nord", exact: true });
    await expect.element(option).toBeVisible();
    const thumbnail = option.element().querySelector<HTMLElement>(".theme-thumbnail")!;
    const window = thumbnail.querySelector<HTMLElement>(".background-preview-window")!;
    const expected = document.createElement("span");
    expected.style.background = getFrameColors(theme, "dark").background;
    expect(window.style.backgroundColor).toBe(expected.style.backgroundColor);
    expect(document.querySelectorAll('[role="option"] .theme-thumbnail').length).toBe(
      THEMES.length,
    );
    expect(themeTrigger().element().querySelector(".theme-thumbnail")).toBe(null);
  });

  test("should list only the themes of code editors", async () => {
    // Arrange
    await mountApp();

    // Act
    await themeTrigger().click();

    // Assert
    await expect.element(page.getByRole("listbox", { name: "Theme" })).toBeVisible();
    const names = [...document.querySelectorAll(".select-option .select-value")].map(
      (option) => option.textContent,
    );
    expect(names).toContain("Dracula");
    expect(names).not.toContain("Candy");
    expect(names).not.toContain("Vercel");
  });

  test("should find a theme with the search field", async () => {
    // Arrange
    await mountApp();
    await themeTrigger().click();

    // Act
    await userEvent.fill(page.getByRole("textbox", { name: "Search Theme" }), "tokyo");
    await userEvent.keyboard("{Enter}");

    // Assert
    await expect.poll(async () => (await specInUrl())?.theme).toBe("tokyo-night");
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

  test("should preview a theme under the mouse", async () => {
    // Arrange
    await mountApp();
    await themeTrigger().click();

    // Act
    await page.getByRole("option", { name: "Nord", exact: true }).hover();

    // Assert
    await expect.poll(async () => (await specInUrl())?.theme).toBe("nord");
    await expect.element(page.getByRole("listbox", { name: "Theme" })).toBeVisible();
  });

  test("should restore the theme and the background when the mouse leaves the list", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ ...DEFAULT_SPEC, background: "#123456" });
    await themeTrigger().click();
    await page.getByRole("option", { name: "Nord", exact: true }).hover();
    await expect.poll(async () => (await specInUrl())?.theme).toBe("nord");

    // Act
    await page.getByRole("textbox", { name: "Search Theme" }).hover();

    // Assert
    await expect.poll(async () => (await specInUrl())?.theme).toBe(DEFAULT_THEME);
    expect((await specInUrl())?.background).toBe("#123456");
  });

  test("should keep a theme that was clicked after a preview", async () => {
    // Arrange
    await mountApp();
    await themeTrigger().click();
    const nord = page.getByRole("option", { name: /^Nord/ });
    await nord.hover();
    await expect.poll(async () => (await specInUrl())?.theme).toBe("nord");

    // Act
    await nord.click();
    await page.getByRole("textbox", { name: "Search Theme" }).hover();

    // Assert
    await expect.element(nord).toHaveAttribute("aria-selected", "true");
    await expect.poll(async () => (await specInUrl())?.theme).toBe("nord");
  });
});

describe("font", () => {
  const fontTrigger = () => selectTrigger("Font");

  test("should show each font name in its own font", async () => {
    // Arrange
    await mountApp();
    const font = CODE_FONTS[1]!;

    // Act
    await fontTrigger().click();

    // Assert
    const label = page
      .getByRole("option", { name: font.name, exact: true })
      .element()
      .querySelector<HTMLElement>(".select-value")!;
    expect(label.style.fontFamily.startsWith(`ci-${font.id}`)).toBe(true);
  });

  test("should keep the font list open after a choice", async () => {
    // Arrange
    await mountApp();
    const font = CODE_FONTS[1]!;
    await fontTrigger().click();

    // Act
    await page.getByRole("option", { name: font.name, exact: true }).click();

    // Assert
    await expect.poll(async () => (await specInUrl())?.font).toBe(font.id);
    await expect.element(page.getByRole("listbox", { name: "Font" })).toBeVisible();
    await expect
      .element(page.getByRole("option", { name: new RegExp(`^${font.name}`) }))
      .toHaveAttribute("aria-selected", "true");
  });

  test("should preview a font under the mouse and restore it when the mouse leaves", async () => {
    // Arrange
    await mountApp();
    const font = CODE_FONTS[1]!;
    await fontTrigger().click();

    // Act
    await page.getByRole("option", { name: font.name, exact: true }).hover();
    await expect.poll(async () => (await specInUrl())?.font).toBe(font.id);
    await themeTrigger().hover();

    // Assert
    await expect.poll(async () => (await specInUrl())?.font).toBe(undefined);
  });
});

describe("background", () => {
  const backgroundTrigger = () => page.getByRole("button", { name: /^Background: / });
  const CORAL = BACKGROUNDS.find((preset) => preset.id === "coral")!.css;

  test.each([
    ["Gradient", "Coral", CORAL],
    ["Gradient", "Nebula", BACKGROUNDS.find((preset) => preset.id === "mesh-nebula")!.css],
    ["Color", "Black", "#000000"],
  ])("should set a background from the %s swatches", async (tab, name, expected) => {
    // Arrange
    await mountApp();
    await backgroundTrigger().click();
    await page.getByRole("radio", { name: tab }).click();

    // Act
    await page.getByRole("button", { name, exact: true }).click();

    // Assert
    await expect.poll(async () => (await specInUrl())?.background).toBe(expected);
    await expect.element(backgroundTrigger()).toHaveAttribute("aria-label", `Background: ${name}`);
  });

  test("should show a window of the theme on each background tile", async () => {
    // Arrange
    await mountApp();
    const theme = THEMES.find((theme) => theme.id === DEFAULT_THEME)!;
    const window = getFrameColors(theme, "dark").background;

    // Act
    await backgroundTrigger().click();

    // Assert
    const tile = page.getByRole("button", { name: "Coral" });
    await expect.element(tile).toBeVisible();
    const preview = tile.element().querySelector<HTMLElement>(".background-preview-window")!;
    const swatch = document.createElement("span");
    swatch.style.background = window;
    expect(preview.style.backgroundColor).toBe(swatch.style.backgroundColor);
    expect(document.querySelectorAll(".background-swatch .background-preview-window").length).toBe(
      document.querySelectorAll(".background-swatch").length,
    );
  });

  test("should preview a background preset under the mouse and restore it after", async () => {
    // Arrange
    const twilight = BACKGROUNDS.find((preset) => preset.id === "twilight")!.css;
    await mountApp();
    await window.tin.setSpec({ ...DEFAULT_SPEC, background: twilight });
    await backgroundTrigger().click();
    const coral = page.getByRole("button", { name: "Coral" });

    // Act
    await coral.hover();
    await expect.poll(async () => (await specInUrl())?.background).toBe(CORAL);
    await page.getByRole("textbox", { name: "CSS gradient" }).hover();

    // Assert
    await expect.poll(async () => (await specInUrl())?.background).toBe(twilight);
    await expect.element(coral).toHaveAttribute("aria-pressed", "false");
  });

  test("should move through the background presets with the arrow keys", async () => {
    // Arrange
    const gradients = BACKGROUNDS.filter((preset) => preset.kind !== "color");
    const at = gradients.findIndex((preset) => preset.id === "coral");
    await mountApp();
    await backgroundTrigger().click();
    page.getByRole("button", { name: "Coral" }).element().focus();

    // Act
    await userEvent.keyboard("{ArrowRight}");

    // Assert
    const next = gradients[at + 1]!;
    await expect.poll(async () => (await specInUrl())?.background).toBe(next.css);
    expect(document.activeElement?.getAttribute("aria-label")).toBe(next.name);
  });

  test("should restore the background with Escape after an arrow key preview", async () => {
    // Arrange
    await mountApp();
    await backgroundTrigger().click();
    page.getByRole("button", { name: "Coral" }).element().focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.poll(async () => (await specInUrl())?.background).not.toBe(undefined);

    // Act
    await userEvent.keyboard("{Escape}");

    // Assert
    await expect.poll(async () => (await specInUrl())?.background).toBe(undefined);
  });

  test("should keep a background preset that was clicked after a preview", async () => {
    // Arrange
    await mountApp();
    await backgroundTrigger().click();
    const coral = page.getByRole("button", { name: "Coral" });
    await coral.hover();

    // Act
    await coral.click();
    await page.getByRole("textbox", { name: "CSS gradient" }).hover();

    // Assert
    await expect.poll(async () => (await specInUrl())?.background).toBe(CORAL);
    await expect.element(coral).toHaveAttribute("aria-pressed", "true");
  });

  test("should not show the Ambient tab", async () => {
    // Arrange
    await mountApp();

    // Act
    await backgroundTrigger().click();

    // Assert
    await expect.element(page.getByRole("radio", { name: "Gradient" })).toBeVisible();
    await expect.element(page.getByRole("radio", { name: "Ambient" })).not.toBeInTheDocument();
  });

  // The ambient backgrounds are not enabled yet
  test.skip.each([
    ["Blur", "ambient-blur", "Ambient blur"],
    ["Code", "ambient-code", "Ambient code"],
    ["Theme", "ambient-theme", "Ambient theme"],
  ])("should set the ambient background %s", async (name, expected, label) => {
    // Arrange
    await mountApp();
    await backgroundTrigger().click();
    await page.getByRole("radio", { name: "Ambient" }).click();

    // Act
    await page.getByRole("button", { name, exact: true }).click();

    // Assert
    await expect.poll(async () => (await specInUrl())?.background).toBe(expected);
    await expect.element(backgroundTrigger()).toHaveAttribute("aria-label", `Background: ${label}`);
  });

  test("should make the background transparent with the opacity 0", async () => {
    // Arrange
    await mountApp();
    const slider = page.getByRole("slider", { name: "Opacity" });

    // Act
    await slider.click();
    await userEvent.keyboard("{Home}");

    // Assert
    await expect.poll(async () => (await specInUrl())?.backgroundOpacity).toBe(0);
    await expect
      .element(backgroundTrigger())
      .toHaveAttribute("aria-label", "Background: Transparent");
  });

  test("should show the opacity slider outside the background panel", async () => {
    // Arrange
    await mountApp();

    // Act
    const slider = page.getByRole("slider", { name: "Opacity" });

    // Assert
    await expect.element(slider).toBeVisible();
    await expect.element(page.getByRole("dialog", { name: "Background" })).not.toBeInTheDocument();
  });

  test("should set a CSS gradient from the text field", async () => {
    // Arrange
    await mountApp();
    await backgroundTrigger().click();
    const field = page.getByRole("textbox", { name: "CSS gradient" });

    // Act
    await userEvent.fill(field, "linear-gradient(90deg, #112233, #445566)");

    // Assert
    await expect
      .poll(async () => (await specInUrl())?.background)
      .toBe("linear-gradient(90deg, #112233, #445566)");
    await expect.element(field).toHaveAttribute("aria-invalid", "false");
  });

  test("should keep the background for a CSS gradient that is not valid", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ ...DEFAULT_SPEC, background: CORAL });
    await backgroundTrigger().click();
    const field = page.getByRole("textbox", { name: "CSS gradient" });

    // Act
    await userEvent.fill(field, "linear-gradient(90deg, #112233");

    // Assert
    await expect.element(field).toHaveAttribute("aria-invalid", "true");
    expect((await specInUrl())?.background).toBe(CORAL);
  });

  test("should set a custom color from the RGB fields", async () => {
    // Arrange
    await mountApp();
    await backgroundTrigger().click();
    await page.getByRole("radio", { name: "Custom" }).click();

    // Act
    await userEvent.fill(page.getByRole("spinbutton", { name: "R" }), "17");
    await userEvent.fill(page.getByRole("spinbutton", { name: "G" }), "34");
    await userEvent.fill(page.getByRole("spinbutton", { name: "B" }), "51");

    // Assert
    await expect.poll(async () => (await specInUrl())?.background).toBe("#112233");
    await expect.element(backgroundTrigger()).toHaveAttribute("aria-label", "Background: Custom");
  });

  test("should set a custom color with the saturation and brightness square", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ ...DEFAULT_SPEC, background: "#800000" });
    await backgroundTrigger().click();
    await page.getByRole("radio", { name: "Custom" }).click();
    const square = page.getByRole("slider", { name: "Saturation and brightness" });
    (square.element() as HTMLElement).focus();

    // Act
    await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}");

    // Assert
    await expect.poll(async () => (await specInUrl())?.background).toBe("#9a0000");
    await expect.element(square).toHaveAttribute("aria-valuetext", "#9a0000");
  });

  test("should reset the background and keep the opacity when the theme changes", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ ...DEFAULT_SPEC, background: "#000000", backgroundOpacity: 0.5 });

    // Act
    await themeTrigger().click();
    await page.getByRole("option", { name: "Nord", exact: true }).click();

    // Assert
    await expect.poll(async () => (await specInUrl())?.theme).toBe("nord");
    expect((await specInUrl())?.background).toBe(undefined);
    expect((await specInUrl())?.backgroundOpacity).toBe(0.5);
  });

  test.each([
    ["dark", "primer"],
    ["light", "daybreak"],
  ] as const)("should show the background preset of the theme in the mode %s", async (mode, id) => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ ...DEFAULT_SPEC, theme: "vscode", mode });

    // Act
    await backgroundTrigger().click();

    // Assert
    const css = BACKGROUNDS.find((preset) => preset.id === id)!.css;
    await expect.element(page.getByRole("textbox", { name: "CSS gradient" })).toHaveValue(css);
  });

  test("should show the background as a color bar below the theme", async () => {
    // Act
    await mountApp();
    await window.tin.setSpec({ ...DEFAULT_SPEC, background: "#123456", backgroundOpacity: 0.5 });

    // Assert
    const bar = () => document.querySelector<HTMLElement>(".background-bar > span");
    await expect.poll(() => bar()?.style.background).toBe("rgb(18, 52, 86)");
    expect(bar()?.style.opacity).toBe("0.5");
    const labels = [...document.querySelectorAll(".sidebar .field-label")].map(
      (label) => label.textContent,
    );
    expect(labels.slice(0, 2)).toEqual(["Theme", "Background"]);
  });

  test("should show a background of a spec that the list does not have", async () => {
    // Act
    await mountApp();
    await window.tin.setSpec({ ...DEFAULT_SPEC, background: "#123456" });

    // Assert
    await expect.element(backgroundTrigger()).toHaveAttribute("aria-label", "Background: Custom");
  });
});

describe("line numbers", () => {
  const imageSwitch = () => page.getByRole("switch", { name: "Line numbers", exact: true });
  const paneSwitch = () => page.getByRole("switch", { name: "Line numbers of pane 1" });

  test("should follow the line numbers of the image in a pane", async () => {
    // Arrange
    await mountApp();

    // Act
    await imageSwitch().click();

    // Assert
    await expect.poll(async () => (await specInUrl())?.lineNumbers).toBe(true);
    await expect.element(paneSwitch()).toHaveAttribute("aria-checked", "true");
    expect((await specInUrl())?.windows[0]?.panes[0]?.lineNumbers).toBe(undefined);
  });

  test("should turn off the line numbers of one pane", async () => {
    // Arrange
    await mountApp();
    await imageSwitch().click();
    await expect.element(paneSwitch()).toHaveAttribute("aria-checked", "true");

    // Act
    await paneSwitch().click();

    // Assert
    await expect
      .poll(async () => (await specInUrl())?.windows[0]?.panes[0]?.lineNumbers)
      .toBe(false);
    expect((await specInUrl())?.lineNumbers).toBe(true);
    await expect.element(imageSwitch()).toHaveAttribute("aria-checked", "true");
  });

  test("should remove the value of a pane that matches the image again", async () => {
    // Arrange
    await mountApp();
    await paneSwitch().click();
    await expect
      .poll(async () => (await specInUrl())?.windows[0]?.panes[0]?.lineNumbers)
      .toBe(true);

    // Act
    await paneSwitch().click();

    // Assert
    await expect
      .poll(async () => (await specInUrl())?.windows[0]?.panes[0]?.lineNumbers)
      .toBe(undefined);
    await expect.element(paneSwitch()).toHaveAttribute("aria-checked", "false");
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

  // No active theme has a title bar in a code font. The test comes back with the company themes.
  test.skip("should make the title field as wide as its placeholder in the code font of the title bar", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({
      theme: "triggerdev",
      windows: [{ tabs: true, panes: [{ title: "main.ts", code: "x" }] }],
    });
    const field = page.getByRole("textbox", { name: "Title of window 1" });
    await expect.element(field).toBeVisible();
    await document.fonts.ready;
    const input = field.element() as HTMLInputElement;
    const style = getComputedStyle(input);
    const text = document.createElement("span");
    text.textContent = input.placeholder;
    Object.assign(text.style, {
      font: style.font,
      letterSpacing: style.letterSpacing,
      position: "absolute",
      whiteSpace: "pre",
    });
    document.body.append(text);

    // Act
    const textWidth = text.offsetWidth;
    text.remove();

    // Assert
    expect(input.placeholder).toBe("Untitled");
    expect(input.clientWidth).toBeGreaterThanOrEqual(textWidth);
  });

  test("should not show the window of a selected popover as selected", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(POPOVER_SPEC);

    // Act
    await page.getByRole("textbox", { name: "Code of popover 1 of window 1, pane 1" }).click();

    // Assert
    await expect.element(page.getByRole("group", { name: "Selected popover" })).toBeVisible();
    await expect.element(windowRow("a.ts")).toHaveAttribute("aria-pressed", "false");
    await expect.element(windowRow("a.ts")).toHaveAttribute("aria-expanded", "true");
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
    const row = windowRow("counter.tsx");
    await expect.element(row).toHaveAttribute("aria-pressed", "true");

    // Act
    await userEvent.keyboard("{Delete}");

    // Assert
    expect(window.tin.getSpec().windows.length).toBe(1);
    await expect.element(row).toHaveAttribute("aria-pressed", "true");
  });
});

describe("popover list", () => {
  test("should list the popovers of a pane and select one with a click", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(POPOVER_SPEC);
    const row = page.getByRole("button", { name: "Popover plans, line 1" });

    // Act
    await row.click();

    // Assert
    await expect.element(row).toHaveAttribute("aria-pressed", "true");
    await expect.element(page.getByRole("group", { name: "Selected popover" })).toBeVisible();
    await expect.element(windowRow("a.ts")).toHaveAttribute("aria-expanded", "true");
    expect(document.querySelectorAll(".hover-group.selected").length).toBe(1);
  });

  test("should highlight the popover in the image while the pointer is on its row", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(POPOVER_SPEC);

    // Act
    await page.getByRole("button", { name: "Popover plans, line 1" }).hover();

    // Assert
    await expect.poll(() => document.querySelectorAll(".selection.hovered").length).toBe(1);
  });

  test("should remove a popover with the button in its settings", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(POPOVER_SPEC);

    await page.getByRole("button", { name: "Popover plans, line 1" }).click();

    // Act
    await page
      .getByRole("group", { name: "Selected popover" })
      .getByRole("button", { name: "Remove" })
      .click();

    // Assert
    await expect.poll(() => window.tin.getSpec().windows[0]?.panes[0]?.annotations).toEqual([]);
  });

  test("should mark a popover whose text is not in the code", async () => {
    // Arrange
    await mountApp();

    // Act
    await window.tin.setSpec({
      windows: [
        {
          panes: [
            {
              title: "a.ts",
              code: "const a = 1;",
              annotations: [{ line: 1, match: "plans", code: "type Plans = number" }],
            },
          ],
        },
      ],
    });

    // Assert
    await expect
      .element(page.getByRole("button", { name: "Popover plans, line 1" }))
      .toHaveTextContent("plansnot in code");
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

  test("should copy selected page text, not the selected window", async () => {
    // Arrange
    // The first window is selected after the start
    await mountApp();
    await page.getByRole("button", { name: "About and shortcuts" }).click();
    const command = document.querySelector("dialog.about pre")!;
    document.getSelection()!.selectAllChildren(command);
    const clipboard = new DataTransfer();
    const event = new ClipboardEvent("copy", {
      bubbles: true,
      cancelable: true,
      clipboardData: clipboard,
    });

    // Act
    command.dispatchEvent(event);

    // Assert
    expect(event.defaultPrevented).toBe(false);
    expect(clipboard.getData("text/plain")).toBe("");
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
  test("should link to the X account of the author and the source code", async () => {
    // Act
    await mountApp();

    // Assert
    await expect
      .element(page.getByRole("link", { name: "@zirkelc on X" }))
      .toHaveAttribute("href", "https://x.com/zirkelc");
    await expect
      .element(page.getByRole("link", { name: "Source code on GitHub" }))
      .toHaveAttribute("href", "https://github.com/zirkelc/tin.so");
  });
});

describe("about dialog", () => {
  test("should open from the toolbar with the shortcuts, the skill and the legal pages", async () => {
    // Arrange
    await mountApp();

    // Act
    await page.getByRole("button", { name: "About and shortcuts" }).click();

    // Assert
    const dialog = page.getByRole("dialog", { name: "About" });
    await expect.element(dialog).toBeVisible();
    await expect.element(dialog.getByRole("heading", { name: "Shortcuts" })).toBeVisible();
    await expect
      .element(dialog.getByRole("link", { name: "info@tin.so" }))
      .toHaveAttribute("href", "mailto:info@tin.so");
    await expect
      .element(dialog.getByRole("link", { name: "Privacy", exact: true }))
      .toHaveAttribute("href", "/privacy");
    await expect
      .element(dialog.getByRole("link", { name: "Legal", exact: true }))
      .toHaveAttribute("href", "/legal");
    await expect.element(dialog.getByText("npx skills add zirkelc/tin.so")).toBeVisible();
    await expect
      .element(dialog.getByText("/plugin install tin --marketplace zirkelc/tin.so"))
      .toBeVisible();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Close");
  });

  test("should open with the ? key and close with Escape", async () => {
    // Arrange
    await mountApp();

    // Act
    await userEvent.keyboard("?");
    const opened = document.querySelector("dialog.about")?.hasAttribute("open");
    await userEvent.keyboard("{Escape}");

    // Assert
    expect(opened).toBe(true);
    await expect.element(page.getByRole("dialog", { name: "About" })).not.toBeInTheDocument();
  });

  test("should not open when ? is typed into the code", async () => {
    // Arrange
    await mountApp();

    // Act
    await userEvent.type(codeField(1, 1), "?");

    // Assert
    expect(document.querySelector("dialog.about")?.hasAttribute("open")).toBe(false);
  });
});

describe("examples", () => {
  function languageTrigger(pane: number) {
    const fields = [...document.querySelectorAll(".field.select")].filter(
      (element) => element.querySelector(".field-label")?.textContent === "Language",
    );
    return fields[pane - 1]!.querySelector("button")!;
  }

  test("should show the example of a language that the user picks", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ windows: [{ panes: [{ title: "main.ts", code: "" }] }] });
    languageTrigger(1).click();

    // Act
    await userEvent.fill(page.getByRole("textbox", { name: "Search Language" }), "python");
    await userEvent.keyboard("{Enter}");

    // Assert
    await expect.poll(async () => (await specInUrl())?.windows[0]?.panes[0]?.title).toBe("main.py");
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

  test("should hide the panel when a click in the code clears the selection", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({
      windows: [{ panes: [{ title: "a.ts", code: "const a = 1;" }] }],
    });
    await codeField(1).click();
    await userEvent.keyboard("{Home}{Shift>}{End}{/Shift}");
    const panel = page.getByRole("toolbar", { name: "Text style" });
    await expect.element(panel).toBeVisible();

    // Act
    await codeField(1).click({ position: { x: 20, y: 8 } });

    // Assert
    const field = codeField(1).element() as HTMLTextAreaElement;
    expect(field.selectionStart).toBe(field.selectionEnd);
    await expect.element(panel).not.toBeInTheDocument();
  });

  test("should hide the panel without a selection", async () => {
    // Act
    await mountApp();
    await codeField(1).click();

    // Assert
    await expect.element(page.getByRole("toolbar", { name: "Text style" })).not.toBeInTheDocument();
  });
});
