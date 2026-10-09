export type InterestStatus = 'Minat' | 'Tidak Minat';

export interface VisitRecord {
  visitId: string;
  noForm?: string;
  nama?: string;
  telepon?: string;
  alamat?: string;
  salesId: string;
  salesNama: string;
  tanggalSpreading: string;
  timestamp?: string;
  statusMinat: InterestStatus;
  kebutuhanDebit?: string;
  alasan?: string;
  catatanSales?: string;
  fotoProperti?: string;
  coordinates: [number, number]; // [lat, lng]
}

export interface CustomerSurvey {
  id: string;
  propertyId?: string; // Identifier unik untuk properti/rumah fisik
  timestamp?: string; // Timestamp AppSheet (e.g. 2026-09-30 10:15:30)
  nama: string; // Nama Calon Pelanggan
  telepon: string; // No Telepon
  alamat: string; // Alamat lengkap
  blok?: string; // Blok (e.g. Blok B4)
  nomorRumah?: string; // No. Rumah (e.g. No. 12)
  rt?: string; // RT
  rw?: string; // RW
  desa?: string; // Desa / Kelurahan
  kecamatan?: string; // Kecamatan
  latitude: number; // Latitude / Lintang
  longitude: number; // Longitude / Bujur
  jenisAreaTarget?: 'Adhoc' | 'CAPEX' | string; // Jenis Area Target
  statusMinat: InterestStatus; // Status minat pelanggan: Minat / Tidak Minat
  alasanTidakMinat?: string; // Alasan tidak minat (opsional)
  noForm?: string; // No. Form AppSheet
  fotoProperti?: string; // Foto properti calon pelanggan
  rawRow?: Record<string, any>; // Seluruh kolom mentah asli dari spreadsheet

  // Relasi Sales & Wilayah
  salesId: string;
  salesNama: string;
  zonaId: string;
  zonaNama: string;
  tanggalSpreading: string;
  kebutuhanDebit?: string;
  alasan?: string;
  fotoRumahUrl?: string;
  jarakKePipaMeter?: number;
  catatanSales?: string;

  // Dinamis: Jarak ke pipa aktif yang sedang dihidupkan visibilitasnya
  isOutsideVisiblePipe?: boolean;
  distanceToVisiblePipeMeter?: number;

  // Fitur Deteksi Spreading Berulang / Properti Beda (<10 meter)
  isDuplicateCandidate?: boolean;
  duplicateCount?: number;
  duplicateGroupId?: string | null;
  duplicateDistanceMeters?: number;
  isMerged?: boolean;
  mergedAt?: string;
  analystDecision?: 'merged_history' | 'separate_property' | 'pending';
  analystNote?: string;
  historyVisits?: VisitRecord[];

  // Penanda berada di dalam zona pelayanan
  insideServiceZone?: boolean;
  serviceZoneName?: string;
}

export interface DuplicateCluster {
  groupId: string;
  anchorSurvey: CustomerSurvey;
  surveys: CustomerSurvey[];
  distanceMeters: number;
  status: 'pending' | 'resolved_merged' | 'resolved_separated';
  mergedAt?: string;
  canonicalId?: string;
  mergedSurveyIds?: string[];
  analystNote?: string;
}

export interface SalesRep {
  id: string;
  nama: string;
  nip: string;
  targetBulanan: number;
  zonaTugas: string[];
  totalSpreading: number;
  totalMinat: number;
  konversiRate: number;
}

export interface ZoneArea {
  id: string;
  kode: string;
  nama: string;
  kecamatan: string;
  targetSambungan: number;
  statusJaringan: 'Jaringan Aktif' | 'Perluasan Segera' | 'Belum Ada Jaringan' | string;
  centerLat: number;
  centerLng: number;
  layerId?: string;
  layerName?: string;
  feature?: GeoJSON.Feature;
  features?: GeoJSON.Feature[];
}

/**
 * Aturan Pewarnaan Berdasarkan Nilai Kolom Atribut Tabel (Symbology / Unique Values)
 */
export interface SymbologyRule {
  value: string; // Nilai atribut (misal "DN 400", "HDPE", "Sepatan", "Aktif", dst)
  label?: string;
  color: string; // Warna garis / border
  fillColor?: string; // Warna isian polygon
  width?: number; // Ketebalan garis
  opacity?: number;
  count?: number; // Jumlah fitur yang memiliki nilai ini
}

export interface DiameterColorRule {
  minDiameterMm?: number;
  maxDiameterMm?: number;
  pattern?: string;
  label: string;
  color: string;
  width?: number;
}

export interface PipeNetworkLayer {
  id: string;
  name: string;
  fileName: string;
  type: 'KMZ' | 'KML' | 'GeoJSON' | 'SHP';
  visible: boolean;
  color: string;
  width: number;
  totalLengthKm?: number;
  featuresCount: number;
  geoJsonData: GeoJSON.FeatureCollection;
  uploadDate: string;
  classifyColumn?: string; // Kolom yang dipilih untuk pewarnaan garis (misal DIAMETER, MATERIAL, STATUS)
  diameterColumnKey?: string;
  diameterRules?: DiameterColorRule[];
  symbologyRules?: SymbologyRule[];
}

export interface ServiceZoneLayer {
  id: string;
  name: string;
  fileName: string;
  type: 'KMZ' | 'KML' | 'GeoJSON' | 'SHP';
  visible: boolean;
  borderColor: string;
  fillColor: string;
  borderWidth: number;
  fillOpacity: number;
  geoJsonData: GeoJSON.FeatureCollection;
  featuresCount: number;
  areaKm2?: number;
  uploadDate: string;
  classifyColumn?: string; // Kolom yang dipilih untuk pewarnaan polygon (misal ZONA, KECAMATAN, DMA)
  symbologyRules?: SymbologyRule[];
}

export interface FilterState {
  zonaId: string;
  salesId: string; // 5 sales atau 'ALL'
  statusMinat: InterestStatus[];
  startDate: string; // Periode Mulai
  endDate: string;   // Periode Selesai
  searchQuery: string;
  onlyOutsideNetwork: boolean;
  filterDuplicateMode?: 'all' | 'duplicates_only' | 'unique_only';
  selectedServiceZoneLayerId?: string; // Filter berdasarkan batas zona pelayanan tertentu
  onlyInsideServiceZone?: boolean;     // Filter titik yang jatuh di dalam batas zona pelayanan
}
