import React, { useState, useMemo } from 'react';
import { PipeNetworkLayer, ServiceZoneLayer, SymbologyRule } from '../types/gis';
import { generateUniqueValuesSymbology, QGIS_COLOR_PALETTE } from '../utils/symbologyHelper';
import {
  Sliders,
  X,
  Check,
  Palette,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface LayerSymbologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeLayers: PipeNetworkLayer[];
  serviceZoneLayers: ServiceZoneLayer[];
  onUpdatePipeSymbology: (layerId: string, classifyColumn: string, rules: SymbologyRule[], strokeWidth?: number) => void;
  onUpdateZoneSymbology: (layerId: string, classifyColumn: string, rules: SymbologyRule[]) => void;
  theme?: 'light' | 'dark';
}

export const LayerSymbologyModal: React.FC<LayerSymbologyModalProps> = ({
  isOpen,
  onClose,
  pipeLayers,
  serviceZoneLayers,
  onUpdatePipeSymbology,
  onUpdateZoneSymbology,
  theme = 'light',
}) => {
  const isLight = theme === 'light';

  // Layer yang dipilih untuk diatur simbologinya
  const allLayers = useMemo(() => {
    const list: { id: string; name: string; type: 'pipe' | 'zone'; layer: PipeNetworkLayer | ServiceZoneLayer }[] = [];
    pipeLayers.forEach((p) => list.push({ id: p.id, name: p.name, type: 'pipe', layer: p }));
    serviceZoneLayers.forEach((z) => list.push({ id: z.id, name: z.name, type: 'zone', layer: z }));
    return list;
  }, [pipeLayers, serviceZoneLayers]);

  const [selectedLayerId, setSelectedLayerId] = useState<string>(allLayers[0]?.id || '');
  const currentItem = allLayers.find((l) => l.id === selectedLayerId) || allLayers[0];

  // Ekstraksi kolom dari layer terpilih
  const detectedColumns = useMemo(() => {
    if (!currentItem) return [];
    const cols = new Set<string>();
    currentItem.layer.geoJsonData.features.forEach((f) => {
      if (f.properties) {
        Object.keys(f.properties).forEach((k) => cols.add(k));
      }
    });
    return Array.from(cols);
  }, [currentItem]);

  // Kolom atribut yang dipilih untuk klasifikasi
  const [selectedColumn, setSelectedColumn] = useState<string>('');

  // Aturan simbologi saat ini (sedang diedit)
  const [currentRules, setCurrentRules] = useState<SymbologyRule[]>([]);

  // Ketebalan garis pipa (Width)
  const [pipeStrokeWidth, setPipeStrokeWidth] = useState<number>(3.0);

  // Saat ganti layer, set kolom default dan generate aturan awal
  React.useEffect(() => {
    if (!currentItem) return;
    const initialCol =
      currentItem.layer.classifyColumn ||
      detectedColumns.find((c) => /diam|dia|dn|ukuran|size|kecamatan|nama|material|status/i.test(c)) ||
      detectedColumns[0] ||
      '';

    setSelectedColumn(initialCol);

    if (currentItem.type === 'pipe') {
      const p = currentItem.layer as PipeNetworkLayer;
      setPipeStrokeWidth(p.width || 3.0);
    }

    if (currentItem.layer.symbologyRules && currentItem.layer.symbologyRules.length > 0) {
      setCurrentRules(currentItem.layer.symbologyRules);
    } else if (initialCol) {
      const generated = generateUniqueValuesSymbology(
        currentItem.layer.geoJsonData,
        initialCol,
        currentItem.type === 'pipe' ? 'line' : 'polygon'
      );
      setCurrentRules(generated);
    } else {
      setCurrentRules([]);
    }
  }, [selectedLayerId, currentItem]);

  if (!isOpen || !currentItem) return null;

  // Handle saat user memilih kolom atribut lain
  const handleColumnChange = (colName: string) => {
    setSelectedColumn(colName);
    const generated = generateUniqueValuesSymbology(
      currentItem.layer.geoJsonData,
      colName,
      currentItem.type === 'pipe' ? 'line' : 'polygon'
    );
    setCurrentRules(generated);
  };

  // Ubah warna satu kategori aturan
  const handleRuleColorChange = (index: number, newColor: string) => {
    setCurrentRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, color: newColor, fillColor: newColor } : r))
    );
  };

  // Ubah ketebalan garis pipa
  const handleStrokeWidthChange = (w: number) => {
    setPipeStrokeWidth(w);
  };

  // Simpan perubahan dan sinkronkan ke peta & legenda
  const handleApplySymbology = () => {
    if (currentItem.type === 'pipe') {
      onUpdatePipeSymbology(currentItem.id, selectedColumn, currentRules, pipeStrokeWidth);
    } else {
      onUpdateZoneSymbology(currentItem.id, selectedColumn, currentRules);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`${
          isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900 text-slate-100 border-slate-700/80'
        } border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
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
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-extrabold ${isLight ? 'text-[#005baa]' : 'text-slate-100'}`}>
                Simbologi Layer GIS (Gaya Klasifikasi QGIS)
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Klasifikasikan warna garis pipa / poligon zona berdasarkan kolom atribut
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
          {/* 1. Pilih Layer & Kolom Atribut */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Selector Layer */}
            <div>
              <label className={`text-[11px] font-bold block mb-1 uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                Pilih Layer GIS:
              </label>
              <select
                value={selectedLayerId}
                onChange={(e) => setSelectedLayerId(e.target.value)}
                className={`w-full p-2 rounded-lg border font-semibold focus:outline-none cursor-pointer ${
                  isLight
                    ? 'bg-white text-slate-800 border-slate-300 focus:border-[#005baa]'
                    : 'bg-slate-950 text-slate-200 border-slate-700 focus:border-sky-500'
                }`}
              >
                {allLayers.map((l) => (
                  <option key={l.id} value={l.id}>
                    [{l.type === 'pipe' ? 'Pipa' : 'Zona'}] {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector Kolom Atribut */}
            <div>
              <label className={`text-[11px] font-bold block mb-1 uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                Kolom Nilai Klasifikasi:
              </label>
              <select
                value={selectedColumn}
                onChange={(e) => handleColumnChange(e.target.value)}
                className={`w-full p-2 rounded-lg border font-mono font-bold focus:outline-none cursor-pointer ${
                  isLight
                    ? 'bg-white text-slate-800 border-slate-300 focus:border-[#005baa]'
                    : 'bg-slate-950 text-slate-200 border-slate-700 focus:border-sky-500'
                }`}
              >
                {detectedColumns.map((col) => (
                  <option key={col} value={col}>
                    Kolom: {col.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pengaturan Ketebalan Garis Pipa (Width Line) */}
          {currentItem.type === 'pipe' && (
            <div
              className={`p-3 rounded-xl border space-y-2 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <label className={`text-[11px] font-bold uppercase flex items-center gap-1.5 ${isLight ? 'text-[#005baa]' : 'text-sky-400'}`}>
                  <span>Ketebalan Garis Pipa:</span>
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-xs font-bold border ${
                      isLight ? 'bg-[#005baa]/10 text-[#005baa] border-blue-200' : 'bg-sky-950 border-sky-800 text-sky-300'
                    }`}
                  >
                    {pipeStrokeWidth.toFixed(1)} px
                  </span>
                </label>
                <div className="flex items-center gap-1">
                  {[1.5, 2.5, 3.5, 5.0, 7.0].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleStrokeWidthChange(preset)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                        pipeStrokeWidth === preset
                          ? 'bg-[#005baa] text-white shadow-sm'
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
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={pipeStrokeWidth}
                  onChange={(e) => handleStrokeWidthChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-[#005baa]"
                />
                <div
                  className={`w-12 h-4 flex items-center justify-center rounded border ${
                    isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div
                    className="w-8 bg-[#005baa] rounded-full"
                    style={{ height: `${Math.min(pipeStrokeWidth, 8)}px` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div
            className={`flex items-center justify-between text-[11px] p-2.5 rounded-lg border ${
              isLight ? 'bg-blue-50 border-blue-200 text-[#005baa]' : 'bg-sky-950/40 text-sky-300 border-sky-900/40'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>
                Terdeteksi <strong>{currentRules.length} nilai unik</strong> pada kolom <strong>{selectedColumn}</strong>.
              </span>
            </span>
            <button
              onClick={() => handleColumnChange(selectedColumn)}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition ${
                isLight ? 'bg-white hover:bg-blue-100 text-[#005baa] border border-blue-300' : 'bg-sky-900/60 hover:bg-sky-800'
              }`}
              title="Acak / Re-generate Warna"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Re-color</span>
            </button>
          </div>

          {/* 2. Daftar Kategori Nilai Unik */}
          <div className="space-y-2">
            <div className={`text-[11px] font-bold uppercase px-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Daftar Kategori Nilai &amp; Warna (Simbologi QGIS):
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {currentRules.length === 0 ? (
                <div
                  className={`text-center p-4 rounded-xl border ${
                    isLight ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  Pilih kolom atribut di atas untuk mengekstrak kategori.
                </div>
              ) : (
                currentRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                      isLight ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <label className="relative cursor-pointer">
                        <input
                          type="color"
                          value={rule.color}
                          onChange={(e) => handleRuleColorChange(idx, e.target.value)}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                        <div
                          className="w-5 h-5 rounded-md border border-black/10 shadow-sm transition hover:scale-110"
                          style={{ backgroundColor: rule.color }}
                        />
                      </label>

                      <div>
                        <div className={`font-bold font-mono text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{rule.value}</div>
                        <div className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {rule.count} {currentItem.type === 'pipe' ? 'segmen pipa' : 'fitur wilayah'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {QGIS_COLOR_PALETTE.slice(0, 8).map((presetColor) => (
                        <button
                          key={presetColor}
                          onClick={() => handleRuleColorChange(idx, presetColor)}
                          className={`w-4 h-4 rounded-full border transition hover:scale-125 ${
                            rule.color.toLowerCase() === presetColor.toLowerCase()
                              ? 'ring-2 ring-[#005baa] ring-offset-1 border-white scale-110'
                              : 'border-black/15'
                          }`}
                          style={{ backgroundColor: presetColor }}
                          title={`Pilih warna ${presetColor}`}
                        />
                      ))}
                      <span
                        className={`text-[9.5px] font-mono ml-1 px-1.5 py-0.5 rounded border ${
                          isLight ? 'bg-white text-slate-800 border-slate-300' : 'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                      >
                        {rule.color}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3.5 border-t flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Legenda di pojok kanan atas peta otomatis tersinkronisasi.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
                isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              Batal
            </button>
            <button
              onClick={handleApplySymbology}
              className="px-5 py-2 rounded-xl bg-[#005baa] hover:bg-[#004b8d] text-white font-bold text-xs transition shadow-md shadow-[#005baa]/20 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Terapkan Simbologi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
