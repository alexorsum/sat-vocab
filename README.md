# SAT Vocab

A free study app for the vocabulary side of the Digital SAT. It teaches 1,063
high-value words with spaced review and practices them in the same
"Words in Context" format the test uses. It runs in the browser, installs on a
phone or laptop, works offline, and needs no account.

**Live app:** https://alexorsum.github.io/sat-vocab/

## What is in it

| Feature | What it does |
| --- | --- |
| Daily Review | Shows the words due today. You recall first, then reveal, then rate Again, Hard, Good, or Easy. An FSRS scheduler picks the next date. |
| Learn New Words | Batches of 10 by default. Each word shows its meaning, three sentences in different settings, word parts, and look-alike words. After a one-question check you write your own sentence. |
| Words in Context | SAT-style questions, timed (71 seconds each, the real pace) or untimed, with an explanation of all four choices. |
| Quiz | Typed recall with forgiving spelling, multiple choice both ways, synonym and antonym matching, and tone sorting. Mixed by default. |
| Roots Explorer | 135 prefixes, roots, and suffixes with their word families, plus a roots quiz. |
| Mistake Log | Every miss with its reason (wrong meaning, wrong tone, confused word, too extreme, and more) and one-tap drills of missed words. |
| Word Browser | Search and filter by tier, part of speech, root, and status. Star words and add your own memory tricks. |
| Progress | Words seen, learning, and mastered; retention rate; streak; study calendar; 14-day review forecast. |
| Speed Game | A 60 second match-or-not sprint. |
| How This App Works | The learning science behind each feature, in plain language, with sources. |

Also: light and dark mode, keyboard shortcuts, large tap targets, screen reader
labels, and optional audio using the browser's built-in voice.

## Install it on your phone

The app is a web page that can be added to your home screen. After the first
visit it works without a connection.

**iPhone or iPad (Safari)**

1. Open the live link in Safari.
2. Tap the Share button.
3. Tap **Add to Home Screen**, then **Add**.

**Android (Chrome)**

1. Open the live link in Chrome.
2. Tap the three-dot menu.
3. Tap **Add to Home screen** or **Install app**.

**Laptop (Chrome or Edge)**

Open the live link and click the install icon at the right end of the address
bar, or use the browser menu and choose **Install SAT Vocab**.

On an iPhone, add the app to the Home Screen before you start studying. Safari
can clear saved data for websites that are not opened for a while, and Home
Screen apps are treated more gently.

## Back up your progress

Your progress is stored only in the browser on the device you use. There is no
account and nothing is uploaded. That also means clearing your browser data, or
switching phones, loses your progress unless you have a backup.

- **Export:** Settings, then **Export backup**. This saves a file named
  `sat-vocab-backup-YYYY-MM-DD.json`. Keep it somewhere safe, such as your
  cloud drive or an email to yourself. Once a week is a good habit.
- **Import:** Settings, then **Import backup**, and choose the file. Importing
  replaces what is on the device.
- **Move to a new device:** export on the old one, send yourself the file,
  import on the new one.

## Run it on your own computer

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173/sat-vocab/.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run validate` | Checks the word data (duplicates, missing fields, one correct answer, repeated distractors, and more). |
| `npm run check:wordnet` | Compares every entry with the WordNet dictionary. |
| `npm test` | Unit tests: scheduler, spelling check, quiz scoring, data rules, backup. |
| `npm run build` | Validates the data, then builds the app into `dist/`. The build fails if validation fails. |
| `npm run preview` | Serves the built app at http://localhost:4173/sat-vocab/. |
| `npm run test:e2e` | End-to-end tests in a headless browser at phone and laptop sizes. Run `npm run build` first. The first time, also run `npx playwright install chromium`. |
| `node scripts/spot-check.mjs` | Prints 30 random entries beside their dictionary senses for a manual accuracy check. |

## How the project is organized

```
data/
  wordlist.json        the ranked list of 1,063 words and where each came from
  words/batch-NN.json  the full entries, 50 per file (the source of truth)
  roots.json           135 prefixes, roots, and suffixes
scripts/               data validation, build, and dictionary checks
src/
  lib/                 scheduler (FSRS), spelling, quiz building, scoring
  db/                  IndexedDB storage and backup
  pages/               one file per screen
tests/unit/            Vitest tests
tests/e2e/             Playwright tests
docs/
  PLAN.md              the build plan
  RESEARCH.md          test format, learning science, scheduler choice, design rules
  WORDLIST.md          how the word list was built and checked
```

To fix or improve a word, edit its entry in `data/words/`, then run
`npm run validate`.

## Deploying

Two GitHub Actions workflows are included:

- **CI** (`.github/workflows/ci.yml`) runs on every push: word list validation,
  the dictionary check, type checking, unit tests, a production build, and the
  end-to-end tests.
- **Deploy to GitHub Pages** (`.github/workflows/deploy.yml`) builds the app and
  publishes it. It runs on every push to the default branch and can also be
  started by hand from the Actions tab.

GitHub Pages is turned on for this repository with **Source** set to
**GitHub Actions** (Settings, then Pages). If you copy the project to a new
repository, set that once, then run the deploy workflow from the Actions tab.

The app is built for the path `/sat-vocab/` (set as `base` in `vite.config.ts`).
If the repository is renamed, change that path to match.

## About the content

Every definition, sentence, passage, and explanation was written for this
project. Only the headwords were taken from published SAT word lists, to decide
which words to include. The details, the accuracy checks, and the known limits
are in [docs/WORDLIST.md](docs/WORDLIST.md). The research behind the design is
in [docs/RESEARCH.md](docs/RESEARCH.md).

This project is not affiliated with or endorsed by College Board. SAT is a
trademark registered by College Board.
