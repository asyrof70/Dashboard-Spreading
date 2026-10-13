import * as XLSX from 'xlsx';
import { CustomerSurvey, InterestStatus } from '../types/gis';

export interface ColumnMappingConfig {
  namaCol: string;
  teleponCol: string;
  alamatCol: string;
  latCol: string;
  lngCol: string;
  coordsCol?: string; // Kolom gabungan "lat, lng" atau "-6.123, 106.456"
  statusMinatCol: string;
  salesCol: string;
  tanggalCol: string;
  zonaCol?: string;
  blokCol?: string;
  noRumahCol?: string;
  rtCol?: string;
  rwCol?: string;
  desaCol?: string;
  kecamatanCol?: string;
  jenisAreaTargetCol?: string;
  alasanCol?: string;
  noFormCol?: string;
  fotoCol?: string;
  catatanCol?: string;
}

export interface SpreadsheetParsedResult {
  headers: string[];
  rawRows: Record<string, any>[];
  customers: CustomerSurvey[];
  invalidRowsCount: number;
  totalRows: number;
  detectedMapping: ColumnMappingConfig;
  statusValuesSummary?: { minat: number; tidakMinat: number; sampleValues: string[] };
}

export interface LinkedSpreadsheetConfig {
  url: string;
  sheetName?: string;
  autoSync: boolean;
  intervalMinutes: number;
  lastSyncedAt?: string;
  lastSyncTimestamp?: number;
  lastSyncedCount?: number;
  mapping?: ColumnMappingConfig;
}

const STORAGE_KEY_LINKED_SHEET = 'aetra_linked_spreadsheet_config_v3';
const STORAGE_KEY_CUSTOMERS = 'aetra_gis_customers_persistent_v3';

/**
 * Normalisasi koordinat: Tangerang / Jabodetabek biasanya Lat: ~ -6.xx, Lng: ~ 106.xx
 */
export function normalizeCoordinates(latRaw: any, lngRaw: any): { lat: number; lng: number } | null {
  if (latRaw === undefined || latRaw === null || lngRaw === undefined || lngRaw === null) {
    return null;
  }

  let lat = typeof latRaw === 'number' ? latRaw : parseFloat(String(latRaw).replace(',', '.').trim());
  let lng = typeof lngRaw === 'number' ? lngRaw : parseFloat(String(lngRaw).replace(',', '.').trim());

  if (isNaN(lat) || isNaN(lng)) return null;

  // Jika terbalik (Lng bernilai negatif / kecil dan Lat bernilai ~106)
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    const temp = lat;
    lat = lng;
    lng = temp;
  } else if (lat > 0 && lng < 0) {
    const temp = lat;
    lat = lng;
    lng = temp;
  } else if (lat > 90 && lng < 0) {
    const temp = lat;
    lat = lng;
    lng = temp;
  }

  // Jika Lat bernilai positif padahal di Indonesia (lintang selatan), ubah ke negatif jika di sekitar 6.xx
  if (lat > 4 && lat < 11) {
    lat = -lat;
  }

  return { lat, lng };
}

/**
 * Parse single string coordinates column (e.g. "-6.12345, 106.56789" atau "Lat: -6.12, Lng: 106.56")
 */
export function parseCombinedCoords(raw: any): { lat: number; lng: number } | null {
  if (!raw) return null;
  const str = String(raw).trim();
  
  // Format standard comma or space separated: "-6.123, 106.567"
  const clean = str.replace(/[^\d.,\-+ ]/g, ' ').trim();
  const parts = clean.split(/[\s,;]+/).filter(Boolean);
  
  if (parts.length >= 2) {
    return normalizeCoordinates(parts[0], parts[1]);
  }
  return null;
}

/**
 * Deteksi status minat dari teks umum AppSheet / Excel
 * Mendeteksi variasi: 'Minat', 'Berminat', 'Ya', 'Tidak Minat', 'Tidak Berminat', 'Belum Minat', 'Menolak', 'TM', 'Gak Minat', 'Ga Minat', dll.
 */
export function normalizeInterestStatus(val: any): InterestStatus {
  if (val === undefined || val === null) return 'Minat';

  // Jika boolean
  if (typeof val === 'boolean') {
    return val ? 'Minat' : 'Tidak Minat';
  }

  // Jika number (1 = Minat, 0 = Tidak Minat)
  if (typeof val === 'number') {
    return val === 1 ? 'Minat' : 'Tidak Minat';
  }

  const str = String(val).toLowerCase().trim();
  if (!str) return 'Minat';

  // 1. Periksa apakah ada kata penolakan/negasi
  const hasNegativeKeyword =
    str.includes('tidak') ||
    str.includes('tak') ||
    str.includes('bukan') ||
    str.includes('belum') ||
    str.includes('kurang') ||
    str.includes('gak') ||
    str.includes('nggak') ||
    str.includes('ogah') ||
    str === 'ga' ||
    str.startsWith('ga ') ||
    str.endsWith(' ga') ||
    str.includes(' ga ') ||
    str.includes('gk ') ||
    str.startsWith('gk') ||
    str === 'tm' ||
    str === 'tolak' ||
    str.includes('menolak') ||
    str.includes('ditolak') ||
    str.includes('penolakan') ||
    str.includes('reject') ||
    str.includes('uninterested') ||
    str.includes('not interested') ||
    str.includes('batal') ||
    str.includes('gagal') ||
    str.includes('keberatan') ||
    str === 'no' ||
    str === 'false' ||
    str === '0' ||
    str === 'non' ||
    str === 'cancel';

  // 2. Jika tidak ada kata negasi dan jelas berminat
  if (!hasNegativeKeyword) {
    if (
      str === 'minat' ||
      str === 'berminat' ||
      str.startsWith('minat') ||
      str.startsWith('berminat') ||
      str === 'ya' ||
      str === 'yes' ||
      str === 'y' ||
      str === '1' ||
      str === 'true' ||
      str === 'm' ||
      str === 'ok' ||
      str === 'oke' ||
      str === 'setuju' ||
      str === 'mau' ||
      str === 'tertarik' ||
      str.includes('minat') ||
      str.includes('berminat') ||
      str.includes('tertarik')
    ) {
      return 'Minat';
    }
  }

  // 3. Jika ada kata negasi
  if (hasNegativeKeyword) {
    return 'Tidak Minat';
  }

  return 'Minat';
}

/**
 * Parsing tanggal fleksibel dari spreadsheet (mendukung DD/MM/YYYY standar Indonesia, YYYY-MM-DD, dan nomor serial Excel)
 */
export function parseSpreadsheetDate(raw: any): { tanggal: string; timestamp: string } {
  const now = new Date();
  const defaultDate = now.toISOString().slice(0, 10);
  const defaultTs = now.toISOString().slice(0, 19).replace('T', ' ');

  if (!raw && raw !== 0) {
    return { tanggal: defaultDate, timestamp: defaultTs };
  }

  const str = String(raw).trim();
  if (!str) return { tanggal: defaultDate, timestamp: defaultTs };

  // 1. Numeric Excel date serial (e.g. 45565)
  const num = Number(str);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    return {
      tanggal: d.toISOString().slice(0, 10),
      timestamp: d.toISOString().slice(0, 19).replace('T', ' '),
    };
  }

  // 2. Format DD/MM/YYYY atau DD-MM-YYYY (Format umum Indonesia)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const isoDate = `${year}-${pad(month)}-${pad(day)}`;
      const isoTime = `${isoDate} ${pad(hour)}:${pad(min)}:${pad(sec)}`;
      return { tanggal: isoDate, timestamp: isoTime };
    }
  }

  // 3. Format YYYY-MM-DD (ISO)
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    const hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const min = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const sec = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      tanggal: `${year}-${pad(month)}-${pad(day)}`,
      timestamp: `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(min)}:${pad(sec)}`,
    };
  }

  // 4. Fallback native parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return {
      tanggal: parsed.toISOString().slice(0, 10),
      timestamp: parsed.toISOString().slice(0, 19).replace('T', ' '),
    };
  }

  return { tanggal: defaultDate, timestamp: defaultTs };
}

/**
 * Helper pencarian nilai kolom yang toleran terhadap huruf besar/kecil & spasi ekstra di header
 */
export function getRowField(row: Record<string, any>, colName?: string): any {
  if (!colName) return undefined;
  if (row[colName] !== undefined && row[colName] !== null && row[colName] !== '') {
    return row[colName];
  }

  const cleanTarget = colName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleanTarget) return undefined;

  for (const [key, val] of Object.entries(row)) {
    if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget) {
      if (val !== undefined && val !== null && val !== '') {
        return val;
      }
    }
  }
  return undefined;
}

/**
 * Normalisasi dan formatting link foto (Google Drive, Dropbox, AppSheet, Web Image, dsb)
 * Menghasilkan direct image stream/thumbnail URL yang dapat langsung dirender di tag <img> dashboard
 */
export function formatPhotoUrl(raw: any): string {
  if (!raw) return '';
  let str = String(raw).trim();
  if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
    return '';
  }

  // Jika berupa formula Excel =HYPERLINK("...", "...")
  const hyperlinkMatch = str.match(/=HYPERLINK\s*\(\s*["']([^"']+)["']/i);
  if (hyperlinkMatch && hyperlinkMatch[1]) {
    str = hyperlinkMatch[1].trim();
  }

  // Jika teks memuat URL di dalamnya, ambil URL pertama
  const urlMatch = str.match(/https?:\/\/[^\s"')]+/i);
  if (urlMatch) {
    str = urlMatch[0];
  }

  // 1. Google Drive: Ubah link halaman sharing menjadi direct preview thumbnail
  // Format 1: drive.google.com/file/d/{ID}/...
  const gdriveMatch1 = str.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (gdriveMatch1 && gdriveMatch1[1]) {
    return `https://drive.google.com/thumbnail?id=${gdriveMatch1[1]}&sz=w1000`;
  }

  // Format 2: drive.google.com/open?id={ID} atau uc?id={ID}
  const gdriveMatch2 = str.match(/drive\.google\.com\/(?:open|uc)\?(?:[^&]*&)?id=([a-zA-Z0-9_-]+)/i);
  if (gdriveMatch2 && gdriveMatch2[1]) {
    return `https://drive.google.com/thumbnail?id=${gdriveMatch2[1]}&sz=w1000`;
  }

  // Format 3: docs.google.com/uc?export=download&id={ID}
  const gdriveMatch3 = str.match(/docs\.google\.com\/uc\?(?:[^&]*&)?id=([a-zA-Z0-9_-]+)/i);
  if (gdriveMatch3 && gdriveMatch3[1]) {
    return `https://drive.google.com/thumbnail?id=${gdriveMatch3[1]}&sz=w1000`;
  }

  // 2. Dropbox: Ubah dl=0 menjadi raw=1 untuk direct image
  if (str.includes('dropbox.com')) {
    if (str.includes('dl=0')) {
      return str.replace('dl=0', 'raw=1');
    }
    if (!str.includes('raw=1')) {
      return str.includes('?') ? `${str}&raw=1` : `${str}?raw=1`;
    }
  }

  return str;
}

/**
 * Deteksi otomatis nama kolom berdasarkan kata kunci umum di AppSheet / Excel
 * Menggunakan pencarian bertingkat: Exact Match -> StartsWith/EndsWith -> Substring (dengan blacklist kata penjelas)
 */
export function autoDetectColumns(headers: string[]): ColumnMappingConfig {
  const norm = headers.map((h) => ({
    original: h,
    lower: h.toLowerCase().replace(/[^a-z0-9]/g, ''),
  }));

  const findCol = (keywords: string[], blacklistKeywords: string[] = []): string => {
    // PASS 1: Exact match on clean string (tidak boleh ada kata terlarang)
    for (const kw of keywords) {
      const cleanKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
      const match = norm.find((item) => {
        if (blacklistKeywords.some((b) => item.lower.includes(b))) return false;
        return item.lower === cleanKw;
      });
      if (match) return match.original;
    }

    // PASS 2: Starts with clean string or ends with clean string
    for (const kw of keywords) {
      const cleanKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
      const match = norm.find((item) => {
        if (blacklistKeywords.some((b) => item.lower.includes(b))) return false;
        return item.lower.startsWith(cleanKw) || item.lower.endsWith(cleanKw);
      });
      if (match) return match.original;
    }

    // PASS 3: Substring includes (hanya untuk keyword panjang >= 4 agar tidak salah tangkap)
    for (const kw of keywords) {
      const cleanKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKw.length < 4) continue;
      const match = norm.find((item) => {
        if (blacklistKeywords.some((b) => item.lower.includes(b))) return false;
        return item.lower.includes(cleanKw);
      });
      if (match) return match.original;
    }

    return '';
  };

  return {
    namaCol: findCol(
      ['namapelanggan', 'namacalonpelanggan', 'namaprospek', 'namalengkap', 'nama', 'customer', 'prospek', 'client', 'name'],
      ['sales', 'petugas', 'surveyor', 'agen', 'nip', 'foto', 'telepon', 'alamat']
    ),
    teleponCol: findCol(['notelepon', 'nohp', 'nomorhp', 'notelp', 'telepon', 'phone', 'whatsapp', 'wa', 'mobile', 'kontak']),
    alamatCol: findCol(['alamatlengkap', 'alamatrumah', 'alamat', 'address', 'lokasi', 'tempat', 'domisili']),
    latCol: findCol(['latitude', 'lat', 'lintang', 'ycoord', 'y', 'latitud']),
    lngCol: findCol(['longitude', 'lng', 'long', 'bujur', 'xcoord', 'x', 'longitud']),
    coordsCol: findCol(['koordinat', 'coordinates', 'gps', 'lokasigps', 'titikgps', 'latlong', 'latlng', 'point', 'posisi']),
    statusMinatCol: findCol(
      [
        'statusminat',
        'status_minat',
        'minattidakminat',
        'minattidak',
        'minat',
        'status',
        'kategoriminat',
        'kategori_minat',
        'hasil',
        'hasilspreading',
        'hasilsurvey',
        'hasilkunjungan',
        'respon',
        'responpelanggan',
        'jawaban',
        'keputusan',
        'decision',
        'interest',
        'interested',
      ],
      // CRITICAL: Jangan pernah mengambil kolom alasan/kendala/catatan/foto/sales/telepon/alamat sebagai status minat!
      ['alasan', 'reason', 'kendala', 'sebab', 'catatan', 'remarks', 'notes', 'foto', 'photo', 'image', 'telepon', 'phone', 'alamat', 'address', 'zona', 'sales', 'nama']
    ),
    salesCol: findCol(['namasales', 'sales', 'petugas', 'surveyor', 'agent', 'nip', 'petugasspreading', 'nama_sales']),
    tanggalCol: findCol(['timestamp', 'tanggalspreading', 'tanggal', 'tgl', 'date', 'createdat', 'waktu', 'tanggal_survey']),
    zonaCol: findCol(['zonapelayanan', 'zona', 'wilayah', 'kecamatan', 'area', 'rayon', 'wilayahpelayanan']),
    blokCol: findCol(['blok', 'block']),
    noRumahCol: findCol(['norumah', 'nomorrumah', 'norum', 'house', 'no_rumah']),
    rtCol: findCol(['rt']),
    rwCol: findCol(['rw']),
    desaCol: findCol(['desa', 'kelurahan', 'desakelurahan', 'desa_kelurahan']),
    kecamatanCol: findCol(['kecamatan', 'kec']),
    jenisAreaTargetCol: findCol(['jenisareatarget', 'areatarget', 'capexadhoc', 'target', 'kategori']),
    alasanCol: findCol(
      ['alasantidakminat', 'alasantolak', 'alasan_tidak_minat', 'alasan', 'kendala', 'sebab', 'reasons', 'keterangan_tolak'],
      ['status', 'foto', 'telepon', 'sales', 'alamat']
    ),
    noFormCol: findCol(['noform', 'nomorform', 'idform', 'form', 'tiket', 'notiket', 'id_survey']),
    fotoCol: findCol([
      'linkfoto',
      'link_foto',
      'linkfotoproperti',
      'linkfotorumah',
      'urlfoto',
      'url_foto',
      'fotolink',
      'fotoproperti',
      'fotorumah',
      'foto',
      'photo',
      'image',
      'gambar',
      'lampiran',
      'lampiranfoto',
      'buktifoto',
      'fotobukti',
      'filefoto',
      'file_foto',
      'photourl',
      'imageurl',
      'drivefoto',
      'gdrive',
      'fotolokasi',
      'fotobangunan',
      'dokumentasi',
      'fotodokumentasi',
      'picture',
    ]),
    catatanCol: findCol(['catatansales', 'catatan', 'remarks', 'keterangan', 'notes', 'catatan_petugas']),
  };
}

/**
 * Sanitasi & Perbaiki Pemetaan Kolom:
 * Memastikan kolom Status Minat tidak keliru menunjuk ke kolom Alasan / Catatan, dan kolom ada di spreadsheet
 */
export function sanitizeMappingWithHeaders(mapping: ColumnMappingConfig | undefined, headers: string[]): ColumnMappingConfig {
  const auto = autoDetectColumns(headers);
  if (!mapping) return auto;

  const result: ColumnMappingConfig = { ...auto, ...mapping };

  // 1. Validasi Status Minat: Cegah kolom alasan/kendala/catatan/foto/sales masuk sebagai status minat
  const curStatus = (result.statusMinatCol || '').toLowerCase();
  const isCurStatusBad =
    curStatus.includes('alasan') ||
    curStatus.includes('reason') ||
    curStatus.includes('kendala') ||
    curStatus.includes('sebab') ||
    curStatus.includes('catatan') ||
    curStatus.includes('foto') ||
    curStatus.includes('telepon') ||
    curStatus.includes('alamat');

  const statusExists = headers.some(
    (h) => h.toLowerCase().replace(/[^a-z0-9]/g, '') === curStatus.replace(/[^a-z0-9]/g, '')
  );

  if (isCurStatusBad || !statusExists || !result.statusMinatCol) {
    result.statusMinatCol = auto.statusMinatCol || result.statusMinatCol;
  }

  // 2. Validasi Alasan Tidak Minat: Jangan sama persis dengan Status Minat
  if (result.alasanCol && result.statusMinatCol && result.alasanCol.toLowerCase() === result.statusMinatCol.toLowerCase()) {
    result.alasanCol = auto.alasanCol || '';
  }

  // 3. Validasi Nama Pelanggan: Jangan tertukar dengan Nama Sales
  const curNama = (result.namaCol || '').toLowerCase();
  if (curNama.includes('sales') || curNama.includes('petugas') || curNama.includes('surveyor')) {
    result.namaCol = auto.namaCol || result.namaCol;
  }

  return result;
}

/**
 * Konversi baris data mentah ke array CustomerSurvey sesuai pemetaan kolom
 */
export function convertRowsToCustomers(
  rows: Record<string, any>[],
  mapping: ColumnMappingConfig,
  defaultZone = 'Zona Tangerang',
  defaultSales = 'Petugas Spreading'
): { customers: CustomerSurvey[]; invalidCount: number } {
  const customers: CustomerSurvey[] = [];
  let invalidCount = 0;

  rows.forEach((row, index) => {
    // Abaikan baris kosong total (seluruh cell kosong/spasi)
    const rowValues = Object.values(row).map((v) => (v !== undefined && v !== null ? String(v).trim() : ''));
    if (rowValues.every((v) => !v)) {
      return;
    }

    // 1. Ambil Nama
    const rawNama = getRowField(row, mapping.namaCol);
    const nama = (rawNama !== undefined ? String(rawNama).trim() : '') || `Pelanggan #${index + 1}`;

    // 2. Ambil Telepon
    const rawTelepon = getRowField(row, mapping.teleponCol);
    const telepon = (rawTelepon !== undefined ? String(rawTelepon).trim() : '') || '-';

    // 3. Ambil Alamat & Komponen Rumah
    let alamat = (getRowField(row, mapping.alamatCol) !== undefined ? String(getRowField(row, mapping.alamatCol)).trim() : '');
    const blok = (getRowField(row, mapping.blokCol) !== undefined ? String(getRowField(row, mapping.blokCol)).trim() : '');
    const noRumah = (getRowField(row, mapping.noRumahCol) !== undefined ? String(getRowField(row, mapping.noRumahCol)).trim() : '');
    const rt = (getRowField(row, mapping.rtCol) !== undefined ? String(getRowField(row, mapping.rtCol)).trim() : '');
    const rw = (getRowField(row, mapping.rwCol) !== undefined ? String(getRowField(row, mapping.rwCol)).trim() : '');
    const desa = (getRowField(row, mapping.desaCol) !== undefined ? String(getRowField(row, mapping.desaCol)).trim() : '');
    const kecamatan = (getRowField(row, mapping.kecamatanCol) !== undefined ? String(getRowField(row, mapping.kecamatanCol)).trim() : '');

    if (!alamat) {
      const parts = [
        blok ? `Blok ${blok}` : '',
        noRumah ? `No. ${noRumah}` : '',
        rt ? `RT ${rt}` : '',
        rw ? `RW ${rw}` : '',
        desa ? `Desa ${desa}` : '',
        kecamatan ? `Kec. ${kecamatan}` : '',
      ].filter(Boolean);
      alamat = parts.length > 0 ? parts.join(', ') : 'Kabupaten Tangerang, Banten';
    }

    // 4. Koordinat
    let coords: { lat: number; lng: number } | null = null;
    const rawLat = getRowField(row, mapping.latCol);
    const rawLng = getRowField(row, mapping.lngCol);
    if (rawLat !== undefined && rawLng !== undefined) {
      coords = normalizeCoordinates(rawLat, rawLng);
    }
    const rawCoords = getRowField(row, mapping.coordsCol);
    if (!coords && rawCoords) {
      coords = parseCombinedCoords(rawCoords);
    }

    // Jika belum ketemu, coba scan kolom untuk mencari koordinat otomatis jika format angka lat/lng
    if (!coords) {
      for (const [key, val] of Object.entries(row)) {
        if (typeof val === 'string' && (val.includes(',') || val.includes(' '))) {
          const parsed = parseCombinedCoords(val);
          if (parsed) {
            coords = parsed;
            break;
          }
        }
      }
    }

    if (!coords) {
      // Fallback coordinate in Tangerang area with slight jitter if no GPS found
      coords = {
        lat: -6.1684 + (Math.random() - 0.5) * 0.04,
        lng: 106.5367 + (Math.random() - 0.5) * 0.04,
      };
      invalidCount++;
    }

    // 5. Status Minat (Cerdas: periksa kolom mapping secara toleran, cegah kolom alasan masuk ke status)
    let colToUse = mapping.statusMinatCol;
    if (colToUse && (colToUse.toLowerCase().includes('alasan') || colToUse.toLowerCase().includes('reason') || colToUse.toLowerCase().includes('kendala'))) {
      colToUse = '';
    }

    let statusMinatRaw = getRowField(row, colToUse);
    
    // Jika kolom statusMinatCol tidak diisi atau bernilai kosong, cari kolom status sebenarnya (tanpa alasan/kendala/catatan)
    if (statusMinatRaw === '' || statusMinatRaw === undefined || statusMinatRaw === null) {
      for (const [k, v] of Object.entries(row)) {
        if (!v && v !== 0) continue;
        const lowerKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isBad =
          lowerKey.includes('alasan') ||
          lowerKey.includes('reason') ||
          lowerKey.includes('kendala') ||
          lowerKey.includes('catatan') ||
          lowerKey.includes('foto') ||
          lowerKey.includes('telepon') ||
          lowerKey.includes('alamat');
        if (isBad) continue;

        if (
          lowerKey === 'statusminat' ||
          lowerKey === 'status' ||
          lowerKey === 'minat' ||
          lowerKey === 'kategoriminat' ||
          lowerKey === 'minattidakminat' ||
          lowerKey === 'hasil' ||
          lowerKey === 'respon' ||
          lowerKey === 'keputusan' ||
          lowerKey.includes('status') ||
          lowerKey.includes('minat')
        ) {
          statusMinatRaw = v;
          break;
        }
      }
    }

    const statusMinat = normalizeInterestStatus(statusMinatRaw);

    // 6. Sales & Wilayah
    const rawSales = getRowField(row, mapping.salesCol);
    const salesNama = (rawSales !== undefined ? String(rawSales).trim() : '') || defaultSales;
    const salesId = `SALES-${salesNama.toLowerCase().replace(/[^a-z0-9]/g, '') || '01'}`;
    const rawZona = getRowField(row, mapping.zonaCol);
    const zonaNama = (rawZona !== undefined ? String(rawZona).trim() : '') || (kecamatan ? `Zona ${kecamatan}` : defaultZone);
    const zonaId = `ZONA-${zonaNama.toLowerCase().replace(/[^a-z0-9]/g, '') || 'TGR'}`;

    // 7. Tanggal & Timestamp
    const tanggalRaw = getRowField(row, mapping.tanggalCol);
    const dateParsed = parseSpreadsheetDate(tanggalRaw);
    const tanggalSpreading = dateParsed.tanggal;
    const timestamp = dateParsed.timestamp;

    // 8. Atribut Tambahan
    const rawJenisArea = getRowField(row, mapping.jenisAreaTargetCol);
    const jenisAreaTarget = (rawJenisArea !== undefined ? String(rawJenisArea).trim() : '') || 'Adhoc';
    const rawAlasan = getRowField(row, mapping.alasanCol);
    let alasan = rawAlasan !== undefined ? String(rawAlasan).trim() : '';
    // Jika status adalah "Minat", hapus teks penolakan lama
    if (statusMinat === 'Minat') {
      alasan = '';
    }

    const rawNoForm = getRowField(row, mapping.noFormCol);
    const noForm = rawNoForm !== undefined ? String(rawNoForm).trim() : `FORM-${index + 101}`;
    
    // Ambil Link / File Foto Properti
    let rawFoto = getRowField(row, mapping.fotoCol);
    let rawFotoStr = rawFoto !== undefined && rawFoto !== null ? String(rawFoto).trim() : '';

    // Cerdas: Jika mapping.fotoCol kosong, scan kolom lain di baris ini untuk mendeteksi link foto otomatis
    if (!rawFotoStr) {
      for (const [k, v] of Object.entries(row)) {
        if (!v) continue;
        const valStr = String(v).trim();
        const lowerK = k.toLowerCase();
        const isPhotoColName =
          lowerK.includes('foto') ||
          lowerK.includes('photo') ||
          lowerK.includes('gambar') ||
          lowerK.includes('image') ||
          lowerK.includes('lampiran') ||
          lowerK.includes('bukti');
        const isUrlPattern =
          /^https?:\/\//i.test(valStr) ||
          valStr.includes('drive.google.com') ||
          valStr.includes('lh3.googleusercontent') ||
          valStr.includes('appsheet.com') ||
          /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(valStr);

        if ((isPhotoColName || isUrlPattern) && !lowerK.includes('sheet') && !lowerK.includes('csv')) {
          rawFotoStr = valStr;
          break;
        }
      }
    }

    // Format dan direct preview URL (Google Drive, Dropbox, AppSheet, Web Image)
    const formattedFoto = formatPhotoUrl(rawFotoStr);
    const rawCatatan = getRowField(row, mapping.catatanCol);
    const catatanSales = rawCatatan !== undefined ? String(rawCatatan).trim() : '';

    // Deteksi kebutuhan debit & jarak jika ada di kolom spreadsheet
    let kebutuhanDebit = 'Rumah Tangga 1';
    for (const [k, v] of Object.entries(row)) {
      const lk = k.toLowerCase();
      if ((lk.includes('debit') || lk.includes('tarif') || lk.includes('golongan')) && v) {
        kebutuhanDebit = String(v).trim();
        break;
      }
    }

    let jarakKePipaMeter = Math.floor(Math.random() * 25) + 5;
    for (const [k, v] of Object.entries(row)) {
      const lk = k.toLowerCase();
      if ((lk.includes('jarak') || lk.includes('distance')) && v) {
        const num = parseFloat(String(v).replace(/[^\d.-]/g, ''));
        if (!isNaN(num)) {
          jarakKePipaMeter = Math.round(num);
          break;
        }
      }
    }

    // Buat ID stabil berdasarkan No Form atau Nama + Index agar sinkronisasi baris yang di-update di spreadsheet langsung menimpa data lama dengan tepat
    const cleanFormKey = noForm ? noForm.replace(/[^a-zA-Z0-9_-]/g, '') : '';
    const cleanNameKey = nama.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
    const stableId = cleanFormKey ? `CUST-${cleanFormKey}` : `CUST-${cleanNameKey || 'ROW'}-${index + 1}`;

    const customer: CustomerSurvey = {
      id: stableId,
      propertyId: `PROP-${cleanFormKey || cleanNameKey || index + 1}`,
      nama,
      telepon,
      alamat,
      blok,
      nomorRumah: noRumah,
      rt,
      rw,
      desa,
      kecamatan,
      latitude: coords.lat,
      longitude: coords.lng,
      statusMinat,
      salesId,
      salesNama,
      zonaId,
      zonaNama,
      tanggalSpreading,
      kebutuhanDebit,
      jarakKePipaMeter,
      jenisAreaTarget: (jenisAreaTarget as any) || 'Adhoc',
      alasanTidakMinat: statusMinat === 'Tidak Minat' ? (alasan || 'Menolak / Masih Menggunakan Sumur') : undefined,
      alasan: statusMinat === 'Tidak Minat' ? alasan : undefined,
      noForm,
      fotoProperti: formattedFoto || undefined,
      fotoRumahUrl: formattedFoto || undefined,
      catatanSales: catatanSales || `[AppSheet Import] Disurvei oleh ${salesNama}`,
      timestamp,
      rawRow: { ...row },
    };

    customers.push(customer);
  });

  return { customers, invalidCount };
}

/**
 * Ringkasan nilai pada kolom Status Minat
 */
export function summarizeStatusMinatColumn(rows: Record<string, any>[], colName: string): { minat: number; tidakMinat: number; sampleValues: string[] } {
  let minat = 0;
  let tidakMinat = 0;
  const samples = new Set<string>();

  rows.forEach((r) => {
    const rawVal = colName && r[colName] !== undefined ? r[colName] : '';
    if (rawVal !== '' && rawVal !== undefined && rawVal !== null) {
      if (samples.size < 6) samples.add(String(rawVal).trim());
    }
    const status = normalizeInterestStatus(rawVal);
    if (status === 'Minat') minat++;
    else tidakMinat++;
  });

  return {
    minat,
    tidakMinat,
    sampleValues: Array.from(samples),
  };
}

/**
 * Parse File Spreadsheet (.xlsx, .xls, .csv)
 */
export async function parseSpreadsheetFile(file: File): Promise<SpreadsheetParsedResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('File spreadsheet tidak memiliki sheet yang dapat dibaca.');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to JSON with header array
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  if (rawRows.length === 0) {
    throw new Error('File spreadsheet kosong atau tidak memuat baris data.');
  }

  const headers = Object.keys(rawRows[0] || {});
  const detectedMapping = autoDetectColumns(headers);
  const { customers, invalidCount } = convertRowsToCustomers(rawRows, detectedMapping);
  const statusSummary = detectedMapping.statusMinatCol ? summarizeStatusMinatColumn(rawRows, detectedMapping.statusMinatCol) : undefined;

  return {
    headers,
    rawRows,
    customers,
    invalidRowsCount: invalidCount,
    totalRows: rawRows.length,
    detectedMapping,
    statusValuesSummary: statusSummary,
  };
}

/**
 * Format link Google Sheets biasa ke URL format CSV export
 */
export function formatGoogleSheetCsvUrl(rawUrl: string): string {
  const url = rawUrl.trim();
  if (!url) return '';

  // Jika sudah link CSV langsung (pub?output=csv atau export?format=csv)
  if (url.includes('output=csv') || url.includes('format=csv')) {
    return url;
  }

  // Jika berupa link Publikasi Web (/pubhtml) -> ubah ke CSV
  if (url.includes('/pubhtml')) {
    return url.replace('/pubhtml', '/pub?output=csv');
  }

  // Pola Google Sheet: https://docs.google.com/spreadsheets/(?:u/\d+/)?d/{SPREADSHEET_ID}/edit#gid={GID}
  const match = url.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    const spreadsheetId = match[1];
    let gid = '0';
    const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
    if (gidMatch && gidMatch[1]) {
      gid = gidMatch[1];
    }
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  }

  // Jika hanya berupa ID spreadsheet murni (panjang 30-60 karakter)
  if (/^[a-zA-Z0-9-_]{30,60}$/.test(url)) {
    return `https://docs.google.com/spreadsheets/d/${url}/export?format=csv&gid=0`;
  }

  return url;
}

/**
 * Fetch dan Parse Data Langsung dari Google Spreadsheet
 * Menggunakan strategi berlapis: Server Proxy -> Google Viz (gviz) -> Direct Fetch -> CORS Fallback
 */
export async function fetchFromGoogleSpreadsheet(url: string, customMapping?: ColumnMappingConfig): Promise<SpreadsheetParsedResult> {
  const cleanUrl = url.trim();
  const csvUrl = formatGoogleSheetCsvUrl(cleanUrl);

  let text = '';
  let lastErrorMessage = '';

  // Ekstrak ID dan GID jika ada untuk fallback gviz
  let spreadsheetId = '';
  let gid = '0';
  const idMatch = cleanUrl.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9-_]+)/);
  if (idMatch && idMatch[1]) {
    spreadsheetId = idMatch[1];
    const gidMatch = cleanUrl.match(/[#&?]gid=([0-9]+)/);
    if (gidMatch && gidMatch[1]) gid = gidMatch[1];
  }

  // STRATEGI 1: Gunakan Server Proxy internal (/api/proxy-sheet)
  // Menghindari 100% batasan CORS browser dan mengambil data real-time via gviz live query di backend
  try {
    const proxyRes = await fetch(`/api/proxy-sheet?url=${encodeURIComponent(cleanUrl)}&_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    if (proxyRes.ok) {
      const candidate = await proxyRes.text();
      if (
        candidate &&
        !candidate.includes('<!DOCTYPE html>') &&
        !candidate.includes('accounts.google.com') &&
        !candidate.includes('Sign in - Google Accounts') &&
        !candidate.includes('ServiceLogin')
      ) {
        text = candidate;
      } else if (candidate.includes('<!DOCTYPE html>') || candidate.includes('accounts.google.com') || candidate.includes('ServiceLogin')) {
        throw new Error(
          'Google Spreadsheet ini terdeteksi masih "Dibatasi" (perlu login Google). Pastikan Akses Umum diset ke "Siapa saja yang memiliki link" dengan peran "Pelihat".'
        );
      }
    } else {
      const errJson = await proxyRes.json().catch(() => null);
      if (errJson && errJson.error) {
        lastErrorMessage = errJson.error;
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('Dibatasi')) {
      throw err;
    }
    lastErrorMessage = err.message || '';
  }

  // STRATEGI 2: Google Visualization API (gviz/tq) langsung dari browser
  // Endpoint resmi Google yang memiliki header CORS publik bawaan & realtime live query
  if (!text && spreadsheetId) {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}&headers=1&tq=&_t=${Date.now()}`;
    try {
      const gvizRes = await fetch(gvizUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (gvizRes.ok) {
        const candidate = await gvizRes.text();
        if (
          candidate &&
          !candidate.includes('<!DOCTYPE html>') &&
          !candidate.includes('accounts.google.com') &&
          !candidate.includes('ServiceLogin')
        ) {
          text = candidate;
        }
      }
    } catch {
      // lanjut ke strategi berikutnya
    }
  }

  // STRATEGI 3: Direct fetch ke format CSV publik
  if (!text) {
    try {
      const sep = csvUrl.includes('?') ? '&' : '?';
      const directUrl = `${csvUrl}${sep}_t=${Date.now()}`;
      const directRes = await fetch(directUrl, {
        cache: 'no-store',
        headers: {
          Accept: 'text/csv, text/plain, */*',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (directRes.ok) {
        const candidate = await directRes.text();
        if (candidate && !candidate.includes('<!DOCTYPE html>') && !candidate.includes('accounts.google.com')) {
          text = candidate;
        }
      }
    } catch {
      // lanjut ke fallback berikutnya
    }
  }

  // STRATEGI 4: CORS Bridge Publik
  if (!text) {
    try {
      const corsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}&_t=${Date.now()}`;
      const corsRes = await fetch(corsUrl, { cache: 'no-store' });
      if (corsRes.ok) {
        const candidate = await corsRes.text();
        if (candidate && !candidate.includes('<!DOCTYPE html>') && !candidate.includes('accounts.google.com')) {
          text = candidate;
        }
      }
    } catch {
      // abaikan
    }
  }

  if (!text || text.trim().length === 0) {
    if (lastErrorMessage) {
      throw new Error(lastErrorMessage);
    }
    throw new Error(
      'Gagal mengambil data dari Google Spreadsheet. Mohon periksa panduan berikut:\n' +
      '1. Pada Google Sheet, klik tombol "Bagikan" di kanan atas.\n' +
      '2. Pada bagian "Akses umum", pastikan telah diubah dari "Dibatasi" menjadi "Siapa saja yang memiliki link" dengan status "Pelihat".\n' +
      '3. Atau gunakan menu File > Bagikan > Publikasikan ke Web > pilih format CSV.\n' +
      '4. Alternatif tercepat: Download sebagai file Excel (.xlsx/.csv) lalu upload di tab "Upload File Excel/CSV".'
    );
  }

  // Parse CSV text menggunakan SheetJS
  const workbook = XLSX.read(text, { type: 'string' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  if (rawRows.length === 0) {
    throw new Error('Tidak ada baris data yang ditemukan pada Google Spreadsheet tersebut.');
  }

  const headers = Object.keys(rawRows[0] || {});
  const auto = autoDetectColumns(headers);
  const mapping = customMapping ? sanitizeMappingWithHeaders(customMapping, headers) : auto;
  const { customers, invalidCount } = convertRowsToCustomers(rawRows, mapping);
  const statusSummary = mapping.statusMinatCol ? summarizeStatusMinatColumn(rawRows, mapping.statusMinatCol) : undefined;

  return {
    headers,
    rawRows,
    customers,
    invalidRowsCount: invalidCount,
    totalRows: rawRows.length,
    detectedMapping: mapping,
    statusValuesSummary: statusSummary,
  };
}

/**
 * LocalStorage Helpers untuk konfigurasi Link Google Spreadsheet
 */
export function getSavedLinkedSpreadsheetConfig(): LinkedSpreadsheetConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LINKED_SHEET);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    // ignore
  }
  return null;
}

export function saveLinkedSpreadsheetConfig(config: LinkedSpreadsheetConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_LINKED_SHEET, JSON.stringify(config));
  } catch (err) {
    console.warn('Gagal menyimpan linked spreadsheet config:', err);
  }
}

export function removeLinkedSpreadsheetConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_LINKED_SHEET);
  } catch (err) {
    // ignore
  }
}

/**
 * Persistent Customer Storage
 */
export function saveCustomersToPersistentStorage(customers: CustomerSurvey[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(customers));
  } catch (err) {
    console.warn('Gagal menyimpan customers ke storage:', err);
  }
}

export function loadCustomersFromPersistentStorage(fallback: CustomerSurvey[]): CustomerSurvey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Gagal memuat customers dari storage:', err);
  }
  return fallback;
}
