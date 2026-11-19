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

describe("tab key", () => {
  const CODE = "if (ok) {\nreturn 1;\nreturn 2;\n}";

  // Opens a pane with the code and selects the two return lines
  async function selectReturnLines(code = CODE) {
    await mountApp();
    await window.tin.setSpec({ ...DEFAULT_SPEC, windows: [{ panes: [{ code }] }] });
    await expect.element(codeField(1)).toHaveValue(code);
    const field = codeField(1).element() as HTMLTextAreaElement;
    field.focus();
    const start = code.indexOf("return 1");
    field.setSelectionRange(start, code.indexOf("}", start));
  }

  test("should indent the selected lines", async () => {
    // Arrange
    await selectReturnLines();

    // Act
    await userEvent.keyboard("{Tab}");

    // Assert
    await expect.element(codeField(1)).toHaveValue("if (ok) {\n  return 1;\n  return 2;\n}");
  });

  test("should bring back the code with undo after an indent", async () => {
    // Arrange
    await selectReturnLines();
    await userEvent.keyboard("{Tab}");
    await expect.element(codeField(1)).toHaveValue("if (ok) {\n  return 1;\n  return 2;\n}");

    // Act
    await userEvent.keyboard("{ControlOrMeta>}z{/ControlOrMeta}");

    // Assert
    await expect.element(codeField(1)).toHaveValue(CODE);
  });

  test("should outdent the selected lines with Shift+Tab", async () => {
    // Arrange
    await selectReturnLines("if (ok) {\n  return 1;\n  return 2;\n}");

    // Act
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");

    // Assert
    await expect.element(codeField(1)).toHaveValue(CODE);
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
    ["Mesh", "Orchid", BACKGROUNDS.find((preset) => preset.id === "mesh-orchid")!.css],
    ["Solid", "Black", "#000000"],
  ])("should set a background from the %s swatches", async (tab, name, expected) => {
    // Arrange
    await mountApp();
    await backgroundTrigger().click();
    await page
      .getByRole("radiogroup", { name: "Kind of background" })
      .getByRole("radio", { name: tab })
      .click();

    // Act
    await page.getByRole("button", { name, exact: true }).click();

    // Assert
    await expect.poll(async () => (await specInUrl())?.background).toBe(expected);
    await expect.element(backgroundTrigger()).toHaveAttribute("aria-label", `Background: ${name}`);
  });

  test.each([
    ["Light red", "#fecaca"],
    ["Dark red", "#7f1d1d"],
    ["Light cyan", "#a5f3fc"],
    ["Dark indigo", "#312e81"],
  ])("should offer the solid color %s", async (name, expected) => {
    // Arrange
    await mountApp();
    await backgroundTrigger().click();
    await page
      .getByRole("radiogroup", { name: "Kind of background" })
      .getByRole("radio", { name: "Solid" })
      .click();

    // Act
    await page.getByRole("button", { name, exact: true }).click();

    // Assert
    await expect.poll(async () => (await specInUrl())?.background).toBe(expected);
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
    const gradients = BACKGROUNDS.filter((preset) => preset.kind === "gradient");
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

  test("should move one row of three gradients down with the arrow key", async () => {
    // Arrange
    const gradients = BACKGROUNDS.filter((preset) => preset.kind === "gradient");
    await mountApp();
    await backgroundTrigger().click();
    page.getByRole("button", { name: gradients[0]!.name }).element().focus();

    // Act
    await userEvent.keyboard("{ArrowDown}");

    // Assert
    await expect.poll(async () => (await specInUrl())?.background).toBe(gradients[3]!.css);
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

  test.each([
    ["Theme", "ambient-theme", "Ambient theme"],
    ["Code", "ambient-code", "Ambient code"],
    ["Halo", "ambient-halo", "Ambient halo"],
    ["Spotlight", "ambient-spotlight", "Ambient spotlight"],
    ["Stage", "ambient-stage", "Ambient stage"],
    ["Blur", "ambient-blur", "Ambient blur"],
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

  test.each(["Gradient", "Mesh"])(
    "should show the %s tiles without a window of the theme",
    async (tab) => {
      // Arrange
      await mountApp();
      await backgroundTrigger().click();

      // Act
      await page
        .getByRole("radiogroup", { name: "Kind of background" })
        .getByRole("radio", { name: tab })
        .click();

      // Assert
      await expect
        .element(
          page
            .getByRole("button", { name: "Orchid" })
            .or(page.getByRole("button", { name: "Coral" })),
        )
        .toBeVisible();
      expect(document.querySelectorAll(".background-preview-window").length).toBe(0);
    },
  );

  test("should order the kinds of background as gradient, mesh, ambient and solid", async () => {
    // Arrange
    await mountApp();

    // Act
    await backgroundTrigger().click();

    // Assert
    const kinds = page.getByRole("radiogroup", { name: "Kind of background" }).getByRole("radio");
    await expect.element(kinds.first()).toBeVisible();
    expect(kinds.elements().map((kind) => kind.textContent)).toEqual([
      "Gradient",
      "Mesh",
      "Ambient",
      "Solid",
    ]);
  });

  test("should set a custom color from the RGB fields", async () => {
    // Arrange
    await mountApp();
    await backgroundTrigger().click();
    await page.getByRole("button", { name: "Custom", exact: true }).click();

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
    await page.getByRole("button", { name: "Custom", exact: true }).click();
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
    ["light", "azure"],
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

  test("should remove a popover with the button in its row", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(POPOVER_SPEC);

    // Act
    await page.getByRole("button", { name: "Remove popover plans" }).click();

    // Assert
    await expect.poll(() => window.tin.getSpec().windows[0]?.panes[0]?.annotations).toEqual([]);
  });

  test("should show the line that a popover is attached to in its settings", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(POPOVER_SPEC);

    // Act
    await page.getByRole("button", { name: "Popover plans, line 1" }).click();

    // Assert
    await expect
      .element(
        page.getByRole("group", { name: "Selected popover" }).getByText("Line 1", { exact: true }),
      )
      .toBeVisible();
  });

  test("should set the padding of the selected popover", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(POPOVER_SPEC);
    await page.getByRole("button", { name: "Popover plans, line 1" }).click();

    // Act
    await page
      .getByRole("group", { name: "Selected popover" })
      .getByRole("radio", { name: "12" })
      .click();

    // Assert
    await expect
      .poll(() => window.tin.getSpec().windows[0]?.panes[0]?.annotations?.[0]?.padding)
      .toBe(12);
  });

  test("should make a popover with a size fit its code again", async () => {
    // Arrange
    await mountApp();
    const [pane] = POPOVER_SPEC.windows[0]!.panes;
    await window.tin.setSpec({
      windows: [
        {
          panes: [
            { ...pane!, annotations: [{ ...pane!.annotations![0]!, width: 300, height: 90 }] },
          ],
        },
      ],
    });
    await page.getByRole("button", { name: "Popover plans, line 1" }).click();

    // Act
    await page
      .getByRole("group", { name: "Selected popover" })
      .getByRole("button", { name: "Fit" })
      .click();

    // Assert
    await expect
      .poll(() => window.tin.getSpec().windows[0]?.panes[0]?.annotations?.[0])
      .toEqual({ line: 1, match: "plans", code: "type Plans = number" });
  });

  test("should explain what it means that a popover is attached to its line", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(POPOVER_SPEC);
    await page.getByRole("button", { name: "Popover plans, line 1" }).click();

    // Act
    const term = page
      .getByRole("group", { name: "Selected popover" })
      .getByText("Line 1", { exact: true });

    // Assert
    await expect.element(term).toHaveAccessibleDescription(/moves with it/);
  });

  test("should show no place in the row of a popover that was moved", async () => {
    // Arrange
    await mountApp();

    // Act
    await window.tin.setSpec({
      windows: [
        {
          panes: [
            {
              title: "a.ts",
              code: "const plans = 1;",
              annotations: [{ line: 1, x: 40, y: 40, code: "type Plans = number" }],
            },
          ],
        },
      ],
    });

    // Assert
    const row = page.getByRole("button", { name: /^Popover type Plans = number/ });
    await expect.element(row).toBeVisible();
    expect(row.element().textContent).toBe("type Plans = number");
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

  test("should find a language by its alias", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ windows: [{ panes: [{ title: "main.ts", code: "" }] }] });
    languageTrigger(1).click();

    // Act
    await userEvent.fill(page.getByRole("textbox", { name: "Search Language" }), "bash");
    await userEvent.keyboard("{Enter}");

    // Assert
    await expect
      .poll(async () => (await specInUrl())?.windows[0]?.panes[0]?.title)
      .toBe("deploy.sh");
  });

  test("should list the popular languages first, by name and without icons", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ windows: [{ panes: [{ title: "main.ts", code: "" }] }] });

    // Act
    languageTrigger(1).click();

    // Assert
    const list = page.getByRole("listbox");
    await expect.element(list).toBeVisible();
    const options = [...list.element().querySelectorAll('[role="option"]')];
    const labels = options
      .slice(0, 3)
      .map((option) => option.querySelector(".select-value")?.textContent);
    const groups = [...list.element().querySelectorAll(".select-group")].map((g) => g.textContent);
    expect(labels).toEqual(["Auto (TypeScript)", "Plain Text", "TypeScript"]);
    expect(groups).toEqual(["Popular", "All languages"]);
    expect(list.element().querySelectorAll(".select-icon").length).toBe(0);
  });
});

describe("window toolbar", () => {
  test("should fit the window and its panes to the code", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({
      windows: [
        {
          width: 900,
          height: 500,
          panes: [
            { title: "a.ts", code: "const a = 1;", size: 400 },
            { title: "b.ts", code: "const b = 2;", size: 200 },
          ],
        },
      ],
    });

    // Act
    await page.getByRole("button", { name: "Fit the window to the code" }).click();

    // Assert
    await expect
      .poll(() => window.tin.getSpec().windows[0])
      .toEqual({
        panes: [
          { title: "a.ts", code: "const a = 1;" },
          { title: "b.ts", code: "const b = 2;" },
        ],
      });
  });
});

describe("pane sizes", () => {
  const THREE_PANES: SpecInput = {
    windows: [
      {
        panes: [
          { title: "a.ts", code: "const a = 1;", size: 300 },
          { title: "b.ts", code: "const b = 2;", size: 420 },
          { title: "c.ts", code: "const c = 3;", size: 380 },
        ],
      },
    ],
  };
  const divider = () =>
    page.getByTitle("Drag to resize the panes. Double-click to fit them to the code.").first();
  // The pointer can still be at the place of the divider from the test before, and a hover there
  // does not move it, so no pointer event fires. It first goes to another control.
  const hoverDivider = async () => {
    await page.getByRole("button", { name: "Fit the window to the code" }).hover();
    await divider().hover();
  };

  test("should make the panes the same size with the toolbar button", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(THREE_PANES);

    // Act
    await page.getByRole("button", { name: "Make the panes the same size" }).click();

    // Assert
    await expect
      .poll(() => window.tin.getSpec().windows[0]?.panes.map((pane) => pane.size))
      .toEqual([367, 367, 366]);
  });

  test("should show the size of each pane when the pointer is on a divider", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(THREE_PANES);

    // Act
    await hoverDivider();

    // Assert
    await expect.element(page.getByText("300 px · 27%")).toBeVisible();
    await expect.element(page.getByText("420 px · 38%")).toBeVisible();
    await expect.element(page.getByText("380 px · 35%")).toBeVisible();
  });

  test("should hide the sizes when the pointer leaves the divider", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(THREE_PANES);
    await hoverDivider();
    await expect.element(page.getByText("300 px · 27%")).toBeVisible();

    // Act
    await page.getByRole("button", { name: "Fit the window to the code" }).hover();

    // Assert
    await expect.poll(() => page.getByText("300 px · 27%").elements().length).toBe(0);
  });
});

describe("format code", () => {
  test("should keep the lines within the width of the pane", async () => {
    // Arrange
    const code = 'const user = {\n  id: 1,\n  name: "Ada",\n  email: "ada@example.com",\n};';
    await mountApp();
    await window.tin.setSpec({
      windows: [
        {
          panes: [
            { title: "a.ts", code: "const a=1" },
            { title: "user.ts", code },
          ],
        },
      ],
    });

    // Act
    await page.getByRole("button", { name: "Format the code (⇧⌥F)" }).click();

    // Assert
    await expect.poll(() => window.tin.getSpec().windows[0]?.panes[0]?.code).toBe("const a = 1;");
    expect(window.tin.getSpec().windows[0]?.panes[1]?.code).toBe(code);
  });

  test("should break the lines that are wider than a pane with a fixed size", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({
      windows: [
        {
          panes: [
            { title: "a.ts", code: "const a = 1;", size: 300 },
            {
              title: "user.ts",
              code: 'const user = { id: 1, name: "Ada", email: "ada@example.com" };',
              size: 300,
            },
          ],
        },
      ],
    });

    // Act
    await page.getByRole("button", { name: "Format the code (⇧⌥F)" }).click();

    // Assert
    await expect
      .poll(() => window.tin.getSpec().windows[0]?.panes[1]?.code)
      .toBe('const user = {\n  id: 1,\n  name: "Ada",\n  email: "ada@example.com",\n};');
  });
});

describe("undo", () => {
  const padding = () => window.tin.getSpec().padding;

  test("should undo and redo a change with the keyboard", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ padding: 64, windows: [{ panes: [{ code: "a" }] }] });
    await page.getByRole("radio", { name: "32", exact: true }).click();
    await expect.poll(padding).toBe(32);

    // Act
    await userEvent.keyboard("{ControlOrMeta>}z{/ControlOrMeta}");
    await expect.poll(padding).toBe(64);
    await userEvent.keyboard("{ControlOrMeta>}{Shift>}z{/Shift}{/ControlOrMeta}");

    // Assert
    await expect.poll(padding).toBe(32);
  });

  test("should undo a change with the undo button", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ padding: 64, windows: [{ panes: [{ code: "a" }] }] });
    await page.getByRole("radio", { name: "32", exact: true }).click();
    await expect.poll(padding).toBe(32);

    // Act
    await page.getByRole("button", { name: "Undo" }).click();

    // Assert
    await expect.poll(padding).toBe(64);
    await expect.element(page.getByRole("button", { name: "Redo" })).toBeEnabled();
  });

  test("should record no step for a theme that only showed as a preview", async () => {
    // Arrange
    await mountApp();
    await themeTrigger().click();
    await page.getByRole("option", { name: "Nord", exact: true }).hover();
    await expect.poll(() => window.tin.getSpec().theme).toBe("nord");

    // Act
    await page.getByRole("button", { name: "Close" }).click();

    // Assert
    await expect.poll(() => window.tin.getSpec().theme).not.toBe("nord");
    await expect.element(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  });
});

describe("frame", () => {
  test("should show the size of a window that fits its code", async () => {
    // Arrange
    await mountApp();

    // Act
    await window.tin.setSpec({ windows: [{ panes: [{ title: "a.ts", code: "a" }] }] });

    // Assert
    const size = page.getByText("Size", { exact: true }).element().nextElementSibling;
    expect(size?.textContent).toBe("AutoFit");
    await expect
      .element(page.getByTitle("Make the window and its panes fit the code again"))
      .toBeDisabled();
  });

  test("should not offer to turn off the window of a window with a frame", async () => {
    // Arrange
    await mountApp();

    // Act
    await window.tin.setSpec({ windows: [{ panes: [{ title: "a.ts", code: "a" }] }] });

    // Assert
    await expect.element(page.getByRole("switch", { name: "Tabs", exact: true })).toBeVisible();
    expect(page.getByRole("switch", { name: "Window", exact: true }).elements().length).toBe(0);
  });

  test("should explain that the theme keeps the window of a window without a frame", async () => {
    // Arrange
    await mountApp();

    // Act
    await window.tin.setSpec({
      theme: "nord",
      windows: [{ frame: false, panes: [{ title: "a.ts", code: "a" }] }],
    });

    // Assert
    await expect
      .element(
        page.getByText(
          "The theme Nord always shows the window, so the image ignores frame: false.",
        ),
      )
      .toBeVisible();
    expect(page.getByRole("switch", { name: "Window", exact: true }).elements().length).toBe(0);
  });
});

describe("help", () => {
  test("should underline a help term only while the side panel has the pointer or the focus", async () => {
    // Arrange
    await mountApp();
    const term = page.getByText("Padding", { exact: true });
    const underline = () => getComputedStyle(term.element()).textDecorationColor;
    await page.getByRole("button", { name: "Zoom in" }).hover();
    await expect.poll(underline).toBe("rgba(0, 0, 0, 0)");

    // Act
    await page.getByText("Theme", { exact: true }).hover();

    // Assert
    await expect.poll(underline).not.toBe("rgba(0, 0, 0, 0)");
  });

  test.each([
    ["Format", /shape of the image/],
    ["Padding", /space between the windows and the edge/],
    ["Mode", /dark or the light colors/],
    ["Opacity", /transparent background/],
    ["Tabs", /tab with the file name/],
    ["Style", /title bar has its own color/],
    ["Tab icon", /icon on the tab of this pane/],
  ])("should explain the setting %s", async (label, help) => {
    // Arrange
    await mountApp();

    // Act
    const term = page.getByText(label, { exact: true }).first();

    // Assert
    await expect.element(term).toHaveAccessibleDescription(help);
  });
});

describe("popover place", () => {
  const POPOVER: SpecInput = {
    windows: [
      {
        panes: [
          {
            title: "a.ts",
            code: "const plans = 1;\nconst team = 2;",
            annotations: [{ line: 1, column: 7, code: "type Plans = number" }],
          },
        ],
      },
    ],
  };
  const annotation = () => window.tin.getSpec().windows[0]?.panes[0]?.annotations?.[0];
  const handle = () =>
    page.getByTitle("Drag to move the popover. Double-click to attach it to its line again.");

  test("should add a popover to a line without a selection", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ windows: [{ panes: [{ title: "a.ts", code: "a\nb" }] }] });
    const field = codeField(1);
    // The zoom fits the new image first, so the field has its place only after it stops moving
    let last = "";
    await expect
      .poll(() => {
        const now = JSON.stringify(field.element().getBoundingClientRect());
        const stable = now === last;
        last = now;
        return stable;
      })
      .toBe(true);
    const box = field.element().getBoundingClientRect();
    await field.click({ button: "right", position: { x: 4, y: box.height * 0.75 } });

    // Act
    await page.getByRole("menuitem", { name: "Add popover" }).click();

    // Assert
    await expect
      .poll(() => window.tin.getSpec().windows[0]?.panes[0]?.annotations)
      .toEqual([{ line: 2, column: 1, code: "" }]);
  });

  test("should keep the popover when the text that it starts below changes", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(POPOVER);

    // Act
    await userEvent.fill(codeField(1), "const users = 1;\nconst team = 2;");

    // Assert
    await expect.poll(() => document.querySelectorAll(".handle-popover").length).toBe(1);
    expect(annotation()).toEqual({ line: 1, column: 7, code: "type Plans = number" });
  });

  test("should give the popover a fixed place when it is dragged", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(POPOVER);

    // Act
    await userEvent.dragAndDrop(handle(), codeField(1), {
      sourcePosition: { x: 20, y: 20 },
      targetPosition: { x: 200, y: 4 },
      force: true,
    });

    // Assert
    await expect
      .poll(() => annotation()?.x !== undefined && annotation()?.y !== undefined)
      .toBe(true);
    expect(annotation()?.offsetX).toBe(undefined);
    expect(annotation()?.line).toBe(1);
  });

  test("should attach a popover with a fixed place to its line again from its menu", async () => {
    // Arrange
    await mountApp();
    const pane = POPOVER.windows[0]!.panes[0]!;
    await window.tin.setSpec({
      windows: [
        { panes: [{ ...pane, annotations: [{ ...pane.annotations![0]!, x: 200, y: 80 }] }] },
      ],
    });
    await handle().click({ button: "right", position: { x: 20, y: 20 }, force: true });

    // Act
    await page.getByRole("menuitem", { name: "Attach to line 1" }).click();

    // Assert
    await expect.poll(annotation).toEqual({ line: 1, column: 7, code: "type Plans = number" });
  });
});

describe("zoom", () => {
  test("should keep the zoom when an edit makes the image larger", async () => {
    // Arrange
    const code = `export const plans = ["free", "pro", "team", "enterprise", "custom"] as const satisfies Array<string>;`;
    await mountApp();
    await window.tin.setSpec({ windows: [{ panes: [{ title: "plans.ts", code }] }] });
    const value = page.getByTitle("Show the image at 100%");
    // The zoom fits the new image first, so the value counts only after it stops changing
    let last = "";
    await expect
      .poll(() => {
        const now = value.element().textContent ?? "";
        const stable = now.includes("%") && now === last;
        last = now;
        return stable;
      })
      .toBe(true);
    const before = value.element().textContent!;
    await page.getByRole("textbox", { name: "Code of window 1, pane 1" }).click();

    // Act
    await page.getByRole("button", { name: "Add a pane to the right" }).click();

    // Assert
    await expect.poll(() => window.tin.getSpec().windows[0]?.panes.length).toBe(2);
    await expect.poll(() => value.element().textContent, { timeout: 2_000 }).toBe(before);
  });
});

describe("canvas pan", () => {
  const zoomIn = async () => {
    await mountApp();
    await window.tin.setSpec({ windows: [{ panes: [{ title: "a.ts", code: "const a = 1;" }] }] });
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Zoom in" }).click();
    const stage = document.querySelector<HTMLElement>(".preview")!;
    await expect.poll(() => stage.scrollWidth > stage.clientWidth + 200).toBe(true);
    stage.scrollLeft = 0;
    stage.scrollTop = 0;
    return stage;
  };
  const dragOn = (stage: HTMLElement, button: number) => {
    const at = { clientX: 600, clientY: 400, button, pointerId: 1, bubbles: true };
    stage.dispatchEvent(new PointerEvent("pointerdown", at));
    window.dispatchEvent(new PointerEvent("pointermove", { ...at, clientX: 400, clientY: 300 }));
    window.dispatchEvent(new PointerEvent("pointerup", { ...at, clientX: 400, clientY: 300 }));
  };

  test("should scroll the zoomed canvas with a drag while Space is held", async () => {
    // Arrange
    const stage = await zoomIn();
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { code: "Space", key: " ", bubbles: true }),
    );

    // Act
    dragOn(stage, 0);
    document.body.dispatchEvent(
      new KeyboardEvent("keyup", { code: "Space", key: " ", bubbles: true }),
    );

    // Assert
    expect([stage.scrollLeft, stage.scrollTop]).toEqual([200, 100]);
  });

  test("should scroll the zoomed canvas with a drag in the hand tool", async () => {
    // Arrange
    const stage = await zoomIn();
    await page.getByRole("button", { name: "Hand (H)" }).click();

    // Act
    dragOn(stage, 0);

    // Assert
    expect([stage.scrollLeft, stage.scrollTop]).toEqual([200, 100]);
    await expect
      .element(page.getByRole("button", { name: "Hand (H)" }))
      .toHaveAttribute("aria-pressed", "true");
  });

  test("should switch between the select and the hand tool with V and H", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ windows: [{ panes: [{ title: "a.ts", code: "const a = 1;" }] }] });

    // Act
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "h", bubbles: true }));
    await expect
      .element(page.getByRole("button", { name: "Hand (H)" }))
      .toHaveAttribute("aria-pressed", "true");
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "v", bubbles: true }));

    // Assert
    await expect
      .element(page.getByRole("button", { name: "Select (V)" }))
      .toHaveAttribute("aria-pressed", "true");
  });

  test("should scroll the zoomed canvas with a drag of the middle button", async () => {
    // Arrange
    const stage = await zoomIn();

    // Act
    dragOn(stage, 1);

    // Assert
    expect([stage.scrollLeft, stage.scrollTop]).toEqual([200, 100]);
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

  test("should show a fill color that is not in the palette as a pressed swatch", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({
      windows: [
        {
          panes: [
            {
              title: "a.ts",
              code: "const a = 1;",
              marks: [{ line: 1, match: "const", background: "#f8514940" }],
            },
          ],
        },
      ],
    });
    await codeField(1).click();

    // Act
    await userEvent.keyboard(
      "{Home}{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}",
    );

    // Assert
    const fill = page
      .getByRole("toolbar", { name: "Text style" })
      .getByRole("group", { name: "Fill" });
    await expect
      .element(fill.getByRole("button", { name: "Fill #f8514940" }))
      .toHaveAttribute("aria-pressed", "true");
    await expect
      .element(fill.getByRole("button", { name: "No fill color" }))
      .toHaveAttribute("aria-pressed", "false");
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

describe("wavy line", () => {
  test("should draw a wavy line below the selected text", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ windows: [{ panes: [{ title: "a.ts", code: "save(user);" }] }] });
    await codeField(1).click();
    await userEvent.keyboard(
      "{Home}{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}",
    );
    const panel = page.getByRole("toolbar", { name: "Text style" });

    // Act
    await panel.getByRole("button", { name: "Wavy" }).click();

    // Assert
    await expect
      .poll(() => window.tin.getSpec().windows[0]?.panes[0]?.marks)
      .toEqual([{ line: 1, match: "save", occurrence: 1, style: "wavy" }]);
  });
});

describe("title bar group", () => {
  const group = () => page.getByRole("group", { name: "Title bar" });

  test("should keep the title, the controls and the style of the title bar together", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ windows: [{ panes: [{ title: "a.ts", code: "x" }] }] });

    // Act
    await group().getByRole("radio", { name: "Colors" }).click();
    await group().getByRole("radio", { name: "Solid" }).click();
    await group().getByRole("textbox", { name: "Title" }).fill("api");

    // Assert
    await expect
      .poll(() => {
        const { controls, titleBar, title } = window.tin.getSpec().windows[0]!;
        return { controls, titleBar, title };
      })
      .toEqual({ controls: "color", titleBar: "solid", title: "api" });
  });

  test("should remove the title bar with its switch and hide its settings", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ windows: [{ panes: [{ title: "a.ts", code: "x" }] }] });

    // Act
    await group().getByRole("switch", { name: "Title bar" }).click();

    // Assert
    await expect.poll(() => window.tin.getSpec().windows[0]?.titleBar).toBe(false);
    await expect.element(group().getByRole("radio", { name: "Colors" })).not.toBeInTheDocument();
  });
});

describe("code context menu", () => {
  test("should keep the selected text when the menu opens and closes", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ windows: [{ panes: [{ title: "a.ts", code: "const a = 1;" }] }] });
    const field = codeField(1);
    await field.click();
    await userEvent.keyboard("{Home}{Shift>}{End}{/Shift}");
    const element = field.element() as HTMLTextAreaElement;

    // Act
    await field.click({ button: "right", position: { x: 30, y: 10 } });
    const open = [element.selectionStart, element.selectionEnd, document.activeElement === element];
    await expect.element(page.getByRole("menuitem", { name: "Add popover" })).toBeVisible();
    await userEvent.keyboard("{Escape}");

    // Assert
    expect(open).toEqual([0, 12, true]);
    expect([element.selectionStart, element.selectionEnd]).toEqual([0, 12]);
    await expect.poll(() => document.activeElement).toBe(element);
  });
});

describe("highlight submenu", () => {
  const openSubmenu = async () => {
    await codeField(1).click({ button: "right" });
    await page.getByRole("menuitem", { name: /^Highlight line/ }).click();
  };

  test("should highlight the line of the caret in the color of the submenu", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ windows: [{ panes: [{ title: "a.ts", code: "a\nb" }] }] });
    await openSubmenu();

    // Act
    await page.getByRole("menuitemcheckbox", { name: "Red" }).click();

    // Assert
    await expect
      .poll(() => window.tin.getSpec().windows[0]?.panes[0]?.highlight)
      .toEqual([{ lines: expect.any(Number), color: "#f85149" }]);
  });

  test("should check the color of the highlight and remove it", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({
      windows: [
        { panes: [{ title: "a.ts", code: "a", highlight: [{ lines: 1, color: "#388bfd" }] }] },
      ],
    });
    await openSubmenu();
    await expect
      .element(page.getByRole("menuitemcheckbox", { name: /Blue$/ }))
      .toHaveAttribute("aria-checked", "true");

    // Act
    await page.getByRole("menuitem", { name: "Remove highlight" }).click();

    // Assert
    await expect.poll(() => window.tin.getSpec().windows[0]?.panes[0]?.highlight).toEqual([]);
  });
});

describe("style panel preview", () => {
  const selectSave = async () => {
    await mountApp();
    await window.tin.setSpec({ windows: [{ panes: [{ title: "a.ts", code: "save(user);" }] }] });
    await codeField(1).click();
    await userEvent.keyboard(
      "{Home}{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}",
    );
    return page.getByRole("toolbar", { name: "Text style" });
  };
  const marks = () => window.tin.getSpec().windows[0]?.panes[0]?.marks ?? [];

  test("should show a style in the image while the pointer is on its button", async () => {
    // Arrange
    const panel = await selectSave();

    // Act
    await panel.getByRole("button", { name: "Wavy" }).hover();

    // Assert
    await expect.poll(marks).toEqual([{ line: 1, match: "save", occurrence: 1, style: "wavy" }]);
    await expect
      .element(panel.getByRole("button", { name: "Wavy" }))
      .toHaveAttribute("aria-pressed", "false");
  });

  test("should remove the preview when the pointer leaves the button", async () => {
    // Arrange
    const panel = await selectSave();
    await panel.getByRole("button", { name: "Text Red" }).hover();
    await expect.poll(() => marks().length).toBe(1);

    // Act
    await panel.getByRole("button", { name: "Text Red" }).unhover();

    // Assert
    await expect.poll(marks).toEqual([]);
  });

  test("should put the marks back after the pointer moves over two buttons", async () => {
    // Arrange
    const panel = await selectSave();
    await panel.getByRole("button", { name: "Text Red" }).hover();
    await expect.poll(() => marks().length).toBe(1);

    // Act
    await panel.getByRole("button", { name: "Text Blue", exact: true }).hover();
    await panel.getByRole("button", { name: "Text Blue", exact: true }).unhover();

    // Assert
    await expect.poll(marks).toEqual([]);
  });

  test("should keep the style after a click on the button under the pointer", async () => {
    // Arrange
    const panel = await selectSave();

    // Act
    await panel.getByRole("button", { name: "Wavy" }).click();
    await panel.getByRole("button", { name: "Wavy" }).unhover();

    // Assert
    await expect.poll(marks).toEqual([{ line: 1, match: "save", occurrence: 1, style: "wavy" }]);
    await expect
      .element(panel.getByRole("button", { name: "Wavy" }))
      .toHaveAttribute("aria-pressed", "true");
  });
});

describe("highlight submenu twice", () => {
  test("should keep the color of the first line when a second line gets another color", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec({ windows: [{ panes: [{ title: "a.ts", code: "a\nb" }] }] });
    const field = codeField(1);
    // The zoom fits the new image first, so the field has its place only after it stops moving
    let last = "";
    await expect
      .poll(() => {
        const now = JSON.stringify(field.element().getBoundingClientRect());
        const stable = now === last;
        last = now;
        return stable;
      })
      .toBe(true);
    const box = field.element().getBoundingClientRect();
    const pick = async (y: number, color: RegExp) => {
      await field.click({ button: "right", position: { x: 20, y } });
      await page.getByRole("menuitem", { name: /^Highlight line/ }).click();
      await page.getByRole("menuitemcheckbox", { name: color }).click();
    };

    // Act
    await pick(box.height * 0.25, /Blue$/);
    await pick(box.height * 0.75, /Red$/);

    // Assert
    await expect
      .poll(() => window.tin.getSpec().windows[0]?.panes[0]?.highlight)
      .toEqual([
        { lines: 1, color: "#388bfd" },
        { lines: 2, color: "#f85149" },
      ]);
  });
});

describe("highlight submenu preview", () => {
  const openSubmenu = async () => {
    await mountApp();
    await window.tin.setSpec({ windows: [{ panes: [{ title: "a.ts", code: "a" }] }] });
    await codeField(1).click({ button: "right" });
    await page.getByRole("menuitem", { name: /^Highlight line/ }).click();
  };
  const highlight = () => window.tin.getSpec().windows[0]?.panes[0]?.highlight ?? [];
  const red = () => page.getByRole("menuitemcheckbox", { name: /Red$/ });

  test("should show the color on the line while the pointer is on it", async () => {
    // Arrange
    await openSubmenu();

    // Act
    await red().hover();

    // Assert
    await expect.poll(highlight).toEqual([{ lines: 1, color: "#f85149" }]);
    await expect.element(red()).toHaveAttribute("aria-checked", "false");
  });

  test("should put the highlight back when the pointer leaves the color", async () => {
    // Arrange
    await openSubmenu();
    await red().hover();
    await expect.poll(() => highlight().length).toBe(1);

    // Act
    await page.getByRole("menuitemcheckbox", { name: /Theme color$/ }).hover();
    await page.getByRole("menuitemcheckbox", { name: /Theme color$/ }).unhover();

    // Assert
    await expect.poll(highlight).toEqual([]);
  });

  test("should put the highlight back when the menu closes during a preview", async () => {
    // Arrange
    await openSubmenu();
    await red().hover();
    await expect.poll(() => highlight().length).toBe(1);

    // Act
    await userEvent.keyboard("{Escape}");

    // Assert
    await expect.poll(highlight).toEqual([]);
  });
});
