import { useEffect, useMemo, useState } from 'react';
import { AccessibilityFixture } from './AccessibilityFixture';
import { CdnDefaultFixture } from './CdnDefaultFixture';
import { OfflinePresetFixture } from './OfflinePresetFixture';
import {
  EmojiPicker,
  createNativeAssetSource,
  createEmojiSpriteSheet,
  warmEmojiSpriteSheet,
} from '../index';
import type {
  CustomEmoji,
  EmojiCategoryIconGlyph,
  EmojiCategoryIconPreset,
  EmojiLocaleCode,
  EmojiSelection,
  EmojiVendor,
} from '../index';
import orbitEmoji from './assets/mojix-orbit.svg';
import sparkEmoji from './assets/mojix-spark.svg';
import waveEmoji from './assets/mojix-wave.svg';
import {
  BUILTIN_DEMO_THEMES,
  DEMO_THEME_STORAGE_KEY,
  cloneDemoThemePalette,
  createCustomDemoThemeId,
  createPickerThemeStyle,
  isCustomDemoTheme,
  type DemoThemeDefinition,
  type DemoThemePalette,
} from './themePresets';

const CUSTOM_EMOJIS: CustomEmoji[] = [
  {
    id: 'mojix:orbit',
    name: 'MojiX Orbit',
    shortcodes: ['mojix_orbit'],
    keywords: ['brand', 'planet', 'satellite'],
    categoryId: 'brand',
    categoryLabel: 'Brand Kit',
    imageUrl: orbitEmoji,
  },
  {
    id: 'mojix:spark',
    name: 'MojiX Spark',
    shortcodes: ['mojix_spark'],
    keywords: ['energy', 'flash', 'brand'],
    categoryId: 'brand',
    categoryLabel: 'Brand Kit',
    imageUrl: sparkEmoji,
  },
  {
    id: 'mojix:wave',
    name: 'MojiX Wave',
    shortcodes: ['mojix_wave'],
    keywords: ['hello', 'brand', 'gesture'],
    categoryId: 'people',
    imageUrl: waveEmoji,
  },
];

const NATIVE_FALLBACK_SOURCE = createNativeAssetSource();
const RECENT_EMPTY_IDS = ['1f44b', '1f389', '2728', '1f680'];
const DEFAULT_BRAND_LABEL = 'Brand Kit';
const DEFAULT_CUSTOM_THEME_NAME = 'My Theme';
const DEFAULT_PREVIEW_EMOJI = String.fromCodePoint(0x1f642);
const MOBILE_DEMO_PANEL_QUERY = '(max-width: 760px)';

interface ShowcasePreset {
  id: string;
  name: string;
  tagline: string;
  vendor: EmojiVendor;
  palette: DemoThemePalette;
  columns: number;
  emojiSize: number;
  showSkinTones: boolean;
  categoryIconStyle: EmojiCategoryIconPreset;
}

const SHOWCASE_PRESETS: ShowcasePreset[] = [
  {
    id: 'editorial',
    name: 'Editorial',
    tagline: 'Monochrome, sharp, document-grade.',
    vendor: 'apple',
    palette: {
      mode: 'light',
      accent: '#171717',
      bg: '#ffffff',
      panel: '#fafafa',
      text: '#171717',
      muted: '#737373',
      radius: 8,
      accentMix: 8,
      scrollbar: '#d4d4d4',
    },
    columns: 7,
    emojiSize: 22,
    showSkinTones: false,
    categoryIconStyle: 'outline',
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'Indigo accents on graphite.',
    vendor: 'google',
    palette: {
      mode: 'dark',
      accent: '#7c5cff',
      bg: '#0e1014',
      panel: '#16181d',
      text: '#e8e6f0',
      muted: '#7c7d8a',
      radius: 14,
      accentMix: 24,
      scrollbar: '#3a3c4a',
    },
    columns: 7,
    emojiSize: 22,
    showSkinTones: true,
    categoryIconStyle: 'outline',
  },
  {
    id: 'pulse',
    name: 'Pulse',
    tagline: 'Blurple chat-app energy.',
    vendor: 'twitter',
    palette: {
      mode: 'dark',
      accent: '#5865f2',
      bg: '#1a1c24',
      panel: '#22242c',
      text: '#f2f3f5',
      muted: '#8e94a4',
      radius: 22,
      accentMix: 28,
      scrollbar: '#42454e',
    },
    columns: 7,
    emojiSize: 24,
    showSkinTones: true,
    categoryIconStyle: 'twitter',
  },
  {
    id: 'holiday',
    name: 'Holiday',
    tagline: 'Plum on warm cream paper.',
    vendor: 'facebook',
    palette: {
      mode: 'light',
      accent: '#a3185c',
      bg: '#fff8f1',
      panel: '#fff3e6',
      text: '#3a1d1d',
      muted: '#8c6f63',
      radius: 26,
      accentMix: 16,
      scrollbar: '#d4b89e',
    },
    columns: 7,
    emojiSize: 22,
    showSkinTones: true,
    categoryIconStyle: 'facebook',
  },
];

const SHOWCASE_SPRITE_SHEETS: Record<EmojiVendor, ReturnType<typeof createEmojiSpriteSheet>> = {
  twitter: createEmojiSpriteSheet({
    source: 'cdn',
    vendor: 'twitter',
    sheetSize: 64,
    variant: 'indexed-256',
    cache: { enabled: true, preload: 'mount' },
  }),
  google: createEmojiSpriteSheet({
    source: 'cdn',
    vendor: 'google',
    sheetSize: 64,
    variant: 'indexed-256',
    cache: { enabled: true, preload: 'mount' },
  }),
  apple: createEmojiSpriteSheet({
    source: 'cdn',
    vendor: 'apple',
    sheetSize: 64,
    variant: 'indexed-256',
    cache: { enabled: true, preload: 'mount' },
  }),
  facebook: createEmojiSpriteSheet({
    source: 'cdn',
    vendor: 'facebook',
    sheetSize: 64,
    variant: 'indexed-256',
    cache: { enabled: true, preload: 'mount' },
  }),
};

const VENDOR_OPTIONS: Array<{
  label: string;
  value: EmojiVendor;
}> = [
  { label: 'Twitter', value: 'twitter' },
  { label: 'Google', value: 'google' },
  { label: 'Apple', value: 'apple' },
  { label: 'Facebook', value: 'facebook' },
];

const LOCALE_OPTIONS: Array<{
  label: string;
  value: EmojiLocaleCode;
}> = [
  { label: 'Deutsch', value: 'de' },
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
  { label: 'Français', value: 'fr' },
  { label: '日本語', value: 'ja' },
  { label: 'Português', value: 'pt' },
  { label: 'Russian', value: 'ru' },
  { label: 'Українська', value: 'uk' },
];

const CATEGORY_ICON_STYLE_OPTIONS: Array<{
  label: string;
  value: EmojiCategoryIconPreset;
}> = [
  { label: 'Outline mono', value: 'outline' },
  { label: 'Native emoji', value: 'native' },
  { label: 'Picker emoji', value: 'picker' },
  { label: 'Twitter emoji', value: 'twitter' },
  { label: 'Google emoji', value: 'google' },
  { label: 'Apple emoji', value: 'apple' },
  { label: 'Facebook emoji', value: 'facebook' },
];

const PEOPLE_ICON_STYLE_OPTIONS: Array<{
  label: string;
  value: 'inherit' | EmojiCategoryIconPreset;
}> = [
  { label: 'Follow global style', value: 'inherit' },
  { label: 'Outline mono', value: 'outline' },
  { label: 'Native emoji', value: 'native' },
  { label: 'Picker emoji', value: 'picker' },
  { label: 'Twitter emoji', value: 'twitter' },
  { label: 'Google emoji', value: 'google' },
];

const BRAND_ICON_OPTIONS: Array<{
  label: string;
  value: EmojiCategoryIconGlyph;
}> = [
  { label: 'Rocket', value: 'rocket' },
  { label: 'Sparkles', value: 'sparkles' },
  { label: 'Star', value: 'star' },
  { label: 'Heart', value: 'heart' },
  { label: 'Bolt', value: 'bolt' },
  { label: 'Gift', value: 'gift' },
  { label: 'Palette', value: 'palette' },
  { label: 'Code', value: 'code' },
];

const SNIPPET_DROPIN = `import { EmojiPicker } from 'mojix-picker';
import 'mojix-picker/style.css';

<EmojiPicker
  onEmojiSelect={(emoji) => {
    console.log(emoji.native); // native emoji
  }}
/>`;

const SNIPPET_THEMED = `.my-picker {
  --mx-accent: #ee7848;
  --mx-bg: #fffaf4;
  --mx-panel: #fffafc;
  --mx-text: #201813;
  --mx-muted: #7b6e66;
  --mx-radius: 24px;
}

<EmojiPicker
  className="my-picker"
  onEmojiSelect={handler}
/>`;

const SNIPPET_HEADLESS = `import { MojiX } from 'mojix-picker';

function MyPicker({ onSelect }) {
  return (
    <MojiX.Root unstyled onEmojiSelect={onSelect}>
      <MojiX.Search />
      <MojiX.Viewport>
        <MojiX.Empty>Nothing found.</MojiX.Empty>
        <MojiX.List />
      </MojiX.Viewport>
      <MojiX.CategoryNav />
    </MojiX.Root>
  );
}`;

function formatSelectionPayload(selection: EmojiSelection | null) {
  if (!selection) {
    return `{
  "message": "Select an emoji in the picker."
}`;
  }

  return JSON.stringify(selection, null, 2);
}

function getSelectionToken(selection: EmojiSelection | null) {
  if (!selection) {
    return 'waiting';
  }

  if (selection.native) {
    return selection.native;
  }

  if (selection.shortcodes[0]) {
    return `:${selection.shortcodes[0]}:`;
  }

  return selection.name;
}

function escapeSnippetString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function readStoredCustomThemes() {
  if (typeof window === 'undefined') {
    return [] as DemoThemeDefinition[];
  }

  try {
    const raw = window.localStorage.getItem(DEMO_THEME_STORAGE_KEY);

    if (!raw) {
      return [] as DemoThemeDefinition[];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [] as DemoThemeDefinition[];
    }

    return parsed.flatMap((theme) => {
      if (!theme || typeof theme !== 'object') {
        return [];
      }

      const candidate = theme as Partial<DemoThemeDefinition>;
      const palette = candidate.palette as Partial<DemoThemePalette> | undefined;

      if (
        typeof candidate.id !== 'string' ||
        !isCustomDemoTheme(candidate.id) ||
        typeof candidate.name !== 'string' ||
        !palette ||
        (palette.mode !== 'light' && palette.mode !== 'dark') ||
        typeof palette.accent !== 'string' ||
        typeof palette.bg !== 'string' ||
        typeof palette.panel !== 'string' ||
        typeof palette.text !== 'string' ||
        typeof palette.muted !== 'string' ||
        typeof palette.radius !== 'number' ||
        !Number.isFinite(palette.radius)
      ) {
        return [];
      }

      return [
        {
          id: candidate.id,
          name: candidate.name,
          palette: {
            mode: palette.mode,
            accent: palette.accent,
            bg: palette.bg,
            panel: palette.panel,
            text: palette.text,
            muted: palette.muted,
            radius: palette.radius,
            accentMix:
              typeof palette.accentMix === 'number' &&
              Number.isFinite(palette.accentMix)
                ? palette.accentMix
                : palette.mode === 'dark'
                  ? 22
                  : 14,
            scrollbar:
              typeof palette.scrollbar === 'string'
                ? palette.scrollbar
                : palette.mode === 'dark'
                  ? '#5a4d44'
                  : '#7b6e66',
          },
        },
      ];
    });
  } catch {
    return [] as DemoThemeDefinition[];
  }
}

function buildPlaygroundSnippet(options: {
  brandIcon: EmojiCategoryIconGlyph;
  brandLabel: string;
  brandVisible: boolean;
  categoryIconStyle: EmojiCategoryIconPreset;
  columns: number;
  emojiSize: number;
  locale: EmojiLocaleCode;
  peopleIconStyle: 'inherit' | EmojiCategoryIconPreset;
  recentDefaultActive: boolean;
  recentEnabled: boolean;
  recentLimit: number;
  recentShowWhenEmpty: boolean;
  recentSort: 'recent' | 'frequent';
  showSkinTones: boolean;
  theme: DemoThemePalette;
  vendor: EmojiVendor;
}) {
  const lines = [
    `const pickerThemeStyle = {`,
    `  colorScheme: '${options.theme.mode}',`,
    `  '--mx-accent': '${options.theme.accent}',`,
    `  '--mx-bg': '${options.theme.bg}',`,
    `  '--mx-panel': '${options.theme.panel}',`,
    `  '--mx-text': '${options.theme.text}',`,
    `  '--mx-muted': '${options.theme.muted}',`,
    `  '--mx-radius': '${options.theme.radius}px',`,
    `};`,
    ``,
    `<EmojiPicker`,
    `  showPreview={false}`,
    `  locale="${options.locale}"`,
    `  emojiSize={${options.emojiSize}}`,
    `  columns={${options.columns}}`,
    `  showSkinTones={${options.showSkinTones}}`,
    `  categoryIconStyle="${options.categoryIconStyle}"`,
    `  customEmojis={CUSTOM_EMOJIS}`,
    `  style={pickerThemeStyle}`,
    `  spriteSheet={createEmojiSpriteSheet({`,
    `    source: 'cdn',`,
    `    vendor: '${options.vendor}',`,
    `    sheetSize: 64,`,
    `    variant: 'indexed-256',`,
    `    cache: { enabled: true, preload: 'mount' },`,
    `  })}`,
    `  recent={{`,
    `    enabled: ${options.recentEnabled},`,
    `    limit: ${options.recentLimit},`,
    `    showWhenEmpty: ${options.recentShowWhenEmpty},`,
    `    defaultActive: ${options.recentDefaultActive},`,
    `    sort: '${options.recentSort}',`,
    `    emptyEmojiIds: ['1f44b', '1f389', '2728', '1f680'],`,
    `  }}`,
    `  categories={{`,
    `    brand: {`,
    `      label: "${escapeSnippetString(options.brandLabel)}",`,
    `      order: 2.5,`,
    `      hidden: ${!options.brandVisible},`,
    `    },`,
  ];

  if (options.peopleIconStyle !== 'inherit') {
    lines.push(
      `    people: {`,
      `      iconStyle: '${options.peopleIconStyle}',`,
      `    },`,
    );
  }

  lines.push(
    `  }}`,
    `  categoryIcons={{ brand: '${options.brandIcon}' }}`,
    `  onEmojiSelect={handleEmojiSelect}`,
    `/>`,
  );

  return lines.join('\n');
}

export function App() {
  const activeFixture =
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('fixture');

  if (activeFixture === 'a11y') {
    return <AccessibilityFixture />;
  }

  if (activeFixture === 'cdn-default' || activeFixture === 'cdn-failure') {
    return <CdnDefaultFixture />;
  }

  if (activeFixture === 'offline-preset') {
    return <OfflinePresetFixture />;
  }

  const [lastEmoji, setLastEmoji] = useState<EmojiSelection | null>(null);
  const [spriteWarmed, setSpriteWarmed] = useState(false);
  const [showcaseWarmed, setShowcaseWarmed] = useState<
    Record<EmojiVendor, boolean>
  >({ twitter: false, google: false, apple: false, facebook: false });
  const [vendor, setVendor] = useState<EmojiVendor>('twitter');
  const [locale, setLocale] = useState<EmojiLocaleCode>('en');
  const [emojiSize, setEmojiSize] = useState(22);
  const [columns, setColumns] = useState(9);
  const [showSkinTones, setShowSkinTones] = useState(true);
  const [categoryIconStyle, setCategoryIconStyle] =
    useState<EmojiCategoryIconPreset>('outline');
  const [recentEnabled, setRecentEnabled] = useState(true);
  const [recentLimit, setRecentLimit] = useState(12);
  const [recentShowWhenEmpty, setRecentShowWhenEmpty] = useState(true);
  const [recentDefaultActive, setRecentDefaultActive] = useState(true);
  const [recentSort, setRecentSort] =
    useState<'recent' | 'frequent'>('recent');
  const [brandVisible, setBrandVisible] = useState(true);
  const [brandLabel, setBrandLabel] = useState(DEFAULT_BRAND_LABEL);
  const [brandIcon, setBrandIcon] =
    useState<EmojiCategoryIconGlyph>('rocket');
  const [peopleIconStyle, setPeopleIconStyle] =
    useState<'inherit' | EmojiCategoryIconPreset>('inherit');
  const [customThemes, setCustomThemes] = useState<DemoThemeDefinition[]>(
    () => readStoredCustomThemes(),
  );
  const [selectedThemeId, setSelectedThemeId] = useState(
    BUILTIN_DEMO_THEMES[0]!.id,
  );
  const [themeDraft, setThemeDraft] = useState<DemoThemePalette>(() =>
    cloneDemoThemePalette(BUILTIN_DEMO_THEMES[0]!.palette),
  );
  const [themeName, setThemeName] = useState(DEFAULT_CUSTOM_THEME_NAME);
  const [paramsOpen, setParamsOpen] = useState(true);
  const [snippetOpen, setSnippetOpen] = useState(false);
  const [panelCollapseEnabled, setPanelCollapseEnabled] = useState(() =>
    typeof window === 'undefined'
      ? false
      : window.matchMedia(MOBILE_DEMO_PANEL_QUERY).matches,
  );

  const resolvedBrandLabel = brandLabel.trim() || DEFAULT_BRAND_LABEL;
  const allThemes = useMemo(
    () => [...BUILTIN_DEMO_THEMES, ...customThemes],
    [customThemes],
  );
  const selectedThemeDefinition = useMemo(
    () =>
      allThemes.find((theme) => theme.id === selectedThemeId) ??
      BUILTIN_DEMO_THEMES[0]!,
    [allThemes, selectedThemeId],
  );
  const pickerThemeStyle = useMemo(
    () => createPickerThemeStyle(themeDraft),
    [themeDraft],
  );
  const isSelectedCustomTheme = isCustomDemoTheme(selectedThemeId);

  const spriteSheet = useMemo(
    () =>
      createEmojiSpriteSheet({
        source: 'cdn',
        vendor,
        sheetSize: 64,
        variant: 'indexed-256',
        cache: { enabled: true, preload: 'mount' },
      }),
    [vendor],
  );

  const demoRecent = useMemo(
    () => ({
      enabled: recentEnabled,
      limit: recentLimit,
      showWhenEmpty: recentShowWhenEmpty,
      defaultActive: recentDefaultActive,
      sort: recentSort,
      emptyEmojiIds: RECENT_EMPTY_IDS,
    }),
    [
      recentDefaultActive,
      recentEnabled,
      recentLimit,
      recentShowWhenEmpty,
      recentSort,
    ],
  );

  const demoCategories = useMemo(
    () => ({
      brand: {
        label: resolvedBrandLabel,
        order: 2.5,
        hidden: !brandVisible,
      },
      people: {
        ...(peopleIconStyle === 'inherit'
          ? {}
          : { iconStyle: peopleIconStyle }),
      },
    }),
    [brandVisible, peopleIconStyle, resolvedBrandLabel],
  );

  const demoCategoryIcons = useMemo(
    () => ({
      brand: brandIcon,
    }),
    [brandIcon],
  );

  useEffect(() => {
    if (allThemes.some((theme) => theme.id === selectedThemeId)) {
      return;
    }

    setSelectedThemeId(BUILTIN_DEMO_THEMES[0]!.id);
  }, [allThemes, selectedThemeId]);

  useEffect(() => {
    setThemeDraft(cloneDemoThemePalette(selectedThemeDefinition.palette));
    setThemeName(
      selectedThemeDefinition.builtin
        ? `${selectedThemeDefinition.name} Custom`
        : selectedThemeDefinition.name,
    );
  }, [selectedThemeDefinition]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      DEMO_THEME_STORAGE_KEY,
      JSON.stringify(customThemes),
    );
  }, [customThemes]);

  useEffect(() => {
    let cancelled = false;

    setSpriteWarmed(false);

    warmEmojiSpriteSheet(spriteSheet)
      .then(() => {
        if (!cancelled) {
          setSpriteWarmed(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSpriteWarmed(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [spriteSheet]);

  useEffect(() => {
    let cancelled = false;
    const vendors: EmojiVendor[] = ['twitter', 'google', 'apple', 'facebook'];

    vendors.forEach((vendorKey) => {
      warmEmojiSpriteSheet(SHOWCASE_SPRITE_SHEETS[vendorKey])
        .then(() => {
          if (!cancelled) {
            setShowcaseWarmed((prev) => ({ ...prev, [vendorKey]: true }));
          }
        })
        .catch(() => {});
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_DEMO_PANEL_QUERY);
    const updatePanelCollapse = () => {
      setPanelCollapseEnabled(mediaQuery.matches);
    };

    updatePanelCollapse();
    mediaQuery.addEventListener('change', updatePanelCollapse);

    return () => {
      mediaQuery.removeEventListener('change', updatePanelCollapse);
    };
  }, []);

  function handleEmojiSelect(emoji: EmojiSelection) {
    setLastEmoji(emoji);
  }

  function updateThemeDraft(
    key: keyof DemoThemePalette,
    value: DemoThemePalette[keyof DemoThemePalette],
  ) {
    setThemeDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleThemeSave() {
    const nextName = themeName.trim() || DEFAULT_CUSTOM_THEME_NAME;

    if (isSelectedCustomTheme) {
      setCustomThemes((themes) =>
        themes.map((theme) =>
          theme.id === selectedThemeId
            ? {
                ...theme,
                name: nextName,
                palette: cloneDemoThemePalette(themeDraft),
              }
            : theme,
        ),
      );
      return;
    }

    const nextTheme: DemoThemeDefinition = {
      id: createCustomDemoThemeId(nextName),
      name: nextName,
      palette: cloneDemoThemePalette(themeDraft),
    };

    setCustomThemes((themes) => [...themes, nextTheme]);
    setSelectedThemeId(nextTheme.id);
  }

  function handleThemeDelete() {
    if (!isSelectedCustomTheme) {
      return;
    }

    setCustomThemes((themes) =>
      themes.filter((theme) => theme.id !== selectedThemeId),
    );
    setSelectedThemeId(BUILTIN_DEMO_THEMES[0]!.id);
  }

  function resetDemoControls() {
    const defaultTheme = BUILTIN_DEMO_THEMES[0]!;

    setVendor('twitter');
    setLocale('en');
    setEmojiSize(22);
    setColumns(9);
    setShowSkinTones(true);
    setCategoryIconStyle('outline');
    setRecentEnabled(true);
    setRecentLimit(12);
    setRecentShowWhenEmpty(true);
    setRecentDefaultActive(true);
    setRecentSort('recent');
    setBrandVisible(true);
    setBrandLabel(DEFAULT_BRAND_LABEL);
    setBrandIcon('rocket');
    setPeopleIconStyle('inherit');
    setSelectedThemeId(defaultTheme.id);
    setThemeDraft(cloneDemoThemePalette(defaultTheme.palette));
    setThemeName(DEFAULT_CUSTOM_THEME_NAME);
  }

  const selectionPayload = useMemo(
    () => formatSelectionPayload(lastEmoji),
    [lastEmoji],
  );
  const selectionToken = getSelectionToken(lastEmoji);
  const playgroundSnippet = useMemo(
    () =>
      buildPlaygroundSnippet({
        brandIcon,
        brandLabel: resolvedBrandLabel,
        brandVisible,
        categoryIconStyle,
        columns,
        emojiSize,
        locale,
        peopleIconStyle,
        recentDefaultActive,
        recentEnabled,
        recentLimit,
        recentShowWhenEmpty,
        recentSort,
        showSkinTones,
        theme: themeDraft,
        vendor,
      }),
    [
      brandIcon,
      brandVisible,
      categoryIconStyle,
      columns,
      emojiSize,
      locale,
      peopleIconStyle,
      recentDefaultActive,
      recentEnabled,
      recentLimit,
      recentShowWhenEmpty,
      recentSort,
      resolvedBrandLabel,
      showSkinTones,
      themeDraft,
      vendor,
    ],
  );

  const paramsExpanded = !panelCollapseEnabled || paramsOpen;
  const snippetExpanded = !panelCollapseEnabled || snippetOpen;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__inner">
          <span className="topbar__brand">MojiX</span>
          <a
            className="topbar__link"
            href="https://github.com/Xentaii/MojiX-Picker"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="MojiX on GitHub"
          >
            <GitHubIcon />
            <span className="topbar__link-label">GitHub</span>
          </a>
        </div>
      </header>

      <div className="page">
      <header className="hero">
        <div className="hero__inner">
          <span className="badge">MojiX</span>
          <h1 className="hero__title">
            Emoji picker
            <br />
            for React.
          </h1>
          <p className="hero__sub">
            Drop-in ready out of the box. Fully composable when you need
            control.
          </p>
          <code className="install-cmd">npm install mojix-picker</code>
        </div>
      </header>

      <section className="showcase-section">
        <div className="showcase-intro">
          <span className="badge badge--soft">Theme presets</span>
          <h2>Four pickers. One component.</h2>
          <p>
            Same <code>EmojiPicker</code>, four production-ready theme token
            sets. Drop any of these straight into your app.
          </p>
        </div>
        <div className="showcase-grid">
          {SHOWCASE_PRESETS.map((preset) => (
            <article key={preset.id} className="showcase-item">
              <div className="showcase-item__frame">
                <EmojiPicker
                  className="showcase-picker"
                  showPreview={false}
                  locale="en"
                  emojiSize={preset.emojiSize}
                  columns={preset.columns}
                  showSkinTones={preset.showSkinTones}
                  categoryIconStyle={preset.categoryIconStyle}
                  style={createPickerThemeStyle(preset.palette)}
                  spriteSheet={SHOWCASE_SPRITE_SHEETS[preset.vendor]}
                  assetSource={
                    showcaseWarmed[preset.vendor]
                      ? undefined
                      : NATIVE_FALLBACK_SOURCE
                  }
                  virtualization={false}
                />
              </div>
              <div className="showcase-item__label">
                <strong>{preset.name}</strong>
                <span>{preset.tagline}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="demo-section">
        <div className="demo-intro">
          <span className="badge badge--soft">Build your own</span>
          <h2>Configure it your way.</h2>
          <p>
            Tune every token below and watch the React snippet update in real
            time.
          </p>
        </div>
        <div className="demo-shell">
          <div className="demo-row demo-row--main">
          <section className="playground-card playground-card--picker">
            <div className="playground-card__head">
              <div>
                <span className="playground-card__eyebrow">Live Picker</span>
                <strong>Default UI playground</strong>
              </div>
              <span className="playground-status">
                {selectedThemeDefinition.name} / {vendor} /{' '}
                {spriteWarmed ? 'ready' : 'warming'}
              </span>
            </div>
            <div className="playground-card__body playground-card__body--picker">
              <EmojiPicker
                className="demo-picker"
                showPreview={false}
                locale={locale}
                emojiSize={emojiSize}
                columns={columns}
                showSkinTones={showSkinTones}
                categoryIconStyle={categoryIconStyle}
                customEmojis={CUSTOM_EMOJIS}
                style={pickerThemeStyle}
                spriteSheet={spriteSheet}
                assetSource={
                  spriteWarmed ? undefined : NATIVE_FALLBACK_SOURCE
                }
                recent={demoRecent}
                categories={demoCategories}
                categoryIcons={demoCategoryIcons}
                onEmojiSelect={handleEmojiSelect}
              />
            </div>
          </section>

          <section className="playground-card playground-card--preview">
            <div className="playground-card__head">
              <div>
                <span className="playground-card__eyebrow">Selection</span>
                <strong>Large emoji render</strong>
              </div>
              <span className="playground-status playground-status--soft">
                {lastEmoji ? lastEmoji.categoryLabel : 'idle'}
              </span>
            </div>
            <div className="playground-card__body">
              <div className="playground-preview" aria-live="polite">
                <div className="playground-preview__stage">
                  {lastEmoji?.imageUrl ? (
                    <img
                      className="playground-preview__image"
                      src={lastEmoji.imageUrl}
                      alt={lastEmoji.name}
                    />
                  ) : (
                    <span className="playground-preview__emoji">
                      {lastEmoji?.native ?? DEFAULT_PREVIEW_EMOJI}
                    </span>
                  )}
                </div>

                <div className="playground-preview__copy">
                  <strong>
                    {lastEmoji?.name ?? 'Pick any emoji from the left panel'}
                  </strong>
                  <span>
                    {lastEmoji
                      ? `${selectionToken} / ${
                          lastEmoji.shortcodes[0]
                            ? `:${lastEmoji.shortcodes[0]}:`
                            : 'custom asset'
                        }`
                      : 'The selected emoji and its label will stay here.'}
                  </span>
                </div>
              </div>
            </div>
          </section>
          </div>

          <div className="demo-row demo-row--config">
          <aside
            className={`playground-card playground-card--collapsible playground-card--dev${
              paramsExpanded ? '' : ' is-collapsed'
            }`}
          >
            <div className="playground-card__head playground-card__head--collapsible">
              <div className="playground-card__heading">
                <span className="playground-card__eyebrow">Dev Params</span>
                <strong>Runtime configuration</strong>
              </div>
              <div className="playground-card__actions">
                <button
                  type="button"
                  className="dev-reset"
                  onClick={resetDemoControls}
                >
                  Reset
                </button>
                {panelCollapseEnabled ? (
                  <button
                    type="button"
                    className="playground-card__icon-toggle"
                    onClick={() => setParamsOpen((open) => !open)}
                    aria-expanded={paramsOpen}
                    aria-controls="dev-params-body"
                    aria-label={
                      paramsOpen
                        ? 'Collapse runtime configuration'
                        : 'Expand runtime configuration'
                    }
                  >
                    <span
                      className="playground-card__chevron"
                      data-open={paramsOpen ? 'true' : undefined}
                      aria-hidden="true"
                    />
                  </button>
                ) : null}
              </div>
            </div>
            <div
              className="playground-card__collapsible"
              aria-hidden={!paramsExpanded}
              inert={!paramsExpanded}
            >
              <div className="playground-card__collapsible-inner">
                <div
                  id="dev-params-body"
                  className="playground-card__body playground-card__body--scroll"
                >
                  <form
                    className="dev-panel"
                    onSubmit={(event) => event.preventDefault()}
              >
                <section className="dev-group">
                  <div className="dev-group__head">
                    <h3>Theme</h3>
                    <span>Presets + custom</span>
                  </div>
                  <div className="dev-controls">
                    <label className="dev-field">
                      <span className="dev-field__label">Theme preset</span>
                      <select
                        className="dev-select"
                        value={selectedThemeId}
                        onChange={(event) =>
                          setSelectedThemeId(event.target.value)
                        }
                      >
                        {allThemes.map((theme) => (
                          <option key={theme.id} value={theme.id}>
                            {theme.name}
                            {theme.builtin ? ' (built-in)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">Theme mode</span>
                      <select
                        className="dev-select"
                        value={themeDraft.mode}
                        onChange={(event) =>
                          updateThemeDraft(
                            'mode',
                            event.target.value as DemoThemePalette['mode'],
                          )
                        }
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">Background</span>
                      <div className="dev-color-row">
                        <input
                          className="dev-color__picker"
                          type="color"
                          value={themeDraft.bg}
                          onChange={(event) =>
                            updateThemeDraft('bg', event.target.value)
                          }
                        />
                        <input
                          className="dev-color__hex"
                          type="text"
                          value={themeDraft.bg}
                          onChange={(event) =>
                            updateThemeDraft('bg', event.target.value)
                          }
                        />
                      </div>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">
                        Category background
                      </span>
                      <div className="dev-color-row">
                        <input
                          className="dev-color__picker"
                          type="color"
                          value={themeDraft.panel}
                          onChange={(event) =>
                            updateThemeDraft('panel', event.target.value)
                          }
                        />
                        <input
                          className="dev-color__hex"
                          type="text"
                          value={themeDraft.panel}
                          onChange={(event) =>
                            updateThemeDraft('panel', event.target.value)
                          }
                        />
                      </div>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">Text color</span>
                      <div className="dev-color-row">
                        <input
                          className="dev-color__picker"
                          type="color"
                          value={themeDraft.text}
                          onChange={(event) =>
                            updateThemeDraft('text', event.target.value)
                          }
                        />
                        <input
                          className="dev-color__hex"
                          type="text"
                          value={themeDraft.text}
                          onChange={(event) =>
                            updateThemeDraft('text', event.target.value)
                          }
                        />
                      </div>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">Secondary text</span>
                      <div className="dev-color-row">
                        <input
                          className="dev-color__picker"
                          type="color"
                          value={themeDraft.muted}
                          onChange={(event) =>
                            updateThemeDraft('muted', event.target.value)
                          }
                        />
                        <input
                          className="dev-color__hex"
                          type="text"
                          value={themeDraft.muted}
                          onChange={(event) =>
                            updateThemeDraft('muted', event.target.value)
                          }
                        />
                      </div>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">Accent color</span>
                      <div className="dev-color-row">
                        <input
                          className="dev-color__picker"
                          type="color"
                          value={themeDraft.accent}
                          onChange={(event) =>
                            updateThemeDraft('accent', event.target.value)
                          }
                        />
                        <input
                          className="dev-color__hex"
                          type="text"
                          value={themeDraft.accent}
                          onChange={(event) =>
                            updateThemeDraft('accent', event.target.value)
                          }
                        />
                      </div>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">Accent mix</span>
                      <div className="dev-range">
                        <input
                          className="dev-range__input"
                          type="range"
                          min="4"
                          max="40"
                          step="1"
                          value={themeDraft.accentMix}
                          onChange={(event) =>
                            updateThemeDraft(
                              'accentMix',
                              Number.parseInt(event.target.value, 10),
                            )
                          }
                        />
                        <strong>{themeDraft.accentMix}%</strong>
                      </div>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">Scrollbar color</span>
                      <div className="dev-color-row">
                        <input
                          className="dev-color__picker"
                          type="color"
                          value={themeDraft.scrollbar}
                          onChange={(event) =>
                            updateThemeDraft('scrollbar', event.target.value)
                          }
                        />
                        <input
                          className="dev-color__hex"
                          type="text"
                          value={themeDraft.scrollbar}
                          onChange={(event) =>
                            updateThemeDraft('scrollbar', event.target.value)
                          }
                        />
                      </div>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">Picker corner radius</span>
                      <div className="dev-range">
                        <input
                          className="dev-range__input"
                          type="range"
                          min="12"
                          max="32"
                          step="1"
                          value={themeDraft.radius}
                          onChange={(event) =>
                            updateThemeDraft(
                              'radius',
                              Number.parseInt(event.target.value, 10),
                            )
                          }
                        />
                        <strong>{themeDraft.radius}px</strong>
                      </div>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">Custom theme name</span>
                      <input
                        className="dev-input"
                        type="text"
                        value={themeName}
                        onChange={(event) => setThemeName(event.target.value)}
                        placeholder={DEFAULT_CUSTOM_THEME_NAME}
                      />
                    </label>

                    <div className="dev-actions">
                      <button
                        type="button"
                        className="dev-button"
                        onClick={handleThemeSave}
                      >
                        {isSelectedCustomTheme
                          ? 'Update theme'
                          : 'Save as custom'}
                      </button>
                      <button
                        type="button"
                        className="dev-button dev-button--danger"
                        onClick={handleThemeDelete}
                        disabled={!isSelectedCustomTheme}
                      >
                        Delete custom
                      </button>
                    </div>
                  </div>
                </section>

                <section className="dev-group">
                  <div className="dev-group__head">
                    <h3>Visual</h3>
                    <span>Live controls</span>
                  </div>
                  <div className="dev-controls">
                    <label className="dev-field">
                      <span className="dev-field__label">Sprite vendor</span>
                      <select
                        className="dev-select"
                        value={vendor}
                        onChange={(event) =>
                          setVendor(event.target.value as EmojiVendor)
                        }
                      >
                        {VENDOR_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">Locale</span>
                      <select
                        className="dev-select"
                        value={locale}
                        onChange={(event) =>
                          setLocale(event.target.value as EmojiLocaleCode)
                        }
                      >
                        {LOCALE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">
                        Category icon style
                      </span>
                      <select
                        className="dev-select"
                        value={categoryIconStyle}
                        onChange={(event) =>
                          setCategoryIconStyle(
                            event.target.value as EmojiCategoryIconPreset,
                          )
                        }
                      >
                        {CATEGORY_ICON_STYLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">Emoji size</span>
                      <div className="dev-range">
                        <input
                          className="dev-range__input"
                          type="range"
                          min="18"
                          max="32"
                          step="1"
                          value={emojiSize}
                          onChange={(event) =>
                            setEmojiSize(Number.parseInt(event.target.value, 10))
                          }
                        />
                        <strong>{emojiSize}px</strong>
                      </div>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">Grid columns</span>
                      <div className="dev-range">
                        <input
                          className="dev-range__input"
                          type="range"
                          min="7"
                          max="11"
                          step="1"
                          value={columns}
                          onChange={(event) =>
                            setColumns(Number.parseInt(event.target.value, 10))
                          }
                        />
                        <strong>{columns}</strong>
                      </div>
                    </label>

                    <label className="dev-toggle">
                      <input
                        type="checkbox"
                        checked={showSkinTones}
                        onChange={(event) =>
                          setShowSkinTones(event.target.checked)
                        }
                      />
                      <span className="dev-toggle__copy">
                        <strong>Skin tone switcher</strong>
                        <small>Expose the tone picker in the toolbar.</small>
                      </span>
                    </label>
                  </div>
                </section>

                <section className="dev-group">
                  <div className="dev-group__head">
                    <h3>Recent</h3>
                    <span>Category API</span>
                  </div>
                  <div className="dev-controls">
                    <label className="dev-toggle">
                      <input
                        type="checkbox"
                        checked={recentEnabled}
                        onChange={(event) =>
                          setRecentEnabled(event.target.checked)
                        }
                      />
                      <span className="dev-toggle__copy">
                        <strong>Enable Recent</strong>
                        <small>Show or remove the Recent category.</small>
                      </span>
                    </label>

                    <label className="dev-toggle">
                      <input
                        type="checkbox"
                        checked={recentShowWhenEmpty}
                        onChange={(event) =>
                          setRecentShowWhenEmpty(event.target.checked)
                        }
                      />
                      <span className="dev-toggle__copy">
                        <strong>Show when empty</strong>
                        <small>Seed the tab with starter emoji.</small>
                      </span>
                    </label>

                    <label className="dev-toggle">
                      <input
                        type="checkbox"
                        checked={recentDefaultActive}
                        onChange={(event) =>
                          setRecentDefaultActive(event.target.checked)
                        }
                      />
                      <span className="dev-toggle__copy">
                        <strong>Default active</strong>
                        <small>Open the picker on Recent first.</small>
                      </span>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">Recent sorting</span>
                      <select
                        className="dev-select"
                        value={recentSort}
                        onChange={(event) =>
                          setRecentSort(
                            event.target.value as 'recent' | 'frequent',
                          )
                        }
                      >
                        <option value="recent">Recent usage</option>
                        <option value="frequent">Frequency</option>
                      </select>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">Recent limit</span>
                      <div className="dev-range">
                        <input
                          className="dev-range__input"
                          type="range"
                          min="4"
                          max="24"
                          step="1"
                          value={recentLimit}
                          onChange={(event) =>
                            setRecentLimit(
                              Number.parseInt(event.target.value, 10),
                            )
                          }
                        />
                        <strong>{recentLimit}</strong>
                      </div>
                    </label>
                  </div>
                </section>

                <section className="dev-group">
                  <div className="dev-group__head">
                    <h3>Custom categories</h3>
                    <span>Editable metadata</span>
                  </div>
                  <div className="dev-controls">
                    <label className="dev-toggle">
                      <input
                        type="checkbox"
                        checked={brandVisible}
                        onChange={(event) =>
                          setBrandVisible(event.target.checked)
                        }
                      />
                      <span className="dev-toggle__copy">
                        <strong>Show Brand Kit category</strong>
                        <small>Hide or reveal the custom brand section.</small>
                      </span>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">Brand label</span>
                      <input
                        className="dev-input"
                        type="text"
                        value={brandLabel}
                        onChange={(event) =>
                          setBrandLabel(event.target.value)
                        }
                        placeholder={DEFAULT_BRAND_LABEL}
                      />
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">Brand icon</span>
                      <select
                        className="dev-select"
                        value={brandIcon}
                        onChange={(event) =>
                          setBrandIcon(
                            event.target.value as EmojiCategoryIconGlyph,
                          )
                        }
                      >
                        {BRAND_ICON_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="dev-field">
                      <span className="dev-field__label">
                        People icon override
                      </span>
                      <select
                        className="dev-select"
                        value={peopleIconStyle}
                        onChange={(event) =>
                          setPeopleIconStyle(
                            event.target.value as
                              | 'inherit'
                              | EmojiCategoryIconPreset,
                          )
                        }
                      >
                        {PEOPLE_ICON_STYLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>
                  </form>
                </div>
              </div>
            </div>
          </aside>

          <aside
            className={`playground-card playground-card--collapsible playground-card--code${
              snippetExpanded ? '' : ' is-collapsed'
            }`}
          >
            <div className="playground-card__head playground-card__head--collapsible">
              <div className="playground-card__heading">
                <span className="playground-card__eyebrow">Live Output</span>
                <strong>Generated snippet</strong>
              </div>
              <div className="playground-card__actions">
                <span className="playground-status playground-status--soft">
                  auto-updating
                </span>
                {panelCollapseEnabled ? (
                  <button
                    type="button"
                    className="playground-card__icon-toggle"
                    onClick={() => setSnippetOpen((open) => !open)}
                    aria-expanded={snippetOpen}
                    aria-controls="snippet-body"
                    aria-label={
                      snippetOpen
                        ? 'Collapse generated snippet'
                        : 'Expand generated snippet'
                    }
                  >
                    <span
                      className="playground-card__chevron"
                      data-open={snippetOpen ? 'true' : undefined}
                      aria-hidden="true"
                    />
                  </button>
                ) : null}
              </div>
            </div>
            <div
              className="playground-card__collapsible"
              aria-hidden={!snippetExpanded}
              inert={!snippetExpanded}
            >
              <div className="playground-card__collapsible-inner">
                <div
                  id="snippet-body"
                  className="playground-card__body playground-card__body--code"
                >
                  <section className="code-stack">
                    <div className="code-stack__group">
                      <header className="code-stack__head">
                        <h3>JSX</h3>
                        <span>Reflects current props</span>
                      </header>
                      <pre className="code-block code-block--compact">
                        {playgroundSnippet}
                      </pre>
                    </div>
                    <div className="code-stack__group">
                      <header className="code-stack__head">
                        <h3>Selection payload</h3>
                        <span>Latest onEmojiSelect</span>
                      </header>
                      <pre className="code-block code-block--compact">
                        {selectionPayload}
                      </pre>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </aside>
          </div>
        </div>
      </section>

      <section className="api-section">
        <div className="api-intro">
          <h2>One library, three strategies</h2>
          <p>Start simple and opt into complexity only when you need it.</p>
        </div>

        <div className="api-grid">
          <div className="api-card">
            <span className="api-label api-label--green">Drop-in</span>
            <h3>Zero config</h3>
            <p>
              One import, one component. Works immediately with native OS
              emoji.
            </p>
            <pre className="code-block">{SNIPPET_DROPIN}</pre>
          </div>

          <div className="api-card">
            <span className="api-label api-label--violet">Themed</span>
            <h3>CSS variables</h3>
            <p>
              Every visual token is a CSS variable. Dark mode in five lines.
            </p>
            <pre className="code-block">{SNIPPET_THEMED}</pre>
          </div>

          <div className="api-card">
            <span className="api-label api-label--orange">Headless</span>
            <h3>Full control</h3>
            <p>
              Compose from primitives. Bring your own styles, layout, and
              markup.
            </p>
            <pre className="code-block">{SNIPPET_HEADLESS}</pre>
          </div>
        </div>
      </section>
      </div>

      <footer className="page-footer">
        <div className="page-footer__inner">
          <span className="page-footer__byline">
            MojiX - React emoji picker
          </span>
          <a
            className="page-footer__link"
            href="https://github.com/Xentaii/MojiX-Picker"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="MojiX on GitHub"
          >
            <GitHubIcon />
            <span>GitHub</span>
          </a>
        </div>
      </footer>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.16-.02-2.1-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18a10.97 10.97 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.08 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}
