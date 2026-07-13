# Repository structure

The source tree deliberately mirrors [KiCad's own repository
layout](https://gitlab.com/kicad/code/kicad), directory for directory, so that
anyone who knows the KiCad codebase can navigate ZiroEDA instantly — and so
every ported file has an obvious home that matches its C++ origin.

| Directory        | KiCad equivalent   | Contents                                                                 |
| ---------------- | ------------------ | ------------------------------------------------------------------------ |
| `kicad/`         | `kicad/`           | The app shell (Vite + React): launcher/home, menus/toolbars, editor frames, cloud sync, served libraries under `kicad/public/` |
| `eeschema/`      | `eeschema/`        | Schematic engine: document model, `sch_io/kicad_sexpr` reader/writer, `connectivity/` (nets, ERC), `tools/` (interactive editing) |
| `pcbnew/`        | `pcbnew/`          | Board engine: `BOARD`/`FOOTPRINT`/`PAD`/`ZONE` object model, `pcb_io/kicad_sexpr` parser+formatter, board/footprint editing |
| `common/`        | `common/`          | Shared EDA classes: `EDA_SHAPE`, `EDA_TEXT`, units, placement `TRANSFORM`, stroke `font/` |
| `libs/kimath/`   | `libs/kimath/`     | Math: `math/vector2`, `geometry/eda_angle`, `trigo`                       |
| `libs/core/`     | `libs/core/`       | Small shared utilities (`mirror`, flip directions)                        |
| `libs/sexpr/`    | `libs/sexpr/`      | Lossless S-expression tokenizer/parser/serializer                         |
| `qa/`            | `qa/`              | Unit tests (`qa/unittests/<module>/`) and test fixtures (`qa/data/`)      |

Each directory is a pnpm workspace package (`@ziroeda/<dir>`); `qa/` holds the
Vitest suites for all of them, arranged by the module under test just like
KiCad's `qa/unittests/`.

## Mapping notes

- **Editor UI frames currently live in `kicad/src/editors/`** (schematic, pcb,
  symbol, footprint). In KiCad these frames live inside `eeschema/` and
  `pcbnew/` themselves; migrating the React frames into those packages is the
  planned next step once the shared-widget layer is extracted.
- **`kicad/src/editors/pcb/pcb3d.ts` + `model3d.ts` + `component3d.ts`** map to
  KiCad's top-level `3d-viewer/`; they stay in the app for now because they
  share geometry/theme modules with the 2D board painter.
- **`kicad/public/templates/`** corresponds to KiCad's `template/` (project
  templates); symbol/footprint/3D-model libraries under `kicad/public/` come
  from KiCad's separate library repositories and are served as static assets.
- **`include/` has no equivalent** — TypeScript has no header files; the public
  surface of each package is its `src/index.ts`.
- Future tools keep the same rule: gerber viewer → `gerbview/`, footprint
  assignment → `cvpcb/`, drawing-sheet editor → `pagelayout_editor/`,
  calculators → `pcb_calculator/`.
