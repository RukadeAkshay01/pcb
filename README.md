# ZiroEDA

**KiCad in the browser — same UI, same shortcuts, same files. Zero learning
curve, zero installs.**

ZiroEDA is a browser-native, open-source electronics design suite: a faithful,
web-native reimplementation of the [KiCad](https://www.kicad.org/) workflow that
looks and behaves exactly like KiCad and reads/writes KiCad's native file
formats directly. No migration, no retraining — the world's largest open-source
EDA community can just open a tab.

The core is free software (GPL, like KiCad itself). The plan is to charge only
for what a hosted service uniquely adds on top — cloud compute (simulation,
autorouting, batch DRC), real-time team collaboration, and AI assistance —
never for the editor itself. See **[PHILOSOPHY.md](./PHILOSOPHY.md)** for our
compatibility promise and how we relate to the KiCad project and community.

> ZiroEDA is an independent project. It is **not** affiliated with or endorsed by
> the KiCad project, and "KiCad" is a trademark of its respective owners.

## Goals

- **Familiar.** Look and behave like KiCad so existing users feel at home —
  same conventions, same hotkeys, same visual style.
- **Interoperable.** Use KiCad's native formats (`.kicad_sch`, `.kicad_sym`, …)
  as the source of truth, so existing projects open directly with no import step.
- **Web-native.** TypeScript + Canvas/WebGL in the browser. Heavy batch compute
  (simulation, 3D kernel ops, autorouting) is offloaded to a server when needed.
- **Expandable.** A shared core underpins each tool (schematic editor first, then
  the others), so capabilities compound rather than being rebuilt per tool.

## Why a reimplementation (not a port)

KiCad is C++ built on wxWidgets, a custom OpenGL/Cairo rendering layer, and
OpenCASCADE — none of which port cleanly to the browser. ZiroEDA is a
ground-up reimplementation in web-native technology that stays format-compatible
with KiCad rather than attempting to compile its source to WebAssembly.

## License

GPL-3.0-or-later. See [LICENSE](./LICENSE).

## Tech stack

| Concern                | Choice                                             |
| ---------------------- | -------------------------------------------------- |
| Core language          | TypeScript (Rust/WASM reserved for measured hot paths) |
| UI                     | React + Tailwind CSS                               |
| Docking panels         | Dockview                                           |
| 2D rendering           | Canvas2D → WebGL (PixiJS/regl) behind an interface |
| Geometry / boolean ops | custom geometry + clipper2-wasm                    |
| Spatial index          | RBush (R-tree)                                      |
| State / undo / actions | Zustand + a custom command bus                     |
| File access            | File System Access API + OPFS                      |
| Build / monorepo       | Vite + pnpm workspaces                             |
| Tests                  | Vitest (unit) + Playwright (e2e / visual diff)     |

## Repository layout

The tree mirrors KiCad's own source layout, directory for directory — see
**[STRUCTURE.md](./STRUCTURE.md)** for the full mapping.

```
ziroeda/
  kicad/         # app shell (Vite + React): launcher, editor frames, cloud  (KiCad: kicad/)
  eeschema/      # schematic engine: model, sch_io, connectivity/ERC, tools  (KiCad: eeschema/)
  pcbnew/        # board engine: BOARD/FOOTPRINT model, pcb_io, editing      (KiCad: pcbnew/)
  common/        # shared EDA classes: EDA_SHAPE, EDA_TEXT, units, font      (KiCad: common/)
  libs/
    kimath/      # math: vector2, eda_angle, trigo                           (KiCad: libs/kimath/)
    core/        # small shared utilities                                    (KiCad: libs/core/)
    sexpr/       # lossless S-expression parser/serializer                   (KiCad: libs/sexpr/)
  qa/            # unit tests (qa/unittests/<module>) + fixtures (qa/data)   (KiCad: qa/)
```

### `@ziroeda/kicad` — the app

A React + Canvas2D suite that renders real KiCad files faithfully: the
schematic editor, symbol editor, PCB editor (with 3D viewer), and footprint
editor, each wrapped in its KiCad window chrome — menu bar, toolbars, panels,
and a live status bar — with toolbar contents transcribed from KiCad's own
`toolbars_*.cpp`. Run it with:

```bash
pnpm -C kicad dev      # http://localhost:5173
pnpm -C kicad build    # typecheck + production build
```

### The engine packages

Two layers, both grounded in KiCad's own implementation:

- **Lossless S-expression layer** — the parser/serializer for KiCad-format files.
  "Lossless" is a hard requirement: it preserves every node (including fields
  ZiroEDA does not yet model) and the exact source text of numeric atoms, so
  saving a file never silently corrupts data the user cares about. Correctness is
  enforced by a round-trip test against a real KiCad schematic
  (`parse ∘ serialize ∘ parse` is identity over the AST).

- **Typed schematic model** — a typed view over that AST (symbols, pins, wires,
  labels, junctions, library symbols), mirroring KiCad's `SCH_*` / `LIB_SYMBOL`
  classes and the fields its `kicad_sexpr` parser reads. Coordinates are integer
  internal units (100 nm), exactly as KiCad stores them — not float millimetres —
  so geometry and equality stay exact. Every modelled item keeps its source AST
  node, so unmodified items still round-trip byte-for-byte.

```bash
pnpm install
pnpm -C qa test      # run all unit tests (parser round-trips, model, editing, ERC)
pnpm -r typecheck    # typecheck every package
```

## Roadmap (schematic capture first)

1. **Lossless file I/O** — S-expression parser/serializer. ✅
2. **Typed document model** — symbols, pins, wires, labels, junctions. ✅
3. **Read-only viewer** — render a real `.kicad_sch` faithfully on a canvas. ✅
4. **Selection + move + command bus** — click/box hit-testing, undo/redo. ✅
5. **Draw wire + delete** — wire tool with junction auto-creation; add/delete commands. ✅
6. **Place symbol** — placement from a bundled subset of KiCad's symbol libraries. ✅
7. **Save** — write the edited document back to `.kicad_sch`, preserving unmodified nodes. ✅

Connectivity (the net-building "connection graph"), ERC, and netlist export are
the natural next steps, then the other tools (pcbnew, gerbview, …).

