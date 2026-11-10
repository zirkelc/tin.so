#!/usr/bin/env node
import { text } from "node:stream/consumers";
import { main } from "./main.ts";

process.exitCode = await main(process.argv.slice(2), {
  cwd: process.cwd(),
  env: process.env,
  platform: process.platform,
  // Colors only on a terminal, and never with NO_COLOR (see no-color.org)
  color: Boolean(process.stdout.isTTY && process.stderr.isTTY) && !process.env.NO_COLOR,
  stdinIsTTY: Boolean(process.stdin.isTTY),
  readStdin: () => text(process.stdin),
  stdout: (output) => process.stdout.write(output),
  stderr: (output) => process.stderr.write(output),
});
