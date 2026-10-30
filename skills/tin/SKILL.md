---
name: tin
description: Make images of code (code screenshots) with the tin.so CLI, locally and without a browser. Use it whenever the user wants a picture of code to share or show, such as a code image, a code screenshot, a snippet image for X, LinkedIn, a blog post, docs or slides, a "ray.so" or "carbon" style image, or several files side by side in one image, even if they do not name a tool. It covers quick snapshots of piped code or files, and composed images with several windows or panes, popovers that point to a word (for example a type), line highlights, text colors and highlighter fills, tabs with file icons, 14 themes and social media sizes. Saves a PNG or SVG (or copies it to the clipboard) and returns a link that opens the image in the tin.so web editor.
---

# Code images with tin.so

The `tin` CLI renders images of code on the local machine. It needs no browser and no account. Every image comes with a link that opens the same image in the tin.so web editor, where the user can change it by hand.

Run it as `npx -y tin.so <files>` (Node 22.18 or later). If `tin` is already installed, `tin <files>` is the same. Below, `tin` means either form.

Rendering is the default command: `tin main.ts` is the same as `tin render main.ts`. The other commands are `link`, `themes`, `languages`, `fonts`, `schema`, `skill` and `help`. A file with the name of a command needs a path, such as `./themes`.

## Choose the path

There are two ways to make an image. Pick the simpler one that can show what the user wants, because it is faster and has fewer ways to fail.

**Quick snapshot:** the code goes in as plain text or as files, and command-line options set the look. Use it for one snippet, or for a few files side by side or in separate windows, with a theme, mode, padding, line numbers, tabs, an aspect ratio and similar options.

**Composed image:** you write a JSON spec. Use it when the image needs something that options cannot express: a popover that points to a word, highlighted lines, bold or colored parts of a line, several snippets that are not files, a window title that is not a file name, or different settings per window. Read [references/spec.md](references/spec.md) before you write the spec.

## Quick snapshot

Pipe one snippet to `tin`. Without input files, tin reads the code from stdin. `--title` is the file name in the title bar and also sets the language from its extension. Use `--language` for code without a file name.

```bash
# Code from the chat: a heredoc keeps quotes, $ and backslashes exactly as they are
tin --language sql -o query.png <<'EOF'
select * from plans where name = 'free';
EOF

# One short line
echo 'const answer = 42;' | tin --title answer.ts -o answer.png

# The code on the clipboard (macOS)
pbpaste | tin --title main.ts -o main.png

# The output of another command, here a file as it is in the last commit
git show HEAD:src/app.py | tin --title app.py -o app.png
```

Text on stdin is plain code, also JSON such as a `package.json`. Only a spec with the tin `"$schema"` is read as a spec (see [Composed image](#composed-image)). `--code 'x = 1'` gives a short snippet as text, without stdin.

Use a heredoc for code from the chat. `echo '...'` is fine for one line without single quotes. For several lines, a heredoc is safer than `echo` or `printf`, which handle `\n` and backslashes differently in each shell.

Give files directly to show them. Each file becomes a pane in one window, side by side. `--windows` puts each file in its own window, below each other, and `--direction row` puts the windows side by side.

```bash
tin main.ts plans.toml --tabs --no-title-bar -o plans.png
tin worker.ts main.ts --windows --theme midnight -o worker.png
```

Common options: `--theme <id>` (`tin themes` lists them), `--mode light`, `--line-numbers`, `--padding 32`, `--no-background` (transparent), `--aspect-ratio 16:9` (X and YouTube; `1.91:1` for LinkedIn and Open Graph, `1:1`, `4:5`, `9:16`), `--tabs`, `--no-title-bar`, `--no-frame` (code without a window), `--controls color` (red, yellow and green window dots). `tin --help` lists all options. An unknown or misspelled option is an error that names the closest option, so a typo does not go unnoticed.

## Composed image

Write the spec as JSON and pipe it to `tin`. Do not write the code to temporary files first: the code goes into the spec.

Always start the spec with `"$schema"`, set to the URL in the `$id` field of `tin schema` (`https://tin.so/schema/v1.json`). This field tells the CLI that the JSON on stdin is a spec. Without it, the CLI renders the JSON as code. If you cannot add the field, pass `--spec`.

```bash
tin -o plans.png <<'EOF'
{
  "$schema": "https://tin.so/schema/v1.json",
  "theme": "midnight",
  "windows": [
    {
      "tabs": true,
      "titleBar": false,
      "panes": [
        {
          "title": "main.ts",
          "code": "import plans from \"./plans.toml\";\n\nplans.free.price;",
          "highlight": [3],
          "annotations": [
            { "line": 1, "match": "plans", "code": "const plans: {\n  free: { price: 0 };\n}" }
          ]
        },
        { "title": "plans.toml", "code": "[free]\nprice = 0" }
      ]
    }
  ]
}
EOF
```

[references/spec.md](references/spec.md) has the fields, recipes for the common cases and the rules behind the usual errors. For a field it does not cover, run `tin schema`: it prints the full JSON Schema, and every field has a description, its default and its limits. Read only the part you need, because the schema is long.

The CLI checks the spec and names every problem with its path, for example `windows.0.panes.0.annotations.0.match: "plnas" (occurrence 1) is not in line 1`. Fix the spec and run it again.

## Defaults and choices

Do not ask the user about each setting. The defaults make a good image: theme `candy`, dark mode, the theme's background, padding 64, a window with a title bar, the theme's font, a PNG at 2x. Follow what the user asked for, and choose the rest yourself. For example, a post for X gets `--aspect-ratio 16:9`, and two related files get tabs side by side. Then tell the user what you chose, so that they can ask for changes.

Use the code exactly as the user gave it. Do not reformat it or add lines. For a long file, ask which part to show, or show the part that the user talks about: an image with more than about 40 lines is hard to read.

## Output

- `-o <path>` sets the file. Save to the current directory with a short name from the content (for example `./plans.png`), unless the user named a path. Without `-o`, the name comes from the title or the first file.
- A name that ends with `.svg` gives an SVG with the fonts inside it. `--scale 3` makes a larger PNG.
- `--copy` puts the PNG on the clipboard, for a paste into a chat or a post. Without `-o`, it writes no file.
- The image file contains the spec and an editor link, so the user can drop the file into the editor later and change it. The spec holds the full code, also code that a fixed size cuts off. Use `--no-metadata` when the code must not travel with the image.
- `tin link <files>` takes the same input and options as rendering and prints only the editor link, without an image. When the user wants to open the code in the editor, use `tin link <files> --open`: it opens the link in the default browser. `tin link --copy` puts the link on the clipboard. Both still print the link.
- `--json` prints `{ file, format, width, height, copied, link }` for further steps. With `tin link`, it prints `{ link, copied, opened }`.

## Report and stop

Tell the user:

1. Where the image is: the file path, or that it is on the clipboard.
2. The `Edit:` link from the output. It opens the image in the web editor.
3. The main settings you chose, and that they can ask for changes or change them in the editor.

Then stop. Do not open or check the image again unless the user asks. For a change, edit the options or the spec and render again.

## Troubleshooting

- **`npx` cannot download the package:** there is no network. If `tin` is installed globally, use it. Otherwise tell the user.
- **A character shows as an empty box:** the fonts have no glyphs for CJK characters and emoji. Replace the character, or tell the user.
- **The image is very wide:** long lines do not wrap. Shorten the lines, or put the panes below each other (`"split": "column"`).
- **`The image is … px wide, at most 8192 px`:** the code is too long or too wide for one image. Show less code.
- **No clipboard tool on Linux:** `--copy` needs `wl-copy` or `xclip`. Save a file with `-o` instead.
- **The image shows the JSON of the spec, not the windows:** the spec has no `"$schema"`. Add it, or pass `--spec`.
- **`No input`:** tin got no files and no text on stdin. Give files, pipe the code, or use a heredoc.
