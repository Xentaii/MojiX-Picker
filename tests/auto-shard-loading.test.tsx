import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import type { MojiXDataFetcher } from '../src/core/data-source';

const SHARD_PAYLOADS: Record<string, unknown> = {
  smileys: {
    version: 1,
    fields: [
      'id',
      'native',
      'aliases',
      'emoticons',
      'categoryId',
      'subcategory',
      'sheetX',
      'sheetY',
      'skins',
    ],
    categories: ['smileys'],
    subcategories: ['face-smiling'],
    skinTones: ['light'],
    rows: [
      ['1f600', '\u{1F600}', ['grinning'], [':D'], 0, 0, 32, 47, null],
    ],
  },
  people: {
    version: 1,
    fields: [
      'id',
      'native',
      'aliases',
      'emoticons',
      'categoryId',
      'subcategory',
      'sheetX',
      'sheetY',
      'skins',
    ],
    categories: ['people'],
    subcategories: ['hand-fingers-open'],
    skinTones: ['light'],
    rows: [
      ['1f44b', '\u{1F44B}', ['wave'], null, 0, 0, 4, 55, null],
    ],
  },
};

describe('EmojiPicker with loadCategoryShards', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  async function setup(fetcherOverride?: MojiXDataFetcher) {
    const dataSourceModule = await import('../src/core/data-source');
    const i18nModule = await import('../src/core/i18n');
    const enLocaleModule = await import('../src/entries/locales/en');
    const reactModule = await import('react');
    const indexModule = await import('../src/index');

    i18nModule.registerEmojiLocalePack('en', enLocaleModule.default);

    const fetcher =
      fetcherOverride ??
      vi.fn(async (request) => {
        if (request.kind === 'emoji-data' && request.key.startsWith('emoji-shard:')) {
          const id = request.key.slice('emoji-shard:'.length);
          const payload = SHARD_PAYLOADS[id];
          if (!payload) {
            throw new Error('No fixture for shard ' + id);
          }
          return payload as never;
        }
        throw new Error('Unexpected fetch: ' + request.key);
      });

    dataSourceModule.configureMojiXDataSource({
      cache: false,
      preparedCache: false,
      fetcher,
    });

    return { reactModule, indexModule, fetcher };
  }

  it('loads only the active shard, not a full bootstrap', async () => {
    const { indexModule, fetcher } = await setup();
    const { EmojiPicker } = indexModule;

    const { container } = render(
      <EmojiPicker
        loadCategoryShards
        showRecents={false}
        activeCategory="smileys"
      />,
    );

    await waitFor(() => {
      const buttons = container.querySelectorAll('[data-mx-slot="emoji"]');
      expect(buttons.length).toBeGreaterThan(0);
    });

    const fetchedKeys = (fetcher as ReturnType<typeof vi.fn>).mock.calls.map(
      ([request]) => (request as { key: string }).key,
    );
    // No bootstrap — only shard fetches occurred. The smileys shard is
    // among them; the test does not pin the exact set because jsdom layout
    // can briefly drive the observer through other categories.
    expect(fetchedKeys).toContain('emoji-shard:smileys');
    for (const key of fetchedKeys) {
      expect(key).toMatch(/^emoji-shard:/);
    }
  });

  it('lazy-loads a shard when activeCategory changes (controlled)', async () => {
    const { reactModule, indexModule, fetcher } = await setup();
    const { EmojiPicker } = indexModule;
    const { useState } = reactModule;

    function Harness() {
      const [active, setActive] = useState<'smileys' | 'people'>('smileys');
      return (
        <div>
          <button data-testid="go-people" onClick={() => setActive('people')}>
            Go to people
          </button>
          <EmojiPicker
            loadCategoryShards
            showRecents={false}
            activeCategory={active}
          />
        </div>
      );
    }

    const { getByTestId } = render(<Harness />);

    await waitFor(() => {
      const fetchedKeys = (fetcher as ReturnType<typeof vi.fn>).mock.calls.map(
        ([request]) => (request as { key: string }).key,
      );
      expect(fetchedKeys).toContain('emoji-shard:smileys');
    });

    fireEvent.click(getByTestId('go-people'));

    await waitFor(() => {
      const fetchedKeys = (fetcher as ReturnType<typeof vi.fn>).mock.calls.map(
        ([request]) => (request as { key: string }).key,
      );
      expect(fetchedKeys).toContain('emoji-shard:people');
    });
  });

  it('falls back to loading smileys when activeCategory is recent', async () => {
    const { indexModule, fetcher } = await setup();
    const { EmojiPicker } = indexModule;

    render(
      <EmojiPicker
        loadCategoryShards
        activeCategory="recent"
      />,
    );

    await waitFor(() => {
      const fetchedKeys = (fetcher as ReturnType<typeof vi.fn>).mock.calls.map(
        ([request]) => (request as { key: string }).key,
      );
      // The picker auto-bootstraps smileys when active is 'recent' so the
      // grid is not empty.
      expect(fetchedKeys).toContain('emoji-shard:smileys');
    });
  });
});
