import React, { useState } from 'react';
import { CustomerSurvey, InterestStatus } from '../types/gis';
import { formatPhotoUrl } from '../utils/spreadsheetParser';
import {
  X,
  MapPin,
  Phone,
  User,
  Calendar,
  Droplets,
  CheckCircle,
  Clock,
  FileText,
  Camera,
  Layers,
  Home,
  MessageCircle,
  GitMerge,
  Info,
  ExternalLink,
  Table,
  Sparkles,
} from 'lucide-react';

interface CustomerDetailModalProps {
  customer: CustomerSurvey | null;
  onClose: () => void;
  onUpdateStatus?: (id: string, newStatus: InterestStatus) => void;
  onDeleteCustomer?: (id: string) => void;
  onFocusMap?: (cust: CustomerSurvey) => void;
  theme?: 'light' | 'dark';
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  onClose,
  onUpdateStatus,
  onDeleteCustomer,
  onFocusMap,
  theme = 'light',
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState<boolean>(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);

  if (!customer) return null;
  const isLight = theme === 'light';
  const mainPhotoUrl = formatPhotoUrl(customer.fotoProperti || customer.fotoRumahUrl);

  const getStatusBadge = (status: InterestStatus) => {
    switch (status) {
      case 'Minat':
        return {
          bg: isLight
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
            : 'bg-emerald-950 text-emerald-300 border-emerald-800',
          text: 'Minat (Siap Pasang Baru)',
          desc: 'Pelanggan setuju untuk pemasangan water meter & sambungan baru Aetra Air Tangerang.',
        };
      case 'Tidak Minat':
      default:
        return {
          bg: isLight
            ? 'bg-rose-50 text-rose-800 border-rose-300'
            : 'bg-rose-950 text-rose-300 border-rose-800',
          text: 'Tidak Minat (Menolak)',
          desc: 'Pelanggan saat ini menolak sambungan PAM (misal masih menggunakan sumur bor / pompa pribadi).',
        };
    }
  };

  const statusInfo = getStatusBadge(customer.statusMinat);
  const distance = customer.jarakKePipaMeter ?? 0;
  const hasHistory = !!(customer.historyVisits && customer.historyVisits.length > 1) || !!customer.isMerged;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div
        className={`${
          isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900 text-slate-100 border-slate-800'
        } border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          } flex items-center justify-between`}
        >
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-mono font-bold ${isLight ? 'text-[#005baa]' : 'text-sky-400'}`}>
                {customer.id}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusInfo.bg}`}>
                {customer.statusMinat}
              </span>
              {customer.noForm && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-100 text-[#e46423] border border-orange-200 font-bold">
                  {customer.noForm}
                </span>
              )}
              {hasHistory && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold flex items-center gap-1">
                  <GitMerge className="w-3 h-3 text-[#e46423]" />
                  <span>{customer.historyVisits?.length || 2}x Log Kunjungan Tergabung</span>
                </span>
              )}
            </div>
            <h3 className={`font-extrabold text-base mt-1 ${isLight ? 'text-[#005baa]' : 'text-slate-100'}`}>
              {customer.nama}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {onFocusMap && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFocusMap(customer);
                }}
                className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition ${
                  isLight
                    ? 'bg-[#005baa] hover:bg-[#004b8d] text-white'
                    : 'bg-sky-600 hover:bg-sky-500 text-white'
                }`}
                title="Tunjukkan di Peta Satelit"
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Peta</span>
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg ${
                isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              } transition`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* Status Explanation Banner */}
          <div className={`p-3 rounded-xl border ${statusInfo.bg}`}>
            <div className="font-bold mb-0.5">{statusInfo.text}</div>
            <div className="text-[11px] opacity-90">{statusInfo.desc}</div>
          </div>

          {/* AppSheet Form & Location Detail Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className={`text-[10px] uppercase font-bold mb-1 flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                <MapPin className="w-3 h-3 text-[#005baa]" />
                <span>Wilayah &amp; Koordinat Properti</span>
              </div>
              <div className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{customer.zonaNama}</div>
              <div className={`text-[11px] mt-1 font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Lat: {customer.latitude.toFixed(6)}, Lng: {customer.longitude.toFixed(6)}
              </div>
              {customer.desa && (
                <div className={`text-[10px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Desa/Kel: {customer.desa} • Kec: {customer.kecamatan || '-'}
                </div>
              )}
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className={`text-[10px] uppercase font-bold mb-1 flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                <User className="w-3 h-3 text-[#005baa]" />
                <span>Petugas Sales &amp; Target Area</span>
              </div>
              <div className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{customer.salesNama}</div>
              <div className={`text-[11px] mt-1 flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{customer.timestamp || customer.tanggalSpreading}</span>
              </div>
              <div className="mt-1">
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-sky-100 text-[#005baa] border border-sky-200">
                  Target: {customer.jenisAreaTarget || 'Adhoc'}
                </span>
              </div>
            </div>
          </div>

          {/* Address & Contact */}
          <div
            className={`p-3.5 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            } space-y-2`}
          >
            <div>
              <div className={`text-[10px] uppercase font-bold mb-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                Alamat Lengkap Properti
              </div>
              <div className={`font-medium leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                {customer.alamat}
              </div>
            </div>
            <div className={`pt-2 border-t flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span className={`font-mono font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{customer.telepon}</span>
              </div>
              <a
                href={`https://wa.me/62${customer.telepon.replace(/\D/g, '').replace(/^0/, '')}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-sm transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Chat WhatsApp</span>
              </a>
            </div>
          </div>

          {/* 🌟 Riwayat Kunjungan Spreading Tergabung (Merge Audit History) */}
          {customer.historyVisits && customer.historyVisits.length > 0 && (
            <div
              className={`p-4 rounded-xl border ${
                isLight ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-950 border-amber-900/80'
              } space-y-3`}
            >
              <div className="flex items-center justify-between text-xs pb-2 border-b border-amber-200 dark:border-amber-900">
                <div>
                  <span className={`font-black flex items-center gap-1.5 ${isLight ? 'text-amber-950' : 'text-amber-200'}`}>
                    <GitMerge className="w-4 h-4 text-[#e46423]" />
                    <span>Riwayat Lengkap Data Kunjungan yang Di-Merge ({customer.historyVisits.length}x Survei)</span>
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Data survei asal tetap tersimpan lengkap dalam riwayat properti ini
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500 text-white font-bold">
                  Audit Log
                </span>
              </div>

              {customer.analystNote && (
                <div className={`p-2.5 rounded-lg border text-[11px] ${
                  isLight ? 'bg-white border-amber-200 text-slate-700' : 'bg-slate-900 border-amber-800/60 text-slate-300'
                }`}>
                  <strong>Catatan Verifikasi Analis:</strong> {customer.analystNote}
                </div>
              )}

              <div className="space-y-2">
                {customer.historyVisits.map((visit, idx) => (
                  <div
                    key={visit.visitId || idx}
                    className={`p-3 rounded-lg border text-[11px] ${
                      isLight ? 'bg-white border-slate-200 text-slate-800 shadow-xs' : 'bg-slate-900 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-100 text-[#e46423] font-bold">
                          Kunjungan #{customer.historyVisits!.length - idx}
                        </span>
                        <span>{visit.salesNama}</span>
                        {visit.noForm && <span className="text-slate-400 font-mono font-normal">({visit.noForm})</span>}
                      </div>
                      <span className="font-mono text-slate-500 text-[10px]">{visit.timestamp || visit.tanggalSpreading}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px]">Status: </span>
                        <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                          visit.statusMinat === 'Minat' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {visit.statusMinat}
                        </span>
                      </div>
                      {visit.coordinates && (
                        <div className="font-mono text-[10px] text-slate-500">
                          GPS: {visit.coordinates[0].toFixed(5)}, {visit.coordinates[1].toFixed(5)}
                        </div>
                      )}
                    </div>

                    {visit.catatanSales && (
                      <div className="mt-1.5 text-[11px] italic text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-1.5 rounded">
                        &quot;{visit.catatanSales}&quot;
                      </div>
                    )}

                    {visit.fotoProperti && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setEnlargedPhoto(formatPhotoUrl(visit.fotoProperti))}
                          className="px-2 py-1 rounded bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900 text-[10px] font-bold text-[#005baa] dark:text-sky-300 transition flex items-center gap-1 border border-sky-200 dark:border-sky-800"
                        >
                          <Camera className="w-3 h-3 text-[#005baa]" />
                          <span>Lihat Foto Survei Kunjungan #{customer.historyVisits!.length - idx}</span>
                        </button>
                        <a
                          href={formatPhotoUrl(visit.fotoProperti)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-slate-400 hover:text-sky-500 font-mono flex items-center gap-0.5"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>Link</span>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alasan Tidak Minat / Catatan Form */}
          {(customer.alasanTidakMinat || customer.alasan || customer.catatanSales) && (
            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              } space-y-2`}
            >
              {(customer.alasanTidakMinat || customer.alasan) && (
                <div>
                  <div className={`text-[10px] uppercase font-bold mb-0.5 ${isLight ? 'text-rose-800' : 'text-rose-400'}`}>
                    Alasan Tidak Minat
                  </div>
                  <div className={`p-2 rounded-lg border text-xs ${
                    isLight ? 'bg-rose-50 border-rose-200 text-rose-900 font-medium' : 'bg-rose-950/40 border-rose-900 text-rose-300'
                  }`}>
                    {customer.alasanTidakMinat || customer.alasan}
                  </div>
                </div>
              )}
              {customer.catatanSales && (
                <div>
                  <div className={`text-[10px] uppercase font-bold mb-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                    Catatan Sales / Keterangan Form
                  </div>
                  <div className={`italic ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {customer.catatanSales}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 📊 Semua Kolom Data Spreadsheet (Hasil Sinkronisasi Lengkap) */}
          <div
            className={`p-3.5 rounded-xl border ${
              isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950 border-slate-800'
            } space-y-2.5`}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-[#005baa]" />
                <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Semua Kolom Data Spreadsheet (Hasil Sinkronisasi)
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Semua Kolom Aktif</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">No Form</span>
                <span className="font-mono font-bold text-[#e46423]">{customer.noForm || '-'}</span>
              </div>

              <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Status Minat</span>
                <span className={`font-bold ${customer.statusMinat === 'Minat' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ● {customer.statusMinat}
                </span>
              </div>

              <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Jenis Area</span>
                <span className="font-bold">{customer.jenisAreaTarget || 'Adhoc'}</span>
              </div>

              <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Blok / No Rumah</span>
                <span className="font-medium">{[customer.blok ? `Blok ${customer.blok}` : '', customer.nomorRumah ? `No ${customer.nomorRumah}` : ''].filter(Boolean).join(', ') || '-'}</span>
              </div>

              <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">RT / RW</span>
                <span className="font-medium">{[customer.rt ? `RT ${customer.rt}` : '', customer.rw ? `RW ${customer.rw}` : ''].filter(Boolean).join(' / ') || '-'}</span>
              </div>

              <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Desa &amp; Kecamatan</span>
                <span className="font-medium">{[customer.desa, customer.kecamatan].filter(Boolean).join(', ') || '-'}</span>
              </div>

              <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Petugas Sales</span>
                <span className="font-bold">{customer.salesNama}</span>
              </div>

              <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Zona Pelayanan</span>
                <span className="font-medium">{customer.zonaNama}</span>
              </div>

              <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Koordinat GPS</span>
                <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300">{customer.latitude.toFixed(5)}, {customer.longitude.toFixed(5)}</span>
              </div>
            </div>

            {/* Kolom Mentah Asli Lainnya dari Spreadsheet */}
            {customer.rawRow && Object.keys(customer.rawRow).length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                  Seluruh Kolom Mentah Spreadsheet ({Object.keys(customer.rawRow).length} Kolom):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                  {Object.entries(customer.rawRow).map(([rk, rv]) => (
                    <div key={rk} className={`p-1.5 rounded border text-[11px] flex justify-between gap-2 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                      <span className="text-slate-400 font-mono text-[10px] shrink-0">{rk}:</span>
                      <span className={`font-medium truncate text-right ${rk.toLowerCase().includes('minat') ? (String(rv).toLowerCase().includes('tidak') ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold') : ''}`} title={String(rv)}>
                        {rv !== undefined && rv !== null && String(rv).trim() !== '' ? String(rv) : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Foto Properti */}
          {mainPhotoUrl && (
            <div
              className={`p-3.5 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              } space-y-2.5`}
            >
              <div className="flex items-center justify-between">
                <div className={`text-[10px] uppercase font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  <Camera className="w-3.5 h-3.5 text-[#005baa]" />
                  <span>Foto Properti / Rumah</span>
                </div>
                <a
                  href={mainPhotoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-[#005baa] dark:text-sky-400 hover:underline font-bold flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Buka Tautan Asli ↗</span>
                </a>
              </div>

              <div
                className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer group bg-slate-950 max-h-56 flex items-center justify-center"
                onClick={() => setEnlargedPhoto(mainPhotoUrl)}
                title="Klik untuk memperbesar foto properti"
              >
                <img
                  src={mainPhotoUrl}
                  alt="Foto Properti"
                  className="w-full max-h-56 object-cover group-hover:scale-102 transition duration-200"
                  onError={(e) => {
                    const target = e.target as HTMLElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const notice = document.createElement('div');
                      notice.className = 'text-center p-6 text-slate-400 text-xs bg-slate-900 w-full';
                      notice.innerHTML = '📷 Gambar memerlukan izin akses langsung atau link eksternal.<br/><a href="' + mainPhotoUrl + '" target="_blank" rel="noreferrer" class="mt-2 inline-block text-sky-400 font-bold underline">Buka Tautan Foto di Tab Baru ↗</a>';
                      parent.appendChild(notice);
                    }
                  }}
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="bg-black/75 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    🔍 Perbesar Foto
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Status Update */}
          {onUpdateStatus && (
            <div className="pt-2">
              <div className={`text-[11px] font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                Ubah Status Minat Pelanggan Langsung:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdateStatus(customer.id, 'Minat')}
                  className={`py-2 px-3 rounded-lg font-bold text-center transition border ${
                    customer.statusMinat === 'Minat'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : isLight
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                  }`}
                >
                  ✓ Set Minat
                </button>
                <button
                  onClick={() => onUpdateStatus(customer.id, 'Tidak Minat')}
                  className={`py-2 px-3 rounded-lg font-bold text-center transition border ${
                    customer.statusMinat === 'Tidak Minat'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : isLight
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-rose-950/70 hover:bg-rose-900 text-rose-300 border-rose-800'
                  }`}
                >
                  ✕ Set Tidak Minat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          } flex flex-wrap items-center justify-between gap-2`}
        >
          <div className="flex items-center gap-2">
            {onFocusMap && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFocusMap(customer);
                }}
                className="px-3.5 py-1.5 text-xs font-bold bg-[#005baa] hover:bg-[#004b8d] text-white rounded-lg transition shadow-sm flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>📍 Tunjukkan di Peta</span>
              </button>
            )}

            {onDeleteCustomer && (
              isConfirmingDelete ? (
                <div className="flex items-center gap-1.5 animate-in fade-in">
                  <span className="text-[11px] font-bold text-rose-600">Yakin hapus?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteCustomer(customer.id);
                      setIsConfirmingDelete(false);
                      onClose();
                    }}
                    className="px-2.5 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition shadow-xs"
                  >
                    Ya, Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-2 py-1 text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hapus Data</span>
                </button>
              )
            )}
          </div>

          <button
            onClick={onClose}
            className={`px-4 py-1.5 font-bold rounded-lg text-xs transition ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Lightbox Modal Foto Perbesar */}
      {enlargedPhoto && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setEnlargedPhoto(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950 text-white">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#38bdf8]" />
                <span className="font-bold text-xs">Foto Properti Lengkap - {customer.nama}</span>
              </div>
              <button
                type="button"
                onClick={() => setEnlargedPhoto(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-black flex items-center justify-center min-h-[300px] max-h-[75vh] overflow-hidden">
              <img
                src={enlargedPhoto}
                alt="Foto Properti"
                className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-2xl"
              />
            </div>
            <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">{customer.alamat}</span>
              <a
                href={enlargedPhoto}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold transition flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka di Tab Baru ↗</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
