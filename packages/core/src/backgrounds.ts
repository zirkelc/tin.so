import type { Mode, Theme } from "./themes/index.ts";

/** A background preset of the editor: a gradient, a color or a mesh of radial gradients */
export type BackgroundPreset = {
  id: string;
  name: string;
  kind: "gradient" | "color" | "mesh";
  /** The CSS background, as the background field of a spec takes it */
  css: string;
};

// The neutral solid colors, from dark to light
const NEUTRALS: Array<[id: string, name: string, css: string]> = [
  ["black", "Black", "#000000"],
  ["charcoal", "Charcoal", "#18181b"],
  ["graphite", "Graphite", "#3f3f46"],
  ["gray", "Gray", "#a1a1aa"],
  ["silver", "Silver", "#e4e4e7"],
  ["white", "White", "#ffffff"],
];

// The hues of the solid colors around the color wheel, each in a light, a vivid and a dark tone
const HUES: Array<[id: string, name: string, light: string, vivid: string, dark: string]> = [
  ["red", "Red", "#fecaca", "#dc2626", "#7f1d1d"],
  ["orange", "Orange", "#fed7aa", "#ea580c", "#7c2d12"],
  ["amber", "Amber", "#fde68a", "#d97706", "#78350f"],
  ["yellow", "Yellow", "#fef08a", "#eab308", "#713f12"],
  ["lime", "Lime", "#d9f99d", "#65a30d", "#365314"],
  ["green", "Green", "#bbf7d0", "#16a34a", "#14532d"],
  ["teal", "Teal", "#99f6e4", "#0d9488", "#134e4a"],
  ["cyan", "Cyan", "#a5f3fc", "#0891b2", "#164e63"],
  ["blue", "Blue", "#bfdbfe", "#2563eb", "#1e3a8a"],
  ["indigo", "Indigo", "#c7d2fe", "#4f46e5", "#312e81"],
  ["violet", "Violet", "#ddd6fe", "#7c3aed", "#4c1d95"],
  ["pink", "Pink", "#fbcfe8", "#db2777", "#831843"],
];

// The solid colors in the order of the editor palette: the neutrals, then each hue light, vivid and dark
const SOLID_COLORS: Array<BackgroundPreset> = [
  ...NEUTRALS.map(([id, name, css]) => ({ id, name, kind: "color" as const, css })),
  ...HUES.flatMap(([id, name, light, vivid, dark]) => [
    { id: `${id}-light`, name: `Light ${name.toLowerCase()}`, kind: "color" as const, css: light },
    { id, name, kind: "color" as const, css: vivid },
    { id: `${id}-dark`, name: `Dark ${name.toLowerCase()}`, kind: "color" as const, css: dark },
  ]),
];

// The gradients in the order of the editor, as the solid colors: the grays, then by hue around the color wheel, and light, vivid and dark within a hue
const GRADIENTS: Array<BackgroundPreset> = [
  {
    id: "pewter",
    name: "Pewter",
    kind: "gradient",
    css: "linear-gradient(135deg, #71717a 0%, #a1a1aa 50%, #e4e4e7 100%)",
  },
  {
    id: "carbon",
    name: "Carbon",
    kind: "gradient",
    css: "linear-gradient(160deg, #09090b 0%, #27272a 55%, #52525b 100%)",
  },
  {
    id: "strawberry",
    name: "Strawberry",
    kind: "gradient",
    css: "linear-gradient(135deg, #f87171 0%, #fca5a5 50%, #fee2e2 100%)",
  },
  {
    id: "coral",
    name: "Coral",
    kind: "gradient",
    css: "linear-gradient(135deg, #f43f5e 0%, #fb7185 50%, #fdba74 100%)",
  },
  {
    id: "merlot",
    name: "Merlot",
    kind: "gradient",
    css: "linear-gradient(160deg, #1c0a12 0%, #4c0519 55%, #be123c 100%)",
  },
  {
    id: "peach",
    name: "Peach",
    kind: "gradient",
    css: "linear-gradient(135deg, #fdba74 0%, #fecaca 55%, #fce7f3 100%)",
  },
  {
    id: "wildfire",
    name: "Wildfire",
    kind: "gradient",
    css: "linear-gradient(to right top, #7c2d12, #ea580c, #fb923c, #fde68a)",
  },
  {
    id: "ember",
    name: "Ember",
    kind: "gradient",
    css: "linear-gradient(160deg, #1c1917 0%, #9a3412 55%, #f97316 100%)",
  },
  {
    id: "honey",
    name: "Honey",
    kind: "gradient",
    css: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fef3c7 100%)",
  },
  {
    id: "bronze",
    name: "Bronze",
    kind: "gradient",
    css: "linear-gradient(160deg, #0c0a09 0%, #451a03 50%, #b45309 100%)",
  },
  {
    id: "lemon",
    name: "Lemon",
    kind: "gradient",
    css: "linear-gradient(135deg, #facc15 0%, #fde68a 50%, #fefce8 100%)",
  },
  {
    id: "sunflower",
    name: "Sunflower",
    kind: "gradient",
    css: "linear-gradient(135deg, #eab308 0%, #facc15 40%, #a3e635 100%)",
  },
  {
    id: "mustard",
    name: "Mustard",
    kind: "gradient",
    css: "linear-gradient(160deg, #12110a 0%, #4d4408 55%, #eab308 100%)",
  },
  {
    id: "pistachio",
    name: "Pistachio",
    kind: "gradient",
    css: "linear-gradient(135deg, #bef264 0%, #d9f99d 50%, #f7fee7 100%)",
  },
  {
    id: "lime-soda",
    name: "Lime Soda",
    kind: "gradient",
    css: "linear-gradient(135deg, #a3e635 0%, #4ade80 50%, #2dd4bf 100%)",
  },
  {
    id: "moss",
    name: "Moss",
    kind: "gradient",
    css: "linear-gradient(160deg, #0f1a05 0%, #365314 55%, #65a30d 100%)",
  },
  {
    id: "sage",
    name: "Sage",
    kind: "gradient",
    css: "linear-gradient(135deg, #84a98c 0%, #b7c9a8 50%, #e9edc9 100%)",
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
  {
    id: "mint",
    name: "Mint",
    kind: "gradient",
    css: "linear-gradient(135deg, #14b8a6 0%, #5eead4 50%, #ccfbf1 100%)",
  },
  {
    id: "lagoon",
    name: "Lagoon",
    kind: "gradient",
    css: "linear-gradient(135deg, #134e4a 0%, #0d9488 55%, #5eead4 100%)",
  },
  {
    id: "aurora",
    name: "Aurora",
    kind: "gradient",
    css: "linear-gradient(to right top, #064e3b, #059669, #22d3ee, #a78bfa)",
  },
  {
    id: "aqua",
    name: "Aqua",
    kind: "gradient",
    css: "linear-gradient(135deg, #22d3ee 0%, #a5f3fc 55%, #ecfeff 100%)",
  },
  {
    id: "turquoise",
    name: "Turquoise",
    kind: "gradient",
    css: "linear-gradient(135deg, #0e7490 0%, #06b6d4 50%, #67e8f9 100%)",
  },
  {
    id: "deep-sea",
    name: "Deep Sea",
    kind: "gradient",
    css: "linear-gradient(160deg, #020617 0%, #0c4a6e 55%, #0891b2 100%)",
  },
  {
    id: "ice",
    name: "Ice",
    kind: "gradient",
    css: "linear-gradient(135deg, #bae6fd 0%, #e0f2fe 55%, #f8fafc 100%)",
  },
  {
    id: "azure",
    name: "Azure",
    kind: "gradient",
    css: "linear-gradient(to right top, #0369a1, #0ea5e9, #7dd3fc)",
  },
  {
    id: "primer",
    name: "Primer",
    kind: "gradient",
    css: "linear-gradient(160deg, #0d1117 0%, #0c2d6b 55%, #1f6feb 100%)",
  },
  {
    id: "nordic",
    name: "Nordic",
    kind: "gradient",
    css: "linear-gradient(135deg, #2e3440 0%, #4c566a 45%, #88c0d0 100%)",
  },
  {
    id: "periwinkle",
    name: "Periwinkle",
    kind: "gradient",
    css: "linear-gradient(135deg, #818cf8 0%, #a5b4fc 50%, #c7d2fe 100%)",
  },
  {
    id: "ocean",
    name: "Ocean",
    kind: "gradient",
    css: "linear-gradient(135deg, #54aeff 0%, #8250df 100%)",
  },
  {
    id: "twilight",
    name: "Twilight",
    kind: "gradient",
    css: "linear-gradient(to right top, #1e1b4b, #4338ca, #c084fc, #f9a8d4)",
  },
  {
    id: "lavender",
    name: "Lavender",
    kind: "gradient",
    css: "linear-gradient(135deg, #a78bfa 0%, #c4b5fd 50%, #f5d0fe 100%)",
  },
  {
    id: "violet-pop",
    name: "Violet Pop",
    kind: "gradient",
    css: "linear-gradient(135deg, #8250df 0%, #bf3989 100%)",
  },
  {
    id: "copilot",
    name: "Copilot",
    kind: "gradient",
    css: "linear-gradient(135deg, #0d1117 0%, #2b1764 55%, #8957e5 100%)",
  },
  {
    id: "dracula",
    name: "Dracula",
    kind: "gradient",
    css: "linear-gradient(135deg, #282a36 0%, #44475a 45%, #bd93f9 100%)",
  },
  {
    id: "plum",
    name: "Plum",
    kind: "gradient",
    css: "linear-gradient(135deg, #3b2a4a 0%, #6b3f7a 50%, #c678dd 100%)",
  },
  {
    id: "flamingo",
    name: "Flamingo",
    kind: "gradient",
    css: "linear-gradient(135deg, #be185d 0%, #ec4899 50%, #f9a8d4 100%)",
  },
  {
    id: "dusk",
    name: "Dusk",
    kind: "gradient",
    css: "linear-gradient(to right top, #0d1117, #6e40c9, #f78166)",
  },
];

// The meshes in the same order as the gradients: soft color spots of radial gradients on a base color
const MESHES: Array<BackgroundPreset> = [
  {
    id: "mesh-magma",
    name: "Magma",
    kind: "mesh",
    css: "radial-gradient(at 15% 20%, #dc2626 0px, transparent 50%), radial-gradient(at 85% 85%, #f97316 0px, transparent 50%), radial-gradient(at 70% 10%, #9f1239 0px, transparent 45%), #1a0505",
  },
  {
    id: "mesh-apricot",
    name: "Apricot",
    kind: "mesh",
    css: "radial-gradient(at 10% 15%, #fdba74 0px, transparent 50%), radial-gradient(at 90% 80%, #fda4af 0px, transparent 50%), radial-gradient(at 80% 10%, #fde68a 0px, transparent 45%), #fff7ed",
  },
  {
    id: "mesh-citrus",
    name: "Citrus",
    kind: "mesh",
    css: "radial-gradient(at 15% 85%, #fde047 0px, transparent 50%), radial-gradient(at 85% 15%, #bef264 0px, transparent 50%), radial-gradient(at 80% 90%, #fdba74 0px, transparent 45%), #fefce8",
  },
  {
    id: "mesh-meadow",
    name: "Meadow",
    kind: "mesh",
    css: "radial-gradient(at 10% 20%, #86efac 0px, transparent 50%), radial-gradient(at 90% 85%, #a5f3fc 0px, transparent 50%), radial-gradient(at 85% 10%, #fef08a 0px, transparent 45%), #f0fdf4",
  },
  {
    id: "mesh-forest",
    name: "Forest",
    kind: "mesh",
    css: "radial-gradient(at 15% 85%, #059669 0px, transparent 50%), radial-gradient(at 85% 15%, #0d9488 0px, transparent 45%), radial-gradient(at 60% 50%, #14532d 0px, transparent 60%), #03140d",
  },
  {
    id: "mesh-tide",
    name: "Tide",
    kind: "mesh",
    css: "radial-gradient(at 10% 15%, #0891b2 0px, transparent 50%), radial-gradient(at 90% 85%, #0d9488 0px, transparent 50%), radial-gradient(at 80% 15%, #1e40af 0px, transparent 45%), #03141c",
  },
  {
    id: "mesh-glacier",
    name: "Glacier",
    kind: "mesh",
    css: "radial-gradient(at 15% 15%, #7dd3fc 0px, transparent 50%), radial-gradient(at 85% 85%, #c7d2fe 0px, transparent 50%), radial-gradient(at 85% 15%, #a5f3fc 0px, transparent 45%), #f0f9ff",
  },
  {
    id: "mesh-midnight",
    name: "Midnight",
    kind: "mesh",
    css: "radial-gradient(at 15% 85%, #1d4ed8 0px, transparent 50%), radial-gradient(at 85% 15%, #4f46e5 0px, transparent 50%), radial-gradient(at 75% 90%, #0ea5e9 0px, transparent 40%), #020617",
  },
  {
    id: "mesh-lilac",
    name: "Lilac",
    kind: "mesh",
    css: "radial-gradient(at 10% 85%, #c4b5fd 0px, transparent 50%), radial-gradient(at 90% 15%, #f0abfc 0px, transparent 50%), radial-gradient(at 85% 90%, #bfdbfe 0px, transparent 45%), #faf5ff",
  },
  {
    id: "mesh-orchid",
    name: "Orchid",
    kind: "mesh",
    css: "radial-gradient(at 15% 85%, #c026d3 0px, transparent 50%), radial-gradient(at 85% 15%, #f0abfc 0px, transparent 45%), radial-gradient(at 60% 60%, #6d28d9 0px, transparent 55%), #1a0526",
  },
  {
    id: "mesh-nebula",
    name: "Nebula",
    kind: "mesh",
    css: "radial-gradient(at 15% 20%, #7c3aed 0px, transparent 50%), radial-gradient(at 85% 85%, #db2777 0px, transparent 50%), radial-gradient(at 85% 10%, #2563eb 0px, transparent 40%), #0b0618",
  },
  {
    id: "mesh-petal",
    name: "Petal",
    kind: "mesh",
    css: "radial-gradient(at 15% 15%, #fda4af 0px, transparent 50%), radial-gradient(at 85% 85%, #fbcfe8 0px, transparent 50%), radial-gradient(at 85% 15%, #fed7aa 0px, transparent 45%), #fff1f2",
  },
];

/** The background presets: the gradients, the meshes, then the solid colors */
export const BACKGROUNDS: Array<BackgroundPreset> = [...GRADIENTS, ...MESHES, ...SOLID_COLORS];

// The background preset of each theme and mode, when the spec does not set a background
const THEME_BACKGROUNDS: Record<string, Partial<Record<Mode, string>>> = {
  ayu: { dark: "ember", light: "honey" },
  catppuccin: { dark: "lavender", light: "lavender" },
  dracula: { dark: "dracula", light: "flamingo" },
  github: { dark: "copilot", light: "strawberry" },
  "night-owl": { dark: "deep-sea", light: "ice" },
  nord: { dark: "nordic", light: "ice" },
  "one-dark": { dark: "plum", light: "ocean" },
  solarized: { dark: "deep-sea", light: "lemon" },
  "tokyo-night": { dark: "twilight", light: "periwinkle" },
  vitesse: { dark: "jade", light: "sage" },
  vscode: { dark: "primer", light: "azure" },
};

/** The background preset of a theme in a mode, or undefined when the theme has none */
export function themeBackground(theme: Theme, mode: Mode): BackgroundPreset | undefined {
  const id = THEME_BACKGROUNDS[theme.id]?.[mode];
  return BACKGROUNDS.find((preset) => preset.id === id);
}
