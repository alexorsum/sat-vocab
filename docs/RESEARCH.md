# Research

This file records what was checked before the app was built: how the Digital SAT
tests vocabulary, what the learning research says about how to study words, which
review scheduler to use, and the design rules that follow. Every study feature in
the app links back to at least one rule in section 4.

How to read the sourcing: most publisher and College Board sites could not be
opened directly from the build environment (see section 5). Facts below were
confirmed through web search results that quote or summarize those pages. Where a
number could only be confirmed in a secondary source, the text says so.

## 1. How the Digital SAT tests vocabulary

**Section format.** The Reading and Writing section has 54 questions in 64
minutes, split into two adaptive modules of 27 questions and 32 minutes each. Each
module has 25 scored questions and 2 unscored pretest questions. That works out to
about 71 seconds per question. [1][2]

**One short passage per question.** Every question has its own passage (or
passage pair) of 25 to 150 words. There are no long passages with question sets.
Passages come from literature, history and social studies, the humanities, and
science. [2][3]

**Four content domains.** Information and Ideas (about 26%), Craft and Structure
(about 28%, 13 to 15 questions), Expression of Ideas (about 20%), and Standard
English Conventions (about 26%). Vocabulary is tested in Craft and Structure
through the "Words in Context" skill. The percentages come from prep company
summaries of the College Board table. [4][5]

**Words in Context.** The student reads a short passage with a blank (or, less
often, an underlined word) and picks one of four choices. The standard stem asks
which choice completes the text with the most logical and precise word or phrase.
These questions come first in each module. One prep source estimates 6 to 8 per
test; College Board does not publish an exact count for the skill. [5][6]

**What kind of words.** College Board says the test measures "high-utility
academic words and phrases" in context: words common in college-level texts across
subjects but less common in conversation. Its own examples include *trait*,
*observe*, *portrayal*, and *critique*. [7] College Board built its internal
vocabulary pool by measuring word frequency (Zipf score) in more than 250 commonly
assigned college texts covering more than 77,000 words, and it leaves out both
very rare words and words tied to a single field. Its framework names words like
*lassitude*, *supercilious*, and *adumbrate* as not the focus. There is no
official SAT word list. [8]

**What this means for studying.**

- Knowing a rough definition is not enough. The wrong choices are usually real,
  reasonable words that fail on precise meaning, tone, or strength.
- Common words used in a less common sense matter as much as hard words.
- A study tool should practice the actual task: read a short passage, predict the
  missing idea, pick the most precise word, and know why the others fail.

## 2. The science of learning vocabulary

### 2.1 Spaced repetition

Spreading study over time beats cramming the same total time. Cepeda and
colleagues reviewed 317 experiments (839 assessments) on verbal recall and found a
consistent benefit for spaced over massed practice. They also found that the best
gap between sessions grows as the target retention interval grows, which supports
expanding intervals for long-term goals such as a test months away. [9] Dunlosky
and colleagues rated distributed practice as one of only two "high utility"
techniques out of ten reviewed. [10] A meta-analysis of 48 second-language
experiments found a medium to large advantage for spaced practice on delayed tests
(reported as g = 0.80 in a secondary summary), with equal and expanding schedules
performing about the same. [11]

### 2.2 Retrieval practice

Pulling an answer out of memory strengthens it more than reading it again.
Roediger and Karpicke named this "test-enhanced learning". [12] In their 2008
study with 40 Swahili-English word pairs, repeated testing of already-learned
pairs greatly improved recall a week later, while repeated studying added nothing
measurable. [13] Rowland's meta-analysis of 61 studies found a moderate to large
advantage for testing over restudy (about 0.50 standard deviations). [14] Adesope
and colleagues found the same pattern across classroom-style studies. [15]
Practice testing is the other "high utility" technique in the Dunlosky review. [10]

Trying before seeing the answer helps even when the try fails. Kornell, Hays, and
Bjork found that unsuccessful retrieval attempts followed by feedback beat simply
reading. [16] Potts and Shanks found the same for definitions of unfamiliar
English words: guessing and then getting feedback beat both reading and choosing
from options, even though learners believed it worked worse. [17]

Rawson and Dunlosky studied "successive relearning": recall each item correctly,
then relearn it in later sessions. Their work supports recalling to a criterion
and then returning on later days over piling on repetitions in one sitting. [18]

### 2.3 A clear definition plus several different contexts

Stahl and Fairbanks's meta-analysis concluded that vocabulary teaching improves
comprehension when it gives both definitional and contextual information, involves
active processing, and provides multiple exposures. Definitions alone did not
reliably help comprehension. [19] McKeown, Beck, Omanson, and Pople found that
definitions alone produced weaker comprehension and use of words than instruction
with definitions plus contexts and more encounters. [20] Bolger, Balass, Landen,
and Perfetti showed that meeting a word in varied sentences leads to better
learning of its abstract meaning than meeting it repeatedly in the same sentence,
and that definitions add to this. [21] Beck, McKeown, and Kucan's "tier two"
framework (high-utility words for mature language users, such as *contradict* and
*precede*) matches the words College Board says it tests. [22]

### 2.4 Morphology (roots, prefixes, suffixes)

Teaching word parts has a reliable, moderate effect. Goodwin and Ahn's
meta-analysis of English morphological interventions (30 studies, 92 effect sizes)
found an overall effect of about d = 0.32, with vocabulary among the outcomes that
benefit. [23] Bowers, Kirby, and Deacon's systematic review also found positive
effects of morphological instruction on literacy outcomes. [24] Crosson and
McKeown showed that middle schoolers can use bound Latin roots (for example *voc*
in *advocate* and *vociferous*) to work out unfamiliar words, and that instruction
improves this. [25] Nagy and Anderson's analysis of printed school English showed
that a large share of words belong to morphological families, so learning one
root pays off across many words. [26]

### 2.5 Interleaving

Mixing item types during practice usually beats blocking them. Brunmair and
Richter's meta-analysis (59 studies, 238 effect sizes) found a moderate overall
benefit (g = 0.42), strongest when the categories are easy to confuse. The same
analysis warns that the effect did not hold for word lists in the studies it
covered, so interleaving is not a universal win. [27] Dunlosky rated interleaved
practice "moderate utility". [10]

For vocabulary there is a related and more specific finding. Tinkham found that
learning new words in tight semantic sets (near-synonyms or members of one
category introduced together) causes interference and slows learning. Later
studies are mixed, but none show that grouping near-synonyms helps first-time
learning. [28]

The practical reading: do not introduce look-alike or near-synonym words in the
same batch, and mix words from different sets and different question types during
practice so the learner must discriminate between them.

### 2.6 The generation effect

Information you produce yourself is remembered better than information you only
read. Bertsch and colleagues' meta-analysis (86 studies, 445 effect sizes) put the
benefit at about 0.40 standard deviations. [29]

There is a caution for sentence writing. Barcroft found that writing sentences
with brand-new words during the very first exposure hurt learning of the word
forms, apparently because composing a sentence uses attention that the new form
needs. [30] So the app asks for a sentence only after the learner has studied the
definition and contexts and passed a quick recall check, not as the first step.

### 2.7 Feedback with explanations

Feedback after a test question matters, and explanation matters for transfer.
Butler, Godbole, and Marsh found that explanation feedback and correct-answer
feedback worked equally well on repeated questions, but explanation feedback was
better on new questions that required applying the idea. [31] That is the SAT
situation: the test will use the same word in a passage the student has never
seen. Little, Bjork, Bjork, and Angello found that multiple-choice questions with
plausible, competitive wrong answers lead learners to retrieve why each wrong
answer is wrong, and that this learning carries over to related questions. [32]

### 2.8 Mnemonics

The keyword mnemonic (link the new word to a similar-sounding known word with a
vivid image) boosts immediate recall, but Wang, Thomas, and Ouellette found
faster forgetting over a week for keyword learners than for rote learners unless
the words were also retested. [33] Dunlosky rated the keyword mnemonic "low
utility" because it works for a narrow range of material and fades without
practice. [10] Mnemonics are therefore optional in this app, written by the
learner, and always backed by spaced retrieval.

## 3. Scheduler: SM-2 vs FSRS

**SM-2** (SuperMemo 2, late 1980s) keeps one "ease factor" per card. Intervals go
1 day, 6 days, then the previous interval times the ease factor, and the ease
factor moves up or down with each answer. It is about 20 lines of code and easy to
get right. Its weaknesses are well known: the first intervals are fixed for every
learner and every card, a few lapses can push a card's ease down permanently
("ease hell"), a late review is credited as if it were on time, and it has no
model of the probability of recall, so it cannot target a chosen retention level.

**FSRS** (Free Spaced Repetition Scheduler) models each card with two numbers:
*stability* (how many days until recall probability falls to 90%) and
*difficulty* (1 to 10). A power-law forgetting curve gives the probability of
recall at any moment, and the next interval is the point where that probability
falls to the learner's desired retention (90% by default). Version 6 has 21
parameters with published defaults and published update formulas. [34] It has been
the built-in alternative to SM-2 in Anki since 2023.

**Evidence.** The open-spaced-repetition benchmark evaluates schedulers on about
350 million reviews from 9,999 Anki users, scoring how well each predicts whether
a review will be remembered. [35] For this project the per-user result files were
downloaded from the benchmark repository and summarized directly:

| Scheduler | Mean log loss (lower is better) |
| --- | --- |
| SM-2 | 0.722 |
| SM-2 with trained parameters | 0.581 |
| FSRS-6, default parameters (no per-user training) | 0.366 |
| FSRS-6, parameters trained per user | 0.346 |

FSRS-6 with only its default parameters predicted recall better than SM-2 for
98.1% of the 9,999 users, and better than the trainable SM-2 variant for 94.3%.
The default-parameter row is the one that matters here, because this app does not
train parameters per user.

Caveat from the benchmark authors: SM-2 was never designed to output
probabilities, so the benchmark adds a conversion layer on top of it. The
comparison is the best available, not a perfectly fair one. [36]

**Decision: FSRS-6 with default parameters.** Reasons:

1. Better evidence. It predicts forgetting more accurately for nearly all users,
   which means fewer wasted reviews for the same retention.
2. It can be built correctly and proven correct. The formulas and default
   parameters are public, and there is an official TypeScript reference
   implementation (`ts-fsrs`). The app has its own small, pure scheduler module,
   and the unit tests compare its stability, difficulty, and interval outputs with
   the reference library across random review histories, alongside hand-computed
   cases from the published formulas.
3. It handles real student behavior better: late reviews get proper credit, hard
   cards recover, and the learner can choose a desired retention.

What was left out on purpose: per-user parameter optimization (it needs hundreds
of reviews and a training loop; defaults already beat SM-2) and interval "fuzz"
(small random jitter; left out so the schedule is deterministic and testable).

## 4. Design rules

| Rule | Statement | Evidence |
| --- | --- | --- |
| R1 | Space reviews over growing intervals, scheduled per word by a memory model. | 2.1, 3 |
| R2 | Retrieve before reveal. Every study step starts with an attempt to recall or predict; the answer is never shown first. | 2.2 |
| R3 | Teach each word with a short, plain definition plus three contexts from different settings, and rotate contexts in later reviews. | 2.3 |
| R4 | Practice the real task: short passage, blank, four precise choices, the official stem, realistic timing. | 1, 2.7 |
| R5 | Show word parts and word families, and let the learner practice inferring meaning from parts. | 2.4 |
| R6 | Mix words from different sets and mix question types by default. Never introduce near-synonyms or look-alikes in the same batch; contrast them in quizzes later, once each is known. | 2.5 |
| R7 | Make the learner produce: type the word, write an original sentence. Ask for the sentence only after the meaning has been studied and checked. | 2.6 |
| R8 | Explain every answer, including why each wrong choice fails. Log every error with a reason type and bring missed words back. | 2.7 |
| R9 | Mnemonics are optional and personal, and never replace retrieval. | 2.8 |
| R10 | Prefer high-utility academic words and precise distinctions (connotation, strength, confused pairs) over rare words. | 1, 2.3 |
| R11 | Keep daily work small and repeatable: short batches, a daily new-word cap, a low-effort mode for tired days. Many short spaced sessions beat a few long ones. | 2.1, 2.2 |
| R12 | Show honest progress based on recall data, because learners misjudge what they know. | 2.2 [17] |

### Feature to rule map

| Feature | Rules |
| --- | --- |
| Daily Review (FSRS queue, recall first, four grades) | R1, R2, R3, R11 |
| Learn New Words (batch of 10, contexts, parts, check, own sentence) | R2, R3, R5, R6, R7, R11 |
| Words in Context Practice (timed or untimed, explanations) | R4, R8, R10 |
| Typed recall quiz (forgiving spelling) | R2, R7 |
| Multiple choice, both directions | R2, R6, R8 |
| Synonym and antonym matching | R6, R10 |
| Connotation sorting | R10 |
| Roots Explorer and roots quiz | R5 |
| Mistake Log and missed-word drill | R8, R12 |
| Word Browser (stars, personal memory tricks) | R9, R10 |
| Progress Dashboard (retention, streak, heatmap, forecast) | R1, R11, R12 |
| 60 second game | R2, R11 |
| How This App Works page | R12 |
| Audio pronunciation (optional) | R3 |

## 5. Sites that could not be reached

The cloud build environment only allows package registries and
`raw.githubusercontent.com`. The following hosts were blocked for direct download
and also failed in the page fetch tool (DNS lookup refused):

- `satsuite.collegeboard.org`, `research.collegeboard.org`,
  `counselors.collegeboard.org`, `elective.collegeboard.org`
- `www.khanacademy.org`
- `blog.prepscholar.com`, `magoosh.com`, `www.vocabulary.com`
- `en.wiktionary.org`
- `pubmed.ncbi.nlm.nih.gov`, `scholar.google.com`, journal publisher sites
- `github.com` web pages outside this repository (raw file hosting worked)

Workarounds used:

- Web search, which returns summaries and quotes of these pages. All College
  Board facts in section 1 and all paper details in section 2 were confirmed this
  way. Full texts of the papers were not read; details that appeared only in
  secondary summaries are marked in the text or the notes below.
- `raw.githubusercontent.com` for the FSRS algorithm description and the benchmark
  result files, which were analyzed directly.
- The npm registry for the `ts-fsrs` reference implementation and for the WordNet
  database used to check definitions (see docs/WORDLIST.md).

Not confirmed, and therefore not claimed above: the exact number of Words in
Context questions per test, the exact number of encounters used in McKeown et al.
(1985), and vocabulary-specific effect sizes for morphology instruction.

## Sources

1. College Board, "How the SAT Is Structured". https://satsuite.collegeboard.org/sat/whats-on-the-test/structure
2. College Board, "Assessment Framework for the Digital SAT Suite". https://satsuite.collegeboard.org/media/pdf/assessment-framework-for-digital-sat-suite.pdf and "Digital SAT Suite of Assessments Technical Manual". https://research.collegeboard.org/media/pdf/Digital%20SAT%20Suite%20of%20Assessments%20Technical%20Manual-FINAL.pdf
3. College Board, "Digital SAT Test Specifications" (counselor summary). https://counselors.collegeboard.org/media/pdf/Digital%20SAT%20Test%20Specifications.pdf
4. Prep Expert, "How the Digital SAT Is Structured". https://prepexpert.com/how-the-digital-sat-is-structured/
5. Test Innovators, "Here's What You Need to Know About the SAT Reading and Writing Section". https://testinnovators.com/blog/digital-sat-reading-writing-section/
6. Varsity Tutors, "Words in Context" lesson. https://www.varsitytutors.com/practice/subjects/sat-reading-and-writing/lessons/words-in-context ; UWorld, "SAT Words in Context". https://collegeprep.uworld.com/blog/words-in-context-sat-reading-and-writing-strategies/
7. College Board, "The Cognitively Complex Thinking Required by Select Digital SAT Suite Questions" (cognitive lab report). https://satsuite.collegeboard.org/media/pdf/digital-sat-cognitive-lab-report.pdf
8. College Board, The Elective, "SAT Vocabulary in the Digital Age". https://elective.collegeboard.org/sat-vocabulary-digital-age
9. Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin, 132*(3), 354-380. https://pubmed.ncbi.nlm.nih.gov/16719566/
10. Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques. *Psychological Science in the Public Interest, 14*(1), 4-58. Summary: https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html
11. Kim, S. K., & Webb, S. (2022). The effects of spaced practice on second language learning: A meta-analysis. *Language Learning, 72*(1), 269-319. doi:10.1111/lang.12479
12. Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. *Psychological Science, 17*(3), 249-255.
13. Karpicke, J. D., & Roediger, H. L. (2008). The critical importance of retrieval for learning. *Science, 319*, 966-968. https://www.purdue.edu/uns/x/2008a/080214KarpickeTest.html
14. Rowland, C. A. (2014). The effect of testing versus restudy on retention: A meta-analytic review of the testing effect. *Psychological Bulletin, 140*(6), 1432-1463. https://pubmed.ncbi.nlm.nih.gov/25150680/
15. Adesope, O. O., Trevisan, D. A., & Sundararajan, N. (2017). Rethinking the use of tests: A meta-analysis of practice testing. *Review of Educational Research, 87*(3), 659-701.
16. Kornell, N., Hays, M. J., & Bjork, R. A. (2009). Unsuccessful retrieval attempts enhance subsequent learning. *Journal of Experimental Psychology: Learning, Memory, and Cognition, 35*(4), 989-998. https://pubmed.ncbi.nlm.nih.gov/19586265/
17. Potts, R., & Shanks, D. R. (2014). The benefit of generating errors during learning. *Journal of Experimental Psychology: General, 143*(2), 644-667. doi:10.1037/a0033194
18. Rawson, K. A., & Dunlosky, J. (2011). Optimizing schedules of retrieval practice for durable and efficient learning: How much is enough? *Journal of Experimental Psychology: General, 140*(3), 283-302. doi:10.1037/a0023956
19. Stahl, S. A., & Fairbanks, M. M. (1986). The effects of vocabulary instruction: A model-based meta-analysis. *Review of Educational Research, 56*(1), 72-110.
20. McKeown, M. G., Beck, I. L., Omanson, R. C., & Pople, M. T. (1985). Some effects of the nature and frequency of vocabulary instruction on the knowledge and use of words. *Reading Research Quarterly, 20*(5), 522-535.
21. Bolger, D. J., Balass, M., Landen, E., & Perfetti, C. A. (2008). Context variation and definitions in learning the meanings of words: An instance-based learning approach. *Discourse Processes, 45*(2), 122-159. https://www.lrdc.pitt.edu/perfettilab/pubpdfs/Context%20variation%20Bolger%20et%20al.pdf
22. Beck, I. L., McKeown, M. G., & Kucan, L. (2013). *Bringing Words to Life: Robust Vocabulary Instruction* (2nd ed.). Guilford Press. Excerpt: https://www.guilford.com/excerpts/beck8_ch2.pdf
23. Goodwin, A. P., & Ahn, S. (2013). A meta-analysis of morphological interventions in English: Effects on literacy outcomes for school-age children. *Scientific Studies of Reading, 17*(4), 257-285.
24. Bowers, P. N., Kirby, J. R., & Deacon, S. H. (2010). The effects of morphological instruction on literacy skills: A systematic review of the literature. *Review of Educational Research, 80*(2), 144-179.
25. Crosson, A. C., & McKeown, M. G. (2016). Middle school learners' use of Latin roots to infer the meaning of unfamiliar words. *Cognition and Instruction, 34*(2), 148-171.
26. Nagy, W. E., & Anderson, R. C. (1984). How many words are there in printed school English? *Reading Research Quarterly, 19*(3), 304-330.
27. Brunmair, M., & Richter, T. (2019). Similarity matters: A meta-analysis of interleaved learning and its moderators. *Psychological Bulletin, 145*(11), 1029-1052. https://pubmed.ncbi.nlm.nih.gov/31556629/
28. Tinkham, T. (1997). The effects of semantic and thematic clustering on the learning of second language vocabulary. *Second Language Research, 13*(2), 138-163.
29. Bertsch, S., Pesta, B. J., Wiscott, R., & McDaniel, M. A. (2007). The generation effect: A meta-analytic review. *Memory & Cognition, 35*(2), 201-210. https://pubmed.ncbi.nlm.nih.gov/17645161/
30. Barcroft, J. (2004). Effects of sentence writing in second language lexical acquisition. *Second Language Research, 20*(4), 303-334.
31. Butler, A. C., Godbole, N., & Marsh, E. J. (2013). Explanation feedback is better than correct answer feedback for promoting transfer of learning. *Journal of Educational Psychology, 105*(2), 290-298. doi:10.1037/a0031026
32. Little, J. L., Bjork, E. L., Bjork, R. A., & Angello, G. (2012). Multiple-choice tests exonerated, at least of some charges: Fostering test-induced learning and avoiding test-induced forgetting. *Psychological Science, 23*(11), 1337-1344.
33. Wang, A. Y., Thomas, M. H., & Ouellette, J. A. (1992). Keyword mnemonic and retention of second-language vocabulary words. *Journal of Educational Psychology, 84*(4), 520-528.
34. Open Spaced Repetition, "The Algorithm" (FSRS-6 formulas and default parameters). https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm
35. Open Spaced Repetition, "SRS Benchmark" (dataset, method, per-user result files). https://github.com/open-spaced-repetition/srs-benchmark
36. Expertium, "Benchmark of Spaced Repetition Algorithms". https://expertium.github.io/Benchmark.html
