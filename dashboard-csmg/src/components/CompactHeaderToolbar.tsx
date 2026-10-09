import React, { useState } from 'react';
import { FilterState, SalesRep } from '../types/gis';
import { AetraLogo } from './AetraLogo';
import {
  Droplets,
  Calendar,
  Users,
  Layers,
  UserPlus,
  BookOpen,
  Filter,
  Home,
  Clock,
  GitMerge,
  X,
  ChevronDown,
  Sun,
  Moon,
  Image as ImageIcon,
  FileSpreadsheet,
  RefreshCw,
  UserCog,
} from 'lucide-react';

interface CompactHeaderToolbarProps {
  totalSpreadingVisits: number;
  uniquePropertiesCount: number;
  minatCount: number;
  tidakMinatCount: number;
  duplicateCount: number;
  salesList: SalesRep[];
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  onOpenAnalystModal: () => void;
  onOpenAddSurveyModal: () => void;
  onOpenUploadModal: () => void;
  onOpenSpreadsheetModal?: () => void;
  isSpreadsheetLinked?: boolean;
  onQuickSyncSpreadsheet?: () => void;
  isQuickSyncing?: boolean;
  onOpenSalesModal?: () => void;
  onOpenGuideModal: () => void;
  onOpenLogoModal?: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const CompactHeaderToolbar: React.FC<CompactHeaderToolbarProps> = ({
  totalSpreadingVisits,
  uniquePropertiesCount,
  minatCount,
  tidakMinatCount,
  duplicateCount,
  salesList,
  filter,
  onFilterChange,
  onOpenAnalystModal,
  onOpenAddSurveyModal,
  onOpenUploadModal,
  onOpenSpreadsheetModal,
  isSpreadsheetLinked = false,
  onQuickSyncSpreadsheet,
  isQuickSyncing = false,
  onOpenSalesModal,
  onOpenGuideModal,
  onOpenLogoModal,
  onToggleSidebar,
  isSidebarOpen,
  theme = 'light',
  onToggleTheme,
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const isLight = theme === 'light';

  const konversiRate =
    uniquePropertiesCount > 0
      ? ((minatCount / uniquePropertiesCount) * 100).toFixed(1)
      : '0';

  // Handle Preset Periode
  const handlePeriodPreset = (preset: 'all' | 'this_month' | 'last_14' | 'last_7') => {
    const today = new Date('2026-09-30');
    let startDate = '';
    let endDate = '';

    if (preset === 'this_month') {
      startDate = '2026-09-01';
      endDate = '2026-09-30';
    } else if (preset === 'last_14') {
      const d = new Date(today);
      d.setDate(d.getDate() - 14);
      startDate = d.toISOString().slice(0, 10);
      endDate = '2026-09-30';
    } else if (preset === 'last_7') {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      startDate = d.toISOString().slice(0, 10);
      endDate = '2026-09-30';
    }

    onFilterChange({
      ...filter,
      startDate,
      endDate,
    });
  };

  const getActivePeriodLabel = () => {
    if (!filter.startDate && !filter.endDate) return 'Semua Periode';
    if (filter.startDate === '2026-09-01' && filter.endDate === '2026-09-30') return 'Sep 2026';
    if (filter.startDate && filter.endDate) {
      return `${filter.startDate.slice(5)} s/d ${filter.endDate.slice(5)}`;
    }
    if (filter.startDate) return `Sejak ${filter.startDate.slice(5)}`;
    return 'Kustom';
  };

  return (
    <header
      className={`${
        isLight
          ? 'bg-white border-b border-slate-200 shadow-sm text-slate-800'
          : 'bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 text-slate-100'
      } px-3 py-1.5 z-20 shrink-0 transition-colors duration-150`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-2.5">
          <div 
            onClick={onOpenLogoModal}
            className="h-9 px-2 bg-white rounded-lg flex items-center justify-center shadow-xs border border-slate-200/80 shrink-0 cursor-pointer hover:border-[#005baa] hover:shadow-sm transition group"
            title="Klik untuk Mengatur / Mengganti Logo Aetra"
          >
            <AetraLogo className="h-7 w-auto" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <h1 className={`font-extrabold text-xs sm:text-sm tracking-tight ${isLight ? 'text-[#005baa]' : 'text-slate-100'}`}>
                AETRA AIR TANGERANG
              </h1>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold font-mono bg-[#e46423] text-white shadow-xs">
                Spreading GIS
              </span>
            </div>
            <div className={`flex items-center gap-1.5 text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium">Google Satelit</span>
              <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>•</span>
              <span className={isLight ? 'text-slate-600 font-semibold' : 'text-slate-300'}>AppSheet Sync</span>
            </div>
          </div>
        </div>

        {/* Center: Essential Minimalist Scorecard Ticker */}
        <div
          className={`flex items-center gap-1 ${
            isLight
              ? 'bg-slate-50 border border-slate-200 text-slate-700'
              : 'bg-slate-900/90 border border-slate-800 text-slate-300'
          } rounded-xl px-2 py-0.5 text-xs shadow-inner overflow-x-auto`}
        >
          {/* Total Kunjungan Spreading */}
          <div className="flex items-center gap-1 px-1.5 py-0.5" title="Total kunjungan spreading sales lapangan (Bukti Kerja)">
            <Clock className={`w-3 h-3 ${isLight ? 'text-[#005baa]' : 'text-sky-400'}`} />
            <span className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-[10px]`}>Kunjungan:</span>
            <span className={`font-bold font-mono text-[11px] ${isLight ? 'text-[#005baa]' : 'text-white'}`}>
              {totalSpreadingVisits}
            </span>
          </div>

          <span className={isLight ? 'text-slate-300' : 'text-slate-700'}>|</span>

          {/* Properti Unik */}
          <div className="flex items-center gap-1 px-1.5 py-0.5" title="Jumlah properti/rumah unik (tanpa duplikat)">
            <Home className={`w-3 h-3 ${isLight ? 'text-[#005baa]' : 'text-cyan-400'}`} />
            <span className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-[10px]`}>Properti:</span>
            <span className={`font-bold font-mono text-[11px] ${isLight ? 'text-slate-800' : 'text-cyan-300'}`}>
              {uniquePropertiesCount}
            </span>
          </div>

          <span className={isLight ? 'text-slate-300' : 'text-slate-700'}>|</span>

          {/* Minat (Neon Green CAD) */}
          <div className="flex items-center gap-1 px-1.5 py-0.5" title="Peminat sambungan baru">
            <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
            <span className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-[10px]`}>Minat:</span>
            <span className={`font-bold font-mono text-[11px] ${isLight ? 'text-emerald-700' : 'text-[#00FF66]'}`}>
              {minatCount} <span className={`text-[9px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>({konversiRate}%)</span>
            </span>
          </div>

          <span className={isLight ? 'text-slate-300' : 'text-slate-700'}>|</span>

          {/* Tidak Minat (Neon Red CAD) */}
          <div className="flex items-center gap-1 px-1.5 py-0.5" title="Pelanggan menolak / tidak berminat">
            <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
            <span className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-[10px]`}>Tidak Minat:</span>
            <span className={`font-bold font-mono text-[11px] ${isLight ? 'text-rose-700' : 'text-[#FF1744]'}`}>
              {tidakMinatCount}
            </span>
          </div>

          {/* Warning Spreading Duplikat (Interactive Analyst Badge) */}
          {duplicateCount > 0 && (
            <>
              <span className={isLight ? 'text-slate-300' : 'text-slate-700'}>|</span>
              <button
                onClick={onOpenAnalystModal}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                  isLight
                    ? 'bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900'
                    : 'bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300'
                } transition text-[10px] font-bold`}
                title="Klik untuk verifikasi Sales Analis (Spreading Berulang)"
              >
                <GitMerge className="w-3 h-3 text-[#e46423]" />
                <span>{duplicateCount} Spreading Berulang</span>
              </button>
            </>
          )}
        </div>

        {/* Right: Filter Sales & Filter Periode Custom Date */}
        <div className="flex items-center gap-1.5 text-xs">
          {/* Theme Toggle (Light / Dark) */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700'
              }`}
              title={isLight ? 'Beralih ke Dark Mode' : 'Beralih ke Light Mode (Biru & Oren)'}
            >
              {isLight ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#e46423]" />
                  <span className="hidden xl:inline text-[11px]">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden xl:inline text-[11px]">Dark</span>
                </>
              )}
            </button>
          )}

          {/* Filter Sales (Petugas Sales AppSheet) */}
          <div
            className={`flex items-center gap-1 ${
              isLight ? 'bg-white border-slate-300 text-slate-800 shadow-sm' : 'bg-slate-900 border-slate-700/80 text-slate-200'
            } border rounded-lg px-2 py-1`}
          >
            <Users className={`w-3.5 h-3.5 ${isLight ? 'text-[#005baa]' : 'text-sky-400'} shrink-0`} />
            <select
              value={filter.salesId}
              onChange={(e) => onFilterChange({ ...filter, salesId: e.target.value })}
              className={`bg-transparent ${isLight ? 'text-slate-800' : 'text-slate-200'} text-xs focus:outline-none cursor-pointer pr-1 max-w-[140px] truncate`}
            >
              <option value="" className={isLight ? 'bg-white text-slate-800' : 'bg-slate-900 text-slate-200'}>
                Semua Sales ({salesList.length} Petugas)
              </option>
              {salesList.map((s) => (
                <option key={s.id} value={s.id} className={isLight ? 'bg-white text-slate-800' : 'bg-slate-900 text-slate-200'}>
                  {s.nama} ({s.nip})
                </option>
              ))}
            </select>

            {onOpenSalesModal && (
              <button
                type="button"
                onClick={onOpenSalesModal}
                className="p-0.5 text-slate-400 hover:text-[#005baa] transition rounded"
                title="Ubah &amp; Kelola Nama Petugas Sales"
              >
                <UserCog className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Periode Custom Date Range */}
          <div className="relative">
            <button
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className={`flex items-center gap-1.5 ${
                isLight
                  ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-850 border-slate-700/80 text-slate-200'
              } border rounded-lg px-2.5 py-1 text-xs transition`}
              title="Pilih Rentang Tanggal Mulai dan Selesai"
            >
              <Calendar className={`w-3.5 h-3.5 ${isLight ? 'text-[#005baa]' : 'text-sky-400'}`} />
              <span>{getActivePeriodLabel()}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Date Range Picker Popover */}
            {isDatePickerOpen && (
              <div
                className={`absolute top-full right-0 mt-1 z-50 w-72 ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-800 shadow-2xl'
                    : 'bg-slate-900 border-slate-700 text-slate-100 shadow-2xl'
                } border rounded-xl p-3 space-y-2.5 text-xs`}
              >
                <div className={`flex items-center justify-between pb-1 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'} font-bold`}>
                  <span>Pilih Rentang Tanggal</span>
                  <button
                    onClick={() => setIsDatePickerOpen(false)}
                    className="p-0.5 rounded text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <button
                    onClick={() => {
                      handlePeriodPreset('all');
                      setIsDatePickerOpen(false);
                    }}
                    className={`p-1.5 rounded ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} text-left`}
                  >
                    Semua Waktu
                  </button>
                  <button
                    onClick={() => {
                      handlePeriodPreset('this_month');
                      setIsDatePickerOpen(false);
                    }}
                    className={`p-1.5 rounded ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} text-left`}
                  >
                    Sep 2026 (Bulan Ini)
                  </button>
                  <button
                    onClick={() => {
                      handlePeriodPreset('last_14');
                      setIsDatePickerOpen(false);
                    }}
                    className={`p-1.5 rounded ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} text-left`}
                  >
                    14 Hari Terakhir
                  </button>
                  <button
                    onClick={() => {
                      handlePeriodPreset('last_7');
                      setIsDatePickerOpen(false);
                    }}
                    className={`p-1.5 rounded ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} text-left`}
                  >
                    7 Hari Terakhir
                  </button>
                </div>

                {/* Custom Start & End Date */}
                <div className={`space-y-1.5 pt-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Kustom Tanggal:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">Dari Tanggal:</span>
                      <input
                        type="date"
                        value={filter.startDate}
                        onChange={(e) => onFilterChange({ ...filter, startDate: e.target.value })}
                        className={`w-full ${isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'} border rounded px-2 py-1 text-xs font-mono`}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">Sampai Tanggal:</span>
                      <input
                        type="date"
                        value={filter.endDate}
                        onChange={(e) => onFilterChange({ ...filter, endDate: e.target.value })}
                        className={`w-full ${isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'} border rounded px-2 py-1 text-xs font-mono`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => setIsDatePickerOpen(false)}
                    className="px-3 py-1 bg-[#005baa] hover:bg-[#004885] text-white rounded font-semibold text-xs transition shadow-sm"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Toggle Filter GIS Lanjutan */}
          <button
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
              isSidebarOpen
                ? 'bg-[#005baa] text-white border-[#005baa]'
                : isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
            }`}
            title="Filter Zona & Status Minat"
          >
            <Filter className={`w-3.5 h-3.5 ${isSidebarOpen ? 'text-white' : isLight ? 'text-[#005baa]' : 'text-sky-400'}`} />
            <span className="hidden lg:inline">Filter</span>
          </button>

          {/* Input Survei (+ Input) */}
          <button
            onClick={onOpenAddSurveyModal}
            className="px-2.5 py-1.5 rounded-lg bg-[#e46423] hover:bg-[#c9541a] text-white font-bold text-xs shadow-md transition flex items-center gap-1"
            title="Input Survei Spreading Baru"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">+ Input</span>
          </button>

          {/* Import / Sync Spreadsheet AppSheet */}
          {onOpenSpreadsheetModal && (
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenSpreadsheetModal}
                className={`p-1.5 rounded-lg ${
                  isSpreadsheetLinked
                    ? isLight
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm'
                      : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 text-emerald-700 border-slate-300 shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border-slate-700/80'
                } border transition flex items-center gap-1`}
                title="Unggah Excel/CSV atau Hubungkan Google Spreadsheet AppSheet"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden xl:inline text-[11px] font-bold">
                  {isSpreadsheetLinked ? 'Live Sheet' : 'Excel / Sheet'}
                </span>
                {isSpreadsheetLinked && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>

              {isSpreadsheetLinked && onQuickSyncSpreadsheet && (
                <button
                  onClick={onQuickSyncSpreadsheet}
                  disabled={isQuickSyncing}
                  className={`px-2 py-1.5 rounded-lg ${
                    isLight
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
                      : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                  } border transition flex items-center gap-1.5 text-[11px] font-bold`}
                  title="Sinkronkan Ulang SEMUA Kolom Data Google Spreadsheet Sekarang (Nama, Status Minat, Alamat, Koordinat, dll)"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isQuickSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isQuickSyncing ? 'Menyinkronkan...' : 'Sync Sekarang'}</span>
                </button>
              )}
            </div>
          )}

          {/* Import KMZ / SHP */}
          <button
            onClick={onOpenUploadModal}
            className={`p-1.5 rounded-lg ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-[#005baa] border-slate-300 shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 text-sky-400 border-slate-700/80'
            } border transition`}
            title="Import KMZ / KML / GeoJSON / SHP (Pipa & Batas Zona)"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Ganti / Atur Logo Aetra */}
          {onOpenLogoModal && (
            <button
              onClick={onOpenLogoModal}
              className={`p-1.5 rounded-lg ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-[#e46423] border-slate-300 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-slate-700/80'
              } border transition`}
              title="Ganti / Upload Logo Aetra"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          )}

          {/* Panduan Supabase */}
          <button
            onClick={onOpenGuideModal}
            className={`p-1.5 rounded-lg ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300 shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700/80'
            } border transition`}
            title="Panduan SQL &amp; Apps Script"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
