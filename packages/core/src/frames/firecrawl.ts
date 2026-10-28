import type { WindowBox } from "../layout.ts";
import { attrs, escapeXml, round, textAttrs } from "./draw.ts";
import type { FrameContext, FrameOverrides } from "./types.ts";

const COLORS = {
  dark: { background: "#000000", gridline: "#444444" },
  light: { background: "#ffffff", gridline: "#ededed" },
};

const FLAME_COLOR = "#f97316";

// An ASCII-art flame at the bottom of the window, below the code
const FLAME = `                                   .. ..-
                                   :          .
                              ..        .   ..-
                            .        .._  ..-...:.              ..       .
                  .      .  .-.    ...     .-.-.._.-   ..        .-..     .      .
               ...._. . .-.....-:....      ..-::.::._=:.  ....       ...  .-      ....
             .....-._.._.:.....-.+:....-..    .....-:+++++++=:..-.---..    ...:.-..      ....
           .._.-._.-.:_.:-.  ...+..+:._-....:-._:+++++===+:_:+:....      -..+++++.:..  .-._-..      .
        .........--::+:._-:-.._..-.+:.-_::++_.:+:+========+=+:+:--..  .   _-_.:+===+-. ._..+:.-........  .
       ....-..---_-++====+:_:=:..+:.:+=+-..._++++======X==========++::.:+-..  .:+====X==+=++++++-.-......
     .......-:+:_:+:++=XX=X======++++++=X===::+++:++==XXXXXX===+==++===+=+=========XXX===++++=+:_---...-..-.
    ....._.:++======+===XXXXXXXX=+=++============XXXXXXXXXX============X======XXXXXXX======X==++:._---_`.split(
  "\n",
);

// A star at each corner of the grid: a plus with concave arms, 22 by 21 with its center at 11, 10.5
const STAR =
  "M10.5 4C10.5 7.31371 7.81371 10 4.5 10H0.5V11H4.5C7.81371 11 10.5 13.6863 10.5 17V21H11.5V17C11.5 13.6863 14.1863 11 17.5 11H21.5V10H17.5C14.1863 10 11.5 7.31371 11.5 4V0H10.5V4Z";

/**
 * The flame fills the width of the window with a font size of 1.3% of it, one line per font size.
 * Each line is centered on its own, and its bottom line touches the bottom of the window. The
 * flame fades from 10% opacity at the top to 90% at the bottom.
 */
function flame({ scene }: FrameContext, window: WindowBox): string {
  const size = window.width * 0.013;
  const advance = (scene.text.cellWidth / scene.text.fontSize) * size;
  const top = window.y + window.height - FLAME.length * size;
  const style = textAttrs(scene.font, {}, size);
  const out: Array<string> = [];
  FLAME.forEach((row, index) => {
    const left = window.x + (window.width - row.length * advance) / 2;
    const xs: Array<number> = [];
    let content = "";
    for (let column = 0; column < row.length; column++) {
      if (row[column] === " ") continue;
      xs.push(round(left + column * advance));
      content += row[column];
    }
    const opacity = 0.1 + (0.8 * (index + 0.5)) / FLAME.length;
    out.push(
      `<text ${attrs({ x: xs.join(" "), y: top + (index + 0.8) * size, fill: FLAME_COLOR, "fill-opacity": opacity, ...style })}>${escapeXml(content)}</text>`,
    );
  });
  return out.join("");
}

/**
 * The frame of Firecrawl in ray.so: a solid background, and a window without a surface. Grid lines
 * go through the whole image along the edges of the window, with a star at each corner, and an
 * orange ASCII-art flame rises from the bottom of the window.
 */
export const frame: FrameOverrides = {
  radius: 0,
  colors: {
    dark: {
      background: "transparent",
      highlightBorder: "transparent",
      shadowBorder: "transparent",
      divider: COLORS.dark.gridline,
    },
    light: {
      background: "transparent",
      highlightBorder: "transparent",
      shadowBorder: "transparent",
      divider: COLORS.light.gridline,
    },
  },
  base: ({ mode }) => COLORS[mode].background,
  background: ({ scene, mode }) =>
    `<rect width="${scene.width}" height="${scene.height}" fill="${COLORS[mode].background}"/>`,
  behind: (context, window) => {
    const { scene, mode } = context;
    const color = COLORS[mode].gridline;
    const left = window.x;
    const right = window.x + window.width;
    const top = window.y;
    const bottom = window.y + window.height;
    const out: Array<string> = [flame(context, window)];
    const path = [
      `M0 ${round(top)}H${scene.width}`,
      `M0 ${round(bottom)}H${scene.width}`,
      `M${round(left)} 0V${scene.height}`,
      `M${round(right)} 0V${scene.height}`,
    ].join("");
    out.push(`<path ${attrs({ d: path, stroke: color, fill: "none" })}/>`);
    for (const [x, y] of [
      [left, top],
      [right, top],
      [left, bottom],
      [right, bottom],
    ] as const) {
      out.push(
        `<path ${attrs({ d: STAR, fill: color, transform: `translate(${round(x - 11)} ${round(y - 10.5)})` })}/>`,
      );
    }
    return out.join("");
  },
  body: () => "",
  border: () => "",
};
