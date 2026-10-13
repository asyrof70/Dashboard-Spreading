import React, { useState } from 'react';
import { CustomerSurvey, InterestStatus } from '../types/gis';
import { formatPhotoUrl } from '../utils/spreadsheetParser';
import {
  MapPin,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Phone,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet,
  X,
  Check,
  AlertCircle,
  GitMerge,
  Clock,
  User,
  Search,
  Layers,
  Home,
  Camera,
  Info,
  Columns,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MessageCircle,
} from 'lucide-react';

interface CustomerTableProps {
  customers: CustomerSurvey[];
  onSelectCustomer: (cust: CustomerSurvey) => void;
  onFocusMap: (cust: CustomerSurvey) => void;
  onDeleteCustomer?: (id: string) => void;
  onBulkDeleteCustomers?: (ids: string[]) => void;
  onClearAllCustomers?: () => void;
  onRestoreDefaultCustomers?: () => void;
  onOpenSpreadsheetModal?: () => void;
  theme?: 'light' | 'dark';
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  onSelectCustomer,
  onFocusMap,
  onDeleteCustomer,
  onBulkDeleteCustomers,
  onClearAllCustomers,
  onRestoreDefaultCustomers,
  onOpenSpreadsheetModal,
  theme = 'light',
}) => {
  const isLight = theme === 'light';
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [tableSearch, setTableSearch] = useState<string>('');
  const itemsPerPage = 8;

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal State for viewing Merge History
  const [selectedCustomerMergeHistory, setSelectedCustomerMergeHistory] = useState<CustomerSurvey | null>(null);

  // Modal State for Photo Lightbox Preview
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{ customer: CustomerSurvey; url: string } | null>(null);

  // In-app Modal Confirmation States (Replaces window.confirm)
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState<boolean>(false);
  const [targetSingleDelete, setTargetSingleDelete] = useState<{ id: string; name: string } | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);

  // Toggle Mode: Tampilan Standar vs Tampilkan Semua Kolom Spreadsheet (Lengkap)
  const [showAllColumns, setShowAllColumns] = useState<boolean>(false);
  // Baris yang sedang di-expand untuk melihat rincian seluruh kolom spreadsheet
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Table local search filter
  const displayedCustomers = React.useMemo(() => {
    if (!tableSearch.trim()) return customers;
    const q = tableSearch.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.nama.toLowerCase().includes(q) ||
        c.alamat.toLowerCase().includes(q) ||
        c.salesNama.toLowerCase().includes(q) ||
        c.zonaNama.toLowerCase().includes(q) ||
        (c.telepon && c.telepon.includes(q)) ||
        (c.noForm && c.noForm.toLowerCase().includes(q))
    );
  }, [customers, tableSearch]);

  const totalPages = Math.ceil(displayedCustomers.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = displayedCustomers.slice(startIndex, startIndex + itemsPerPage);

  const isAllCurrentSelected =
    currentItems.length > 0 && currentItems.every((c) => selectedIds.has(c.id));

  const toggleSelectAllCurrent = () => {
    const next = new Set(selectedIds);
    if (isAllCurrentSelected) {
      currentItems.forEach((c) => next.delete(c.id));
    } else {
      currentItems.forEach((c) => next.add(c.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const confirmExecuteBulkDelete = () => {
    if (onBulkDeleteCustomers && selectedIds.size > 0) {
      onBulkDeleteCustomers(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
    setShowBulkDeleteModal(false);
  };

  const confirmExecuteSingleDelete = () => {
    if (targetSingleDelete && onDeleteCustomer) {
      onDeleteCustomer(targetSingleDelete.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(targetSingleDelete.id);
        return next;
      });
    }
    setTargetSingleDelete(null);
  };

  const confirmExecuteClearAll = () => {
    if (onClearAllCustomers) {
      onClearAllCustomers();
      setSelectedIds(new Set());
    }
    setShowClearAllModal(false);
  };

  const confirmExecuteRestore = () => {
    if (onRestoreDefaultCustomers) {
      onRestoreDefaultCustomers();
      setSelectedIds(new Set());
    }
    setShowRestoreModal(false);
  };

  const getStatusBadge = (status: InterestStatus) => {
    return status === 'Minat' ? (
      <span
        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
          isLight
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span>Minat</span>
      </span>
    ) : (
      <span
        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
          isLight
            ? 'bg-rose-50 text-rose-800 border-rose-300'
            : 'bg-rose-950 text-rose-300 border-rose-800'
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        <span>Tidak Minat</span>
      </span>
    );
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'No Form',
      'Timestamp',
      'Nama Pelanggan',
      'Alamat',
      'Blok',
      'No Rumah',
      'RT',
      'RW',
      'Desa',
      'Kecamatan',
      'Telepon',
      'Latitude',
      'Longitude',
      'Jenis Area Target',
      'Status Minat',
      'Alasan Tidak Minat',
      'Sales',
      'Zona',
      'Jarak ke Pipa (m)',
      'Riwayat Kunjungan Merge',
      'Catatan',
    ];

    const rows = customers.map((c) => [
      `"${c.id}"`,
      `"${c.noForm || ''}"`,
      `"${c.timestamp || c.tanggalSpreading}"`,
      `"${c.nama.replace(/"/g, '""')}"`,
      `"${c.alamat.replace(/"/g, '""')}"`,
      `"${c.blok || ''}"`,
      `"${c.nomorRumah || ''}"`,
      `"${c.rt || ''}"`,
      `"${c.rw || ''}"`,
      `"${c.desa || ''}"`,
      `"${c.kecamatan || ''}"`,
      `"${c.telepon}"`,
      c.latitude,
      c.longitude,
      `"${c.jenisAreaTarget || 'Adhoc'}"`,
      `"${c.statusMinat}"`,
      `"${(c.alasanTidakMinat || c.alasan || '').replace(/"/g, '""')}"`,
      `"${c.salesNama}"`,
      `"${c.zonaNama}"`,
      c.jarakKePipaMeter ?? 0,
      `"${c.historyVisits ? c.historyVisits.length + ' kunjungan' : '1 kunjungan'}"`,
      `"${(c.catatanSales || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `survei_pelanggan_aetra_tangerang_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Total visits calculation across displayed customers
  const totalVisitsCount = customers.reduce((sum, c) => sum + (c.historyVisits?.length || 1), 0);
  const totalMergedProperties = customers.filter((c) => c.isMerged || (c.historyVisits && c.historyVisits.length > 1)).length;

  return (
    <div
      className={`${
        isLight ? 'bg-white text-slate-800 border-slate-200 shadow-xl' : 'bg-slate-900/90 text-slate-100 border-slate-800 shadow-xl'
      } border rounded-xl p-4 relative`}
    >
      {/* Header and Actions */}
      <div
        className={`flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 pb-3 border-b ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-extrabold text-sm flex items-center gap-2 ${isLight ? 'text-[#005baa]' : 'text-slate-100'}`}>
              <span>Daftar Pelanggan Hasil Spreading</span>
            </h3>
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold ${
                isLight ? 'bg-[#005baa]/10 text-[#005baa]' : 'bg-slate-800 text-sky-400'
              }`}
              title="Jumlah Properti Fisik Unik di Lapangan"
            >
              {customers.length} Properti Fisik
            </span>
            <span
              className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
              title="Total Log Kunjungan Spreading Sales (Tidak Berkurang saat di-Merge)"
            >
              {totalVisitsCount} Kunjungan Sales
            </span>
            {totalMergedProperties > 0 && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1"
                title={`${totalMergedProperties} properti hasil penggabungan (merge) data spreading berulang`}
              >
                <GitMerge className="w-3 h-3 text-[#e46423]" />
                <span>{totalMergedProperties} Tergabung (Merged)</span>
              </span>
            )}
          </div>
          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} mt-1`}>
            Klik pada baris atau tombol <strong>&quot;📍 Tunjukkan di Peta&quot;</strong> untuk langsung menampilkan lokasi di peta satelit dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Table Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama / alamat..."
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              className={`pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-800 focus:border-[#005baa]'
                  : 'bg-slate-950 border-slate-700 text-slate-200 focus:border-sky-500'
              }`}
            />
          </div>

          {/* Toggle Tampilkan Semua Kolom Spreadsheet */}
          <button
            type="button"
            onClick={() => setShowAllColumns(!showAllColumns)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition border ${
              showAllColumns
                ? 'bg-[#005baa] text-white border-[#005baa] shadow-sm'
                : isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Tampilkan seluruh kolom data dari spreadsheet (No Form, Alamat, RT/RW, Desa, Kecamatan, GPS, Alasan, Catatan, dll)"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{showAllColumns ? 'Tampilan Standar' : '📊 Semua Kolom Spreadsheet'}</span>
          </button>

          {/* Open Spreadsheet Import / Link */}
          {onOpenSpreadsheetModal && (
            <button
              type="button"
              onClick={onOpenSpreadsheetModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                isLight
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  : 'bg-emerald-900 hover:bg-emerald-800 text-emerald-200 border border-emerald-700'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import Excel / Sheets</span>
            </button>
          )}

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              isLight
                ? 'bg-[#005baa] hover:bg-[#004b8d] text-white shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Hapus Semua Data */}
          {onClearAllCustomers && customers.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearAllModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                isLight
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800'
              }`}
              title="Hapus / Kosongkan seluruh data kunjungan di dashboard"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus Semua ({customers.length})</span>
            </button>
          )}

          {/* Restore Default */}
          {onRestoreDefaultCustomers && (
            <button
              type="button"
              onClick={() => setShowRestoreModal(true)}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Reset / Pulihkan ke Data Awal Demo (12 data)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar (When rows are selected) */}
      {selectedIds.size > 0 && (
        <div
          className={`mb-3 p-2.5 rounded-xl border flex items-center justify-between animate-in fade-in duration-150 ${
            isLight ? 'bg-rose-50 border-rose-200 text-rose-950' : 'bg-rose-950/60 border-rose-900 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckSquare className="w-4 h-4 text-rose-600" />
            <span>{selectedIds.size} data kunjungan dipilih</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1 text-xs text-slate-600 hover:underline"
            >
              Batal Pilih
            </button>
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus {selectedIds.size} Data Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-xs text-left">
          <thead
            className={`text-[11px] uppercase tracking-wider font-bold border-b ${
              isLight ? 'text-slate-600 bg-slate-100/90 border-slate-200' : 'text-slate-400 bg-slate-950/80 border-slate-800'
            }`}
          >
            <tr>
              <th className="py-2.5 px-3 w-8 text-center">
                <button
                  type="button"
                  onClick={toggleSelectAllCurrent}
                  className="text-slate-500 hover:text-slate-800 flex items-center justify-center"
                  title={isAllCurrentSelected ? 'Batal pilih semua di halaman ini' : 'Pilih semua di halaman ini'}
                >
                  {isAllCurrentSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#005baa]" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="py-2.5 px-2 text-center w-14">Foto</th>
              {showAllColumns && <th className="py-2.5 px-3">No Form</th>}
              <th className="py-2.5 px-3">Pelanggan / Properti</th>
              <th className="py-2.5 px-3">Status Minat</th>
              {showAllColumns && <th className="py-2.5 px-3">Alasan T. Minat</th>}
              {showAllColumns && <th className="py-2.5 px-3">No. Telepon</th>}
              <th className="py-2.5 px-3">Alamat Lengkap</th>
              {showAllColumns && <th className="py-2.5 px-3">Blok / No</th>}
              {showAllColumns && <th className="py-2.5 px-3">RT / RW</th>}
              {showAllColumns && <th className="py-2.5 px-3">Desa / Kelurahan</th>}
              {showAllColumns && <th className="py-2.5 px-3">Kecamatan</th>}
              {showAllColumns && <th className="py-2.5 px-3 font-mono">GPS (Lat, Lng)</th>}
              {showAllColumns && <th className="py-2.5 px-3">Area Target</th>}
              <th className="py-2.5 px-3">Sales Spreading</th>
              <th className="py-2.5 px-3">Zona Pelayanan</th>
              {!showAllColumns && <th className="py-2.5 px-3 text-center">Riwayat Kunjungan</th>}
              <th className="py-2.5 px-3 text-center">Waktu Survei</th>
              {showAllColumns && <th className="py-2.5 px-3">Catatan Sales</th>}
              <th className="py-2.5 px-3 text-right">Tindakan / Peta</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500 text-xs">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {tableSearch ? 'Tidak ada hasil pencarian yang cocok' : 'Tidak ada data kunjungan di dashboard'}
                    </span>
                    <p className="text-[11px] text-slate-400 max-w-sm">
                      {tableSearch
                        ? 'Coba ganti kata kunci pencarian nama atau alamat.'
                        : 'Semua data telah dibersihkan. Anda dapat mengimpor file Excel/CSV baru atau memulihkan data demo.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                      {onOpenSpreadsheetModal && (
                        <button
                          type="button"
                          onClick={onOpenSpreadsheetModal}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>+ Import Excel / Google Sheets</span>
                        </button>
                      )}
                      {onRestoreDefaultCustomers && (
                        <button
                          type="button"
                          onClick={() => setShowRestoreModal(true)}
                          className="px-3.5 py-1.5 bg-[#005baa] hover:bg-[#004b8d] text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Muat Data Demo Bawaan</span>
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              currentItems.map((c) => {
                const isSelected = selectedIds.has(c.id);
                const hasHistory = !!(c.historyVisits && c.historyVisits.length > 1) || !!c.isMerged;
                const visitsCount = c.historyVisits?.length || 1;
                const photoUrl = formatPhotoUrl(c.fotoProperti || c.fotoRumahUrl);

                return (
                  <React.Fragment key={c.id}>
                    <tr
                      className={`group transition cursor-pointer ${
                        isSelected
                          ? isLight
                            ? 'bg-blue-50/80'
                            : 'bg-sky-950/50'
                          : isLight
                          ? 'hover:bg-blue-50/40'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(c.id)}
                        className="text-slate-400 hover:text-[#005baa] flex items-center justify-center"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#005baa]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Foto Properti Thumbnail */}
                    <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      {photoUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoModal({ customer: c, url: photoUrl })}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 hover:border-[#005baa] dark:hover:border-sky-400 shadow-xs hover:shadow-md transition cursor-pointer relative bg-slate-900 group block mx-auto"
                          title="Klik untuk memperbesar foto properti"
                        >
                          <img
                            src={photoUrl}
                            alt={`Foto ${c.nama}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<span class="text-[9px] text-sky-400 font-bold flex items-center justify-center h-full">LINK</span>';
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                        </button>
                      ) : (
                        <div
                          className="w-10 h-10 rounded-lg border border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900/40 mx-auto"
                          title="Belum ada foto yang dilampirkan pada survei ini"
                        >
                          <Camera className="w-4 h-4 opacity-40" />
                        </div>
                      )}
                    </td>

                    {/* No Form (Kolom Spreadsheet Lengkap) */}
                    {showAllColumns && (
                      <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-[#e46423]" onClick={() => onFocusMap(c)}>
                        {c.noForm || '-'}
                      </td>
                    )}

                    {/* Nama Pelanggan & Phone & Merge Badge */}
                    <td
                      className="py-2.5 px-3"
                      onClick={() => onFocusMap(c)}
                      title="Klik untuk langsung melihat lokasi di peta dashboard"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-bold hover:underline ${isLight ? 'text-[#005baa]' : 'text-sky-300'}`}>
                          {c.nama}
                        </span>
                        {!showAllColumns && c.noForm && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-orange-100 text-[#e46423] border border-orange-200">
                            {c.noForm}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRowId(expandedRowId === c.id ? null : c.id);
                          }}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition flex items-center gap-0.5 ${
                            expandedRowId === c.id
                              ? 'bg-[#005baa] text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                          title="Lihat semua data kolom mentah dari spreadsheet"
                        >
                          {expandedRowId === c.id ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                          <span>Kolom</span>
                        </button>
                      </div>

                      {!showAllColumns && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className={`text-[10px] font-mono flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            <Phone className="w-3 h-3 text-slate-400" />
                            {c.telepon}
                          </div>

                          {/* Interactive Merge History Badge */}
                          {hasHistory && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomerMergeHistory(c);
                              }}
                              className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900 transition flex items-center gap-1 shadow-xs"
                              title="Klik untuk melihat history data survei mana saja yang digabungkan"
                            >
                              <GitMerge className="w-3 h-3 text-[#e46423]" />
                              <span>{visitsCount}x Kunjungan Tergabung</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status Minat */}
                    <td className="py-2.5 px-3" onClick={() => onFocusMap(c)}>
                      {getStatusBadge(c.statusMinat)}
                    </td>

                    {/* Alasan Tidak Minat (Kolom Spreadsheet Lengkap) */}
                    {showAllColumns && (
                      <td className={`py-2.5 px-3 max-w-[150px] truncate ${c.statusMinat === 'Tidak Minat' ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-400 italic'}`} title={c.alasanTidakMinat || c.alasan || '-'}>
                        {c.alasanTidakMinat || c.alasan || '-'}
                      </td>
                    )}

                    {/* No Telepon (Kolom Spreadsheet Lengkap) */}
                    {showAllColumns && (
                      <td className="py-2.5 px-3 font-mono text-[11px]" onClick={() => onFocusMap(c)}>
                        <a
                          href={`https://wa.me/62${c.telepon.replace(/\D/g, '').replace(/^0/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline hover:text-emerald-600 flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{c.telepon}</span>
                        </a>
                      </td>
                    )}

                    {/* Alamat Lengkap */}
                    <td
                      className={`py-2.5 px-3 max-w-[220px] truncate ${isLight ? 'text-slate-700' : 'text-slate-300'}`}
                      title={c.alamat}
                      onClick={() => onFocusMap(c)}
                    >
                      {c.alamat}
                    </td>

                    {/* Blok & No Rumah (Kolom Spreadsheet Lengkap) */}
                    {showAllColumns && (
                      <td className="py-2.5 px-3 font-mono text-[11px]" onClick={() => onFocusMap(c)}>
                        {[c.blok ? `Blok ${c.blok}` : '', c.nomorRumah ? `No ${c.nomorRumah}` : ''].filter(Boolean).join(', ') || '-'}
                      </td>
                    )}

                    {/* RT / RW (Kolom Spreadsheet Lengkap) */}
                    {showAllColumns && (
                      <td className="py-2.5 px-3 font-mono text-[11px]" onClick={() => onFocusMap(c)}>
                        {[c.rt ? `RT ${c.rt}` : '', c.rw ? `RW ${c.rw}` : ''].filter(Boolean).join(' / ') || '-'}
                      </td>
                    )}

                    {/* Desa / Kelurahan (Kolom Spreadsheet Lengkap) */}
                    {showAllColumns && (
                      <td className="py-2.5 px-3" onClick={() => onFocusMap(c)}>
                        {c.desa || '-'}
                      </td>
                    )}

                    {/* Kecamatan (Kolom Spreadsheet Lengkap) */}
                    {showAllColumns && (
                      <td className="py-2.5 px-3" onClick={() => onFocusMap(c)}>
                        {c.kecamatan || '-'}
                      </td>
                    )}

                    {/* Koordinat GPS (Kolom Spreadsheet Lengkap) */}
                    {showAllColumns && (
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 whitespace-nowrap" onClick={() => onFocusMap(c)}>
                        {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}
                      </td>
                    )}

                    {/* Area Target (Kolom Spreadsheet Lengkap) */}
                    {showAllColumns && (
                      <td className="py-2.5 px-3 font-mono text-[11px]" onClick={() => onFocusMap(c)}>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.jenisAreaTarget === 'CAPEX' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {c.jenisAreaTarget || 'Adhoc'}
                        </span>
                      </td>
                    )}

                    {/* Sales */}
                    <td className={`py-2.5 px-3 font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`} onClick={() => onFocusMap(c)}>
                      {c.salesNama}
                    </td>

                    {/* Zona */}
                    <td className={`py-2.5 px-3 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} onClick={() => onFocusMap(c)}>
                      {c.zonaNama}
                    </td>

                    {/* Riwayat Kunjungan Column */}
                    {!showAllColumns && (
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {hasHistory ? (
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerMergeHistory(c)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition inline-flex items-center gap-1"
                            title="Klik untuk melihat detail riwayat data yang di-merge"
                          >
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>{visitsCount}x Log Riwayat</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-400">
                            1x Kunjungan
                          </span>
                        )}
                      </td>
                    )}

                    {/* Waktu Survei */}
                    <td className={`py-2.5 px-3 text-center font-mono text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`} onClick={() => onFocusMap(c)}>
                      {c.timestamp?.slice(0, 10) || c.tanggalSpreading}
                    </td>

                    {/* Catatan Sales (Kolom Spreadsheet Lengkap) */}
                    {showAllColumns && (
                      <td className="py-2.5 px-3 max-w-[180px] truncate italic text-slate-500 text-[11px]" title={c.catatanSales || '-'}>
                        {c.catatanSales || '-'}
                      </td>
                    )}

                    {/* Direct Map Focus Action & Detail Buttons */}
                    <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 🌟 Direct Feature: Tunjukkan Langsung di Peta Dashboard */}
                        <button
                          type="button"
                          onClick={() => onFocusMap(c)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm ${
                            isLight
                              ? 'bg-[#005baa] hover:bg-[#004b8d] text-white'
                              : 'bg-sky-600 hover:bg-sky-500 text-white'
                          }`}
                          title="Tunjukkan lokasi titik survei ini langsung di peta satelit dashboard"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Peta</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectCustomer(c)}
                          className={`p-1.5 rounded-lg border transition ${
                            isLight
                              ? 'bg-slate-50 hover:bg-slate-200 text-slate-700 border-slate-200'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                          title="Buka Rincian Survei Lengkap & Ubah Status"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {onDeleteCustomer && (
                          <button
                            type="button"
                            onClick={() => setTargetSingleDelete({ id: c.id, name: c.nama })}
                            className={`p-1.5 rounded-lg border transition ${
                              isLight
                                ? 'bg-slate-50 hover:bg-rose-600 text-slate-400 hover:text-white border-slate-200 hover:border-rose-600'
                                : 'bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white border-slate-700 hover:border-rose-600'
                            }`}
                            title="Hapus Data Kunjungan Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Inline Expanded Drawer: Menampilkan SELURUH Kolom Spreadsheet Asli */}
                  {expandedRowId === c.id && (
                    <tr className={isLight ? 'bg-slate-50/90' : 'bg-slate-900/90'}>
                      <td colSpan={showAllColumns ? 19 : 10} className="p-4 border-b">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-[#005baa]" />
                              <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                                Rincian Semua Kolom Spreadsheet Asli untuk: {c.nama} ({c.statusMinat})
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-[#005baa] dark:bg-sky-950 dark:text-sky-300 font-bold">
                              {c.rawRow ? `${Object.keys(c.rawRow).length} Kolom Mentah Terbaca` : 'Data Terstruktur'}
                            </span>
                          </div>

                          {/* Grid seluruh key & value spreadsheet mentah */}
                          {c.rawRow && Object.keys(c.rawRow).length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                              {Object.entries(c.rawRow).map(([colKey, colVal]) => (
                                <div
                                  key={colKey}
                                  className={`p-2 rounded-lg border ${
                                    isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                                  }`}
                                >
                                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate" title={colKey}>
                                    {colKey}
                                  </div>
                                  <div className={`mt-0.5 font-medium break-words ${colKey.toLowerCase().includes('minat') ? (String(colVal).toLowerCase().includes('tidak') ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold') : 'text-slate-800 dark:text-slate-200'}`}>
                                    {colVal !== undefined && colVal !== null && String(colVal).trim() !== '' ? String(colVal) : <span className="text-slate-400 italic">(kosong)</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                              <div className="p-2 rounded border bg-white dark:bg-slate-950">
                                <span className="text-[10px] text-slate-500 font-bold">Nama</span>
                                <p className="font-bold">{c.nama}</p>
                              </div>
                              <div className="p-2 rounded border bg-white dark:bg-slate-950">
                                <span className="text-[10px] text-slate-500 font-bold">Status Minat</span>
                                <p className="font-bold text-emerald-600">{c.statusMinat}</p>
                              </div>
                              <div className="p-2 rounded border bg-white dark:bg-slate-950">
                                <span className="text-[10px] text-slate-500 font-bold">Telepon</span>
                                <p>{c.telepon}</p>
                              </div>
                              <div className="p-2 rounded border bg-white dark:bg-slate-950">
                                <span className="text-[10px] text-slate-500 font-bold">Alamat</span>
                                <p>{c.alamat}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Clear All */}
      <div
        className={`flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 mt-3 border-t text-xs ${
          isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
        }`}
      >
        <div className="flex items-center gap-3">
          <div>
            Menampilkan <span className="font-bold">{displayedCustomers.length > 0 ? startIndex + 1 : 0}</span> s/d{' '}
            <span className="font-bold">{Math.min(startIndex + itemsPerPage, displayedCustomers.length)}</span> dari{' '}
            <span className="font-bold">{displayedCustomers.length}</span> properti
            {displayedCustomers.length !== customers.length && (
              <span className="text-slate-400 ml-1">(difilter dari total {customers.length})</span>
            )}
          </div>

          {onClearAllCustomers && customers.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearAllModal(true)}
              className="text-rose-600 hover:text-rose-700 hover:underline text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              title="Hapus Semua Data Pelanggan"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua Data</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`p-1.5 rounded-lg border transition disabled:opacity-30 disabled:cursor-not-allowed ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold px-2">
            Hal {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`p-1.5 rounded-lg border transition disabled:opacity-30 disabled:cursor-not-allowed ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 🌟 MODAL KHUSUS: Rincian History Data Mana yang di-Merge */}
      {selectedCustomerMergeHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-3xl border rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${
              isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900 text-slate-100 border-slate-800'
            }`}
          >
            {/* Header */}
            <div
              className={`px-5 py-4 border-b flex items-center justify-between ${
                isLight ? 'bg-amber-50/80 border-amber-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#e46423] text-white rounded-xl shadow-xs">
                  <GitMerge className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      Riwayat Hasil Merge Kunjungan Spreading
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold">
                      {selectedCustomerMergeHistory.historyVisits?.length || 2} Data Digabungkan
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Audit trail data survei mana saja yang digabungkan ke properti master ini
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerMergeHistory(null)}
                className={`p-1.5 rounded-lg ${
                  isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Info Master Properti */}
              <div
                className={`p-4 rounded-xl border ${
                  isLight ? 'bg-blue-50/70 border-blue-200 text-slate-800' : 'bg-sky-950/40 border-sky-900 text-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-[#005baa] text-white">
                      ★ Master Properti Terpilih
                    </span>
                    <span className="font-bold text-sm">{selectedCustomerMergeHistory.nama}</span>
                  </div>
                  <div>
                    {getStatusBadge(selectedCustomerMergeHistory.statusMinat)}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-2 border-t border-blue-200/60 dark:border-sky-900">
                  <div>
                    <strong>Alamat Acuan:</strong> {selectedCustomerMergeHistory.alamat}
                  </div>
                  <div>
                    <strong>Wilayah:</strong> {selectedCustomerMergeHistory.zonaNama} • Kec: {selectedCustomerMergeHistory.kecamatan || '-'}
                  </div>
                  <div>
                    <strong>Koordinat GPS:</strong> {selectedCustomerMergeHistory.latitude.toFixed(6)}, {selectedCustomerMergeHistory.longitude.toFixed(6)}
                  </div>
                  <div>
                    <strong>Catatan Analis:</strong> {selectedCustomerMergeHistory.analystNote || 'Diverifikasi Analis: Digabungkan dari input survei berulang'}
                  </div>
                </div>
              </div>

              {/* Tabel / Kartu Perbandingan Data yang Di-Merge */}
              <div className="space-y-2">
                <div className="font-bold text-xs flex items-center justify-between">
                  <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>
                    Daftar Data Survei Asal yang Digabungkan:
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Diurutkan dari kunjungan terbaru
                  </span>
                </div>

                {selectedCustomerMergeHistory.historyVisits && selectedCustomerMergeHistory.historyVisits.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedCustomerMergeHistory.historyVisits.map((visit, idx) => (
                      <div
                        key={visit.visitId || idx}
                        className={`p-3.5 rounded-xl border relative transition ${
                          idx === 0
                            ? isLight
                              ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300/60'
                              : 'bg-slate-950 border-amber-500/60 ring-1 ring-amber-500/30'
                            : isLight
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950 text-[#e46423] border border-orange-200 dark:border-orange-900">
                              Kunjungan #{selectedCustomerMergeHistory.historyVisits!.length - idx}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-slate-500">
                              ID: {visit.visitId}
                            </span>
                            {visit.noForm && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                Form: {visit.noForm}
                              </span>
                            )}
                          </div>
                          <div>
                            {getStatusBadge(visit.statusMinat)}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-[11px]">
                          <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Petugas Sales</div>
                            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                              <User className="w-3.5 h-3.5 text-[#005baa] dark:text-sky-400" />
                              <span>{visit.salesNama}</span>
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Waktu &amp; Tanggal Survei</div>
                            <div className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{visit.timestamp || visit.tanggalSpreading}</span>
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Nama &amp; Telepon Saat Input</div>
                            <div className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                              {visit.nama || selectedCustomerMergeHistory.nama} ({visit.telepon || selectedCustomerMergeHistory.telepon})
                            </div>
                          </div>
                        </div>

                        {/* Catatan / Alasan Asli */}
                        {(visit.catatanSales || visit.alasan) && (
                          <div className={`mt-2.5 p-2 rounded-lg text-[11px] italic border ${
                            isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}>
                            <strong>Catatan Spreading:</strong> &quot;{visit.catatanSales || visit.alasan}&quot;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Tidak ada rincian riwayat sub-kunjungan.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              className={`px-5 py-3 border-t flex flex-wrap items-center justify-between gap-2 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  const target = selectedCustomerMergeHistory;
                  setSelectedCustomerMergeHistory(null);
                  onFocusMap(target);
                }}
                className="px-4 py-2 bg-[#005baa] hover:bg-[#004b8d] text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5"
              >
                <MapPin className="w-4 h-4" />
                <span>📍 Tunjukkan Lokasi Master di Peta Satelit</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCustomerMergeHistory(null)}
                className={`px-4 py-2 font-bold rounded-xl text-xs transition ${
                  isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: In-App Confirmation Hapus Semua Data */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 text-rose-600 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-base text-rose-900 dark:text-rose-200">
                  Hapus Seluruh Data Kunjungan?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tindakan ini akan mengosongkan seluruh {customers.length} data survei spreading dari dashboard.
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-medium">
              Data yang dihapus dapat digantikan kembali kapan saja dengan mengunggah file Excel/CSV baru atau memulihkan data demo bawaan.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmExecuteClearAll}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Semua Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: In-App Confirmation Bulk Delete */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 text-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  Hapus {selectedIds.size} Data Terpilih?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Data yang dipilih akan dihapus secara permanen dari dashboard.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmExecuteBulkDelete}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-md"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: In-App Confirmation Single Delete */}
      {targetSingleDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Hapus Data Kunjungan Ini?
                </h4>
                <p className="text-xs text-slate-600 font-bold mt-0.5">
                  &quot;{targetSingleDelete.name}&quot;
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTargetSingleDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmExecuteSingleDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-md"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: In-App Confirmation Restore Demo Data */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#005baa]/10 text-[#005baa] rounded-xl">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  Pulihkan Data Demo Bawaan?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dashboard akan diisi kembali dengan 12 data survei spreading contoh PT Moya / Aetra Tangerang.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmExecuteRestore}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#005baa] hover:bg-[#004b8d] text-white transition shadow-md"
              >
                Pulihkan Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Photo Lightbox Preview */}
      {previewPhotoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewPhotoModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950 text-[#005baa] dark:text-sky-300">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>Foto Properti: {previewPhotoModal.customer.nama}</span>
                    {previewPhotoModal.customer.noForm && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-orange-100 text-[#e46423] border border-orange-200">
                        {previewPhotoModal.customer.noForm}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 truncate max-w-md">
                    {previewPhotoModal.customer.alamat}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Canvas */}
            <div className="p-4 bg-slate-950 flex items-center justify-center min-h-[300px] max-h-[65vh] overflow-hidden relative">
              <img
                src={previewPhotoModal.url}
                alt={`Foto Properti ${previewPhotoModal.customer.nama}`}
                className="max-h-[58vh] max-w-full rounded-lg object-contain shadow-2xl"
                onError={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const notice = document.createElement('div');
                    notice.className = 'text-center p-6 text-slate-400 text-xs';
                    notice.innerHTML = '⚠️ Gambar tidak dapat dimuat langsung.<br/><a href="' + previewPhotoModal.url + '" target="_blank" rel="noreferrer" class="mt-2 inline-block text-sky-400 font-bold underline">Buka Link Foto Eksternal di Tab Baru ↗</a>';
                    parent.appendChild(notice);
                  }
                }}
              />
            </div>

            {/* Footer Information & Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                <div>
                  <strong>Sales:</strong> {previewPhotoModal.customer.salesNama} •{' '}
                  <strong>Tanggal:</strong> {previewPhotoModal.customer.timestamp || previewPhotoModal.customer.tanggalSpreading}
                </div>
                <div className="font-mono text-[11px] text-slate-500">
                  GPS: {previewPhotoModal.customer.latitude.toFixed(5)}, {previewPhotoModal.customer.longitude.toFixed(5)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewPhotoModal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Link Asli ↗</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const cust = previewPhotoModal.customer;
                    setPreviewPhotoModal(null);
                    onFocusMap(cust);
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#005baa] hover:bg-[#004b8d] text-white transition shadow-sm flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Tunjukkan di Peta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
