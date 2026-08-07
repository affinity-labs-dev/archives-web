import { describe, it, expect } from 'vitest';
import { parseExplanations } from '../explain-parse.js';

// Every shape here has been seen from this exact model call in the mobile
// backend. The contract under test: never throw, always return exactly
// `count` entries, each {explanation} or null - and never smuggle model
// preamble through as if it were an explanation.

const THREE = [
  { explanation: 'The Umayyads ruled from Damascus.' },
  { explanation: 'Tariq ibn Ziyad crossed in 711.' },
  { explanation: 'Cordoba became the capital.' },
];

describe('parseExplanations', () => {
  it('parses a bare JSON array', () => {
    expect(parseExplanations(JSON.stringify(THREE), 3)).toEqual(THREE);
  });

  it('parses a fenced array, with or without a language tag', () => {
    const body = JSON.stringify(THREE);
    expect(parseExplanations('```json\n' + body + '\n```', 3)).toEqual(THREE);
    expect(parseExplanations('```\n' + body + '\n```', 3)).toEqual(THREE);
  });

  it('recovers an array buried in prose preamble', () => {
    const raw = 'Here are the explanations you asked for:\n' + JSON.stringify(THREE) + '\nHope that helps!';
    expect(parseExplanations(raw, 3)).toEqual(THREE);
  });

  it('accepts bare strings in place of {explanation} objects', () => {
    const raw = JSON.stringify(['First fact.', 'Second fact.']);
    expect(parseExplanations(raw, 2)).toEqual([
      { explanation: 'First fact.' },
      { explanation: 'Second fact.' },
    ]);
  });

  it('survives brackets inside an explanation', () => {
    // The reason extraction slices from first [ to last ] instead of using a
    // regex: "the [caliph]" inside a string breaks lazy bracket matching.
    const tricky = [{ explanation: 'The ruler [the caliph] moved the capital.' }];
    const raw = 'Sure:\n' + JSON.stringify(tricky);
    expect(parseExplanations(raw, 1)).toEqual(tricky);
  });

  it('slices an over-long array and pads a short one', () => {
    expect(parseExplanations(JSON.stringify(THREE), 2)).toEqual(THREE.slice(0, 2));
    expect(parseExplanations(JSON.stringify(THREE.slice(0, 2)), 3)).toEqual([
      THREE[0],
      THREE[1],
      null,
    ]);
  });

  it('returns all nulls for truncated JSON', () => {
    const cut = JSON.stringify(THREE).slice(0, 40);
    expect(parseExplanations(cut, 3)).toEqual([null, null, null]);
  });

  it('never passes prose through as an explanation', () => {
    // The mobile fallback returned the whole raw blob as Q1. That put model
    // preamble on screen as history; the web contract is null instead.
    expect(parseExplanations('I could not produce JSON for this request.', 2)).toEqual([
      null,
      null,
    ]);
  });

  it('nulls empty, whitespace and malformed entries without losing position', () => {
    const raw = JSON.stringify([
      { explanation: '  ' },
      { explanation: 'Real content.' },
      { wrong: 'key' },
      42,
    ]);
    expect(parseExplanations(raw, 4)).toEqual([
      null,
      { explanation: 'Real content.' },
      null,
      null,
    ]);
  });

  it('handles garbage inputs without throwing', () => {
    for (const raw of ['', '   ', null, undefined, '{}', '[]', 'null', '"just a string"']) {
      expect(parseExplanations(raw, 2)).toEqual([null, null]);
    }
    expect(parseExplanations('[]', 0)).toEqual([]);
  });
});
