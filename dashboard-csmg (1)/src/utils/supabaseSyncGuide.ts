export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- DATABASE SCHEMA: PAM AETRA TANGERANG GIS CUSTOMER SURVEY
-- Supabase (PostgreSQL 15+ dengan ekstensi PostGIS)
-- ========================================================

-- 1. Aktifkan Ekstensi PostGIS untuk analisis spasial GIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM Tipe Status Minat Pelanggan
DO $$ BEGIN
    CREATE TYPE status_minat_enum AS ENUM (
        'Minat',
        'Pertimbangan',
        'Tidak Minat',
        'Di Luar Jaringan'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabel: Zona Area Pelayanan PAM Aetra
CREATE TABLE IF NOT EXISTS public.zona (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(150) NOT NULL,
    kecamatan VARCHAR(100) NOT NULL,
    target_sambungan INT DEFAULT 500,
    status_jaringan VARCHAR(50) DEFAULT 'Jaringan Aktif',
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    batas_polygon GEOMETRY(Polygon, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel: Sales Representative (Spreading Team)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nip VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(150) NOT NULL,
    telepon VARCHAR(30),
    email VARCHAR(100),
    target_bulanan INT DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel: Pelanggan Hasil Spreading (Source: AppSheet / Google Sheets)
CREATE TABLE IF NOT EXISTS public.pelanggan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appsheet_row_id VARCHAR(100) UNIQUE, -- ID unik dari AppSheet (_RowNumber / UniqueId)
    nama VARCHAR(150) NOT NULL,
    alamat TEXT NOT NULL,
    telepon VARCHAR(50),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),          -- Koordinat spasial PostGIS WGS84
    status_minat status_minat_enum NOT NULL DEFAULT 'Pertimbangan',
    kebutuhan_debit VARCHAR(100),         -- Rumah Tangga 1, Niaga, dll.
    alasan TEXT,                         -- Alasan pertimbangan / penolakan
    sales_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    sales_nama VARCHAR(150),
    zona_id UUID REFERENCES public.zona(id) ON DELETE SET NULL,
    zona_nama VARCHAR(150),
    jarak_ke_pipa_meter DOUBLE PRECISION, -- Kalkulasi spasial jarak ke pipa terdekat
    foto_rumah_url TEXT,
    catatan_sales TEXT,
    tanggal_spreading DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel: Layer Pipa Jaringan Distribusi & Transmisi Air
CREATE TABLE IF NOT EXISTS public.pipa_jaringan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_pipa VARCHAR(200) NOT NULL,
    kategori VARCHAR(50) NOT NULL,       -- Transmisi Utama, Distribusi Sekunder, Retikulasi
    diameter VARCHAR(50) NOT NULL,       -- DN 400mm, DN 200mm, dll
    material VARCHAR(50) NOT NULL,       -- HDPE, PVC-O, Ductile Iron
    tekanan_bar NUMERIC(4,2),            -- Tekanan desain (bar)
    status_pipa VARCHAR(50) DEFAULT 'Aktif Operasional',
    tahun_pasang INT,
    geom GEOMETRY(LineString, 4326) NOT NULL, -- Garis pipa PostGIS
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SPATIAL & PERFORMANCE INDEXING
CREATE INDEX IF NOT EXISTS idx_pelanggan_geom ON public.pelanggan USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_pelanggan_status ON public.pelanggan(status_minat);
CREATE INDEX IF NOT EXISTS idx_pelanggan_tanggal ON public.pelanggan(tanggal_spreading);
CREATE INDEX IF NOT EXISTS idx_pelanggan_sales ON public.pelanggan(sales_id);
CREATE INDEX IF NOT EXISTS idx_pelanggan_zona ON public.pelanggan(zona_id);
CREATE INDEX IF NOT EXISTS idx_pipa_geom ON public.pipa_jaringan USING GIST(geom);

-- 8. TRIGGER: Otomatis Menghasilkan Titik Geometri PostGIS dari Lat/Lng
CREATE OR REPLACE FUNCTION public.fn_sync_pelanggan_geom()
RETURNS TRIGGER AS $$
BEGIN
    -- Sinkronisasi field geom PostGIS (EPSG:4326) dari latitude & longitude
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;

    -- Hitung otomatis jarak ke pipa terdekat jika data pipa ada
    BEGIN
        SELECT ROUND(ST_Distance(NEW.geom::geography, p.geom::geography)::numeric, 2)
        INTO NEW.jarak_ke_pipa_meter
        FROM public.pipa_jaringan p
        ORDER BY NEW.geom <-> p.geom
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        -- Lewati jika tabel pipa belum memiliki data
        NEW.jarak_ke_pipa_meter := NEW.jarak_ke_pipa_meter;
    END;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_pelanggan_geom ON public.pelanggan;
CREATE TRIGGER trg_sync_pelanggan_geom
BEFORE INSERT OR UPDATE ON public.pelanggan
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_pelanggan_geom();

-- 9. VIEW: Analisis Ringkasan Konversi per Sales
CREATE OR REPLACE VIEW public.v_sales_analytics AS
SELECT 
    s.id AS sales_id,
    s.nama AS sales_nama,
    s.nip,
    COUNT(p.id) AS total_spreading,
    COUNT(p.id) FILTER (WHERE p.status_minat = 'Minat') AS total_minat,
    COUNT(p.id) FILTER (WHERE p.status_minat = 'Pertimbangan') AS total_pertimbangan,
    COUNT(p.id) FILTER (WHERE p.status_minat = 'Tidak Minat') AS total_tidak_minat,
    COUNT(p.id) FILTER (WHERE p.status_minat = 'Di Luar Jaringan') AS total_di_luar_jaringan,
    ROUND(
        (COUNT(p.id) FILTER (WHERE p.status_minat = 'Minat')::numeric / 
        NULLIF(COUNT(p.id), 0)::numeric) * 100, 1
    ) AS konversi_rate_persen
FROM public.sales s
LEFT JOIN public.pelanggan p ON s.id = p.sales_id
GROUP BY s.id, s.nama, s.nip;

-- 10. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.pelanggan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zona ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipa_jaringan ENABLE ROW LEVEL SECURITY;

-- Kebijakan baca publik untuk dashboard web (anon key)
CREATE POLICY "Allow public read access to pelanggan" ON public.pelanggan FOR SELECT USING (true);
CREATE POLICY "Allow anon insert from AppSheet webhook" ON public.pelanggan FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update" ON public.pelanggan FOR UPDATE USING (true);
CREATE POLICY "Allow public read access to sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Allow public read access to zona" ON public.zona FOR SELECT USING (true);
CREATE POLICY "Allow public read access to pipa_jaringan" ON public.pipa_jaringan FOR SELECT USING (true);
`;

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: AUTO-SYNC DARI GOOGLE SHEETS (APPSHEET) KE SUPABASE
 * PAM AETRA TANGERANG - GIS MAPPING
 * =========================================================================
 * 
 * CARA PEMASANGAN:
 * 1. Buka spreadsheet Google Sheets yang menjadi data source AppSheet Sales Anda.
 * 2. Klik menu 'Extensions' (Ekstensi) > 'Apps Script'.
 * 3. Hapus kode default, lalu Paste seluruh kode di bawah ini.
 * 4. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di bagian konfigurasi.
 * 5. Klik menu Triggers (Ikon Jam di bilah kiri) > '+ Add Trigger':
 *    - Choose which function to run: 'onFormSubmitOrEdit'
 *    - Select event source: 'From spreadsheet'
 *    - Select event type: 'On form submit' atau 'On change' (untuk AppSheet sync).
 */

const SUPABASE_CONFIG = {
  url: "https://xyzcompany.supabase.co", // Ganti dengan Supabase Project URL Anda
  anonKey: "eyJhbGciOi...",              // Ganti dengan Supabase Anon Key Anda
  tableName: "pelanggan"
};

/**
 * Trigger saat AppSheet menambahkan baris baru ke Google Sheets
 */
function onFormSubmitOrEdit(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Pastikan membaca sheet yang sesuai (misal: 'Survei_Pelanggan' atau 'Sheet1')
  const sheetName = sheet.getName();
  if (sheetName !== "Survei_Pelanggan" && sheetName !== "Sheet1") {
    Logger.log("Bukan sheet target: " + sheetName);
    return;
  }

  // Ambil baris terakhir yang terisi
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return; // Hanya header

  syncRowToSupabase(sheet, lastRow);
}

/**
 * Mengirim data 1 baris pelanggan ke Supabase REST API
 */
function syncRowToSupabase(sheet, rowNumber) {
  // Ambil data header (Baris 1) dan data baris target
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowValues = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Buat objek mapping kolom
  const rowData = {};
  headers.forEach((h, index) => {
    rowData[String(h).trim().toLowerCase()] = rowValues[index];
  });

  // Parse Koordinat Lat & Lng (Bisa berupa 1 kolom LatLong AppSheet misal: '-6.1152, 106.5741')
  let lat = null;
  let lng = null;

  if (rowData['latlong'] || rowData['koordinat'] || rowData['lokasi']) {
    const rawCoord = String(rowData['latlong'] || rowData['koordinat'] || rowData['lokasi']).split(',');
    if (rawCoord.length >= 2) {
      lat = parseFloat(rawCoord[0].trim());
      lng = parseFloat(rawCoord[1].trim());
    }
  } else {
    lat = parseFloat(rowData['latitude'] || rowData['lat']);
    lng = parseFloat(rowData['longitude'] || rowData['lng'] || rowData['long']);
  }

  if (isNaN(lat) || isNaN(lng)) {
    Logger.log("Koordinat tidak valid pada baris " + rowNumber);
    return;
  }

  // Normalisasi Status Minat
  let rawStatus = String(rowData['status minat'] || rowData['status'] || 'Pertimbangan').trim();
  let statusMinat = 'Pertimbangan';
  if (/minat/i.test(rawStatus) && !/tidak|bukan/i.test(rawStatus)) {
    statusMinat = 'Minat';
  } else if (/tidak|batal|tolak/i.test(rawStatus)) {
    statusMinat = 'Tidak Minat';
  } else if (/luar|uncovered/i.test(rawStatus)) {
    statusMinat = 'Di Luar Jaringan';
  }

  // Payload data untuk tabel pelanggan di Supabase
  const payload = {
    appsheet_row_id: String(rowData['id'] || rowData['_rownumber'] || 'ROW-' + rowNumber),
    nama: String(rowData['nama'] || rowData['nama pelanggan'] || 'Pelanggan #' + rowNumber),
    alamat: String(rowData['alamat'] || rowData['alamat lengkap'] || '-'),
    telepon: String(rowData['telepon'] || rowData['no hp'] || rowData['whatsapp'] || '-'),
    latitude: lat,
    longitude: lng,
    status_minat: statusMinat,
    kebutuhan_debit: String(rowData['kebutuhan debit'] || rowData['tipe pelanggan'] || 'Rumah Tangga'),
    alasan: String(rowData['alasan'] || rowData['catatan'] || ''),
    sales_nama: String(rowData['sales'] || rowData['nama sales'] || 'Sales Lapangan'),
    zona_nama: String(rowData['zona'] || rowData['wilayah'] || 'Tangerang'),
    tanggal_spreading: rowData['tanggal'] instanceof Date 
      ? Utilities.formatDate(rowData['tanggal'], Session.getScriptTimeZone(), "yyyy-MM-dd")
      : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
    catatan_sales: String(rowData['catatan sales'] || '')
  };

  const endpoint = SUPABASE_CONFIG.url + "/rest/v1/" + SUPABASE_CONFIG.tableName;

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "apikey": SUPABASE_CONFIG.anonKey,
      "Authorization": "Bearer " + SUPABASE_CONFIG.anonKey,
      "Prefer": "resolution=merge-duplicates" // Upsert jika ID sama
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(endpoint, options);
    const code = response.getResponseCode();
    Logger.log("Supabase response [" + code + "]: " + response.getContentText());
    
    // Beri tanda sukses di kolom status sync spreadsheet jika kolom tersedia
    const statusColIndex = headers.findIndex(h => /sync|supabase/i.test(h)) + 1;
    if (statusColIndex > 0) {
      sheet.getRange(rowNumber, statusColIndex).setValue(code >= 200 && code < 300 ? "SYNCED" : "ERROR " + code);
    }
  } catch (err) {
    Logger.log("Gagal sync ke Supabase: " + err.toString());
  }
}

/**
 * Fungsi Utility: Sinkronkan seluruh data historis yang sudah ada di Sheets ke Supabase
 */
function syncAllExistingRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  Logger.log("Mulai sinkronisasi massal " + (lastRow - 1) + " baris data...");
  for (let r = 2; r <= lastRow; r++) {
    syncRowToSupabase(sheet, r);
    Utilities.sleep(200); // Hindari rate limit
  }
  Logger.log("Sinkronisasi massal selesai!");
}
`;

export const APPSHEET_WEBHOOK_GUIDE = `### Integrasi Langsung AppSheet Webhook Task (Tanpa Google Apps Script)
Selain Google Apps Script di Sheets, AppSheet memiliki fitur Automation Bot bawaan untuk langsung memanggil Supabase REST API:

1. Di Dashboard AppSheet, masuk ke menu **Automation** > **Bots** > **Create New Bot**.
2. Set Event: **Data Change** > **Adds and Updates** pada tabel \`Survei_Pelanggan\`.
3. Tambahkan Step: **Run a Task** > Pilih task type **Call a Webhook**.
4. Pengaturan Webhook Task:
   - **URL**: \`https://<YOUR_PROJECT_REF>.supabase.co/rest/v1/pelanggan\`
   - **HTTP Method**: \`POST\`
   - **HTTP Headers**:
     * \`apikey\`: \`<YOUR_SUPABASE_ANON_KEY>\`
     * \`Authorization\`: \`Bearer <YOUR_SUPABASE_ANON_KEY>\`
     * \`Content-Type\`: \`application/json\`
     * \`Prefer\`: \`resolution=merge-duplicates\`
   - **Body Template (JSON)**:
\`\`\`json
{
  "appsheet_row_id": "<<[_RowNumber]>>",
  "nama": "<<[Nama_Pelanggan]>>",
  "alamat": "<<[Alamat]>>",
  "telepon": "<<[No_WhatsApp]>>",
  "latitude": <<LAT(LATLONG([Koordinat]))>>,
  "longitude": <<LONG(LATLONG([Koordinat]))>>,
  "status_minat": "<<[Status_Minat]>>",
  "sales_nama": "<<[Sales_Name]>>",
  "zona_nama": "<<[Zona_Area]>>",
  "tanggal_spreading": "<<[Tanggal_Spreading]>>"
}
\`\`\`
5. Simpan dan Save Bot. Setiap sales menekan tombol **Save** di AppSheet mobile, data seketika masuk ke Supabase PostGIS!`;

export const VERCEL_DEPLOYMENT_GUIDE = `### Panduan Deployment Dashboard ke GitHub & Vercel

#### Langkah 1: Push Code ke GitHub Repository
\`\`\`bash
# Inisialisasi Git dan Push ke Repository Baru
git init
git add .
git commit -m "feat: GIS Dashboard PAM Aetra Tangerang with Google Satellite & Pipe Layer"
git branch -M main
git remote add origin https://github.com/USERNAME/pam-aetra-gis-dashboard.git
git push -u origin main
\`\`\`

#### Langkah 2: Deploy ke Vercel
1. Masuk ke [vercel.com](https://vercel.com) dan login dengan akun GitHub Anda.
2. Klik tombol **Add New...** > **Project**.
3. Pilih repository \`pam-aetra-gis-dashboard\` yang baru dipush.
4. Pada menu **Configure Project**:
   - Framework Preset: **Vite** (atau **Next.js** jika menggunakan App Router)
   - Root Directory: \`./\`
5. Tambahkan **Environment Variables**:
   - \`VITE_SUPABASE_URL\`: \`https://YOUR_PROJECT_ID.supabase.co\`
   - \`VITE_SUPABASE_ANON_KEY\`: \`eyJh... (Kunci Anon Supabase Anda)\`
6. Klik **Deploy**. Dalam waktu ~1 menit, aplikasi GIS PAM Aetra sudah online dengan domain SSL gratis: \`https://pam-aetra-gis.vercel.app\`.
`;
