import { SalesRep } from '../types/gis';
import { INITIAL_SALES } from '../data/sampleData';

const STORAGE_KEY_SALES = 'aetra_gis_sales_list_v2';

/**
 * Memuat daftar nama sales dari localStorage
 */
export function loadSalesFromStorage(fallback: SalesRep[] = INITIAL_SALES): SalesRep[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SALES);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Gagal memuat sales list dari storage:', err);
  }
  return fallback;
}

/**
 * Menyimpan daftar nama sales ke localStorage
 */
export function saveSalesToStorage(sales: SalesRep[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(sales));
  } catch (err) {
    console.warn('Gagal menyimpan sales list ke storage:', err);
  }
}

/**
 * Reset daftar sales ke default
 */
export function resetSalesToDefault(): SalesRep[] {
  try {
    localStorage.removeItem(STORAGE_KEY_SALES);
  } catch (err) {
    // ignore
  }
  return INITIAL_SALES;
}
