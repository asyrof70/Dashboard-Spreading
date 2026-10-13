import { DiameterColorRule } from '../types/gis';

export const DEFAULT_DIAMETER_RULES: DiameterColorRule[] = [
  {
    minDiameterMm: 400,
    maxDiameterMm: 1000,
    pattern: '400',
    label: 'DN 1000 - 400 mm (Pipa Transmisi / Distribusi Utama)',
    color: '#EF4444', // Merah
    width: 3.5,
  },
  {
    minDiameterMm: 160,
    maxDiameterMm: 315,
    pattern: '200',
    label: 'DN 315 - 160 mm (Pipa Distribusi Sekunder)',
    color: '#3B82F6', // Biru
    width: 2.8,
  },
  {
    minDiameterMm: 63,
    maxDiameterMm: 110,
    pattern: '90',
    label: 'DN 110 - 63 mm (Pipa Retikulasi Tersier)',
    color: '#10B981', // Hijau
    width: 2.0,
  },
  {
    minDiameterMm: 0,
    maxDiameterMm: 62,
    pattern: '32',
    label: 'DN < 63 mm (Pipa Dinas / Sub-Tersier)',
    color: '#F59E0B', // Kuning/Oranye
    width: 1.8,
  },
];

/**
 * Ekstraksi nilai angka diameter dalam milimeter (mm) dari nilai atribut
 */
export function extractDiameterMm(val: any): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') {
    return val > 0 ? val : null;
  }
  const str = String(val).trim();
  // Regex mencari angka diameter misal DN400, DN 400mm, 400, Ø 315, 110 mm, dsb
  const match = str.match(/(?:DN|Ø|DIA|D|SIZE|UKURAN)?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (match && match[1]) {
    const num = parseFloat(match[1]);
    return isNaN(num) ? null : num;
  }
  return null;
}

export interface PipeStyleResult {
  color: string;
  weight: number;
  category: string;
  rangeLabel: string;
}

/**
 * Mengembalikan styling warna dan ketebalan garis pipa berdasarkan diameternya:
 * - 1000 - 400 mm : Merah (#EF4444)
 * - 315 - 160 mm  : Biru (#3B82F6)
 * - 110 - 63 mm   : Hijau (#10B981)
 * - < 63 mm       : Kuning/Oranye (#F59E0B)
 */
export function getPipeStyleByDiameter(
  properties: Record<string, any> = {},
  customRules?: DiameterColorRule[]
): PipeStyleResult {
  // Ambil nilai diameter dari berbagai variasi nama kolom
  const rawDia =
    properties.diameter ??
    properties.DIAMETER ??
    properties.Diameter ??
    properties.DN ??
    properties.dn ??
    properties.dia ??
    properties.DIA ??
    properties.size ??
    properties.SIZE ??
    properties.ukuran ??
    properties.UKURAN ??
    properties.dimensi ??
    '';

  const diaNum = extractDiameterMm(rawDia);

  // Jika ada custom rules dari layer
  const rules = customRules && customRules.length > 0 ? customRules : DEFAULT_DIAMETER_RULES;

  if (diaNum !== null) {
    for (const rule of rules) {
      if (
        (rule.minDiameterMm === undefined || diaNum >= rule.minDiameterMm) &&
        (rule.maxDiameterMm === undefined || diaNum <= rule.maxDiameterMm)
      ) {
        return {
          color: rule.color,
          weight: rule.width || 2.5,
          category: rule.label,
          rangeLabel: rule.label,
        };
      }
    }

    // Default interval if not matched custom
    if (diaNum >= 400) {
      return {
        color: '#EF4444',
        weight: 3.5,
        category: 'Pipa Transmisi Utama',
        rangeLabel: 'DN 1000 - 400 mm (Merah)',
      };
    } else if (diaNum >= 160) {
      return {
        color: '#3B82F6',
        weight: 2.8,
        category: 'Pipa Distribusi Sekunder',
        rangeLabel: 'DN 315 - 160 mm (Biru)',
      };
    } else if (diaNum >= 63) {
      return {
        color: '#10B981',
        weight: 2.0,
        category: 'Pipa Retikulasi Tersier',
        rangeLabel: 'DN 110 - 63 mm (Hijau)',
      };
    } else {
      return {
        color: '#F59E0B',
        weight: 1.8,
        category: 'Pipa Dinas / Sub-Tersier',
        rangeLabel: 'DN < 63 mm (Kuning/Oranye)',
      };
    }
  }

  // Text matching fallback
  const str = String(rawDia).toLowerCase();
  const kat = String(properties.kategori || properties.KATEGORI || '').toLowerCase();

  if (str.includes('400') || str.includes('500') || str.includes('600') || str.includes('800') || str.includes('1000') || kat.includes('transmisi')) {
    return { color: '#EF4444', weight: 3.5, category: 'Transmisi Utama', rangeLabel: 'DN 1000 - 400 mm (Merah)' };
  }
  if (str.includes('315') || str.includes('300') || str.includes('250') || str.includes('200') || str.includes('160') || kat.includes('distribusi')) {
    return { color: '#3B82F6', weight: 2.8, category: 'Distribusi Sekunder', rangeLabel: 'DN 315 - 160 mm (Biru)' };
  }
  if (str.includes('110') || str.includes('90') || str.includes('75') || str.includes('63') || kat.includes('retikulasi')) {
    return { color: '#10B981', weight: 2.0, category: 'Retikulasi Tersier', rangeLabel: 'DN 110 - 63 mm (Hijau)' };
  }

  return { color: '#3B82F6', weight: 2.5, category: 'Pipa Jaringan', rangeLabel: 'DN 315 - 160 mm (Biru)' };
}
