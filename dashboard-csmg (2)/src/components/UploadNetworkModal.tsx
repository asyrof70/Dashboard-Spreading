import React, { useState, useRef } from 'react';
import { PipeNetworkLayer, ServiceZoneLayer } from '../types/gis';
import { parseSpatialFile } from '../utils/kmlParser';
import {
  Upload,
  X,
  Layers,
  Trash2,
  Download,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Shield,
  RotateCcw,
  FileCheck2,
  Loader2,
  ZoomIn,
  Database,
  RefreshCw,
  FolderSync,
  Table as TableIcon,
} from 'lucide-react';
import { SAMPLE_PIPELINE_GEOJSON, SAMPLE_SERVICE_ZONES_GEOJSON } from '../data/sampleData';
import { AttributeTableModal } from './AttributeTableModal';

interface UploadNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeLayers: PipeNetworkLayer[];
  serviceZoneLayers: ServiceZoneLayer[];
  onAddPipeLayer: (layer: PipeNetworkLayer) => void;
  onAddServiceZoneLayer: (layer: ServiceZoneLayer) => void;
  onReplacePipeLayer?: (id: string, layer: PipeNetworkLayer) => void;
  onReplaceServiceZoneLayer?: (id: string, layer: ServiceZoneLayer) => void;
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
  onReplacePipeLayer,
  onReplaceServiceZoneLayer,
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
  const [targetReplace, setTargetReplace] = useState<{ id: string; type: 'pipe' | 'zone'; name: string } | null>(null);
  const [layerToDelete, setLayerToDelete] = useState<{ id: string; name: string; type: 'pipe' | 'zone' } | null>(null);
  const [selectedLayerForAttributeTable, setSelectedLayerForAttributeTable] = useState<{ name: string; geoJson: GeoJSON.FeatureCollection } | null>(null);
  
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const isLight = theme === 'light';

  if (!isOpen) return null;

  // File Change & Instant Import (New File)
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
        setSuccessMessage(`Berhasil mengimpor Layer Batas Zona: "${newZoneLayer.name}" (${parsed.geoJson.features.length} wilayah poligon). Tersimpan permanen ke IndexedDB sistem.`);
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
        setSuccessMessage(`Berhasil mengimpor Layer Pipa: "${newPipeLayer.name}" (${parsed.geoJson.features.length} segmen pipa, total ~${parsed.totalLengthKm?.toFixed(1) || '0'} km). Tersimpan permanen ke IndexedDB sistem.`);
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

  // Handle Replace File for Existing Layer
  const handleTriggerReplace = (id: string, type: 'pipe' | 'zone', name: string) => {
    setTargetReplace({ id, type, name });
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
      replaceInputRef.current.click();
    }
  };

  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !targetReplace) return;
    const file = e.target.files[0];
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsProcessing(true);

    try {
      const parsed = await parseSpatialFile(file);
      if (!parsed.geoJson || !parsed.geoJson.features || parsed.geoJson.features.length === 0) {
        throw new Error('File baru tidak memuat objek spasial yang valid.');
      }

      const ext = file.name.split('.').pop()?.toUpperCase() as 'KMZ' | 'KML' | 'GeoJSON' | 'SHP';

      if (targetReplace.type === 'zone') {
        const existing = serviceZoneLayers.find((z) => z.id === targetReplace.id);
        const updatedZone: ServiceZoneLayer = {
          id: targetReplace.id,
          name: parsed.name || file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name,
          type: ext === 'KMZ' || ext === 'KML' || ext === 'SHP' ? ext : 'GeoJSON',
          visible: existing?.visible !== undefined ? existing.visible : true,
          borderColor: existing?.borderColor || '#38BDF8',
          fillColor: existing?.fillColor || '#0284C7',
          borderWidth: existing?.borderWidth || 2,
          fillOpacity: existing?.fillOpacity || 0.18,
          featuresCount: parsed.geoJson.features.length,
          geoJsonData: parsed.geoJson,
          uploadDate: new Date().toISOString().slice(0, 10),
        };
        if (onReplaceServiceZoneLayer) {
          onReplaceServiceZoneLayer(targetReplace.id, updatedZone);
        } else {
          onDeleteServiceZoneLayer(targetReplace.id);
          onAddServiceZoneLayer(updatedZone);
        }
        setSuccessMessage(`Berhasil memperbarui file zona "${updatedZone.name}" dengan file baru "${file.name}" (${parsed.geoJson.features.length} poligon). Tersimpan permanen.`);
        if (parsed.bounds && onFocusLayerBounds) {
          onFocusLayerBounds(parsed.bounds);
        }
      } else {
        const existing = pipeLayers.find((p) => p.id === targetReplace.id);
        const updatedPipe: PipeNetworkLayer = {
          id: targetReplace.id,
          name: parsed.name || file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name,
          type: ext === 'KMZ' || ext === 'KML' || ext === 'SHP' ? ext : 'GeoJSON',
          visible: existing?.visible !== undefined ? existing.visible : true,
          color: existing?.color || '#EF4444',
          width: existing?.width || 3.0,
          totalLengthKm: parsed.totalLengthKm || 0,
          featuresCount: parsed.geoJson.features.length,
          geoJsonData: parsed.geoJson,
          uploadDate: new Date().toISOString().slice(0, 10),
          classifyColumn: existing?.classifyColumn,
          symbologyRules: existing?.symbologyRules,
        };
        if (onReplacePipeLayer) {
          onReplacePipeLayer(targetReplace.id, updatedPipe);
        } else {
          onDeletePipeLayer(targetReplace.id);
          onAddPipeLayer(updatedPipe);
        }
        setSuccessMessage(`Berhasil memperbarui file pipa "${updatedPipe.name}" dengan file baru "${file.name}" (${parsed.geoJson.features.length} segmen, ~${parsed.totalLengthKm?.toFixed(1) || '0'} km). Tersimpan permanen.`);
        if (parsed.bounds && onFocusLayerBounds) {
          onFocusLayerBounds(parsed.bounds);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memperbarui file spasial.');
    } finally {
      setIsProcessing(false);
      setTargetReplace(null);
      e.target.value = '';
    }
  };

  const handleTriggerDelete = (id: string, name: string, type: 'pipe' | 'zone') => {
    setLayerToDelete({ id, name, type });
  };

  const handleExecuteDelete = () => {
    if (!layerToDelete) return;
    const { id, name, type } = layerToDelete;
    if (type === 'pipe') {
      onDeletePipeLayer(id);
    } else {
      onDeleteServiceZoneLayer(id);
    }
    setLayerToDelete(null);
    setSuccessMessage(`File "${name}" berhasil dihapus permanen dari sistem.`);
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
        {/* Hidden File Input for Replace */}
        <input
          ref={replaceInputRef}
          type="file"
          accept=".kml,.kmz,.geojson,.json,.zip"
          onChange={handleReplaceFileChange}
          className="hidden"
        />

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
                Unggah &amp; Kelola File Jaringan Pipa &amp; Batas Zona
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>
                File yang diunggah tersimpan permanen di IndexedDB sistem &amp; tidak hilang saat update data
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
          {/* Storage Assurance Banner */}
          <div className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
            isLight ? 'bg-sky-50/80 border-sky-200 text-sky-950' : 'bg-sky-950/50 border-sky-800 text-sky-200'
          }`}>
            <div className="flex items-start gap-2.5">
              <Database className="w-4 h-4 text-[#005baa] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[11px] block">
                  Penyimpanan File Permanen (IndexedDB Sistem Aktif)
                </span>
                <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                  File jaringan pipa dan zona pelayanan yang Anda unggah <strong>tidak akan hilang</strong> saat refresh browser, penambahan pelanggan baru, maupun sinkronisasi spreadsheet. Anda dapat menghapus atau memperbarui file kapan saja bila ada data terbaru.
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-[#005baa] text-white font-bold shrink-0">
              {pipeLayers.length} Pipa • {serviceZoneLayers.length} Zona
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
                <span className="font-bold text-[#005baa]">Sedang memproses dan menyimpan file spasial ke sistem...</span>
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
                    Klik atau Tarik File KMZ, KML, GeoJSON, atau SHP (.zip) ke Sini
                  </span>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    File langsung diplot ke peta, dihitung panjang/luas, dan tersimpan permanen di memori sistem
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
                Daftar File Spasial Tersimpan di Sistem
              </span>
              {onRestoreDefaultLayers && (
                <button
                  onClick={onRestoreDefaultLayers}
                  className="text-[#005baa] hover:underline text-[10px] flex items-center gap-1 font-bold"
                  title="Kembalikan Layer Default Sistem"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Pulihkan Data Bawaan</span>
                </button>
              )}
            </div>

            {/* Banner Konfirmasi Hapus File Spasial (Non-blocking) */}
            {layerToDelete && (
              <div className="p-3 rounded-xl bg-rose-500/10 border-2 border-rose-500 text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <div>
                    <div className="font-bold text-xs">Konfirmasi Hapus File: "{layerToDelete.name}"?</div>
                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      File ini ({layerToDelete.type === 'pipe' ? 'Jaringan Pipa' : 'Batas Zona Pelayanan'}) akan dihapus permanen dari sistem dan peta.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setLayerToDelete(null)}
                    className="px-2.5 py-1.5 rounded-lg border text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDelete}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Sekarang</span>
                  </button>
                </div>
              </div>
            )}

            {/* Pipa Layers */}
            <div className="space-y-2">
              <div className={`text-[10px] font-mono font-bold uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Jaringan Pipa ({pipeLayers.length}):
              </div>
              {pipeLayers.length === 0 ? (
                <div
                  className={`p-3 text-center rounded-xl border ${
                    isLight ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  Tidak ada file pipa aktif. Silakan unggah file .KMZ atau .KML Anda di atas.
                </div>
              ) : (
                pipeLayers.map((layer) => {
                  const isSample = layer.id.startsWith('default-');
                  return (
                    <div
                      key={layer.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border gap-2.5 transition ${
                        isLight ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-3.5 h-3.5 rounded-full bg-[#EF4444] shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{layer.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                              isSample
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}>
                              {isSample ? 'Contoh Bawaan' : 'File Unggahan Anda'}
                            </span>
                          </div>
                          <div className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>
                            {layer.fileName || 'Layer Pipa'} • {layer.type} • {layer.featuresCount} segmen pipa • ~{layer.totalLengthKm?.toFixed(1) ?? 0} km
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        {/* Ganti dengan File Terbaru */}
                        <button
                          type="button"
                          onClick={() => handleTriggerReplace(layer.id, 'pipe', layer.name)}
                          className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition ${
                            isLight
                              ? 'bg-white hover:bg-slate-100 text-[#005baa] border-blue-200'
                              : 'bg-slate-900 hover:bg-slate-800 text-sky-300 border-sky-800'
                          }`}
                          title="Ganti / Perbarui layer ini dengan file KMZ/KML terbaru"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Ganti File</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedLayerForAttributeTable({ name: layer.name, geoJson: layer.geoJsonData })}
                          className={`p-1.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1 transition ${
                            isLight ? 'bg-white hover:bg-slate-100 text-[#005baa] border-blue-200' : 'bg-slate-900 hover:bg-slate-800 text-sky-300 border-sky-800'
                          }`}
                          title="Buka & Periksa Tabel Atribut File Pipa Ini"
                        >
                          <TableIcon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Atribut</span>
                        </button>

                        <button
                          onClick={() => handleExportLayerAsGeoJson(layer.name, layer.geoJsonData)}
                          className={`p-1.5 rounded-lg border text-[10px] font-semibold transition ${
                            isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                          title="Ekspor Layer ini sebagai GeoJSON Cadangan"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onTogglePipeLayer(layer.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
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
                          type="button"
                          onClick={() => handleTriggerDelete(layer.id, layer.name, 'pipe')}
                          className={`p-1.5 rounded-lg transition ${
                            isLight ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                          }`}
                          title="Hapus File Ini dari Sistem"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Service Zone Layers */}
            <div className="space-y-2 pt-2">
              <div className={`text-[10px] font-mono font-bold uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Batas Zona Pelayanan ({serviceZoneLayers.length}):
              </div>
              {serviceZoneLayers.length === 0 ? (
                <div
                  className={`p-3 text-center rounded-xl border ${
                    isLight ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  Tidak ada file zona pelayanan aktif. Silakan unggah file batas wilayah Anda.
                </div>
              ) : (
                serviceZoneLayers.map((zone) => {
                  const isSample = zone.id.startsWith('default-');
                  return (
                    <div
                      key={zone.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border gap-2.5 transition ${
                        isLight ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Shield className="w-4 h-4 text-[#005baa] shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{zone.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                              isSample
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}>
                              {isSample ? 'Contoh Bawaan' : 'File Unggahan Anda'}
                            </span>
                          </div>
                          <div className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>
                            {zone.fileName || 'Layer Zona'} • {zone.type} • {zone.featuresCount} poligon wilayah
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        {/* Ganti dengan File Terbaru */}
                        <button
                          type="button"
                          onClick={() => handleTriggerReplace(zone.id, 'zone', zone.name)}
                          className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition ${
                            isLight
                              ? 'bg-white hover:bg-slate-100 text-[#005baa] border-blue-200'
                              : 'bg-slate-900 hover:bg-slate-800 text-sky-300 border-sky-800'
                          }`}
                          title="Ganti / Perbarui layer zona ini dengan file terbaru"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Ganti File</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedLayerForAttributeTable({ name: zone.name, geoJson: zone.geoJsonData })}
                          className={`p-1.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1 transition ${
                            isLight ? 'bg-white hover:bg-slate-100 text-[#005baa] border-blue-200' : 'bg-slate-900 hover:bg-slate-800 text-sky-300 border-sky-800'
                          }`}
                          title="Buka & Periksa Tabel Atribut File Batas Zona Ini"
                        >
                          <TableIcon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Atribut</span>
                        </button>

                        <button
                          onClick={() => handleExportLayerAsGeoJson(zone.name, zone.geoJsonData)}
                          className={`p-1.5 rounded-lg border text-[10px] font-semibold transition ${
                            isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                          title="Ekspor Layer ini sebagai GeoJSON Cadangan"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onToggleServiceZoneLayer(zone.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
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
                          type="button"
                          onClick={() => handleTriggerDelete(zone.id, zone.name, 'zone')}
                          className={`p-1.5 rounded-lg transition ${
                            isLight ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                          }`}
                          title="Hapus File Zona Ini dari Sistem"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex justify-between items-center ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <FolderSync className="w-3.5 h-3.5 text-emerald-600" />
            <span>Penyimpanan otomatis tersinkronisasi</span>
          </div>

          <button
            onClick={onClose}
            className={`px-5 py-2 font-bold rounded-xl text-xs transition ${
              isLight ? 'bg-[#005baa] hover:bg-[#004b8d] text-white shadow-sm' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Modal Tabel Atribut */}
      {selectedLayerForAttributeTable && (
        <AttributeTableModal
          isOpen={true}
          onClose={() => setSelectedLayerForAttributeTable(null)}
          layerName={selectedLayerForAttributeTable.name}
          geoJsonData={selectedLayerForAttributeTable.geoJson}
          theme={theme}
        />
      )}
    </div>
  );
};

