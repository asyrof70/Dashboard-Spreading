import React, { useState, useEffect } from 'react';
import { CustomerSurvey, DuplicateCluster, InterestStatus } from '../types/gis';
import {
  GitMerge,
  Split,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  ShieldCheck,
  X,
  Info,
  CheckSquare,
  Square,
  AlertTriangle,
  Check,
  RotateCcw,
  Layers,
  History,
} from 'lucide-react';

interface SalesAnalystModalProps {
  isOpen: boolean;
  onClose: () => void;
  clusters: DuplicateCluster[];
  onMergeCluster: (cluster: DuplicateCluster, canonicalId: string, note: string, selectedSurveyIds?: string[]) => void;
  onSeparateCluster: (cluster: DuplicateCluster, note: string) => void;
  onFocusSurveyOnMap: (survey: CustomerSurvey) => void;
  theme?: 'light' | 'dark';
}

export const SalesAnalystModal: React.FC<SalesAnalystModalProps> = ({
  isOpen,
  onClose,
  clusters,
  onMergeCluster,
  onSeparateCluster,
  onFocusSurveyOnMap,
  theme = 'light',
}) => {
  const [activeTabFilter, setActiveTabFilter] = useState<'pending' | 'resolved_merged' | 'all'>('pending');
  const [selectedClusterId, setSelectedClusterId] = useState<string>('');
  const [canonicalSurveyId, setCanonicalSurveyId] = useState<string>('');
  const [selectedSurveyIds, setSelectedSurveyIds] = useState<Set<string>>(new Set());
  const [analystNote, setAnalystNote] = useState<string>('');
  const isLight = theme === 'light';

  // Filtered clusters based on tab
  const filteredClusters = clusters.filter((c) => {
    if (activeTabFilter === 'pending') return c.status === 'pending';
    if (activeTabFilter === 'resolved_merged') return c.status === 'resolved_merged';
    return true;
  });

  // Sync cluster selection when modal opens or clusters update
  useEffect(() => {
    if (isOpen && clusters.length > 0) {
      const active = filteredClusters.find((c) => c.groupId === selectedClusterId) || filteredClusters[0] || clusters[0];
      if (active) {
        setSelectedClusterId(active.groupId);
        setCanonicalSurveyId(active.surveys[0]?.id || '');
        setSelectedSurveyIds(new Set(active.surveys.map((s) => s.id)));
      }
      setAnalystNote('');
    }
  }, [isOpen, activeTabFilter, clusters]);

  // When changing selected cluster, reset selection to all surveys in that cluster
  const handleSelectCluster = (groupId: string) => {
    setSelectedClusterId(groupId);
    const targetCluster = clusters.find((c) => c.groupId === groupId);
    if (targetCluster && targetCluster.surveys.length > 0) {
      setCanonicalSurveyId(targetCluster.surveys[0].id);
      setSelectedSurveyIds(new Set(targetCluster.surveys.map((s) => s.id)));
    }
  };

  if (!isOpen) return null;

  const activeCluster = clusters.find((c) => c.groupId === selectedClusterId) || filteredClusters[0] || clusters[0];

  // Toggle survey inclusion in merge selection
  const handleToggleSurveySelection = (surveyId: string) => {
    const next = new Set(selectedSurveyIds);
    if (next.has(surveyId)) {
      next.delete(surveyId);
      // Jika canonical survey yang dibatalkan, alihkan ke survey terpilih lainnya
      if (canonicalSurveyId === surveyId) {
        const remaining = Array.from(next);
        if (remaining.length > 0) {
          setCanonicalSurveyId(remaining[0]);
        }
      }
    } else {
      next.add(surveyId);
      if (!canonicalSurveyId) {
        setCanonicalSurveyId(surveyId);
      }
    }
    setSelectedSurveyIds(next);
  };

  const handleSelectAllInCluster = () => {
    if (!activeCluster) return;
    setSelectedSurveyIds(new Set(activeCluster.surveys.map((s) => s.id)));
    if (!canonicalSurveyId && activeCluster.surveys.length > 0) {
      setCanonicalSurveyId(activeCluster.surveys[0].id);
    }
  };

  const handleDeselectAllInCluster = () => {
    setSelectedSurveyIds(new Set());
  };

  const handleMerge = () => {
    if (!activeCluster) return;
    if (selectedSurveyIds.size < 2) return;

    const chosenIds = Array.from(selectedSurveyIds);
    const targetId = canonicalSurveyId && selectedSurveyIds.has(canonicalSurveyId)
      ? canonicalSurveyId
      : chosenIds[0];

    onMergeCluster(activeCluster, targetId, analystNote, chosenIds);

    // Auto move to next pending cluster if available
    const nextPending = clusters.find((c) => c.groupId !== activeCluster.groupId && c.status === 'pending');
    if (nextPending) {
      handleSelectCluster(nextPending.groupId);
    }
  };

  const handleSeparate = () => {
    if (!activeCluster) return;
    onSeparateCluster(activeCluster, analystNote);

    const nextPending = clusters.find((c) => c.groupId !== activeCluster.groupId && c.status === 'pending');
    if (nextPending) {
      handleSelectCluster(nextPending.groupId);
    }
  };

  const getStatusColor = (status: InterestStatus) => {
    switch (status) {
      case 'Minat':
        return isLight
          ? 'text-emerald-800 bg-emerald-50 border-emerald-300 font-bold'
          : 'text-emerald-400 bg-emerald-950/80 border-emerald-800 font-medium';
      case 'Tidak Minat':
      default:
        return isLight
          ? 'text-rose-800 bg-rose-50 border-rose-300 font-bold'
          : 'text-rose-400 bg-rose-950/80 border-rose-800 font-medium';
    }
  };

  const totalSurveysInCluster = activeCluster?.surveys.length || 0;
  const selectedCount = selectedSurveyIds.size;
  const unselectedCount = totalSurveysInCluster - selectedCount;
  const isClusterAlreadyMerged = activeCluster?.status === 'resolved_merged';

  const pendingCount = clusters.filter((c) => c.status === 'pending').length;
  const mergedCount = clusters.filter((c) => c.status === 'resolved_merged').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5">
      <div
        className={`${
          isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900 text-slate-100 border-slate-700/80'
        } border rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150`}
      >
        {/* Header */}
        <div
          className={`px-5 py-3.5 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-slate-800'
          } flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl border ${
                isLight
                  ? 'bg-amber-50 text-[#e46423] border-amber-200'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-extrabold text-sm sm:text-base ${isLight ? 'text-[#005baa]' : 'text-slate-100'}`}>
                  Verifikasi Sales Analis: Konsolidasi &amp; Seleksi Spreading Berulang
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e46423] text-white font-mono font-bold">
                  {pendingCount} Perlu Tindakan
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>
                Konsolidasi jumlah properti tanpa menghilangkan jumlah kunjungan &amp; rekam riwayat data yang di-merge
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

        {/* Filter Navigation Tabs */}
        <div className={`px-5 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
          isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTabFilter('pending')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTabFilter === 'pending'
                  ? 'bg-[#005baa] text-white shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:bg-slate-200'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
              <span>Perlu Tindakan ({pendingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('resolved_merged')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTabFilter === 'resolved_merged'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:bg-slate-200'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat Sudah di-Merge ({mergedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTabFilter === 'all'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:bg-slate-200'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              Semua Klaster ({clusters.length})
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Merge mengurangi <strong>jumlah properti fisik</strong> &amp; menjaga <strong>total kunjungan</strong>
          </div>
        </div>

        {/* Content Body */}
        <div
          className={`flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x ${
            isLight ? 'divide-slate-200' : 'divide-slate-800'
          }`}
        >
          {/* Left: Clusters List */}
          <div className={`md:col-span-4 p-3 overflow-y-auto space-y-2 ${isLight ? 'bg-slate-50/50' : 'bg-slate-950/50'}`}>
            <div className={`text-[11px] font-bold uppercase tracking-wider px-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Daftar Klaster Spreading ({filteredClusters.length})
            </div>

            {filteredClusters.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Tidak ada klaster pada kategori ini.
              </div>
            ) : (
              filteredClusters.map((cluster) => {
                const isSelected = (activeCluster?.groupId || '') === cluster.groupId;
                const isResolved = cluster.status === 'resolved_merged';
                const isSeparated = cluster.status === 'resolved_separated';

                return (
                  <div
                    key={cluster.groupId}
                    onClick={() => handleSelectCluster(cluster.groupId)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                      isSelected
                        ? isLight
                          ? 'bg-blue-50 border-[#005baa] shadow-sm ring-1 ring-[#005baa]/40'
                          : 'bg-slate-800/90 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                        : isLight
                        ? 'bg-white border-slate-200 hover:border-slate-300'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[10px] font-bold text-[#005baa] dark:text-sky-400">
                        {cluster.groupId}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          isResolved
                            ? isLight
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : isSeparated
                            ? isLight
                              ? 'bg-slate-100 text-slate-700 border-slate-300'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                            : isLight
                            ? 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
                            : 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                        }`}
                      >
                        {isResolved ? 'Sudah Digabung (Merged)' : isSeparated ? 'Properti Terpisah' : 'Perlu Tindakan'}
                      </span>
                    </div>

                    <div className={`font-bold truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      {cluster.anchorSurvey.nama}
                    </div>
                    <div className={`text-[11px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {cluster.anchorSurvey.alamat}
                    </div>

                    <div
                      className={`mt-2 pt-2 border-t flex items-center justify-between text-[11px] ${
                        isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>{cluster.surveys.length}x Input Spreading</span>
                      <span className="text-[#e46423] font-mono font-bold">Jarak ~{cluster.distanceMeters}m</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Detail Comparison, Individual Checkboxes & Merge Controls */}
          {activeCluster ? (
            <div className="md:col-span-8 p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* Header Info & Selection Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className={`font-extrabold text-sm ${isLight ? 'text-[#005baa]' : 'text-slate-100'} flex items-center gap-2`}>
                    <span>Perbandingan &amp; Seleksi Data ({activeCluster.groupId})</span>
                    <span className="text-xs font-mono font-normal text-slate-400">
                      (~{activeCluster.distanceMeters} meter)
                    </span>
                  </h4>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>
                    {isClusterAlreadyMerged
                      ? 'Klaster ini sudah digabungkan. Rincian data riwayat yang di-merge tercatat di bawah:'
                      : 'Centang data survei yang ingin digabungkan ke 1 riwayat properti master:'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onFocusSurveyOnMap(activeCluster.anchorSurvey)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition border ${
                      isLight
                        ? 'bg-[#005baa]/10 hover:bg-[#005baa]/20 text-[#005baa] border-blue-200'
                        : 'bg-slate-800 hover:bg-sky-600 text-sky-300 hover:text-white border-slate-700'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Lihat di Peta Satelit</span>
                  </button>
                </div>
              </div>

              {/* Selection Bar Indicator */}
              {!isClusterAlreadyMerged && (
                <div className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] ${
                      selectedCount >= 2
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {selectedCount} dari {totalSurveysInCluster} Data Dipilih untuk Di-merge
                    </span>
                    {unselectedCount > 0 && (
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] font-normal">
                        ({unselectedCount} data tidak dicentang &amp; tetap mandiri)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={handleSelectAllInCluster}
                      className="text-[#005baa] dark:text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Pilih Semua ({totalSurveysInCluster})</span>
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllInCluster}
                      className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:underline"
                    >
                      Batal Pilih
                    </button>
                  </div>
                </div>
              )}

              {/* Side-by-side Survey Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeCluster.surveys.map((survey, idx) => {
                  const isChecked = selectedSurveyIds.has(survey.id);
                  const isCanonical = isChecked && (canonicalSurveyId || activeCluster.surveys[0].id) === survey.id;

                  return (
                    <div
                      key={survey.id}
                      className={`p-3.5 rounded-xl border text-xs relative flex flex-col justify-between transition ${
                        isChecked
                          ? isCanonical
                            ? isLight
                              ? 'bg-sky-50/90 border-[#005baa] ring-2 ring-[#005baa]/50 shadow-md'
                              : 'bg-slate-950 border-sky-500 ring-2 ring-sky-500/50 shadow-lg'
                            : isLight
                            ? 'bg-white border-blue-300 ring-1 ring-blue-200 shadow-xs'
                            : 'bg-slate-900 border-sky-800 ring-1 ring-sky-900'
                          : isLight
                          ? 'bg-slate-100/70 border-slate-200 opacity-60'
                          : 'bg-slate-950/40 border-slate-800 opacity-50'
                      }`}
                    >
                      <div>
                        {/* Top: Selection Checkbox & Status */}
                        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                          {!isClusterAlreadyMerged ? (
                            <label className="flex items-center gap-1.5 cursor-pointer font-bold select-none text-[11px]">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSurveySelection(survey.id)}
                                className="w-4 h-4 rounded text-[#005baa] focus:ring-[#005baa] cursor-pointer"
                              />
                              <span className={isChecked ? 'text-[#005baa] dark:text-sky-300' : 'text-slate-500'}>
                                {isChecked ? '✓ Sertakan di Merge' : 'Terpisah (Lewati)'}
                              </span>
                            </label>
                          ) : (
                            <span className="font-mono text-[10px] text-emerald-600 font-bold">
                              ✓ Tergabung dalam History
                            </span>
                          )}

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(survey.statusMinat)}`}>
                            {survey.statusMinat}
                          </span>
                        </div>

                        {/* Customer Info */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-mono text-[#e46423] font-bold bg-orange-50 dark:bg-orange-950/60 px-1.5 py-0.5 rounded border border-orange-200 dark:border-orange-900">
                            Survei #{idx + 1}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {survey.id}
                          </span>
                        </div>

                        <div className={`font-bold text-sm mb-1 ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                          {survey.nama}
                        </div>
                        <div className={`text-[11px] mb-2 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          {survey.alamat}
                        </div>

                        {/* Survey Metadata */}
                        <div
                          className={`p-2 rounded-lg border space-y-1 mb-2 text-[11px] ${
                            isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-[#005baa] dark:text-sky-400" />
                            <span><strong>Sales:</strong> {survey.salesNama}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span><strong>Waktu:</strong> {survey.timestamp || survey.tanggalSpreading}</span>
                          </div>
                          <div className={`font-mono text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            Lat: {survey.latitude.toFixed(5)}, Lng: {survey.longitude.toFixed(5)}
                          </div>
                        </div>

                        {survey.catatanSales && (
                          <div
                            className={`text-[11px] p-2 rounded border italic mb-2 ${
                              isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                            }`}
                          >
                            &quot;{survey.catatanSales}&quot;
                          </div>
                        )}
                      </div>

                      {/* Bottom: Master Properti Indicator */}
                      <div className={`pt-2.5 mt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                        {!isClusterAlreadyMerged ? (
                          isChecked ? (
                            <label className={`flex items-center gap-2 cursor-pointer text-[11px] ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                              <input
                                type="radio"
                                name="canonicalSurvey"
                                checked={isCanonical}
                                onChange={() => setCanonicalSurveyId(survey.id)}
                                className="text-[#005baa] focus:ring-[#005baa] cursor-pointer"
                              />
                              <span className={isCanonical ? 'font-black text-[#005baa] dark:text-sky-300' : 'font-semibold'}>
                                {isCanonical ? '★ Master Properti Terpilih' : 'Jadikan Master Properti'}
                              </span>
                            </label>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              (Dibiarkan sebagai properti mandiri)
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            {idx === 0 ? '★ Master Properti Acuan' : 'Riwayat Kunjungan'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Analyst Decision Box (Only for pending clusters) */}
              {!isClusterAlreadyMerged ? (
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className={`font-bold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    Catatan Sales Analis (Opsional):
                  </div>
                  <input
                    type="text"
                    placeholder="Misal: Dikonfirmasi via telepon, 2 data yang satu rumah fisik digabungkan..."
                    value={analystNote}
                    onChange={(e) => setAnalystNote(e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-800 focus:border-[#005baa]'
                        : 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500'
                    }`}
                  />

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleMerge}
                      disabled={selectedCount < 2}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
                      title={selectedCount < 2 ? 'Pilih minimal 2 data survei di atas untuk di-merge' : `Gabungkan ${selectedCount} data terpilih`}
                    >
                      <GitMerge className="w-4 h-4" />
                      <span>
                        {selectedCount >= 2
                          ? `Gabungkan ${selectedCount} Data Terpilih (Merge)`
                          : 'Pilih Minimal 2 Data untuk Merge'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSeparate}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs border transition ${
                        isLight
                          ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                    >
                      <Split className="w-4 h-4" />
                      <span>Tetapkan Semua Sebagai Properti Berbeda</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Klaster ini telah berhasil digabungkan ke 1 Properti Master dengan riwayat kunjungan lengkap.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onFocusSurveyOnMap(activeCluster.anchorSurvey)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                  >
                    Tunjukkan di Peta
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="md:col-span-8 p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mb-2" />
              <span>Tidak ada klaster duplikat spreading pada kategori ini.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between text-xs ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Akun Sales Analis aktif • Audit trail verifikasi konsolidasi database PAM Aetra
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 font-bold rounded-lg transition ${
              isLight ? 'bg-[#005baa] hover:bg-[#004b8d] text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
