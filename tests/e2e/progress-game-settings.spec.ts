import { expect, test } from '@playwright/test';
import { WORDS, acceptDialogs, importBackup, learnBatch, open, seededBackup } from './helpers';

test.describe('Progress Dashboard', () => {
  test('starts empty and honest', async ({ page }) => {
    await open(page, 'progress');
    await expect(page.getByTestId('stat-seen')).toHaveText('0');
    await expect(page.getByTestId('stat-retention')).toHaveText('–');
    await expect(page.getByTestId('stat-unseen')).toHaveText(String(WORDS.length));
    await expect(page.getByText('Nothing is scheduled yet.')).toBeVisible();
  });

  test('shows counts, retention, streak, calendar, and forecast from real history', async ({ page }) => {
    await importBackup(page, seededBackup());
    await open(page, 'progress');
    await expect(page.getByTestId('stat-seen')).toHaveText('6');
    await expect(page.getByTestId('stat-learning')).toHaveText('4');
    await expect(page.getByTestId('stat-mastered')).toHaveText('2');
    // Four spaced reviews, three remembered.
    await expect(page.getByTestId('stat-retention')).toHaveText('75%');
    await expect(page.getByText('retention, last 30 days (4 reviews)')).toBeVisible();
    await expect(page.getByTestId('stat-streak')).toHaveText('3');
    await expect(page.getByTestId('stat-unseen')).toHaveText(String(WORDS.length - 6));

    // Calendar heatmap: 18 weeks of squares, three of them active.
    const heat = page.getByTestId('heatmap');
    await expect(heat.locator('.cell')).toHaveCount(18 * 7);
    await expect(heat.locator('.cell.l1, .cell.l2, .cell.l3, .cell.l4')).toHaveCount(3);
    const todayCell = heat.locator('.cell:not(.future)').last();
    await todayCell.click();
    await expect(page.locator('.chart-readout').first()).toContainText('12 reviews, 2 new words, 5 practice questions');
    await page.getByText('Show the last 14 days as a table').click();
    await expect(page.getByRole('table').first().getByRole('row')).toHaveCount(15);

    // Forecast: 14 days; two cards are due today (one of them overdue).
    const bars = page.getByTestId('forecast').getByRole('button');
    await expect(bars).toHaveCount(14);
    await expect(bars.first()).toHaveAccessibleName('Today: 2 reviews due');
    await expect(bars.nth(1)).toHaveAccessibleName(/: 1 review due$/);
    await bars.nth(3).click();
    await expect(page.locator('.chart-readout').nth(1)).toContainText('1 review due');
    await page.getByText('Show the forecast as a table').click();
    await expect(page.getByRole('table').nth(1).getByRole('row')).toHaveCount(15);

    // The same numbers drive the home page.
    await open(page);
    await expect(page.getByTestId('due-count')).toHaveText('2');
  });
});

test.describe('Speed Game', () => {
  test('a 60 second round with scoring and a saved best score', async ({ page }) => {
    await page.clock.install();
    await open(page, 'game');
    await expect(page.getByText('60 seconds')).toBeVisible();
    await expect(page.getByTestId('best')).toHaveText('0');
    await page.getByTestId('start-game').click();
    await expect(page.getByTestId('game-timer')).toHaveText('0:60');

    // Three right answers in a row: 10 + 12 + 14 points.
    for (let i = 0; i < 3; i++) {
      const matches = (await page.getByTestId('game-card').getAttribute('data-matches')) === 'true';
      await page.getByTestId(matches ? 'match' : 'no-match').click();
    }
    await expect(page.getByTestId('live-score')).toHaveText('36');
    // A wrong answer scores nothing and resets the streak.
    const matches = (await page.getByTestId('game-card').getAttribute('data-matches')) === 'true';
    await page.getByTestId(matches ? 'no-match' : 'match').click();
    await expect(page.getByTestId('live-score')).toHaveText('36');
    await expect(page.getByText('Streak 0')).toBeVisible();

    await page.clock.runFor(30_000);
    await expect(page.getByTestId('game-timer')).toHaveText('0:30');
    await page.clock.runFor(31_000);
    await expect(page.getByRole('heading', { name: 'Time!' })).toBeVisible();
    await expect(page.getByTestId('game-score')).toHaveText('36');
    await expect(page.getByText('3 of 4 correct. New best score!')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Words that tripped you up' })).toBeVisible();

    await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByTestId('game-timer')).toHaveText('0:60');
    await open(page);
    await open(page, 'game');
    await expect(page.getByTestId('best')).toHaveText('36');
  });

  test('arrow keys play the game', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard shortcuts are for laptops');
    await open(page, 'game');
    await page.getByTestId('start-game').click();
    const matches = (await page.getByTestId('game-card').getAttribute('data-matches')) === 'true';
    await page.keyboard.press(matches ? 'ArrowRight' : 'ArrowLeft');
    await expect(page.getByTestId('live-score')).toHaveText('10');
  });
});

test.describe('How This App Works', () => {
  test('explains the science in plain language with sources', async ({ page }) => {
    await open(page, 'how');
    for (const h of ['What the SAT actually asks', '1. Spacing: review just before you forget', '2. Recall first, then check', '4. Word parts', '5. Mixing things up', '7. Explanations and the mistake log', 'Sources']) {
      await expect(page.getByRole('heading', { name: h })).toBeVisible();
    }
    await expect(page.locator('#src-1')).toContainText('College Board');
    await expect(page.locator('ol li[id^="src-"]')).toHaveCount(20);
    await expect(page.getByText('Roediger and Karpicke (2006)')).toBeVisible();
  });
});

test.describe('Settings', () => {
  test('dark and light mode, remembered after a reload', async ({ page }) => {
    await open(page, 'settings');
    await page.locator('.option', { hasText: 'Dark' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('.option', { hasText: 'Light' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(darkBg).not.toBe(lightBg);
  });

  test('follows the device color scheme by default', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page);
    const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.emulateMedia({ colorScheme: 'light' });
    const light = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(dark).toBe('rgb(18, 23, 29)');
    expect(light).toBe('rgb(246, 245, 241)');
  });

  test('study settings change the daily plan', async ({ page }) => {
    await open(page, 'settings');
    await page.getByLabel('New words per day').fill('4');
    await page.getByLabel('Target retention').selectOption('0.93');
    await page.locator('.option', { hasText: 'Tier 1' }).click(); // turn tier 1 off
    await open(page);
    await expect(page.getByTestId('new-count')).toHaveText('4');
    await open(page, 'learn');
    await page.getByTestId('start-learn').click();
    const firstOther = WORDS.find((w) => w.tier !== 1)!;
    await expect(page.getByTestId('study-card').locator('.headword')).toHaveText(firstOther.word);
  });

  test('export a backup, erase everything, and import it back', async ({ page }) => {
    acceptDialogs(page);
    const learned = await learnBatch(page, 2);
    await open(page, 'settings');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export').click()]);
    expect(download.suggestedFilename()).toMatch(/^sat-vocab-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    const backup = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    expect(backup.app).toBe('sat-vocab');
    expect(backup.cards.map((c: { id: string }) => c.id).sort()).toEqual([...learned].sort());
    expect(backup.cards[0].sentence).toContain('My teacher used the word');

    await page.getByTestId('reset').click();
    await expect(page.getByTestId('settings-message')).toHaveText('All progress erased.');
    await open(page);
    await expect(page.getByTestId('due-count')).toHaveText('0');

    await importBackup(page, backup);
    await open(page);
    await expect(page.getByTestId('due-count')).toHaveText('2');
  });

  test('refuses a file that is not a backup', async ({ page }) => {
    acceptDialogs(page);
    await open(page, 'settings');
    await page.getByTestId('import').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":"world"}') });
    await expect(page.getByTestId('settings-message')).toContainText('does not look like a SAT Vocab backup');
    await page.getByTestId('import').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('not json') });
    await expect(page.getByTestId('settings-message')).toHaveText('That file is not valid JSON.');
  });
});
