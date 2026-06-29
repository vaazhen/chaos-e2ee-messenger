---
name: safe-refactor
description: Perform safe minimal refactors in an existing codebase without changing behavior or rewriting unrelated files.
---

You are performing a safe refactor.

Rules:
- inspect before editing
- make the smallest useful change
- preserve public API behavior
- avoid formatting entire files
- avoid renaming public classes or methods unless requested
- do not mix refactor, feature work, and bug fixes
- explain changed files briefly
- run or suggest the smallest relevant test command
- stop if the change requires risky migration or unclear product decisions
