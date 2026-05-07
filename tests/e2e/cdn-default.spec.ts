import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const emojiDataJson = readFileSync(
  new URL('../../src/core/generated/emoji-data.json', import.meta.url),
  'utf8',
);
const englishLocaleJson = readFileSync(
  new URL('../../src/core/generated/emoji-locale.en.json', import.meta.url),
  'utf8',
);
const englishBootstrapJson = readFileSync(
  new URL('../../src/core/generated/emoji-bootstrap.en.json', import.meta.url),
  'utf8',
);

test.describe('MojiX CDN data loading', () => {
  test('loads emoji data from jsdelivr on first mount', async ({ page }) => {
    let bootstrapRequests = 0;

    await page.route(
      'https://cdn.jsdelivr.net/**/data/emoji-bootstrap.en.json',
      async (route) => {
        bootstrapRequests += 1;
        await new Promise((resolve) => setTimeout(resolve, 150));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: englishBootstrapJson,
        });
      },
    );
    await page.route(
      'https://cdn.jsdelivr.net/**/data/locales/en.json',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: englishLocaleJson,
        });
      },
    );

    await page.goto('/?fixture=cdn-default');
    await expect(
      page.getByRole('heading', { name: 'MojiX CDN fixture' }),
    ).toBeVisible();
    await expect(page.locator('[data-mx-slot="loading"]')).toBeVisible();
    await expect(page.locator('[data-mx-slot="emoji"]').nth(1)).toBeVisible();
    await expect(page.locator('[data-mx-slot="loading"]')).toHaveCount(0);
    expect(bootstrapRequests).toBe(1);
  });

  test('keeps loading visible and reports errors when the CDN request fails', async ({
    page,
  }) => {
    let emojiDataRequests = 0;

    await page.route(
      'https://cdn.jsdelivr.net/**/data/emoji-bootstrap.en.json',
      async (route) => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: '{"error":"unavailable"}',
        });
      },
    );
    await page.route(
      'https://cdn.jsdelivr.net/**/data/emoji-data.json',
      async (route) => {
        emojiDataRequests += 1;

        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: '{"error":"unavailable"}',
        });
      },
    );
    await page.route(
      'https://cdn.jsdelivr.net/**/data/locales/en.json',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: englishLocaleJson,
        });
      },
    );

    await page.goto('/?fixture=cdn-failure');
    await expect(
      page.getByRole('heading', { name: 'MojiX CDN fixture' }),
    ).toBeVisible();
    await expect(page.locator('[data-mx-slot="loading"]')).toBeVisible();
    await expect(page.getByTestId('cdn-error-output')).not.toHaveText('none');
    await expect(page.locator('[data-mx-slot="emoji"]').first()).toContainText('👋');
    expect(emojiDataRequests).toBe(1);
  });
});
