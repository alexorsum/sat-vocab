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

A word was kept when it met one of these (Zipf is the `wordfreq` frequency
score; higher means more common):

- in 5 or more lists, unless it is extremely rare (Zipf below 1.8);
- in 4 lists, and either not rare (Zipf 2.3 or higher) or in a Digital SAT list;
- in 3 lists, and either Zipf 2.6 or higher, or in a Digital SAT list with Zipf
  2.2 or higher;
- in 2 lists including a Digital SAT list, with Zipf from 2.6 to 4.9;
- in list 1 only (Zipf 2.6 or higher) or list 2 only (Zipf 3.0 to 4.6).

Words with Zipf 5.0 or higher (everyday words) were dropped. Two hand-made
exclusion lists were applied at this step:

- **Word-family duplicates** (64 words). When two forms of one word qualified,
  the more useful form stayed: *ambivalent* stays, *ambivalence* goes.
- **Off-target words** (169 words): discipline labels (*ornithology*), concrete
  or dated words from the old test (*zephyr*, *dirge*), and very easy words
  (*enormous*, *identical*).

This step produced 1,153 candidates.

## 4. Editorial pass

The goal of the pass was the brief's instruction to favor useful academic words
over rare ones.

- **Removed by hand: 163 more words** that were concrete, dated, or too easy to
  be likely Digital SAT answer choices (*submerge*, *legible*, *stingy*).
- **Editor's picks added: 73 words**, marked `editorPick` in the data. These
  are high-utility academic words of the kind the Digital SAT uses as answer
  choices but that older lists under-count: *counterintuitive*, *inconclusive*,
  *provisional*, *negligible*, *replicate*, *hypothesize*, and common words
  tested in a less common sense, such as *harbor*, *champion*, *qualify*,
  *grave*, and *weather*. Of the 73, 7 appear in none of the source lists.

1,153 minus 163 plus 73 gives the final **1,063 words**. The exact lists are in
`scripts/wordlist/3_select.py` and `scripts/wordlist/4_editorial.py`.

How many lists agree on the final words:

| In this many lists | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Words | 7 | 28 | 113 | 244 | 244 | 167 | 135 | 66 | 44 | 13 | 2 |

So 915 of the 1,063 words (86%) appear in at least 3 lists, and 108 are in the
list compiled from official practice tests.

## 5. Difficulty tiers

Tiers come from word frequency, not from opinion:

| Tier | Zipf frequency | Meaning | Words |
| --- | --- | --- | --- |
| 1 | 3.4 and up | Seen fairly often in general reading | 324 |
| 2 | 2.9 to 3.39 | Academic words met mainly in school texts | 394 |
| 3 | below 2.9 | Less common words | 345 |

## 6. Writing the entries

Every definition, sentence, passage, and explanation was written for this
project. Entries were written in batches of 50, in rank order. Each batch was
compiled with `scripts/compile-batch.mjs`, checked with
`scripts/validate-data.mjs`, compared with WordNet 3.1 using
`scripts/check-wordnet.mjs`, and committed before the next batch began.

What the validator enforces (the build fails otherwise):

- no duplicate words, every required field present;
- exactly 3 example sentences (6 to 45 words) in 3 different settings, each
  containing the word;
- synonyms and antonyms that are either in the merged SAT word pool (7,571
  words) or in an "academic band" of WordNet words that are neither everyday
  nor very rare (Zipf 1.5 to 4.8), so plain words such as *clear* or *strong*
  are rejected;
- word parts that exist in `data/roots.json`;
- each question has a 25 to 150 word passage with exactly one blank, 4 unique
  choices, exactly one correct answer that is a form of the entry word, and 3
  explained distractors that are real SAT-list words (three extra words are
  allowed by `data/extra-allowed.json`);
- a passage that does not contain the answer word;
- no distractor that is also listed as a synonym of the answer;
- no distractor reused more than 12 times across the whole dataset;
- no repeated sentences or passages; no em dashes.

## 7. Accuracy checks

**WordNet, all entries.** `scripts/check-wordnet.mjs` compares every entry with
WordNet 3.1 (an open dictionary, used through the `wordnet-db` package).
Wiktionary could not be reached from the build environment, so WordNet was the
reference. Result for the final data: all 1,063 words exist in WordNet with
the stated part of speech, except *savvy* as an adjective, which WordNet lacks
and standard dictionaries include (recorded in `data/wordnet-exceptions.json`).
The script also flags any entry whose definition and synonyms share no content
word with WordNet's glosses. 67 entries are flagged this way. A flag is a
prompt to look, not an error: the ones examined used plainer wording for the
same sense (for example "to make something unclear" against WordNet's "make
obscure").

**Spot check of 30 random entries.** `node scripts/spot-check.mjs` prints a
seeded random sample (seed 20261111) with each entry beside its WordNet senses.
The 30 words drawn were: duplicity, omnipresent, comparable, sheer, mundane,
obfuscate, extraneous, erudite, temperament, hostile, inventive, ruminate,
didactic, trivial, abate, inexorable, indisputable, recede, camaraderie,
corollary, abet, animosity, malicious, spontaneous, qualify, discredit,
obstinate, salient, eradicate, substantiate.

What was checked and found:

| Check | Result |
| --- | --- |
| Definition matches a WordNet sense | 30 of 30 |
| Part of speech correct | 30 of 30 |
| All 3 sentences use the word in the defined sense | 30 of 30 |
| Question has exactly one defensible answer | 30 of 30 |
| Each wrong-choice explanation states the choice's real meaning | 30 of 30 |
| Connotation label reasonable | 29 of 30 |
| Distractor reason label exact | 29 of 30 |

Two small problems were found and fixed. *Indisputable* was labeled positive
and is now neutral. In the *eradicate* question the distractor *temper* was
labeled "too extreme" although it is too weak; the same label is used both
ways in 3 of the 21 questions that carry it, so the app now shows this reason
as "too extreme (wrong strength)" and explains it as stronger or weaker than
the passage supports.

Limits of this check: it was done by the same author who wrote the entries,
against one dictionary. It is a sanity check, not an independent review. If
you find an error, the entry is one line in `data/words/batch-NN.json`; fix
it and run `npm run validate`.

## 8. Final numbers

| Measure | Value |
| --- | --- |
| Words | 1,063, all unique |
| Part of speech | 559 adjectives, 326 verbs, 177 nouns, 1 adverb |
| Connotation | 428 neutral, 344 negative, 291 positive |
| Example sentences | 3,189 (everyday 1,063, history 951, science 646, literature 529) |
| Words with at least one linked root or affix | 826 |
| Words with antonyms | 1,043 |
| Words with a confused-word note | 1,063 (324 point to another word on the list) |
| Words in Context questions | 1,063, one per word |
| Passage length | 25 to 47 words, average 32 |
| Wrong choices | 3,189, of which 3,078 (97%) are themselves words on this list |
| Distinct wrong-choice words | 1,093; none used more than 9 times |
| Why wrong choices are wrong | wrong meaning 2,322, opposite 733, confused word 90, wrong tone 23, wrong strength 21 |

## 9. Known limits

- **Most wrong choices are wrong on meaning.** Real SAT questions more often
  include choices that are close in meaning and fail on tone or strength. Only
  about 4% of the wrong choices here are of that harder kind, so these
  questions are somewhat easier than the hardest real ones. They are good for
  learning the words; use official College Board practice tests to calibrate
  difficulty.
- **Passages are short.** They sit at the low end of the real 25 to 150 word
  range.
- **One question per word.** After you have seen a word's question, you may
  remember the answer rather than work it out. The quiz modes and reviews vary
  the task to offset this.
- **Stored answer positions are slightly uneven** (the last position is right
  in 29% of stored questions). The app shuffles the choices every time a
  question is shown, so this does not affect practice.
- **Source list 1** (words from official practice tests) is a student
  compilation that could not be verified against the tests.
- **Tiers measure how common a word is in general English**, not how often it
  appears on the SAT, which College Board does not publish.

## 10. Roots dataset

`data/roots.json` holds 135 prefixes, roots, and suffixes (35 prefixes, 81
roots, 19 suffixes), chosen because they recur in this word list. Word entries
point to them by id, and the build script writes the reverse links (root to
words) into `public/data/roots.json`. 133 of the 135 parts are linked to at
least one word on the list.

## 11. Reproducing the list

The scripts in `scripts/wordlist/` are the ones used. They expect the mirror
files in a local folder and the Python package `wordfreq`. The downloaded source
files are not stored in this repository.
