import type { MistakeReason } from '../types';

/** Plain-language names for why an answer was wrong. */
export const REASON_LABEL: Record<MistakeReason, string> = {
  'wrong-meaning': 'wrong meaning',
  'wrong-tone': 'wrong tone',
  opposite: 'opposite meaning',
  'too-extreme': 'too extreme (wrong strength)',
  'confused-word': 'confused word',
  'wrong-context': 'does not fit the context',
  forgot: 'could not recall',
  spelling: 'spelling',
};

export const REASON_HELP: Record<MistakeReason, string> = {
  'wrong-meaning': 'The word you chose means something else. Relearn the core definition.',
  'wrong-tone': 'The meaning was close, but the feeling (positive or negative) did not match the passage.',
  opposite: 'You chose a word that means the reverse. Reread the passage for words like "but" and "however".',
  'too-extreme': 'The word was much stronger or much weaker than the passage supports. Look for the choice that matches the degree.',
  'confused-word': 'You mixed up two words that look or sound alike. Study the pair side by side.',
  'wrong-context': 'The word has that meaning, but it is not used in this kind of sentence.',
  forgot: 'The meaning did not come to mind. More spaced reviews will fix this.',
  spelling: 'You knew the word but not its spelling.',
};

export const REASONS: MistakeReason[] = ['wrong-meaning', 'wrong-tone', 'opposite', 'too-extreme', 'confused-word', 'wrong-context', 'forgot', 'spelling'];
