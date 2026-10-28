import {
  AUTO_ICON,
  FILE_ICON,
  getIcon,
  ICON_IDS,
  LANGUAGE_IDS,
  NO_ICON,
  resolveIcon,
} from "@tin.so/core";
import { IconSvg, type SelectOption } from "./select.tsx";

export const AUTO_LANGUAGE = "auto";

export const LANGUAGE_OPTIONS: Array<SelectOption<string>> = [
  { value: AUTO_LANGUAGE, label: "auto", icon: <IconSvg icon={getIcon(FILE_ICON)} /> },
  ...LANGUAGE_IDS.map((language) => ({
    value: language,
    label: language,
    icon: <IconSvg icon={resolveIcon(AUTO_ICON, language)} />,
  })),
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
