import type { ArgDef, ArgsDef } from "citty";

export class UsageError extends Error {}

// Keeps the literal types of the args, also the options of an enum as a tuple
export function defineArgs<const ARGS extends ArgsDef>(args: ARGS): ARGS {
  return args;
}

/** The distance between two strings: the number of single character edits from one to the other */
function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost);
    }
    previous = current;
  }
  return previous[b.length]!;
}

/** The closest candidate, or undefined when no candidate is close enough to be a typo */
export function closest(value: string, candidates: Array<string>): string | undefined {
  const limit = Math.max(2, Math.floor(value.length / 3));
  let best: { candidate: string; distance: number } | undefined;
  for (const candidate of candidates) {
    const d = distance(value, candidate);
    if (d <= limit && (!best || d < best.distance)) best = { candidate, distance: d };
  }
  return best?.candidate;
}

export function didYouMean(value: string, candidates: Array<string>): string {
  const match = closest(value, candidates);
  return match ? `, did you mean ${match}?` : "";
}

/** True when the args ask for help. Values after "--" are not options. */
export function wantsHelp(args: Array<string>): boolean {
  const end = args.indexOf("--");
  return (end === -1 ? args : args.slice(0, end)).some((arg) => arg === "--help" || arg === "-h");
}

function aliases(def: ArgDef): Array<string> {
  if (def.type === "positional" || !("alias" in def) || def.alias === undefined) return [];
  return Array.isArray(def.alias) ? def.alias : [def.alias];
}

function takesValue(def: ArgDef): boolean {
  return def.type === "string" || def.type === "enum";
}

/** The long flags of the args, with "--no-" for each boolean that has a negative description */
export function longFlags(defs: ArgsDef): Array<string> {
  return Object.entries(defs).flatMap(([name, def]) => {
    if (def.type === "positional") return [];
    const negative = def.type === "boolean" && def.negativeDescription ? [`--no-${name}`] : [];
    return [`--${name}`, ...negative];
  });
}

/** The flags of the args: the long flags and each alias, such as -o */
function allFlags(defs: ArgsDef): Array<string> {
  const aliasFlags = Object.values(defs).flatMap((def) =>
    aliases(def).map((alias) => (alias.length === 1 ? `-${alias}` : `--${alias}`)),
  );
  return [...longFlags(defs), ...aliasFlags];
}

type Command = { name: string; args: ArgsDef };

/**
 * Checks each option against the args of the command. An unknown option, or an option without
 * its value, is an error. The error names the closest known option, or the other commands that
 * have the option.
 */
export function checkOptions(args: Array<string>, command: Command, others: Array<Command>) {
  const long = new Map<string, ArgDef>();
  const short = new Map<string, ArgDef>();
  for (const [name, def] of Object.entries(command.args)) {
    if (def.type === "positional") continue;
    long.set(name, def);
    for (const alias of aliases(def)) (alias.length === 1 ? short : long).set(alias, def);
  }
  const unknown = (flag: string) => {
    const owners = others
      .filter((other) => allFlags(other.args).includes(flag))
      .map((other) => other.name);
    const hint =
      owners.length > 0
        ? `: it is an option of ${owners.join(", ")}`
        : didYouMean(flag, longFlags(command.args));
    return new UsageError(
      `Unknown option ${flag} for ${command.name}${hint}\nRun tin ${command.name} --help for the options.`,
    );
  };
  const needValue = (flag: string, index: number) => {
    if (index + 1 >= args.length) throw new UsageError(`Option ${flag} needs a value`);
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--") return;
    if (arg === "-" || !arg.startsWith("-")) continue;
    if (arg.startsWith("--")) {
      const name = arg.slice(2).split("=")[0]!;
      const negated = name.startsWith("no-") ? long.get(name.slice(3)) : undefined;
      const def = long.get(name) ?? (negated?.type === "boolean" ? negated : undefined);
      if (!def) throw unknown(`--${name}`);
      if (takesValue(def) && !arg.includes("=")) {
        needValue(`--${name}`, i);
        i++;
      }
      continue;
    }
    // A group of short options such as -cl, where only the last one can take a value
    for (let j = 1; j < arg.length; j++) {
      const def = short.get(arg[j]!);
      if (!def) throw unknown(`-${arg[j]}`);
      if (!takesValue(def)) continue;
      if (j === arg.length - 1) {
        needValue(`-${arg[j]}`, i);
        i++;
      }
      break;
    }
  }
}

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

export function stripAnsi(text: string): string {
  return text.replace(ANSI, "");
}
