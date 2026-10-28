---
tags: [skill-creator]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

We raised the timeout in our config. Make a code image of this for the release notes: highlight the line that changed and make the new value bold and green so people notice it. The tin CLI is available.

```ts
export const config = {
  retries: 3,
  timeout: 60_000,
  region: "eu-central-1",
};
```
