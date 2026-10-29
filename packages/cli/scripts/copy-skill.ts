/**
 * Copies the agent skill into the package, so that `tin skill --print` can print it. The package
 * gets SKILL.md and the references, without the test cases of the skill.
 */
import { cp, mkdir, readdir } from "node:fs/promises";

const source = new URL("../../../skills/tin/", import.meta.url);
const target = new URL("../skill/", import.meta.url);

await mkdir(new URL("references/", target), { recursive: true });
await cp(new URL("SKILL.md", source), new URL("SKILL.md", target));
for (const file of await readdir(new URL("references/", source))) {
  await cp(new URL(`references/${file}`, source), new URL(`references/${file}`, target));
}
