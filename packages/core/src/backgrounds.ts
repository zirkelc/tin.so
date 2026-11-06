import type { Mode, Theme } from "./themes/index.ts";

/** A background preset of the editor: a gradient, a color or a mesh of radial gradients */
export type BackgroundPreset = {
  id: string;
  name: string;
  kind: "gradient" | "color" | "mesh";
  /** The CSS background, as the background field of a spec takes it */
  css: string;
};

// The background presets, in the order of the editor: grays first, then by hue around the color wheel, and from dark to light within a hue
export const BACKGROUNDS: Array<BackgroundPreset> = [
  { id: "black", name: "Black", kind: "color", css: "#000000" },
  {
    id: "obsidian",
    name: "Obsidian",
    kind: "gradient",
    css: "linear-gradient(160deg, #0a0a0a 0%, #262626 55%, #404040 100%)",
  },
  {
    id: "mist",
    name: "Mist",
    kind: "gradient",
    css: "linear-gradient(135deg, #e2e8f0 0%, #f1f5f9 50%, #ffffff 100%)",
  },
  { id: "white", name: "White", kind: "color", css: "#ffffff" },
  {
    id: "dusk",
    name: "Dusk",
    kind: "gradient",
    css: "linear-gradient(to right top, #0d1117, #6e40c9, #f78166)",
  },
  {
    id: "merlot",
    name: "Merlot",
    kind: "gradient",
    css: "linear-gradient(160deg, #1c0a12 0%, #4c0519 55%, #be123c 100%)",
  },
  { id: "blush", name: "Blush", kind: "color", css: "#fecdd3" },
  { id: "red", name: "Red", kind: "color", css: "#dc2626" },
  {
    id: "ember",
    name: "Ember",
    kind: "gradient",
    css: "linear-gradient(160deg, #1c1917 0%, #9a3412 55%, #f97316 100%)",
  },
  { id: "orange", name: "Orange", kind: "color", css: "#ea580c" },
  { id: "amber", name: "Amber", kind: "color", css: "#f59e0b" },
  { id: "forest", name: "Forest", kind: "color", css: "#14532d" },
  { id: "green", name: "Green", kind: "color", css: "#16a34a" },
  {
    id: "synthwave",
    name: "Synthwave",
    kind: "gradient",
    css: "linear-gradient(180deg, #2a0845 0%, #6441a5 45%, #ff6ec7 80%, #ffd36e 100%)",
  },
  {
    id: "coral",
    name: "Coral",
    kind: "gradient",
    css: "linear-gradient(135deg, #f43f5e 0%, #fb7185 50%, #fdba74 100%)",
  },
  {
    id: "mesh-dune",
    name: "Dune",
    kind: "mesh",
    css: "radial-gradient(at 20% 80%, #d6a46b 0px, transparent 55%), radial-gradient(at 80% 20%, #f2d4b0 0px, transparent 50%), #f7ede0",
  },
  {
    id: "daybreak",
    name: "Daybreak",
    kind: "mesh",
    css: "radial-gradient(at 0% 0%, #ffd6a5 0px, transparent 55%), radial-gradient(at 100% 100%, #a5d8ff 0px, transparent 55%), #fdfcfb",
  },
  {
    id: "wildfire",
    name: "Wildfire",
    kind: "gradient",
    css: "linear-gradient(to right top, #7c2d12, #ea580c, #fb923c, #fde68a)",
  },
  {
    id: "honey",
    name: "Honey",
    kind: "gradient",
    css: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fef3c7 100%)",
  },
  {
    id: "lemon",
    name: "Lemon",
    kind: "gradient",
    css: "linear-gradient(135deg, #facc15 0%, #fde68a 50%, #fefce8 100%)",
  },
  {
    id: "sage",
    name: "Sage",
    kind: "gradient",
    css: "linear-gradient(135deg, #84a98c 0%, #b7c9a8 50%, #e9edc9 100%)",
  },
  {
    id: "evergreen",
    name: "Evergreen",
    kind: "gradient",
    css: "linear-gradient(160deg, #0d1117 0%, #033a16 55%, #2ea043 100%)",
  },
  {
    id: "emerald",
    name: "Emerald",
    kind: "gradient",
    css: "linear-gradient(135deg, #047857 0%, #10b981 50%, #6ee7b7 100%)",
  },
  {
    id: "jade",
    name: "Jade",
    kind: "gradient",
    css: "linear-gradient(160deg, #0b1410 0%, #1f4d3a 55%, #4d9375 100%)",
  },
  { id: "pine", name: "Pine", kind: "color", css: "#052e2b" },
  {
    id: "deep-sea",
    name: "Deep Sea",
    kind: "gradient",
    css: "linear-gradient(160deg, #020617 0%, #0c4a6e 55%, #0891b2 100%)",
  },
  { id: "teal", name: "Teal", kind: "color", css: "#0d9488" },
  {
    id: "mesh-lagoon",
    name: "Lagoon Mesh",
    kind: "mesh",
    css: "radial-gradient(at 10% 90%, #14b8a6 0px, transparent 55%), radial-gradient(at 90% 20%, #6366f1 0px, transparent 50%), radial-gradient(at 50% 50%, #0e7490 0px, transparent 60%), #042f2e",
  },
  {
    id: "lagoon",
    name: "Lagoon",
    kind: "gradient",
    css: "linear-gradient(135deg, #134e4a 0%, #0d9488 55%, #5eead4 100%)",
  },
  {
    id: "nordic",
    name: "Nordic",
    kind: "gradient",
    css: "linear-gradient(135deg, #2e3440 0%, #4c566a 45%, #88c0d0 100%)",
  },
  {
    id: "lime-soda",
    name: "Lime Soda",
    kind: "gradient",
    css: "linear-gradient(135deg, #a3e635 0%, #4ade80 50%, #2dd4bf 100%)",
  },
  {
    id: "aqua",
    name: "Aqua",
    kind: "gradient",
    css: "linear-gradient(135deg, #22d3ee 0%, #a5f3fc 55%, #ecfeff 100%)",
  },
  {
    id: "primer",
    name: "Primer",
    kind: "gradient",
    css: "linear-gradient(160deg, #0d1117 0%, #0c2d6b 55%, #1f6feb 100%)",
  },
  {
    id: "slate",
    name: "Slate",
    kind: "gradient",
    css: "linear-gradient(160deg, #0f172a 0%, #334155 60%, #64748b 100%)",
  },
  {
    id: "mesh-glacier",
    name: "Glacier",
    kind: "mesh",
    css: "radial-gradient(at 0% 0%, #1d4ed8 0px, transparent 50%), radial-gradient(at 100% 100%, #22d3ee 0px, transparent 50%), #0b1a3a",
  },
  {
    id: "azure",
    name: "Azure",
    kind: "gradient",
    css: "linear-gradient(to right top, #0369a1, #0ea5e9, #7dd3fc)",
  },
  { id: "blue", name: "Blue", kind: "color", css: "#2563eb" },
  {
    id: "ice",
    name: "Ice",
    kind: "gradient",
    css: "linear-gradient(135deg, #bae6fd 0%, #e0f2fe 55%, #f8fafc 100%)",
  },
  { id: "navy", name: "Navy", kind: "color", css: "#172554" },
  {
    id: "periwinkle",
    name: "Periwinkle",
    kind: "gradient",
    css: "linear-gradient(135deg, #818cf8 0%, #a5b4fc 50%, #c7d2fe 100%)",
  },
  {
    id: "mesh-nebula",
    name: "Nebula",
    kind: "mesh",
    css: "radial-gradient(at 20% 20%, #7c3aed 0px, transparent 50%), radial-gradient(at 80% 10%, #db2777 0px, transparent 50%), radial-gradient(at 70% 90%, #2563eb 0px, transparent 55%), #0b0820",
  },
  {
    id: "aurora",
    name: "Aurora",
    kind: "gradient",
    css: "linear-gradient(to right top, #064e3b, #059669, #22d3ee, #a78bfa)",
  },
  { id: "violet", name: "Violet", kind: "color", css: "#7c3aed" },
  { id: "fuchsia", name: "Fuchsia", kind: "color", css: "#c026d3" },
  {
    id: "ocean",
    name: "Ocean",
    kind: "gradient",
    css: "linear-gradient(135deg, #54aeff 0%, #8250df 100%)",
  },
  {
    id: "sunrise",
    name: "Sunrise",
    kind: "gradient",
    css: "linear-gradient(to right top, #ffd8b5, #ffd8eb, #e9d8fd)",
  },
  {
    id: "plum",
    name: "Plum",
    kind: "gradient",
    css: "linear-gradient(135deg, #3b2a4a 0%, #6b3f7a 50%, #c678dd 100%)",
  },
  {
    id: "mesh-orchid",
    name: "Orchid",
    kind: "mesh",
    css: "radial-gradient(at 15% 85%, #c026d3 0px, transparent 50%), radial-gradient(at 85% 15%, #f0abfc 0px, transparent 45%), radial-gradient(at 60% 60%, #6d28d9 0px, transparent 55%), #1a0526",
  },
  {
    id: "lavender",
    name: "Lavender",
    kind: "gradient",
    css: "linear-gradient(135deg, #a78bfa 0%, #c4b5fd 50%, #f5d0fe 100%)",
  },
  { id: "pink", name: "Pink", kind: "color", css: "#db2777" },
  {
    id: "violet-pop",
    name: "Violet Pop",
    kind: "gradient",
    css: "linear-gradient(135deg, #8250df 0%, #bf3989 100%)",
  },
  {
    id: "twilight",
    name: "Twilight",
    kind: "gradient",
    css: "linear-gradient(to right top, #1e1b4b, #4338ca, #c084fc, #f9a8d4)",
  },
  {
    id: "mesh-sorbet",
    name: "Sorbet Mesh",
    kind: "mesh",
    css: "radial-gradient(at 0% 50%, #f472b6 0px, transparent 55%), radial-gradient(at 100% 30%, #a78bfa 0px, transparent 50%), radial-gradient(at 60% 100%, #fbbf24 0px, transparent 50%), #fdf2f8",
  },
  {
    id: "peach",
    name: "Peach",
    kind: "gradient",
    css: "linear-gradient(135deg, #fdba74 0%, #fecaca 55%, #fce7f3 100%)",
  },
  {
    id: "rose",
    name: "Rose",
    kind: "gradient",
    css: "linear-gradient(135deg, #fda4af 0%, #fbcfe8 50%, #fdf2f8 100%)",
  },
];

// The background preset of each theme and mode, when the spec does not set a background
const THEME_BACKGROUNDS: Record<string, Partial<Record<Mode, string>>> = {
  ayu: { dark: "ember", light: "honey" },
  catppuccin: { dark: "twilight", light: "lavender" },
  dracula: { dark: "mesh-orchid", light: "rose" },
  github: { dark: "dusk", light: "sunrise" },
  material: { dark: "slate", light: "ice" },
  "night-owl": { dark: "deep-sea", light: "ice" },
  nord: { dark: "nordic" },
  "one-dark": { dark: "plum", light: "mist" },
  "rose-pine": { dark: "mesh-orchid", light: "peach" },
  solarized: { dark: "deep-sea", light: "mesh-dune" },
  "synthwave-84": { dark: "synthwave" },
  "tokyo-night": { dark: "twilight", light: "periwinkle" },
  vitesse: { dark: "jade", light: "sage" },
  vscode: { dark: "primer", light: "daybreak" },
};

/** The background preset of a theme in a mode, or undefined when the theme has none */
export function themeBackground(theme: Theme, mode: Mode): BackgroundPreset | undefined {
  const id = THEME_BACKGROUNDS[theme.id]?.[mode];
  return BACKGROUNDS.find((preset) => preset.id === id);
}
