---
tags: [skill-creator]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

I want an image that shows the code below with a hover card on `session`, like in VS Code, that shows its type. In the hover card, make `expiresAt` bold so people see it. The tin CLI is available.

```ts
const session = await getSession(request);
if (Date.now() > session.expiresAt) redirect("/login");
```

The type of session is:

```ts
type Session = {
  userId: string;
  expiresAt: number;
};
```
