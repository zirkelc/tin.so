import { runTool, type Tool } from "./clipboard.ts";

export class BrowserError extends Error {}

// Characters that cmd.exe reads as operators. A caret before each one keeps it in the URL.
const CMD_OPERATORS = /[&|<>^()]/g;

function browserTool(url: string, platform: string): Tool {
  if (platform === "darwin") return { command: "open", args: [url], input: "none" };
  if (platform === "win32")
    return {
      command: "cmd",
      /**
       * The empty argument becomes "" on the command line. start reads it as the window title,
       * and then reads the URL as the target.
       */
      args: ["/c", "start", "", url.replace(CMD_OPERATORS, "^$&")],
      input: "none",
    };
  return { command: "xdg-open", args: [url], input: "none" };
}

/** Opens a URL in the default browser */
export async function openUrl(url: string, options: { platform: string }): Promise<void> {
  const tool = browserTool(url, options.platform);
  const run = await runTool(tool);
  if (run.status === "ok") return;
  if (run.status === "missing")
    throw new BrowserError(`Cannot open the browser: ${tool.command} is not installed.`);
  throw new BrowserError(`Cannot open the browser: ${run.message}`);
}
