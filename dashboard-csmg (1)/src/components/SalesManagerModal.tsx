import React, { useState, useEffect } from 'react';
import { SalesRep } from '../types/gis';
import {
  Users,
  UserPlus,
  Trash2,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface SalesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesList: SalesRep[];
  onSaveSalesList: (updatedList: SalesRep[], cascadeUpdateCustomers: boolean) => void;
  onResetDefaultSales: () => void;
  theme?: 'light' | 'dark';
}

export const SalesManagerModal: React.FC<SalesManagerModalProps> = ({
  isOpen,
  onClose,
  salesList,
  onSaveSalesList,
  onResetDefaultSales,
  theme = 'light',
}) => {
  const isLight = theme === 'light';

  const [editableSales, setEditableSales] = useState<SalesRep[]>([]);
  const [cascadeUpdate, setCascadeUpdate] = useState<boolean>(true);
  const [newSalesName, setNewSalesName] = useState<string>('');
  const [newSalesNip, setNewSalesNip] = useState<string>('');
  const [newSalesTarget, setNewSalesTarget] = useState<number>(100);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEditableSales(JSON.parse(JSON.stringify(salesList)));
      setIsAddingNew(false);
      setNewSalesName('');
      setNewSalesNip('');
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen, salesList]);

  if (!isOpen) return null;

  const handleNameChange = (id: string, newName: string) => {
    setEditableSales((prev) =>
      prev.map((s) => (s.id === id ? { ...s, nama: newName } : s))
    );
  };

  const handleNipChange = (id: string, newNip: string) => {
    setEditableSales((prev) =>
      prev.map((s) => (s.id === id ? { ...s, nip: newNip } : s))
    );
  };

  const handleTargetChange = (id: string, targetStr: string) => {
    const val = parseInt(targetStr, 10) || 0;
    setEditableSales((prev) =>
      prev.map((s) => (s.id === id ? { ...s, targetBulanan: val } : s))
    );
  };

  const handleDeleteSales = (id: string) => {
    if (editableSales.length <= 1) {
      setErrorMessage('Minimal harus ada 1 petugas sales di sistem.');
      return;
    }
    setEditableSales((prev) => prev.filter((s) => s.id !== id));
    setErrorMessage(null);
  };

  const handleAddNewSales = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalesName.trim()) {
      setErrorMessage('Nama sales tidak boleh kosong.');
      return;
    }

    const newId = `SLS-${Date.now().toString().slice(-4)}`;
    const newRep: SalesRep = {
      id: newId,
      nama: newSalesName.trim(),
      nip: newSalesNip.trim() || `AET-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`,
      targetBulanan: newSalesTarget || 100,
      zonaTugas: ['Zona Tangerang'],
      totalSpreading: 0,
      totalMinat: 0,
      konversiRate: 0,
    };

    setEditableSales((prev) => [...prev, newRep]);
    setNewSalesName('');
    setNewSalesNip('');
    setNewSalesTarget(100);
    setIsAddingNew(false);
    setErrorMessage(null);
  };

  const handleSave = () => {
    // Validasi
    const emptyName = editableSales.find((s) => !s.nama.trim());
    if (emptyName) {
      setErrorMessage('Nama sales tidak boleh ada yang kosong.');
      return;
    }

    onSaveSalesList(editableSales, cascadeUpdate);
    setSuccessMessage('✓ Daftar nama sales berhasil diperbarui!');
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleReset = () => {
    onResetDefaultSales();
    setSuccessMessage('✓ Daftar sales telah dikembalikan ke 5 petugas default.');
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div
        className={`${
          isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900 text-slate-100 border-slate-800'
        } border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
          } flex items-center justify-between shrink-0`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isLight ? 'bg-[#005baa]/10 text-[#005baa]' : 'bg-sky-500/10 text-sky-400'
              }`}
            >
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-extrabold text-sm sm:text-base ${isLight ? 'text-[#005baa]' : 'text-slate-100'}`}>
                Ubah &amp; Kelola Nama Petugas Sales
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Ubah nama sales untuk filter data, laporan, dan input survei spreading
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

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Status Feedback */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-relaxed font-bold">{successMessage}</span>
            </div>
          )}

          {/* List of Sales */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Daftar Petugas Sales ({editableSales.length}):
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="text-[#005baa] hover:underline font-bold text-xs flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Tambah Petugas Sales</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {editableSales.map((sales, idx) => (
                <div
                  key={sales.id}
                  className={`p-3 rounded-xl border transition ${
                    isLight ? 'bg-slate-50 border-slate-200 hover:border-[#005baa]/50' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#005baa] text-white flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 font-semibold">
                        ID: {sales.id}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSales(sales.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                      title="Hapus Petugas Sales Ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                        Nama Petugas Sales (Digunakan di Filter):
                      </label>
                      <input
                        type="text"
                        value={sales.nama}
                        onChange={(e) => handleNameChange(sales.id, e.target.value)}
                        placeholder="Nama Sales"
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-800 focus:border-[#005baa]'
                            : 'bg-slate-900 border-slate-700 text-slate-200 focus:border-sky-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                        NIP / Kode:
                      </label>
                      <input
                        type="text"
                        value={sales.nip}
                        onChange={(e) => handleNipChange(sales.id, e.target.value)}
                        placeholder="NIP Sales"
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-700'
                            : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Tambah Petugas Baru */}
          {isAddingNew && (
            <form
              onSubmit={handleAddNewSales}
              className={`p-3.5 rounded-xl border border-blue-200 animate-in fade-in ${
                isLight ? 'bg-blue-50/50' : 'bg-sky-950/30 border-sky-800'
              } space-y-2.5`}
            >
              <div className="font-bold text-xs text-[#005baa] flex items-center justify-between">
                <span>+ Tambah Petugas Sales Baru</span>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Nama Lengkap Sales:</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={newSalesName}
                    onChange={(e) => setNewSalesName(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">NIP / ID (Opsional):</label>
                  <input
                    type="text"
                    placeholder="Contoh: AET-2026-001"
                    value={newSalesNip}
                    onChange={(e) => setNewSalesNip(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3 py-1 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-[#005baa] text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  Tambahkan ke Daftar
                </button>
              </div>
            </form>
          )}

          {/* Opsi Update Data Pelanggan yang Sudah Ada */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-2.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}
          >
            <input
              type="checkbox"
              id="cascadeUpdateCheck"
              checked={cascadeUpdate}
              onChange={(e) => setCascadeUpdate(e.target.checked)}
              className="w-4 h-4 rounded text-[#005baa] cursor-pointer"
            />
            <label htmlFor="cascadeUpdateCheck" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
              Otomatis perbarui nama sales pada seluruh riwayat data survei pelanggan di dashboard
            </label>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3.5 border-t flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
          } shrink-0`}
        >
          <button
            type="button"
            onClick={handleReset}
            className={`flex items-center gap-1 text-xs font-bold transition ${
              isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Kembalikan ke 5 Petugas Sales Bawaan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Default</span>
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
              <span>Simpan Nama Sales</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
