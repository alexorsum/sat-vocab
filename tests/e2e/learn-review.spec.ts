import { expect, test } from '@playwright/test';
import { WORDS, learnBatch, open } from './helpers';

test.describe('Home', () => {
  test('shows today at a glance and links to every feature', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
    await expect(page.getByTestId('due-count')).toHaveText('0');
    await expect(page.getByTestId('new-count')).toHaveText('10');
    await expect(page.getByText(`/ ${WORDS.length}`)).toBeVisible();
    for (const name of ['Words in Context', 'Quiz', 'Roots Explorer', 'Mistake Log', 'Word Browser', 'Progress', 'Speed Game', 'How This App Works']) {
      await expect(page.locator('a.tile', { hasText: name })).toBeVisible();
    }
    await page.locator('a.tile', { hasText: 'Roots Explorer' }).click();
    await expect(page.getByRole('heading', { name: 'Roots Explorer' })).toBeVisible();
  });

  test('main navigation works for this screen size', async ({ page, isMobile }) => {
    await open(page);
    const nav = isMobile ? page.getByRole('navigation', { name: 'Quick links' }) : page.getByRole('navigation', { name: 'Main' });
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: /Progress/ }).click();
    await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible();
    await nav.getByRole('link', { name: /Review/ }).click();
    await expect(page.getByRole('heading', { name: 'Daily Review' })).toBeVisible();
  });
});

test.describe('Learn New Words', () => {
  test('teaches a batch: study, quick check, own sentence', async ({ page }) => {
    await open(page, 'settings');
    await page.getByLabel('Words per learning batch').fill('2');
    await open(page, 'learn');
    await page.getByTestId('start-learn').click();

    // Study card shows everything about the first (most common) word.
    const card = page.getByTestId('study-card');
    await expect(card.locator('.headword')).toHaveText(WORDS[0].word);
    await expect(card.locator('.definition')).toHaveText(WORDS[0].definition);
    await expect(card.locator('.examples li')).toHaveCount(3);
    await expect(card.getByRole('heading', { name: 'In context' })).toBeVisible();
    await expect(card.getByRole('heading', { name: 'Do not confuse with' })).toBeVisible();

    // A wrong answer on the check sends you back to the word.
    await page.getByTestId('to-check').click();
    const wrong = page.getByTestId('check-card').locator('.choice').filter({ hasNotText: WORDS[0].definition }).first();
    await wrong.click();
    await expect(page.getByText('Not quite. Take another look')).toBeVisible();
    await page.getByTestId('after-check').click();
    await expect(page.getByTestId('study-card')).toBeVisible();

    // The right answer moves on to the sentence.
    await page.getByTestId('to-check').click();
    await page.getByTestId('check-card').locator('.choice', { hasText: WORDS[0].definition }).click();
    await page.getByTestId('after-check').click();

    // The sentence has to use the word.
    await page.getByTestId('sentence-input').fill('This sentence is about pizza.');
    await page.getByTestId('save-sentence').click();
    await expect(page.getByRole('alert')).toContainText(`Use the word "${WORDS[0].word}"`);
    await page.getByTestId('sentence-input').fill(`It is ${WORDS[0].word} that it will rain.`);
    await page.getByTestId('save-sentence').click();

    // Second word, using the keyboard where possible.
    await expect(page.getByTestId('study-card').locator('.headword')).toHaveText(WORDS[1].word);
    await page.getByTestId('to-check').click();
    await page.getByTestId('check-card').locator('.choice', { hasText: WORDS[1].definition }).click();
    await page.getByTestId('after-check').click();
    await page.getByTestId('sentence-input').fill(`She was ${WORDS[1].word} about the whole plan.`);
    await page.getByTestId('sentence-input').press('Enter');

    await expect(page.getByRole('heading', { name: 'Nice work' })).toBeVisible();
    await expect(page.getByText('2 new words are now in your review queue.')).toBeVisible();

    await open(page);
    await expect(page.getByTestId('due-count')).toHaveText('2');
    await expect(page.getByTestId('new-count')).toHaveText('8');
  });

  test('respects the daily new-word limit', async ({ page }) => {
    await open(page, 'settings');
    await page.getByLabel('New words per day').fill('1');
    await learnBatch(page, 1);
    await open(page);
    await expect(page.getByTestId('new-count')).toHaveText('0');
    await open(page, 'learn');
    await expect(page.getByText("You have reached today's limit of 1 new words.")).toBeVisible();
    await expect(page.getByRole('button', { name: /more anyway/ })).toBeVisible();
  });
});

test.describe('Daily Review', () => {
  test('empty state when nothing is due', async ({ page }) => {
    await open(page, 'review');
    await expect(page.getByText('Nothing is due right now.')).toBeVisible();
  });

  test('recall first, then rate; Again comes back; the schedule moves forward', async ({ page, isMobile }) => {
    const learned = await learnBatch(page, 2);
    await page.getByRole('link', { name: 'Review them now' }).click();
    await expect(page.getByTestId('remaining')).toHaveText('2 left');

    // The answer is hidden until asked for.
    await expect(page.getByTestId('review-word')).toHaveText(learned[0]);
    await expect(page.getByTestId('answer')).toHaveCount(0);
    await expect(page.locator('.rating-row')).toHaveCount(0);

    if (isMobile) await page.getByTestId('reveal').click();
    else await page.keyboard.press('Space');
    const answer = page.getByTestId('answer');
    await expect(answer).toContainText(WORDS[0].definition);
    await expect(answer).toContainText(`My teacher used the word ${learned[0]} in class today.`);

    // The four buttons show when each choice would bring the word back.
    const row = page.locator('.rating-row');
    await expect(row.locator('[data-rating="1"]')).toContainText('10 min');
    await expect(row.locator('[data-rating="2"]')).toContainText('1 day');
    await expect(row.locator('[data-rating="3"]')).toContainText('2 days');
    await expect(row.locator('[data-rating="4"]')).toContainText('8 days');

    // "Again" keeps the word in today's session.
    await row.locator('[data-rating="1"]').click();
    await expect(page.getByTestId('remaining')).toHaveText('2 left');
    await expect(page.getByTestId('review-word')).toHaveText(learned[1]);

    await page.getByTestId('reveal').click();
    if (isMobile) await row.locator('[data-rating="3"]').click();
    else await page.keyboard.press('3');
    await expect(page.getByTestId('remaining')).toHaveText('1 left');

    // The first word returns, now as a fill-in-the-blank prompt.
    await expect(page.getByText('Which word fits?')).toBeVisible();
    await page.getByTestId('reveal').click();
    await expect(page.getByTestId('answer').locator('.headword')).toHaveText(learned[0]);
    await row.locator('[data-rating="4"]').click();

    await expect(page.getByRole('heading', { name: 'Review complete' })).toBeVisible();
    await expect(page.getByText('1 came back for a second look.')).toBeVisible();

    // Nothing is due any more, and the words count as seen.
    await open(page);
    await expect(page.getByTestId('due-count')).toHaveText('0');
    await open(page, 'progress');
    await expect(page.getByTestId('stat-seen')).toHaveText('2');

    // Progress survives a full reload (it is stored in IndexedDB).
    await page.reload();
    await expect(page.getByTestId('stat-seen')).toHaveText('2');
  });

  test('words come due again on the scheduled day', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 10, 11, 10, 0) });
    await learnBatch(page, 1);
    await page.getByRole('link', { name: 'Review them now' }).click();
    await page.getByTestId('reveal').click();
    await page.locator('[data-rating="3"]').click(); // Good: back in 2 days
    await open(page);
    await expect(page.getByTestId('due-count')).toHaveText('0');

    await page.clock.setFixedTime(new Date(2026, 10, 12, 10, 0));
    await page.reload();
    await expect(page.getByTestId('due-count')).toHaveText('0');

    await page.clock.setFixedTime(new Date(2026, 10, 13, 8, 0));
    await page.reload();
    await expect(page.getByTestId('due-count')).toHaveText('1');
  });
});
