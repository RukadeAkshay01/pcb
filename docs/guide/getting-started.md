# Getting Started

Welcome to the **Ziro Designer** documentation. This is the home for both
user-facing guides and internal design notes, kept in the repo alongside the
code so they never drift out of date.

## What is Ziro Designer?

Ziro Designer is a browser-native, open-source electronics design suite from
ZiroEDA. It brings a KiCad-class workflow — schematic capture, PCB layout,
Gerber viewing, and engineering calculators — to the web.

## How these docs are organized

- **Guide** — task-oriented pages for people *using* the app.
- **Design Notes** — architecture and design decisions for people *building*
  the app.

## Running the docs locally

The documentation is a [VitePress](https://vitepress.dev) site living in the
`docs/` folder of the repo.

```bash
# from the repo root
pnpm install
pnpm -C docs dev      # start the docs dev server (hot reload)
pnpm -C docs build    # build the static site into docs/.vitepress/dist
pnpm -C docs preview  # preview the production build locally
```

## Adding a page

1. Drop a new `.md` file into a section folder (e.g. `docs/guide/`).
2. Add a link to it in the `nav`/`sidebar` inside
   `docs/.vitepress/config.mts`.

That's it — Markdown in, documentation out.
