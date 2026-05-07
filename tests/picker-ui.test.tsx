import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { EmojiPicker } from '../src/index';

const hiddenSystemCategories = {
  smileys: { hidden: true },
  people: { hidden: true },
  animals: { hidden: true },
  food: { hidden: true },
  activities: { hidden: true },
  travel: { hidden: true },
  objects: { hidden: true },
  symbols: { hidden: true },
  flags: { hidden: true },
} as const;

describe('picker UI theming hooks', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('applies root color variables from the colors prop', () => {
    const { container } = render(
      <EmojiPicker
        colors={{
          accent: '#123456',
          hover: 'rgba(1, 2, 3, 0.25)',
          scrollbarThumb: 'rgba(9, 9, 9, 0.4)',
        }}
      />,
    );

    const root = container.querySelector(
      '[data-mx-slot="root"]',
    ) as HTMLDivElement | null;

    expect(root).not.toBeNull();
    expect(root?.style.getPropertyValue('--mx-accent')).toBe('#123456');
    expect(root?.style.getPropertyValue('--mx-hover')).toBe(
      'rgba(1, 2, 3, 0.25)',
    );
    expect(root?.style.getPropertyValue('--mx-scrollbar-thumb')).toBe(
      'rgba(9, 9, 9, 0.4)',
    );
    expect(root?.style.getPropertyValue('--mx-scrollbar-thumb-hover')).toBe(
      'color-mix(in srgb, rgba(9, 9, 9, 0.4) 82%, var(--mx-text) 18%)',
    );
  });

  it('supports per-item emoji and category hover colors', async () => {
    const { container } = render(
      <EmojiPicker
        colors={{
          emojiHover: () => 'rgb(10, 20, 30)',
          categoryHover: () => 'rgb(40, 50, 60)',
        }}
      />,
    );

    const firstEmoji = await waitFor(() => {
      const emoji = container.querySelector(
        '[data-mx-slot="emoji"]',
      ) as HTMLButtonElement | null;

      expect(emoji).not.toBeNull();
      return emoji!;
    });
    const firstCategoryButton = container.querySelector(
      '[data-mx-slot="navButton"]',
    ) as HTMLButtonElement | null;

    expect(firstCategoryButton).not.toBeNull();
    expect(firstEmoji?.style.getPropertyValue('--mx-emoji-hover')).toBe(
      'rgb(10, 20, 30)',
    );
    expect(
      firstCategoryButton?.style.getPropertyValue('--mx-category-hover'),
    ).toBe('rgb(40, 50, 60)');
  });

  it('passes virtualization settings through the root component', async () => {
    const customEmojis = Array.from({ length: 205 }, (_, index) => ({
      id: `custom-${index}`,
      name: `Custom ${index}`,
      native: 'x',
    }));

    const { container } = render(
      <EmojiPicker
        showPreview={false}
        showRecents={false}
        showSkinTones={false}
        categories={hiddenSystemCategories}
        customEmojis={customEmojis}
        virtualization={false}
      />,
    );

    await waitFor(() => {
      expect(
        container.querySelectorAll('[data-mx-slot="emoji"]'),
      ).toHaveLength(customEmojis.length);
    });
    expect(
      container.querySelector('[data-mx-slot="gridPlaceholder"]'),
    ).toBeNull();
  });

  it('does not render a retained sprite sheet for native zero-config usage', async () => {
    const { container } = render(<EmojiPicker />);

    await waitFor(() => {
      expect(
        container.querySelectorAll('[data-mx-slot="emoji"]').length,
      ).toBeGreaterThan(0);
    });

    const retainedImages = container.querySelectorAll(
      'img[aria-hidden="true"]',
    );
    expect(retainedImages).toHaveLength(0);
  });

  it('retains explicit sprite sheets in the root for WebView scrolling', () => {
    const { container } = render(
      <EmojiPicker
        spriteSheet={{
          source: 'custom',
          url: 'https://example.com/emoji.png',
        }}
      />,
    );

    const retainedSpriteSheet = container.querySelector(
      'img[aria-hidden="true"][src="https://example.com/emoji.png"]',
    ) as HTMLImageElement | null;

    expect(retainedSpriteSheet).not.toBeNull();
    expect(retainedSpriteSheet?.getAttribute('loading')).toBe('eager');
    expect(retainedSpriteSheet?.getAttribute('decoding')).toBe('async');
  });

  it('re-renders only the affected emoji cells when hover changes', async () => {
    const renderCounts = new Map<string, number>();
    const renderEmoji = vi.fn((emoji: { id: string; name: string }) => {
      renderCounts.set(
        emoji.id,
        (renderCounts.get(emoji.id) ?? 0) + 1,
      );

      return <span>{emoji.name}</span>;
    });

    const { container } = render(
      <EmojiPicker
        showPreview={false}
        showRecents={false}
        showSkinTones={false}
        categories={hiddenSystemCategories}
        customEmojis={[
          { id: 'wave', name: 'Wave' },
          { id: 'party', name: 'Party' },
          { id: 'rocket', name: 'Rocket' },
        ]}
        renderEmoji={renderEmoji}
      />,
    );

    const emojis = Array.from(
      container.querySelectorAll('[data-mx-slot="emoji"]'),
    ) as HTMLButtonElement[];
    const initialWaveRenders = renderCounts.get('wave') ?? 0;
    const initialPartyRenders = renderCounts.get('party') ?? 0;
    const initialRocketRenders = renderCounts.get('rocket') ?? 0;

    expect(emojis).toHaveLength(3);
    expect(initialWaveRenders).toBeGreaterThan(0);
    expect(initialPartyRenders).toBeGreaterThan(0);
    expect(initialRocketRenders).toBeGreaterThan(0);

    fireEvent.mouseEnter(emojis[0]!);

    await waitFor(() => {
      expect(renderCounts.get('wave')).toBe(initialWaveRenders + 1);
    });

    expect(renderCounts.get('party')).toBe(initialPartyRenders);
    expect(renderCounts.get('rocket')).toBe(initialRocketRenders);

    fireEvent.mouseEnter(emojis[1]!);

    await waitFor(() => {
      expect(renderCounts.get('wave')).toBe(initialWaveRenders + 2);
      expect(renderCounts.get('party')).toBe(initialPartyRenders + 1);
    });

    expect(renderCounts.get('rocket')).toBe(initialRocketRenders);
  });

  it('highlights only the hovered duplicate emoji cell', async () => {
    const { container } = render(
      <EmojiPicker
        showPreview={false}
        showSkinTones={false}
        recent={{
          emptyEmojiIds: ['1f600'],
          showWhenEmpty: true,
        }}
      />,
    );

    const grinningFaceButtons = await waitFor(() => {
      const buttons = Array.from(
        container.querySelectorAll(
          '[data-mx-slot="emoji"][aria-label="Grinning face"]',
        ),
      ) as HTMLButtonElement[];

      expect(buttons.length).toBeGreaterThanOrEqual(2);
      return buttons;
    });

    fireEvent.mouseEnter(grinningFaceButtons[0]!);

    await waitFor(() => {
      expect(grinningFaceButtons[0]).toHaveAttribute(
        'data-active',
        'true',
      );
    });

    expect(grinningFaceButtons[1]).not.toHaveAttribute('data-active');
  });
});
