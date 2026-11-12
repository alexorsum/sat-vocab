# Plan

Goal: a free, offline-capable SAT vocabulary study app for a high school student
preparing for the Digital SAT, built on learning science and a researched,
validated list of 1,000+ words.

## Phase 1: Research (output: docs/RESEARCH.md)

1. Confirm how the Digital SAT tests vocabulary (Words in Context format) from
   College Board and reputable prep sources.
2. Summarize the evidence on vocabulary learning: spaced repetition, retrieval
   practice, definition plus varied contexts, morphology, interleaving, the
   generation effect, explanatory feedback, and mnemonics.
3. Compare the SM-2 and FSRS schedulers and pick one.
4. Turn the findings into numbered design rules (R1, R2, ...). Every study
   feature must cite at least one rule.
5. List any site that could not be reached from the cloud environment.

## Phase 2: Word list (output: data/, docs/WORDLIST.md)

1. Collect at least 5 reputable SAT word lists, favoring Digital SAT lists and
   words seen in official College Board practice material.
2. Merge, de-duplicate, rank by number of sources, keep the top 1,000 to 1,200.
   Use a word-frequency corpus to drop very rare words and to set tiers.
3. Write the roots dataset first (about 100 roots, prefixes, and suffixes) so
   word entries can link to it.
4. Write every entry by hand in batches of about 50: definition, connotation,
   3 original sentences in different settings, synonyms, antonyms, word parts,
   confused words, and one original Words in Context question with explained
   distractors.
5. Validate each batch with `scripts/validate-data.mjs` (duplicates, missing
   fields, exactly one correct answer, repeated distractors, passage length,
   links to roots) and check each word against WordNet. Commit after each batch.
6. The app build fails if validation fails.

## Phase 3: App (React + TypeScript + Vite PWA)

- Storage: IndexedDB (cards, review log, mistakes, settings) with JSON export
  and import. No login, no server.
- Scheduler: chosen in Phase 1, implemented as a pure, unit-tested module.
- Features: Daily Review, Learn New Words, Words in Context Practice, Quiz modes
  (typed recall, multiple choice both ways, synonym and antonym matching,
  connotation sorting), Roots Explorer, Mistake Log, Word Browser, Progress
  Dashboard, 60 second game, and a "How This App Works" page.
- Design: calm and fast, light and dark themes, keyboard shortcuts, large tap
  targets, screen reader labels, optional speech synthesis audio.

## Phase 4: Test and check

- Vitest unit tests: scheduler, quiz scoring, spelling check, data validation.
- Playwright end to end tests for every feature at phone and laptop sizes.
- Confirm 1,000+ unique words and spot-check 30 random entries.

## Phase 5: Save, deploy, deliver

- Small commits, pushed regularly to the working branch.
- GitHub Actions: CI (validation, unit tests, build, end to end tests) on every
  push, and a Pages deploy workflow with Vite base path `/sat-vocab/`.
- README (live link, local setup, phone install, backups), docs/RESEARCH.md,
  docs/WORDLIST.md.
- Final note listing the one-time GitHub steps the repo owner must do.

## Order of work

1. docs/PLAN.md (this file)
2. Research and docs/RESEARCH.md
3. Project scaffold, data schema, validator, roots dataset
4. Word list selection, then content batches (commit per batch)
5. App core (storage, scheduler, shell), then features one by one
6. Unit tests alongside each pure module, then Playwright tests
7. CI and deploy workflows, README, final checks

## Status

All five phases are complete.

- Research: docs/RESEARCH.md (test format, learning science, FSRS-6 chosen
  over SM-2, design rules R1 to R12, unreachable sites).
- Word list: 1,063 validated entries and 135 roots and affixes
  (docs/WORDLIST.md has the sources, checks, and known limits).
- App: all ten features, offline PWA, JSON backup.
- Tests: 79 unit tests and 44 end-to-end tests run at phone and laptop sizes,
  including offline use and accessibility checks in light and dark mode.
- Delivery: CI and Pages deploy workflows, README.

Left for the repository owner: turn on GitHub Pages (README, "Deploying").
