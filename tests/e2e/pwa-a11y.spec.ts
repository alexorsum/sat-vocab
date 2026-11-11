import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { importBackup, open, seededBackup, pickOption } from './helpers';

test.describe('Installable, offline app', () => {
  // These tests need the real service worker.
  test.use({ serviceWorkers: 'allow' });

  test('has a web app manifest with icons and the right paths', async ({ page, request }) => {
    await open(page);
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBe('/sat-vocab/manifest.webmanifest');
    const manifest = await (await request.get('manifest.webmanifest')).json();
    expect(manifest.name).toBe('SAT Vocab');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/sat-vocab/');
    expect(manifest.scope).toBe('/sat-vocab/');
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
    for (const icon of manifest.icons) {
      const res = await request.get(icon.src);
      expect(res.status(), icon.src).toBe(200);
    }
  });

  test('works with no network after the first visit, and keeps progress', async ({ page, context }) => {
    await open(page);
    // Wait until the service worker controls the page and has cached the app.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
      }
    });
    await importBackup(page, seededBackup());

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await open(page);
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
    await expect(page.getByTestId('due-count')).toHaveText('2');

    // Every part of the app is available offline, including the word data.
    await open(page, 'browse');
    await expect(page.getByTestId('result-count')).toContainText('words');
    await page.getByTestId('search').fill('plausible');
    await page.getByTestId('word-list').getByRole('link', { name: /^plausible/ }).click();
    await expect(page.getByRole('heading', { name: 'plausible', level: 1 })).toBeVisible();
    await open(page, 'practice');
    await page.getByTestId('start-practice').click();
    await expect(page.getByTestId('passage')).toBeVisible();
    await open(page, 'review');
    await page.getByTestId('reveal').click();
    await page.locator('[data-rating="3"]').click();
    await expect(page.getByTestId('remaining')).toHaveText('1 left');
    await context.setOffline(false);
  });
});

test.describe('Accessibility', () => {
  const ROUTES = ['', 'learn', 'review', 'practice', 'quiz', 'roots', 'roots/bene', 'roots/quiz', 'mistakes', 'browse', 'word/plausible', 'progress', 'game', 'how', 'settings'];

  for (const scheme of ['light', 'dark'] as const) {
    test(`no WCAG A or AA violations on any page (${scheme} mode)`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.emulateMedia({ colorScheme: scheme });
      await importBackup(page, seededBackup());
      for (const route of ROUTES) {
        await open(page, route);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 4).join(' | ')}`);
        expect(summary, `/${route} in ${scheme} mode`).toEqual([]);
      }
    });
  }

  test('mid-session screens are accessible too', async ({ page }) => {
    await importBackup(page, seededBackup());
    const check = async (label: string) => {
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 4).join(' | ')}`), label).toEqual([]);
    };
    await open(page, 'review');
    await page.getByTestId('reveal').click();
    await check('review answer');

    await open(page, 'practice');
    await pickOption(page, '5');
    await page.getByTestId('start-practice').click();
    await check('practice question');
    await page.locator('.choice').first().click();
    await page.getByTestId('check').click();
    await check('practice explanation');

    await open(page, 'quiz');
    await page.locator('.option', { hasText: 'Matching' }).click();
    await page.getByTestId('start-quiz').click();
    await check('matching board');

    await open(page, 'game');
    await page.getByTestId('start-game').click();
    await check('speed game');
  });

  test('the whole review flow works from the keyboard alone', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard test runs on the laptop project');
    await importBackup(page, seededBackup());
    await open(page);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
    // On a freshly loaded page, the first Tab stop is the skip link.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Skip to content' })).toBeFocused();
    // Tab to the review link in the sidebar and open it.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /Daily Review/ }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Daily Review' })).toBeVisible();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('answer')).toBeVisible();
    await page.keyboard.press('3');
    await expect(page.getByTestId('remaining')).toHaveText('1 left');
    await page.keyboard.press('Enter');
    await page.keyboard.press('4');
    await expect(page.getByRole('heading', { name: 'Review complete' })).toBeVisible();
  });

  test('tap targets are big enough on a phone and nothing scrolls sideways', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Phone layout only');
    for (const route of ['', 'practice', 'quiz', 'browse', 'settings', 'progress']) {
      await open(page, route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `sideways scroll on /${route}`).toBeLessThanOrEqual(1);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('button, a.btn, .tabbar a, .option span, select, input[type="text"], input[type="search"], input[type="number"]')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            // Calendar squares and chart bars are read through the table view; skip hidden things.
            if (r.width === 0 || el.closest('.heatmap, .bars') || el.classList.contains('skip-link')) return false;
            return r.height < 40;
          })
          .map((el) => `${el.tagName} "${(el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().height)}px`),
      );
      expect(small, `small tap targets on /${route}`).toEqual([]);
    }
  });
});
