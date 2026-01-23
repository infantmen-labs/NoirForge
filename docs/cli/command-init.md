---
title: init
slug: commands/init
---

`noirforge init` instantiates a template from this repository into a new working directory.

## Synopsis

```bash
noirforge init <template> [dest]
```

## Behavior

- If you run `noirforge init` with no arguments, it prints the available template names (directories under `templates/`).
- If you provide a template name, it copies `templates/<template>/` into the destination directory.

## Inputs

- `template` (required): one of the template directories in `templates/`.
- `dest` (optional): destination directory.
  - Default: `./<template>`

## Examples

List templates:

```bash
pnpm noirforge init
```

Create a workspace:

```bash
pnpm noirforge init sum_a_b /tmp/sum_a_b
```

## Common failures

- Destination exists:
  - `Destination already exists: ...`
- Unknown template:
  - The CLI prints the list of valid templates.
