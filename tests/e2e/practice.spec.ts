import { expect, test } from '@playwright/test';
import { choice, open, practiceAnswer, pickOption, questionLabel } from './helpers';

test.describe('Words in Context practice', () => {
  test('untimed set with an explanation after each answer', async ({ page }) => {
    await open(page, 'practice');
    await pickOption(page, '5');
    await page.getByTestId('start-practice').click();

    // Looks like the test: passage with a blank, the official question, four lettered choices.
    await expect(page.getByTestId('passage').getByRole('img', { name: 'blank' })).toBeVisible();
    await expect(page.getByText('Which choice completes the text with the most logical and precise word or phrase?')).toBeVisible();
    await expect(page.locator('.choice')).toHaveCount(4);
    await expect(page.getByTestId('timer')).toHaveCount(0);
    await expect(page.getByTestId('check')).toBeDisabled();

    // Question 1: cross out a choice, then answer correctly.
    const q1 = await practiceAnswer(page);
    await page.getByRole('button', { name: 'Cross out choice A' }).click();
    await expect(page.locator('.choice.eliminated')).toHaveCount(1);
    await choice(page, q1.correct).click();
    await page.getByTestId('check').click();
    const explanation = page.getByTestId('explanation');
    await expect(explanation).toContainText('Correct.');
    await expect(explanation.locator('li')).toHaveCount(3); // why each wrong choice fails
    await expect(page.locator('.choice.correct')).toHaveCount(1);
    await page.getByTestId('next').click();

    // Question 2: answer wrong and read why.
    const q2 = await practiceAnswer(page);
    await choice(page, q2.wrong).click();
    await page.getByTestId('check').click();
    await expect(page.getByTestId('explanation')).toContainText('Not quite.');
    await expect(page.getByTestId('explanation')).toContainText(q2.correct);
    await expect(page.getByTestId('explanation').getByText('your answer')).toBeVisible();
    await expect(page.locator('.choice.wrong')).toHaveCount(1);
    await page.getByTestId('next').click();

    // Questions 3 to 5 correctly.
    for (let i = 0; i < 3; i++) {
      const q = await practiceAnswer(page);
      await choice(page, q.correct).click();
      await page.getByTestId('check').click();
      await page.getByTestId('next').click();
    }

    await expect(page.getByRole('heading', { name: 'Practice results' })).toBeVisible();
    await expect(page.getByTestId('practice-score')).toHaveText('4 / 5');
    await expect(page.getByRole('region', { name: /^Question \d$/ })).toHaveCount(5);

    // The miss is in the mistake log with its reason.
    await page.getByRole('main').getByRole('link', { name: 'Mistake log' }).click();
    await expect(page.getByTestId('mistake-group')).toHaveCount(1);
    await expect(page.getByTestId('mistake-group')).toContainText(q2.wrong);
    await expect(page.getByTestId('mistake-group')).toContainText('Words in Context');
  });

  test('keyboard shortcuts answer and advance', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard shortcuts are for laptops');
    await open(page, 'practice');
    await pickOption(page, '5');
    await page.getByTestId('start-practice').click();
    await page.keyboard.press('b');
    await expect(page.locator('.choice.selected')).toHaveAttribute('data-choice', 'B');
    await page.keyboard.press('m');
    await expect(page.getByRole('button', { name: 'Marked for review' })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('explanation')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(questionLabel(page)).toHaveText('Question 2 of 5');
  });

  test('timed test-style set: countdown, navigator, review at the end', async ({ page }) => {
    await open(page, 'practice');
    await pickOption(page, /^Timed/);
    await pickOption(page, '5');
    await pickOption(page, /^At the end/);
    await page.getByTestId('start-practice').click();

    await expect(page.getByTestId('timer')).toHaveText(/^5:5\d$/); // 5 x 71 seconds = 5:55
    const nav = page.getByRole('navigation', { name: 'Question navigator' });
    await expect(nav.getByRole('button')).toHaveCount(5);

    // No feedback until the end.
    const q1 = await practiceAnswer(page);
    await choice(page, q1.correct).click();
    await expect(page.getByTestId('explanation')).toHaveCount(0);
    await page.getByRole('button', { name: 'Mark for review' }).click();
    await page.getByTestId('next').click();
    await expect(nav.getByRole('button', { name: 'Question 1, answered, marked for review' })).toBeVisible();

    // Jump ahead with the navigator, come back, and change an answer.
    await nav.getByRole('button', { name: /^Question 4/ }).click();
    await expect(questionLabel(page)).toHaveText('Question 4 of 5');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(questionLabel(page)).toHaveText('Question 3 of 5');
    await nav.getByRole('button', { name: /^Question 5/ }).click();
    const q5 = await practiceAnswer(page);
    await choice(page, q5.wrong).click();
    await page.getByTestId('next').click(); // Finish

    await expect(page.getByRole('heading', { name: 'Practice results' })).toBeVisible();
    await expect(page.getByTestId('practice-score')).toHaveText('1 / 5');
    await expect(page.getByText('unanswered', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'Question 5' })).toContainText('Not quite.');
  });

  test('the set ends when time runs out', async ({ page }) => {
    await page.clock.install();
    await open(page, 'practice');
    await pickOption(page, /^Timed/);
    await pickOption(page, '5');
    await page.getByTestId('start-practice').click();
    await expect(page.getByTestId('timer')).toBeVisible();
    await page.clock.runFor(100_000);
    await expect(page.getByTestId('timer')).toHaveText(/^4:1\d$/);
    await page.clock.runFor(260_000);
    await expect(page.getByRole('heading', { name: 'Practice results' })).toBeVisible();
    await expect(page.getByText('Time ran out.')).toBeVisible();
    await expect(page.getByTestId('practice-score')).toHaveText('0 / 5');
  });
});
