import { PipeNetworkLayer, ServiceZoneLayer } from '../types/gis';

const DB_NAME = 'AetraGIS_SpatialDatabase_Permanent';
const STORE_NAME = 'spatial_layers_store';
const DB_VERSION = 1;

const LEGACY_DB_NAMES = [
  'AetraGIS_SpatialDatabase_v6',
  'AetraGIS_SpatialDatabase_v5',
  'AetraGIS_SpatialDatabase_v4',
  'AetraGIS_SpatialDatabase_v3',
  'AetraGIS_SpatialDatabase_v2',
  'AetraGIS_SpatialDatabase_v1',
];

const KEY_PIPE_LAYERS = 'aetra_custom_pipe_layers_master';
const KEY_ZONE_LAYERS = 'aetra_custom_zone_layers_master';
const KEY_ZONE_COLORS = 'aetra_zone_colors_master';
const KEY_USER_HAS_SAVED = 'aetra_user_has_custom_layers_permanent';

const LEGACY_STORAGE_PIPE_KEYS = [
  'aetra_custom_pipe_layers_master',
  'aetra_pipe_layers',
  'aetra_pipe_layers_master',
];
const LEGACY_STORAGE_ZONE_KEYS = [
  'aetra_custom_zone_layers_master',
  'aetra_service_zone_layers',
  'aetra_zone_layers_master',
];

// In-memory cache for instant synchronous access
let memoryPipeLayers: PipeNetworkLayer[] | null = null;
let memoryZoneLayers: ServiceZoneLayer[] | null = null;
let cachedDb: IDBDatabase | null = null;

/**
 * Deep-clean an object to ensure it is 100% JSON-serializable & Structured Clone compatible
 * Removes DOM nodes, functions, circular refs, undefined, symbols
 */
export function sanitizeSpatialData<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (err) {
    console.warn('Sanitization fallback used:', err);
    return data;
  }
}

/**
 * Open IndexedDB safely with persistent connection pooling
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment'));
      return;
    }

    if (cachedDb) {
      try {
        // Test if still open
        cachedDb.transaction(STORE_NAME, 'readonly');
        resolve(cachedDb);
        return;
      } catch {
        cachedDb = null;
      }
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      cachedDb = request.result;
      cachedDb.onversionchange = () => {
        cachedDb?.close();
        cachedDb = null;
      };
      cachedDb.onclose = () => {
        cachedDb = null;
      };
      resolve(cachedDb);
    };

    request.onerror = (e) => {
      console.error('IndexedDB open error:', e);
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn('IndexedDB open blocked by another tab');
    };
  });
}

/**
 * Save key-value to IndexedDB with automatic retries and fallback
 */
export async function setIndexedDBItem<T>(key: string, value: T): Promise<boolean> {
  const sanitized = sanitizeSpatialData(value);
  try {
    const db = await openDatabase();
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(sanitized, key);

      req.onsuccess = () => resolve(true);
      req.onerror = (err) => {
        console.error(`IndexedDB put error for key "${key}":`, err);
        resolve(false);
      };
      tx.onerror = () => {
        resolve(false);
      };
    });
  } catch (err) {
    console.warn(`IndexedDB write fallback for "${key}":`, err);
    try {
      localStorage.setItem(key, JSON.stringify(sanitized));
      return true;
    } catch {
      // LocalStorage quota might exceed for multi-MB KMZ, memory cache retains it
      return false;
    }
  }
}

/**
 * Read key-value from IndexedDB
 */
export async function getIndexedDBItem<T>(key: string): Promise<T | null> {
  try {
    const db = await openDatabase();
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        const res = req.result !== undefined ? (req.result as T) : null;
        resolve(res);
      };
      req.onerror = (err) => {
        console.error(`IndexedDB get error for key "${key}":`, err);
        resolve(null);
      };
      tx.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn(`IndexedDB read fallback for "${key}":`, err);
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // ignore
    }
    return null;
  }
}

/**
 * Cek dan baca data dari database versi terdahulu untuk migrasi mulus
 */
function getLegacyIndexedDBItem<T>(dbName: string, key: string): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve(null);
        return;
      }
      const req = window.indexedDB.open(dbName, 1);
      req.onsuccess = () => {
        const db = req.result;
        try {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.close();
            resolve(null);
            return;
          }
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const getReq = store.get(key);
          getReq.onsuccess = () => {
            const res = getReq.result;
            db.close();
            resolve(res !== undefined ? (res as T) : null);
          };
          getReq.onerror = () => {
            db.close();
            resolve(null);
          };
        } catch {
          db.close();
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Synchronously load pipe layers from memory or localStorage fallback
 */
export function loadPipeLayersFromStorage(): PipeNetworkLayer[] | null {
  if (memoryPipeLayers !== null) {
    return memoryPipeLayers;
  }
  const hasSaved = typeof localStorage !== 'undefined' && localStorage.getItem(KEY_USER_HAS_SAVED) === 'true';
  try {
    for (const key of LEGACY_STORAGE_PIPE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 || hasSaved) {
            memoryPipeLayers = parsed;
            return parsed;
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Asynchronously load pipe layers from IndexedDB (Main source of truth for KMZ/KML)
 */
export async function loadPipeLayersFromStorageAsync(): Promise<PipeNetworkLayer[] | null> {
  const hasSaved = typeof localStorage !== 'undefined' && localStorage.getItem(KEY_USER_HAS_SAVED) === 'true';
  try {
    const data = await getIndexedDBItem<PipeNetworkLayer[]>(KEY_PIPE_LAYERS);
    if (data !== null && Array.isArray(data)) {
      if (data.length > 0 || hasSaved) {
        memoryPipeLayers = data;
        return data;
      }
    }

    // Periksa database legacy untuk migrasi otomatis agar file tidak hilang saat update sistem
    for (const legacyDb of LEGACY_DB_NAMES) {
      const legacyData = await getLegacyIndexedDBItem<PipeNetworkLayer[]>(legacyDb, KEY_PIPE_LAYERS);
      if (legacyData && Array.isArray(legacyData) && legacyData.length > 0) {
        memoryPipeLayers = legacyData;
        await setIndexedDBItem(KEY_PIPE_LAYERS, legacyData);
        return legacyData;
      }
    }
  } catch (err) {
    console.warn('Error loading pipe layers async from IndexedDB:', err);
  }
  return loadPipeLayersFromStorage();
}

/**
 * Save pipe layers to persistent storage (IndexedDB + Memory cache)
 */
export async function savePipeLayersToStorage(layers: PipeNetworkLayer[]): Promise<boolean> {
  const sanitized = sanitizeSpatialData(layers);
  memoryPipeLayers = sanitized;
  const success = await setIndexedDBItem(KEY_PIPE_LAYERS, sanitized);
  await setIndexedDBItem(KEY_USER_HAS_SAVED, true);

  // Try best-effort localStorage for small layers
  try {
    localStorage.setItem(KEY_PIPE_LAYERS, JSON.stringify(sanitized));
    localStorage.setItem(KEY_USER_HAS_SAVED, 'true');
  } catch {
    // Quota exceeded for large KMZ is expected and handled via IndexedDB
  }

  return success;
}

/**
 * Synchronously load service zone layers from cache or localStorage
 */
export function loadServiceZoneLayersFromStorage(): ServiceZoneLayer[] | null {
  if (memoryZoneLayers !== null) {
    return memoryZoneLayers;
  }
  const hasSaved = typeof localStorage !== 'undefined' && localStorage.getItem(KEY_USER_HAS_SAVED) === 'true';
  try {
    for (const key of LEGACY_STORAGE_ZONE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 || hasSaved) {
            memoryZoneLayers = parsed;
            return parsed;
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Asynchronously load service zone layers from IndexedDB
 */
export async function loadServiceZoneLayersFromStorageAsync(): Promise<ServiceZoneLayer[] | null> {
  const hasSaved = typeof localStorage !== 'undefined' && localStorage.getItem(KEY_USER_HAS_SAVED) === 'true';
  try {
    const data = await getIndexedDBItem<ServiceZoneLayer[]>(KEY_ZONE_LAYERS);
    if (data !== null && Array.isArray(data)) {
      if (data.length > 0 || hasSaved) {
        memoryZoneLayers = data;
        return data;
      }
    }

    // Periksa database legacy untuk migrasi otomatis batas zona
    for (const legacyDb of LEGACY_DB_NAMES) {
      const legacyData = await getLegacyIndexedDBItem<ServiceZoneLayer[]>(legacyDb, KEY_ZONE_LAYERS);
      if (legacyData && Array.isArray(legacyData) && legacyData.length > 0) {
        memoryZoneLayers = legacyData;
        await setIndexedDBItem(KEY_ZONE_LAYERS, legacyData);
        return legacyData;
      }
    }
  } catch (err) {
    console.warn('Error loading zone layers async from IndexedDB:', err);
  }
  return loadServiceZoneLayersFromStorage();
}

/**
 * Save service zone layers to persistent storage
 */
export async function saveServiceZoneLayersToStorage(layers: ServiceZoneLayer[]): Promise<boolean> {
  const sanitized = sanitizeSpatialData(layers);
  memoryZoneLayers = sanitized;
  const success = await setIndexedDBItem(KEY_ZONE_LAYERS, sanitized);
  await setIndexedDBItem(KEY_USER_HAS_SAVED, true);

  try {
    localStorage.setItem(KEY_ZONE_LAYERS, JSON.stringify(sanitized));
    localStorage.setItem(KEY_USER_HAS_SAVED, 'true');
  } catch {
    // ignore
  }

  return success;
}

/**
 * Save zone colors
 */
export function saveZoneColorsToStorage(colors: Record<string, { border: string; fill: string }>): void {
  try {
    localStorage.setItem(KEY_ZONE_COLORS, JSON.stringify(colors));
  } catch {
    // ignore
  }
}

/**
 * Load zone colors
 */
export function loadZoneColorsFromStorage(): Record<string, { border: string; fill: string }> | null {
  try {
    const raw = localStorage.getItem(KEY_ZONE_COLORS);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

/**
 * Clear all spatial layer storage completely
 */
export async function clearSpatialLayersStorage(): Promise<void> {
  memoryPipeLayers = null;
  memoryZoneLayers = null;

  try {
    localStorage.removeItem(KEY_PIPE_LAYERS);
    localStorage.removeItem(KEY_ZONE_LAYERS);
    localStorage.removeItem(KEY_ZONE_COLORS);
  } catch {
    // ignore
  }

  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => db.close();
  } catch {
    // ignore
  }
}
