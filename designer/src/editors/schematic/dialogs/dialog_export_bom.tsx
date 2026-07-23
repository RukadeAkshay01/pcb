/**
 * Generate Bill of Materials dialog. Counterpart: the Symbol Fields Table's
 * Export view (`eeschema/dialogs/dialog_symbol_fields_table.cpp`, KiCad's
 * Tools > Generate Bill of Materials): a BOM view preset picks the columns,
 * grouping, sort and filters (BOM_PRESET), an output-format preset picks the
 * delimiters (BOM_FMT_PRESET), and both kinds can be saved by name into the
 * project (they then list in Schematic Setup > BOM Presets). Built-in presets
 * are read-only and never persisted, like upstream.
 */

import { useMemo, useState, type JSX } from 'react';
import { buildBom, bomToDelimited, compareRefs, type Schematic } from '@ziroeda/eeschema';
import {
  bomBuiltInPresets,
  bomFmtBuiltInPresets,
  type BomFmtPreset,
  type BomPreset,
  type BomPresets,
} from '../schematic_settings.js';

interface Props {
  /** Every sheet document of the project (full hierarchy BOM). */
  docs: readonly Schematic[];
  /** Suggested output base name (project/sheet name, no extension). */
  baseName: string;
  /** Saved presets from Schematic Setup (schematic.bom_presets). */
  presets: BomPresets;
  /** Persist a changed preset list (Save Preset here / delete in Setup). */
  onSavePresets: (next: BomPresets) => void;
  onClose: () => void;
}

const CUSTOM = '(custom)';

export function DialogExportBom({
  docs,
  baseName,
  presets,
  onSavePresets,
  onClose,
}: Props): JSX.Element {
  const allPresets = useMemo(() => [...bomBuiltInPresets(), ...presets.presets], [presets.presets]);
  const allFmt = useMemo(
    () => [...bomFmtBuiltInPresets(), ...presets.fmtPresets],
    [presets.fmtPresets],
  );

  // The active view: seeded from the default "Grouped By Value" preset and
  // re-seeded whenever a preset is picked; manual edits flip to "(custom)".
  const [presetName, setPresetName] = useState('Grouped By Value');
  const [view, setView] = useState<BomPreset>(
    () => bomBuiltInPresets().find((p) => p.name === 'Grouped By Value')!,
  );
  const [fmtName, setFmtName] = useState('CSV');
  const [fmt, setFmt] = useState<BomFmtPreset>(() => bomFmtBuiltInPresets()[0]!);
  const [saveName, setSaveName] = useState('');

  const applyPreset = (name: string): void => {
    const p = allPresets.find((x) => x.name === name);
    if (!p) return;
    setPresetName(name);
    setView(structuredClone(p));
  };
  const applyFmt = (name: string): void => {
    const f = allFmt.find((x) => x.name === name);
    if (!f) return;
    setFmtName(name);
    setFmt(structuredClone(f));
  };
  const editView = (patch: Partial<BomPreset>): void => {
    setPresetName(CUSTOM);
    setView((v) => ({ ...v, ...patch, readOnly: false }));
  };
  const editFmt = (patch: Partial<BomFmtPreset>): void => {
    setFmtName(CUSTOM);
    setFmt((f) => ({ ...f, ...patch, readOnly: false }));
  };

  // Shown columns and grouping fields come from the preset's ordered fields.
  const columns = useMemo(
    () => view.fieldsOrdered.filter((f) => f.show).map((f) => ({ name: f.name, label: f.label })),
    [view.fieldsOrdered],
  );
  const rows = useMemo(() => {
    const groupBy = view.groupSymbols
      ? view.fieldsOrdered.filter((f) => f.groupBy && !f.name.startsWith('${')).map((f) => f.name)
      : ['Reference'];
    let out = buildBom(docs, {
      groupBy,
      includeDNP: !view.excludeDnp,
      includeExcludedFromBom: view.includeExcludedFromBom,
    });
    // filter_string matches against the reference list (upstream's filter).
    if (view.filterString.trim()) {
      const needle = view.filterString.trim().toLowerCase();
      out = out.filter((r) => r.refs.toLowerCase().includes(needle));
    }
    const cellOf = (r: (typeof out)[number], name: string): string =>
      name === 'Reference'
        ? r.refs
        : name === '${QUANTITY}'
          ? String(r.qty)
          : name === '${DNP}'
            ? String(r.dnp)
            : (r.fields[name] ?? '');
    const dir = view.sortAsc ? 1 : -1;
    out = [...out].sort((a, b) => {
      const av = cellOf(a, view.sortField === 'Reference' ? 'Reference' : view.sortField);
      const bv = cellOf(b, view.sortField === 'Reference' ? 'Reference' : view.sortField);
      return view.sortField === 'Reference'
        ? dir * compareRefs(av.split(',')[0]!, bv.split(',')[0]!)
        : dir * av.localeCompare(bv, undefined, { numeric: true });
    });
    return out;
  }, [docs, view]);

  const saveCurrent = (): void => {
    const name = saveName.trim();
    if (!name) return;
    const preset: BomPreset = { ...structuredClone(view), name, readOnly: false };
    const fmtPreset: BomFmtPreset = { ...structuredClone(fmt), name, readOnly: false };
    // Overwrite an existing saved preset of the same name; built-ins keep
    // priority in the pickers but saved names may shadow-free coexist.
    const nextPresets = [...presets.presets.filter((p) => p.name !== name), preset];
    const nextFmt =
      fmtName === CUSTOM
        ? [...presets.fmtPresets.filter((p) => p.name !== name), fmtPreset]
        : presets.fmtPresets;
    onSavePresets({ presets: nextPresets, fmtPresets: nextFmt });
    setPresetName(name);
    setSaveName('');
  };

  const exportFile = (): void => {
    const text = bomToDelimited(rows, columns, fmt);
    const ext = fmt.fieldDelimiter === '\t' ? 'tsv' : fmt.fieldDelimiter === ',' ? 'csv' : 'txt';
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const th: React.CSSProperties = {
    textAlign: 'left',
    padding: '3px 8px',
    fontSize: 11,
    borderBottom: '1px solid var(--chrome-border)',
    whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = {
    padding: '3px 8px',
    fontSize: 12,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 220,
  };
  const delimInput: React.CSSProperties = { width: 34, textAlign: 'center' };
  const lbl: React.CSSProperties = { fontSize: 12, whiteSpace: 'nowrap' };

  const cellText = (row: (typeof rows)[number], name: string): string => {
    if (name === 'Reference') return row.refs;
    if (name === '${QUANTITY}') return String(row.qty);
    if (name === '${DNP}') return row.dnp ? 'DNP' : '';
    if (name.startsWith('${')) return '';
    return row.fields[name] ?? '';
  };

  return (
    <div className="ze-modal-backdrop" onMouseDown={onClose}>
      <div
        className="ze-modal"
        style={{
          width: 860,
          maxWidth: '96vw',
          height: 560,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ze-modal-header">
          Generate Bill of Materials
          <span className="x" title="Cancel" onClick={onClose}>
            ✕
          </span>
        </div>

        {/* View preset row */}
        <div style={{ display: 'flex', gap: 10, padding: '8px 14px 4px', alignItems: 'center' }}>
          <span style={lbl}>Preset:</span>
          <select
            className="ze-select"
            value={presetName}
            onChange={(e) => applyPreset(e.target.value)}
          >
            {presetName === CUSTOM && <option value={CUSTOM}>{CUSTOM}</option>}
            {allPresets.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <label style={lbl}>
            <input
              type="checkbox"
              checked={view.groupSymbols}
              onChange={(e) => editView({ groupSymbols: e.target.checked })}
            />{' '}
            Group symbols
          </label>
          <label style={lbl}>
            <input
              type="checkbox"
              checked={view.excludeDnp}
              onChange={(e) => editView({ excludeDnp: e.target.checked })}
            />{' '}
            Exclude DNP
          </label>
          <span className="ze-muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
            {rows.length} row{rows.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Format preset row */}
        <div style={{ display: 'flex', gap: 10, padding: '2px 14px 6px', alignItems: 'center' }}>
          <span style={lbl}>Format:</span>
          <select className="ze-select" value={fmtName} onChange={(e) => applyFmt(e.target.value)}>
            {fmtName === CUSTOM && <option value={CUSTOM}>{CUSTOM}</option>}
            {allFmt.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <span style={lbl}>Field:</span>
          <input
            className="ze-search"
            style={delimInput}
            value={fmt.fieldDelimiter === '\t' ? '\\t' : fmt.fieldDelimiter}
            onChange={(e) =>
              editFmt({ fieldDelimiter: e.target.value === '\\t' ? '\t' : e.target.value })
            }
          />
          <span style={lbl}>String:</span>
          <input
            className="ze-search"
            style={delimInput}
            value={fmt.stringDelimiter}
            onChange={(e) => editFmt({ stringDelimiter: e.target.value })}
          />
          <span style={lbl}>Ref:</span>
          <input
            className="ze-search"
            style={delimInput}
            value={fmt.refDelimiter}
            onChange={(e) => editFmt({ refDelimiter: e.target.value })}
          />
          <span style={lbl}>Range:</span>
          <input
            className="ze-search"
            style={delimInput}
            value={fmt.refRangeDelimiter}
            onChange={(e) => editFmt({ refRangeDelimiter: e.target.value })}
          />
          <span style={{ flex: 1 }} />
          <input
            className="ze-search"
            style={{ width: 130 }}
            placeholder="Preset name…"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
          />
          <button type="button" disabled={!saveName.trim()} onClick={saveCurrent}>
            Save Preset
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', margin: '0 14px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.name} style={th}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.refs}>
                  {columns.map((c) => (
                    <td key={c.name} style={td} className={row.dnp ? 'ze-muted' : undefined}>
                      {cellText(row, c.name)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ze-modal-footer">
          <button type="button" onClick={onClose}>
            Close
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" className="primary" onClick={exportFile}>
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
