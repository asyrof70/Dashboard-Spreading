import { CustomerSurvey, ServiceZoneLayer, ZoneArea } from '../types/gis';
import { isPointInsideZoneFeature } from './kmlParser';

/**
 * Helper to calculate rough centroid for a GeoJSON feature geometry
 */
function calculateFeatureCentroid(feature: GeoJSON.Feature): { lat: number; lng: number } {
  if (!feature.geometry) {
    return { lat: -6.16, lng: 106.55 };
  }

  const geom = feature.geometry;
  let totalLat = 0;
  let totalLng = 0;
  let count = 0;

  const processCoords = (coords: any[]) => {
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      totalLng += coords[0];
      totalLat += coords[1];
      count++;
    } else if (Array.isArray(coords)) {
      coords.forEach(processCoords);
    }
  };

  processCoords((geom as any).coordinates);

  if (count === 0) return { lat: -6.16, lng: 106.55 };
  return { lat: totalLat / count, lng: totalLng / count };
}

/**
 * Mengekstrak seluruh daftar nama kolom atribut yang tersedia dari layer zona pelayanan yang aktif.
 */
export function extractAvailableZoneAttributes(serviceZoneLayers: ServiceZoneLayer[]): string[] {
  const attributeSet = new Set<string>();
  const activeLayers = serviceZoneLayers.filter((l) => l.visible !== false);

  activeLayers.forEach((layer) => {
    if (layer.geoJsonData && Array.isArray(layer.geoJsonData.features)) {
      layer.geoJsonData.features.forEach((feature) => {
        if (feature.properties) {
          Object.keys(feature.properties).forEach((key) => {
            const lower = key.toLowerCase();
            // Lewati properti internal styling
            if (!['color', 'fillcolor', 'bordercolor', 'opacity', 'weight', 'fillopacity'].includes(lower)) {
              attributeSet.add(lower);
            }
          });
        }
      });
    }
  });

  const list = Array.from(attributeSet);
  if (list.length === 0) {
    return ['kecamatan', 'name', 'kode', 'status'];
  }

  // Prioritaskan kolom populer di urutan teratas
  const preferred = ['kecamatan', 'name', 'nama', 'kode', 'wadmkc', 'namobj', 'district'];
  return list.sort((a, b) => {
    const idxA = preferred.indexOf(a);
    const idxB = preferred.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Mengekstrak daftar Zona Pelayanan dari seluruh Layer Zona Pelayanan yang di-import
 * dan HANYA yang visibilitasnya aktif (visible === true dan master show === true) pada peta / legenda.
 *
 * Penamaan label zona pada filter otomatis MENGIKUTI kolom atribut label yang dipilih di legenda GIS (labelAttribute).
 */
export function getDerivedZonesFromServiceLayers(
  serviceZoneLayers: ServiceZoneLayer[],
  showServiceZonesMaster: boolean = true,
  labelAttribute: string = 'kecamatan'
): ZoneArea[] {
  if (!showServiceZonesMaster) {
    return [];
  }

  const activeLayers = serviceZoneLayers.filter((l) => l.visible !== false);
  if (activeLayers.length === 0) {
    return [];
  }

  const zoneMap = new Map<string, ZoneArea>();

  activeLayers.forEach((layer) => {
    if (!layer.geoJsonData || !Array.isArray(layer.geoJsonData.features)) {
      return;
    }

    layer.geoJsonData.features.forEach((feature, idx) => {
      const props = feature.properties || {};

      // 1. Ekstraksi Nilai Label Dinamis sesuai kolom atribut yang dipilih di legenda
      const dynamicLabel = String(
        props[labelAttribute] ??
        props[labelAttribute.toUpperCase()] ??
        props[labelAttribute.toLowerCase()] ??
        props.kecamatan ??
        props.KECAMATAN ??
        props.WADMKC ??
        props.name ??
        props.NAMA ??
        props.nama ??
        `Zona ${idx + 1}`
      ).trim();

      // 2. Ekstraksi Kecamatan & Kode untuk referensi
      const kecamatan = String(
        props.kecamatan ||
        props.KECAMATAN ||
        props.WADMKC ||
        props.DISTRICT ||
        props.name ||
        dynamicLabel
      ).trim();

      const kode = String(
        props.kode ||
        props.KODE ||
        props.id ||
        props.ID ||
        `Z-${(kecamatan.substring(0, 3) || 'ZON').toUpperCase()}`
      ).trim();

      // Key unik berdasarkan label dinamis untuk deduplikasi tampilan
      const dedupKey = dynamicLabel.toLowerCase();

      const centroid = calculateFeatureCentroid(feature);

      if (zoneMap.has(dedupKey)) {
        // Jika sudah ada (misal multi-part polygon feature untuk wilayah yang sama), perbarui kapasitas target & tambahkan fitur
        const existing = zoneMap.get(dedupKey)!;
        existing.targetSambungan = Math.max(existing.targetSambungan, Number(props.targetSambungan || props.TARGET || 400));
        if (existing.features) {
          existing.features.push(feature);
        } else {
          existing.features = [existing.feature || feature, feature];
        }
      } else {
        zoneMap.set(dedupKey, {
          id: `ZONE-${kode}-${dedupKey.replace(/[^a-z0-9]/gi, '-')}`,
          kode,
          nama: dynamicLabel, // Penamaan persis sesuai label yang dipilih di legenda!
          kecamatan,
          targetSambungan: Number(props.targetSambungan || props.TARGET || 400),
          statusJaringan: props.status || props.STATUS || 'Jaringan Aktif',
          centerLat: centroid.lat,
          centerLng: centroid.lng,
          layerId: layer.id,
          layerName: layer.name,
          feature,
          features: [feature],
        });
      }
    });
  });

  return Array.from(zoneMap.values());
}

/**
 * Normalisasi nama zona / kecamatan agar dapat dibandingkan secara presisi
 * tanpa false-positive substring (misal: 'Sepatan' tidak boleh mencocokkan 'Sepatan Timur' dan sebaliknya).
 */
export function normalizeZoneName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^zona\s+/gi, '')
    .replace(/^kecamatan\s+/gi, '')
    .replace(/^kec\.\s*/gi, '')
    .replace(/^wilayah\s+/gi, '')
    .replace(/^kelurahan\s+/gi, '')
    .replace(/^desa\s+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cek apakah seorang calon pelanggan cocok dengan Zona Pelayanan terpilih.
 *
 * ATURAN MUTLAK GIS:
 * 1. Jika layer zona pelayanan memiliki batas poligon spasial (geometry Polygon/MultiPolygon),
 *    evaluasi spasial Point-in-Polygon adalah OTORITAS TERTINGGI (100% Ground Truth).
 *    Jika titik koordinat berada di dalam poligon zona ini -> TRUE.
 *    Jika titik koordinat di LUAR poligon zona ini -> FALSE (tidak boleh bocor karena kemiripan teks alamat).
 * 2. Fallback ID/atribut teks HANYA digunakan jika zona tidak memiliki geometri spasial sama sekali.
 */
export function isCustomerMatchingZone(
  customer: CustomerSurvey,
  zone: ZoneArea
): boolean {
  if (!zone) return false;

  // 1. Kumpulkan seluruh fitur geometri poligon milik zona ini
  const zoneFeatures: GeoJSON.Feature[] = [];
  if (zone.features && zone.features.length > 0) {
    zoneFeatures.push(...zone.features);
  } else if (zone.feature) {
    zoneFeatures.push(zone.feature);
  }

  const hasPolygonGeometry = zoneFeatures.some(
    (f) => f && f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
  );

  // Jika ada geometri poligon spasial, Point-in-Polygon WAJIB menjadi penentu mutlak
  if (hasPolygonGeometry) {
    for (const feat of zoneFeatures) {
      if (feat && feat.geometry && isPointInsideZoneFeature(customer.latitude, customer.longitude, feat)) {
        return true;
      }
    }
    // Titik secara geografis berada di luar poligon zona ini -> pastikan tidak tampil
    return false;
  }

  // 2. Fallback untuk Zona non-spasial (tanpa geometri poligon): Pencocokan ID atau Kode Zona secara persis
  if (customer.zonaId && (customer.zonaId === zone.id || customer.zonaId === zone.kode)) {
    return true;
  }

  // 3. Pencocokan Nama / Kecamatan yang ternormalisasi secara presisi (Exact match setelah normalisasi)
  const normTargetLabel = normalizeZoneName(zone.nama);
  const normTargetKec = normalizeZoneName(zone.kecamatan);

  const normCustKec = normalizeZoneName(customer.kecamatan || '');
  const normCustZonaNama = normalizeZoneName(customer.zonaNama || '');
  const normCustDesa = normalizeZoneName(customer.desa || '');

  // Cek kecocokan eksplisit pada properti kecamatan, zonaNama, desa
  if (normCustZonaNama) {
    if (normCustZonaNama === normTargetLabel || normCustZonaNama === normTargetKec) {
      return true;
    }
  }

  if (normCustKec) {
    if (normCustKec === normTargetLabel || normCustKec === normTargetKec) {
      return true;
    }
  }

  if (normCustDesa) {
    if (normCustDesa === normTargetLabel || normCustDesa === normTargetKec) {
      return true;
    }
  }

  // 4. Pencocokan Alamat dengan isolasi ketat (hanya untuk data tanpa koordinat/geometri)
  if (customer.alamat) {
    const normAlamat = customer.alamat.toLowerCase();

    // Jika target adalah "sepatan timur"
    if (normTargetLabel === 'sepatan timur' || normTargetKec === 'sepatan timur') {
      if (normAlamat.includes('sepatan timur')) {
        return true;
      }
    }

    // Jika target adalah "sepatan" (bukan sepatan timur)
    if (normTargetLabel === 'sepatan' || normTargetKec === 'sepatan') {
      if (normAlamat.includes('sepatan') && !normAlamat.includes('sepatan timur')) {
        return true;
      }
    }

    // Untuk zona-zona lainnya (misal pasar kemis, cikupa, balaraja, sindang jaya, teluknaga)
    if (normTargetLabel && normTargetLabel !== 'sepatan' && normTargetLabel !== 'sepatan timur') {
      if (normAlamat.includes(normTargetLabel)) {
        return true;
      }
    }

    if (normTargetKec && normTargetKec !== 'sepatan' && normTargetKec !== 'sepatan timur') {
      if (normAlamat.includes(normTargetKec)) {
        return true;
      }
    }
  }

  return false;
}
