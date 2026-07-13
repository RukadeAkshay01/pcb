/**
 * Writer: typed `Board` model -> S-expression AST -> `.kicad_pcb` text.
 *
 * The board counterpart to write-footprint.ts and KiCad's
 * `PCB_IO_KICAD_SEXPR::format( const BOARD* )`
 * (pcbnew/pcb_io/kicad_sexpr/pcb_io_kicad_sexpr.cpp). Lossless by the same
 * patch-in-place strategy: the top-level `(kicad_pcb …)` node is rebuilt by
 * walking the *source* children in order, and for each child the model owns
 * (footprints, tracks/arcs, vias, zones, gr_* graphics, gr_text) the item's
 * `source` node — which board edits PATCH in place — is emitted. Everything the
 * typed model does not represent (general, paper, layers, setup, net decls,
 * groups, embedded files, …) passes straight through, byte-faithful.
 *
 * Items are matched to the model positionally by their node head (the Nth
 * `(segment …)` child is `board.tracks[N]`, etc.), exactly the reader's order —
 * mirroring write-footprint.ts's positional rule. An untouched board therefore
 * round-trips model-identically; only edited items differ (their patched source).
 */

import { isList, head, type SList, type SNode } from '../sexpr/index.js';
import { serialize } from '../sexpr/serializer.js';
import { writeFootprintNode } from './write-footprint.js';
import type { Board } from './types.js';

/** A source child the reader parsed by these top-level heads. */
const GRAPHIC_HEADS = new Set(['gr_line', 'gr_arc', 'gr_circle', 'gr_rect', 'gr_poly', 'gr_curve']);

/**
 * Rebuild the `(kicad_pcb …)` node from the typed model, emitting each modelled
 * child from the model arrays (in source order) and passing every other child
 * through unchanged.
 *
 * Deletions are handled positionally, exactly like writeFootprintNode: each
 * modelled source child pulls the next item of its kind from the model array and
 * emits that item's (patched) source; once the array is exhausted the remaining
 * source children of that kind are dropped. Because every surviving item carries
 * its own source, order and content stay correct while the deleted ones vanish.
 */
export function writeBoardNode(board: Board): SList {
  const src = board.source;
  if (src.items.length === 0) return src; // nothing to rebuild from
  const out: SNode[] = [];
  let ti = 0, ai = 0, vi = 0, zi = 0, si = 0, xi = 0, fi = 0;

  for (const it of src.items) {
    if (!isList(it)) { out.push(it); continue; }
    const h = head(it) ?? '';
    if (h === 'footprint' || h === 'module') { if (fi < board.footprints.length) out.push(writeFootprintNode(board.footprints[fi]!)); fi++; }
    else if (h === 'segment') { if (ti < board.tracks.length) out.push(board.tracks[ti]!.source); ti++; }
    else if (h === 'arc') { if (ai < board.arcs.length) out.push(board.arcs[ai]!.source); ai++; }
    else if (h === 'via') { if (vi < board.vias.length) out.push(board.vias[vi]!.source); vi++; }
    else if (h === 'zone') { if (zi < board.zones.length) out.push(board.zones[zi]!.source); zi++; }
    else if (GRAPHIC_HEADS.has(h)) { if (si < board.shapes.length) out.push(board.shapes[si]!.source); si++; }
    else if (h === 'gr_text') { if (xi < board.texts.length) out.push(board.texts[xi]!.source); xi++; }
    else out.push(it);
  }
  return { kind: 'list', items: out };
}

/** Serialize a board to `.kicad_pcb` text. */
export function serializeBoard(board: Board): string {
  return serialize(writeBoardNode(board));
}
