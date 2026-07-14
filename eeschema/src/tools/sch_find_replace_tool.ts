/**
 * Find (and replace) over schematic text. Counterpart:
 * `eeschema/tools/sch_find_replace_tool.cpp` plus the search-settings shape
 * from `include/eda_search_data.h` (EDA_SEARCH_DATA / SCH_SEARCH_DATA).
 *
 * Matching follows EDA_ITEM::Matches: case-insensitive by default, with
 * whole-word and wildcard (`*`/`?`, whole-string) modes. The searched text
 * sources mirror the upstream SCH_ITEM::Matches implementations: labels and
 * text, symbol fields (visible only, unless "search hidden fields"), pin
 * names/numbers (when "search pin names and numbers"), sheet fields
 * (Sheetname/Sheetfile), text boxes, and table cells.
 */

import type { Vec2 } from '@ziroeda/kimath';
import type { LibSymbol, Schematic } from '../types.js';
import { refId } from './hittest.js';

export type MatchMode = 'plain' | 'wholeword' | 'wildcard';

/** EDA_SEARCH_DATA + the SCH_SEARCH_DATA extras. */
export interface SchSearchData {
  findString: string;
  replaceString: string;
  matchCase: boolean;
  matchMode: MatchMode;
  /** Search hidden fields too (searchAllFields). */
  searchAllFields: boolean;
  /** Search pin names and numbers (searchAllPins). */
  searchAllPins: boolean;
  searchCurrentSheetOnly: boolean;
  /** Replace may touch reference designators (replaceReferences). */
  replaceReferences: boolean;
}

export const defaultSearchData = (): SchSearchData => ({
  findString: '',
  replaceString: '',
  matchCase: false,
  matchMode: 'plain',
  searchAllFields: false,
  searchAllPins: false,
  searchCurrentSheetOnly: false,
  replaceReferences: false,
});

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** EDA_ITEM::Matches( text, searchData ). */
export function matchesText(text: string, d: SchSearchData): boolean {
  if (!d.findString) return false;
  const t = d.matchCase ? text : text.toUpperCase();
  const s = d.matchCase ? d.findString : d.findString.toUpperCase();
  switch (d.matchMode) {
    case 'wholeword':
      return new RegExp(`\\b${escapeRe(s)}\\b`).test(t);
    case 'wildcard': {
      // wxString::Matches: whole-string match where * = any run, ? = any char.
      const re = escapeRe(s).replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
      return new RegExp(`^${re}$`).test(t);
    }
    default:
      return t.includes(s);
  }
}

/** One hit: the selectable item id, where to centre the view, and the text. */
export interface FindMatch {
  id: string;
  kind: 'symbol' | 'label' | 'sheet' | 'textbox' | 'table';
  pos: Vec2;
  text: string;
}

/**
 * All matches in one document, in reading order (top-to-bottom then
 * left-to-right) so repeated Find Next progresses predictably.
 */
export function findMatches(
  doc: Schematic,
  libById: ReadonlyMap<string, LibSymbol>,
  d: SchSearchData,
): FindMatch[] {
  const out: FindMatch[] = [];
  if (!d.findString) return out;

  // Labels cover every SCH_LABEL_BASE plus plain text (kind 'text').
  doc.labels.forEach((l, i) => {
    if (matchesText(l.text, d))
      out.push({ id: refId('label', l.uuid, i), kind: 'label', pos: l.at, text: l.text });
  });

  doc.symbols.forEach((sym, i) => {
    const id = refId('symbol', sym.uuid, i);
    for (const f of sym.fields) {
      const hidden = f.effects?.hidden === true;
      if (hidden && !d.searchAllFields) continue;
      if (matchesText(f.value, d)) {
        out.push({ id, kind: 'symbol', pos: f.at ?? sym.at, text: f.value });
        break; // one hit per symbol is enough to select it
      }
    }
    if (d.searchAllPins && !out.some((m) => m.id === id)) {
      const lib = libById.get(sym.libId);
      const pins = lib?.units.flatMap((u) => u.pins) ?? [];
      if (pins.some((p) => matchesText(p.name, d) || matchesText(p.number, d)))
        out.push({ id, kind: 'symbol', pos: sym.at, text: sym.libId });
    }
  });

  doc.sheets.forEach((sh, i) => {
    for (const f of sh.fields) {
      if (matchesText(f.value, d)) {
        out.push({
          id: refId('sheet', sh.uuid, i),
          kind: 'sheet',
          pos: sh.at,
          text: f.value,
        });
        break;
      }
    }
  });

  doc.textBoxes.forEach((tb, i) => {
    if (matchesText(tb.text, d))
      out.push({ id: refId('textbox', tb.uuid, i), kind: 'textbox', pos: tb.start, text: tb.text });
  });

  doc.tables.forEach((t, i) => {
    const hit = t.cells.find((c) => matchesText(c.text, d));
    if (hit)
      out.push({
        id: refId('table', t.uuid, i),
        kind: 'table',
        pos: hit.start,
        text: hit.text,
      });
  });

  out.sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x);
  return out;
}
