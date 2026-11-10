import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export class ClipboardError extends Error {}

export type Tool = {
  command: string;
  args: Array<string>;
  // How the tool gets the data: on stdin, from a temporary file, or not at all
  input: "stdin" | "file" | "none";
  env?: Record<string, string>;
  /**
   * Tools that stay in the background to serve the clipboard (wl-copy, xclip) keep their output
   * open. The CLI must not wait for that output, so these tools get no output pipes.
   */
  background?: boolean;
};

export type Run = { status: "ok" } | { status: "missing" } | { status: "failed"; message: string };

const FILE_PLACEHOLDER = "{file}";

const MACOS: Tool = {
  command: "osascript",
  args: [
    "-e",
    "on run argv",
    "-e",
    "set the clipboard to (read (POSIX file (item 1 of argv)) as «class PNGf»)",
    "-e",
    "end run",
    FILE_PLACEHOLDER,
  ],
  input: "file",
};

const WINDOWS: Tool = {
  command: "powershell.exe",
  args: [
    "-NoProfile",
    "-NonInteractive",
    "-STA",
    "-Command",
    "Add-Type -AssemblyName System.Windows.Forms, System.Drawing; " +
      "$image = [System.Drawing.Image]::FromFile($env:TIN_CLIPBOARD_FILE); " +
      "[System.Windows.Forms.Clipboard]::SetImage($image); $image.Dispose()",
  ],
  input: "file",
  env: { TIN_CLIPBOARD_FILE: FILE_PLACEHOLDER },
};

const WL_COPY: Tool = {
  command: "wl-copy",
  args: ["--type", "image/png"],
  input: "stdin",
  background: true,
};

const XCLIP: Tool = {
  command: "xclip",
  args: ["-selection", "clipboard", "-target", "image/png", "-in"],
  input: "stdin",
  background: true,
};

/** The clipboard tools to try, in sequence. The first tool that is installed copies the image. */
function imageTools(platform: string, env: Record<string, string | undefined>): Array<Tool> {
  if (platform === "darwin") return [MACOS];
  if (platform === "win32") return [WINDOWS];
  // On Wayland, xclip reaches only X11 programs, so wl-copy goes first
  return env.WAYLAND_DISPLAY ? [WL_COPY, XCLIP] : [XCLIP, WL_COPY];
}

const PBCOPY: Tool = { command: "pbcopy", args: [], input: "stdin" };

const CLIP: Tool = { command: "clip", args: [], input: "stdin" };

/** PowerShell gets the text from an environment variable, so that no shell parses it */
function powershellText(text: string): Tool {
  return {
    command: "powershell.exe",
    args: [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Set-Clipboard -Value $env:TIN_CLIPBOARD_TEXT",
    ],
    input: "none",
    env: { TIN_CLIPBOARD_TEXT: text },
  };
}

/** The clipboard tools for text, in sequence. The first tool that is installed copies the text. */
function textTools(
  text: string,
  platform: string,
  env: Record<string, string | undefined>,
): Array<Tool> {
  if (platform === "darwin") return [PBCOPY];
  if (platform === "win32") return [CLIP, powershellText(text)];
  const wlCopy: Tool = { ...WL_COPY, args: ["--type", "text/plain"] };
  const xclip: Tool = { ...XCLIP, args: ["-selection", "clipboard", "-in"] };
  return env.WAYLAND_DISPLAY ? [wlCopy, xclip] : [xclip, wlCopy];
}

function missingMessage(platform: string, macTool: string, windowsTool: string): string {
  if (platform === "darwin") return `Cannot copy to the clipboard: ${macTool} is not installed.`;
  if (platform === "win32") return `Cannot copy to the clipboard: ${windowsTool} is not installed.`;
  return "Cannot copy to the clipboard: install wl-clipboard (Wayland) or xclip (X11).";
}

/** Starts a tool and waits until it stops. The data goes to its stdin when the tool reads stdin. */
export function runTool(tool: Tool, data?: Uint8Array, file?: string): Promise<Run> {
  const fill = (value: string) => (value === FILE_PLACEHOLDER ? (file ?? value) : value);
  return new Promise((resolve) => {
    const child = spawn(tool.command, tool.args.map(fill), {
      stdio: [
        tool.input === "stdin" ? "pipe" : "ignore",
        "ignore",
        tool.background ? "ignore" : "pipe",
      ],
      ...(tool.env && {
        env: {
          ...process.env,
          ...Object.fromEntries(Object.entries(tool.env).map(([key, value]) => [key, fill(value)])),
        },
      }),
    });
    let stderr = "";
    child.stderr?.on("data", (chunk) => (stderr += String(chunk)));
    child.on("error", (error: NodeJS.ErrnoException) =>
      resolve(
        error.code === "ENOENT"
          ? { status: "missing" }
          : { status: "failed", message: `${tool.command}: ${error.message}` },
      ),
    );
    // The exit event does not wait for the output of a tool that stays in the background
    child.on("exit", (code, signal) =>
      resolve(
        code === 0
          ? { status: "ok" }
          : {
              status: "failed",
              message: `${tool.command} failed (${signal ?? `exit code ${code}`})${stderr.trim() ? `: ${stderr.trim()}` : ""}`,
            },
      ),
    );
    if (child.stdin) {
      // A tool that stops before it reads the image closes stdin. The exit event reports that.
      child.stdin.on("error", () => {});
      child.stdin.end(data);
    }
  });
}

/** Copies a PNG image to the system clipboard */
export async function copyImage(
  png: Uint8Array,
  options: { platform: string; env: Record<string, string | undefined> },
): Promise<void> {
  const tools = imageTools(options.platform, options.env);
  let directory: string | undefined;
  try {
    for (const tool of tools) {
      let file: string | undefined;
      if (tool.input === "file") {
        directory ??= await mkdtemp(join(tmpdir(), "tin-"));
        file = join(directory, "image.png");
        await writeFile(file, png);
      }
      const run = await runTool(tool, png, file);
      if (run.status === "ok") return;
      if (run.status === "failed") throw new ClipboardError(run.message);
    }
    throw new ClipboardError(missingMessage(options.platform, "osascript", "PowerShell"));
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}

/** Copies text to the system clipboard */
export async function copyText(
  text: string,
  options: { platform: string; env: Record<string, string | undefined> },
): Promise<void> {
  const data = new TextEncoder().encode(text);
  for (const tool of textTools(text, options.platform, options.env)) {
    const run = await runTool(tool, data);
    if (run.status === "ok") return;
    if (run.status === "failed") throw new ClipboardError(run.message);
  }
  throw new ClipboardError(missingMessage(options.platform, "pbcopy", "clip or PowerShell"));
}
