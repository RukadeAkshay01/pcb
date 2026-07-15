/**
 * Coupled microstrip lines — even/odd-mode quasi-static model (Garg–Bahl
 * style approximation built on the single-line Hammerstad–Jensen microstrip).
 * Counterpart: KiCad `pcb_calculator/transline/c_microstrip.cpp`.
 *
 * Accuracy note: this is the classic static approximation (no dispersion);
 * good to a few percent for 0.1 ≤ w/h ≤ 10, 0.1 ≤ s/h ≤ 10, εr ≤ 18.
 */

import { microstripAnalyze } from './microstrip.js';
import {
  type TranslineAnalysis,
  type TranslineAnalysis as _TA,
  bisectSolve,
  electricalLengthDeg,
  physicalLengthM,
  skinDepth,
} from './transline.js';

export interface CoupledMicrostripPhysical {
  /** Trace width (each line), m. */
  widthM: number;
  /** Gap between the traces, m. */
  gapM: number;
  /** Substrate height, m. */
  heightM: number;
  /** Copper thickness, m. */
  thicknessM: number;
  /** Line length, m. */
  lengthM: number;
}

export interface CoupledMicrostripResult extends TranslineAnalysis {
  extra: {
    z0Even: number;
    z0Odd: number;
    epsEffEven: number;
    epsEffOdd: number;
    /** Coupling factor k = (Ze−Zo)/(Ze+Zo). */
    coupling: number;
    /** Z0 (√(Ze·Zo)) and diff/common impedances. */
    zDiff: number;
    zComm: number;
  };
}

/**
 * Even/odd capacitance model: the single line's per-unit capacitance is
 * modified by the fringe/gap terms (Garg–Bahl). We work through the single
 * line analysis for the reference values and apply the coupling corrections.
 */
export function coupledMicrostripAnalyze(
  phys: CoupledMicrostripPhysical,
  el: import('./tc_common.js').TcElectrical,
): CoupledMicrostripResult {
  const { widthM: w, gapM: s, heightM: h, thicknessM: t, lengthM: len } = phys;
  const er = el.epsilonR;
  const u = w / h;
  const g = s / h;

  // Reference single microstrip.
  const single = microstripAnalyze({ widthM: w, heightM: h, thicknessM: t, lengthM: len }, el);

  // --- Effective permittivities (Kirschning–Jansen static fit) ---
  const v = (u * (20 + g * g)) / (10 + g * g) + g * Math.exp(-g);
  const aE =
    1 +
    (1 / 49) * Math.log((v ** 4 + (v / 52) ** 2) / (v ** 4 + 0.432)) +
    (1 / 18.7) * Math.log(1 + (v / 18.1) ** 3);
  const bE = 0.564 * ((er - 0.9) / (er + 3)) ** 0.053;
  const epsEffEven = (er + 1) / 2 + ((er - 1) / 2) * (1 + 10 / v) ** (-aE * bE);

  const epsEffSingle = single.epsEff;
  const a0 = 0.7287 * (epsEffSingle - (er + 1) / 2) * (1 - Math.exp(-0.179 * u));
  const b0 = (0.747 * er) / (0.15 + er);
  const c0 = b0 - (b0 - 0.207) * Math.exp(-0.414 * u);
  const d0 = 0.593 + 0.694 * Math.exp(-0.562 * u);
  const epsEffOdd = epsEffSingle + (a0 - epsEffSingle + (er + 1) / 2) * Math.exp(-c0 * g ** d0);

  // --- Even/odd impedances (Garg–Bahl static fit around the single line) ---
  const z0s = single.z0;
  // Even mode: gap capacitance decreases towards the single line as g→∞.
  const q1 = 0.8695 * u ** 0.194;
  const q2 = 1 + 0.7519 * g + 0.189 * g ** 2.31;
  const q3 =
    0.1975 +
    (16.6 + (8.4 / g) ** 6) ** -0.387 +
    (1 / 241) * Math.log(g ** 10 / (1 + (g / 3.4) ** 10));
  const q4 = ((2 * q1) / q2) * (1 / (u ** q3 * Math.exp(-g) + (2 - Math.exp(-g)) * u ** -q3));
  const z0Even =
    (z0s * Math.sqrt(epsEffSingle / epsEffEven)) /
    (1 - (q4 * Math.sqrt(epsEffSingle) * z0s) / 377.0);

  const q5 = 1.794 + 1.14 * Math.log(1 + 0.638 / (g + 0.517 * g ** 2.43));
  const q6 =
    0.2305 +
    (1 / 281.3) * Math.log(g ** 10 / (1 + (g / 5.8) ** 10)) +
    (1 / 5.1) * Math.log(1 + 0.598 * g ** 1.154);
  const q7 = (10 + 190 * g * g) / (1 + 82.3 * g ** 3);
  const q8 = Math.exp(-6.5 - 0.95 * Math.log(g) - (g / 0.15) ** 5);
  const q9 = Math.log(q7) * (q8 + 1 / 16.5);
  const q10 = q4 - (q5 / q2) * Math.exp((q9 * Math.log(u)) / u ** q6);
  const z0Odd =
    (z0s * Math.sqrt(epsEffSingle / epsEffOdd)) /
    (1 - (q10 * Math.sqrt(epsEffSingle) * z0s) / 377.0);

  const epsEffAvg = (epsEffEven + epsEffOdd) / 2;
  const coupling = (z0Even - z0Odd) / (z0Even + z0Odd);

  return {
    z0: Math.sqrt(z0Even * z0Odd),
    epsEff: epsEffAvg,
    angleDeg: electricalLengthDeg(len, el.frequencyHz, epsEffAvg),
    conductorLossDb: NaN,
    dielectricLossDb: NaN,
    skinDepthM: skinDepth(el.frequencyHz, el.sigma, el.murC),
    extra: {
      z0Even,
      z0Odd,
      epsEffEven,
      epsEffOdd,
      coupling,
      zDiff: 2 * z0Odd,
      zComm: z0Even / 2,
    },
  };
}

/**
 * Synthesis for a differential impedance: solve the gap for Zdiff with the
 * given width, then the length from the electrical angle.
 */
export function coupledMicrostripSynthesize(
  phys: CoupledMicrostripPhysical,
  el: import('./tc_common.js').TcElectrical,
  zDiffTarget: number,
  angleDeg: number,
): CoupledMicrostripPhysical | null {
  const zOf = (s: number): number => coupledMicrostripAnalyze({ ...phys, gapM: s }, el).extra.zDiff;
  const s = bisectSolve(zOf, zDiffTarget, phys.heightM * 0.01, phys.heightM * 20);
  if (!Number.isFinite(s)) return null;
  const eps = coupledMicrostripAnalyze({ ...phys, gapM: s }, el).epsEff;
  return { ...phys, gapM: s, lengthM: physicalLengthM(angleDeg, el.frequencyHz, eps) };
}
