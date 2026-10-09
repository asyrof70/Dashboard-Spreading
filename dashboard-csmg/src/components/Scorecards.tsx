import React from 'react';
import { CustomerSurvey } from '../types/gis';
import { Users, CheckCircle2, XCircle, TrendingUp, Droplets, Home, Clock } from 'lucide-react';

interface ScorecardsProps {
  customers: CustomerSurvey[];
  totalPipelineLengthKm: number;
}

export const Scorecards: React.FC<ScorecardsProps> = ({ customers, totalPipelineLengthKm }) => {
  const totalProperties = customers.length;
  const totalVisits = customers.reduce((acc, c) => {
    return acc + (c.historyVisits && c.historyVisits.length > 0 ? c.historyVisits.length : 1);
  }, 0);

  const mergedCount = customers.filter(
    (c) => c.isMerged || (c.historyVisits && c.historyVisits.length > 1)
  ).length;

  const minat = customers.filter((c) => c.statusMinat === 'Minat').length;
  const tidakMinat = customers.filter((c) => c.statusMinat === 'Tidak Minat').length;

  const konversiRate = totalProperties > 0 ? ((minat / totalProperties) * 100).toFixed(1) : '0';
  const pipelineReachable = customers.filter((c) => (c.jarakKePipaMeter ?? 0) <= 50).length;
  const reachableRate = totalProperties > 0 ? ((pipelineReachable / totalProperties) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
      {/* 1. Total Kunjungan Spreading (Tetap Tidak Berubah saat di-Merge) */}
      <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl shadow-sm flex flex-col justify-between hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Kunjungan</span>
          <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg" title="Total seluruh input survei lapangan sales (Tetap terjaga)">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-white tracking-tight">{totalVisits}</div>
          <p className="text-[11px] text-sky-400 mt-0.5 font-medium">
            Log survei spreading sales
          </p>
        </div>
      </div>

      {/* 2. Total Properti / Rumah Fisik Unik (Berkurang saat di-Merge) */}
      <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl shadow-sm flex flex-col justify-between hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Properti Fisik</span>
          <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg" title="Jumlah rumah / objek fisik unik di lapangan">
            <Home className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-white tracking-tight">{totalProperties}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {mergedCount > 0 ? `${mergedCount} properti hasil merge multi-kunjungan` : 'Titik rumah / calon pelanggan'}
          </p>
        </div>
      </div>

      {/* 3. Potensi Konversi (%) */}
      <div className="bg-slate-900/90 border border-emerald-900/40 p-3.5 rounded-xl shadow-sm flex flex-col justify-between hover:border-emerald-800/60 transition bg-gradient-to-br from-slate-900 to-emerald-950/20">
        <div className="flex items-center justify-between text-emerald-400 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Konversi Minat</span>
          <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-emerald-400 tracking-tight">{konversiRate}%</div>
          <p className="text-[11px] text-emerald-300/80 mt-0.5 font-medium">{minat} Siap Pasang Sambungan</p>
        </div>
      </div>

      {/* 4. Minat vs Tidak Minat */}
      <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl shadow-sm flex flex-col justify-between hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Status Respon</span>
          <div className="flex items-center gap-1">
            <div className="p-1 bg-emerald-500/10 text-emerald-400 rounded">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="p-1 bg-rose-500/10 text-rose-400 rounded">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 text-xl font-black tracking-tight">
            <span className="text-emerald-400">{minat}</span>
            <span className="text-slate-600 font-normal">/</span>
            <span className="text-rose-400">{tidakMinat}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
            <span className="text-emerald-400 font-bold">{minat} Minat</span>
            <span>•</span>
            <span className="text-rose-400 font-bold">{tidakMinat} Tolak</span>
          </div>
        </div>
      </div>

      {/* 5. Total Panjang Jaringan Pipa */}
      <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl shadow-sm flex flex-col justify-between hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-sky-400 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Pipa Aktif</span>
          <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg">
            <Droplets className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-white tracking-tight">{totalPipelineLengthKm} <span className="text-xs font-normal text-slate-400">km</span></div>
          <p className="text-[11px] text-sky-300/80 mt-0.5 font-medium">{reachableRate}% survei &lt; 50m pipa</p>
        </div>
      </div>
    </div>
  );
};
