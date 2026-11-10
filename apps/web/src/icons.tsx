import type { ReactNode } from "react";

// Small line icons for the controls in the image, on a 16 x 16 grid
function Glyph(props: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

export const FrameIcon = () => (
  <Glyph>
    <rect x="2" y="2.5" width="12" height="11" rx="2.5" />
  </Glyph>
);

export const TitleBarIcon = () => (
  <Glyph>
    <rect x="2" y="2.5" width="12" height="11" rx="2.5" />
    <path d="M2 6h12" />
    <circle cx="4.3" cy="4.3" r="0.4" />
    <circle cx="6" cy="4.3" r="0.4" />
  </Glyph>
);

export const TabsIcon = () => (
  <Glyph>
    <path d="M2 13.5v-9a2 2 0 0 1 2-2h3l1.5 2.5H12a2 2 0 0 1 2 2v6.5z" />
  </Glyph>
);

export const SplitRowIcon = () => (
  <Glyph>
    <rect x="2" y="2.5" width="12" height="11" rx="2.5" />
    <path d="M8 2.5v11" />
  </Glyph>
);

export const SplitColumnIcon = () => (
  <Glyph>
    <rect x="2" y="2.5" width="12" height="11" rx="2.5" />
    <path d="M2 8h12" />
  </Glyph>
);

export const LineNumbersIcon = () => (
  <Glyph>
    <path d="M3 4h1.5v4M3 8h3M3 11.5h2.5L3 14h3M9 5h5M9 10h5" />
  </Glyph>
);

export const PlusIcon = () => (
  <Glyph>
    <path d="M8 3v10M3 8h10" />
  </Glyph>
);

export const CloseIcon = () => (
  <Glyph>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Glyph>
);

export const FormatIcon = () => (
  <Glyph>
    <path d="M5.5 2.5c-1.5 0-2 .7-2 2v1.5c0 1-.5 2-1.5 2 1 0 1.5 1 1.5 2v1.5c0 1.3.5 2 2 2M10.5 2.5c1.5 0 2 .7 2 2v1.5c0 1 .5 2 1.5 2-1 0-1.5 1-1.5 2v1.5c0 1.3-.5 2-2 2" />
  </Glyph>
);

export const CenterHorizontalIcon = () => (
  <Glyph>
    <path d="M8 1.5v13" />
    <rect x="3.5" y="4.5" width="9" height="7" rx="1.5" />
  </Glyph>
);

export const CenterVerticalIcon = () => (
  <Glyph>
    <path d="M1.5 8h13" />
    <rect x="4.5" y="3.5" width="7" height="9" rx="1.5" />
  </Glyph>
);

export const ControlsIcon = () => (
  <Glyph>
    <circle cx="3.5" cy="8" r="1.6" />
    <circle cx="8" cy="8" r="1.6" />
    <circle cx="12.5" cy="8" r="1.6" />
  </Glyph>
);

export const QuestionIcon = () => (
  <Glyph>
    <path d="M6 6a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2v.5" />
    <circle cx="8" cy="12" r="0.5" />
  </Glyph>
);

export const LinkIcon = () => (
  <Glyph>
    <path d="M6.5 9.5l3-3M7 4.5l1-1a3 3 0 0 1 4.5 4.5l-1 1M9 11.5l-1 1a3 3 0 0 1-4.5-4.5l1-1" />
  </Glyph>
);

export const ChevronIcon = () => (
  <Glyph>
    <path d="M4.5 6.5l3.5 3.5 3.5-3.5" />
  </Glyph>
);

export const MinusIcon = () => (
  <Glyph>
    <path d="M3 8h10" />
  </Glyph>
);

export const TrashIcon = () => (
  <Glyph>
    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5" />
  </Glyph>
);

export const BackIcon = () => (
  <Glyph>
    <path d="M10 3.5L5.5 8l4.5 4.5" />
  </Glyph>
);

export const BringToFrontIcon = () => (
  <Glyph>
    <rect x="2" y="2" width="7" height="7" rx="1.5" strokeDasharray="2 1.6" />
    <rect x="6" y="6" width="8" height="8" rx="1.5" fill="currentColor" fillOpacity="0.35" />
  </Glyph>
);

export const SendToBackIcon = () => (
  <Glyph>
    <rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor" fillOpacity="0.35" />
    <rect x="7" y="7" width="7" height="7" rx="1.5" strokeDasharray="2 1.6" />
  </Glyph>
);

export const AlignLeftIcon = () => (
  <Glyph>
    <path d="M2.5 1.5v13" />
    <rect x="5" y="3.5" width="8" height="3" rx="1" />
    <rect x="5" y="9.5" width="5" height="3" rx="1" />
  </Glyph>
);

export const AlignCenterIcon = () => (
  <Glyph>
    <path d="M8 1.5v13" />
    <rect x="3" y="3.5" width="10" height="3" rx="1" />
    <rect x="5" y="9.5" width="6" height="3" rx="1" />
  </Glyph>
);

export const AlignRightIcon = () => (
  <Glyph>
    <path d="M13.5 1.5v13" />
    <rect x="3" y="3.5" width="8" height="3" rx="1" />
    <rect x="6" y="9.5" width="5" height="3" rx="1" />
  </Glyph>
);

export const AlignTopIcon = () => (
  <Glyph>
    <path d="M1.5 2.5h13" />
    <rect x="3.5" y="5" width="3" height="8" rx="1" />
    <rect x="9.5" y="5" width="3" height="5" rx="1" />
  </Glyph>
);

export const AlignMiddleIcon = () => (
  <Glyph>
    <path d="M1.5 8h13" />
    <rect x="3.5" y="3" width="3" height="10" rx="1" />
    <rect x="9.5" y="5" width="3" height="6" rx="1" />
  </Glyph>
);

export const AlignBottomIcon = () => (
  <Glyph>
    <path d="M1.5 13.5h13" />
    <rect x="3.5" y="3" width="3" height="8" rx="1" />
    <rect x="9.5" y="6" width="3" height="5" rx="1" />
  </Glyph>
);

export const DistributeHorizontalIcon = () => (
  <Glyph>
    <path d="M1.5 2v12M14.5 2v12" />
    <rect x="6" y="4" width="4" height="8" rx="1" />
  </Glyph>
);

export const DistributeVerticalIcon = () => (
  <Glyph>
    <path d="M2 1.5h12M2 14.5h12" />
    <rect x="4" y="6" width="8" height="4" rx="1" />
  </Glyph>
);

export const CopyIcon = () => (
  <Glyph>
    <rect x="5" y="5" width="9" height="9" rx="1.5" />
    <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
  </Glyph>
);

// The GitHub mark from Simple Icons (CC0)
export const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

// The X mark from Simple Icons (CC0)
export const XIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
    <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
  </svg>
);
