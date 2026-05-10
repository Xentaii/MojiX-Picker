import { useEffect, useMemo, useState } from "react";
import {
  EmojiPicker,
  createEmojiLocalSpriteSheet,
  createSpriteSheetAssetSource,
  configureMojiXDataSource,
  preloadEmojiData,
  registerEmojiLocalePack,
  registerEmojiLocaleSearchIndex,
  preloadEmojiPicker,
  type EmojiLocaleCode,
  type EmojiSelection,
} from "mojix-picker";
import emojiData from "mojix-picker/data";
import enLocale from "mojix-picker/locales/en";
import enSearch from "mojix-picker/locales/en/search";
import ruLocale from "mojix-picker/locales/ru";
import ruSearch from "mojix-picker/locales/ru/search";
import "mojix-picker/style.css";
import "./App.css";

declare global {
  interface Window {
    __MOJIX_TAURI_FETCHES__?: string[];
  }
}

const NO_SELECTION = "No emoji selected";
const LOCALES: Array<{ code: EmojiLocaleCode; label: string }> = [
  { code: "en", label: "English" },
  { code: "ru", label: "Russian" },
];
const LOCAL_SPRITE_SHEET = createEmojiLocalSpriteSheet("/sprites", {
  vendor: "twitter",
  variant: "indexed-256",
  sheetSize: 64,
  fallbackNative: true,
  cache: {
    enabled: false,
    preload: "manual",
  },
});
const SPRITE_ASSET_SOURCE = createSpriteSheetAssetSource({
  spriteSheet: LOCAL_SPRITE_SHEET,
});

if (typeof window !== "undefined") {
  window.__MOJIX_TAURI_FETCHES__ = [];
}

configureMojiXDataSource({
  cache: false,
  preparedCache: false,
  fetcher: async (request) => {
    window.__MOJIX_TAURI_FETCHES__?.push(request.url);
    throw new Error(`Unexpected MojiX network request in Tauri: ${request.url}`);
  },
});

preloadEmojiData(emojiData);
registerEmojiLocalePack("en", enLocale);
registerEmojiLocalePack("ru", ruLocale);
registerEmojiLocaleSearchIndex("en", enSearch);
registerEmojiLocaleSearchIndex("ru", ruSearch);
void preloadEmojiPicker({
  locale: "en",
  fallbackLocale: "ru",
  search: true,
  spriteSheet: LOCAL_SPRITE_SHEET,
  virtualizedGrid: true,
  warmSpriteSheet: true,
});

function App() {
  const [locale, setLocale] = useState<EmojiLocaleCode>("en");
  const [searchQuery, setSearchQuery] = useState("");
  const [selection, setSelection] = useState<EmojiSelection | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [networkCount, setNetworkCount] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNetworkCount(window.__MOJIX_TAURI_FETCHES__?.length ?? 0);
    }, 250);

    return () => window.clearInterval(interval);
  }, []);

  const selectionLabel = useMemo(() => {
    if (!selection) {
      return NO_SELECTION;
    }

    return `${selection.native ?? selection.id} ${selection.name}`;
  }, [selection]);

  return (
    <main className="fixture-shell">
      <header className="fixture-header">
        <div>
          <p className="eyebrow">Tauri package fixture</p>
          <h1 data-testid="tauri-fixture-title">MojiX in Tauri WebView</h1>
        </div>
        <div className="status-grid" aria-label="Fixture status">
          <div>
            <span>Locale</span>
            <strong data-testid="locale-output">{locale}</strong>
          </div>
          <div>
            <span>Blocked fetches</span>
            <strong data-testid="network-output">{networkCount}</strong>
          </div>
        </div>
      </header>

      <section className="control-bar" aria-label="Fixture controls">
        <div className="segmented-control" role="group" aria-label="Locale">
          {LOCALES.map((option) => (
            <button
              aria-pressed={locale === option.code}
              className={locale === option.code ? "active" : undefined}
              data-testid={`locale-${option.code}`}
              key={option.code}
              onClick={() => setLocale(option.code)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="search-proxy">
          <span>Search seed</span>
          <input
            data-testid="search-seed"
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            value={searchQuery}
          />
        </label>
      </section>

      <section className="fixture-grid">
        <div className="picker-panel">
          <EmojiPicker
            categoryIconStyle="outline"
            columns={8}
            emojiSize={24}
            assetSource={SPRITE_ASSET_SOURCE}
            locale={locale}
            onDataError={(error) => setDataError(String(error))}
            onEmojiSelect={setSelection}
            onSearchQueryChange={setSearchQuery}
            searchQuery={searchQuery}
            showSkinTones
            spriteSheet={LOCAL_SPRITE_SHEET}
            virtualization={false}
          />
        </div>

        <aside className="result-panel" aria-label="Fixture result">
          <span>Last selection</span>
          <strong data-testid="selection-output">{selectionLabel}</strong>
          <span>Data error</span>
          <strong data-testid="error-output">{dataError ?? "none"}</strong>
        </aside>
      </section>
    </main>
  );
}

export default App;
