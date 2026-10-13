import React, { useState } from 'react';
import {
  SUPABASE_SQL_SCHEMA,
  GOOGLE_APPS_SCRIPT_CODE,
  APPSHEET_WEBHOOK_GUIDE,
  VERCEL_DEPLOYMENT_GUIDE,
} from '../utils/supabaseSyncGuide';
import {
  Database,
  Code2,
  Send,
  Cloud,
  Copy,
  Check,
  X,
  ExternalLink,
  Terminal,
  Server,
  Sparkles,
} from 'lucide-react';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'sql' | 'apps_script' | 'appsheet' | 'vercel' | 'live_test'>('sql');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Supabase config test state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleTestConnection = async () => {
    if (!supabaseUrl || !supabaseKey) {
      setTestStatus('Isi Supabase Project URL dan Anon Key terlebih dahulu.');
      return;
    }

    setIsTesting(true);
    setTestStatus('Menghubungkan ke Supabase REST API...');

    try {
      const cleanUrl = supabaseUrl.replace(/\/$/, '');
      const res = await fetch(`${cleanUrl}/rest/v1/pelanggan?select=*&limit=1`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setTestStatus(`✅ Koneksi Berhasil! Tabel 'pelanggan' terdeteksi (HTTP 200). Ditemukan ${data.length} sample baris.`);
      } else {
        const errorText = await res.text();
        setTestStatus(`⚠️ Supabase merespons dengan status ${res.status}: ${errorText || 'Periksa tabel dan RLS policy'}`);
      }
    } catch (err: any) {
      setTestStatus(`❌ Gagal terhubung: ${err.message}. Pastikan URL valid dan CORS diizinkan.`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <span>Panduan Arsitektur &amp; Integrasi Supabase AppSheet</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  Production-Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Langkah demi langkah: Desain SQL Schema PostGIS, Google Apps Script / Webhook, dan Deployment Vercel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 overflow-x-auto text-xs font-semibold gap-1">
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'sql'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>1. SQL Schema Supabase</span>
          </button>

          <button
            onClick={() => setActiveTab('apps_script')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'apps_script'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>2. Google Apps Script</span>
          </button>

          <button
            onClick={() => setActiveTab('appsheet')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'appsheet'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>3. AppSheet Webhook Bot</span>
          </button>

          <button
            onClick={() => setActiveTab('vercel')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'vercel'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>4. GitHub &amp; Vercel Deploy</span>
          </button>

          <button
            onClick={() => setActiveTab('live_test')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'live_test'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>5. Tes Koneksi Supabase</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs leading-relaxed">
          {/* TAB 1: SQL SCHEMA */}
          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    Database Schema PostgreSQL 15+ dengan Ekstensi PostGIS
                  </h3>
                  <p className="text-slate-400 text-xs">
                    Jalankan script ini di menu <strong>SQL Editor</strong> pada dashboard Supabase Anda.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(SUPABASE_SQL_SCHEMA, 'sql')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md transition"
                >
                  {copiedKey === 'sql' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Seluruh SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-[450px]">
                <pre>{SUPABASE_SQL_SCHEMA}</pre>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <div className="font-bold text-sky-400">Keunggulan Arsitektur Database ini:</div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                  <li><strong>PostGIS Spatial Index (GIST):</strong> Mempercepat query radius dan intersection pipa jaringan PAM.</li>
                  <li><strong>Trigger fn_sync_pelanggan_geom:</strong> Otomatis mengubah lat/lng teks ke geometri spasial PostGIS dan menghitung jarak meter ke pipa terdekat.</li>
                  <li><strong>Row Level Security (RLS):</strong> Mengizinkan baca publik anonim untuk dashboard dan insert aman dari AppSheet.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE APPS SCRIPT */}
          {activeTab === 'apps_script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    Kode Google Apps Script (Auto-Sync dari Google Sheets ke Supabase)
                  </h3>
                  <p className="text-slate-400 text-xs">
                    Letakkan di <strong>Extensions &gt; Apps Script</strong> pada Google Spreadsheet yang terhubung ke AppSheet.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(GOOGLE_APPS_SCRIPT_CODE, 'gas')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-xs shadow-md transition"
                >
                  {copiedKey === 'gas' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Script</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-[450px]">
                <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
              </div>
            </div>
          )}

          {/* TAB 3: APPSHEET WEBHOOK */}
          {activeTab === 'appsheet' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  Metode Alternatif: AppSheet Automation Webhook (Direct REST API)
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Jika Anda ingin data dari mobile app sales langsung terkirim saat tombol <em>Save</em> ditekan tanpa menunggu trigger Google Sheets.
                </p>
              </div>

              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3 text-slate-300 text-xs">
                <div className="font-semibold text-slate-100">Langkah Konfigurasi di AppSheet:</div>
                <ol className="list-decimal list-inside space-y-2 text-slate-300">
                  <li>Buka app Anda di <strong>AppSheet Editor</strong>.</li>
                  <li>Masuk ke menu <strong>Automation &gt; Bots &gt; Create New Bot</strong>.</li>
                  <li>Atur trigger event: <strong>Data Change &gt; Adds and Updates</strong> pada tabel survei pelanggan.</li>
                  <li>Tambahkan step: <strong>Run a Task &gt; Call a Webhook</strong>.</li>
                  <li>
                    Isi konfigurasi webhook:
                    <div className="mt-2 p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1">
                      <div><strong>Url:</strong> https://&lt;PROJECT_REF&gt;.supabase.co/rest/v1/pelanggan</div>
                      <div><strong>Method:</strong> POST</div>
                      <div><strong>Headers:</strong></div>
                      <div className="pl-4 text-emerald-400">
                        apikey: &lt;SUPABASE_ANON_KEY&gt;<br />
                        Authorization: Bearer &lt;SUPABASE_ANON_KEY&gt;<br />
                        Content-Type: application/json<br />
                        Prefer: resolution=merge-duplicates
                      </div>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: DEPLOYMENT VERCEL */}
          {activeTab === 'vercel' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    Langkah Deployment ke GitHub &amp; Vercel
                  </h3>
                  <p className="text-slate-400 text-xs">
                    Deploy web GIS dashboard ini ke hosting cloud Vercel dalam hitungan menit.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(VERCEL_DEPLOYMENT_GUIDE, 'vercel')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs shadow-md transition"
                >
                  {copiedKey === 'vercel' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Panduan</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-[450px]">
                <pre>{VERCEL_DEPLOYMENT_GUIDE}</pre>
              </div>
            </div>
          )}

          {/* TAB 5: LIVE TEST SUPABASE */}
          {activeTab === 'live_test' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  Uji Koneksi Supabase Langsung (Optional)
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Masukkan URL dan Anon Key Supabase Anda untuk memverifikasi endpoint REST API tabel <code className="text-sky-400">pelanggan</code>.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://xyzcompany.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Supabase Anon Key (Public Key)
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOi..."
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition flex items-center gap-2"
                >
                  {isTesting ? 'Mengetes koneksi...' : 'Uji Koneksi REST API Sekarang'}
                </button>

                {testStatus && (
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300">
                    {testStatus}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
