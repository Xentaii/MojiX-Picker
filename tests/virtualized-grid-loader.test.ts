import { describe, expect, it } from 'vitest';
import {
  loadVirtualizedEmojiGridModule,
  preloadVirtualizedEmojiGrid,
} from '../src/components/virtualizedGridLoader';

describe('virtualizedGridLoader', () => {
  it('memoizes the module promise across repeated calls', () => {
    const first = loadVirtualizedEmojiGridModule();
    const second = loadVirtualizedEmojiGridModule();

    expect(first).toBe(second);
  });

  it('resolves to a module that exports VirtualizedEmojiGrid', async () => {
    const module = await loadVirtualizedEmojiGridModule();

    expect(module).toBeDefined();
    expect(module.VirtualizedEmojiGrid).toBeTypeOf('function');
  });

  it('preloadVirtualizedEmojiGrid kicks off the same memoized import', async () => {
    preloadVirtualizedEmojiGrid();

    const module = await loadVirtualizedEmojiGridModule();
    expect(module.VirtualizedEmojiGrid).toBeTypeOf('function');
  });
});
