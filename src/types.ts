export type Pos = 'noun' | 'verb' | 'adjective' | 'adverb';
export type Connotation = 'positive' | 'neutral' | 'negative';
export type DistractorReason =
  | 'wrong-meaning'
  | 'wrong-tone'
  | 'opposite'
  | 'too-extreme'
  | 'confused-word'
  | 'wrong-context';

export interface Example {
  setting: 'science' | 'history' | 'literature' | 'everyday';
  text: string;
}

export interface Distractor {
  choice: string;
  lemma: string;
  reason: DistractorReason;
  why: string;
}

export interface Question {
  passage: string;
  choices: string[];
  answer: number;
  answerLemma?: string;
  explanation: string;
  distractors: Distractor[];
}

export interface Word {
  id: string;
  word: string;
  pos: Pos;
  rank: number;
  sourceCount: number;
  tier: 1 | 2 | 3;
  definition: string;
  connotation: Connotation;
  examples: Example[];
  synonyms: string[];
  antonyms: string[];
  parts: string[];
  partsNote?: string;
  confused: { word: string; note: string }[];
  questions: Question[];
}

export interface Root {
  id: string;
  form: string;
  type: 'prefix' | 'root' | 'suffix';
  origin: string;
  meaning: string;
  examples: string[];
  words: string[];
}

/** 1 = Again, 2 = Hard, 3 = Good, 4 = Easy */
export type Rating = 1 | 2 | 3 | 4;

/** One card per learned word. stability 0 means "introduced, not yet reviewed". */
export interface Card {
  id: string;
  stability: number;
  difficulty: number;
  /** Time (ms) when the card is next due. */
  due: number;
  lastReview: number | null;
  reps: number;
  lapses: number;
  introduced: number;
  /** The sentence the student wrote when learning the word. */
  sentence: string;
}

export interface Note {
  id: string;
  starred: boolean;
  trick: string;
}

export interface ReviewLog {
  key?: number;
  wordId: string;
  ts: number;
  rating: Rating;
  elapsedDays: number;
  /** True when this was the first review of the card. */
  first: boolean;
}

export type MistakeReason =
  | DistractorReason
  | 'forgot'
  | 'spelling';

export type MistakeSource = 'review' | 'practice' | 'quiz';

export interface Mistake {
  key?: number;
  wordId: string;
  ts: number;
  source: MistakeSource;
  reason: MistakeReason;
  /** What the student chose or typed, if anything. */
  chosen: string;
  resolved: boolean;
}

export interface DayLog {
  day: string;
  reviews: number;
  learned: number;
  practice: number;
  quiz: number;
  game: number;
}

export type ThemeSetting = 'system' | 'light' | 'dark';

export interface Settings {
  newPerDay: number;
  learnBatch: number;
  desiredRetention: number;
  theme: ThemeSetting;
  audio: boolean;
  tiers: (1 | 2 | 3)[];
  gameBest: number;
}

export type WordStatus = 'new' | 'learning' | 'mastered';
