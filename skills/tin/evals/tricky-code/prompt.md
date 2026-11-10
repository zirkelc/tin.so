---
tags: [skill-creator]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Turn this snippet into an image for my blog post, please. The tin CLI is available.

```js
const pattern = /^\$\{(\w+)\}$/;
console.log('it\'s a "match":', pattern.test("${name}"), `\t${1 + 1}`);
```
