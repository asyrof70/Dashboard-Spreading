import React, { useState, useEffect, useRef } from 'react';
import { CustomerSurvey } from '../types/gis';
import {
  parseSpreadsheetFile,
  fetchFromGoogleSpreadsheet,
  autoDetectColumns,
  convertRowsToCustomers,
  summarizeStatusMinatColumn,
  ColumnMappingConfig,
  LinkedSpreadsheetConfig,
  getSavedLinkedSpreadsheetConfig,
  saveLinkedSpreadsheetConfig,
  removeLinkedSpreadsheetConfig,
} from '../utils/spreadsheetParser';
import {
  FileSpreadsheet,
  Upload,
  Link2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Database,
  Sliders,
  Sparkles,
  ExternalLink,
  HelpCircle,
  Trash2,
  Clock,
  Layers,
  ChevronRight,
  ChevronDown,
  Info,
  Check,
  MapPin,
  Users,
  Calendar,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface SpreadsheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCustomers: (importedCustomers: CustomerSurvey[], mode: 'append' | 'replace') => void;
  currentCustomerCount: number;
  onSyncComplete?: (count: number) => void;
  theme?: 'light' | 'dark';
}

export const SpreadsheetSyncModal: React.FC<SpreadsheetSyncModalProps> = ({
  isOpen,
  onClose,
  onImportCustomers,
  currentCustomerCount,
  onSyncComplete,
  theme = 'light',
}) => {
  const isLight = theme === 'light';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'upload' | 'link' | 'template'>('upload');

  // 1. File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileRawRows, setFileRawRows] = useState<Record<string, any>[]>([]);
  const [previewCustomers, setPreviewCustomers] = useState<CustomerSurvey[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMappingConfig>({
    namaCol: '',
    teleponCol: '',
    alamatCol: '',
    latCol: '',
    lngCol: '',
    coordsCol: '',
    statusMinatCol: '',
    salesCol: '',
    tanggalCol: '',
    zonaCol: '',
    blokCol: '',
    noRumahCol: '',
    rtCol: '',
    rwCol: '',
    desaCol: '',
    kecamatanCol: '',
    jenisAreaTargetCol: '',
    alasanCol: '',
    noFormCol: '',
    fotoCol: '',
    catatanCol: '',
  });
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [showDetailFields, setShowDetailFields] = useState<boolean>(false);

  // 2. Google Spreadsheet Link State
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [isSyncingLive, setIsSyncingLive] = useState<boolean>(false);
  const [isTestingSheet, setIsTestingSheet] = useState<boolean>(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState<number>(1); // 1 minute default untuk sinkronisasi realtime
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(true);
  const [linkedConfig, setLinkedConfig] = useState<LinkedSpreadsheetConfig | null>(null);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [sheetRawRows, setSheetRawRows] = useState<Record<string, any>[]>([]);
  const [sheetPreviewCustomers, setSheetPreviewCustomers] = useState<CustomerSurvey[]>([]);
  const [sheetColumnMapping, setSheetColumnMapping] = useState<ColumnMappingConfig>({
    namaCol: '',
    teleponCol: '',
    alamatCol: '',
    latCol: '',
    lngCol: '',
    coordsCol: '',
    statusMinatCol: '',
    salesCol: '',
    tanggalCol: '',
    zonaCol: '',
    blokCol: '',
    noRumahCol: '',
    rtCol: '',
    rwCol: '',
    desaCol: '',
    kecamatanCol: '',
    jenisAreaTargetCol: '',
    alasanCol: '',
    noFormCol: '',
    fotoCol: '',
    catatanCol: '',
  });

  // Feedback Messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showGuideAccordion, setShowGuideAccordion] = useState<boolean>(false);

  // Load saved config on mount / open
  useEffect(() => {
    if (isOpen) {
      const saved = getSavedLinkedSpreadsheetConfig();
      if (saved) {
        setLinkedConfig(saved);
        setSheetUrl(saved.url);
        setIsAutoSyncEnabled(saved.autoSync);
        setAutoSyncInterval(saved.intervalMinutes || 3);
        if (saved.mapping) {
          setSheetColumnMapping(saved.mapping);
        }
      }
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Local File Selection (.xlsx, .xls, .csv)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setSelectedFile(file);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsProcessingFile(true);

    try {
      const result = await parseSpreadsheetFile(file);
      setFileHeaders(result.headers);
      setFileRawRows(result.rawRows);
      setColumnMapping(result.detectedMapping);
      setPreviewCustomers(result.customers);

      const minatCount = result.customers.filter((c) => c.statusMinat === 'Minat').length;
      const tidakMinatCount = result.customers.filter((c) => c.statusMinat === 'Tidak Minat').length;

      setSuccessMessage(
        `✓ File "${file.name}" berhasil dianalisis: Terdeteksi ${result.totalRows} baris data spreading (${minatCount} Minat, ${tidakMinatCount} Tidak Minat).`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membaca file spreadsheet. Pastikan file berformat Excel (.xlsx, .xls) atau CSV yang valid.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Re-apply mapping for file upload
  const handleFileMappingChange = (key: keyof ColumnMappingConfig, value: string) => {
    const updated = { ...columnMapping, [key]: value };
    setColumnMapping(updated);
    if (fileRawRows.length > 0) {
      const { customers } = convertRowsToCustomers(fileRawRows, updated);
      setPreviewCustomers(customers);
    }
  };

  // Reset file mapping to auto-detect
  const handleResetFileAutoDetect = () => {
    if (fileHeaders.length > 0) {
      const auto = autoDetectColumns(fileHeaders);
      setColumnMapping(auto);
      if (fileRawRows.length > 0) {
        const { customers } = convertRowsToCustomers(fileRawRows, auto);
        setPreviewCustomers(customers);
      }
      setSuccessMessage('✓ Kolom berhasil dideteksi otomatis berdasarkan format standar AppSheet.');
    }
  };

  // Execute File Import
  const handleExecuteImport = () => {
    if (previewCustomers.length === 0) {
      setErrorMessage('Tidak ada data pelanggan yang valid untuk diimpor.');
      return;
    }

    onImportCustomers(previewCustomers, importMode);
    setSuccessMessage(
      `🎉 Berhasil mengimpor ${previewCustomers.length} data survei spreading ke dashboard (${importMode === 'replace' ? 'Mengganti seluruh data lama' : 'Menambahkan ke data yang ada'}).`
    );

    setTimeout(() => {
      onClose();
    }, 600);
  };

  // Test & Read Google Spreadsheet Columns
  const handleTestGoogleSheet = async () => {
    if (!sheetUrl.trim()) {
      setErrorMessage('Silakan masukkan URL Google Spreadsheet atau Link CSV terlebih dahulu.');
      return;
    }

    setIsTestingSheet(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await fetchFromGoogleSpreadsheet(sheetUrl);
      if (result.customers.length === 0) {
        throw new Error('Tidak ditemukan baris data pada Google Spreadsheet tersebut.');
      }

      setSheetHeaders(result.headers);
      setSheetRawRows(result.rawRows);
      setSheetColumnMapping(result.detectedMapping);
      setSheetPreviewCustomers(result.customers);

      const minatCount = result.customers.filter((c) => c.statusMinat === 'Minat').length;
      const tidakMinatCount = result.customers.filter((c) => c.statusMinat === 'Tidak Minat').length;

      setSuccessMessage(
        `✓ Berhasil terhubung ke Google Spreadsheet: Terbaca ${result.totalRows} baris (${minatCount} Minat, ${tidakMinatCount} Tidak Minat). Anda dapat menyesuaikan nama kolom di bawah sebelum menyinkronkan.`
      );
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Gagal menyinkronkan data dari Google Spreadsheet. Pastikan link Google Sheet diset ke "Siapa saja yang memiliki link dapat melihat" atau gunakan File > Bagikan > Publikasikan ke Web > CSV.'
      );
    } finally {
      setIsTestingSheet(false);
    }
  };

  // Re-apply mapping for Google Sheet
  const handleSheetMappingChange = (key: keyof ColumnMappingConfig, value: string) => {
    const updated = { ...sheetColumnMapping, [key]: value };
    setSheetColumnMapping(updated);
    if (sheetRawRows.length > 0) {
      const { customers } = convertRowsToCustomers(sheetRawRows, updated);
      setSheetPreviewCustomers(customers);
    }
  };

  // Reset Google Sheet mapping to auto-detect
  const handleResetSheetAutoDetect = () => {
    if (sheetHeaders.length > 0) {
      const auto = autoDetectColumns(sheetHeaders);
      setSheetColumnMapping(auto);
      if (sheetRawRows.length > 0) {
        const { customers } = convertRowsToCustomers(sheetRawRows, auto);
        setSheetPreviewCustomers(customers);
      }
      setSuccessMessage('✓ Kolom Google Spreadsheet berhasil dideteksi otomatis.');
    }
  };

  // Save Link Google Sheet & Sync to Dashboard
  const handleSaveAndSyncGoogleSheet = async () => {
    if (!sheetUrl.trim()) {
      setErrorMessage('Silakan masukkan URL Google Spreadsheet terlebih dahulu.');
      return;
    }

    setIsSyncingLive(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await fetchFromGoogleSpreadsheet(sheetUrl, sheetColumnMapping);
      if (result.customers.length === 0) {
        throw new Error('Tidak ditemukan data baris pelanggan pada Google Spreadsheet tersebut.');
      }

      const newConfig: LinkedSpreadsheetConfig = {
        url: sheetUrl.trim(),
        autoSync: isAutoSyncEnabled,
        intervalMinutes: autoSyncInterval,
        lastSyncedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        lastSyncTimestamp: Date.now(),
        lastSyncedCount: result.customers.length,
        mapping: sheetColumnMapping,
      };

      saveLinkedSpreadsheetConfig(newConfig);
      setLinkedConfig(newConfig);

      // Import to dashboard
      onImportCustomers(result.customers, 'replace');
      if (onSyncComplete) {
        onSyncComplete(result.customers.length);
      }

      setSuccessMessage(
        `⚡ Sinkronisasi Sukses: Berhasil menyimpan link dan menarik ${result.customers.length} data spreading realtime dari Google Sheets AppSheet!`
      );

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Gagal menyimpan dan menyinkronkan Google Spreadsheet.'
      );
    } finally {
      setIsSyncingLive(false);
    }
  };

  // Unlink Google Sheet
  const handleUnlinkSheet = () => {
    removeLinkedSpreadsheetConfig();
    setLinkedConfig(null);
    setSheetUrl('');
    setSheetHeaders([]);
    setSheetRawRows([]);
    setSheetPreviewCustomers([]);
    setSuccessMessage('Tautan Google Spreadsheet berhasil diputus.');
  };

  // Download Sample Template CSV
  const handleDownloadSampleCsv = () => {
    const csvHeader = 'Timestamp,No Form,Nama Calon Pelanggan,No Telepon,Alamat Lengkap,Blok,No Rumah,RT,RW,Desa,Kecamatan,Latitude,Longitude,Jenis Area Target,Status Minat,Alasan Tidak Minat,Nama Sales,Zona Pelayanan,Link Foto Properti,Catatan Sales\n';
    const sampleRows = [
      '2026-09-30 09:15:00,FORM-001,Bpk. H. Sudirman,0812-8877-6655,Jl. Raya Sepatan No. 12,A,12,02,04,Sepatan,Sepatan,-6.1152,106.5741,CAPEX,Minat,,Bustomi (Sales 01),Zona Sepatan,https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800,Minat sambungan baru paket RT1',
      '2026-09-30 09:45:00,FORM-002,Ibu Hj. Aminah,0813-9988-1122,Jl. Raya Rajeg Mulya RT 03/02,B,05,03,02,Rajeg Mulya,Rajeg,-6.1384,106.5123,Adhoc,Tidak Minat,Masih menggunakan air sumur bor jet pump,Imam (Sales 02),Zona Rajeg,https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800,Kondisi air sumur saat ini masih cukup',
      '2026-09-30 10:20:00,FORM-003,Bpk. Dedi Kurniawan,0857-1122-3344,Perumahan Sindang Jaya Blok C2 No 8,C2,08,01,05,Sindang Asih,Sindang Jaya,-6.1921,106.4892,CAPEX,Minat,,Asep (Sales 03),Zona Sindang Jaya,https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800,Minta jadwal survey pipa sambungan depan rumah',
      '2026-09-30 11:00:00,FORM-004,Bpk. Hendra Wijaya,0812-3344-5566,Perum Graha Pasir Barat Blok F3 No 15,F3,15,04,01,Pasir Barat,Jambe,-6.2612,106.4812,Adhoc,Tidak Berminat,Tarif air PDAM dinilai masih mahal,Deni (Sales 04),Zona Jambe,https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800,Menolak pemasangan baru',
    ].join('\n');

    const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_spreading_appsheet_aetra.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper untuk merender formulir pemetaan kolom
  const renderMappingForm = (
    headers: string[],
    mapping: ColumnMappingConfig,
    onChange: (key: keyof ColumnMappingConfig, val: string) => void,
    onResetAuto: () => void,
    rawRows: Record<string, any>[]
  ) => {
    const statusSummary = mapping.statusMinatCol ? summarizeStatusMinatColumn(rawRows, mapping.statusMinatCol) : null;

    return (
      <div className={`p-4 rounded-xl border space-y-4 ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/80 border-slate-800'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#005baa]" />
            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Penyesuaian Pemetaan Nama Kolom (Otomatis &amp; Manual)
            </span>
          </div>

          <button
            type="button"
            onClick={onResetAuto}
            className="px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-[#005baa] dark:bg-sky-950 dark:text-sky-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
            title="Deteksi ulang nama kolom secara otomatis"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Deteksi Otomatis (Smart Auto-Detect)</span>
          </button>
        </div>

        {/* Highlight Banner Status Minat */}
        {statusSummary && (
          <div className={`p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-xs ${
            isLight ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-amber-950/30 border-amber-900 text-amber-200'
          }`}>
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span>Kolom Status Minat: [{mapping.statusMinatCol}]</span>
            </div>
            <div className="flex items-center gap-3 font-mono font-bold text-[11px]">
              <span className="text-emerald-700 dark:text-emerald-400">Minat: {statusSummary.minat}</span>
              <span className="text-rose-700 dark:text-rose-400">Tidak Minat: {statusSummary.tidakMinat}</span>
              {statusSummary.sampleValues.length > 0 && (
                <span className="text-slate-500 font-normal text-[10px]">
                  (Contoh isi: &quot;{statusSummary.sampleValues.slice(0, 3).join('", "')}&quot;)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Grid Form Pemetaan Kolom Utama */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {/* 1. Status Minat */}
          <div className={`p-2.5 rounded-lg border ${mapping.statusMinatCol ? 'border-[#005baa]/50 bg-blue-50/40 dark:bg-sky-950/30' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-extrabold text-[#005baa] dark:text-sky-300">
                🏷️ Status Minat: <span className="text-rose-500">*</span>
              </label>
              {mapping.statusMinatCol ? (
                <span className="text-[10px] text-emerald-600 font-bold">✓ Terhubung</span>
              ) : (
                <span className="text-[10px] text-slate-400 italic">(Tidak Digunakan)</span>
              )}
            </div>
            <select
              value={mapping.statusMinatCol}
              onChange={(e) => onChange('statusMinatCol', e.target.value)}
              className="w-full border rounded-lg p-1.5 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-[#005baa]"
            >
              <option value="">-- (Tidak Digunakan / Kosongkan) --</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Kolom berisi Minat, Tidak Minat, Berminat, Tolak, TM, dll.
            </p>
          </div>

          {/* 2. Nama Pelanggan */}
          <div className={`p-2.5 rounded-lg border ${mapping.namaCol ? 'border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                👤 Nama Pelanggan:
              </label>
              {mapping.namaCol ? (
                <span className="text-[10px] text-emerald-600 font-bold">✓ Terhubung</span>
              ) : (
                <span className="text-[10px] text-slate-400 italic">(Tidak Digunakan)</span>
              )}
            </div>
            <select
              value={mapping.namaCol}
              onChange={(e) => onChange('namaCol', e.target.value)}
              className="w-full border rounded-lg p-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              <option value="">-- (Tidak Digunakan / Kosongkan) --</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* 3. Nomor Telepon / WA */}
          <div className={`p-2.5 rounded-lg border ${mapping.teleponCol ? 'border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                📞 No Telepon / HP:
              </label>
              {mapping.teleponCol ? (
                <span className="text-[10px] text-emerald-600 font-bold">✓ Terhubung</span>
              ) : (
                <span className="text-[10px] text-slate-400 italic">(Tidak Digunakan)</span>
              )}
            </div>
            <select
              value={mapping.teleponCol}
              onChange={(e) => onChange('teleponCol', e.target.value)}
              className="w-full border rounded-lg p-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              <option value="">-- (Tidak Digunakan / Kosongkan) --</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* 4. Latitude */}
          <div className={`p-2.5 rounded-lg border ${mapping.latCol ? 'border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                📍 Latitude (Lintang ~ -6.x):
              </label>
              {mapping.latCol ? (
                <span className="text-[10px] text-emerald-600 font-bold">✓ Terhubung</span>
              ) : (
                <span className="text-[10px] text-slate-400 italic">(Tidak Digunakan)</span>
              )}
            </div>
            <select
              value={mapping.latCol}
              onChange={(e) => onChange('latCol', e.target.value)}
              className="w-full border rounded-lg p-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              <option value="">-- (Tidak Digunakan / Kosongkan) --</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* 5. Longitude */}
          <div className={`p-2.5 rounded-lg border ${mapping.lngCol ? 'border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                📍 Longitude (Bujur ~ 106.x):
              </label>
              {mapping.lngCol ? (
                <span className="text-[10px] text-emerald-600 font-bold">✓ Terhubung</span>
              ) : (
                <span className="text-[10px] text-slate-400 italic">(Tidak Digunakan)</span>
              )}
            </div>
            <select
              value={mapping.lngCol}
              onChange={(e) => onChange('lngCol', e.target.value)}
              className="w-full border rounded-lg p-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              <option value="">-- (Tidak Digunakan / Kosongkan) --</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* 6. Kolom Gabungan Koordinat Lat, Lng */}
          <div className={`p-2.5 rounded-lg border ${mapping.coordsCol ? 'border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                📌 Atau Kolom Gabungan GPS:
              </label>
              {mapping.coordsCol ? (
                <span className="text-[10px] text-emerald-600 font-bold">✓ Terhubung</span>
              ) : (
                <span className="text-[10px] text-slate-400 italic">(Tidak Digunakan)</span>
              )}
            </div>
            <select
              value={mapping.coordsCol || ''}
              onChange={(e) => onChange('coordsCol', e.target.value)}
              className="w-full border rounded-lg p-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              <option value="">-- (Tidak Digunakan / Kosongkan) --</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* 7. Alamat Lengkap */}
          <div className={`p-2.5 rounded-lg border ${mapping.alamatCol ? 'border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                🏠 Alamat Lengkap:
              </label>
              {mapping.alamatCol ? (
                <span className="text-[10px] text-emerald-600 font-bold">✓ Terhubung</span>
              ) : (
                <span className="text-[10px] text-slate-400 italic">(Tidak Digunakan)</span>
              )}
            </div>
            <select
              value={mapping.alamatCol}
              onChange={(e) => onChange('alamatCol', e.target.value)}
              className="w-full border rounded-lg p-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              <option value="">-- (Tidak Digunakan / Kosongkan) --</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* 8. Nama Sales / Surveyor */}
          <div className={`p-2.5 rounded-lg border ${mapping.salesCol ? 'border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                💼 Nama Sales / Petugas:
              </label>
              {mapping.salesCol ? (
                <span className="text-[10px] text-emerald-600 font-bold">✓ Terhubung</span>
              ) : (
                <span className="text-[10px] text-slate-400 italic">(Tidak Digunakan)</span>
              )}
            </div>
            <select
              value={mapping.salesCol}
              onChange={(e) => onChange('salesCol', e.target.value)}
              className="w-full border rounded-lg p-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              <option value="">-- (Tidak Digunakan / Kosongkan) --</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* 9. Tanggal / Waktu Spreading */}
          <div className={`p-2.5 rounded-lg border ${mapping.tanggalCol ? 'border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                📅 Tanggal / Waktu Spreading:
              </label>
              {mapping.tanggalCol ? (
                <span className="text-[10px] text-emerald-600 font-bold">✓ Terhubung</span>
              ) : (
                <span className="text-[10px] text-slate-400 italic">(Tidak Digunakan)</span>
              )}
            </div>
            <select
              value={mapping.tanggalCol}
              onChange={(e) => onChange('tanggalCol', e.target.value)}
              className="w-full border rounded-lg p-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              <option value="">-- (Tidak Digunakan / Kosongkan) --</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* 10. Zona Pelayanan */}
          <div className={`p-2.5 rounded-lg border ${mapping.zonaCol ? 'border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                🗺️ Zona Pelayanan / Kecamatan:
              </label>
              {mapping.zonaCol ? (
                <span className="text-[10px] text-emerald-600 font-bold">✓ Terhubung</span>
              ) : (
                <span className="text-[10px] text-slate-400 italic">(Tidak Digunakan)</span>
              )}
            </div>
            <select
              value={mapping.zonaCol || ''}
              onChange={(e) => onChange('zonaCol', e.target.value)}
              className="w-full border rounded-lg p-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              <option value="">-- (Tidak Digunakan / Kosongkan) --</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* 11. Alasan Tidak Minat */}
          <div className={`p-2.5 rounded-lg border ${mapping.alasanCol ? 'border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                ❌ Alasan Tidak Minat:
              </label>
              {mapping.alasanCol ? (
                <span className="text-[10px] text-emerald-600 font-bold">✓ Terhubung</span>
              ) : (
                <span className="text-[10px] text-slate-400 italic">(Tidak Digunakan)</span>
              )}
            </div>
            <select
              value={mapping.alasanCol || ''}
              onChange={(e) => onChange('alasanCol', e.target.value)}
              className="w-full border rounded-lg p-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              <option value="">-- (Tidak Digunakan / Kosongkan) --</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* 12. No Form / Tiket */}
          <div className={`p-2.5 rounded-lg border ${mapping.noFormCol ? 'border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                📄 No Form / Tiket Survei:
              </label>
              {mapping.noFormCol ? (
                <span className="text-[10px] text-emerald-600 font-bold">✓ Terhubung</span>
              ) : (
                <span className="text-[10px] text-slate-400 italic">(Tidak Digunakan)</span>
              )}
            </div>
            <select
              value={mapping.noFormCol || ''}
              onChange={(e) => onChange('noFormCol', e.target.value)}
              className="w-full border rounded-lg p-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              <option value="">-- (Tidak Digunakan / Kosongkan) --</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* 13. Link / Foto Properti (URL / Google Drive / AppSheet) */}
          <div className={`p-2.5 rounded-lg border ${mapping.fotoCol ? 'border-[#005baa]/50 bg-sky-50/40 dark:bg-sky-950/30' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-extrabold text-[#005baa] dark:text-sky-300">
                📸 Link Foto Properti / Rumah:
              </label>
              {mapping.fotoCol ? (
                <span className="text-[10px] text-emerald-600 font-bold">✓ Terhubung</span>
              ) : (
                <span className="text-[10px] text-slate-400 italic">(Tidak Digunakan)</span>
              )}
            </div>
            <select
              value={mapping.fotoCol || ''}
              onChange={(e) => onChange('fotoCol', e.target.value)}
              className="w-full border rounded-lg p-1.5 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-[#005baa]"
            >
              <option value="">-- (Tidak Digunakan / Kosongkan) --</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Mendukung link Google Drive, URL AppSheet, Dropbox, atau Web Image. Foto langsung terlihat di dashboard.
            </p>
          </div>
        </div>

        {/* Toggle Kolom Tambahan / Rincian */}
        <div>
          <button
            type="button"
            onClick={() => setShowDetailFields(!showDetailFields)}
            className="text-xs font-bold text-[#005baa] hover:underline flex items-center gap-1"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetailFields ? 'rotate-180' : ''}`} />
            <span>{showDetailFields ? 'Sembunyikan' : 'Tampilkan'} Kolom Rincian Tambahan (Blok, RT/RW, Catatan Sales, dll)</span>
          </button>

          {showDetailFields && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-3 animate-in fade-in">
              {/* Blok */}
              <div className="p-2 rounded border bg-white dark:bg-slate-900">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">Blok:</label>
                <select
                  value={mapping.blokCol || ''}
                  onChange={(e) => onChange('blokCol', e.target.value)}
                  className="w-full border rounded p-1 text-[11px] bg-white dark:bg-slate-900"
                >
                  <option value="">-- (Tidak Digunakan) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* No Rumah */}
              <div className="p-2 rounded border bg-white dark:bg-slate-900">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">No Rumah:</label>
                <select
                  value={mapping.noRumahCol || ''}
                  onChange={(e) => onChange('noRumahCol', e.target.value)}
                  className="w-full border rounded p-1 text-[11px] bg-white dark:bg-slate-900"
                >
                  <option value="">-- (Tidak Digunakan) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* RT */}
              <div className="p-2 rounded border bg-white dark:bg-slate-900">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">RT:</label>
                <select
                  value={mapping.rtCol || ''}
                  onChange={(e) => onChange('rtCol', e.target.value)}
                  className="w-full border rounded p-1 text-[11px] bg-white dark:bg-slate-900"
                >
                  <option value="">-- (Tidak Digunakan) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* RW */}
              <div className="p-2 rounded border bg-white dark:bg-slate-900">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">RW:</label>
                <select
                  value={mapping.rwCol || ''}
                  onChange={(e) => onChange('rwCol', e.target.value)}
                  className="w-full border rounded p-1 text-[11px] bg-white dark:bg-slate-900"
                >
                  <option value="">-- (Tidak Digunakan) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Desa / Kelurahan */}
              <div className="p-2 rounded border bg-white dark:bg-slate-900">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">Desa / Kelurahan:</label>
                <select
                  value={mapping.desaCol || ''}
                  onChange={(e) => onChange('desaCol', e.target.value)}
                  className="w-full border rounded p-1 text-[11px] bg-white dark:bg-slate-900"
                >
                  <option value="">-- (Tidak Digunakan) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Kecamatan */}
              <div className="p-2 rounded border bg-white dark:bg-slate-900">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">Kecamatan:</label>
                <select
                  value={mapping.kecamatanCol || ''}
                  onChange={(e) => onChange('kecamatanCol', e.target.value)}
                  className="w-full border rounded p-1 text-[11px] bg-white dark:bg-slate-900"
                >
                  <option value="">-- (Tidak Digunakan) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Foto Properti */}
              <div className="p-2 rounded border bg-white dark:bg-slate-900">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">Foto Properti / Lampiran:</label>
                <select
                  value={mapping.fotoCol || ''}
                  onChange={(e) => onChange('fotoCol', e.target.value)}
                  className="w-full border rounded p-1 text-[11px] bg-white dark:bg-slate-900"
                >
                  <option value="">-- (Tidak Digunakan) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Catatan Sales */}
              <div className="p-2 rounded border bg-white dark:bg-slate-900">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">Catatan Sales:</label>
                <select
                  value={mapping.catatanCol || ''}
                  onChange={(e) => onChange('catatanCol', e.target.value)}
                  className="w-full border rounded p-1 text-[11px] bg-white dark:bg-slate-900"
                >
                  <option value="">-- (Tidak Digunakan) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper untuk merender tabel pratinjau hasil pemetaan
  const renderPreviewTable = (customers: CustomerSurvey[]) => {
    const minatCount = customers.filter((c) => c.statusMinat === 'Minat').length;
    const tidakMinatCount = customers.filter((c) => c.statusMinat === 'Tidak Minat').length;
    const fotoCount = customers.filter((c) => !!(c.fotoProperti || c.fotoRumahUrl)).length;

    return (
      <div className="space-y-2">
        {/* Scorecard Mini Preview */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs">
          <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <span>Hasil Pratinjau Terbaca:</span>
            <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border">
              {customers.length} Data
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-bold font-mono">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px]">
              Minat: {minatCount}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[11px]">
              Tidak Minat: {tidakMinatCount}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300 text-[11px] flex items-center gap-1">
              <span>📸 Foto: {fotoCount}</span>
            </span>
          </div>
        </div>

        {/* Tabel Data Pratinjau */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-slate-100 dark:bg-slate-950 border-b text-slate-600 dark:text-slate-400 font-bold sticky top-0">
                <tr>
                  <th className="p-2.5">No</th>
                  <th className="p-2.5 text-center w-12">Foto</th>
                  <th className="p-2.5">Nama Pelanggan</th>
                  <th className="p-2.5">Status Minat</th>
                  <th className="p-2.5">Sales</th>
                  <th className="p-2.5">Alamat Lengkap</th>
                  <th className="p-2.5">Koordinat (Lat, Lng)</th>
                  <th className="p-2.5">Alasan / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {customers.slice(0, 5).map((c, i) => {
                  const pUrl = c.fotoProperti || c.fotoRumahUrl;
                  return (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-2 font-mono text-slate-400">{i + 1}</td>
                      <td className="p-2 text-center">
                        {pUrl ? (
                          <div className="relative group inline-block">
                            <img
                              src={pUrl}
                              alt="Foto"
                              className="w-7 h-7 rounded-md object-cover border border-slate-300 dark:border-slate-700 bg-slate-900 mx-auto"
                              onError={(e) => {
                                const target = e.target as HTMLElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<span class="text-[9px] text-sky-400 font-bold">LINK</span>';
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>
                      <td className="p-2 font-bold text-slate-800 dark:text-slate-100">{c.nama}</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            c.statusMinat === 'Minat'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {c.statusMinat}
                        </span>
                      </td>
                      <td className="p-2 font-medium">{c.salesNama}</td>
                      <td className="p-2 truncate max-w-[180px] text-slate-600 dark:text-slate-300">{c.alamat}</td>
                      <td className="p-2 font-mono text-[10px] text-sky-600 dark:text-sky-400">
                        {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}
                      </td>
                      <td className="p-2 text-slate-500 truncate max-w-[140px]">
                        {c.alasanTidakMinat || c.catatanSales || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div
        className={`${
          isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900 text-slate-100 border-slate-800'
        } border rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]`}
      >
        {/* Modal Header */}
        <div
          className={`px-5 py-3.5 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
          } flex items-center justify-between shrink-0`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isLight ? 'bg-[#005baa]/10 text-[#005baa]' : 'bg-sky-500/10 text-sky-400'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-extrabold text-sm sm:text-base ${isLight ? 'text-[#005baa]' : 'text-slate-100'}`}>
                Import &amp; Sinkronisasi Data Spreading AppSheet
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Unggah file Excel/CSV atau hubungkan Google Spreadsheet dengan pemetaan kolom otomatis &amp; manual
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            } transition`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex items-center gap-1 px-5 py-2 border-b text-xs font-bold ${
            isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          } shrink-0`}
        >
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'upload'
                ? isLight
                  ? 'bg-white text-[#005baa] shadow-xs'
                  : 'bg-slate-800 text-sky-400 shadow-xs'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File Excel / CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('link')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'link'
                ? isLight
                  ? 'bg-white text-[#005baa] shadow-xs'
                  : 'bg-slate-800 text-sky-400 shadow-xs'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Link Google Sheets (Realtime AppSheet)</span>
            {linkedConfig && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
          </button>

          <button
            onClick={() => setActiveTab('template')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'template'
                ? isLight
                  ? 'bg-white text-[#005baa] shadow-xs'
                  : 'bg-slate-800 text-sky-400 shadow-xs'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Panduan &amp; Template CSV</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Status Feedback Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 dark:bg-rose-950/70 dark:border-rose-900 dark:text-rose-200 flex flex-col gap-2 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="leading-relaxed font-medium whitespace-pre-line text-xs">
                  {errorMessage}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-6 pt-1 border-t border-rose-200/60 dark:border-rose-900/60">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('link');
                    setShowGuideAccordion(true);
                  }}
                  className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900 dark:hover:bg-rose-800 text-rose-900 dark:text-rose-100 rounded-lg font-bold text-[11px] transition flex items-center gap-1 shadow-xs"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Buka Panduan Solusi Link Google Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg font-bold text-[11px] transition border border-rose-300 dark:border-rose-800 flex items-center gap-1 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-[#005baa]" />
                  <span>Alternatif: Download File &amp; Upload Excel di Sini</span>
                </button>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-relaxed font-bold">{successMessage}</span>
            </div>
          )}

          {/* TAB 1: UPLOAD FILE EXCEL / CSV */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Dropzone / File Picker */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                  isLight
                    ? 'border-slate-300 hover:border-[#005baa] bg-slate-50/50 hover:bg-[#005baa]/5'
                    : 'border-slate-700 hover:border-sky-500 bg-slate-950/40 hover:bg-slate-950'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div
                    className={`p-3 rounded-2xl ${
                      isLight ? 'bg-[#005baa]/10 text-[#005baa]' : 'bg-sky-500/10 text-sky-400'
                    }`}
                  >
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      {selectedFile ? selectedFile.name : 'Klik untuk Pilih File Excel / CSV Hasil Spreading'}
                    </span>
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>
                      Mendukung file .xlsx, .xls, dan .csv langsung dari ekspor AppSheet
                    </p>
                  </div>
                </div>
              </div>

              {/* Once file is parsed */}
              {fileHeaders.length > 0 && previewCustomers.length > 0 && (
                <div className="space-y-4 animate-in fade-in">
                  {/* Pemetaan Kolom Form */}
                  {renderMappingForm(
                    fileHeaders,
                    columnMapping,
                    handleFileMappingChange,
                    handleResetFileAutoDetect,
                    fileRawRows
                  )}

                  {/* Pratinjau Tabel */}
                  {renderPreviewTable(previewCustomers)}

                  {/* Import Mode Options */}
                  <div className={`p-3.5 rounded-xl border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                    <label className="font-bold block uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                      Pilihan Metode Impor ke Dashboard:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                          importMode === 'append'
                            ? isLight
                              ? 'bg-white border-[#005baa] text-[#005baa] font-bold shadow-xs'
                              : 'bg-slate-900 border-sky-500 text-sky-300 font-bold'
                            : isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-600'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="append"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="text-[#005baa]"
                        />
                        <div>
                          <div>Tambahkan ke Data yang Ada (Append)</div>
                          <div className="text-[10px] font-normal opacity-80">
                            Menggabungkan dengan {currentCustomerCount} data yang sudah ada di dashboard
                          </div>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                          importMode === 'replace'
                            ? isLight
                              ? 'bg-white border-rose-600 text-rose-700 font-bold shadow-xs'
                              : 'bg-slate-900 border-rose-500 text-rose-300 font-bold'
                            : isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-600'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="text-rose-600"
                        />
                        <div>
                          <div>Ganti Seluruh Data (Replace)</div>
                          <div className="text-[10px] font-normal opacity-80">
                            Mengosongkan dashboard dan mengganti dengan {previewCustomers.length} data file ini
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LINK GOOGLE SPREADSHEET (APPSHEET LIVE SYNC) */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              {/* Linked Sheet Status Header */}
              {linkedConfig ? (
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    <div>
                      <div className="font-bold text-xs">
                        Terhubung ke Google Spreadsheet AppSheet
                      </div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        Terakhir disinkronkan: <strong>{linkedConfig.lastSyncedAt || 'Baru saja'}</strong> ({linkedConfig.lastSyncedCount} data)
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleUnlinkSheet}
                    className="px-2.5 py-1 text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Putus Link</span>
                  </button>
                </div>
              ) : (
                <div
                  className={`p-3.5 rounded-xl border ${
                    isLight ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-sky-950/40 border-sky-800 text-sky-200'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#005baa]" />
                    <span>Sinkronisasi Realtime Google Spreadsheet AppSheet:</span>
                  </div>
                  <p className="text-[11px] mt-1 leading-relaxed opacity-90">
                    Masukkan URL Google Spreadsheet yang digunakan oleh aplikasi AppSheet sales Anda. Dashboard akan membaca kolom spreadsheet dan mengizinkan Anda mencocokkan nama kolom jika ada perbedaan.
                  </p>
                </div>
              )}

              {/* Step 1: URL Input & Test Read */}
              <div className="space-y-1.5">
                <label className="font-bold block uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                  URL Google Spreadsheet / Link CSV AppSheet:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className={`flex-1 border rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-800 focus:border-[#005baa]'
                        : 'bg-slate-950 border-slate-700 text-slate-200 focus:border-sky-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleTestGoogleSheet}
                    disabled={isTestingSheet || !sheetUrl.trim()}
                    className="px-4 py-2 bg-[#005baa] hover:bg-[#004b8d] text-white font-bold rounded-lg text-xs shadow-md transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingSheet ? 'animate-spin' : ''}`} />
                    <span>{isTestingSheet ? 'Membaca Data...' : '🔍 Baca & Uji Kolom'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Mendukung link share Google Drive, link publikasi web CSV, maupun AppSheet webhook.
                </p>

                {/* Tombol Toggle Panduan Troubleshooting */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowGuideAccordion(!showGuideAccordion)}
                    className="text-[11px] font-bold text-[#005baa] dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>
                      {showGuideAccordion
                        ? 'Sembunyikan Panduan Solusi Error Google Sheet'
                        : 'Sudah diset "siapa saja dapat melihat" tapi masih error? Klik di sini untuk 3 solusi pasti'}
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showGuideAccordion ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Box Panduan Detail */}
                {showGuideAccordion && (
                  <div className={`mt-2 p-3.5 rounded-xl border space-y-3 animate-in fade-in ${
                    isLight ? 'bg-amber-50/70 border-amber-200 text-slate-800' : 'bg-amber-950/30 border-amber-900 text-slate-200'
                  }`}>
                    <div className="font-extrabold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5 pb-1 border-b border-amber-200/80 dark:border-amber-800">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>3 Cara Mengatasi Error Link Google Spreadsheet:</span>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      {/* Solusi 1 */}
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-amber-900/60 space-y-1">
                        <div className="font-bold text-[#005baa] dark:text-sky-300 flex items-center gap-1">
                          <span>1. Periksa Akses Umum Google Drive</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          Buka Google Sheet Anda &gt; klik tombol <strong>Bagikan</strong> di kanan atas &gt; di bawah <strong>Akses umum</strong>, pastikan dipilih <strong>&quot;Siapa saja yang memiliki link&quot;</strong> dengan peran <strong>&quot;Pelihat&quot;</strong>.
                          <br />
                          <em>Catatan penting:</em> Jika Anda menggunakan akun email kantor/instansi (Google Workspace), pastikan tidak dibatasi hanya ke domain kantor Anda.
                        </p>
                      </div>

                      {/* Solusi 2 (Rekomendasi Utama) */}
                      <div className="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-1">
                        <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>2. Gunakan Fitur &quot;Publikasikan ke Web &gt; CSV&quot; (Metode Paling Pasti &amp; Stabil)</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                          Ini adalah jalur resmi Google yang 100% bebas dari blokir otentikasi login:
                          <br />
                          1. Di Google Sheet Anda, klik menu <strong>File</strong> &gt; <strong>Bagikan</strong> &gt; <strong>Publikasikan ke web</strong>.
                          <br />
                          2. Pada pilihan format di samping sheet, ganti dari <em>Halaman Web</em> menjadi <strong>Nilai yang dipisahkan koma (.csv)</strong>.
                          <br />
                          3. Klik tombol hijau <strong>Publikasikan</strong> &gt; Salin tautan yang muncul &gt; Tempelkan di kolom input URL di atas.
                        </p>
                      </div>

                      {/* Solusi 3 */}
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <span>3. Alternatif 1-Klik: Unduh &amp; Upload File Excel / CSV</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          Buka Google Sheet Anda &gt; klik <strong>File</strong> &gt; <strong>Download</strong> &gt; <strong>Microsoft Excel (.xlsx)</strong> atau <strong>CSV</strong>.
                          <br />
                          Lalu beralih ke tab <strong>Upload File Excel / CSV</strong> di atas untuk langsung mengunggah file tanpa perlu pengaturan izin Google Drive.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('upload')}
                          className="mt-1 px-3 py-1 bg-[#005baa] hover:bg-[#004b8d] text-white rounded font-bold text-[10px] transition inline-flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Buka Tab Upload File Excel Sekarang</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Once Google Sheet is fetched, show Column Mapping & Preview */}
              {sheetHeaders.length > 0 && sheetPreviewCustomers.length > 0 && (
                <div className="space-y-4 animate-in fade-in">
                  {/* Pemetaan Kolom Google Sheet */}
                  {renderMappingForm(
                    sheetHeaders,
                    sheetColumnMapping,
                    handleSheetMappingChange,
                    handleResetSheetAutoDetect,
                    sheetRawRows
                  )}

                  {/* Pratinjau Tabel Google Sheet */}
                  {renderPreviewTable(sheetPreviewCustomers)}

                  {/* Auto Sync Settings */}
                  <div
                    className={`p-3.5 rounded-xl border space-y-2.5 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-xs flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-[#005baa]" />
                        <span>Auto-Sync Otomatis di Latar Belakang:</span>
                      </label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAutoSyncEnabled}
                          onChange={(e) => setIsAutoSyncEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#005baa]"></div>
                      </label>
                    </div>

                    {isAutoSyncEnabled && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-slate-500 text-[11px]">Interval Sinkronisasi Otomatis:</span>
                        <select
                          value={autoSyncInterval}
                          onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
                          className="border rounded px-2 py-1 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                        >
                          <option value={1}>Setiap 1 Menit (Realtime &amp; Direkomendasikan)</option>
                          <option value={2}>Setiap 2 Menit</option>
                          <option value={3}>Setiap 3 Menit</option>
                          <option value={5}>Setiap 5 Menit</option>
                          <option value={10}>Setiap 10 Menit</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PANDUAN & TEMPLATE */}
          {activeTab === 'template' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-sky-950/30 dark:border-sky-800 space-y-2">
                <h4 className="font-extrabold text-sm text-[#005baa] dark:text-sky-300 flex items-center gap-1.5">
                  <Download className="w-4 h-4" />
                  <span>Download File Contoh Template Spreading</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Gunakan template CSV standar ini untuk memastikan kesesuaian kolom antara aplikasi AppSheet sales di Android/iOS dengan Dashboard Web GIS Aetra Tangerang.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="px-4 py-2 bg-[#005baa] hover:bg-[#004b8d] text-white font-bold rounded-lg text-xs shadow-md transition flex items-center gap-1.5 mt-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File template_spreading_appsheet_aetra.csv</span>
                </button>
              </div>

              {/* Column Legend Guide */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="p-3 bg-slate-100 dark:bg-slate-950 border-b font-bold text-xs">
                  Daftar Nama Kolom yang Didukung Sistem:
                </div>
                <div className="p-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200">1. Status Minat:</strong>
                      <p className="text-[11px]">Nilai: &quot;Minat&quot;, &quot;Tidak Minat&quot;, &quot;Tidak Berminat&quot;, &quot;Belum Minat&quot;, &quot;Menolak&quot;, &quot;TM&quot;.</p>
                    </div>
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200">2. Koordinat GPS:</strong>
                      <p className="text-[11px]">Kolom Latitude (-6.xx) dan Longitude (106.xx) atau kolom gabungan.</p>
                    </div>
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200">3. Nama Pelanggan &amp; HP:</strong>
                      <p className="text-[11px]">Kolom nama calon pelanggan dan nomor WhatsApp/telepon.</p>
                    </div>
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200">4. Alamat &amp; Wilayah:</strong>
                      <p className="text-[11px]">Alamat lengkap, Blok, No Rumah, RT/RW, Desa, Kecamatan, Zona.</p>
                    </div>
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200">5. Foto Properti / Rumah:</strong>
                      <p className="text-[11px]">Link Google Drive, URL foto AppSheet, atau link gambar langsung.</p>
                    </div>
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200">6. Sales &amp; No Form:</strong>
                      <p className="text-[11px]">Nama petugas surveyor, No Form AppSheet, dan tanggal spreading.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panduan Berbagi Google Sheet */}
              <div className="border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl p-4 space-y-2">
                <div className="font-extrabold text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Panduan Setting Izin Google Spreadsheet yang Bebas Error:</span>
                </div>
                <div className="text-[11px] text-slate-700 dark:text-slate-300 space-y-1.5 leading-relaxed">
                  <p>
                    <strong>Metode Rekomendasi (Publikasikan ke Web CSV):</strong>
                    <br />
                    1. Buka spreadsheet &gt; Klik menu <strong>File</strong> &gt; <strong>Bagikan</strong> &gt; <strong>Publikasikan ke web</strong>.
                    <br />
                    2. Ganti dari <em>Halaman Web</em> ke <strong>Nilai yang dipisahkan koma (.csv)</strong> &gt; Klik <strong>Publikasikan</strong>.
                    <br />
                    3. Salin tautan CSV yang muncul dan tempelkan di tab <em>Link Google Spreadsheet</em>.
                  </p>
                  <p className="pt-1 border-t border-emerald-200 dark:border-emerald-900">
                    <strong>Metode Share Biasa:</strong>
                    <br />
                    Klik tombol <strong>Bagikan</strong> (kanan atas) &gt; Pada <em>Akses umum</em> ganti dari <em>Dibatasi</em> ke <strong>Siapa saja yang memiliki link</strong> (peran: Pelihat). Jika akun Anda adalah email institusi/kantor, pastikan tidak terkunci hanya untuk anggota organisasi.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`px-5 py-3.5 border-t flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
          } shrink-0`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            Tutup
          </button>

          {/* Action Button depending on tab */}
          {activeTab === 'upload' && (
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isProcessingFile || previewCustomers.length === 0}
              className="px-5 py-2 rounded-xl bg-[#005baa] hover:bg-[#004b8d] text-white font-bold text-xs transition shadow-md shadow-[#005baa]/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Impor {previewCustomers.length > 0 ? `(${previewCustomers.length}) Data` : ''} ke Dashboard</span>
            </button>
          )}

          {activeTab === 'link' && (
            <button
              type="button"
              onClick={handleSaveAndSyncGoogleSheet}
              disabled={isSyncingLive || !sheetUrl.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingLive ? 'animate-spin' : ''}`} />
              <span>Simpan Pemetaan &amp; Sinkronkan Sekarang</span>
            </button>
          )}

          {activeTab === 'template' && (
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className="px-5 py-2 rounded-xl bg-[#005baa] hover:bg-[#004b8d] text-white font-bold text-xs transition flex items-center gap-1.5"
            >
              <span>Lanjut Upload File</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
