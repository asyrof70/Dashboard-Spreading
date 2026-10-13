import JSZip from 'jszip';
import shp from 'shpjs';

export interface ParsedLayerResult {
  geoJson: GeoJSON.FeatureCollection;
  name: string;
  totalLengthKm: number;
  featuresCount: number;
  hasPolygons: boolean;
  hasLines: boolean;
  detectedColumns: string[];
  bounds?: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  };
}

/**
 * Normalisasi satu titik koordinat ke format GeoJSON standar: [longitude, latitude]
 * Memperbaiki otomatis jika file memiliki koordinat terbalik [lat, lng]
 */
export function normalizeCoord(coord: number[]): [number, number] {
  let lng = coord[0];
  let lat = coord[1];

  // Di Indonesia (khususnya Tangerang / Jawa Barat):
  // Longitude berkisar ~106.0 s/d 108.0 (Positif)
  // Latitude berkisar -5.5 s/d -7.5 (Negatif)
  // Jika koordinat terbalik di mana coord[0] adalah Latitude (-6.xx) dan coord[1] adalah Longitude (106.xx):
  if (Math.abs(lng) <= 90 && Math.abs(lat) > 90) {
    // Pasti terbalik!
    const temp = lng;
    lng = lat;
    lat = temp;
  } else if (lng < 0 && lat > 0 && Math.abs(lng) <= 15 && lat > 90) {
    // Contoh [-6.16, 106.53] -> balik ke [106.53, -6.16]
    const temp = lng;
    lng = lat;
    lat = temp;
  }

  return [lng, lat];
}

/**
 * Parsing koordinat KML format: "lng,lat,alt lng,lat,alt ..." atau multiline
 */
function parseKmlCoordinates(coordString: string): [number, number][] {
  const result: [number, number][] = [];
  // Split berdasarkan spasi, newline, tab, atau carriage return
  const points = coordString.trim().split(/[\s\r\n\t]+/);

  for (const pt of points) {
    if (!pt) continue;
    const parts = pt.split(',');
    if (parts.length >= 2) {
      const p0 = parseFloat(parts[0]);
      const p1 = parseFloat(parts[1]);
      if (!isNaN(p0) && !isNaN(p1)) {
        result.push(normalizeCoord([p0, p1]));
      }
    }
  }
  return result;
}

/**
 * Mengubah KML string ke GeoJSON FeatureCollection menggunakan DOMParser native di browser
 * Mendukung namespace KML, Folder, Placemark, LineString, Polygon, MultiGeometry
 */
export function parseKMLToGeoJSON(kmlString: string): GeoJSON.FeatureCollection {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlString, 'text/xml');
  const features: GeoJSON.Feature[] = [];

  // Ambil semua Placemark (case-insensitive fallback)
  let placemarks = Array.from(xmlDoc.getElementsByTagName('Placemark'));
  if (placemarks.length === 0) {
    placemarks = Array.from(xmlDoc.getElementsByTagNameNS('*', 'Placemark'));
  }
  if (placemarks.length === 0) {
    placemarks = Array.from(xmlDoc.getElementsByTagName('placemark'));
  }

  for (let i = 0; i < placemarks.length; i++) {
    const placemark = placemarks[i];
    const nameEl = placemark.getElementsByTagName('name')[0] || placemark.getElementsByTagNameNS('*', 'name')[0];
    const descEl = placemark.getElementsByTagName('description')[0] || placemark.getElementsByTagNameNS('*', 'description')[0];
    const name = nameEl?.textContent?.trim() || `Fitur #${i + 1}`;
    const description = descEl?.textContent?.trim() || '';

    const properties: Record<string, any> = {
      name,
      description,
    };

    // Ekstraksi atribut jika description memuat tabel HTML (format ekspor ArcGIS / QGIS / Google Earth)
    if (description) {
      try {
        if (description.includes('<table') || description.includes('<tr')) {
          const doc = new DOMParser().parseFromString(description, 'text/html');
          const rows = doc.querySelectorAll('tr');
          rows.forEach((row) => {
            const cells = row.querySelectorAll('th, td');
            if (cells.length >= 2) {
              const rawKey = cells[0].textContent?.trim().replace(/:$/, '');
              const rawVal = cells[1].textContent?.trim();
              if (rawKey && rawVal !== undefined && rawKey.length < 60) {
                properties[rawKey] = rawVal;
              }
            }
          });
        }

        // Juga parse jika berbentuk baris teks 'Key: Value' atau 'Key = Value'
        const cleanLines = description.replace(/<[^>]+>/g, '\n').split('\n');
        for (const line of cleanLines) {
          const m = line.match(/^([A-Za-z0-9_\-\s]{2,40})[:=]\s*(.+)$/);
          if (m) {
            const key = m[1].trim();
            const val = m[2].trim();
            if (key && val && !properties[key]) {
              properties[key] = val;
            }
          }
        }
      } catch {
        // Abaikan error parser deskripsi HTML
      }
    }

    // Parse SimpleData
    const simpleDataElements = Array.from(placemark.getElementsByTagName('SimpleData')).concat(
      Array.from(placemark.getElementsByTagNameNS('*', 'SimpleData'))
    );
    for (const el of simpleDataElements) {
      const sName = el.getAttribute('name');
      if (sName) {
        properties[sName] = el.textContent?.trim();
      }
    }

    // Parse Data / ExtendedData
    const dataElements = Array.from(placemark.getElementsByTagName('Data')).concat(
      Array.from(placemark.getElementsByTagNameNS('*', 'Data'))
    );
    for (const el of dataElements) {
      const dName = el.getAttribute('name');
      const val = (el.getElementsByTagName('value')[0] || el.getElementsByTagNameNS('*', 'value')[0])?.textContent?.trim();
      if (dName && val !== undefined) {
        properties[dName] = val;
      }
    }

    // 1. LineString (Pipa Distribusi / Transmisi)
    const lineStrings = Array.from(placemark.getElementsByTagName('LineString')).concat(
      Array.from(placemark.getElementsByTagNameNS('*', 'LineString'))
    );
    for (const ls of lineStrings) {
      const coordEl = ls.getElementsByTagName('coordinates')[0] || ls.getElementsByTagNameNS('*', 'coordinates')[0];
      if (coordEl && coordEl.textContent) {
        const coords = parseKmlCoordinates(coordEl.textContent);
        if (coords.length > 1) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: coords,
            },
            properties: {
              ...properties,
              layerType: 'pipeline',
              diameter: properties.diameter || properties.DIAMETER || properties.dia || properties.DN || 'DN 150mm',
              material: properties.material || properties.MATERIAL || properties.mat || 'HDPE / PVC',
            },
          });
        }
      }
    }

    // 2. Polygon (Zona Servis / DMA / Batas Wilayah)
    const polygons = Array.from(placemark.getElementsByTagName('Polygon')).concat(
      Array.from(placemark.getElementsByTagNameNS('*', 'Polygon'))
    );
    for (const poly of polygons) {
      const outerRingEl =
        poly.getElementsByTagName('outerBoundaryIs')[0] ||
        poly.getElementsByTagNameNS('*', 'outerBoundaryIs')[0] ||
        poly;

      const coordEl =
        outerRingEl.getElementsByTagName('coordinates')[0] ||
        outerRingEl.getElementsByTagNameNS('*', 'coordinates')[0];

      if (coordEl && coordEl.textContent) {
        const coords = parseKmlCoordinates(coordEl.textContent);
        if (coords.length >= 3) {
          // Pastikan ring tertutup
          if (
            coords[0][0] !== coords[coords.length - 1][0] ||
            coords[0][1] !== coords[coords.length - 1][1]
          ) {
            coords.push(coords[0]);
          }

          features.push({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [coords],
            },
            properties: {
              ...properties,
              layerType: 'zone_boundary',
            },
          });
        }
      }
    }
  }

  // Jika tidak ditemukan Placemark terstruktur, coba scan langsung tag LineString dan Polygon di seluruh doc
  if (features.length === 0) {
    const rawLineStrings = xmlDoc.getElementsByTagName('LineString');
    for (let l = 0; l < rawLineStrings.length; l++) {
      const coordEl = rawLineStrings[l].getElementsByTagName('coordinates')[0];
      if (coordEl?.textContent) {
        const coords = parseKmlCoordinates(coordEl.textContent);
        if (coords.length > 1) {
          features.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
            properties: { name: `Pipa Jaringan #${l + 1}`, layerType: 'pipeline' },
          });
        }
      }
    }

    const rawPolygons = xmlDoc.getElementsByTagName('Polygon');
    for (let p = 0; p < rawPolygons.length; p++) {
      const coordEl = rawPolygons[p].getElementsByTagName('coordinates')[0];
      if (coordEl?.textContent) {
        const coords = parseKmlCoordinates(coordEl.textContent);
        if (coords.length >= 3) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [coords] },
            properties: { name: `Batas Zona #${p + 1}`, layerType: 'zone_boundary' },
          });
        }
      }
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Normalisasi seluruh koordinat di GeoJSON FeatureCollection
 */
export function normalizeGeoJsonCoordinates(geoJson: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  const normalizedFeatures = geoJson.features.map((feature) => {
    const geom = feature.geometry;
    if (!geom) return feature;

    if (geom.type === 'LineString') {
      return {
        ...feature,
        geometry: {
          ...geom,
          coordinates: geom.coordinates.map((c) => normalizeCoord(c)),
        },
      };
    } else if (geom.type === 'MultiLineString') {
      return {
        ...feature,
        geometry: {
          ...geom,
          coordinates: geom.coordinates.map((line) => line.map((c) => normalizeCoord(c))),
        },
      };
    } else if (geom.type === 'Polygon') {
      return {
        ...feature,
        geometry: {
          ...geom,
          coordinates: geom.coordinates.map((ring) => ring.map((c) => normalizeCoord(c))),
        },
      };
    } else if (geom.type === 'MultiPolygon') {
      return {
        ...feature,
        geometry: {
          ...geom,
          coordinates: geom.coordinates.map((poly) => poly.map((ring) => ring.map((c) => normalizeCoord(c)))),
        },
      };
    }

    return feature;
  });

  return {
    ...geoJson,
    features: normalizedFeatures,
  };
}

/**
 * Hitung Bounding Box (minLng, minLat, maxLng, maxLat)
 */
export function calculateGeoJsonBounds(geoJson: GeoJSON.FeatureCollection): {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
} | undefined {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  let count = 0;

  const update = (coord: number[]) => {
    const [lng, lat] = normalizeCoord(coord);
    if (!isNaN(lng) && !isNaN(lat)) {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
      count++;
    }
  };

  for (const feature of geoJson.features) {
    const geom = feature.geometry;
    if (!geom) continue;

    if (geom.type === 'Point') {
      update(geom.coordinates);
    } else if (geom.type === 'LineString') {
      geom.coordinates.forEach(update);
    } else if (geom.type === 'MultiLineString') {
      geom.coordinates.forEach((line) => line.forEach(update));
    } else if (geom.type === 'Polygon') {
      geom.coordinates.forEach((ring) => ring.forEach(update));
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach((poly) => poly.forEach((ring) => ring.forEach(update)));
    }
  }

  if (count === 0 || minLng === Infinity) return undefined;

  return { minLng, minLat, maxLng, maxLat };
}

/**
 * Ekstraksi seluruh daftar kolom dari GeoJSON properties (Attribute Table)
 */
export function extractDetectedColumns(geoJson: GeoJSON.FeatureCollection): string[] {
  const cols = new Set<string>();
  for (const feature of geoJson.features) {
    if (feature.properties) {
      Object.keys(feature.properties).forEach((k) => {
        if (k !== 'layerType' && k !== 'description') {
          cols.add(k);
        }
      });
    }
  }
  return Array.from(cols).sort((a, b) => a.localeCompare(b));
}

/**
 * Parse File KMZ, KML, GeoJSON, atau SHP (Shapefile Zip / ArrayBuffer)
 */
export async function parseSpatialFile(file: File): Promise<ParsedLayerResult> {
  const fileName = file.name.toLowerCase();

  // 1. KMZ Handling (ZIP yang membungkus .kml)
  if (fileName.endsWith('.kmz')) {
    const zip = await JSZip.loadAsync(file);
    // Cari file .kml di dalam arsip
    const kmlFileName = Object.keys(zip.files).find((name) => name.toLowerCase().endsWith('.kml'));
    if (!kmlFileName) {
      throw new Error('Tidak ditemukan file .kml di dalam arsip KMZ yang diunggah.');
    }
    const kmlContent = await zip.files[kmlFileName].async('string');
    let geoJson = parseKMLToGeoJSON(kmlContent);
    geoJson = normalizeGeoJsonCoordinates(geoJson);

    const totalLengthKm = calculateLineStringLength(geoJson);
    const hasPolygons = geoJson.features.some((f) => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');
    const hasLines = geoJson.features.some((f) => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString');
    const bounds = calculateGeoJsonBounds(geoJson);

    return {
      geoJson,
      name: file.name.replace(/\.[^/.]+$/, ''),
      totalLengthKm,
      featuresCount: geoJson.features.length,
      hasPolygons,
      hasLines,
      detectedColumns: extractDetectedColumns(geoJson),
      bounds,
    };
  }

  // 2. KML Handling
  if (fileName.endsWith('.kml')) {
    const kmlContent = await file.text();
    let geoJson = parseKMLToGeoJSON(kmlContent);
    geoJson = normalizeGeoJsonCoordinates(geoJson);

    const totalLengthKm = calculateLineStringLength(geoJson);
    const hasPolygons = geoJson.features.some((f) => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');
    const hasLines = geoJson.features.some((f) => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString');
    const bounds = calculateGeoJsonBounds(geoJson);

    return {
      geoJson,
      name: file.name.replace(/\.[^/.]+$/, ''),
      totalLengthKm,
      featuresCount: geoJson.features.length,
      hasPolygons,
      hasLines,
      detectedColumns: extractDetectedColumns(geoJson),
      bounds,
    };
  }

  // 3. Shapefile (.shp / .zip) Handling via JSZip + shpjs
  if (fileName.endsWith('.shp') || fileName.endsWith('.zip')) {
    try {
      const buffer = await file.arrayBuffer();
      let allFeatures: GeoJSON.Feature[] = [];

      if (fileName.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(buffer);
        const fileNames = Object.keys(zip.files).filter((name) => {
          return !name.startsWith('__MACOSX') && !name.includes('/.') && !name.startsWith('.');
        });

        // Cari file .shp di dalam arsip ZIP
        const shpFileNames = fileNames.filter((name) => name.toLowerCase().endsWith('.shp'));

        if (shpFileNames.length > 0) {
          for (const shpPath of shpFileNames) {
            const basePath = shpPath.replace(/\.shp$/i, '');
            const dbfPath = fileNames.find((f) => f.toLowerCase() === `${basePath.toLowerCase()}.dbf`);
            const prjPath = fileNames.find((f) => f.toLowerCase() === `${basePath.toLowerCase()}.prj`);

            const shpBuffer = await zip.files[shpPath].async('arraybuffer');
            const dbfBuffer = dbfPath ? await zip.files[dbfPath].async('arraybuffer') : null;
            const prjString = prjPath ? await zip.files[prjPath].async('string') : null;

            try {
              const geometries = (shp as any).parseShp(shpBuffer, prjString || undefined);
              const properties = dbfBuffer ? (shp as any).parseDbf(dbfBuffer) : [];
              const combined = (shp as any).combine([geometries, properties]);

              if (combined && Array.isArray(combined.features)) {
                allFeatures.push(...combined.features);
              } else if (combined && combined.type === 'Feature') {
                allFeatures.push(combined);
              }
            } catch (innerErr) {
              console.warn(`Error parsing shapefile ${shpPath}:`, innerErr);
            }
          }
        } else {
          // Cek apakah di dalam zip ada file GeoJSON / KML
          const geoJsonPath = fileNames.find((name) => name.toLowerCase().endsWith('.geojson') || name.toLowerCase().endsWith('.json'));
          if (geoJsonPath) {
            const text = await zip.files[geoJsonPath].async('string');
            const parsed = JSON.parse(text);
            allFeatures = parsed.type === 'FeatureCollection' ? parsed.features : [parsed];
          } else {
            const kmlPath = fileNames.find((name) => name.toLowerCase().endsWith('.kml'));
            if (kmlPath) {
              const text = await zip.files[kmlPath].async('string');
              const parsed = parseKMLToGeoJSON(text);
              allFeatures = parsed.features;
            }
          }
        }
      } else {
        // Standalone .shp file
        try {
          const geometries = (shp as any).parseShp(buffer);
          const combined = (shp as any).combine([geometries, []]);
          if (combined && Array.isArray(combined.features)) {
            allFeatures = combined.features;
          }
        } catch (e) {
          console.warn('Error parsing standalone .shp:', e);
        }
      }

      // Fallback: Jika custom unpacker kosong, coba panggil shpjs default
      if (allFeatures.length === 0) {
        try {
          const rawParsed: any = await shp(buffer);
          if (Array.isArray(rawParsed)) {
            allFeatures = rawParsed.flatMap((col) => (col && Array.isArray(col.features) ? col.features : []));
          } else if (rawParsed && Array.isArray(rawParsed.features)) {
            allFeatures = rawParsed.features;
          }
        } catch (fbErr) {
          console.warn('Fallback shpjs error:', fbErr);
        }
      }

      if (allFeatures.length === 0) {
        throw new Error('Tidak dapat mengekstrak data spasial dari Shapefile. Pastikan file .zip berisi file .shp dan .dbf yang valid.');
      }

      let geoJson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: allFeatures,
      };

      geoJson = normalizeGeoJsonCoordinates(geoJson);

      const totalLengthKm = calculateLineStringLength(geoJson);
      const hasPolygons = geoJson.features.some((f) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
      const hasLines = geoJson.features.some((f) => f.geometry && (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'));
      const bounds = calculateGeoJsonBounds(geoJson);

      return {
        geoJson,
        name: file.name.replace(/\.[^/.]+$/, ''),
        totalLengthKm,
        featuresCount: geoJson.features.length,
        hasPolygons,
        hasLines,
        detectedColumns: extractDetectedColumns(geoJson),
        bounds,
      };
    } catch (err: any) {
      throw new Error(`Gagal mem-parsing Shapefile: ${err?.message || 'Pastikan file .zip memuat file .shp, .dbf, dan .shx'}`);
    }
  }

  // 4. GeoJSON or JSON
  if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    let geoJson: GeoJSON.FeatureCollection =
      parsed.type === 'FeatureCollection'
        ? parsed
        : {
            type: 'FeatureCollection',
            features: parsed.type === 'Feature' ? [parsed] : [],
          };

    geoJson = normalizeGeoJsonCoordinates(geoJson);

    const totalLengthKm = calculateLineStringLength(geoJson);
    const hasPolygons = geoJson.features.some((f) => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');
    const hasLines = geoJson.features.some((f) => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString');
    const bounds = calculateGeoJsonBounds(geoJson);

    return {
      geoJson,
      name: file.name.replace(/\.[^/.]+$/, ''),
      totalLengthKm,
      featuresCount: geoJson.features.length,
      hasPolygons,
      hasLines,
      detectedColumns: extractDetectedColumns(geoJson),
      bounds,
    };
  }

  throw new Error('Format file tidak didukung. Harap unggah file .KMZ, .KML, .GeoJSON, atau .SHP (.zip).');
}

/**
 * Hitung perkiraan panjang pipa dalam kilometer menggunakan Haversine
 */
export function calculateLineStringLength(geoJson: GeoJSON.FeatureCollection): number {
  let totalKm = 0;
  for (const feature of geoJson.features) {
    if (feature.geometry.type === 'LineString') {
      const coords = feature.geometry.coordinates;
      for (let i = 0; i < coords.length - 1; i++) {
        totalKm += haversineDistanceKm(
          coords[i][1],
          coords[i][0],
          coords[i + 1][1],
          coords[i + 1][0]
        );
      }
    } else if (feature.geometry.type === 'MultiLineString') {
      const lines = feature.geometry.coordinates;
      for (const line of lines) {
        for (let i = 0; i < line.length - 1; i++) {
          totalKm += haversineDistanceKm(
            line[i][1],
            line[i][0],
            line[i + 1][1],
            line[i + 1][0]
          );
        }
      }
    }
  }
  return parseFloat(totalKm.toFixed(2));
}

/**
 * Jarak Haversine antar dua koordinat (km)
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius Bumi dalam km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Jarak tegak lurus terpendek dari sebuah titik ke segmen garis [A, B] dalam meter
 */
function distancePointToSegmentMeters(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const latScale = 111320; // meter per derajat latitude
  const lngScale = 111320 * Math.cos((pLat * Math.PI) / 180); // meter per derajat longitude

  const px = (pLng - aLng) * lngScale;
  const py = (pLat - aLat) * latScale;
  const bx = (bLng - aLng) * lngScale;
  const by = (bLat - aLat) * latScale;

  const segLenSq = bx * bx + by * by;
  if (segLenSq === 0) {
    return Math.sqrt(px * px + py * py);
  }

  const t = Math.max(0, Math.min(1, (px * bx + py * by) / segLenSq));
  const cx = t * bx;
  const cy = t * by;

  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Hitung jarak tegak lurus terpendek titik pelanggan ke jaringan pipa terdekat (dalam meter)
 * Mendukung LineString & MultiLineString dengan proyeksi tegak lurus presisi
 */
export function calculateDistanceToNearestPipeline(
  pointLat: number,
  pointLng: number,
  pipelineLayers: GeoJSON.FeatureCollection[]
): number {
  let minDistanceMeters = Infinity;

  for (const collection of pipelineLayers) {
    if (!collection || !collection.features) continue;
    for (const feature of collection.features) {
      if (!feature || !feature.geometry) continue;

      if (feature.geometry.type === 'LineString') {
        const coords = feature.geometry.coordinates;
        for (let i = 0; i < coords.length - 1; i++) {
          const aLng = coords[i][0];
          const aLat = coords[i][1];
          const bLng = coords[i + 1][0];
          const bLat = coords[i + 1][1];

          const d = distancePointToSegmentMeters(pointLat, pointLng, aLat, aLng, bLat, bLng);
          if (d < minDistanceMeters) {
            minDistanceMeters = d;
          }
        }
      } else if (feature.geometry.type === 'MultiLineString') {
        const lines = feature.geometry.coordinates;
        for (const line of lines) {
          for (let i = 0; i < line.length - 1; i++) {
            const aLng = line[i][0];
            const aLat = line[i][1];
            const bLng = line[i + 1][0];
            const bLat = line[i + 1][1];

            const d = distancePointToSegmentMeters(pointLat, pointLng, aLat, aLng, bLat, bLng);
            if (d < minDistanceMeters) {
              minDistanceMeters = d;
            }
          }
        }
      }
    }
  }

  return minDistanceMeters === Infinity ? 9999 : parseFloat(minDistanceMeters.toFixed(1));
}

/**
 * Algoritma Point-in-Polygon (Ray Casting)
 */
export function isPointInPolygonRing(point: [number, number], vs: number[][]): boolean {
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0],
      yi = vs[i][1];
    const xj = vs[j][0],
      yj = vs[j][1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Cek apakah titik koordinat (lat, lng) berada di dalam Feature Polygon Zona Pelayanan
 */
export function isPointInsideZoneFeature(
  lat: number,
  lng: number,
  feature: GeoJSON.Feature
): boolean {
  if (!feature || !feature.geometry) return false;
  const pt: [number, number] = [lng, lat];
  const geom = feature.geometry;

  if (geom.type === 'Polygon') {
    const outerRing = geom.coordinates[0];
    return !!(outerRing && isPointInPolygonRing(pt, outerRing));
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      const outerRing = poly[0];
      if (outerRing && isPointInPolygonRing(pt, outerRing)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Cek apakah titik koordinat (lat, lng) berada di dalam salah satu Polygon di FeatureCollection Zona Pelayanan
 */
export function isPointInsideZoneFeatureCollection(
  lat: number,
  lng: number,
  zoneCollection: GeoJSON.FeatureCollection
): { inside: boolean; zoneName?: string } {
  const pt: [number, number] = [lng, lat];

  for (const feature of zoneCollection.features) {
    const geom = feature.geometry;
    const name = feature.properties?.name || feature.properties?.NAMA || feature.properties?.ZONA || 'Zona Pelayanan';

    if (geom.type === 'Polygon') {
      const outerRing = geom.coordinates[0];
      if (outerRing && isPointInPolygonRing(pt, outerRing)) {
        return { inside: true, zoneName: name };
      }
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        const outerRing = poly[0];
        if (outerRing && isPointInPolygonRing(pt, outerRing)) {
          return { inside: true, zoneName: name };
        }
      }
    }
  }

  return { inside: false };
}
