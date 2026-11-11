import { Link } from 'react-router-dom';
import { useTitle } from '../lib/hooks';

interface Source {
  n: number;
  text: string;
  url?: string;
}

const SOURCES: Source[] = [
  { n: 1, text: 'College Board. How the SAT Is Structured.', url: 'https://satsuite.collegeboard.org/sat/whats-on-the-test/structure' },
  { n: 2, text: 'College Board. Assessment Framework for the Digital SAT Suite.', url: 'https://satsuite.collegeboard.org/media/pdf/assessment-framework-for-digital-sat-suite.pdf' },
  { n: 3, text: 'Cepeda, Pashler, Vul, Wixted, and Rohrer (2006). Distributed practice in verbal recall tasks. Psychological Bulletin, 132(3), 354-380.' },
  { n: 4, text: 'Dunlosky, Rawson, Marsh, Nathan, and Willingham (2013). Improving students\' learning with effective learning techniques. Psychological Science in the Public Interest, 14(1), 4-58.' },
  { n: 5, text: 'Roediger and Karpicke (2006). Test-enhanced learning. Psychological Science, 17(3), 249-255.' },
  { n: 6, text: 'Rowland (2014). The effect of testing versus restudy on retention: a meta-analytic review. Psychological Bulletin, 140(6), 1432-1463.' },
  { n: 7, text: 'Kornell, Hays, and Bjork (2009). Unsuccessful retrieval attempts enhance subsequent learning. Journal of Experimental Psychology: Learning, Memory, and Cognition, 35(4), 989-998.' },
  { n: 8, text: 'Stahl and Fairbanks (1986). The effects of vocabulary instruction: a model-based meta-analysis. Review of Educational Research, 56(1), 72-110.' },
  { n: 9, text: 'Bolger, Balass, Landen, and Perfetti (2008). Context variation and definitions in learning the meanings of words. Discourse Processes, 45(2), 122-159.' },
  { n: 10, text: 'Beck, McKeown, and Kucan (2013). Bringing Words to Life: Robust Vocabulary Instruction, 2nd edition. Guilford Press.' },
  { n: 11, text: 'Goodwin and Ahn (2013). A meta-analysis of morphological interventions in English. Scientific Studies of Reading, 17(4), 257-285.' },
  { n: 12, text: 'Bowers, Kirby, and Deacon (2010). The effects of morphological instruction on literacy skills. Review of Educational Research, 80(2), 144-179.' },
  { n: 13, text: 'Brunmair and Richter (2019). Similarity matters: a meta-analysis of interleaved learning and its moderators. Psychological Bulletin, 145(11), 1029-1052.' },
  { n: 14, text: 'Tinkham (1997). The effects of semantic and thematic clustering on the learning of second language vocabulary. Second Language Research, 13(2), 138-163.' },
  { n: 15, text: 'Bertsch, Pesta, Wiscott, and McDaniel (2007). The generation effect: a meta-analytic review. Memory and Cognition, 35(2), 201-210.' },
  { n: 16, text: 'Barcroft (2004). Effects of sentence writing in second language lexical acquisition. Second Language Research, 20(4), 303-334.' },
  { n: 17, text: 'Butler, Godbole, and Marsh (2013). Explanation feedback is better than correct answer feedback for promoting transfer of learning. Journal of Educational Psychology, 105(2), 290-298.' },
  { n: 18, text: 'Wang, Thomas, and Ouellette (1992). Keyword mnemonic and retention of second-language vocabulary words. Journal of Educational Psychology, 84(4), 520-528.' },
  { n: 19, text: 'Open Spaced Repetition. The Algorithm (FSRS-6 formulas and default parameters).', url: 'https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm' },
  { n: 20, text: 'Open Spaced Repetition. SRS Benchmark.', url: 'https://github.com/open-spaced-repetition/srs-benchmark' },
];

const Cite = ({ n }: { n: number[] }) => (
  <sup>
    [
    {n.map((x, i) => (
      <span key={x}>
        {i > 0 && ', '}
        <a href={`#src-${x}`} onClick={(e) => { e.preventDefault(); document.getElementById(`src-${x}`)?.scrollIntoView({ block: 'center' }); }}>
          {x}
        </a>
      </span>
    ))}
    ]
  </sup>
);

export default function HowItWorks() {
  useTitle('How This App Works');
  return (
    <div className="prose">
      <h1>How This App Works</h1>
      <p>
        Every feature here is built on research about how people learn words. This page explains the ideas in plain language, so you know
        why the app asks you to do things the way it does. Numbers in brackets point to the sources at the bottom.
      </p>

      <h2>What the SAT actually asks</h2>
      <p>
        The Digital SAT does not ask for definitions. In a Words in Context question you read one short passage (25 to 150 words) with a
        blank and choose the word that fits most logically and precisely. Often two choices have roughly the right meaning, and the
        answer turns on tone, strength, or how the word is normally used. The Reading and Writing section has 54 questions in 64 minutes,
        which is about 71 seconds each. <Cite n={[1, 2]} />
      </p>
      <p>
        So this app teaches each word with its tone, its look-alikes, and real contexts, and it lets you practice the exact question
        format in <Link to="/practice">Words in Context</Link>.
      </p>

      <h2>1. Spacing: review just before you forget</h2>
      <p>
        Studying a word five times in one night feels productive, but most of it is gone in a week. The same five looks spread over
        weeks last far longer. This is one of the most reliable findings in memory research. <Cite n={[3, 4]} />
      </p>
      <p>
        <Link to="/review">Daily Review</Link> uses a memory model called FSRS. For every word it tracks two numbers: how stable your
        memory is (how many days until you would have a 90% chance of recalling it) and how hard the word is for you. When you press
        Again, Hard, Good, or Easy, it updates both and picks the next date. Words you know drift out to months apart. Words you miss
        come back soon. <Cite n={[19, 20]} />
      </p>

      <h2>2. Recall first, then check</h2>
      <p>
        Pulling an answer out of memory strengthens it much more than reading it again. Even a failed attempt helps, as long as you see
        the right answer afterward. That is why the app always asks you to think of the answer before it shows it, and why the quizzes
        are worth doing even when you get things wrong. <Cite n={[5, 6, 7]} />
      </p>

      <h2>3. A clear meaning plus different contexts</h2>
      <p>
        A definition alone is easy to memorize and hard to use. Students learn words best from a short, plain definition combined with
        several sentences in different settings. Each word here comes with three sentences from different areas (science, history,
        literature, everyday life), and reviews rotate through them. <Cite n={[8, 9, 10]} />
      </p>

      <h2>4. Word parts</h2>
      <p>
        More than half of English academic words are built from a small set of Latin and Greek parts. Learning that <em>bene</em> means
        "good" helps you with benevolent, benign, and benefactor at once, and gives you a way into words you have never seen. The{' '}
        <Link to="/roots">Roots Explorer</Link> groups words into these families. <Cite n={[11, 12]} />
      </p>

      <h2>5. Mixing things up</h2>
      <p>
        Practice that mixes different words and question types feels harder than doing one kind at a time, and it produces better
        long-term learning. Quizzes here are mixed by default. The app also avoids teaching look-alike words side by side at first,
        because learning similar new words together makes them blur. It contrasts them later, once you know each one. <Cite n={[13, 14]} />
      </p>

      <h2>6. Making it yourself</h2>
      <p>
        Things you produce are remembered better than things you only read. In <Link to="/learn">Learn New Words</Link> you write your
        own sentence, but only after you have studied the meaning and passed a quick check, because writing sentences too early can get
        in the way of learning the word itself. Typed recall in the quiz works the same way. <Cite n={[15, 16]} />
      </p>

      <h2>7. Explanations and the mistake log</h2>
      <p>
        Being told "wrong, the answer is B" teaches little. Being told why B is right and why your choice fails helps you handle new
        questions. Every practice question explains all four choices, and the <Link to="/mistakes">Mistake Log</Link> records the kind
        of error (wrong meaning, wrong tone, a confused word, too extreme) so you can see your pattern and drill the words you missed.{' '}
        <Cite n={[17]} />
      </p>

      <h2>8. Memory tricks are optional</h2>
      <p>
        A vivid image or a sound-alike link can help a stubborn word stick, especially when you invent it yourself. Tricks fade faster
        than real understanding, though, so they are an extra here and never a replacement for recall. You can add one to any word in the{' '}
        <Link to="/browse">Word Browser</Link>. <Cite n={[18]} />
      </p>

      <h2>What the numbers mean</h2>
      <ul>
        <li>
          <strong>Seen:</strong> you have learned the word and it is in your review schedule.
        </li>
        <li>
          <strong>Learning:</strong> the app predicts your memory of the word lasts less than three weeks.
        </li>
        <li>
          <strong>Mastered:</strong> your memory is predicted to last three weeks or more. A mastered word still comes back now and then.
        </li>
        <li>
          <strong>Retention:</strong> of the reviews that came up on a later day, the share you remembered. Around 90% is the target.
        </li>
      </ul>

      <h2>A good daily routine</h2>
      <ol>
        <li>Do your Daily Review first. It is the part that keeps what you have already learned.</li>
        <li>Learn up to 10 new words.</li>
        <li>If you have time, do a short Words in Context set or a quiz. On a tired day, play one round of the Speed Game.</li>
      </ol>
      <p>Ten to fifteen minutes every day beats an hour once a week.</p>

      <h2>Keyboard shortcuts</h2>
      <ul>
        <li>
          Review: <kbd>Space</kbd> shows the answer, <kbd>1</kbd> to <kbd>4</kbd> rate it.
        </li>
        <li>
          Practice and quizzes: <kbd>A</kbd> to <kbd>D</kbd> (or <kbd>1</kbd> to <kbd>4</kbd>) pick a choice, <kbd>Enter</kbd> continues, <kbd>M</kbd> marks a
          question.
        </li>
        <li>
          Word Browser: <kbd>/</kbd> jumps to search.
        </li>
        <li>
          Speed Game: <kbd>→</kbd> match, <kbd>←</kbd> no match.
        </li>
      </ul>

      <h2>Sources</h2>
      <ol>
        {SOURCES.map((s) => (
          <li key={s.n} id={`src-${s.n}`}>
            {s.text}{' '}
            {s.url && (
              <a href={s.url} target="_blank" rel="noreferrer">
                Link
              </a>
            )}
          </li>
        ))}
      </ol>
      <p className="muted small">
        The full research notes, with every source and the reasoning behind each design choice, are in docs/RESEARCH.md in the project
        repository. The word list and how it was built are described in docs/WORDLIST.md.
      </p>
    </div>
  );
}
