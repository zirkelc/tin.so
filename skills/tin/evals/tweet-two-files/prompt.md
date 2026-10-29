---
tags: [skill-creator]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

I want to tweet about this refactor. Make an image that shows both files side by side.

before.js:

```js
var total = 0;
for (var i = 0; i < items.length; i++) total += items[i].price;
```

after.js:

```js
const total = items.reduce((sum, item) => sum + item.price, 0);
```
