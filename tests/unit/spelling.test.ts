import { describe, expect, it } from 'vitest';
import { allowedDistance, baseForms, checkSpelling, editDistance, normalizeAnswer, usesWord } from '../../src/lib/spelling';

describe('edit distance', () => {
  it('handles the basic cases', () => {
    expect(editDistance('', '')).toBe(0);
    expect(editDistance('abc', '')).toBe(3);
    expect(editDistance('', 'abc')).toBe(3);
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(editDistance('plausible', 'plausible')).toBe(0);
  });
  it('counts one swap of neighboring letters as a single slip', () => {
    expect(editDistance('recieve', 'receive')).toBe(1);
    expect(editDistance('ambigouus', 'ambiguous')).toBe(1);
  });
  it('is symmetric', () => {
    expect(editDistance('austere', 'auster')).toBe(editDistance('auster', 'austere'));
  });
});

describe('forgiving spelling check', () => {
  it('normalizes case, spaces, and stray characters', () => {
    expect(normalizeAnswer('  Plausible. ')).toBe('plausible');
    expect(normalizeAnswer('WELL-BEING')).toBe('well-being');
  });

  it('forgives more slips in longer words', () => {
    expect(allowedDistance(4)).toBe(0);
    expect(allowedDistance(5)).toBe(1);
    expect(allowedDistance(8)).toBe(1);
    expect(allowedDistance(9)).toBe(2);
  });

  it('accepts exact answers and inflected forms', () => {
    expect(checkSpelling('plausible', 'plausible').verdict).toBe('exact');
    expect(checkSpelling('Plausible ', 'plausible').verdict).toBe('exact');
    expect(checkSpelling('necessitated', 'necessitate').verdict).toBe('exact');
    expect(checkSpelling('undermines', 'undermine').verdict).toBe('exact');
    expect(checkSpelling('refuting', 'refute').verdict).toBe('exact');
    expect(checkSpelling('rebutted', 'rebut').verdict).toBe('exact');
    expect(checkSpelling('vilified', 'vilify').verdict).toBe('exact');
  });

  it('accepts small typos as close', () => {
    expect(checkSpelling('plausable', 'plausible').verdict).toBe('close');
    expect(checkSpelling('ambigous', 'ambiguous').verdict).toBe('close');
    expect(checkSpelling('benevolant', 'benevolent').verdict).toBe('close');
    expect(checkSpelling('concientous', 'conscientious').verdict).toBe('close');
  });

  it('rejects answers that are too far off', () => {
    expect(checkSpelling('plosibel', 'plausible').verdict).toBe('wrong');
    expect(checkSpelling('', 'plausible').verdict).toBe('wrong');
    expect(checkSpelling('happy', 'plausible').verdict).toBe('wrong');
  });

  it('does not forgive typos in short words', () => {
    expect(checkSpelling('aped', 'abet').verdict).toBe('wrong');
    expect(checkSpelling('abet', 'abet').verdict).toBe('exact');
  });

  it('never accepts a different list word as a typo', () => {
    const list = new Set(['elicit', 'illicit', 'affect', 'effect', 'averse', 'adverse']);
    expect(checkSpelling('elicit', 'illicit', list).verdict).toBe('other-word');
    expect(checkSpelling('adverse', 'averse', list).verdict).toBe('other-word');
    expect(checkSpelling('averse', 'averse', list).verdict).toBe('exact');
    // Without the list it would have been taken for a typo.
    expect(checkSpelling('adverse', 'averse').verdict).toBe('close');
  });

  it('generates sensible base forms', () => {
    expect(baseForms('studies')).toContain('study');
    expect(baseForms('running')).toContain('run');
    expect(baseForms('making')).toContain('make');
    expect(baseForms('quickly')).toContain('quick');
  });

  it('checks that a sentence uses the word', () => {
    expect(usesWord('My excuse for being late was not very plausible.', 'plausible')).toBe(true);
    expect(usesWord('The storm necessitated a change of plans.', 'necessitate')).toBe(true);
    expect(usesWord('She scrutinizes every receipt.', 'scrutinize')).toBe(true);
    expect(usesWord('I like pizza a lot.', 'plausible')).toBe(false);
    expect(usesWord('', 'plausible')).toBe(false);
  });
});
