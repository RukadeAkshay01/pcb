/**
 * Assign Footprints. Counterpart: `cvpcb/cvpcb_mainframe.cpp` (CVPCB_MAINFRAME,
 * eeschema's Tools > Assign Footprints…) — the classic three panes: footprint
 * libraries on the left, the schematic's components in the middle, the selected
 * library's footprints on the right. Double-clicking a footprint assigns its
 * FPID to the selected component and advances to the next unassigned one;
 * Apply writes every changed assignment back as Footprint field edits.
 */

import { useEffect, useMemo, useState, type JSX } from 'react';
import type { Schematic } from '@ziroeda/eeschema';
import { FOOTPRINTS_BASE } from '../../footprint/libraryManager.js';
import { buildFieldsRows, type FieldsEdits } from './dialog_symbol_fields_table.js';

interface FpLibIndex {
  name: string;
  footprints: string[];
}

interface Props {
  docs: ReadonlyMap<string, Schematic>;
  onApply: (edits: FieldsEdits) => void;
  onClose: () => void;
}

export function DialogAssignFootprints({ docs, onApply, onClose }: Props): JSX.Element {
  const components = useMemo(() => buildFieldsRows(docs), [docs]);
  const [index, setIndex] = useState<FpLibIndex[]>([]);
  const [libFilter, setLibFilter] = useState('');
  const [fpFilter, setFpFilter] = useState('');
  const [curLib, setCurLib] = useState<string | null>(null);
  const [curComp, setCurComp] = useState(0);
  // Pending assignments: "file\0id" -> FPID ("Lib:Footprint").
  const [pending, setPending] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetch(`${FOOTPRINTS_BASE}/index.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((idx: FpLibIndex[]) => setIndex(idx))
      .catch(() => setIndex([]));
  }, []);

  const libs = useMemo(() => {
    const q = libFilter.trim().toLowerCase();
    return q ? index.filter((l) => l.name.toLowerCase().includes(q)) : index;
  }, [index, libFilter]);

  const footprints = useMemo(() => {
    const lib = index.find((l) => l.name === curLib);
    if (!lib) return [];
    const q = fpFilter.trim().toLowerCase();
    return q ? lib.footprints.filter((f) => f.toLowerCase().includes(q)) : lib.footprints;
  }, [index, curLib, fpFilter]);

  const keyOf = (i: number): string => {
    const c = components[i]!;
    return `${c.file}\0${c.id}`;
  };
  const assignedOf = (i: number): string =>
    pending.get(keyOf(i)) ?? components[i]?.values.Footprint ?? '';

  // Double-click a footprint: assign to the current component, then step to
  // the next component without an assignment (cvpcb's auto-advance).
  const assign = (fpid: string): void => {
    if (components.length === 0) return;
    const cur = curComp;
    setPending((prev) => {
      const next = new Map(prev);
      if ((components[cur]?.values.Footprint ?? '') === fpid) next.delete(keyOf(cur));
      else next.set(keyOf(cur), fpid);
      return next;
    });
    for (let step = 1; step <= components.length; step++) {
      const i = (cur + step) % components.length;
      if (i === cur) break;
      if (!assignedOf(i)) {
        setCurComp(i);
        return;
      }
    }
    setCurComp(Math.min(cur + 1, components.length - 1));
  };

  const apply = (): void => {
    const edits: FieldsEdits = new Map();
    for (const [key, fpid] of pending) {
      const [file, id] = key.split('\0') as [string, string];
      if (!edits.has(file)) edits.set(file, new Map());
      edits.get(file)!.set(id, { Footprint: fpid });
    }
    onApply(edits);
  };

  const assignedCount = components.filter((_, i) => assignedOf(i)).length;

  const pane: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    borderRight: '1px solid var(--chrome-border)',
  };
  const list: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '4px 0' };
  const mono: React.CSSProperties = { fontSize: 12, whiteSpace: 'nowrap' };

  return (
    <div className="ze-modal-backdrop" onMouseDown={onClose}>
      <div className="ze-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-header">
          Assign Footprints
          <span className="x" title="Cancel" onClick={onClose}>
            ✕
          </span>
        </div>
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ ...pane, width: 200, flex: '0 0 auto' }}>
            <input
              className="ze-search"
              style={{ margin: 6 }}
              placeholder={`Filter ${index.length} libraries…`}
              value={libFilter}
              onChange={(e) => setLibFilter(e.target.value)}
            />
            <div style={list}>
              {index.length === 0 && (
                <div className="ze-muted" style={{ padding: '4px 10px' }}>
                  Loading libraries…
                </div>
              )}
              {libs.map((l) => (
                <div
                  key={l.name}
                  className={`ze-tree-item${curLib === l.name ? ' active' : ''}`}
                  onClick={() => setCurLib(l.name)}
                >
                  {l.name}
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...pane, flex: 1.4 }}>
            <div className="ze-muted" style={{ padding: '8px 10px 4px', fontSize: 11 }}>
              Symbol : Footprint Assignments
            </div>
            <div style={list}>
              {components.map((c, i) => (
                <div
                  key={`${c.file}\0${c.id}`}
                  className={`ze-tree-item${curComp === i ? ' active' : ''}`}
                  style={mono}
                  onClick={() => setCurComp(i)}
                  title={assignedOf(i)}
                >
                  <span style={{ width: 52, display: 'inline-block' }}>{c.reference}</span>
                  <span style={{ width: 110, display: 'inline-block', color: '#9fb6cc' }}>
                    {c.values.Value ?? ''}
                  </span>
                  <span
                    style={{
                      color: pending.has(keyOf(i)) ? '#e07b1a' : assignedOf(i) ? undefined : '#888',
                    }}
                  >
                    {assignedOf(i) || '— unassigned —'}
                  </span>
                </div>
              ))}
              {components.length === 0 && (
                <div className="ze-muted" style={{ padding: '4px 10px' }}>
                  No symbols — place and annotate symbols first.
                </div>
              )}
            </div>
          </div>
          <div style={{ ...pane, flex: 1, borderRight: 'none' }}>
            <input
              className="ze-search"
              style={{ margin: 6 }}
              placeholder={curLib ? `Filter ${footprints.length} footprints…` : 'Select a library'}
              value={fpFilter}
              disabled={!curLib}
              onChange={(e) => setFpFilter(e.target.value)}
            />
            <div style={list}>
              {footprints.map((name) => (
                <div
                  key={name}
                  className="ze-tree-item"
                  style={mono}
                  onDoubleClick={() => curLib && assign(`${curLib}:${name}`)}
                  title="Double-click to assign to the selected symbol"
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="ze-modal-footer">
          <span className="ze-muted" style={{ marginRight: 'auto', fontSize: 12 }}>
            {assignedCount} of {components.length} assigned
            {pending.size > 0 ? ` — ${pending.size} changed` : ''}
          </span>
          <button className="ze-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="ze-btn primary" disabled={pending.size === 0} onClick={apply}>
            Apply Assignments
          </button>
        </div>
      </div>
    </div>
  );
}
