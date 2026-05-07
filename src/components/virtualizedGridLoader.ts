let virtualizedEmojiGridModulePromise:
  | Promise<typeof import('./VirtualizedEmojiGrid')>
  | null = null;

export function loadVirtualizedEmojiGridModule() {
  virtualizedEmojiGridModulePromise ??= import('./VirtualizedEmojiGrid');
  return virtualizedEmojiGridModulePromise;
}

export function preloadVirtualizedEmojiGrid() {
  void loadVirtualizedEmojiGridModule();
}
