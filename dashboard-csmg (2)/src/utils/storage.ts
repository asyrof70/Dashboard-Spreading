import { PipeNetworkLayer, ServiceZoneLayer, CustomerSurvey } from '../types/gis';

const STORAGE_KEYS = {
  PIPE_LAYERS: 'aetra_gis_pipe_layers_v2',
  SERVICE_ZONES: 'aetra_gis_service_zones_v2',
  CUSTOMERS: 'aetra_gis_customers_v2',
  LAYER_SETTINGS: 'aetra_gis_settings_v2',
};

/**
 * Menyimpan layer pipa ke LocalStorage agar tidak hilang saat reload
 */
export function savePipeLayersToStorage(layers: PipeNetworkLayer[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PIPE_LAYERS, JSON.stringify(layers));
  } catch (err) {
    console.warn('Gagal menyimpan pipe layers ke storage:', err);
  }
}

/**
 * Mengambil layer pipa dari LocalStorage
 */
export function loadPipeLayersFromStorage(fallback: PipeNetworkLayer[]): PipeNetworkLayer[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PIPE_LAYERS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Gagal memuat pipe layers dari storage:', err);
  }
  return fallback;
}

/**
 * Menyimpan zona pelayanan ke LocalStorage
 */
export function saveServiceZonesToStorage(zones: ServiceZoneLayer[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SERVICE_ZONES, JSON.stringify(zones));
  } catch (err) {
    console.warn('Gagal menyimpan service zones ke storage:', err);
  }
}

/**
 * Mengambil zona pelayanan dari LocalStorage
 */
export function loadServiceZonesFromStorage(fallback: ServiceZoneLayer[]): ServiceZoneLayer[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SERVICE_ZONES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Gagal memuat service zones dari storage:', err);
  }
  return fallback;
}

/**
 * Menyimpan data pelanggan ke LocalStorage
 */
export function saveCustomersToStorage(customers: CustomerSurvey[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  } catch (err) {
    console.warn('Gagal menyimpan customers ke storage:', err);
  }
}

/**
 * Mengambil data pelanggan dari LocalStorage
 */
export function loadCustomersFromStorage(fallback: CustomerSurvey[]): CustomerSurvey[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Gagal memuat customers dari storage:', err);
  }
  return fallback;
}
