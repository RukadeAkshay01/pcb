/**
 * Factories for newly-created items.
 *
 * Every model item carries a `source` S-expression node (the lossless backing
 * store). Items created in the editor therefore get a freshly-built node here, so
 * they serialize correctly later and stay consistent with parsed items. Numbers
 * are written in millimetres, matching the file format.
 */

import { list, atom, str, type SList } from '../sexpr/types.js';
import { iuToMM } from '../units.js';
import type { SchLine, SchJunction, Vec2 } from '../model/types.js';

/** A UUID for a new item. Falls back to a random hex string off-platform. */
export function newUuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Format an internal-unit coordinate as KiCad-style millimetres text. */
function mm(iu: number): string {
  let s = iuToMM(iu).toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  if (s === '' || s === '-0') s = '0';
  return s;
}

const xy = (p: Vec2): SList => list(atom('xy'), atom(mm(p.x)), atom(mm(p.y)));

/** Build the `(wire ...)` node for a new wire segment. */
export function buildWireNode(start: Vec2, end: Vec2, uuid: string): SList {
  return list(
    atom('wire'),
    list(atom('pts'), xy(start), xy(end)),
    list(atom('stroke'), list(atom('width'), atom('0')), list(atom('type'), atom('default'))),
    list(atom('uuid'), str(uuid)),
  );
}

/** Build the `(junction ...)` node for a new junction. */
export function buildJunctionNode(at: Vec2, uuid: string): SList {
  return list(
    atom('junction'),
    list(atom('at'), atom(mm(at.x)), atom(mm(at.y))),
    list(atom('diameter'), atom('0')),
    list(atom('color'), atom('0'), atom('0'), atom('0'), atom('0')),
    list(atom('uuid'), str(uuid)),
  );
}

/** Create a new wire model item (with its backing AST node). */
export function makeWire(start: Vec2, end: Vec2): SchLine {
  const uuid = newUuid();
  return {
    kind: 'wire',
    start,
    end,
    stroke: { width: 0, type: 'default' },
    uuid,
    source: buildWireNode(start, end, uuid),
  };
}

/** Create a new junction model item (with its backing AST node). */
export function makeJunction(at: Vec2): SchJunction {
  const uuid = newUuid();
  return { at, diameter: 0, uuid, source: buildJunctionNode(at, uuid) };
}
