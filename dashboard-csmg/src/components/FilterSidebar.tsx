import React from 'react';
import { FilterState, InterestStatus, SalesRep, ServiceZoneLayer, ZoneArea } from '../types/gis';
import {
  Filter,
  Search,
  RotateCcw,
  Calendar,
  CheckSquare,
  Square,
  Shield,
  GitMerge,
  Users,
  MapPin,
} from 'lucide-react';

interface FilterSidebarProps {
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  zones: ZoneArea[];
  salesList: SalesRep[];
  serviceZoneLayers?: ServiceZoneLayer[];
  totalFiltered: number;
  totalAll: number;
  onClearAllCustomers?: () => void;
  onRestoreDefaultCustomers?: () => void;
  onOpenSpreadsheetModal?: () => void;
  onOpenSalesModal?: () => void;
  theme?: 'light' | 'dark';
  zoneLabelAttribute?: string;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filter,
  onFilterChange,
  zones,
  salesList,
  serviceZoneLayers = [],
  totalFiltered,
  totalAll,
  onClearAllCustomers,
  onRestoreDefaultCustomers,
  onOpenSpreadsheetModal,
  onOpenSalesModal,
  theme = 'light',
  zoneLabelAttribute = 'kecamatan',
}) => {
  const isLight = theme === 'light';
  const [showClearConfirm, setShowClearConfirm] = React.useState<boolean>(false);

  const allStatuses: { status: InterestStatus; label: string; lightColor: string; darkColor: string }[] = [
    {
      status: 'Minat',
      label: 'Minat (Peminat Sambungan)',
      lightColor: 'text-emerald-800 bg-emerald-50 border-emerald-300 font-bold',
      darkColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800 font-medium',
    },
    {
      status: 'Tidak Minat',
      label: 'Tidak Minat (Menolak)',
      lightColor: 'text-rose-800 bg-rose-50 border-rose-300 font-bold',
      darkColor: 'text-rose-400 bg-rose-950/60 border-rose-800 font-medium',
    },
  ];

  const handleStatusToggle = (status: InterestStatus) => {
    let nextStatuses: InterestStatus[];
    if (filter.statusMinat.includes(status)) {
      nextStatuses = filter.statusMinat.filter((s) => s !== status);
    } else {
      nextStatuses = [...filter.statusMinat, status];
    }
    onFilterChange({ ...filter, statusMinat: nextStatuses });
  };

  const handleReset = () => {
    onFilterChange({
      zonaId: '',
      salesId: '',
      statusMinat: ['Minat', 'Tidak Minat'],
      startDate: '',
      endDate: '',
      searchQuery: '',
      onlyOutsideNetwork: false,
      onlyInsideServiceZone: false,
      selectedServiceZoneLayerId: '',
      filterDuplicateMode: 'all',
    });
  };

  return (
    <div
      className={`${
        isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900/95 text-slate-100 border-slate-800'
      } border rounded-xl p-3.5 shadow-xl flex flex-col gap-3.5 text-xs transition-colors`}
    >
      {/* Title & Counter */}
      <div className={`flex items-center justify-between pb-2 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
        <div className={`flex items-center gap-2 font-extrabold ${isLight ? 'text-[#005baa]' : 'text-slate-100'} text-xs`}>
          <Filter className="w-4 h-4 text-[#005baa]" />
          <span>Filter Lanjutan GIS</span>
        </div>
        <div
          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
            isLight ? 'bg-[#005baa]/10 text-[#005baa] border border-[#005baa]/20' : 'bg-sky-950 text-sky-300 border border-sky-800'
          }`}
        >
          {totalFiltered} / {totalAll} Titik
        </div>
      </div>

      {/* Search Input */}
      <div>
        <label className={`text-[10px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'} uppercase tracking-wider block mb-1`}>
          Pencarian Pelanggan / Alamat
        </label>
        <div className="relative">
          <Search className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-slate-500'} absolute left-2.5 top-1/2 -translate-y-1/2`} />
          <input
            type="text"
            placeholder="Cari nama, jalan, RT/RW, blok..."
            value={filter.searchQuery}
            onChange={(e) => onFilterChange({ ...filter, searchQuery: e.target.value })}
            className={`w-full ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#005baa]'
                : 'bg-slate-950 border-slate-700/80 text-slate-200 placeholder-slate-500 focus:border-sky-500'
            } border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none`}
          />
        </div>
      </div>

      {/* Filter Spreading Berulang / Kunjungan Ulang (<10 meter) */}
      <div>
        <label className={`text-[10px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'} uppercase tracking-wider block mb-1 flex items-center gap-1`}>
          <GitMerge className="w-3 h-3 text-[#e46423]" />
          <span>Analisis Duplikasi Spreading (&lt;10m)</span>
        </label>
        <div className="grid grid-cols-3 gap-1 text-[10px]">
          <button
            type="button"
            onClick={() => onFilterChange({ ...filter, filterDuplicateMode: 'all' })}
            title="Tampilkan semua riwayat kunjungan survei sales"
            className={`p-1.5 rounded border font-bold text-center transition ${
              (filter.filterDuplicateMode || 'all') === 'all'
                ? 'bg-[#005baa] text-white border-[#005baa] shadow-sm'
                : isLight
                ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filter, filterDuplicateMode: 'duplicates_only' })}
            title="Hanya tampilkan titik yang dikunjungi berulang kali / terdeteksi duplikasi (<10m)"
            className={`p-1.5 rounded border font-bold text-center transition ${
              filter.filterDuplicateMode === 'duplicates_only'
                ? 'bg-[#e46423] text-white border-[#e46423] shadow-sm'
                : isLight
                ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            Spreading Berulang
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filter, filterDuplicateMode: 'unique_only' })}
            title="Tampilkan 1 titik unik per rumah/properti (menghilangkan duplikasi kunjungan berulang)"
            className={`p-1.5 rounded border font-bold text-center transition ${
              filter.filterDuplicateMode === 'unique_only'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : isLight
                ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            Properti Unik
          </button>
        </div>
        <p className={`text-[9px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          {(filter.filterDuplicateMode || 'all') === 'all' && '📌 Menampilkan seluruh titik riwayat survei lapangan.'}
          {filter.filterDuplicateMode === 'duplicates_only' && '⚠️ Menampilkan titik yang dikunjungi lebih dari 1 kali.'}
          {filter.filterDuplicateMode === 'unique_only' && '🏡 Menampilkan 1 titik per rumah (tanpa dobel kunjungan).'}
        </p>
      </div>

      {/* Filter Batas Zona Pelayanan (Polygon Import) */}
      {serviceZoneLayers.length > 0 && (
        <div
          className={`${
            isLight ? 'bg-sky-50/70 border-sky-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300'
          } p-2.5 rounded-lg border space-y-1.5`}
        >
          <label className={`text-[10px] font-bold ${isLight ? 'text-[#005baa]' : 'text-slate-300'} uppercase tracking-wider flex items-center gap-1`}>
            <Shield className="w-3 h-3 text-[#005baa]" />
            <span>Filter Batas Zona Pelayanan</span>
          </label>
          <label className={`flex items-center gap-2 cursor-pointer ${isLight ? 'text-slate-700' : 'text-slate-300'} text-[11px]`}>
            <input
              type="checkbox"
              checked={!!filter.onlyInsideServiceZone}
              onChange={(e) =>
                onFilterChange({ ...filter, onlyInsideServiceZone: e.target.checked })
              }
              className="rounded text-[#005baa] focus:ring-[#005baa]"
            />
            <span>Hanya tampilkan titik di DALAM batas zona</span>
          </label>
        </div>
      )}

      {/* Rentang Periode Tanggal */}
      <div>
        <label className={`text-[10px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'} uppercase tracking-wider block mb-1 flex items-center gap-1`}>
          <Calendar className="w-3 h-3 text-[#005baa]" />
          <span>Rentang Periode Tanggal Spreading</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className={`text-[9px] ${isLight ? 'text-slate-500' : 'text-slate-500'} block`}>Dari Tanggal:</span>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => onFilterChange({ ...filter, startDate: e.target.value })}
              className={`w-full ${
                isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-300'
              } border rounded px-2 py-1 text-[11px] font-mono`}
            />
          </div>
          <div>
            <span className={`text-[9px] ${isLight ? 'text-slate-500' : 'text-slate-500'} block`}>Sampai Tanggal:</span>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => onFilterChange({ ...filter, endDate: e.target.value })}
              className={`w-full ${
                isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-300'
              } border rounded px-2 py-1 text-[11px] font-mono`}
            />
          </div>
        </div>
      </div>

      {/* Status Minat Checklist */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={`text-[10px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'} uppercase tracking-wider`}>
            Status Minat Pelanggan
          </label>
          <button
            onClick={() =>
              onFilterChange({
                ...filter,
                statusMinat:
                  filter.statusMinat.length === allStatuses.length
                    ? []
                    : (['Minat', 'Tidak Minat'] as InterestStatus[]),
              })
            }
            className="text-[10px] text-[#005baa] font-bold hover:underline"
          >
            {filter.statusMinat.length === allStatuses.length ? 'Batal' : 'Pilih Semua'}
          </button>
        </div>
        <div className="space-y-1">
          {allStatuses.map(({ status, label, lightColor, darkColor }) => {
            const isChecked = filter.statusMinat.includes(status);
            return (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusToggle(status)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg border text-left transition ${
                  isChecked
                    ? isLight
                      ? lightColor
                      : darkColor
                    : isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px]">
                  {isChecked ? (
                    <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Square className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
                  )}
                  <span>{label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Petugas Sales (Petugas AppSheet) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={`text-[10px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'} uppercase tracking-wider flex items-center gap-1`}>
            <Users className="w-3 h-3 text-[#005baa]" />
            <span>Petugas Sales Spreading</span>
          </label>
          {onOpenSalesModal && (
            <button
              type="button"
              onClick={onOpenSalesModal}
              className="text-[10px] text-[#005baa] hover:underline font-bold"
              title="Ubah atau tambah nama sales"
            >
              Ubah Nama Sales
            </button>
          )}
        </div>
        <select
          value={filter.salesId}
          onChange={(e) => onFilterChange({ ...filter, salesId: e.target.value })}
          className={`w-full ${
            isLight
              ? 'bg-white border-slate-300 text-slate-800 focus:border-[#005baa]'
              : 'bg-slate-950 border-slate-700/80 text-slate-200 focus:border-sky-500'
          } border rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer`}
        >
          <option value="">Semua Sales ({salesList.length} Petugas)</option>
          {salesList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama} ({s.nip})
            </option>
          ))}
        </select>
      </div>

      {/* Filter Zona Pelayanan (Disesuaikan dengan Zona Pelayanan Import & Visibilitas Legenda) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={`text-[10px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'} uppercase tracking-wider flex items-center gap-1`}>
            <MapPin className="w-3 h-3 text-[#005baa]" />
            <span>Zona Pelayanan</span>
          </label>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${
              zones.length > 0
                ? isLight
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                : isLight
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-amber-950/80 text-amber-400 border-amber-800'
            }`}
            title="Jumlah zona pelayanan yang visibilitasnya aktif di Legenda Peta"
          >
            {zones.length > 0 ? `${zones.length} Zona Aktif` : '0 Aktif'}
          </span>
        </div>
        <select
          value={filter.zonaId}
          onChange={(e) => onFilterChange({ ...filter, zonaId: e.target.value })}
          className={`w-full ${
            isLight
              ? 'bg-white border-slate-300 text-slate-800 focus:border-[#005baa]'
              : 'bg-slate-950 border-slate-700/80 text-slate-200 focus:border-sky-500'
          } border rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer`}
        >
          <option value="">
            {zones.length > 0 ? `Semua Zona Pelayanan (${zones.length} Zona)` : '(Semua Zona Nonaktif di Legenda)'}
          </option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nama}
            </option>
          ))}
        </select>
        {zones.length === 0 && (
          <p className={`text-[9.5px] mt-1 italic ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
            ℹ️ Zona dinonaktifkan di <strong>Legenda GIS</strong>. Aktifkan layer pada legenda agar zona muncul pada filter.
          </p>
        )}
      </div>

      {/* Reset Filter Button */}
      <button
        type="button"
        onClick={handleReset}
        className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-bold transition text-xs border mt-1 ${
          isLight
            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700/60'
        }`}
      >
        <RotateCcw className="w-3 h-3" />
        <span>Reset Semua Filter</span>
      </button>

      {/* Kelola / Bersihkan Data Survei */}
      <div className={`pt-2.5 mt-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'} space-y-1.5`}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Kelola Data Spreading:
        </div>

        {onOpenSpreadsheetModal && (
          <button
            type="button"
            onClick={onOpenSpreadsheetModal}
            className="w-full py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs flex items-center justify-center gap-1.5"
          >
            <span>+ Import Excel / Google Sheet</span>
          </button>
        )}

        {onClearAllCustomers && totalAll > 0 && (
          showClearConfirm ? (
            <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg space-y-1.5 animate-in fade-in">
              <span className="text-[10px] font-bold text-rose-800 block">
                Yakin hapus seluruh {totalAll} data kunjungan?
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onClearAllCustomers();
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold"
                >
                  Ya, Hapus Semua
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="w-full py-1.5 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg font-bold text-[11px] transition flex items-center justify-center gap-1.5"
            >
              <span>Hapus Semua Data Kunjungan</span>
            </button>
          )
        )}

        {onRestoreDefaultCustomers && (
          <button
            type="button"
            onClick={onRestoreDefaultCustomers}
            className="w-full py-1 text-slate-500 hover:text-slate-800 text-[10px] font-semibold text-center hover:underline"
          >
            Pulihkan Data Demo Bawaan (12 Data)
          </button>
        )}
      </div>
    </div>
  );
};
