import React from 'react';
import { ServiceZoneLayer } from '../types/gis';
import { X, Palette } from 'lucide-react';

interface ZoneColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceZoneLayers: ServiceZoneLayer[];
  onUpdateZoneColors: (layerId: string, updatedGeoJson: GeoJSON.FeatureCollection) => void;
  theme?: 'light' | 'dark';
}

const PRESET_COLORS = [
  '#005baa', // Aetra Signature Blue
  '#e46423', // Aetra Orange
  '#0284C7', // Sky Blue
  '#7C3AED', // Violet / Purple
  '#059669', // Emerald Green
  '#DB2777', // Pink / Magenta
  '#CA8A04', // Amber / Gold
  '#DC2626', // Red
  '#2563EB', // Royal Blue
  '#0D9488', // Teal
];

export const ZoneColorModal: React.FC<ZoneColorModalProps> = ({
  isOpen,
  onClose,
  serviceZoneLayers,
  onUpdateZoneColors,
  theme = 'light',
}) => {
  const isLight = theme === 'light';
  if (!isOpen) return null;

  const activeLayer = serviceZoneLayers[0];
  if (!activeLayer) return null;

  const handleColorChange = (featureIndex: number, newColor: string) => {
    const updatedGeoJson: GeoJSON.FeatureCollection = {
      ...activeLayer.geoJsonData,
      features: activeLayer.geoJsonData.features.map((feat, idx) => {
        if (idx === featureIndex) {
          return {
            ...feat,
            properties: {
              ...feat.properties,
              color: newColor,
              fillColor: newColor,
            },
          };
        }
        return feat;
      }),
    };

    onUpdateZoneColors(activeLayer.id, updatedGeoJson);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`${
          isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900 text-slate-100 border-slate-700/80'
        } border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
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
                Kustomisasi Warna Zona &amp; Kecamatan
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Ubah warna batas poligon per wilayah kecamatan Aetra
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div
            className={`text-xs p-3 rounded-xl border ${
              isLight ? 'bg-[#005baa]/5 border-blue-100 text-slate-700' : 'bg-slate-950 text-slate-300 border-slate-800/80'
            }`}
          >
            Pilih warna untuk masing-masing batas wilayah kecamatan di area konsesi Aetra Air Tangerang. Perubahan langsung aktif di peta satelit.
          </div>

          <div className="space-y-3">
            {activeLayer.geoJsonData.features.map((feature, idx) => {
              const props = feature.properties || {};
              const name = props.name || props.NAMA || props.kecamatan || `Zona #${idx + 1}`;
              const kecamatan = props.kecamatan || props.KECAMATAN || 'Wilayah Konsesi';
              const currentColor = props.fillColor || props.color || activeLayer.fillColor || '#005baa';

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex flex-col gap-2.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-md border border-black/10 shadow-sm shrink-0"
                        style={{ backgroundColor: currentColor }}
                      />
                      <div>
                        <div className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{name}</div>
                        <div className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          Kecamatan: {kecamatan}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        isLight ? 'bg-white text-slate-800 border-slate-300' : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      {currentColor.toUpperCase()}
                    </span>
                  </div>

                  {/* Preset Color Swatches */}
                  <div className={`flex items-center gap-1.5 flex-wrap pt-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/60'}`}>
                    <span className={`text-[10px] mr-1 font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Warna:</span>
                    {PRESET_COLORS.map((color) => {
                      const isSelected = currentColor.toLowerCase() === color.toLowerCase();
                      return (
                        <button
                          key={color}
                          onClick={() => handleColorChange(idx, color)}
                          className={`w-6 h-6 rounded-lg transition-transform border ${
                            isSelected
                              ? 'scale-110 border-white ring-2 ring-[#005baa] shadow-sm'
                              : 'border-black/10 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      );
                    })}

                    {/* Native Color Picker */}
                    <label
                      className={`w-6 h-6 rounded-lg border ${
                        isLight ? 'border-slate-300 bg-white hover:border-[#005baa]' : 'border-white/20 bg-slate-900 hover:border-slate-400'
                      } flex items-center justify-center cursor-pointer relative overflow-hidden`}
                      title="Pilih Warna Kustom"
                    >
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => handleColorChange(idx, e.target.value)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                      <Palette className={`w-3.5 h-3.5 ${isLight ? 'text-[#005baa]' : 'text-slate-300'}`} />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-end gap-2 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#005baa] hover:bg-[#004b8d] text-white font-bold text-xs transition shadow-md shadow-[#005baa]/20"
          >
            Selesai &amp; Terapkan
          </button>
        </div>
      </div>
    </div>
  );
};
