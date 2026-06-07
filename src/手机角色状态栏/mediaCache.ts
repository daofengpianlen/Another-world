import { resolveMediaUrl } from './media';

const DB_NAME = 'gal-media-cache-v1';
const STORE_NAME = 'blobs';
const MEMORY_KEY = '__galMediaBlobCache';

export type MediaPreloadResult = 'cached' | 'skipped' | 'failed';

export interface MediaPreloadProgress {
  done: number;
  total: number;
  url: string;
  result: MediaPreloadResult;
}

export function normalizeMediaCacheKey(url: string): string {
  return resolveMediaUrl(url.trim());
}

type SharedRoot = Window & { [MEMORY_KEY]?: Map<string, string> };

function sharedRoot(): SharedRoot {
  try {
    if (window.parent !== window) return window.parent as SharedRoot;
  } catch {
    /* ignore */
  }
  return window as SharedRoot;
}

function sharedMemory(): Map<string, string> {
  const root = sharedRoot();
  if (!root[MEMORY_KEY]) root[MEMORY_KEY] = new Map();
  return root[MEMORY_KEY]!;
}

export function peekCachedBlobUrl(url: string): string | null {
  const key = normalizeMediaCacheKey(url);
  if (!key) return null;
  if (key.startsWith('data:') || key.startsWith('blob:')) return key;
  return sharedMemory().get(key) ?? null;
}

let db_promise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!db_promise) {
    db_promise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
  }
  return db_promise;
}

async function idbGet(key: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function rememberBlob(key: string, blob: Blob): string {
  const memory = sharedMemory();
  const existing = memory.get(key);
  if (existing) return existing;
  const object_url = URL.createObjectURL(blob);
  memory.set(key, object_url);
  return object_url;
}

function isLocalMediaUrl(url: string): boolean {
  return /^(data:|blob:)/i.test(url);
}

export async function ensureCachedMediaUrl(url: string): Promise<string> {
  const key = normalizeMediaCacheKey(url);
  if (!key) return '';
  if (isLocalMediaUrl(key)) return key;

  const memory_hit = sharedMemory().get(key);
  if (memory_hit) return memory_hit;

  const blob = await idbGet(key);
  if (blob) return rememberBlob(key, blob);

  return key;
}

export async function fetchAndCacheMedia(url: string): Promise<MediaPreloadResult> {
  const key = normalizeMediaCacheKey(url);
  if (!key || isLocalMediaUrl(key)) return 'skipped';
  if (sharedMemory().has(key)) return 'cached';

  const existing = await idbGet(key);
  if (existing) {
    rememberBlob(key, existing);
    return 'cached';
  }

  try {
    const response = await fetch(key, { mode: 'cors', cache: 'force-cache' });
    if (!response.ok) return 'failed';
    const blob = await response.blob();
    try {
      await idbPut(key, blob);
    } catch (error) {
      console.warn('[mediaCache] IndexedDB 写入失败，仅保留内存缓存', key, error);
    }
    rememberBlob(key, blob);
    return 'cached';
  } catch (error) {
    console.warn('[mediaCache] 预加载失败', key, error);
    return 'failed';
  }
}

export async function preloadMediaUrls(
  urls: string[],
  options: {
    concurrency?: number;
    onProgress?: (progress: MediaPreloadProgress) => void;
    signal?: AbortSignal;
  } = {},
): Promise<{ cached: number; skipped: number; failed: number }> {
  const unique = [...new Set(urls.map(normalizeMediaCacheKey).filter(Boolean))];
  const concurrency = Math.max(1, options.concurrency ?? 3);
  let index = 0;
  let cached = 0;
  let skipped = 0;
  let failed = 0;

  async function worker() {
    while (index < unique.length) {
      if (options.signal?.aborted) return;
      const current = unique[index++];
      const result = await fetchAndCacheMedia(current);
      if (result === 'cached') cached += 1;
      else if (result === 'skipped') skipped += 1;
      else failed += 1;
      options.onProgress?.({
        done: cached + skipped + failed,
        total: unique.length,
        url: current,
        result,
      });
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, () => worker()));
  return { cached, skipped, failed };
}
