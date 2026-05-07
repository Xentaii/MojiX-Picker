import { DEFAULT_PREPARED_DATA_CACHE_NAME } from './constants';
import type { UnicodeEmoji } from './types';

const PREPARED_EMOJI_STORE = 'emoji-data';
const PREPARED_CACHE_SCHEMA_VERSION = 1;

interface PreparedEmojiDataCacheRecord {
  key: string;
  version: string;
  createdAt: number;
  list: UnicodeEmoji[];
}

const pendingPreparedCacheDbs = new Map<string, Promise<IDBDatabase | null>>();

function canUsePreparedDataCache() {
  return (
    typeof indexedDB !== 'undefined' &&
    typeof window !== 'undefined'
  );
}

function openPreparedDataDb(cacheName: string) {
  if (!canUsePreparedDataCache()) {
    return Promise.resolve(null);
  }

  const pendingDb = pendingPreparedCacheDbs.get(cacheName);

  if (pendingDb) {
    return pendingDb;
  }

  const dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    const request = indexedDB.open(cacheName, PREPARED_CACHE_SCHEMA_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(PREPARED_EMOJI_STORE)) {
        db.createObjectStore(PREPARED_EMOJI_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      resolve(null);
    };

    request.onblocked = () => {
      resolve(null);
    };
  });

  pendingPreparedCacheDbs.set(cacheName, dbPromise);

  return dbPromise;
}

function readPreparedDataRecord(
  db: IDBDatabase,
  key: string,
) {
  return new Promise<PreparedEmojiDataCacheRecord | null>((resolve) => {
    const transaction = db.transaction(PREPARED_EMOJI_STORE, 'readonly');
    const store = transaction.objectStore(PREPARED_EMOJI_STORE);
    const request = store.get(key);

    request.onsuccess = () => {
      const record = request.result as PreparedEmojiDataCacheRecord | undefined;
      resolve(record && Array.isArray(record.list) ? record : null);
    };

    request.onerror = () => {
      resolve(null);
    };

    transaction.onerror = () => {
      resolve(null);
    };
  });
}

function writePreparedDataRecord(
  db: IDBDatabase,
  record: PreparedEmojiDataCacheRecord,
) {
  return new Promise<void>((resolve) => {
    const transaction = db.transaction(PREPARED_EMOJI_STORE, 'readwrite');
    const store = transaction.objectStore(PREPARED_EMOJI_STORE);
    const request = store.put(record);

    request.onerror = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      resolve();
    };
  });
}

export async function loadPreparedEmojiDataFromCache(options: {
  key: string;
  cacheName?: string;
}) {
  const db = await openPreparedDataDb(
    options.cacheName ?? DEFAULT_PREPARED_DATA_CACHE_NAME,
  );

  if (!db) {
    return null;
  }

  const record = await readPreparedDataRecord(db, options.key);

  return record?.version === __MOJIX_VERSION__ ? record.list : null;
}

export async function savePreparedEmojiDataToCache(options: {
  key: string;
  list: UnicodeEmoji[];
  cacheName?: string;
}) {
  const db = await openPreparedDataDb(
    options.cacheName ?? DEFAULT_PREPARED_DATA_CACHE_NAME,
  );

  if (!db) {
    return;
  }

  await writePreparedDataRecord(db, {
    key: options.key,
    version: __MOJIX_VERSION__,
    createdAt: Date.now(),
    list: options.list,
  });
}

export async function clearPreparedEmojiDataCache(options: {
  cacheName?: string;
} = {}) {
  const db = await openPreparedDataDb(
    options.cacheName ?? DEFAULT_PREPARED_DATA_CACHE_NAME,
  );

  if (!db) {
    return;
  }

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(PREPARED_EMOJI_STORE, 'readwrite');
    transaction.objectStore(PREPARED_EMOJI_STORE).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
  });
}
