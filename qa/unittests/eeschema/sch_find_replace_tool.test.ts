/**
 * Find matching (counterpart eeschema/tools/sch_find_replace_tool.cpp +
 * EDA_ITEM::Matches): plain contains (case-insensitive by default),
 * whole-word, and wildcard whole-string modes, over labels/fields/pins/
 * sheets/text.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '@ziroeda/sexpr';
import { readSchematic } from '@ziroeda/eeschema';
import { matchesText, findMatches, defaultSearchData, type SchSearchData } from '@ziroeda/eeschema';

const data = (over: Partial<SchSearchData>): SchSearchData => ({
  ...defaultSearchData(),
  ...over,
});

describe('matchesText (EDA_ITEM::Matches)', () => {
  it('plain mode is case-insensitive contains; Match case restricts it', () => {
    expect(matchesText('Net_VCC_3V3', data({ findString: 'vcc' }))).toBe(true);
    expect(matchesText('Net_VCC_3V3', data({ findString: 'vcc', matchCase: true }))).toBe(false);
    expect(matchesText('Net_VCC_3V3', data({ findString: 'VCC', matchCase: true }))).toBe(true);
  });

  it('whole-word mode requires word boundaries', () => {
    expect(matchesText('VCC rail', data({ findString: 'VCC', matchMode: 'wholeword' }))).toBe(true);
    expect(matchesText('VCCIO', data({ findString: 'VCC', matchMode: 'wholeword' }))).toBe(false);
  });

  it('wildcard mode matches the whole string with * and ?', () => {
    expect(matchesText('R15', data({ findString: 'R?5', matchMode: 'wildcard' }))).toBe(true);
    expect(matchesText('R15', data({ findString: 'R*', matchMode: 'wildcard' }))).toBe(true);
    expect(matchesText('CR15', data({ findString: 'R*', matchMode: 'wildcard' }))).toBe(false);
  });

  it('an empty search string never matches', () => {
    expect(matchesText('anything', data({ findString: '' }))).toBe(false);
  });
});

const SCH = `(kicad_sch (version 20231120) (generator "test") (paper "A4")
  (lib_symbols (symbol "Device:R" (pin_numbers hide) (property "Reference" "R" (at 0 0 0))
    (symbol "R_1_1"
      (pin passive line (at 0 100 270) (length 100) (name "~" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
      (pin passive line (at 0 -100 90) (length 100) (name "~" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27))))))))
  (symbol (lib_id "Device:R") (at 100 50 0) (uuid "sym-1")
    (property "Reference" "R42" (at 100 45 0))
    (property "Value" "10k" (at 100 55 0))
    (property "MPN" "RC0603" (at 100 60 0) (effects (font (size 1.27 1.27)) hide)))
  (label "VCC_RAIL" (at 200 100 0) (uuid "lab-1") (effects (font (size 1.27 1.27))))
  (text "review this net" (at 300 200 0) (uuid "txt-1") (effects (font (size 1.27 1.27))))
)`;

describe('findMatches', () => {
  const doc = readSchematic(parse(SCH));
  const libById = new Map(doc.libSymbols.map((l) => [l.libId, l]));

  it('finds labels and plain text', () => {
    const hits = findMatches(doc, libById, data({ findString: 'vcc' }));
    expect(hits.map((h) => h.kind)).toEqual(['label']);
    const txt = findMatches(doc, libById, data({ findString: 'review' }));
    expect(txt.map((h) => h.kind)).toEqual(['label']); // plain text is a label of kind 'text'
  });

  it('finds visible symbol fields; hidden ones only with searchAllFields', () => {
    expect(findMatches(doc, libById, data({ findString: 'R42' }))).toHaveLength(1);
    expect(findMatches(doc, libById, data({ findString: 'RC0603' }))).toHaveLength(0);
    expect(
      findMatches(doc, libById, data({ findString: 'RC0603', searchAllFields: true })),
    ).toHaveLength(1);
  });

  it('finds pin numbers only with searchAllPins', () => {
    expect(
      findMatches(doc, libById, data({ findString: '2', matchMode: 'wholeword' })),
    ).toHaveLength(0);
    const hits = findMatches(
      doc,
      libById,
      data({ findString: '2', matchMode: 'wholeword', searchAllPins: true }),
    );
    expect(hits.map((h) => h.kind)).toEqual(['symbol']);
  });
});
