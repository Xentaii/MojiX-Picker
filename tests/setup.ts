import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/dom';
import emojiData from '../src/entries/data';
import enLocale from '../src/entries/locales/en';
import {
  preloadEmojiData,
  registerEmojiLocalePack,
} from '../src/index';

configure({ asyncUtilTimeout: 5000 });

registerEmojiLocalePack('en', enLocale);
preloadEmojiData(emojiData);
