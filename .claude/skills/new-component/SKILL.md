---
name: new-component
description: Scaffold a new component under src/components/** with its Storybook story and test, following this repo's design system. Use when asked to create/add a new UI component.
---

This skill is a thin wrapper. The actual procedure is
`docs/ai/add-component.md` — read it now.

Delegate to the `ui-component-builder` sub-agent
(`.claude/agents/ui-component-builder.md`) for the implementation, passing
along: what the component renders, whether it's admin or public-facing (or
shared gallery), and any props/variants already known from the request.

Do not reimplement the playbook's steps inline here — if this skill and the
playbook ever disagree, the playbook wins and this file is out of date.
