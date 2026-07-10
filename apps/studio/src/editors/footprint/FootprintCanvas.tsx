/**
 * The Footprint Editor drawing canvas — the PCB_DRAW_PANEL_GAL of KiCad's
 * `FOOTPRINT_EDIT_FRAME`, ported to Canvas 2D. It reuses the board painter
 * (renderBoard.ts) unchanged by wrapping the edited footprint as a one-item
 * BOARD (footprintToBoard), exactly as pcbnew edits a footprint on an internal
 * board. Same crisp off-screen raster + delta-blit strategy as PcbEditor, and a
 * controller (zoomToFit/zoomIn/zoomOut/redraw) exposed via ref like SymbolCanvas.
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { PcbFootprint, Vec2 } from '@ziroeda/core';
import {
  buildScene, buildDrawSteps, DEFAULT_DRAW_OPTIONS, type BoardScene, type PcbDrawOptions,
} from '../pcb/renderBoard.js';
import { PCB_BACKGROUND } from '../pcb/pcbTheme.js';
import { footprintToBoard } from './footprintBoard.js';

const MM = 10000;

export interface FootprintCanvasController {
  zoomToFit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  redraw: () => void;
}

export interface FootprintCanvasProps {
  footprint: PcbFootprint | null;
  /** Visible board layers (Appearance panel). */
  visible: ReadonlySet<string>;
  drawOpts?: PcbDrawOptions;
  onCursorMove?: (p: Vec2 | null) => void;
  onScaleChange?: (scale: number) => void;
}

export const FootprintCanvas = forwardRef<FootprintCanvasController, FootprintCanvasProps>(
  function FootprintCanvas({ footprint, visible, drawOpts = DEFAULT_DRAW_OPTIONS, onCursorMove, onScaleChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef({ scale: 0.005, tx: 0, ty: 0 });
    const sceneRef = useRef<BoardScene | null>(null);
    const rafRef = useRef(0);
    const [, setScale] = useState(0);
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    // Compile the footprint (wrapped as a board) into retained per-layer paths.
    const scene = useMemo(() => buildScene(footprintToBoard(footprint)), [footprint]);
    sceneRef.current = scene;

    // ----- crisp off-screen raster, blitted with a delta transform each frame ---
    const cacheRef = useRef<{ canvas: HTMLCanvasElement; view: { scale: number; tx: number; ty: number } } | null>(null);
    const renderingRef = useRef(false);
    const viewChangedRef = useRef(true);

    const viewMatchesCache = useCallback((): boolean => {
      const c = cacheRef.current;
      const v = viewRef.current;
      const canvas = canvasRef.current;
      return !!c && !!canvas && c.view.scale === v.scale && c.view.tx === v.tx && c.view.ty === v.ty
        && c.canvas.width === canvas.width && c.canvas.height === canvas.height;
    }, []);

    const startCrispRender = useCallback(() => {
      if (renderingRef.current) return;
      const canvas = canvasRef.current;
      const scn = sceneRef.current;
      if (!canvas || !scn || canvas.width < 2) return;
      if (viewMatchesCache()) { viewChangedRef.current = false; return; }
      renderingRef.current = true;
      viewChangedRef.current = false;
      const work = document.createElement('canvas');
      work.width = canvas.width;
      work.height = canvas.height;
      const cctx = work.getContext('2d');
      if (!cctx) { renderingRef.current = false; return; }
      const jobView = { ...viewRef.current };
      // No drawing sheet in the footprint editor (a library footprint has no page).
      const steps = buildDrawSteps(cctx, scn, jobView, visible, work.width, work.height, { ...drawOpts, drawingSheet: false });
      let i = 0;
      const run = (): void => {
        const t0 = performance.now();
        while (i < steps.length && performance.now() - t0 < 12) steps[i++]!();
        if (i < steps.length) {
          requestAnimationFrame(run);
        } else {
          cacheRef.current = { canvas: work, view: jobView };
          renderingRef.current = false;
          requestDraw();
          if (viewChangedRef.current || !viewMatchesCache()) startCrispRender();
        }
      };
      run();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, drawOpts, viewMatchesCache]);

    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas || !sceneRef.current) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const v = viewRef.current;
      if (!viewMatchesCache()) {
        viewChangedRef.current = true;
        startCrispRender();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = PCB_BACKGROUND;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const c = cacheRef.current;
      if (c) {
        const k = v.scale / c.view.scale;
        ctx.setTransform(k, 0, 0, k, v.tx - c.view.tx * k, v.ty - c.view.ty * k);
        ctx.imageSmoothingEnabled = k < 1;
        ctx.drawImage(c.canvas, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      setScale(v.scale);
      onScaleChange?.(v.scale);
    }, [startCrispRender, viewMatchesCache, onScaleChange]);

    const requestDraw = useCallback(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    }, [draw]);

    // Invalidate the raster when the compiled scene, layers or options change.
    useEffect(() => {
      cacheRef.current = null;
      requestDraw();
    }, [scene, visible, drawOpts, requestDraw]);

    const zoomToFit = useCallback(() => {
      const canvas = canvasRef.current;
      const scn = sceneRef.current;
      if (!canvas) return;
      // A footprint with no geometry (a brand-new one): centre on the origin.
      const bbox = scn?.bbox ?? { minX: -5 * MM, minY: -5 * MM, maxX: 5 * MM, maxY: 5 * MM };
      const { minX, minY, maxX, maxY } = bbox;
      const margin = 2 * MM;
      const s = Math.min(
        canvas.width / (maxX - minX + margin * 2),
        canvas.height / (maxY - minY + margin * 2),
      );
      viewRef.current = {
        scale: s > 0 && Number.isFinite(s) ? s : 0.02,
        tx: canvas.width / 2 - ((minX + maxX) / 2) * s,
        ty: canvas.height / 2 - ((minY + maxY) / 2) * s,
      };
      requestDraw();
    }, [requestDraw]);

    const zoomStep = useCallback((factor: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const v = viewRef.current;
      const px = canvas.width / 2;
      const py = canvas.height / 2;
      const wx = (px - v.tx) / v.scale;
      const wy = (py - v.ty) / v.scale;
      v.scale *= factor;
      v.tx = px - wx * v.scale;
      v.ty = py - wy * v.scale;
      requestDraw();
    }, [requestDraw]);

    useImperativeHandle(ref, () => ({
      zoomToFit,
      zoomIn: () => zoomStep(1.3),
      zoomOut: () => zoomStep(1 / 1.3),
      redraw: () => { cacheRef.current = null; requestDraw(); },
    }), [zoomToFit, zoomStep, requestDraw]);

    // Size the canvas to its container (device pixels); fit on first layout.
    const fittedRef = useRef(false);
    useEffect(() => {
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      if (!wrap || !canvas) return;
      const ro = new ResizeObserver(() => {
        const r = wrap.getBoundingClientRect();
        canvas.width = Math.max(1, Math.round(r.width * dpr));
        canvas.height = Math.max(1, Math.round(r.height * dpr));
        canvas.style.width = `${r.width}px`;
        canvas.style.height = `${r.height}px`;
        if (!fittedRef.current) {
          fittedRef.current = true;
          zoomToFit();
        } else {
          cacheRef.current = null;
          requestDraw();
        }
      });
      ro.observe(wrap);
      return () => ro.disconnect();
    }, [dpr, requestDraw, zoomToFit]);

    // Re-fit when a different footprint is loaded.
    const fpRef = useRef(footprint);
    useEffect(() => {
      if (fpRef.current !== footprint) {
        fpRef.current = footprint;
        requestAnimationFrame(zoomToFit);
      }
    }, [footprint, zoomToFit]);

    // Wheel zoom about the cursor.
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const onWheel = (e: WheelEvent): void => {
        e.preventDefault();
        const v = viewRef.current;
        const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
        const rect = canvas.getBoundingClientRect();
        const px = (e.clientX - rect.left) * dpr;
        const py = (e.clientY - rect.top) * dpr;
        const wx = (px - v.tx) / v.scale;
        const wy = (py - v.ty) / v.scale;
        v.scale *= factor;
        v.tx = px - wx * v.scale;
        v.ty = py - wy * v.scale;
        requestDraw();
      };
      canvas.addEventListener('wheel', onWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', onWheel);
    }, [dpr, requestDraw]);

    // Drag to pan (left or middle button); report cursor in world (IU) coords.
    const dragRef = useRef<{ x: number; y: number } | null>(null);
    const onPointerDown = (e: React.PointerEvent): void => {
      if (e.button === 0 || e.button === 1) {
        dragRef.current = { x: e.clientX, y: e.clientY };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    };
    const onPointerMove = (e: React.PointerEvent): void => {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const v = viewRef.current;
        const wx = ((e.clientX - rect.left) * dpr - v.tx) / v.scale;
        const wy = ((e.clientY - rect.top) * dpr - v.ty) / v.scale;
        onCursorMove?.({ x: wx, y: wy });
      }
      if (dragRef.current) {
        const v = viewRef.current;
        v.tx += (e.clientX - dragRef.current.x) * dpr;
        v.ty += (e.clientY - dragRef.current.y) * dpr;
        dragRef.current = { x: e.clientX, y: e.clientY };
        requestDraw();
      }
    };
    const onPointerUp = (): void => { dragRef.current = null; };

    return (
      <div className="ze-canvas-wrap" ref={wrapRef} style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => onCursorMove?.(null)}
        />
      </div>
    );
  },
);
