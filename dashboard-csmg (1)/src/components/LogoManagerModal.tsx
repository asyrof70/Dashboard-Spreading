import React, { useState, useEffect, useRef } from 'react';
import {
  getCustomLogoUrl,
  saveCustomLogoUrl,
  resetCustomLogoUrl,
  removeCustomLogo,
  isLogoRemoved,
  isUsingCustomLogo,
  getCustomLogoHeight,
  saveCustomLogoHeight,
  compressImageForLogo,
  DEFAULT_AETRA_LOGO_SVG,
} from '../utils/logoStorage';
import {
  Image as ImageIcon,
  Upload,
  X,
  Check,
  RotateCcw,
  Sliders,
  AlertCircle,
  Trash2,
  Sparkles,
  Info,
} from 'lucide-react';

interface LogoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export const LogoManagerModal: React.FC<LogoManagerModalProps> = ({
  isOpen,
  onClose,
  theme = 'light',
}) => {
  const isLight = theme === 'light';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState<string>(getCustomLogoUrl());
  const [logoHeight, setLogoHeight] = useState<number>(getCustomLogoHeight());
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [previewError, setPreviewError] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const isCurrentLogoRemoved = !logoUrl || isLogoRemoved();
  const isSampleDefault = logoUrl === DEFAULT_AETRA_LOGO_SVG;
  const isCustomUploaded = isUsingCustomLogo();

  useEffect(() => {
    if (isOpen) {
      setLogoUrl(getCustomLogoUrl());
      setLogoHeight(getCustomLogoHeight());
      setPreviewError(false);
      setSavedSuccess(false);
      setActionNotice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle local image file upload (PNG, JPG, SVG, WebP) with auto compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert('Ukuran file terlalu besar. Maksimal ukuran file logo adalah 8 MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawResult = event.target?.result as string;
        if (rawResult) {
          // Kompresi otomatis gambar agar ukuran ringan (<50KB) dan permanen tersimpan tanpa batas memori
          const optimized = await compressImageForLogo(rawResult, 110);
          setLogoUrl(optimized);
          setPreviewError(false);
          setActionNotice('File logo berhasil dipilih. Klik "Simpan Logo" untuk menerapkan permanen.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Apply custom URL input
  const handleApplyUrl = () => {
    if (customUrlInput.trim()) {
      setLogoUrl(customUrlInput.trim());
      setPreviewError(false);
      setActionNotice('URL logo berhasil dipasang. Klik "Simpan Logo" untuk menyimpan.');
    }
  };

  // Hapus logo yang jadi contoh
  const handleDeleteSampleLogo = () => {
    removeCustomLogo();
    setLogoUrl('');
    setPreviewError(false);
    setActionNotice('Logo contoh berhasil dihapus. Header aplikasi sekarang menggunakan teks brand yang bersih.');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  // Save changes
  const handleSave = () => {
    if (!logoUrl) {
      removeCustomLogo();
    } else {
      saveCustomLogoUrl(logoUrl);
    }
    saveCustomLogoHeight(logoHeight);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  // Reset to default sample
  const handleReset = () => {
    resetCustomLogoUrl();
    setLogoUrl(DEFAULT_AETRA_LOGO_SVG);
    setLogoHeight(34);
    setPreviewError(false);
    setCustomUrlInput('');
    setActionNotice('Logo bawaan contoh Aetra berhasil dipulihkan.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`${
          isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900 text-slate-100 border-slate-700/80'
        } border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isLight ? 'bg-[#005baa]/10 text-[#005baa]' : 'bg-sky-500/10 text-sky-400'
              }`}
            >
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-extrabold ${isLight ? 'text-[#005baa]' : 'text-slate-100'}`}>
                Pengaturan &amp; Logo Aetra Tangerang
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Kelola logo header: ganti dengan file resmi, ubah ukuran, atau hapus logo contoh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            } transition`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status Badge */}
          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            isCurrentLogoRemoved
              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
              : isCustomUploaded
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : 'bg-blue-50/80 border-blue-200 text-blue-900'
          }`}>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span className="font-semibold text-[11px]">
                Status Logo:{' '}
                <strong>
                  {isCurrentLogoRemoved
                    ? 'Logo Dihapus (Hanya Teks Brand)'
                    : isCustomUploaded
                    ? 'Logo Kustom Resmi Terpasang'
                    : 'Logo Contoh Bawaan (Default SVG)'}
                </strong>
              </span>
            </div>
            {isCurrentLogoRemoved ? (
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-200/80 text-amber-950">
                Tanpa Gambar
              </span>
            ) : isCustomUploaded ? (
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-200/80 text-emerald-950">
                Kustom Aktif
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-200/80 text-blue-950">
                Contoh Bawaan
              </span>
            )}
          </div>

          {actionNotice && (
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[#005baa] text-[11px] font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-[#e46423]" />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* Live Preview Box */}
          <div className="space-y-1.5">
            <div className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'} flex items-center justify-between`}>
              <span>Pratinjau Tampilan Header:</span>
              <span className="font-mono text-[10px] text-slate-400">Tinggi: {logoHeight}px</span>
            </div>

            {/* Light Mode Preview */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isCurrentLogoRemoved ? (
                  <div className="px-2.5 py-1.5 bg-slate-100 rounded-lg flex items-center justify-center border border-dashed border-slate-300 text-slate-400 font-bold text-[10px]">
                    [Logo Contoh Dinonaktifkan]
                  </div>
                ) : (
                  <div className="px-2 py-1 bg-white rounded-lg flex items-center justify-center border border-slate-200/80 shadow-2xs">
                    {previewError ? (
                      <div className="text-[10px] text-rose-500 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Gagal memuat gambar</span>
                      </div>
                    ) : (
                      <img
                        src={logoUrl || DEFAULT_AETRA_LOGO_SVG}
                        alt="Logo Preview"
                        style={{ height: `${logoHeight}px`, width: 'auto' }}
                        className="object-contain"
                        onError={() => setPreviewError(true)}
                      />
                    )}
                  </div>
                )}
                <div>
                  <div className="font-extrabold text-xs text-[#005baa]">AETRA AIR TANGERANG</div>
                  <div className="text-[10px] text-slate-500">Spreading GIS &amp; Pemetaan Pelanggan</div>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-600 border border-slate-200">
                Mode Terang
              </span>
            </div>

            {/* Dark Mode Preview */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 shadow-xs flex items-center justify-between text-slate-100">
              <div className="flex items-center gap-2.5">
                {isCurrentLogoRemoved ? (
                  <div className="px-2.5 py-1.5 bg-slate-900 rounded-lg flex items-center justify-center border border-dashed border-slate-700 text-slate-500 font-bold text-[10px]">
                    [Logo Contoh Dinonaktifkan]
                  </div>
                ) : (
                  <div className="px-2 py-1 bg-white rounded-lg flex items-center justify-center shadow-xs">
                    <img
                      src={logoUrl || DEFAULT_AETRA_LOGO_SVG}
                      alt="Logo Preview"
                      style={{ height: `${logoHeight}px`, width: 'auto' }}
                      className="object-contain"
                    />
                  </div>
                )}
                <div>
                  <div className="font-extrabold text-xs text-white">AETRA AIR TANGERANG</div>
                  <div className="text-[10px] text-slate-400">Spreading GIS &amp; Pemetaan Pelanggan</div>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300 border border-slate-700">
                Mode Gelap
              </span>
            </div>
          </div>

          {/* Opsi Hapus Logo Contoh */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
            isLight ? 'bg-rose-50/40 border-rose-200' : 'bg-rose-950/20 border-rose-900/60'
          }`}>
            <div className="space-y-0.5 pr-2">
              <div className="font-bold text-rose-700 text-[11px] flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Hapus Logo yang Jadi Contoh</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-snug">
                Hilangkan gambar logo contoh bawaan agar header bersih menggunakan teks brand, atau siap untuk logo resmi Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeleteSampleLogo}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Logo</span>
            </button>
          </div>

          {/* Upload Local Image File */}
          <div
            className={`p-4 rounded-xl border-2 border-dashed ${
              isLight
                ? 'border-blue-200 bg-blue-50/40 hover:bg-blue-50/70 hover:border-[#005baa]'
                : 'border-slate-700 bg-slate-950/60 hover:border-sky-500'
            } transition text-center cursor-pointer`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-1.5">
              <div className="p-2.5 rounded-full bg-[#005baa]/10 text-[#005baa]">
                <Upload className="w-5 h-5" />
              </div>
              <span className={`font-bold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                Klik untuk Upload File Logo Aetra Baru dari Perangkat
              </span>
              <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Mendukung file PNG transparan, JPG, SVG, atau WebP (Tersimpan permanen &amp; anti hilang saat reload/update data)
              </p>
            </div>
          </div>

          {/* Atau Masukkan URL Gambar Langsung */}
          <div className="space-y-1.5">
            <label className={`text-[11px] font-bold block uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
              Atau Masukkan URL Gambar Logo:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://domain.com/logo-aetra.png"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                className={`flex-1 border rounded-lg px-3 py-1.5 text-xs focus:outline-none ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-800 focus:border-[#005baa]'
                    : 'bg-slate-950 border-slate-700 text-slate-200 focus:border-sky-500'
                }`}
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs transition"
              >
                Gunakan URL
              </button>
            </div>
          </div>

          {/* Slider Pengaturan Ukuran Tinggi Logo */}
          <div
            className={`p-3 rounded-xl border space-y-2 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className={`text-[11px] font-bold uppercase flex items-center gap-1.5 ${isLight ? 'text-[#005baa]' : 'text-sky-400'}`}>
                <Sliders className="w-3.5 h-3.5" />
                <span>Sesuaikan Ukuran Tinggi Logo:</span>
                <span className="font-mono text-xs font-bold text-[#e46423] ml-1">
                  {logoHeight}px
                </span>
              </label>

              <div className="flex items-center gap-1">
                {[24, 28, 34, 40, 48].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setLogoHeight(preset)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                      logoHeight === preset
                        ? 'bg-[#005baa] text-white shadow-xs'
                        : isLight
                        ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {preset}px
                  </button>
                ))}
              </div>
            </div>

            <input
              type="range"
              min="20"
              max="60"
              step="2"
              value={logoHeight}
              onChange={(e) => setLogoHeight(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-[#005baa]"
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3.5 border-t flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <button
            type="button"
            onClick={handleReset}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Kembalikan ke Logo Default Contoh Aetra"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Pulihkan Logo Bawaan</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
                isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#005baa] hover:bg-[#004b8d] text-white font-bold text-xs transition shadow-md shadow-[#005baa]/20 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{savedSuccess ? 'Tersimpan!' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

