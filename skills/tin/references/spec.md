# The tin.so spec

A spec is JSON that describes one image: the image settings, its windows, the panes of each window, and the code of each pane with its highlights, styles and popovers. Pipe it to `tin`, or give a file: `tin spec.json`.

Always put `"$schema"` first, with the URL from the `$id` field of `tin schema`. On stdin, this field is how the CLI knows that the JSON is a spec: JSON without it becomes an image of the JSON text. `--spec` reads the input as a spec also without the field. The URL also gives the version of the spec (`/schema/v1.json` is version 1), so `"v"` is not necessary. If you write both, they must agree.

This page has the fields that matter most, recipes, and the rules behind the usual errors. `tin schema` prints the full JSON Schema with a description, a default and the limits of every field. Use it for a field that is not here.

## Contents

- [Structure](#structure)
- [Fields](#fields)
- [Recipes](#recipes)
- [Rules that cause errors](#rules-that-cause-errors)

## Structure

```json
{
  "$schema": "https://tin.so/schema/v1.json",
  "theme": "candy",
  "windows": [
    {
      "panes": [{ "title": "main.ts", "code": "const a = 1;" }]
    }
  ]
}
```

Only `windows`, `panes` and `code` are required, but always add `"$schema"`. Leave out every field whose default fits: a short spec is easier to get right.

## Fields

**Image** (top level)

| Field             | Default       | What it does                                                                                                                                                    |
| ----------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme`           | `candy`       | a ray.so theme id; `tin themes` lists them. Partner themes such as `vercel`, `supabase`, `stripe`, `tailwind` and `openai` bring their own frame and background |
| `mode`            | `dark`        | `dark` or `light`                                                                                                                                               |
| `background`      | `true`        | `false` makes the background transparent                                                                                                                        |
| `padding`         | `64`          | px around the windows                                                                                                                                           |
| `font`            | theme font    | a code font id; `tin fonts` lists them                                                                                                                          |
| `lineNumbers`     | theme default | line numbers in all panes                                                                                                                                       |
| `direction`       | `column`      | windows below each other (`column`) or side by side (`row`)                                                                                                     |
| `gap`             | `24`          | px between the windows                                                                                                                                          |
| `aspectRatio`     | none          | `"16:9"`, `"1.91:1"`, `"1:1"`, `"4:5"`, `"9:16"` and so on: the image grows in one direction, and the windows stay in the center                                |
| `width`, `height` | fit           | the image size in px; the image cuts off what is outside                                                                                                        |

**Window** (each item of `windows`)

| Field             | Default        | What it does                                                   |
| ----------------- | -------------- | -------------------------------------------------------------- |
| `panes`           | required       | the panes, from 1 to 20                                        |
| `split`           | `row`          | panes side by side (`row`) or below each other (`column`)      |
| `titleBar`        | `true`         | the title bar with the three window dots and the title         |
| `tabs`            | `false`        | a tab with the language icon and the file name above each pane |
| `frame`           | `true`         | `false` puts the code directly on the background               |
| `controls`        | `gray`         | `color` gives red, yellow and green window dots                |
| `title`           | the pane title | the title in the title bar                                     |
| `width`, `height` | fit            | a fixed window size in px                                      |
| `x`, `y`          | none           | a fixed place in the image (see the rules)                     |

**Pane** (each item of `panes`)

| Field         | Default       | What it does                                                          |
| ------------- | ------------- | --------------------------------------------------------------------- |
| `code`        | required      | the code; `\n` between lines                                          |
| `title`       | none          | the file name; it also sets the language from its extension           |
| `language`    | `auto`        | a Shiki language id or alias, or `text`; `tin languages` lists them   |
| `highlight`   | `[]`          | lines to highlight, from 1: `[3]`, `[2, "5-7"]`                       |
| `marks`       | `[]`          | styles and colors on parts of a line (see below)                      |
| `annotations` | `[]`          | popovers below a word (see below)                                     |
| `icon`        | `auto`        | the tab icon: `auto`, `file`, `none` or an icon id                    |
| `lineNumbers` | image setting | line numbers for this pane only                                       |
| `size`        | fit           | the pane width in a row split, or its height in a column split, in px |

**Mark** (each item of `marks`): `line` and `match` say which text: the text `match` in line `line` (from 1). `occurrence` picks a later match in the same line (default 1). Then at least one of:

- `style`: `strong` (bold), `emphasis` (italic), `underline` or `strikethrough`
- `color`: the text color as a hex color, for example `"#f43f5e"`
- `background`: a fill behind the text, for example `"#fcd34d40"`. Two more hex digits give the alpha: `40` is about 25 %, a highlighter that keeps the text readable

Use several marks on the same text to combine them, for example one with `"style": "strong"` and one with `"color"`.

**Popover** (each item of `annotations`): it points to the text `match` in line `line`, like the hover card of an editor.

| Field                         | Default               | What it does                                                           |
| ----------------------------- | --------------------- | ---------------------------------------------------------------------- |
| `type`                        | `popover`             | the kind of annotation; `popover` is the only kind today               |
| `line`, `match`, `occurrence` | required, required, 1 | the word that the popover points to                                    |
| `code`                        | required              | the content, for example a type                                        |
| `language`                    | the pane language     | the language of the popover code                                       |
| `offsetX`, `offsetY`          | `0`                   | moves the popover from its place below the word, in px                 |
| `width`, `height`             | fit                   | a fixed popover size in px                                             |
| `marks`                       | `[]`                  | marks on the popover code; `line` counts the lines of the popover code |

## Recipes

**A type in a popover, as in an editor hover**

```json
{
  "windows": [
    {
      "panes": [
        {
          "title": "user.ts",
          "code": "const user = await getUser(id);\nuser.email;",
          "annotations": [
            {
              "line": 1,
              "match": "user",
              "code": "const user: {\n  id: string;\n  email: string;\n}"
            }
          ]
        }
      ]
    }
  ]
}
```

**Before and after, side by side**

```json
{
  "windows": [
    {
      "tabs": true,
      "titleBar": false,
      "panes": [
        {
          "title": "before.js",
          "code": "var x = 1;",
          "marks": [{ "line": 1, "match": "var", "style": "strikethrough", "color": "#f43f5e" }]
        },
        {
          "title": "after.js",
          "code": "const x = 1;",
          "marks": [{ "line": 1, "match": "const", "background": "#22c55e40" }]
        }
      ]
    }
  ]
}
```

**Two related files in separate windows**, for example a worker and the code that starts it. Use `"direction": "row"` to put them side by side.

```json
{
  "theme": "midnight",
  "windows": [
    { "panes": [{ "title": "main.ts", "code": "const worker = new Worker(\"./worker.ts\");" }] },
    { "panes": [{ "title": "worker.ts", "code": "self.onmessage = (event) => {};" }] }
  ]
}
```

**Draw attention to one line and one word**: highlight the line, and color the word.

```json
{
  "windows": [
    {
      "panes": [
        {
          "title": "config.ts",
          "code": "export default {\n  retries: 3,\n  timeout: 30_000,\n};",
          "highlight": [3],
          "marks": [{ "line": 3, "match": "30_000", "style": "strong", "color": "#fcd34d" }]
        }
      ]
    }
  ]
}
```

**An image for a post on X**: add `"aspectRatio": "16:9"` at the top level. Use `"1.91:1"` for LinkedIn and link previews, `"4:5"` for an Instagram post, and `"9:16"` for a story.

**Code without a window**: `"frame": false` on the window. The code sits directly on the background.

## Rules that cause errors

- **`line` counts the lines of `code` from 1**, in highlights, marks and popovers. It does not depend on the line numbers that the image shows.
- **`match` must be in its line exactly**, with the same case and spacing. For popovers and marks inside a popover, `line` counts the lines of the popover code. Check the line in the code before you write the mark.
- **A word that appears twice in a line:** set `occurrence` to 2 for the second one.
- **No `"$schema"` on stdin:** the CLI renders the JSON as code, and says so on stderr. Add the field, or pass `--spec`.
- **Keys that start with `x-` are ignored** in every object. Use them for your own notes or tool data, never for image settings.
- **Unknown fields are errors.** The names are case-sensitive: `lineNumbers`, `titleBar`, `aspectRatio`, `offsetX`. The style names are `strong` and `emphasis`, not `bold` and `italic`.
- **Colors are hex only:** `"#f43f5e"` or `"#f43f5e40"`, not `"red"`.
- **`aspectRatio` with both `width` and `height` is an error.** Use it alone, or with one of the two.
- **`language` must be a known id.** An unknown language is an error; use `"text"` for plain text, or leave `language` out and give a `title` with the right extension.
- **`x` and `y`** put a window at a fixed place, and that window no longer follows `direction`, `gap` and `padding`. Use them only when the user wants overlapping or freely placed windows, and then set them on every window, and set the image `width` and `height`.
- **Limits** can grow in later versions. A smaller limit comes only with a new version, so a spec keeps working. Today: at most 50 windows, 20 panes per window, 100,000 characters of code per pane or popover, and 8192 px per image side. A very long or wide snippet hits the size limit: show less code.
