import { describe, expect, it } from 'vitest';
import {
  getLocalizedSearchTokens,
  peekUnicodeEmojiById,
} from '../src/core/data';
import {
  registerEmojiLocalePack,
  resolveLocaleDefinition,
} from '../src/core/i18n';

describe('getLocalizedSearchTokens cache', () => {
  it('returns the same array reference for repeat calls with the same locale', () => {
    const emoji = peekUnicodeEmojiById('1f600');
    expect(emoji).toBeDefined();

    const localeDefinition = resolveLocaleDefinition('en');

    const first = getLocalizedSearchTokens(emoji!, localeDefinition);
    const second = getLocalizedSearchTokens(emoji!, localeDefinition);

    expect(second).toBe(first);
  });

  it('returns distinct cached arrays per locale code', () => {
    const emoji = peekUnicodeEmojiById('1f600');
    expect(emoji).toBeDefined();

    const enTokens = getLocalizedSearchTokens(
      emoji!,
      resolveLocaleDefinition('en'),
    );
    const frTokens = getLocalizedSearchTokens(
      emoji!,
      resolveLocaleDefinition('fr'),
    );

    expect(enTokens).not.toBe(frTokens);
    // Re-reading with the same locale code should still hit the cache.
    expect(
      getLocalizedSearchTokens(emoji!, resolveLocaleDefinition('en')),
    ).toBe(enTokens);
  });

  it('invalidates the cached tokens after a locale pack is registered', () => {
    const emoji = peekUnicodeEmojiById('1f600');
    expect(emoji).toBeDefined();

    const localeDefinition = resolveLocaleDefinition('en');
    const before = getLocalizedSearchTokens(emoji!, localeDefinition);

    // Re-registering a pack bumps the registry version, which should
    // invalidate the cache and force a fresh computation. Use a single token
    // (no separators) so normalization keeps it intact.
    const sentinel = 'freshkeyword' + Date.now();
    registerEmojiLocalePack('en', {
      '1f600': {
        name: 'Grinning face',
        keywords: ['grinning', 'happy', sentinel],
      },
    });

    const after = getLocalizedSearchTokens(
      emoji!,
      resolveLocaleDefinition('en'),
    );

    expect(after).not.toBe(before);
    expect(after).toContain(sentinel);
  });

  it('returns an empty array for custom emojis without populating the cache', () => {
    const customEmoji = {
      kind: 'custom' as const,
      id: 'custom:wave',
      name: 'Wave',
      native: 'wave',
      shortcodes: ['wave'],
      emoticons: [],
      categoryId: 'custom',
      categoryLabel: 'Custom',
      searchTokens: ['wave'],
    };

    const tokens = getLocalizedSearchTokens(
      customEmoji,
      resolveLocaleDefinition('en'),
    );

    expect(tokens).toEqual([]);
  });
});
