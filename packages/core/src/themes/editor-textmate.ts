// The TextMate themes of the editor themes. The script port-editor-themes.ts writes this file.
import type { ThemeRegistrationAny } from "shiki";

export const EDITOR_TEXTMATE_THEMES: Record<
  string,
  () => Promise<{ default: ThemeRegistrationAny }>
> = {
  "ayu-dark": () => import("@shikijs/themes/ayu-dark"),
  "ayu-light": () => import("@shikijs/themes/ayu-light"),
  "catppuccin-mocha": () => import("@shikijs/themes/catppuccin-mocha"),
  "catppuccin-latte": () => import("@shikijs/themes/catppuccin-latte"),
  "dark-plus": () => import("@shikijs/themes/dark-plus"),
  "light-plus": () => import("@shikijs/themes/light-plus"),
  dracula: () => import("@shikijs/themes/dracula"),
  "dracula-alucard": () =>
    import("./textmate/dracula-alucard.json", { with: { type: "json" } }) as Promise<{
      default: ThemeRegistrationAny;
    }>,
  "github-dark-default": () => import("@shikijs/themes/github-dark-default"),
  "github-light-default": () => import("@shikijs/themes/github-light-default"),
  "material-theme": () => import("@shikijs/themes/material-theme"),
  "material-theme-lighter": () => import("@shikijs/themes/material-theme-lighter"),
  "night-owl": () => import("@shikijs/themes/night-owl"),
  "night-owl-light": () => import("@shikijs/themes/night-owl-light"),
  nord: () => import("@shikijs/themes/nord"),
  "one-dark-pro": () => import("@shikijs/themes/one-dark-pro"),
  "one-light": () => import("@shikijs/themes/one-light"),
  "rose-pine": () => import("@shikijs/themes/rose-pine"),
  "rose-pine-dawn": () => import("@shikijs/themes/rose-pine-dawn"),
  "solarized-dark": () => import("@shikijs/themes/solarized-dark"),
  "solarized-light": () => import("@shikijs/themes/solarized-light"),
  "synthwave-84": () => import("@shikijs/themes/synthwave-84"),
  "tokyo-night": () => import("@shikijs/themes/tokyo-night"),
  "tokyo-night-light": () =>
    import("./textmate/tokyo-night-light.json", { with: { type: "json" } }) as Promise<{
      default: ThemeRegistrationAny;
    }>,
  "vitesse-dark": () => import("@shikijs/themes/vitesse-dark"),
  "vitesse-light": () => import("@shikijs/themes/vitesse-light"),
};
