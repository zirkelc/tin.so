---
tags: [skill-creator]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Make a 1200x800 image with these two files as windows that overlap like a stack of cards: client.ts in the back, and server.ts in front, offset down and to the right. The tin CLI is available.

client.ts:

```ts
const res = await fetch("/api/user");
const user = await res.json();
```

server.ts:

```ts
app.get("/api/user", (req, res) => {
  res.json({ id: 1, name: "Ada" });
});
```
