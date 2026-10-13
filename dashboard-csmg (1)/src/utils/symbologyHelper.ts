import { SymbologyRule } from '../types/gis';

// Palet warna khas QGIS & GIS profesional kontras tinggi terhadap Google Satelit
export const QGIS_COLOR_PALETTE = [
  '#EF4444', // Red (DN 400+ / Kategori Utama)
  '#3B82F6', // Blue (DN 200 - 315 / Sekunder)
  '#10B981', // Emerald Green (DN 63 - 110 / Tersier)
  '#F59E0B', // Amber / Gold
  '#8B5CF6', // Purple / Violet
  '#EC4899', // Pink / Magenta
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#84CC16', // Lime
  '#6366F1', // Indigo
  '#A855F7', // Fuchsia
  '#E11D48', // Rose
  '#0EA5E9', // Sky Blue
];

/**
 * Menghasilkan aturan simbologi nilai unik (Categorized / Unique Values Symbology ala QGIS)
 * berdasarkan kolom atribut yang dipilih dari tabel data spasial.
 */
export function generateUniqueValuesSymbology(
  geoJson: GeoJSON.FeatureCollection,
  columnName: string,
  geometryType: 'line' | 'polygon' = 'line'
): SymbologyRule[] {
  if (!geoJson || !geoJson.features || geoJson.features.length === 0 || !columnName) {
    return [];
  }

  // Hitung frekuensi tiap nilai unik
  const valueCounts = new Map<string, number>();

  geoJson.features.forEach((feature) => {
    const props = feature.properties || {};
    let val = props[columnName] ?? props[columnName.toUpperCase()] ?? props[columnName.toLowerCase()];
    if (val === undefined || val === null || val === '') {
      val = '(Tanpa Nilai / Null)';
    }
    const strVal = String(val).trim();
    valueCounts.set(strVal, (valueCounts.get(strVal) || 0) + 1);
  });

  // Urutkan nilai unik (angka berurutan atau abjad)
  const uniqueValues = Array.from(valueCounts.keys()).sort((a, b) => {
    const numA = parseFloat(a.replace(/[^0-9.]/g, ''));
    const numB = parseFloat(b.replace(/[^0-9.]/g, ''));
    if (!isNaN(numA) && !isNaN(numB)) {
      return numB - numA; // Urutkan diameter besar ke kecil
    }
    return a.localeCompare(b);
  });

  // Buat aturan warna per nilai unik
  return uniqueValues.map((val, idx) => {
    const color = QGIS_COLOR_PALETTE[idx % QGIS_COLOR_PALETTE.length];
    const count = valueCounts.get(val) || 0;

    return {
      value: val,
      label: `${val} (${count} ${geometryType === 'line' ? 'segmen' : 'wilayah'})`,
      color: color,
      fillColor: color,
      width: geometryType === 'line' ? 2.8 : 2.0,
      opacity: 0.95,
      count: count,
    };
  });
}

/**
 * Mengambil warna fitur berdasarkan nilai kolom atribut dan aturan simbologi aktif
 */
export function getFeatureSymbologyStyle(
  feature: GeoJSON.Feature,
  classifyColumn?: string,
  symbologyRules?: SymbologyRule[]
): SymbologyRule | null {
  if (!classifyColumn || !symbologyRules || symbologyRules.length === 0) {
    return null;
  }

  const props = feature.properties || {};
  let val = props[classifyColumn] ?? props[classifyColumn.toUpperCase()] ?? props[classifyColumn.toLowerCase()];
  if (val === undefined || val === null || val === '') {
    val = '(Tanpa Nilai / Null)';
  }
  const strVal = String(val).trim();

  const matched = symbologyRules.find((r) => r.value.toLowerCase() === strVal.toLowerCase());
  return matched || null;
}
