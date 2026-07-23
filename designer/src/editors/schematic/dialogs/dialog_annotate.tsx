/**
 * Annotate Schematic dialog. Counterpart: `eeschema/dialogs/dialog_annotate.cpp`
 * (DIALOG_ANNOTATE) — the same sections in the same order: Scope, Order,
 * Keep/Reset existing, Numbering, and the Clear Annotation / Annotate buttons.
 * "Recurse into subsheets" is shown but disabled until hierarchical annotation
 * across screens is wired.
 */
import { useState, type JSX } from 'react';
import type { AnnotateOptions } from '@ziroeda/eeschema';

/** The project-persisted slice of the dialog (SCHEMATIC_SETTINGS: sort order,
 *  numbering method, start number — DIALOG_ANNOTATE reads them on open and
 *  writes changes back on close; scope/reset stay app preferences). */
export interface AnnotateProjectSettings {
  order: Exclude<AnnotateOptions['order'], 'unsorted'>;
  algo: AnnotateOptions['algo'];
  startNumber: number;
}

interface Props {
  hasSelection: boolean;
  /** Seed from the project's Schematic Setup > Annotation (TransferDataToWindow). */
  initial: AnnotateProjectSettings;
  onAnnotate: (opts: AnnotateOptions) => void;
  onClear: (scope: AnnotateOptions['scope']) => void;
  /** ~DIALOG_ANNOTATE: the project slice is handed back on every close so the
   *  caller can persist it when changed (OnModify). */
  onClose: (settings: AnnotateProjectSettings) => void;
}

export function DialogAnnotate({
  hasSelection,
  initial,
  onAnnotate,
  onClear,
  onClose,
}: Props): JSX.Element {
  const [scope, setScope] = useState<AnnotateOptions['scope']>('all');
  const [order, setOrder] = useState<AnnotateOptions['order']>(initial.order);
  const [reset, setReset] = useState(false);
  const [algo, setAlgo] = useState<AnnotateOptions['algo']>(initial.algo);
  const [startNumber, setStartNumber] = useState(initial.startNumber);
  const close = (): void =>
    onClose({ order: order === 'unsorted' ? 'x' : order, algo, startNumber });

  const opts: AnnotateOptions = {
    scope,
    order,
    algo,
    resetExisting: reset,
    startNumber,
    sheetNumber: 1,
  };

  return (
    <div className="ze-modal-backdrop" onMouseDown={close}>
      <div className="ze-modal ze-annotate-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-header">
          Annotate Schematic
          <span className="x" onClick={close}>
            ✕
          </span>
        </div>
        <div className="ze-modal-body ze-annotate-body">
          <fieldset>
            <legend>Scope</legend>
            <label>
              <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} />
              Entire schematic
            </label>
            <label>
              <input
                type="radio"
                checked={scope === 'current_sheet'}
                onChange={() => setScope('current_sheet')}
              />
              Current sheet only
            </label>
            <label className={hasSelection ? '' : 'disabled'}>
              <input
                type="radio"
                checked={scope === 'selection'}
                disabled={!hasSelection}
                onChange={() => setScope('selection')}
              />
              Selection
            </label>
            <label className="disabled">
              <input type="checkbox" disabled />
              Recurse into subsheets
            </label>
          </fieldset>

          <fieldset>
            <legend>Order</legend>
            <label>
              <input type="radio" checked={order === 'x'} onChange={() => setOrder('x')} />
              Sort symbols by X position
            </label>
            <label>
              <input type="radio" checked={order === 'y'} onChange={() => setOrder('y')} />
              Sort symbols by Y position
            </label>
          </fieldset>

          <fieldset>
            <legend>Options</legend>
            <label>
              <input type="radio" checked={!reset} onChange={() => setReset(false)} />
              Keep existing annotations
            </label>
            <label>
              <input type="radio" checked={reset} onChange={() => setReset(true)} />
              Reset existing annotations
            </label>
            <label className="disabled">
              <input type="checkbox" disabled />
              Regroup symbol units
            </label>
          </fieldset>

          <fieldset>
            <legend>Numbering</legend>
            <label>
              <input
                type="radio"
                checked={algo === 'incremental'}
                onChange={() => setAlgo('incremental')}
              />
              Use first free number after:
              <input
                type="number"
                className="ze-search start-num"
                value={startNumber}
                min={0}
                onChange={(e) => setStartNumber(Number(e.target.value) || 0)}
                onFocus={() => setAlgo('incremental')}
              />
            </label>
            <label>
              <input
                type="radio"
                checked={algo === 'sheet_100'}
                onChange={() => setAlgo('sheet_100')}
              />
              First free after sheet number X 100
            </label>
            <label>
              <input
                type="radio"
                checked={algo === 'sheet_1000'}
                onChange={() => setAlgo('sheet_1000')}
              />
              First free after sheet number X 1000
            </label>
          </fieldset>
        </div>
        <div className="ze-modal-footer">
          <button type="button" onClick={() => onClear(scope)}>
            Clear Annotation
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={close}>
            Close
          </button>
          <button type="button" className="primary" onClick={() => onAnnotate(opts)}>
            Annotate
          </button>
        </div>
      </div>
    </div>
  );
}
