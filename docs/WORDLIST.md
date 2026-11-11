# How the word list was built

Final list: **1,063 words**, stored in `data/wordlist.json` with each word's rank,
source count, source names, frequency score, and difficulty tier. The full entries
live in `data/words/batch-*.json`.

## 1. Sources

College Board publishes no official SAT word list, and its site, like the main
prep company sites, could not be opened from the build environment (see
docs/RESEARCH.md, section 5). The lists below were therefore read from public
GitHub mirrors, where each is stored as plain data. Only the headwords were
used. No definitions, sentences, or other text were copied from any source.

| # | List | Words read | Mirror used | Weight |
| --- | --- | --- | --- | --- |
| 1 | Words from College Board Bluebook practice tests 4 to 10 and the SAT Suite Question Bank, as compiled by a student project | 115 | `pranaamgandotra/sat-vocab-trainer` | 3 |
| 2 | PrepScholar, "262 SAT Vocab Words You Must Know" (PrepScholar states these come from official practice tests and other lists) | 262 | `shirin05/SAT-Vocab-Mastery` | 2 |
| 3 | PrepPros Digital SAT vocabulary, levels 1 to 3 | 390 | `Sangam067/SAT-Vocab` | 2 |
| 4 | SAT VocabMaster themed Digital SAT sets (research words, argument words, and so on) | 121 | `Sangam067/SAT-Vocab` | 1 |
| 5 | SAT Vocab Builder curated list, tiered by exam frequency | 550 | `JackJames177/sat-vocab-builder` | 1 |
| 6 | Barron's high-frequency SAT words | 294 | `SABERiyan/Barrons333.github.io` | 1 |
| 7 | SparkNotes, "The 1000 Most Common SAT Words" | 989 | `GTRAN7/vocablearner` | 1 |
| 8 | MajorTests SAT word lists | 998 | `lrojas94/SAT-Words` | 1 |
| 9 | Sesamewords SAT lists (top, mid, and low frequency tiers) | 3,875 | `Gandalf3244/sat-vocab` | 1, 0.5, 0.25 |
| 10 | SAT list from the `english-vocabulary` collection | 4,456 | `KyleBing/english-vocabulary` | 0.5 |
| 11 | "TD SAT Golden Words" passage vocabulary | 1,761 | `tntsg1/WordWeave` | 0.5 |

Notes on the sources:

- Lists 1 to 4 were built for the Digital SAT, so they carry more weight. Lists
  6 to 9 are well-known older lists; they add agreement but also contain rarer
  words from the pre-2016 test, which the frequency filter below removes.
- List 1 is the only one tied directly to official practice material. It is a
  student compilation and could not be checked against the tests themselves.
- Two other mirrors turned out to be copies of lists 2 and 7 and were not counted
  twice. One list marked as licensed by a tutoring company was left out.
- Frequency data comes from the open `wordfreq` package (Zipf scale), the same
  kind of measure College Board describes using for its own word pool.

## 2. Merge and rank

1. Each list was reduced to lowercase single-word headwords (3 to 20 letters).
2. The lists were merged into 7,564 distinct words. For each word the script
   records **source count** (how many of the 11 lists include it) and a weighted
   score (the sum of the weights above).
3. Words are ranked by source count, then weighted score, then frequency.
   `rank` 1 is the word most lists agree on.

## 3. Selection rules

A word was kept when it met one of these:

- in 5 or more lists;
- in 4 lists, and either not rare (Zipf 2.3 or higher) or in a Digital SAT list;
- in 3 lists, and either Zipf 2.6 or higher, or in a Digital SAT list with Zipf
  2.2 or higher;
- in 2 lists including a Digital SAT list, with Zipf from 2.6 to 4.9;
- in list 1 or list 2 only, within the academic frequency band.

Words with Zipf 5.0 or higher (everyday words) were dropped. This produced 1,153
candidates.

## 4. Editorial pass

The goal of the pass was the brief's instruction to favor useful academic words
over rare ones. Three kinds of change were made by hand:

- **Word-family duplicates removed** (67 words). When two forms of one word were
  both selected, the more useful form stayed: *ambivalent* stays, *ambivalence*
  goes.
- **Off-target words removed** (about 190). These were discipline labels
  (*ornithology*), concrete or dated words from the old test (*zephyr*, *dirge*),
  and very easy words (*enormous*, *identical*). No word found in 5 or more
  lists was removed for being hard.
- **Editor's picks added** (73 words, marked `editorPick` in the data). These
  are high-utility academic words of the kind the Digital SAT uses as answer
  choices but that older lists under-count: *counterintuitive*, *inconclusive*,
  *provisional*, *negligible*, *replicate*, *hypothesize*, and common words
  tested in a less common sense, such as *harbor*, *champion*, *qualify*,
  *grave*, and *weather*.

The exact lists are in `scripts/wordlist/3_select.py` and
`scripts/wordlist/4_editorial.py`.

## 5. Difficulty tiers

Tiers come from word frequency, not from opinion:

| Tier | Zipf frequency | Meaning |
| --- | --- | --- |
| 1 | 3.4 and up | Seen fairly often in general reading |
| 2 | 2.9 to 3.39 | Academic words met mainly in school texts |
| 3 | below 2.9 | Less common words |

## 6. Writing the entries

Every definition, sentence, passage, and explanation was written for this
project. Entries were written in batches of 50, in rank order. Each batch was
compiled with `scripts/compile-batch.mjs`, checked with
`scripts/validate-data.mjs`, compared with WordNet 3.1 using
`scripts/check-wordnet.mjs`, and committed before the next batch began.

What the validator enforces (the build fails otherwise):

- no duplicate words, every required field present;
- exactly 3 example sentences in 3 different settings, each containing the word;
- synonyms and antonyms drawn from the merged SAT word pool;
- word parts that exist in `data/roots.json`;
- each question has a 25 to 150 word passage with exactly one blank, 4 unique
  choices, exactly one correct answer that is a form of the entry word, and 3
  explained distractors that are real SAT-list words;
- no distractor that is also listed as a synonym of the answer;
- no distractor reused more than 12 times across the whole dataset;
- no repeated sentences or passages; no em dashes.

WordNet check: the word must exist in WordNet with the stated part of speech,
and any entry whose definition and synonyms share no content word with WordNet's
glosses is flagged and reviewed by hand.

## 7. Roots dataset

`data/roots.json` holds 135 prefixes, roots, and suffixes (35 prefixes, 81
roots, 19 suffixes), chosen because they recur in this word list. Word entries
point to them by id, and the build script writes the reverse links (root to
words) into `public/data/roots.json`.

## 8. Reproducing the list

The scripts in `scripts/wordlist/` are the ones used. They expect the mirror
files in a local folder and the Python package `wordfreq`. The downloaded source
files are not stored in this repository.
