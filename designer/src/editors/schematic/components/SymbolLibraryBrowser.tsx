/**
 * Symbol Library Browser. Counterpart: `eeschema/symbol_viewer_frame.cpp`
 * (SYMBOL_VIEWER_FRAME) — the browse-first companion to the Choose Symbol
 * dialog: a libraries pane, the selected library's symbols pane, and a live
 * preview, with "Add Symbol to Schematic" handing the pick to the place tool.
 */

import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import type { LibSymbol } from '@ziroeda/eeschema';
import { loadIndex, loadSymbol, type LibIndexEntry } from '../symbols/index.js';
import { renderSymbolPreview } from '../render/renderer.js';
import { KICAD_CLASSIC } from '../theme.js';

interface Props {
  onPick: (lib: LibSymbol) => void;
  onClose: () => void;
}

export function SymbolLibraryBrowser({ onPick, onClose }: Props): JSX.Element {
  const [index, setIndex] = useState<LibIndexEntry[]>([]);
  const [libFilter, setLibFilter] = useState('');
  const [symFilter, setSymFilter] = useState('');
  const [curLib, setCurLib] = useState<string | null>(null);
  const [curSym, setCurSym] = useState<string | null>(null);
  const [previewSym, setPreviewSym] = useState<LibSymbol | null>(null);
  const [fetching, setFetching] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadIndex()
      .then(setIndex)
      .catch(() => setIndex([]));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter' && previewSym) onPick(previewSym);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPick, previewSym]);

  const libs = useMemo(() => {
    const q = libFilter.trim().toLowerCase();
    return q ? index.filter((l) => l.name.toLowerCase().includes(q)) : index;
  }, [index, libFilter]);

  const symbols = useMemo(() => {
    const lib = index.find((l) => l.name === curLib);
    if (!lib) return [];
    const q = symFilter.trim().toLowerCase();
    return q ? lib.symbols.filter((s) => s.toLowerCase().includes(q)) : lib.symbols;
  }, [index, curLib, symFilter]);

  const select = async (library: string, name: string): Promise<void> => {
    setCurSym(name);
    setFetching(true);
    try {
      const sym = await loadSymbol(library, name);
      if (sym) setPreviewSym(sym);
    } finally {
      setFetching(false);
    }
  };

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

  const prop = (key: string): string | undefined =>
    previewSym?.properties.find((p) => p.key === key)?.value;

  const pane: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    borderRight: '1px solid var(--chrome-border)',
  };
  const list: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '4px 0' };

  return (
    <div className="ze-modal-backdrop" onMouseDown={onClose}>
      <div className="ze-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-header">
          Symbol Library Browser
          <span className="x" title="Close" onClick={onClose}>
            ✕
          </span>
        </div>
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ ...pane, width: 220, flex: '0 0 auto' }}>
            <input
              className="ze-search"
              style={{ margin: 6 }}
              placeholder={`Filter ${index.length} libraries…`}
              value={libFilter}
              onChange={(e) => setLibFilter(e.target.value)}
              autoFocus
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
                  onClick={() => {
                    setCurLib(l.name);
                    setCurSym(null);
                    setSymFilter('');
                  }}
                >
                  {l.name} <span style={{ color: '#7f97b0', fontSize: 11 }}>({l.count})</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...pane, width: 240, flex: '0 0 auto' }}>
            <input
              className="ze-search"
              style={{ margin: 6 }}
              placeholder={curLib ? `Filter ${symbols.length} symbols…` : 'Select a library'}
              value={symFilter}
              disabled={!curLib}
              onChange={(e) => setSymFilter(e.target.value)}
            />
            <div style={list}>
              {symbols.map((name) => (
                <div
                  key={name}
                  className={`ze-tree-item${curSym === name ? ' active' : ''}`}
                  onClick={() => curLib && void select(curLib, name)}
                  onDoubleClick={() => previewSym && curSym === name && onPick(previewSym)}
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex' }}>
              <canvas ref={canvasRef} className="ze-preview-canvas" style={{ flex: 1 }} />
              {fetching && (
                <div className="ze-canvas-loading" style={{ color: '#555' }}>
                  <span className="ze-spinner" />
                  <span>Loading {curLib}…</span>
                </div>
              )}
            </div>
            <div className="ze-preview-info">
              {previewSym ? (
                <>
                  <div className="nm">{previewSym.libId}</div>
                  {prop('Description') && <div className="desc">{prop('Description')}</div>}
                  {prop('ki_keywords') && (
                    <div className="ze-muted" style={{ fontSize: 11 }}>
                      Keywords: {prop('ki_keywords')}
                    </div>
                  )}
                </>
              ) : (
                <div className="ze-muted">Select a symbol to preview it.</div>
              )}
            </div>
          </div>
        </div>
        <div className="ze-modal-footer">
          <button className="ze-btn" onClick={onClose}>
            Close
          </button>
          <button
            className="ze-btn primary"
            disabled={!previewSym}
            onClick={() => previewSym && onPick(previewSym)}
          >
            Add Symbol to Schematic
          </button>
        </div>
      </div>
    </div>
  );
}
