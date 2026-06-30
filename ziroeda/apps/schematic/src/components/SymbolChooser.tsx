import { useEffect, useMemo, useRef, useState } from 'react';
import type { LibSymbol } from '@ziroeda/core';
import { loadIndex, loadSymbol, type LibIndexEntry } from '../symbols/index.js';
import { renderSymbolPreview } from '../render/renderer.js';
import { KICAD_CLASSIC } from '../theme.js';

interface Props {
  onPick: (lib: LibSymbol) => void;
  onCancel: () => void;
}

const MAX_RESULTS = 500;

/** KiCad-style "Choose Symbol" modal: search/browse on the left, live preview on the right. */
export function SymbolChooser({ onPick, onCancel }: Props): JSX.Element {
  const [index, setIndex] = useState<LibIndexEntry[]>([]);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewSym, setPreviewSym] = useState<LibSymbol | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { loadIndex().then(setIndex).catch(() => setIndex([])); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      else if (e.key === 'Enter' && previewSym) onPick(previewSym);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, onPick, previewSym]);

  const highlight = async (library: string, name: string) => {
    setPreviewId(`${library}:${name}`);
    const sym = await loadSymbol(library, name);
    if (sym) setPreviewSym(sym);
  };

  // Render the preview whenever the selected symbol changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !previewSym) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    if (ctx) renderSymbolPreview(ctx, previewSym, canvas.width, canvas.height, KICAD_CLASSIC);
  }, [previewSym]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return null;
    const out: [string, string][] = [];
    for (const lib of index) {
      for (const name of lib.symbols) {
        if (name.toLowerCase().includes(q) || `${lib.name}:${name}`.toLowerCase().includes(q)) {
          out.push([lib.name, name]);
          if (out.length >= MAX_RESULTS) return out;
        }
      }
    }
    return out;
  }, [q, index]);

  const total = index.reduce((n, l) => n + l.count, 0);

  const symRow = (library: string, name: string, indent: number) => {
    const id = `${library}:${name}`;
    return (
      <div
        key={id}
        className={`ze-tree-item${previewId === id ? ' active' : ''}`}
        style={{ paddingLeft: 6 + indent }}
        onClick={() => highlight(library, name)}
        onDoubleClick={() => previewSym && onPick(previewSym)}
        title={id}
      >
        {name}
      </div>
    );
  };

  const desc = previewSym?.properties.find((p) => p.key === 'Description')?.value;
  const keywords = previewSym?.properties.find((p) => p.key === 'ki_keywords')?.value;

  return (
    <div className="ze-modal-backdrop" onMouseDown={onCancel}>
      <div className="ze-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-header">
          Choose Symbol
          <span className="x" onClick={onCancel}>✕</span>
        </div>
        <div className="ze-modal-body">
          <div className="ze-chooser-tree">
            <div className="top">
              <input
                className="ze-search"
                placeholder={`Search ${total ? total.toLocaleString() : ''} symbols…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="ze-chooser-list">
              {index.length === 0 && <div className="ze-muted">Loading libraries…</div>}
              {results ? (
                <>
                  {results.length === 0 && <div className="ze-muted">No matches</div>}
                  {results.map(([lib, name]) => (
                    <div key={`${lib}:${name}`} className={`ze-tree-item${previewId === `${lib}:${name}` ? ' active' : ''}`}
                      onClick={() => highlight(lib, name)} onDoubleClick={() => previewSym && onPick(previewSym)} title={`${lib}:${name}`}>
                      <span style={{ color: '#7f97b0', fontSize: 11 }}>{lib}</span>&nbsp;{name}
                    </div>
                  ))}
                  {results.length >= MAX_RESULTS && <div className="ze-muted">…refine your search</div>}
                </>
              ) : (
                index.map((lib) => {
                  const open = expanded.has(lib.name);
                  return (
                    <div key={lib.name}>
                      <div className="ze-tree-item root"
                        onClick={() => setExpanded((p) => { const n = new Set(p); n.has(lib.name) ? n.delete(lib.name) : n.add(lib.name); return n; })}>
                        <span className="twisty">{open ? '▾' : '▸'}</span>
                        {lib.name} <span style={{ color: '#7f97b0' }}>({lib.count})</span>
                      </div>
                      {open && lib.symbols.map((name) => symRow(lib.name, name, 16))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="ze-chooser-right">
            <canvas ref={canvasRef} className="ze-preview-canvas" />
            <div className="ze-preview-info">
              {previewSym ? (
                <>
                  <div className="nm">{previewSym.libId}</div>
                  {desc && <div className="desc">{desc}</div>}
                  {keywords && <div className="kw">{keywords}</div>}
                </>
              ) : (
                <div className="ze-muted">Select a symbol to preview it.</div>
              )}
            </div>
          </div>
        </div>
        <div className="ze-modal-footer">
          <button className="ze-btn" onClick={onCancel}>Cancel</button>
          <button className="ze-btn primary" disabled={!previewSym} onClick={() => previewSym && onPick(previewSym)}>Place Symbol</button>
        </div>
      </div>
    </div>
  );
}
