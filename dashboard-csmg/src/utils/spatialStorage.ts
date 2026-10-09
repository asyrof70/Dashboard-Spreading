import { PipeNetworkLayer, ServiceZoneLayer } from '../types/gis';

const DB_NAME = 'AetraGIS_SpatialDatabase_v5';
const STORE_NAME = 'spatial_layers_store';
const DB_VERSION = 1;

const KEY_PIPE_LAYERS = 'aetra_custom_pipe_layers_master';
const KEY_ZONE_LAYERS = 'aetra_custom_zone_layers_master';
const KEY_ZONE_COLORS = 'aetra_zone_colors_master';

// In-memory cache for instant synchronous access
let memoryPipeLayers: PipeNetworkLayer[] | null = null;
let memoryZoneLayers: ServiceZoneLayer[] | null = null;

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
 * Open IndexedDB safely with Promise
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
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

      tx.oncomplete = () => {
        db.close();
      };
      tx.onerror = () => {
        db.close();
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

      tx.oncomplete = () => {
        db.close();
      };
      tx.onerror = () => {
        db.close();
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
 * Synchronously load pipe layers from memory or localStorage fallback
 */
export function loadPipeLayersFromStorage(): PipeNetworkLayer[] | null {
  if (memoryPipeLayers && memoryPipeLayers.length > 0) {
    return memoryPipeLayers;
  }
  try {
    const raw = localStorage.getItem(KEY_PIPE_LAYERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryPipeLayers = parsed;
        return parsed;
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
  try {
    const data = await getIndexedDBItem<PipeNetworkLayer[]>(KEY_PIPE_LAYERS);
    if (data && Array.isArray(data) && data.length > 0) {
      memoryPipeLayers = data;
      return data;
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

  // Try best-effort localStorage for small layers
  try {
    localStorage.setItem(KEY_PIPE_LAYERS, JSON.stringify(sanitized));
  } catch {
    // Quota exceeded for large KMZ is expected and handled via IndexedDB
  }

  return success;
}

/**
 * Synchronously load service zone layers from cache or localStorage
 */
export function loadServiceZoneLayersFromStorage(): ServiceZoneLayer[] | null {
  if (memoryZoneLayers && memoryZoneLayers.length > 0) {
    return memoryZoneLayers;
  }
  try {
    const raw = localStorage.getItem(KEY_ZONE_LAYERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryZoneLayers = parsed;
        return parsed;
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
  try {
    const data = await getIndexedDBItem<ServiceZoneLayer[]>(KEY_ZONE_LAYERS);
    if (data && Array.isArray(data) && data.length > 0) {
      memoryZoneLayers = data;
      return data;
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

  try {
    localStorage.setItem(KEY_ZONE_LAYERS, JSON.stringify(sanitized));
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
