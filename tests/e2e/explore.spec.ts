import { expect, test } from '@playwright/test';
import { WORDS, choice, importBackup, open, practiceAnswer, seededBackup, pickOption } from './helpers';

test.describe('Roots Explorer', () => {
  test('lists word parts, filters, and shows word families', async ({ page }) => {
    await open(page, 'roots');
    await expect(page.getByRole('status')).toHaveText('135 word parts');
    await page.locator('.option', { hasText: 'Prefixes' }).click();
    await expect(page.getByRole('status')).toHaveText('35 word parts');
    await page.locator('.option', { hasText: 'All' }).click();
    await page.getByLabel('Search word parts').fill('bene, bon');
    await expect(page.getByRole('status')).toHaveText('1 word part');
    await page.getByRole('link', { name: /bene, bon/ }).click();

    await expect(page.getByRole('heading', { name: 'bene, bon' })).toBeVisible();
    await expect(page.getByText('Means: good, well')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Word family \(\d+\)/ })).toBeVisible();
    await page.getByRole('link', { name: /benevolent/ }).click();
    await expect(page.getByRole('heading', { name: 'benevolent', level: 1 })).toBeVisible();
    // The word page links back to its parts.
    await page.getByRole('region', { name: 'Word parts' }).getByRole('link', { name: 'bene, bon' }).click();
    await expect(page.getByRole('heading', { name: 'bene, bon' })).toBeVisible();
  });

  test('roots quiz runs ten questions and gives a score', async ({ page }) => {
    await open(page, 'roots');
    await page.getByRole('link', { name: 'Quiz me on roots' }).click();
    for (let i = 0; i < 10; i++) {
      await expect(page.getByText(`${i + 1} of 10`)).toBeVisible();
      await page.locator('.choice').first().click();
      await expect(page.locator('.notice')).toContainText('means');
      await page.getByTestId('root-next').click();
    }
    await expect(page.getByTestId('root-score')).toContainText('/ 10');
    await page.getByRole('button', { name: 'Try another round' }).click();
    await expect(page.getByText('1 of 10')).toBeVisible();
  });
});

test.describe('Word Browser', () => {
  test('search and filters narrow the list', async ({ page }) => {
    await open(page, 'browse');
    await expect(page.getByTestId('result-count')).toHaveText(`${WORDS.length} words`);

    await page.getByTestId('search').fill('plausib');
    await expect(page.getByTestId('word-list').getByRole('link', { name: /^plausible/ })).toBeVisible();
    await page.getByTestId('search').fill('');

    await page.getByLabel('Tier').selectOption('1');
    await expect(page.getByTestId('result-count')).toHaveText(`${WORDS.filter((w) => w.tier === 1).length} words`);
    await page.getByLabel('Part of speech').selectOption('verb');
    await expect(page.getByTestId('result-count')).toHaveText(`${WORDS.filter((w) => w.tier === 1 && w.pos === 'verb').length} words`);
    await page.getByLabel('Tier').selectOption('all');
    await page.getByLabel('Part of speech').selectOption('all');

    await page.getByLabel('Root or affix').selectOption('bene');
    await expect(page.getByTestId('result-count')).toHaveText(`${WORDS.filter((w) => w.parts.includes('bene')).length} words`);
    await page.getByLabel('Root or affix').selectOption('all');

    await page.getByLabel('Status').selectOption('mastered');
    await expect(page.getByTestId('result-count')).toHaveText('0 words');
    await page.getByLabel('Status').selectOption('new');
    await expect(page.getByTestId('result-count')).toHaveText(`${WORDS.length} words`);

    // The list shows 60 at a time.
    await expect(page.getByTestId('word-list').locator('li')).toHaveCount(60);
    await page.getByRole('button', { name: /Show more/ }).click();
    await expect(page.getByTestId('word-list').locator('li')).toHaveCount(180);
  });

  test('status filter follows real progress', async ({ page }) => {
    await importBackup(page, seededBackup());
    await open(page, 'browse');
    await page.getByLabel('Status').selectOption('mastered');
    await expect(page.getByTestId('result-count')).toHaveText('2 words');
    await page.getByLabel('Status').selectOption('learning');
    await expect(page.getByTestId('result-count')).toHaveText('4 words');
    await page.getByLabel('Starred only').check();
    await page.getByLabel('Status').selectOption('all');
    await expect(page.getByTestId('result-count')).toHaveText('1 word');
  });

  test('stars and personal memory tricks are saved', async ({ page }) => {
    await open(page, 'browse');
    await page.getByRole('button', { name: `Star ${WORDS[2].word}` }).click();
    await page.getByLabel('Starred only').check();
    await expect(page.getByTestId('result-count')).toHaveText('1 word');
    await page.getByTestId('word-list').getByRole('link').first().click();

    await expect(page.getByRole('heading', { name: WORDS[2].word, level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: `Remove star from ${WORDS[2].word}` })).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('trick').fill('Picture a very dry sponge.');
    await page.getByTestId('save-notes').click();
    await expect(page.getByText('Memory trick saved.')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('trick')).toHaveValue('Picture a very dry sponge.');
    await expect(page.getByRole('button', { name: `Remove star from ${WORDS[2].word}` })).toBeVisible();
    // Next and previous links walk the ranked list.
    await page.getByRole('link', { name: new RegExp(`${WORDS[3].word} →`) }).click();
    await expect(page.getByRole('heading', { name: WORDS[3].word, level: 1 })).toBeVisible();
  });
});

test.describe('Mistake Log', () => {
  test('records the reason, lets you change it, and drills missed words', async ({ page }) => {
    await open(page, 'mistakes');
    await expect(page.getByText('No open mistakes.')).toBeVisible();

    // Miss one practice question on purpose.
    await open(page, 'practice');
    await pickOption(page, '5');
    await page.getByTestId('start-practice').click();
    const q = await practiceAnswer(page);
    await choice(page, q.wrong).click();
    await page.getByTestId('check').click();

    await open(page, 'mistakes');
    const group = page.getByTestId('mistake-group');
    await expect(group).toHaveCount(1);
    await expect(page.getByRole('heading', { name: '1 missed word to drill' })).toBeVisible();
    await expect(page.getByText('Your most common mistake:')).toBeVisible();
    const reason = group.getByLabel('Reason for this mistake');
    await expect(reason).toHaveValue(/wrong-meaning|wrong-tone|opposite|too-extreme|confused-word|wrong-context/);

    // Re-label the reason; the filter follows.
    await reason.selectOption('too-extreme');
    await page.getByLabel('Reason', { exact: true }).selectOption('too-extreme');
    await expect(group).toHaveCount(1);
    await page.getByLabel('Reason', { exact: true }).selectOption('spelling');
    await expect(group).toHaveCount(0);
    await page.getByLabel('Reason', { exact: true }).selectOption('all');

    // Drill in context: answering correctly clears the word from the log.
    await page.getByTestId('drill-practice').click();
    await expect(page.locator('.option', { hasText: 'Words I missed (1)' }).locator('input')).toBeChecked();
    await page.getByTestId('start-practice').click();
    const again = await practiceAnswer(page);
    await choice(page, again.correct).click();
    await page.getByTestId('check').click();
    await page.getByTestId('next').click();
    await expect(page.getByTestId('practice-score')).toHaveText('1 / 1');

    await open(page, 'mistakes');
    await expect(page.getByText('No open mistakes.')).toBeVisible();
    await page.getByLabel('Show resolved').check();
    await expect(page.getByTestId('mistake-group')).toContainText('resolved');
  });

  test('forgotten reviews are logged and can be drilled with a quiz', async ({ page }) => {
    await importBackup(page, seededBackup());
    await open(page, 'mistakes');
    await expect(page.getByTestId('mistake-group')).toContainText('Daily review');
    await expect(page.getByTestId('mistake-group').getByLabel('Reason for this mistake')).toHaveValue('forgot');
    await page.getByTestId('drill-quiz').click();
    await expect(page.locator('.option', { hasText: 'Words I missed (1)' }).locator('input')).toBeChecked();
    await page.getByRole('button', { name: 'Mark resolved' }).isHidden();
    await open(page, 'mistakes');
    await page.getByRole('button', { name: 'Mark resolved' }).click();
    await expect(page.getByText('No open mistakes.')).toBeVisible();
  });
});
