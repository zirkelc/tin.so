import type { Scene, WindowBox } from "../layout.ts";
import type { FrameColors, Mode } from "../themes/index.ts";

/** The size and the parts of the title bar of a window, which the layout needs */
export type TitleBarStyle = {
  /** Space above the row of the title */
  paddingTop: number;
  /** Height of the row with the controls and the title */
  rowHeight: number;
  /** Space below the row of the title */
  paddingBottom: number;
  /** More space below the row of the title when tabs follow */
  tabsGap: number;
  /** Space between the left and right edge of the window and the first and last part of the row */
  paddingX: number;
  /** Shows the three window controls at the left */
  controls: boolean;
  /** Space between the controls and a title at the left */
  titleGap: number;
  /** The title is at the center of the window, or at the left after the controls */
  align: "center" | "left";
  /** The font of the title: the font of the user interface, or the font of the code */
  font: "ui" | "code";
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  /** Shows the name of the language of the first pane at the right */
  language: boolean;
  languageSize: number;
};

/** Makes ids of gradients, filters, masks and clip paths that are unique in the image */
export type FrameContext = {
  scene: Scene;
  mode: Mode;
  /** An id for an element in this image, from a name that is unique in the frame */
  id: (name: string) => string;
};

/**
 * How a theme draws the image around the code: the background, the window and its title bar.
 * Every part draws SVG elements, which can include their own defs.
 */
export type Frame = {
  /** Corner radius of a window */
  radius: number;
  /** Space between the edge of a window and its panes, on all sides */
  inset: number;
  titleBar: TitleBarStyle;
  /** Colors that replace the colors of the theme, by mode */
  colors: Partial<Record<Mode, Partial<FrameColors>>>;
  /** An opaque color near the background, under popovers, which are opaque */
  base: (context: FrameContext) => string;
  /** The background of the whole image. Only when the image has a background. */
  background: (context: FrameContext) => string;
  /**
   * Below a window, after the background: shadows, grid lines and glows. Only when the image has
   * a background. A window without a frame shows these parts too, but not its body.
   */
  behind: (context: FrameContext, window: WindowBox) => string;
  /** The surface of a window with a frame, below the code */
  body: (context: FrameContext, window: WindowBox) => string;
  /** The title bar of a window with a frame: the controls, the title and the language */
  header: (context: FrameContext, window: WindowBox) => string;
  /** Above a window with a frame, after the code: borders and lines */
  border: (context: FrameContext, window: WindowBox) => string;
};

/** A theme frame changes only some parts of the default frame */
export type FrameOverrides = Partial<Omit<Frame, "titleBar">> & {
  titleBar?: Partial<TitleBarStyle>;
};
