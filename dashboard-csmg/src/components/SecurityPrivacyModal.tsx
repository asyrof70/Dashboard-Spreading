import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  HardDrive,
  Globe,
  Database,
  CheckCircle2,
  Trash2,
  ExternalLink,
  AlertCircle,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';

interface SecurityPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeLayersCount: number;
  serviceZoneLayersCount: number;
  customerSurveysCount: number;
  theme?: 'light' | 'dark';
  onClearLocalCache?: () => void;
}

export const SecurityPrivacyModal: React.FC<SecurityPrivacyModalProps> = ({
  isOpen,
  onClose,
  pipeLayersCount,
  serviceZoneLayersCount,
  customerSurveysCount,
  theme = 'light',
  onClearLocalCache,
}) => {
  const [dbSizeEstimate, setDbSizeEstimate] = useState<string>('Menghitung...');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isLight = theme === 'light';

  useEffect(() => {
    if (!isOpen) return;

    // Hitung perkiraan kuota dan pemakaian IndexedDB
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then((estimate) => {
        const usageBytes = estimate.usage || 0;
        const quotaBytes = estimate.quota || 0;
        const usageMB = (usageBytes / (1024 * 1024)).toFixed(2);
        const quotaMB = (quotaBytes / (1024 * 1024)).toFixed(0);
        setDbSizeEstimate(`${usageMB} MB (Tersedia hingga ~${quotaMB} MB di perangkat ini)`);
      }).catch(() => {
        setDbSizeEstimate('Tersimpan di IndexedDB Peramban');
      });
    } else {
      setDbSizeEstimate('Tersimpan Lokal di Peramban');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div
        className={`${
          isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900 text-slate-100 border-slate-800'
        } border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b ${
            isLight ? 'bg-emerald-50/70 border-emerald-100' : 'bg-slate-950 border-slate-800'
          } flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Keamanan & Privasi Data IndexedDB</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  100% Client-Side Safe
                </span>
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Informasi arsitektur keamanan, privasi data pengguna, dan isolasi browser pasca-deploy.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition ${
              isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-thin text-xs leading-relaxed">
          {/* Ringkasan Eksekutif */}
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Apakah data saya aman setelah web di-deploy ke internet?</span>
            </div>
            <p className="text-[11.5px] text-slate-700 dark:text-slate-300">
              <strong>YA, SANGAT AMAN.</strong> Data file spasial (KMZ, KML, SHP, GeoJSON) dan spreadsheet data pelanggan yang Anda unggah disimpan <strong>secara eksklusif di dalam peramban (browser) komputer Anda sendiri</strong> melalui teknologi W3C IndexedDB Sandbox. Data <strong>TIDAK diunggah ke server cloud publik</strong> atau pihak ketiga mana pun tanpa otorisasi Anda.
            </p>
          </div>

          {/* 4 Pilar Keamanan IndexedDB */}
          <div className="space-y-2.5">
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-[#005baa] dark:text-sky-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>4 Pilar Jaminan Keamanan & Privasi</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Pilar 1 */}
              <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'} space-y-1`}>
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-[11.5px]">
                  <HardDrive className="w-3.5 h-3.5 text-[#005baa]" />
                  <span>1. 100% Client-Side Storage</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Data Anda menetap di media penyimpanan lokal laptop/PC Anda. Pengguna lain yang membuka tautan web dari laptop mereka tidak dapat melihat data lokal Anda.
                </p>
              </div>

              {/* Pilar 2 */}
              <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'} space-y-1`}>
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-[11.5px]">
                  <Globe className="w-3.5 h-3.5 text-[#005baa]" />
                  <span>2. Same-Origin Policy (SOP)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Peramban menerapkan isolasi ketat tingkat kernel sandboxing. Website atau domain luar mana pun secara teknis dilarang mengakses IndexedDB aplikasi ini.
                </p>
              </div>

              {/* Pilar 3 */}
              <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'} space-y-1`}>
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-[11.5px]">
                  <Lock className="w-3.5 h-3.5 text-[#005baa]" />
                  <span>3. Enkripsi Transport (HTTPS)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Setelah di-deploy di web hosting, seluruh komunikasi dilindungi sertifikat SSL/TLS. Tidak ada celah penyadapan data pada jaringan transit.
                </p>
              </div>

              {/* Pilar 4 */}
              <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'} space-y-1`}>
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-[11.5px]">
                  <Database className="w-3.5 h-3.5 text-[#005baa]" />
                  <span>4. Kendali Penuh Pengguna</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Anda bebas menghapus satu layer atau membersihkan seluruh cache database kapan saja. Menghapus riwayat browser juga akan langsung memusnahkan data lokal.
                </p>
              </div>
            </div>
          </div>

          {/* Audit Data Lokal Saat Ini */}
          <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-sky-50/50 border-sky-200' : 'bg-sky-950/20 border-sky-800'} space-y-2`}>
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-[#005baa]" />
                <span>Audit Data Lokal yang Tersimpan di Browser Anda:</span>
              </span>
              <span className="text-[10.5px] font-mono text-[#005baa] dark:text-sky-300 font-bold">{dbSizeEstimate}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
              <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-sky-100' : 'bg-slate-900 border-slate-800'}`}>
                <div className="text-base font-extrabold text-[#005baa] dark:text-sky-400">{pipeLayersCount}</div>
                <div className="text-[9.5px] font-sans text-slate-500">File Pipa</div>
              </div>
              <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-sky-100' : 'bg-slate-900 border-slate-800'}`}>
                <div className="text-base font-extrabold text-[#005baa] dark:text-sky-400">{serviceZoneLayersCount}</div>
                <div className="text-[9.5px] font-sans text-slate-500">File Zona</div>
              </div>
              <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-sky-100' : 'bg-slate-900 border-slate-800'}`}>
                <div className="text-base font-extrabold text-[#005baa] dark:text-sky-400">{customerSurveysCount}</div>
                <div className="text-[9.5px] font-sans text-slate-500">Survei Pelanggan</div>
              </div>
            </div>
          </div>

          {/* Tips Keamanan Perusahaan */}
          <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-700 dark:text-slate-300">💡 Praktik Terbaik untuk Komputer Kantor Bersama:</span>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              <li>Jika menggunakan komputer bersama / publik, bersihkan cache peramban atau gunakan profil browser pribadi saat selesai bekerja.</li>
              <li>Selalu pastikan URL yang diakses diawali <strong>https://</strong> untuk menjamin enkripsi lalu lintas data.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-slate-800'
          }`}
        >
          {onClearLocalCache && (
            <div>
              {showClearConfirm ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-rose-600 font-bold">Yakin bersihkan data lokal?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearLocalCache();
                      setShowClearConfirm(false);
                      onClose();
                    }}
                    className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700"
                  >
                    Ya, Bersihkan
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2 py-1 rounded border text-[10px] text-slate-500 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="text-rose-600 hover:underline text-[11px] font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Semua Data Lokal</span>
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#005baa] hover:bg-[#004b8d] text-white font-bold text-xs shadow-xs transition ml-auto"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
