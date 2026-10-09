import React, { useState } from 'react';
import { PipeNetworkLayer, ServiceZoneLayer } from '../types/gis';
import { parseSpatialFile } from '../utils/kmlParser';
import {
  Upload,
  X,
  Layers,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Shield,
  RotateCcw,
  FileCheck2,
  Loader2,
  ZoomIn,
  Database,
} from 'lucide-react';
import { SAMPLE_PIPELINE_GEOJSON, SAMPLE_SERVICE_ZONES_GEOJSON } from '../data/sampleData';

interface UploadNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeLayers: PipeNetworkLayer[];
  serviceZoneLayers: ServiceZoneLayer[];
  onAddPipeLayer: (layer: PipeNetworkLayer) => void;
  onAddServiceZoneLayer: (layer: ServiceZoneLayer) => void;
  onTogglePipeLayer: (id: string) => void;
  onToggleServiceZoneLayer: (id: string) => void;
  onDeletePipeLayer: (id: string) => void;
  onDeleteServiceZoneLayer: (id: string) => void;
  onRestoreDefaultLayers?: () => void;
  onFocusLayerBounds?: (bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number }) => void;
  theme?: 'light' | 'dark';
}

export const UploadNetworkModal: React.FC<UploadNetworkModalProps> = ({
  isOpen,
  onClose,
  pipeLayers,
  serviceZoneLayers,
  onAddPipeLayer,
  onAddServiceZoneLayer,
  onTogglePipeLayer,
  onToggleServiceZoneLayer,
  onDeletePipeLayer,
  onDeleteServiceZoneLayer,
  onRestoreDefaultLayers,
  onFocusLayerBounds,
  theme = 'light',
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isLight = theme === 'light';

  if (!isOpen) return null;

  // File Change & Instant Import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsProcessing(true);

    try {
      const parsed = await parseSpatialFile(file);

      if (!parsed.geoJson || !parsed.geoJson.features || parsed.geoJson.features.length === 0) {
        throw new Error('File tidak memuat objek garis pipa atau batas wilayah poligon yang valid.');
      }

      const ext = file.name.split('.').pop()?.toUpperCase() as 'KMZ' | 'KML' | 'GeoJSON' | 'SHP';
      const isPolygonLayer = parsed.hasPolygons && !parsed.hasLines;

      if (isPolygonLayer) {
        const newZoneLayer: ServiceZoneLayer = {
          id: `zone-layer-${Date.now()}`,
          name: parsed.name || file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name,
          type: ext === 'KMZ' || ext === 'KML' || ext === 'SHP' ? ext : 'GeoJSON',
          visible: true,
          borderColor: '#38BDF8',
          fillColor: '#0284C7',
          borderWidth: 2,
          fillOpacity: 0.18,
          featuresCount: parsed.geoJson.features.length,
          geoJsonData: parsed.geoJson,
          uploadDate: new Date().toISOString().slice(0, 10),
        };
        onAddServiceZoneLayer(newZoneLayer);
        setSuccessMessage(`Berhasil mengimpor Layer Batas Zona: "${newZoneLayer.name}" (${parsed.geoJson.features.length} wilayah poligon). Tersimpan permanen.`);
        if (parsed.bounds && onFocusLayerBounds) {
          onFocusLayerBounds(parsed.bounds);
        }
      } else {
        const newPipeLayer: PipeNetworkLayer = {
          id: `pipe-layer-${Date.now()}`,
          name: parsed.name || file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name,
          type: ext === 'KMZ' || ext === 'KML' || ext === 'SHP' ? ext : 'GeoJSON',
          visible: true,
          color: '#EF4444',
          width: 3.0,
          totalLengthKm: parsed.totalLengthKm || 0,
          featuresCount: parsed.geoJson.features.length,
          geoJsonData: parsed.geoJson,
          uploadDate: new Date().toISOString().slice(0, 10),
        };
        onAddPipeLayer(newPipeLayer);
        setSuccessMessage(`Berhasil mengimpor Layer Pipa: "${newPipeLayer.name}" (${parsed.geoJson.features.length} segmen pipa, total ~${parsed.totalLengthKm?.toFixed(1) || '0'} km). Tersimpan permanen ke IndexedDB.`);
        if (parsed.bounds && onFocusLayerBounds) {
          onFocusLayerBounds(parsed.bounds);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memproses file spasial. Pastikan format KMZ, KML, GeoJSON, atau SHP (.zip) valid.');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleDownloadSamplePipes = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(SAMPLE_PIPELINE_GEOJSON, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', 'sample_jaringan_pipa_aetra.geojson');
    dlAnchor.click();
  };

  const handleDownloadSampleZones = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(SAMPLE_SERVICE_ZONES_GEOJSON, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', 'sample_batas_zona_pelayanan_aetra.geojson');
    dlAnchor.click();
  };

  const handleExportLayerAsGeoJson = (layerName: string, geoJson: GeoJSON.FeatureCollection) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geoJson, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${layerName.toLowerCase().replace(/\s+/g, '_')}_backup.geojson`);
    dlAnchor.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div
        className={`${
          isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900 text-slate-100 border-slate-800'
        } border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-slate-800'
          } flex items-center justify-between`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isLight ? 'bg-[#005baa]/10 text-[#005baa]' : 'bg-sky-500/10 text-sky-400'
              }`}
            >
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-extrabold text-sm sm:text-base ${isLight ? 'text-[#005baa]' : 'text-slate-100'}`}>
                Unggah &amp; Kelola Layer Jaringan Pipa (KMZ / KML / GeoJSON / SHP)
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>
                Data jaringan pipa &amp; batas zona tersimpan permanen di IndexedDB browser
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
        <div className="p-5 space-y-4 text-xs max-h-[78vh] overflow-y-auto">
          {/* Storage Status Badge */}
          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            isLight ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-sky-950/50 border-sky-800 text-sky-200'
          }`}>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#005baa]" />
              <span className="font-semibold text-[11px]">
                Status Penyimpanan: <strong>IndexedDB Aktif (Permanen &amp; Aman dari Reload)</strong>
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-[#005baa] text-white font-bold">
              {pipeLayers.length} Layer Pipa • {serviceZoneLayers.length} Zona
            </span>
          </div>

          {/* Upload Drop Zone */}
          <div
            className={`relative border-2 border-dashed ${
              isLight
                ? 'border-blue-300 bg-blue-50/50 hover:bg-blue-50 hover:border-[#005baa]'
                : 'border-slate-700 bg-slate-950/60 hover:bg-slate-950 hover:border-sky-500'
            } rounded-2xl p-6 text-center cursor-pointer transition`}
          >
            <input
              type="file"
              accept=".kml,.kmz,.geojson,.json,.zip"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-[#005baa] animate-spin" />
                <span className="font-bold text-[#005baa]">Sedang memproses dan menyimpan data KMZ ke database...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`p-3 rounded-full border ${
                    isLight
                      ? 'bg-[#005baa]/10 text-[#005baa] border-blue-200'
                      : 'bg-sky-500/20 text-sky-400 border-sky-400/30'
                  }`}
                >
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <div>
                  <span className={`font-bold text-sm ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                    Pilih File KMZ, KML, GeoJSON, atau SHP (.zip)
                  </span>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    File langsung dianalisis, diplot ke peta, dan tersimpan permanen di browser
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Alert Status Feedback */}
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

          {/* Unduh Sample File */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleDownloadSamplePipes}
              className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-[11px] font-bold transition ${
                isLight
                  ? 'bg-slate-50 hover:bg-slate-100 text-[#005baa] border-slate-200'
                  : 'bg-slate-950 hover:bg-slate-850 text-sky-400 border-slate-800'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Contoh Pipa GeoJSON</span>
            </button>
            <button
              onClick={handleDownloadSampleZones}
              className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-[11px] font-bold transition ${
                isLight
                  ? 'bg-slate-50 hover:bg-slate-100 text-emerald-700 border-slate-200'
                  : 'bg-slate-950 hover:bg-slate-850 text-emerald-400 border-slate-800'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Contoh Zona GeoJSON</span>
            </button>
          </div>

          {/* Daftar Layer Aktif */}
          <div className={`space-y-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className="flex items-center justify-between">
              <span className={`font-bold uppercase tracking-wider text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                Daftar Layer Spasial Aktif
              </span>
              {onRestoreDefaultLayers && (
                <button
                  onClick={onRestoreDefaultLayers}
                  className="text-[#005baa] hover:underline text-[10px] flex items-center gap-1 font-bold"
                  title="Kembalikan Layer Default Sistem"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Data Bawaan</span>
                </button>
              )}
            </div>

            {/* Pipa Layers */}
            <div className="space-y-2">
              <div className={`text-[10px] font-mono font-bold uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Jaringan Pipa ({pipeLayers.length}):
              </div>
              {pipeLayers.length === 0 ? (
                <div
                  className={`p-2.5 text-center rounded-xl border ${
                    isLight ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  Tidak ada layer pipa aktif. Unggah file .KMZ atau .KML Anda di atas.
                </div>
              ) : (
                pipeLayers.map((layer) => (
                  <div
                    key={layer.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
                      <div>
                        <div className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{layer.name}</div>
                        <div className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {layer.type} • {layer.featuresCount} segmen pipa • ~{layer.totalLengthKm?.toFixed(1) ?? 0} km
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleExportLayerAsGeoJson(layer.name, layer.geoJsonData)}
                        className={`p-1.5 rounded border text-[10px] font-semibold transition ${
                          isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                        title="Ekspor Layer ini sebagai GeoJSON Cadangan"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onTogglePipeLayer(layer.id)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold border transition ${
                          layer.visible
                            ? isLight
                              ? 'bg-[#005baa] text-white border-[#005baa]'
                              : 'bg-sky-950 text-sky-300 border-sky-800'
                            : isLight
                            ? 'bg-white text-slate-400 border-slate-300'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                      >
                        {layer.visible ? 'Tampil' : 'Sembunyi'}
                      </button>
                      <button
                        onClick={() => onDeletePipeLayer(layer.id)}
                        className={`p-1.5 rounded transition ${
                          isLight ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                        }`}
                        title="Hapus Layer Ini dari Sistem"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Service Zone Layers */}
            <div className="space-y-2 pt-2">
              <div className={`text-[10px] font-mono font-bold uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Batas Zona Pelayanan ({serviceZoneLayers.length}):
              </div>
              {serviceZoneLayers.length === 0 ? (
                <div
                  className={`p-2.5 text-center rounded-xl border ${
                    isLight ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  Tidak ada layer zona pelayanan aktif.
                </div>
              ) : (
                serviceZoneLayers.map((zone) => (
                  <div
                    key={zone.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Shield className="w-4 h-4 text-[#005baa]" />
                      <div>
                        <div className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{zone.name}</div>
                        <div className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {zone.type} • {zone.featuresCount} polygon wilayah
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleExportLayerAsGeoJson(zone.name, zone.geoJsonData)}
                        className={`p-1.5 rounded border text-[10px] font-semibold transition ${
                          isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                        title="Ekspor Layer ini sebagai GeoJSON Cadangan"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onToggleServiceZoneLayer(zone.id)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold border transition ${
                          zone.visible
                            ? isLight
                              ? 'bg-[#005baa] text-white border-[#005baa]'
                              : 'bg-sky-950 text-sky-300 border-sky-800'
                            : isLight
                            ? 'bg-white text-slate-400 border-slate-300'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                      >
                        {zone.visible ? 'Tampil' : 'Sembunyi'}
                      </button>
                      <button
                        onClick={() => onDeleteServiceZoneLayer(zone.id)}
                        className={`p-1.5 rounded transition ${
                          isLight ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                        }`}
                        title="Hapus Zona Ini dari Sistem"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex justify-end ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-slate-800'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-1.5 font-bold rounded-lg text-xs transition ${
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
