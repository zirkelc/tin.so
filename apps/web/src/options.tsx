import {
  AUTO_ICON,
  getIcon,
  ICON_IDS,
  type LanguageInfo,
  LANGUAGES,
  NO_ICON,
  PLAIN_TEXT,
  resolveIcon,
} from "@tin.so/core";
import { IconSvg, type SelectOption } from "./select.tsx";

export const AUTO_LANGUAGE = "auto";

// The languages that most code images show, at the top of the list
const POPULAR_LANGUAGES = [
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "python",
  "go",
  "rust",
  "shellscript",
  "shellsession",
  "json",
  "yaml",
  "toml",
  "sql",
  "html",
  "css",
  "java",
  "csharp",
  "cpp",
  "c",
  "swift",
  "kotlin",
  "php",
  "ruby",
  "markdown",
  "docker",
  "diff",
];

const languageOption = (language: LanguageInfo, group: string): SelectOption<string> => ({
  value: language.id,
  label: language.name,
  group,
  keywords: language.aliases,
});

/** The languages by name: auto and plain text first, then the popular ones, then all others */
export const LANGUAGE_OPTIONS: Array<SelectOption<string>> = [
  { value: AUTO_LANGUAGE, label: "Auto" },
  { value: PLAIN_TEXT, label: "Plain Text" },
  ...POPULAR_LANGUAGES.map((id) =>
    languageOption(
      LANGUAGES.find((l) => l.id === id)!,
      "Popular",
    ),
  ),
  ...LANGUAGES.filter(({ id }) => id !== PLAIN_TEXT && !POPULAR_LANGUAGES.includes(id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((language) => languageOption(language, "All languages")),
];

const ICON_OPTIONS: Array<SelectOption<string>> = [
  { value: NO_ICON, label: "No icon", icon: <IconSvg icon={undefined} /> },
  ...ICON_IDS.map((id) => {
    const icon = getIcon(id)!;
    return { value: id, label: icon.title, icon: <IconSvg icon={icon} /> };
  }).sort((a, b) => a.label.localeCompare(b.label)),
];

/** The tab icons, first the icon of the language of the pane */
export function iconOptions(language: string): Array<SelectOption<string>> {
  return [
    {
      value: AUTO_ICON,
      label: "Language icon",
      icon: <IconSvg icon={resolveIcon(AUTO_ICON, language)} />,
    },
    ...ICON_OPTIONS,
  ];
}
