import { expect, test, type Page } from '@playwright/test';
import { BY_DEFINITION, BY_ID, WORDS, choice, open } from './helpers';

async function startQuiz(page: Page, type: string, length = '5 questions') {
  await open(page, 'quiz');
  await page.locator('.option', { hasText: type }).click();
  await page.locator('.option', { hasText: /^All words/ }).click();
  await page.locator('.option', { hasText: length }).click();
  await page.getByTestId('start-quiz').click();
}

const currentWord = async (page: Page, kind: string) => BY_ID.get((await page.getByTestId(`item-${kind}`).getAttribute('data-word')) as string)!;

/** Answer whatever item is on screen. Returns the points earned. */
async function answerItem(page: Page, correctly: boolean): Promise<void> {
  const card = page.locator('[data-testid^="item-"]');
  const kind = ((await card.getAttribute('data-testid')) as string).replace('item-', '');
  const word = BY_ID.get((await card.getAttribute('data-word')) as string)!;
  if (kind === 'typed') {
    await page.getByTestId('typed-input').fill(correctly ? word.word : 'zzzzzz');
    await page.getByTestId('typed-check').click();
  } else if (kind === 'mc-def') {
    const texts = await card.locator('.choice-text').allInnerTexts();
    const wrong = texts.map((t) => t.replace(/^[A-D]\.\s*/, '')).find((t) => t !== word.definition)!;
    await choice(page, correctly ? word.definition : wrong).click();
  } else if (kind === 'mc-word') {
    const texts = (await card.locator('.choice-text').allInnerTexts()).map((t) => t.replace(/^[A-D]\.\s*/, ''));
    await choice(page, correctly ? word.word : texts.find((t) => t !== word.word)!).click();
  } else if (kind === 'synonym' || kind === 'antonym') {
    const own = kind === 'synonym' ? word.synonyms : word.antonyms;
    const texts = (await card.locator('.choice-text').allInnerTexts()).map((t) => t.replace(/^[A-D]\.\s*/, ''));
    await choice(page, correctly ? texts.find((t) => own.includes(t))! : texts.find((t) => !own.includes(t))!).click();
  } else if (kind === 'tone') {
    const tones = ['positive', 'neutral', 'negative'];
    await card.locator(`[data-tone="${correctly ? word.connotation : tones.find((t) => t !== word.connotation)}"]`).click();
  } else if (kind === 'match') {
    const ids = await card.locator('[data-left]').evaluateAll((els) => els.map((e) => e.getAttribute('data-left') as string));
    if (!correctly) {
      await card.locator(`[data-left="${ids[0]}"]`).click();
      await card.locator(`[data-right="${ids[1]}"]`).click();
    }
    for (const id of ids) {
      await card.locator(`[data-left="${id}"]`).click();
      await card.locator(`[data-right="${id}"]`).click();
    }
  }
  await expect(page.getByTestId('quiz-feedback')).toBeVisible();
}

test.describe('Quiz modes', () => {
  test('typed recall forgives small typos but not wrong words', async ({ page }) => {
    await startQuiz(page, 'Typed recall');

    // 1: exact answer.
    let word = await currentWord(page, 'typed');
    await expect(page.getByTestId('quiz-stem')).toHaveText(word.definition);
    await expect(page.getByText(`starts with "${word.word[0]}", ${word.word.length} letters`)).toBeVisible();
    await page.getByTestId('typed-input').fill(word.word.toUpperCase());
    await page.getByTestId('typed-input').press('Enter');
    await expect(page.getByTestId('typed-message')).toHaveText('Correct.');
    await page.getByTestId('quiz-next').click();

    // 2: a small typo in a long enough word is accepted, with the right spelling shown.
    word = await currentWord(page, 'typed');
    const typo = word.word.length >= 5 ? word.word.slice(0, -1) : word.word;
    await page.getByTestId('typed-input').fill(typo);
    await page.getByTestId('typed-check').click();
    await expect(page.getByTestId('typed-message')).toContainText(word.word.length >= 5 ? `Watch the spelling: ${word.word}` : 'Correct.');
    await page.getByTestId('quiz-next').click();

    // 3: nonsense is wrong and the answer is shown.
    word = await currentWord(page, 'typed');
    await page.getByTestId('typed-input').fill('qqqqqqqq');
    await page.getByTestId('typed-check').click();
    await expect(page.getByTestId('typed-message')).toContainText(`The word is "${word.word}".`);
    await page.getByTestId('quiz-next').click();

    // 4: a synonym earns a second try.
    word = await currentWord(page, 'typed');
    await page.getByTestId('typed-input').fill(word.synonyms[0]);
    await page.getByTestId('typed-check').click();
    await expect(page.getByTestId('typed-message')).toContainText('good synonym');
    await page.getByTestId('typed-input').fill(word.word);
    await page.getByTestId('typed-check').click();
    await expect(page.getByTestId('typed-message')).toHaveText('Correct.');
    await page.getByTestId('quiz-next').click();

    // 5: leaving it empty counts as not knowing.
    await page.getByTestId('typed-check').click();
    await page.getByTestId('quiz-next').click();

    await expect(page.getByRole('heading', { name: 'Quiz results' })).toBeVisible();
    await expect(page.getByTestId('quiz-score')).toHaveText('3 / 5');
  });

  test('multiple choice, word to meaning', async ({ page }) => {
    await startQuiz(page, 'Word to meaning');
    const word = await currentWord(page, 'mc-def');
    await expect(page.getByTestId('quiz-stem')).toHaveText(word.word);
    await answerItem(page, true);
    await expect(page.locator('.choice.correct')).toHaveCount(1);
    await page.getByTestId('quiz-next').click();
    await answerItem(page, false);
    await expect(page.locator('.choice.wrong')).toHaveCount(1);
    await expect(page.getByText('Not quite. The answer is')).toBeVisible();
  });

  test('multiple choice, meaning to word', async ({ page }) => {
    await startQuiz(page, 'Meaning to word');
    const stem = await page.getByTestId('quiz-stem').innerText();
    const word = BY_DEFINITION.get(stem.trim())!;
    await choice(page, word.word).click();
    await expect(page.getByText('Correct.')).toBeVisible();
  });

  test('synonyms', async ({ page }) => {
    await startQuiz(page, 'Synonyms');
    await expect(page.getByText('Which word is closest in meaning?')).toBeVisible();
    await answerItem(page, true);
    await expect(page.getByText('Correct.')).toBeVisible();
    await page.getByTestId('quiz-next').click();
    await answerItem(page, false);
    await expect(page.getByText('Not quite. The answer is')).toBeVisible();
  });

  test('antonyms', async ({ page }) => {
    await startQuiz(page, 'Antonyms');
    await expect(page.getByText('Which word is most nearly the opposite?')).toBeVisible();
    await answerItem(page, true);
    await expect(page.getByText('Correct.')).toBeVisible();
  });

  test('matching board', async ({ page }) => {
    await startQuiz(page, 'Matching');
    const card = page.getByTestId('item-match');
    await expect(card.locator('[data-left]')).toHaveCount(4);
    await expect(card.locator('[data-right]')).toHaveCount(4);
    await expect(page.getByTestId('quiz-next')).toBeDisabled();
    await answerItem(page, false); // one wrong try, then all four pairs
    await expect(card.getByText('4 of 4 matched, 1 wrong try.')).toBeVisible();
    await expect(card.locator('.btn.done')).toHaveCount(8);
    for (let i = 0; i < 4; i++) {
      await page.getByTestId('quiz-next').click();
      await answerItem(page, true);
    }
    await page.getByTestId('quiz-next').click();
    await expect(page.getByTestId('quiz-score')).toHaveText('19 / 20');
  });

  test('tone sorting', async ({ page }) => {
    await startQuiz(page, 'Tone sorting');
    await expect(page.getByRole('group', { name: 'Tone' }).getByRole('button')).toHaveCount(3);
    await answerItem(page, true);
    await expect(page.getByText('Correct.')).toBeVisible();
    await page.getByTestId('quiz-next').click();
    await answerItem(page, false);
    await expect(page.getByText(/Not quite\. This word is usually/)).toBeVisible();
  });

  test('mixed quiz interleaves question types and reports results', async ({ page }) => {
    await open(page, 'quiz');
    await expect(page.locator('.option', { hasText: 'Mixed (recommended)' }).locator('input')).toBeChecked(); // interleaved by default
    await page.locator('.option', { hasText: /^All words/ }).click();
    await page.locator('.option', { hasText: '20 questions' }).click();
    await page.getByTestId('start-quiz').click();
    const kinds = new Set<string>();
    for (let i = 0; i < 20; i++) {
      await expect(page.getByTestId('quiz-progress')).toContainText(`${i + 1} of 20`);
      kinds.add((await page.locator('[data-testid^="item-"]').getAttribute('data-testid')) as string);
      await answerItem(page, i % 4 !== 0);
      await page.getByTestId('quiz-next').click();
    }
    expect(kinds.size).toBeGreaterThanOrEqual(5);
    await expect(page.getByRole('heading', { name: 'Quiz results' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'By question type' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Words to look at again' })).toBeVisible();
    await expect(page.getByTestId('quiz-score')).toContainText('/');
  });

  test('uses every word on the list', async () => {
    expect(new Set(WORDS.map((w) => w.word)).size).toBeGreaterThanOrEqual(1000);
  });
});
