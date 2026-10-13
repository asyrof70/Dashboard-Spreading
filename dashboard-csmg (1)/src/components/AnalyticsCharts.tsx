import React, { useState } from 'react';
import { CustomerSurvey, SalesRep, ZoneArea } from '../types/gis';
import { BarChart3, PieChart, MapPin, UserCheck, Award, ArrowUpRight } from 'lucide-react';

interface AnalyticsChartsProps {
  customers: CustomerSurvey[];
  salesList: SalesRep[];
  zones: ZoneArea[];
  onSelectZone: (zoneId: string) => void;
  onSelectSales: (salesId: string) => void;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  customers,
  salesList,
  zones,
  onSelectZone,
  onSelectSales,
}) => {
  const [activeTab, setActiveTab] = useState<'sales' | 'zona' | 'conversion'>('sales');

  // Kalkulasi data per sales berdasarkan customer data aktif (termasuk filter)
  const salesPerformance = salesList.map((s) => {
    const custs = customers.filter((c) => c.salesNama === s.nama || c.salesId === s.id);
    const total = custs.length;
    const minat = custs.filter((c) => c.statusMinat === 'Minat').length;
    const tidakMinat = custs.filter((c) => c.statusMinat === 'Tidak Minat').length;
    const rate = total > 0 ? (minat / total) * 100 : 0;

    return {
      ...s,
      total,
      minat,
      tidakMinat,
      rate: parseFloat(rate.toFixed(1)),
    };
  }).sort((a, b) => b.minat - a.minat);

  // Kalkulasi data per zona
  const zonePerformance = zones.map((z) => {
    const custs = customers.filter((c) => c.zonaId === z.id || c.zonaNama.includes(z.kecamatan));
    const total = custs.length;
    const minat = custs.filter((c) => c.statusMinat === 'Minat').length;
    const tidakMinat = custs.filter((c) => c.statusMinat === 'Tidak Minat').length;
    const rate = total > 0 ? (minat / total) * 100 : 0;

    return {
      ...z,
      total,
      minat,
      tidakMinat,
      rate: parseFloat(rate.toFixed(1)),
    };
  }).sort((a, b) => b.minat - a.minat);

  // Total summary
  const totalMinat = customers.filter((c) => c.statusMinat === 'Minat').length;
  const totalTidakMinat = customers.filter((c) => c.statusMinat === 'Tidak Minat').length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
      {/* Header and Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-bold text-slate-100 flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <span>Scorecard & Analisis Minat Pelanggan</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoring performa sales spreading lapangan dan penetrasi wilayah Aetra Tangerang
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              activeTab === 'sales' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Performa Sales
          </button>
          <button
            onClick={() => setActiveTab('zona')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              activeTab === 'zona' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Akumulasi Zona
          </button>
          <button
            onClick={() => setActiveTab('conversion')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              activeTab === 'conversion' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Rasio Minat
          </button>
        </div>
      </div>

      {/* Tab Content: Performa Sales */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Nama Sales</th>
                  <th className="py-2.5 px-3 text-center">Spreading</th>
                  <th className="py-2.5 px-3 text-center text-emerald-400">Minat</th>
                  <th className="py-2.5 px-3 text-center text-rose-400">Tidak Minat</th>
                  <th className="py-2.5 px-3">Konversi Rate</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {salesPerformance.map((sales, index) => (
                  <tr key={sales.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-medium text-slate-200 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-sky-400 border border-slate-700">
                        {index + 1}
                      </div>
                      <div>
                        <div>{sales.nama}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{sales.nip}</div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-200">{sales.total}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-400 bg-emerald-950/10">
                      {sales.minat}
                    </td>
                    <td className="py-2.5 px-3 text-center text-rose-400">{sales.tidakMinat}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-800 rounded-full h-2 overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-2 rounded-full"
                            style={{ width: `${Math.min(sales.rate, 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-emerald-400 text-[11px]">{sales.rate}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectSales(sales.id)}
                        className="text-[11px] px-2 py-1 bg-slate-800 hover:bg-sky-600 hover:text-white rounded text-slate-300 font-medium transition"
                      >
                        Filter Peta
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Visual Stacked Bars Per Sales */}
          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
            <div className="text-xs font-semibold text-slate-300 mb-2">Visual Proporsi Hasil Spreading per Sales</div>
            <div className="space-y-2">
              {salesPerformance.map((sales) => {
                const total = Math.max(sales.total, 1);
                const pMinat = (sales.minat / total) * 100;
                const pTidak = (sales.tidakMinat / total) * 100;

                return (
                  <div key={sales.id} className="text-xs">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                      <span className="font-medium text-slate-300">{sales.nama}</span>
                      <span>{sales.total} survei • <strong className="text-emerald-400">{sales.minat} Minat</strong></span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${pMinat}%` }}
                        className="bg-emerald-500 h-full"
                        title={`Minat: ${sales.minat} (${pMinat.toFixed(1)}%)`}
                      />
                      <div
                        style={{ width: `${pTidak}%` }}
                        className="bg-rose-500 h-full"
                        title={`Tidak Minat: ${sales.tidakMinat} (${pTidak.toFixed(1)}%)`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-slate-400 border-t border-slate-850 pt-2">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-emerald-500"></span> Minat</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-rose-500"></span> Tidak Minat</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Akumulasi Zona */}
      {activeTab === 'zona' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {zonePerformance.map((z) => (
              <div
                key={z.id}
                className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg hover:border-sky-500/50 transition cursor-pointer"
                onClick={() => onSelectZone(z.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-semibold">
                      {z.kode}
                    </span>
                    <h4 className="font-bold text-slate-200 text-xs mt-1">{z.nama}</h4>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      z.statusJaringan === 'Jaringan Aktif'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                        : z.statusJaringan === 'Perluasan Segera'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                        : 'bg-purple-950 text-purple-300 border border-purple-800/60'
                    }`}
                  >
                    {z.statusJaringan}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 text-center py-2 bg-slate-900/60 rounded my-2 text-[11px]">
                  <div>
                    <div className="text-slate-400 text-[10px]">Total</div>
                    <div className="font-bold text-slate-200">{z.total}</div>
                  </div>
                  <div>
                    <div className="text-emerald-400 text-[10px]">Minat</div>
                    <div className="font-bold text-emerald-400">{z.minat}</div>
                  </div>
                  <div>
                    <div className="text-rose-400 text-[10px]">Tidak Minat</div>
                    <div className="font-bold text-rose-400">{z.tidakMinat}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Target: {z.targetSambungan} SL</span>
                  <span className="text-sky-400 font-semibold flex items-center gap-0.5">
                    Filter Peta <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Rasio Konversi Minat Global */}
      {activeTab === 'conversion' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800">
            <h4 className="font-semibold text-slate-200 text-xs mb-3 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <span>Proporsi Akumulasi Minat Pelanggan</span>
            </h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-400 font-medium">Minat (Siap Pasang)</span>
                  <span className="text-slate-200 font-bold">
                    {totalMinat} ({customers.length > 0 ? ((totalMinat / customers.length) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${customers.length > 0 ? (totalMinat / customers.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-rose-400 font-medium">Tidak Minat / Tolak</span>
                  <span className="text-slate-200 font-bold">
                    {totalTidakMinat} ({customers.length > 0 ? ((totalTidakMinat / customers.length) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full"
                    style={{ width: `${customers.length > 0 ? (totalTidakMinat / customers.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div>
              <h4 className="font-semibold text-slate-200 text-xs mb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-sky-400" />
                <span>Rekomendasi GIS & Strategi Sambungan Pelanggan</span>
              </h4>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>
                    <strong>Prioritas Sambungan Langganan (SL):</strong> {totalMinat} pelanggan minat berada dalam jangkauan pipa aktif yang siap disambung meteran PAM.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>
                    <strong>Evaluasi Penolakan:</strong> {totalTidakMinat} pelanggan tidak berminat karena masih memanfaatkan sumur pribadi atau kendala biaya awal.
                  </span>
                </li>
              </ul>
            </div>
            <div className="mt-3 p-2.5 bg-sky-950/40 border border-sky-800/40 rounded text-[11px] text-sky-300">
              💡 <strong>Integrasi GIS:</strong> Unggah file KMZ / KML / GeoJSON / SHP jaringan pipa untuk mengecek otomatis jarak titik pelanggan ke pipa aktif terdekat.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
