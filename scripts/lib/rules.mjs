// Shared data rules used by the validator, the batch compiler, and the unit tests.
// Pure functions only: no file access here.

export const POS = ['noun', 'verb', 'adjective', 'adverb'];
export const CONNOTATIONS = ['positive', 'negative', 'neutral'];
export const SETTINGS = ['science', 'history', 'literature', 'everyday'];
export const REASONS = {
  m: 'wrong-meaning',
  t: 'wrong-tone',
  o: 'opposite',
  e: 'too-extreme',
  c: 'confused-word',
  u: 'wrong-context',
};
export const REASON_VALUES = Object.values(REASONS);
export const BLANK = '______';

export function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Possible base forms for an inflected word, most specific first. */
export function lemmaCandidates(form) {
  const f = form.toLowerCase().trim();
  const out = new Set([f]);
  const add = (s) => {
    if (s.length >= 3) out.add(s);
  };
  if (f.endsWith('ies')) add(f.slice(0, -3) + 'y');
  if (f.endsWith('ied')) add(f.slice(0, -3) + 'y');
  if (f.endsWith('es')) add(f.slice(0, -2));
  if (f.endsWith('s')) add(f.slice(0, -1));
  if (f.endsWith('ed')) {
    add(f.slice(0, -2));
    add(f.slice(0, -1));
    if (f.length > 4 && f[f.length - 3] === f[f.length - 4]) add(f.slice(0, -3));
  }
  if (f.endsWith('ing')) {
    add(f.slice(0, -3));
    add(f.slice(0, -3) + 'e');
    if (f.length > 5 && f[f.length - 4] === f[f.length - 5]) add(f.slice(0, -4));
  }
  if (f.endsWith('ly')) {
    add(f.slice(0, -2));
    if (f.endsWith('ily')) add(f.slice(0, -3) + 'y');
    if (f.endsWith('ally')) add(f.slice(0, -4));
    if (f.endsWith('bly')) add(f.slice(0, -1) + 'e');
  }
  return [...out];
}

/** Resolve the dictionary form of a choice against a set of known words. */
export function resolveLemma(form, known) {
  for (const c of lemmaCandidates(form)) if (known.has(c)) return c;
  return null;
}

/** True when the text contains the word or a likely inflected or derived form. */
export function containsWordForm(text, word) {
  const t = text.toLowerCase();
  const w = word.toLowerCase();
  if (new RegExp(`\\b${escapeRe(w)}`).test(t)) return true;
  // Handle stems that change: "deny" -> "denied", "abate" -> "abating".
  const stem = w.length > 5 ? w.slice(0, w.length - 2) : w.slice(0, Math.max(3, w.length - 1));
  return new RegExp(`\\b${escapeRe(stem)}`).test(t);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const BAD_CHARS = /[\u2013\u2014\u2015]/; // en dash, em dash, horizontal bar

function checkText(label, text, errors) {
  if (typeof text !== 'string' || !text.trim()) {
    errors.push(`${label}: missing text`);
    return;
  }
  if (BAD_CHARS.test(text)) errors.push(`${label}: contains an en dash or em dash`);
  if (/\s{2,}/.test(text)) errors.push(`${label}: contains double spaces`);
  if (text !== text.trim()) errors.push(`${label}: has leading or trailing space`);
}

/**
 * Validate one word entry. Returns a list of error strings (empty when valid).
 * ctx: { rootIds:Set, pool:Set (SAT list words, used for distractors),
 *        synPool:Set (pool plus academic-band words, used for synonyms), listWords:Set }
 */
export function validateEntry(e, ctx) {
  const errors = [];
  const id = e?.word ?? '(no word)';
  const err = (m) => errors.push(`${id}: ${m}`);
  if (!e || typeof e !== 'object') return ['entry is not an object'];

  if (typeof e.word !== 'string' || !/^[a-z]+$/.test(e.word)) err('word must be lowercase letters');
  if (e.id !== e.word) err('id must equal word');
  if (!POS.includes(e.pos)) err(`pos "${e.pos}" is not one of ${POS.join(', ')}`);
  if (![1, 2, 3].includes(e.tier)) err('tier must be 1, 2, or 3');
  if (!Number.isInteger(e.rank) || e.rank < 1) err('rank must be a positive integer');
  if (!Number.isInteger(e.sourceCount) || e.sourceCount < 0) err('sourceCount must be a non-negative integer');
  if (!CONNOTATIONS.includes(e.connotation)) err(`connotation "${e.connotation}" is invalid`);

  checkText(`${id} definition`, e.definition, errors);
  if (typeof e.definition === 'string') {
    const n = countWords(e.definition);
    if (n < 2 || n > 28) err(`definition should be 2 to 28 words (has ${n})`);
    if (new RegExp(`\\b${e.word}\\b`, 'i').test(e.definition)) err('definition uses the word itself');
  }

  // Examples
  if (!Array.isArray(e.examples) || e.examples.length !== 3) {
    err('needs exactly 3 examples');
  } else {
    const settings = new Set();
    const texts = new Set();
    e.examples.forEach((ex, i) => {
      if (!SETTINGS.includes(ex.setting)) err(`example ${i + 1} has invalid setting "${ex.setting}"`);
      settings.add(ex.setting);
      checkText(`${id} example ${i + 1}`, ex.text, errors);
      if (typeof ex.text === 'string') {
        const n = countWords(ex.text);
        if (n < 6 || n > 45) err(`example ${i + 1} should be 6 to 45 words (has ${n})`);
        if (!containsWordForm(ex.text, e.word)) err(`example ${i + 1} does not contain the word`);
        if (!/[.!?"']$/.test(ex.text)) err(`example ${i + 1} should end with punctuation`);
        texts.add(ex.text.toLowerCase());
      }
    });
    if (settings.size !== 3) err('the 3 examples must use 3 different settings');
    if (texts.size !== 3) err('examples are repeated');
  }

  // Synonyms and antonyms
  const syn = Array.isArray(e.synonyms) ? e.synonyms : null;
  const ant = Array.isArray(e.antonyms) ? e.antonyms : null;
  if (!syn || syn.length < 1 || syn.length > 6) err('needs 1 to 6 synonyms');
  if (!ant || ant.length > 5) err('antonyms must be a list of up to 5');
  for (const [label, list] of [['synonym', syn ?? []], ['antonym', ant ?? []]]) {
    const seen = new Set();
    for (const w of list) {
      if (typeof w !== 'string' || !/^[a-z]+$/.test(w)) err(`${label} "${w}" must be one lowercase word`);
      else if (w === e.word) err(`${label} repeats the word itself`);
      else if (!(ctx.synPool ?? ctx.pool).has(w)) err(`${label} "${w}" is not an SAT-list or academic-band word`);
      if (seen.has(w)) err(`${label} "${w}" is repeated`);
      seen.add(w);
    }
  }
  if (syn && ant) for (const w of syn) if (ant.includes(w)) err(`"${w}" is listed as both synonym and antonym`);

  // Word parts
  if (!Array.isArray(e.parts)) err('parts must be a list (may be empty)');
  else for (const p of e.parts) if (!ctx.rootIds.has(p)) err(`part "${p}" is not in the roots dataset`);
  if (e.partsNote !== undefined) checkText(`${id} partsNote`, e.partsNote, errors);

  // Confused words
  if (!Array.isArray(e.confused)) err('confused must be a list (may be empty)');
  else
    e.confused.forEach((c, i) => {
      if (typeof c.word !== 'string' || !/^[a-z]+$/.test(c.word)) err(`confused ${i + 1} needs a lowercase word`);
      if (c.word === e.word) err('confused word repeats the word itself');
      checkText(`${id} confused ${i + 1} note`, c.note, errors);
    });

  // Questions
  if (!Array.isArray(e.questions) || e.questions.length < 1) {
    err('needs at least 1 question');
  } else {
    e.questions.forEach((q, i) => {
      for (const m of validateQuestion(q, e, ctx)) err(`question ${i + 1}: ${m}`);
    });
  }
  return errors;
}

/** Validate one Words in Context question for entry e. Returns messages without the word prefix. */
export function validateQuestion(q, e, ctx) {
  const out = [];
  const textErrs = [];
  checkText('passage', q.passage, textErrs);
  checkText('explanation', q.explanation, textErrs);
  out.push(...textErrs);
  if (typeof q.passage === 'string') {
    const blanks = q.passage.split(BLANK).length - 1;
    if (blanks !== 1) out.push(`passage must contain exactly one blank (${BLANK}), found ${blanks}`);
    if (/_{7,}/.test(q.passage) || /(^|[^_])_{1,5}([^_]|$)/.test(q.passage)) out.push('blank must be exactly 6 underscores');
    const n = countWords(q.passage);
    if (n < 25 || n > 150) out.push(`passage must be 25 to 150 words (has ${n})`);
    if (e.word && new RegExp(`\\b${e.word}`, 'i').test(q.passage)) out.push('passage gives away the answer word');
  }
  if (!Array.isArray(q.choices) || q.choices.length !== 4) {
    out.push('needs exactly 4 choices');
    return out;
  }
  const lower = q.choices.map((c) => String(c).toLowerCase());
  if (new Set(lower).size !== 4) out.push('choices are repeated');
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
    out.push('answer must be an index from 0 to 3');
    return out;
  }
  const correct = q.choices[q.answer];
  const correctLemma = q.answerLemma ?? resolveLemma(correct, new Set([e.word]));
  if (correctLemma !== e.word) out.push(`correct choice "${correct}" is not a form of the word`);

  if (!Array.isArray(q.distractors) || q.distractors.length !== 3) {
    out.push('needs exactly 3 explained distractors');
    return out;
  }
  const dChoices = q.distractors.map((d) => String(d.choice).toLowerCase());
  const wrong = lower.filter((_, i) => i !== q.answer);
  if (dChoices.slice().sort().join('|') !== wrong.slice().sort().join('|')) {
    out.push('distractor explanations do not match the 3 wrong choices (so there is not exactly one correct answer)');
  }
  const lemmas = new Set();
  for (const d of q.distractors) {
    if (!REASON_VALUES.includes(d.reason)) out.push(`distractor "${d.choice}" has invalid reason "${d.reason}"`);
    const dErr = [];
    checkText(`distractor "${d.choice}" explanation`, d.why, dErr);
    out.push(...dErr);
    const lemma = d.lemma;
    if (!lemma || !ctx.pool.has(lemma)) out.push(`distractor "${d.choice}" is not a known SAT word (lemma "${lemma}")`);
    if (lemma === e.word) out.push(`distractor "${d.choice}" is the answer word`);
    if (Array.isArray(e.synonyms) && e.synonyms.includes(lemma)) {
      out.push(`distractor "${d.choice}" is listed as a synonym of the answer, so it may also be correct`);
    }
    if (lemmas.has(lemma)) out.push(`distractor lemma "${lemma}" is repeated`);
    lemmas.add(lemma);
  }
  return out;
}

/** Dataset-level checks across all entries. Returns { errors, warnings, stats }. */
export function validateDataset(entries, ctx, opts = {}) {
  const errors = [];
  const warnings = [];
  const seen = new Map();
  for (const e of entries) {
    if (seen.has(e.word)) errors.push(`duplicate word "${e.word}" (also in ${seen.get(e.word)})`);
    seen.set(e.word, e._file ?? 'dataset');
    errors.push(...validateEntry(e, ctx));
    if (ctx.listWords && !ctx.listWords.has(e.word)) errors.push(`${e.word}: not in data/wordlist.json`);
  }
  // Repeated distractors across the dataset.
  const use = new Map();
  for (const e of entries)
    for (const q of e.questions ?? [])
      for (const d of q.distractors ?? []) use.set(d.lemma, (use.get(d.lemma) ?? 0) + 1);
  const maxUse = opts.maxDistractorUse ?? 12;
  const warnUse = opts.warnDistractorUse ?? 8;
  for (const [lemma, n] of use) {
    if (n > maxUse) errors.push(`distractor "${lemma}" is used ${n} times (limit ${maxUse})`);
    else if (n > warnUse) warnings.push(`distractor "${lemma}" is used ${n} times`);
  }
  // Duplicate passages or sentences.
  const texts = new Map();
  for (const e of entries) {
    for (const ex of e.examples ?? []) {
      const k = String(ex.text).toLowerCase();
      if (texts.has(k)) errors.push(`${e.word}: example sentence duplicates one in "${texts.get(k)}"`);
      texts.set(k, e.word);
    }
    for (const q of e.questions ?? []) {
      const k = String(q.passage).toLowerCase();
      if (texts.has(k)) errors.push(`${e.word}: passage duplicates one in "${texts.get(k)}"`);
      texts.set(k, e.word);
    }
  }
  if (opts.minWords && entries.length < opts.minWords) {
    errors.push(`dataset has ${entries.length} words; at least ${opts.minWords} are required`);
  }
  if (opts.requireComplete && ctx.listWords) {
    for (const w of ctx.listWords) if (!seen.has(w)) errors.push(`missing entry for list word "${w}"`);
  }
  return { errors, warnings, stats: { words: entries.length, distinctDistractors: use.size } };
}

/** Validate the roots dataset. */
export function validateRoots(roots) {
  const errors = [];
  const ids = new Set();
  for (const r of roots) {
    if (!r.id || ids.has(r.id)) errors.push(`root id "${r.id}" is missing or duplicated`);
    ids.add(r.id);
    if (!['prefix', 'root', 'suffix'].includes(r.type)) errors.push(`root ${r.id}: invalid type`);
    for (const k of ['form', 'origin', 'meaning']) if (!r[k] || typeof r[k] !== 'string') errors.push(`root ${r.id}: missing ${k}`);
    if (!Array.isArray(r.examples) || r.examples.length < 1) errors.push(`root ${r.id}: needs examples`);
  }
  return errors;
}
