import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { CustomerSurvey, PipeNetworkLayer, ServiceZoneLayer, InterestStatus, SymbologyRule } from '../types/gis';
import { calculateGeoJsonBounds } from '../utils/kmlParser';
import { getPipeStyleByDiameter } from '../utils/pipeStyling';
import { getFeatureSymbologyStyle } from '../utils/symbologyHelper';
import { formatPhotoUrl } from '../utils/spreadsheetParser';
import {
  Layers,
  Compass,
  Radio,
  Minimize2,
  Maximize2,
  Shield,
  ZoomIn,
  Palette,
  Eye,
  EyeOff,
  Sliders,
  Tag,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle,
  Table as TableIcon,
} from 'lucide-react';
import { AttributeTableModal } from './AttributeTableModal';

interface MapComponentProps {
  customers: CustomerSurvey[];
  pipeLayers: PipeNetworkLayer[];
  serviceZoneLayers?: ServiceZoneLayer[];
  selectedCustomer: CustomerSurvey | null;
  onSelectCustomer: (cust: CustomerSurvey) => void;
  onOpenAnalystModal?: () => void;
  onOpenSymbologyModal?: () => void;
  onOpenZoneColorModal?: () => void;
  onMapClick?: (lat: number, lng: number) => void;
  isPickingLocation?: boolean;
  focusBounds?: { minLng: number; minLat: number; maxLng: number; maxLat: number } | null;
  theme?: 'light' | 'dark';
  showServiceZones?: boolean;
  onToggleShowServiceZones?: () => void;
  onToggleServiceZoneLayer?: (layerId: string) => void;
  onDeleteServiceZoneLayer?: (layerId: string) => void;
  onDeletePipeLayer?: (layerId: string) => void;
  zoneLabelAttribute?: string;
  onZoneLabelAttributeChange?: (attr: string) => void;
  onOpenUploadModal?: () => void;
}

type BaseLayerType = 'google-satellite' | 'google-hybrid' | 'osm';

export const MapComponent: React.FC<MapComponentProps> = ({
  customers,
  pipeLayers,
  serviceZoneLayers = [],
  selectedCustomer,
  onSelectCustomer,
  onOpenAnalystModal,
  onOpenSymbologyModal,
  onOpenZoneColorModal,
  onOpenUploadModal,
  onMapClick,
  isPickingLocation = false,
  focusBounds,
  theme = 'light',
  showServiceZones: propShowServiceZones,
  onToggleShowServiceZones,
  onToggleServiceZoneLayer,
  onDeleteServiceZoneLayer,
  onDeletePipeLayer,
  zoneLabelAttribute: propZoneLabelAttribute,
  onZoneLabelAttributeChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const customersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const pipeLayersGroupRef = useRef<L.LayerGroup | null>(null);
  const serviceZonesGroupRef = useRef<L.LayerGroup | null>(null);
  const zoneLabelsGroupRef = useRef<L.LayerGroup | null>(null);

  // Default basemap: Google Satelit (lyrs=s)
  const [activeBaseLayer, setActiveBaseLayer] = useState<BaseLayerType>('google-satellite');

  // Panel Kontrol & Legenda GIS Tunggal
  const [isLayerControlMinimized, setIsLayerControlMinimized] = useState<boolean>(false);

  // Visibilitas Master Layer
  const [showPipes, setShowPipes] = useState<boolean>(true);
  const [internalShowServiceZones, setInternalShowServiceZones] = useState<boolean>(true);
  const showServiceZones = propShowServiceZones !== undefined ? propShowServiceZones : internalShowServiceZones;

  const handleToggleServiceZones = () => {
    if (onToggleShowServiceZones) {
      onToggleShowServiceZones();
    } else {
      setInternalShowServiceZones((prev) => !prev);
    }
  };

  // Visibilitas Status Minat Pelanggan (Hanya Minat dan Tidak Minat)
  const [visibleInterestStatuses, setVisibleInterestStatuses] = useState<Record<InterestStatus, boolean>>({
    Minat: true,
    'Tidak Minat': true,
  });

  // Visibilitas Penanda Review Spreading Berulang
  const [showDuplicateMarks, setShowDuplicateMarks] = useState<boolean>(true);

  // Tab Kategori Legenda GIS: 'all' | 'zones' | 'pipes' | 'basemap'
  const [activeLegendTab, setActiveLegendTab] = useState<'all' | 'zones' | 'pipes' | 'basemap'>('all');

  // Status minimize/collapse basemap (Default compact agar tidak memakan ruang)
  const [isBasemapCollapsed, setIsBasemapCollapsed] = useState<boolean>(true);

  // Status minimize/collapse untuk rincian kategori diameter pipa (Default minimize agar tampilan clean)
  const [isPipeCategoryCollapsed, setIsPipeCategoryCollapsed] = useState<boolean>(true);

  // State untuk inspeksi tabel atribut layer & konfirmasi hapus layer di legenda
  const [selectedLayerForAttributeTable, setSelectedLayerForAttributeTable] = useState<{
    name: string;
    geoJson: GeoJSON.FeatureCollection;
  } | null>(null);
  const [legendLayerToDelete, setLegendLayerToDelete] = useState<{
    id: string;
    name: string;
    type: 'pipe' | 'zone';
  } | null>(null);

  // Status minimize/collapse untuk panel zona pelayanan
  const [isZonesSectionCollapsed, setIsZonesSectionCollapsed] = useState<boolean>(false);

  // Atribut yang dipilih untuk label zona pelayanan di peta
  const [internalZoneLabelAttribute, setInternalZoneLabelAttribute] = useState<string>('kecamatan');
  const zoneLabelAttribute = propZoneLabelAttribute !== undefined ? propZoneLabelAttribute : internalZoneLabelAttribute;

  const handleZoneLabelChange = (attr: string) => {
    if (onZoneLabelAttributeChange) {
      onZoneLabelAttributeChange(attr);
    } else {
      setInternalZoneLabelAttribute(attr);
    }
  };

  // Kumpulkan SELURUH daftar kolom atribut yang tersedia dari layer zona (tanpa batasan dan membaca semua tipe)
  const { availableZoneAttributes, zoneAttributeSampleValues } = useMemo(() => {
    const cols = new Set<string>();
    const samples: Record<string, string> = {};

    serviceZoneLayers.forEach((layer) => {
      // 1. Masukkan kolom yang terdeteksi saat parsing file
      if (layer.detectedColumns && Array.isArray(layer.detectedColumns)) {
        layer.detectedColumns.forEach((col: string) => {
          if (col && col !== 'layerType' && col !== 'description') {
            cols.add(col);
          }
        });
      }

      if (!layer.geoJsonData || !Array.isArray(layer.geoJsonData.features)) return;
      layer.geoJsonData.features.forEach((f) => {
        const props = f.properties;
        if (!props) return;

        // Jika description memiliki HTML table yang belum di-parse (misal KML lama di IndexedDB)
        if (props.description && typeof props.description === 'string' && props.description.includes('<table')) {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(props.description, 'text/html');
            const rows = Array.from(doc.querySelectorAll('tr'));
            rows.forEach((row) => {
              const cells = Array.from(row.querySelectorAll('td, th'));
              if (cells.length >= 2) {
                const key = cells[0].textContent?.trim().replace(/:$/, '');
                const val = cells[1].textContent?.trim();
                if (key && !key.toLowerCase().includes('attribute') && !props[key]) {
                  props[key] = val;
                }
              }
            });
          } catch {
            // ignore
          }
        }

        Object.keys(props).forEach((k) => {
          if (k !== 'layerType' && k !== 'description') {
            cols.add(k);
            if (!samples[k]) {
              const val = props[k];
              if (val !== undefined && val !== null && String(val).trim() !== '') {
                samples[k] = String(val);
              }
            }
          }
        });
      });
    });

    if (cols.size === 0) {
      cols.add('kecamatan');
      cols.add('name');
      cols.add('kode');
    }

    // Urutkan kolom: prioritaskan kolom kunci (nama, kecamatan, kode, dma, zona, kab), lalu alfabetis
    const priorityKeywords = ['kecamatan', 'nama', 'name', 'kode', 'zona', 'dma', 'wilayah', 'kab'];
    const colList = Array.from(cols).sort((a, b) => {
      const isPriorityA = priorityKeywords.some((p) => a.toLowerCase().includes(p));
      const isPriorityB = priorityKeywords.some((p) => b.toLowerCase().includes(p));
      if (isPriorityA && !isPriorityB) return -1;
      if (!isPriorityA && isPriorityB) return 1;
      return a.localeCompare(b);
    });

    return {
      availableZoneAttributes: colList,
      zoneAttributeSampleValues: samples,
    };
  }, [serviceZoneLayers]);

  // Koleksi GeoJSON dari layer pipa yang sedang AKTIF / VISIBLE
  const activeVisiblePipeCollections = useMemo(() => {
    if (!showPipes) return [];
    return pipeLayers.filter((l) => l.visible).map((l) => l.geoJsonData);
  }, [pipeLayers, showPipes]);

  // Toggle status minat
  const toggleInterestStatus = (status: InterestStatus) => {
    setVisibleInterestStatuses((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  // Inisialisasi Peta Leaflet dengan Hierarki Layer Panes
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = [-6.1684, 106.5367];
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    // Initial base layer: Google Satelit (lyrs=s)
    const tileLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // 1. ZONES PANE (Z-Index 400 - Paling bawah)
    const zonesPane = map.createPane('zonesPane');
    zonesPane.style.zIndex = '400';

    // 2. PIPES PANE (Z-Index 500 - Di atas zona pelayanan)
    const pipesPane = map.createPane('pipesPane');
    pipesPane.style.zIndex = '500';

    // 3. LABELS PANE (Z-Index 550)
    const labelsPane = map.createPane('labelsPane');
    labelsPane.style.zIndex = '550';

    // 4. CUSTOMERS PANE (Z-Index 600 - Titik survei paling atas)
    const customersPane = map.createPane('customersPane');
    customersPane.style.zIndex = '600';

    // Inisialisasi Layer Groups
    const zonesGroup = L.layerGroup().addTo(map);
    const zoneLabelsGroup = L.layerGroup().addTo(map);
    const pipeGroup = L.layerGroup().addTo(map);
    const custGroup = L.layerGroup().addTo(map);

    serviceZonesGroupRef.current = zonesGroup;
    zoneLabelsGroupRef.current = zoneLabelsGroup;
    pipeLayersGroupRef.current = pipeGroup;
    customersLayerGroupRef.current = custGroup;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Base Tile Layer (Google Satelit, Google Satelit Hybrid, OSM)
  useEffect(() => {
    if (!mapRef.current) return;

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    let url = '';
    let maxZoom = 20;

    switch (activeBaseLayer) {
      case 'google-satellite':
        url = 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
        break;
      case 'google-hybrid':
        url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
        break;
      case 'osm':
        url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        maxZoom = 19;
        break;
    }

    const newLayer = L.tileLayer(url, {
      maxZoom,
      subdomains: activeBaseLayer.startsWith('google') ? ['mt0', 'mt1', 'mt2', 'mt3'] : ['a', 'b', 'c'],
    }).addTo(mapRef.current);

    tileLayerRef.current = newLayer;
  }, [activeBaseLayer]);

  // Click handler pada peta
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [onMapClick]);

  // Handle Focus to Bounding Box
  useEffect(() => {
    if (!focusBounds || !mapRef.current) return;
    try {
      const bounds: L.LatLngBoundsExpression = [
        [focusBounds.minLat, focusBounds.minLng],
        [focusBounds.maxLat, focusBounds.maxLng],
      ];
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 17, animate: true, duration: 1.0 });
    } catch (e) {
      console.warn('Gagal fitBounds:', e);
    }
  }, [focusBounds]);

  // Render Batas Polygon Zona Pelayanan (di Pane Bawah 'zonesPane')
  useEffect(() => {
    const zonesGroup = serviceZonesGroupRef.current;
    const labelsGroup = zoneLabelsGroupRef.current;
    if (!zonesGroup || !labelsGroup) return;

    zonesGroup.clearLayers();
    labelsGroup.clearLayers();

    if (!showServiceZones) return;

    serviceZoneLayers.forEach((zoneLayer) => {
      if (!zoneLayer.visible) return;

      const geoJsonLayer = L.geoJSON(zoneLayer.geoJsonData, {
        pane: 'zonesPane', // Memastikan zona selalu berada di bawah pipa
        style: (feature) => {
          if (!feature) return {};
          const props = feature.properties || {};

          const customStyle = getFeatureSymbologyStyle(feature, zoneLayer.classifyColumn, zoneLayer.symbologyRules);
          const color = customStyle?.color || props.color || props.fillColor || zoneLayer.borderColor || '#38BDF8';
          const fillColor = customStyle?.fillColor || props.fillColor || props.color || zoneLayer.fillColor || '#0284C7';

          return {
            color: color,
            weight: customStyle?.width || zoneLayer.borderWidth || 2.0,
            opacity: 0.9,
            fillColor: fillColor,
            fillOpacity: zoneLayer.fillOpacity !== undefined ? zoneLayer.fillOpacity : 0.14,
            dashArray: '5, 4',
          };
        },
        onEachFeature: (feature, l) => {
          const props = feature.properties || {};
          const zoneName = props.name || props.NAMA || zoneLayer.name || 'Zona Pelayanan PAM';
          const kecamatan = props.kecamatan || props.KECAMATAN || 'Wilayah Konsesi';
          const luas = props.luasWilayahKm2 || props.LUAS_KM2 || zoneLayer.areaKm2 || 0;

          const customStyle = getFeatureSymbologyStyle(feature, zoneLayer.classifyColumn, zoneLayer.symbologyRules);
          const color = customStyle?.color || props.color || props.fillColor || '#38BDF8';

          let dynamicLabelValue = '';
          if (zoneLabelAttribute !== 'none') {
            const targetLower = zoneLabelAttribute.toLowerCase().trim();
            const matchedKey = Object.keys(props).find(
              (k) => k.toLowerCase().trim() === targetLower
            );
            const rawVal =
              matchedKey !== undefined
                ? props[matchedKey]
                : (props[zoneLabelAttribute] ??
                  props[zoneLabelAttribute.toUpperCase()] ??
                  props[zoneLabelAttribute.toLowerCase()]);

            if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
              dynamicLabelValue = String(rawVal);
            } else {
              dynamicLabelValue = props.name || props.NAMA || props.kecamatan || props.KECAMATAN || zoneName;
            }
          }

          // Tooltip
          const activeLabelHeader = zoneLabelAttribute !== 'none' ? zoneLabelAttribute.toUpperCase() : 'ZONA';
          l.bindTooltip(
            `<div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; line-height: 1.3;">
              <strong style="color: ${color};">🛡️ ${zoneName}</strong><br/>
              <span>${activeLabelHeader}: <strong>${dynamicLabelValue || zoneName}</strong> ${luas ? `| ~${luas} km²` : ''}</span>
            </div>`,
            { sticky: true, className: 'cad-map-tooltip' }
          );

          // Popup
          l.bindPopup(`
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; background: #0f172a; color: #f8fafc; padding: 8px; border-radius: 6px; border: 1.5px solid ${color};">
              <div style="font-weight: 800; font-size: 12px; color: ${color}; margin-bottom: 4px;">
                ${zoneName}
              </div>
              <div style="border-top: 1px solid #334155; padding-top: 4px; line-height: 1.5;">
                <div>LABEL AKTIF: <strong style="color: #ffffff;">${dynamicLabelValue || 'Tanpa Label'}</strong></div>
                <div>KECAMATAN: ${kecamatan}</div>
                <div>KODE: ${props.kode || props.KODE || 'ZONA'}</div>
                ${luas ? `<div>ESTIMASI LUAS: ${luas} km²</div>` : ''}
                <div style="color: #00ff66; font-weight: bold; margin-top: 2px;">STATUS: ZONA PELAYANAN AKTIF</div>
              </div>
            </div>
          `);

          // Label Teks di Centroid (Hanya jika opsi BUKAN 'none' dan nilai label ada)
          if (zoneLabelAttribute !== 'none' && dynamicLabelValue) {
            try {
              if ((l as any).getBounds) {
                const bounds = (l as any).getBounds();
                const center = bounds.getCenter();

                const labelIcon = L.divIcon({
                  className: 'zone-centroid-label',
                  html: `
                    <div style="
                      background: rgba(15, 23, 42, 0.92);
                      border: 1.5px solid ${color};
                      color: #ffffff;
                      padding: 1.5px 6px;
                      border-radius: 4px;
                      font-size: 9.5px;
                      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
                      font-weight: 700;
                      letter-spacing: 0.1px;
                      white-space: nowrap;
                      display: inline-flex;
                      align-items: center;
                      gap: 3px;
                      width: max-content;
                      box-shadow: 0 2px 6px rgba(0,0,0,0.7), 0 0 5px ${color}55;
                      pointer-events: none;
                      transform: translate(-50%, -50%);
                    ">
                      <span style="color: ${color}; font-size: 9px;">📍</span><span>${dynamicLabelValue}</span>
                    </div>
                  `,
                  iconSize: [0, 0],
                  iconAnchor: [0, 0],
                });

                const labelMarker = L.marker(center, { icon: labelIcon, interactive: false, pane: 'labelsPane' });
                labelsGroup.addLayer(labelMarker);
              }
            } catch (e) {
              // ignore
            }
          }
        },
      });

      zonesGroup.addLayer(geoJsonLayer);
    });
  }, [serviceZoneLayers, showServiceZones, zoneLabelAttribute]);

  // Render Layer Pipa Jaringan (di Pane Atas 'pipesPane' - Pasti di atas Zona)
  useEffect(() => {
    const pipeGroup = pipeLayersGroupRef.current;
    if (!pipeGroup) return;

    pipeGroup.clearLayers();

    if (!showPipes) return;

    pipeLayers.forEach((layer) => {
      if (!layer.visible) return;

      const hasCustomSymbology = layer.classifyColumn && layer.symbologyRules && layer.symbologyRules.length > 0;

      const geoJsonLayer = L.geoJSON(layer.geoJsonData, {
        pane: 'pipesPane', // Memastikan pipa SELALU di atas zona pelayanan
        style: (feature) => {
          if (!feature) return {};

          if (hasCustomSymbology) {
            const customStyle = getFeatureSymbologyStyle(feature, layer.classifyColumn, layer.symbologyRules);
            if (customStyle) {
              return {
                color: customStyle.color,
                weight: customStyle.width || 3.0,
                opacity: 1.0,
                lineCap: 'round',
                lineJoin: 'round',
              };
            }
          }

          const props = feature.properties || {};
          const style = getPipeStyleByDiameter(props, layer.diameterRules);

          return {
            color: style.color,
            weight: style.weight,
            opacity: 1.0,
            lineCap: 'round',
            lineJoin: 'round',
          };
        },
        onEachFeature: (feature, l) => {
          const props = feature.properties || {};
          const pipeName = props.name || props.NAMA || layer.name || 'Pipa Jaringan PAM';
          const diameter = props.diameter || props.DIAMETER || props.DN || 'DN 150mm';
          const material = props.material || props.MATERIAL || 'HDPE';
          const pressure = props.tekananBar || props.pressure || '2.5 bar';

          let lineColor = '#00F5FF';
          let labelText = diameter;

          if (hasCustomSymbology) {
            const customStyle = getFeatureSymbologyStyle(feature, layer.classifyColumn, layer.symbologyRules);
            if (customStyle) {
              lineColor = customStyle.color;
              labelText = `${layer.classifyColumn?.toUpperCase()}: ${customStyle.value}`;
            }
          } else {
            const style = getPipeStyleByDiameter(props, layer.diameterRules);
            lineColor = style.color;
            labelText = `${diameter} (${style.rangeLabel})`;
          }

          l.bindTooltip(
            `<div style="font-family: 'JetBrains Mono', monospace; font-size: 10px;">
              <strong style="color: ${lineColor};">${pipeName}</strong><br/>
              <span>${labelText} | Mat: ${material}</span>
            </div>`,
            { sticky: true, className: 'cad-pipe-tooltip' }
          );

          l.bindPopup(`
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; background: #0f172a; color: #f8fafc; padding: 8px; border-radius: 6px; border: 1.5px solid ${lineColor};">
              <div style="font-weight: 800; font-size: 12px; color: ${lineColor}; margin-bottom: 4px;">
                ${pipeName}
              </div>
              <div style="border-top: 1px solid #334155; padding-top: 4px; line-height: 1.5;">
                <div>SIMBOLOGI: <span style="color: ${lineColor}; font-weight: bold;">${labelText}</span></div>
                <div>DIAMETER: ${diameter}</div>
                <div>MATERIAL: ${material}</div>
                <div>TEKANAN: ${pressure}</div>
                <div style="color: #00ff66; font-weight: bold;">STATUS: AKTIF MENGALIR</div>
              </div>
            </div>
          `);
        },
      });

      pipeGroup.addLayer(geoJsonLayer);
    });
  }, [pipeLayers, showPipes]);

  // Render Marker Pelanggan (di Pane 'customersPane' Paling Atas)
  useEffect(() => {
    const custGroup = customersLayerGroupRef.current;
    if (!custGroup) return;

    custGroup.clearLayers();
    markerMapRef.current.clear();

    customers.forEach((cust) => {
      if (!visibleInterestStatuses[cust.statusMinat]) {
        return;
      }

      const getCadColor = (status: InterestStatus) => {
        switch (status) {
          case 'Minat':
            return { hex: '#00FF66', glow: 'rgba(0, 255, 102, 0.8)', border: '#FFFFFF' };
          case 'Tidak Minat':
          default:
            return { hex: '#FF1744', glow: 'rgba(255, 23, 68, 0.8)', border: '#FFFFFF' };
        }
      };

      const style = getCadColor(cust.statusMinat);
      const isSelected = selectedCustomer?.id === cust.id;
      const isDuplicate = !!cust.isDuplicateCandidate && showDuplicateMarks;
      const visitCount = cust.duplicateCount || 2;

      const markerHtml = `
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: ${isSelected ? '24px' : '18px'};
          height: ${isSelected ? '24px' : '18px'};
          cursor: pointer;
        ">
          ${
            isDuplicate
              ? `<div style="
                  position: absolute;
                  width: 22px;
                  height: 22px;
                  border-radius: 50%;
                  border: 1.5px dashed #FFD600;
                  box-shadow: 0 0 6px rgba(255, 214, 0, 0.8);
                "></div>
                <div style="
                  position: absolute;
                  top: -8px;
                  right: -9px;
                  background: #B45309;
                  color: #FEF3C7;
                  font-size: 8px;
                  font-family: monospace;
                  font-weight: 800;
                  padding: 1px 3px;
                  border-radius: 3px;
                  border: 1px solid #F59E0B;
                  line-height: 1;
                ">${visitCount}x</div>`
              : ''
          }

          ${
            isSelected
              ? `<div style="
                  position: absolute;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  border: 2px solid #00F5FF;
                "></div>`
              : ''
          }

          <div style="
            width: ${isSelected ? '12px' : '9px'};
            height: ${isSelected ? '12px' : '9px'};
            background-color: ${style.hex};
            border-radius: 50%;
            border: 1.5px solid ${style.border};
            box-shadow: 0 0 4px ${style.glow}, 0 1px 2px rgba(0,0,0,0.8);
          "></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'cad-point-marker',
        iconSize: [isSelected ? 24 : 18, isSelected ? 24 : 18],
        iconAnchor: [isSelected ? 12 : 9, isSelected ? 12 : 9],
      });

      const marker = L.marker([cust.latitude, cust.longitude], { icon: customIcon, pane: 'customersPane' });
      const photoUrl = formatPhotoUrl(cust.fotoProperti || cust.fotoRumahUrl);

      marker.bindTooltip(
        `<div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; line-height: 1.3;">
          <span style="color: ${style.hex}; font-weight: bold;">● ${cust.statusMinat}</span><br/>
          <strong>${cust.nama}</strong><br/>
          <span style="color: #94a3b8;">Sales: ${cust.salesNama}</span>
          ${photoUrl ? `<br/><span style="color: #38bdf8; font-weight: bold;">📷 Ada Foto Properti</span>` : ''}
          ${isDuplicate ? `<br/><span style="color: #f59e0b; font-weight: bold;">⚠️ Review Spreading Berulang (${visitCount}x Kunjungan)</span>` : ''}
        </div>`,
        { direction: 'top', offset: [0, -6], className: 'cad-map-tooltip' }
      );

      const popupDiv = document.createElement('div');
      popupDiv.className = 'p-2 text-slate-100 text-xs font-sans max-w-xs bg-slate-900 rounded-lg';
      popupDiv.innerHTML = `
        <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #0f172a; padding: 10px; border-radius: 8px; border: 1px solid #334155; color: #f8fafc; width: 260px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="font-weight: 800; font-size: 13px; color: #f8fafc;">${cust.nama}</span>
            <span style="
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 700;
              color: #000;
              background-color: ${style.hex};
              font-family: monospace;
            ">${cust.statusMinat}</span>
          </div>

          <div style="color: #94a3b8; font-size: 11px; margin-bottom: 6px;">
            ${cust.alamat}
          </div>

          ${
            photoUrl
              ? `
              <div style="margin-bottom: 8px; border-radius: 6px; overflow: hidden; border: 1px solid #334155; position: relative; background: #020617;">
                <div style="position: absolute; top: 4px; left: 4px; z-index: 2; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); color: #38bdf8; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.3); display: flex; align-items: center; gap: 3px;">
                  📸 Foto Properti
                </div>
                <img
                  src="${photoUrl}"
                  alt="Foto Properti ${cust.nama}"
                  id="img-popup-${cust.id}"
                  style="width: 100%; height: 115px; object-fit: cover; display: block; cursor: pointer; transition: transform 0.2s;"
                  title="Klik untuk melihat detail & riwayat lengkap"
                  onerror="this.style.display='none'; document.getElementById('err-popup-${cust.id}').style.display='block';"
                />
                <div id="err-popup-${cust.id}" style="display: none; padding: 8px; font-size: 10px; color: #94a3b8; text-align: center; background: #1e293b;">
                  📸 <a href="${photoUrl}" target="_blank" rel="noreferrer" style="color: #38bdf8; text-decoration: underline; font-weight: bold;">Buka Tautan Foto ↗</a>
                </div>
              </div>
              `
              : ''
          }

          <div style="background: #1e293b; padding: 6px; border-radius: 6px; margin-bottom: 6px; font-size: 11px; line-height: 1.5; font-family: monospace;">
            <div><strong style="color:#38bdf8;">SALES:</strong> ${cust.salesNama}</div>
            <div><strong style="color:#38bdf8;">TGL:</strong> ${cust.tanggalSpreading}</div>
            <div><strong style="color:#38bdf8;">COORD:</strong> ${cust.latitude.toFixed(5)}, ${cust.longitude.toFixed(5)}</div>
          </div>

          ${
            isDuplicate
              ? `<div style="background: rgba(180, 83, 9, 0.3); border: 1px solid #f59e0b; padding: 6px; border-radius: 6px; margin-bottom: 6px; font-size: 10px; color: #fef08a;">
                  <strong>⚠️ Review Spreading Berulang (${visitCount}x Kunjungan)</strong><br/>
                  Beberapa sales menginput pada titik rumah yang sama.
                  <button id="btn-analyst-${cust.id}" style="
                    display: block;
                    width: 100%;
                    margin-top: 4px;
                    background: #d97706;
                    color: white;
                    border: none;
                    padding: 3px 6px;
                    border-radius: 4px;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 10px;
                  ">Review &amp; Gabung History Properti →</button>
                </div>`
              : ''
          }

          <button id="btn-detail-${cust.id}" style="
            width: 100%;
            background: #0284c7;
            color: white;
            padding: 5px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 11px;
            border: none;
            cursor: pointer;
          ">
            Lihat Detail Survei &amp; Riwayat →
          </button>
        </div>
      `;

      marker.bindPopup(popupDiv, { maxWidth: 300 });

      marker.on('popupopen', () => {
        const btnDetail = document.getElementById(`btn-detail-${cust.id}`);
        if (btnDetail) {
          btnDetail.onclick = () => onSelectCustomer(cust);
        }

        const imgPopup = document.getElementById(`img-popup-${cust.id}`);
        if (imgPopup) {
          imgPopup.onclick = () => onSelectCustomer(cust);
        }

        const btnAnalyst = document.getElementById(`btn-analyst-${cust.id}`);
        if (btnAnalyst && onOpenAnalystModal) {
          btnAnalyst.onclick = () => onOpenAnalystModal();
        }
      });

      marker.on('click', () => {
        onSelectCustomer(cust);
      });

      markerMapRef.current.set(cust.id, marker);
      custGroup.addLayer(marker);
    });
  }, [customers, selectedCustomer, visibleInterestStatuses, showDuplicateMarks, onSelectCustomer, onOpenAnalystModal]);

  // Center & Open Popup on selected customer
  useEffect(() => {
    if (!selectedCustomer || !mapRef.current) return;
    mapRef.current.flyTo([selectedCustomer.latitude, selectedCustomer.longitude], 18, {
      duration: 0.8,
    });
    const marker = markerMapRef.current.get(selectedCustomer.id);
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 400);
    }
  }, [selectedCustomer]);

  // Reset View to Tangerang Center
  const handleResetView = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([-6.1684, 106.5367], 13, { duration: 0.8 });
  };

  // Zoom to all active layers
  const handleZoomToLayers = () => {
    if (!mapRef.current) return;
    let minLng = Infinity,
      minLat = Infinity,
      maxLng = -Infinity,
      maxLat = -Infinity;
    let found = false;

    pipeLayers.forEach((l) => {
      if (l.visible) {
        const b = calculateGeoJsonBounds(l.geoJsonData);
        if (b) {
          minLng = Math.min(minLng, b.minLng);
          minLat = Math.min(minLat, b.minLat);
          maxLng = Math.max(maxLng, b.maxLng);
          maxLat = Math.max(maxLat, b.maxLat);
          found = true;
        }
      }
    });

    serviceZoneLayers.forEach((z) => {
      if (z.visible) {
        const b = calculateGeoJsonBounds(z.geoJsonData);
        if (b) {
          minLng = Math.min(minLng, b.minLng);
          minLat = Math.min(minLat, b.minLat);
          maxLng = Math.max(maxLng, b.maxLng);
          maxLat = Math.max(maxLat, b.maxLat);
          found = true;
        }
      }
    });

    if (found) {
      mapRef.current.fitBounds(
        [
          [minLat, minLng],
          [maxLat, maxLng],
        ],
        { padding: [50, 50], maxZoom: 16, animate: true, duration: 1.0 }
      );
    } else {
      handleResetView();
    }
  };

  // Fokuskan kamera langsung ke layer Zona Pelayanan
  const handleZoomToServiceZones = () => {
    if (!mapRef.current) return;
    let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
    let found = false;

    serviceZoneLayers.forEach((z) => {
      if (z.visible) {
        const b = calculateGeoJsonBounds(z.geoJsonData);
        if (b) {
          minLng = Math.min(minLng, b.minLng);
          minLat = Math.min(minLat, b.minLat);
          maxLng = Math.max(maxLng, b.maxLng);
          maxLat = Math.max(maxLat, b.maxLat);
          found = true;
        }
      }
    });

    if (found) {
      mapRef.current.fitBounds(
        [
          [minLat, minLng],
          [maxLat, maxLng],
        ],
        { padding: [50, 50], maxZoom: 15, animate: true, duration: 1.0 }
      );
    } else {
      handleResetView();
    }
  };

  // Cek apakah ada layer pipa yang aktif memiliki custom symbology QGIS
  const activeCustomPipeLayer = useMemo(() => {
    return pipeLayers.find((l) => l.visible && l.classifyColumn && l.symbologyRules && l.symbologyRules.length > 0);
  }, [pipeLayers]);

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden bg-slate-950">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Unified GIS Legend & Controls - Top Right */}
      <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-2 items-end max-h-[calc(100vh-110px)]">
        {/* Toggle Minimized Button */}
        {isLayerControlMinimized ? (
          <button
            onClick={() => setIsLayerControlMinimized(false)}
            className={`${
              theme === 'light'
                ? 'bg-white hover:bg-slate-50 border-slate-300 text-[#005baa] shadow-lg'
                : 'bg-slate-950/95 hover:bg-slate-900 border-slate-700/80 text-sky-400 shadow-2xl'
            } border p-2.5 rounded-xl flex items-center gap-2 text-xs font-bold backdrop-blur-md transition group`}
            title="Buka Legenda & Simbologi GIS"
          >
            <Sliders className="w-4 h-4 text-[#005baa]" />
            <span>Legenda GIS</span>
            <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
          </button>
        ) : (
          <div
            className={`${
              theme === 'light'
                ? 'bg-white text-slate-800 border-slate-200 shadow-xl'
                : 'bg-slate-950/95 text-slate-100 border-slate-700/80 shadow-2xl'
            } backdrop-blur-md border p-3 rounded-2xl text-xs flex flex-col gap-2.5 w-[310px] max-w-[330px] max-h-[calc(100vh-95px)] overflow-y-auto pb-6 animate-in fade-in zoom-in-95 duration-100 scrollbar-thin`}
          >
            {/* Header with Minimize Button & Symbology QGIS Button */}
            <div className={`flex items-center justify-between pb-2 border-b ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
              <span className={`font-extrabold text-[12px] uppercase ${theme === 'light' ? 'text-[#005baa]' : 'text-slate-200'} flex items-center gap-1.5`}>
                <Sliders className="w-4 h-4 text-[#005baa]" />
                <span>Legenda GIS</span>
              </span>
              <div className="flex items-center gap-1">
                {onOpenSymbologyModal && (
                  <button
                    onClick={onOpenSymbologyModal}
                    className={`p-1 px-1.5 rounded ${
                      theme === 'light'
                        ? 'bg-[#005baa]/10 hover:bg-[#005baa]/20 text-[#005baa] border-blue-200'
                        : 'bg-sky-950 hover:bg-sky-900 text-sky-300 border-sky-800'
                    } border text-[10px] font-bold flex items-center gap-1 transition`}
                    title="Atur Warna Berdasarkan Kolom Atribut (QGIS Style)"
                  >
                    <Palette className="w-3 h-3 text-[#005baa]" />
                    <span>Simbologi</span>
                  </button>
                )}
                <button
                  onClick={() => setIsLayerControlMinimized(true)}
                  className={`p-1 rounded ${
                    theme === 'light' ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  } transition`}
                  title="Sembunyikan Panel"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Navigation Filter Tabs for Instant Access */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/90 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px]">
              <button
                type="button"
                onClick={() => setActiveLegendTab('all')}
                className={`py-1 rounded-lg font-bold transition text-center ${
                  activeLegendTab === 'all'
                    ? 'bg-[#005baa] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setActiveLegendTab('zones')}
                className={`py-1 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
                  activeLegendTab === 'zones'
                    ? 'bg-[#005baa] text-white shadow-xs'
                    : 'text-[#005baa] dark:text-sky-400 font-extrabold hover:bg-sky-50 dark:hover:bg-slate-800'
                }`}
                title="Akses Langsung Zona Pelayanan"
              >
                <Shield className="w-3 h-3" />
                <span>Zona</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveLegendTab('pipes')}
                className={`py-1 rounded-lg font-bold transition text-center ${
                  activeLegendTab === 'pipes'
                    ? 'bg-[#005baa] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Pipa
              </button>
              <button
                type="button"
                onClick={() => setActiveLegendTab('basemap')}
                className={`py-1 rounded-lg font-bold transition text-center ${
                  activeLegendTab === 'basemap'
                    ? 'bg-[#005baa] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Satelit
              </button>
            </div>

            {/* 1. Zona Pelayanan PAM (Ditempatkan di Atas agar tidak tertekan ke bawah & mudah diakses) */}
            {(activeLegendTab === 'all' || activeLegendTab === 'zones') && (
              <div className="space-y-1">
                <div className={`p-2.5 rounded-xl border transition ${
                  theme === 'light' ? 'bg-sky-50/50 border-sky-200' : 'bg-sky-950/30 border-sky-800/80'
                }`}>
                  {/* Header Zona Pelayanan */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Shield className="w-3.5 h-3.5 text-[#005baa] shrink-0" />
                      <span className={`text-[11px] uppercase font-extrabold truncate ${
                        theme === 'light' ? 'text-[#005baa]' : 'text-sky-300'
                      }`}>
                        Zona Pelayanan PAM
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        theme === 'light' ? 'bg-white text-[#005baa] border border-sky-200' : 'bg-slate-900 text-sky-300 border border-sky-700'
                      }`}>
                        {serviceZoneLayers.length} Layer
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Master Toggle Show/Hide Zones */}
                      <button
                        type="button"
                        onClick={handleToggleServiceZones}
                        className={`p-1 rounded transition ${
                          showServiceZones
                            ? theme === 'light' ? 'text-[#005baa] hover:bg-sky-100' : 'text-sky-400 hover:bg-sky-900'
                            : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                        title={showServiceZones ? 'Sembunyikan Seluruh Zona di Peta' : 'Tampilkan Seluruh Zona di Peta'}
                      >
                        {showServiceZones ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      {/* Collapse Toggle (only in 'all' view) */}
                      {activeLegendTab === 'all' && (
                        <button
                          type="button"
                          onClick={() => setIsZonesSectionCollapsed(!isZonesSectionCollapsed)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                          title={isZonesSectionCollapsed ? 'Buka Panel Zona Pelayanan' : 'Tutup Panel Zona Pelayanan'}
                        >
                          {isZonesSectionCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-[#005baa]" /> : <ChevronUp className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body Zona (Expanded or in 'zones' tab) */}
                  {(!isZonesSectionCollapsed || activeLegendTab === 'zones') && (
                    <div className="mt-2 space-y-2 pt-2 border-t border-sky-200/80 dark:border-sky-800/60 animate-in fade-in duration-100">
                      {/* Status & Label attribute picker */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-400'}>
                          Visibilitas di Peta:
                        </span>
                        <span className={`font-bold ${showServiceZones ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {showServiceZones ? '● Aktif Tampil' : '○ Disembunyikan'}
                        </span>
                      </div>

                      {/* Attribute Label Selector */}
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className={`flex items-center gap-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                          <Tag className="w-3 h-3 text-[#005baa]" />
                          <span>Label Peta:</span>
                        </span>
                        <select
                          value={zoneLabelAttribute}
                          onChange={(e) => handleZoneLabelChange(e.target.value)}
                          className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border focus:outline-none cursor-pointer max-w-[170px] truncate ${
                            theme === 'light'
                              ? 'bg-white text-slate-800 border-slate-300'
                              : 'bg-slate-900 text-slate-200 border-slate-700'
                          }`}
                        >
                          <option value="none">-- Tanpa Label --</option>
                          {availableZoneAttributes.length === 0 ? (
                            <>
                              <option value="kecamatan">Nama Kecamatan</option>
                              <option value="name">Nama Zona</option>
                            </>
                          ) : (
                            availableZoneAttributes.map((attr) => {
                              const sample = zoneAttributeSampleValues[attr];
                              return (
                                <option key={attr} value={attr}>
                                  {attr.toUpperCase()}{sample ? ` (misal: ${sample.slice(0, 12)})` : ''}
                                </option>
                              );
                            })
                          )}
                        </select>
                      </div>

                      {/* Konfirmasi Hapus Layer di Legenda (Non-blocking) */}
                      {legendLayerToDelete && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-300 dark:bg-rose-950/60 dark:border-rose-800 text-[10px] space-y-1 animate-in fade-in">
                          <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span className="truncate">Hapus "{legendLayerToDelete.name}"?</span>
                          </div>
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => setLegendLayerToDelete(null)}
                              className="px-1.5 py-0.5 rounded border text-[9px] bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (legendLayerToDelete.type === 'zone' && onDeleteServiceZoneLayer) {
                                  onDeleteServiceZoneLayer(legendLayerToDelete.id);
                                } else if (legendLayerToDelete.type === 'pipe' && onDeletePipeLayer) {
                                  onDeletePipeLayer(legendLayerToDelete.id);
                                }
                                setLegendLayerToDelete(null);
                              }}
                              className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[9px] hover:bg-rose-700"
                            >
                              Ya, Hapus
                            </button>
                          </div>
                        </div>
                      )}

                      {/* List of Zone Layers */}
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
                        {serviceZoneLayers.length === 0 ? (
                          <div className="text-[10px] text-center text-slate-400 py-1.5 bg-white/40 dark:bg-slate-900/40 rounded-lg">
                            Belum ada file zona pelayanan tersimpan.
                          </div>
                        ) : (
                          serviceZoneLayers.map((zone) => (
                            <div
                              key={zone.id}
                              className={`p-1.5 rounded-lg border flex items-center justify-between gap-1.5 transition text-[9.5px] ${
                                zone.visible
                                  ? theme === 'light'
                                    ? 'bg-white border-sky-200 text-slate-800 shadow-xs'
                                    : 'bg-slate-900 border-sky-800 text-slate-200'
                                  : 'opacity-50 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="w-3 h-3 rounded-xs shrink-0 border"
                                  style={{
                                    borderColor: zone.borderColor || '#38BDF8',
                                    backgroundColor: zone.fillColor || '#0284C7',
                                    opacity: 0.85,
                                  }}
                                />
                                <div className="min-w-0 truncate">
                                  <div className="font-bold truncate leading-tight">{zone.name}</div>
                                  <div className="text-[8.5px] text-slate-400 truncate">
                                    {zone.featuresCount} poligon wilayah
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setSelectedLayerForAttributeTable({ name: zone.name, geoJson: zone.geoJsonData })}
                                  className={`p-1 rounded transition ${
                                    theme === 'light' ? 'text-slate-400 hover:text-[#005baa] hover:bg-sky-50' : 'text-slate-400 hover:text-sky-300 hover:bg-slate-800'
                                  }`}
                                  title="Buka Tabel Atribut File Batas Wilayah Ini"
                                >
                                  <TableIcon className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onToggleServiceZoneLayer && onToggleServiceZoneLayer(zone.id)}
                                  className={`p-1 rounded shrink-0 transition ${
                                    zone.visible
                                      ? 'text-[#005baa] dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800'
                                      : 'text-slate-400 hover:bg-slate-100'
                                  }`}
                                  title={zone.visible ? 'Sembunyikan layer ini' : 'Tampilkan layer ini'}
                                >
                                  {zone.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                </button>
                                {onDeleteServiceZoneLayer && (
                                  <button
                                    type="button"
                                    onClick={() => setLegendLayerToDelete({ id: zone.id, name: zone.name, type: 'zone' })}
                                    className="p-1 rounded shrink-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                    title="Hapus Layer Zona Ini dari Sistem"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Quick Zone Action Buttons */}
                      <div className="flex items-center gap-1 pt-1.5 border-t border-sky-200/60 dark:border-sky-800/60">
                        {onOpenZoneColorModal && (
                          <button
                            type="button"
                            onClick={onOpenZoneColorModal}
                            className={`flex-1 py-1 px-1.5 rounded-lg font-bold text-[9px] flex items-center justify-center gap-1 border transition ${
                              theme === 'light'
                                ? 'bg-white hover:bg-sky-50 text-[#005baa] border-blue-200 shadow-xs'
                                : 'bg-slate-900 hover:bg-slate-800 text-sky-300 border-sky-800'
                            }`}
                            title="Atur Warna Setiap Kecamatan / Wilayah Zona"
                          >
                            <Palette className="w-3 h-3 text-[#005baa]" />
                            <span>Atur Warna</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleZoomToServiceZones}
                          className={`flex-1 py-1 px-1.5 rounded-lg font-bold text-[9px] flex items-center justify-center gap-1 border transition ${
                            theme === 'light'
                              ? 'bg-white hover:bg-sky-50 text-[#005baa] border-blue-200 shadow-xs'
                              : 'bg-slate-900 hover:bg-slate-800 text-sky-300 border-sky-800'
                          }`}
                          title="Fokus Kamera ke Wilayah Batas Zona Pelayanan"
                        >
                          <ZoomIn className="w-3 h-3 text-[#005baa]" />
                          <span>Fokus Zona</span>
                        </button>
                        {onOpenUploadModal && (
                          <button
                            type="button"
                            onClick={onOpenUploadModal}
                            className={`py-1 px-1.5 rounded-lg font-bold text-[9px] flex items-center justify-center gap-1 border transition ${
                              theme === 'light'
                                ? 'bg-white hover:bg-sky-50 text-slate-700 border-slate-300'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                            title="Unggah / Hapus File Zona Pelayanan"
                          >
                            <Layers className="w-3 h-3" />
                            <span>Kelola</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. Legenda Simbologi Jaringan Pipa */}
            {(activeLegendTab === 'all' || activeLegendTab === 'pipes') && (
              <div className={`pt-2 ${activeLegendTab === 'all' ? 'border-t' : ''} ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] uppercase font-bold flex items-center gap-1.5 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    <span className="w-3 h-1 bg-[#EF4444] rounded-full inline-block"></span>
                    <span>Jaringan Pipa Aetra</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {activeCustomPipeLayer && (
                      <button
                        type="button"
                        onClick={() => setSelectedLayerForAttributeTable({ name: activeCustomPipeLayer.name, geoJson: activeCustomPipeLayer.geoJsonData })}
                        className={`p-0.5 rounded transition ${
                          theme === 'light' ? 'text-slate-400 hover:text-[#005baa]' : 'text-slate-400 hover:text-sky-300'
                        }`}
                        title="Buka Tabel Atribut Jaringan Pipa"
                      >
                        <TableIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setShowPipes(!showPipes)}
                      className={`p-0.5 ${theme === 'light' ? 'text-[#005baa] hover:text-[#004b8d]' : 'text-sky-400 hover:text-white'}`}
                      title={showPipes ? 'Sembunyikan Pipa' : 'Tampilkan Pipa'}
                    >
                      {showPipes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                  </div>
                </div>

                {/* Tampilan Legenda Simpel & Collapsible */}
                {activeCustomPipeLayer && activeCustomPipeLayer.symbologyRules && activeCustomPipeLayer.symbologyRules.length > 0 ? (
                  <div
                    className={`${
                      theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
                    } rounded-lg border overflow-hidden font-mono text-[9.5px]`}
                  >
                    {/* Header Kategori Kolom */}
                    <button
                      type="button"
                      onClick={() => setIsPipeCategoryCollapsed(!isPipeCategoryCollapsed)}
                      className={`w-full px-2 py-1.5 ${
                        theme === 'light' ? 'bg-slate-100/80 hover:bg-slate-200/70 border-slate-200' : 'bg-slate-900 hover:bg-slate-800/90 border-slate-800/80'
                      } text-left flex items-center justify-between border-b transition`}
                      title={isPipeCategoryCollapsed ? 'Buka rincian kategori diameter' : 'Minimize rincian'}
                    >
                      <span className={`flex items-center gap-1.5 truncate text-[9px] font-bold ${theme === 'light' ? 'text-[#005baa]' : 'text-sky-400'}`}>
                        <span className="truncate">Kategori: {activeCustomPipeLayer.classifyColumn?.toUpperCase()}</span>
                        <span
                          className={`text-[8px] px-1 py-0.2 rounded shrink-0 border ${
                            theme === 'light'
                              ? 'bg-[#005baa]/10 text-[#005baa] border-[#005baa]/30 font-bold'
                              : 'bg-sky-950 text-sky-300 border-sky-800'
                          }`}
                        >
                          {activeCustomPipeLayer.symbologyRules.length}
                        </span>
                      </span>
                      <div className="flex items-center gap-1 text-slate-400 shrink-0">
                        <span className="text-[8.5px] font-normal">{isPipeCategoryCollapsed ? 'Buka' : 'Tutup'}</span>
                        {isPipeCategoryCollapsed ? (
                          <ChevronDown className="w-3 h-3 text-[#005baa]" />
                        ) : (
                          <ChevronUp className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {!isPipeCategoryCollapsed ? (
                      <div className="p-2 space-y-1.5 max-h-40 overflow-y-auto pr-1.5">
                        {activeCustomPipeLayer.symbologyRules.map((rule, rIdx) => (
                          <div key={rIdx} className={`flex items-center justify-between ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                            <span className="flex items-center gap-2 truncate">
                              <span className="w-3.5 h-1 rounded-full shrink-0" style={{ backgroundColor: rule.color }} />
                              <span className="truncate">{rule.value}</span>
                            </span>
                            <span className="text-[8.5px] text-slate-400 font-normal shrink-0">({rule.count})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        onClick={() => setIsPipeCategoryCollapsed(false)}
                        className={`p-1.5 text-[9px] flex items-center justify-between cursor-pointer transition ${
                          theme === 'light' ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800/50'
                        }`}
                      >
                        <span className="flex items-center gap-1 overflow-hidden">
                          {activeCustomPipeLayer.symbologyRules.slice(0, 5).map((r, i) => (
                            <span key={i} className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                          ))}
                          {activeCustomPipeLayer.symbologyRules.length > 5 && (
                            <span className="text-[8px] text-slate-400">+{activeCustomPipeLayer.symbologyRules.length - 5} lainnya</span>
                          )}
                        </span>
                        <span className={`text-[8px] font-sans font-bold ${theme === 'light' ? 'text-[#005baa]' : 'text-sky-400'}`}>
                          Lihat Semua →
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`${
                      theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
                    } rounded-lg border overflow-hidden font-mono text-[9.5px]`}
                  >
                    <button
                      type="button"
                      onClick={() => setIsPipeCategoryCollapsed(!isPipeCategoryCollapsed)}
                      className={`w-full px-2 py-1.5 ${
                        theme === 'light' ? 'bg-slate-100/80 hover:bg-slate-200/70 border-slate-200' : 'bg-slate-900 hover:bg-slate-800/90 border-slate-800/80'
                      } text-left flex items-center justify-between border-b transition`}
                      title={isPipeCategoryCollapsed ? 'Buka panduan diameter' : 'Minimize panduan diameter'}
                    >
                      <span className={`text-[9px] font-bold ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>Panduan Diameter</span>
                      <div className="flex items-center gap-1 text-slate-400">
                        <span className="text-[8.5px] font-normal">{isPipeCategoryCollapsed ? 'Buka' : 'Tutup'}</span>
                        {isPipeCategoryCollapsed ? (
                          <ChevronDown className="w-3 h-3 text-[#005baa]" />
                        ) : (
                          <ChevronUp className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {!isPipeCategoryCollapsed ? (
                      <div className="p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-1 bg-[#EF4444] rounded-full inline-block"></span>
                            <span className={theme === 'light' ? 'text-slate-800' : 'text-slate-200'}>1000 - 400 mm</span>
                          </span>
                          <span className="text-red-500 font-bold">Merah</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-1 bg-[#3B82F6] rounded-full inline-block"></span>
                            <span className={theme === 'light' ? 'text-slate-800' : 'text-slate-200'}>315 - 160 mm</span>
                          </span>
                          <span className="text-blue-500 font-bold">Biru</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-1 bg-[#10B981] rounded-full inline-block"></span>
                            <span className={theme === 'light' ? 'text-slate-800' : 'text-slate-200'}>110 - 63 mm</span>
                          </span>
                          <span className="text-emerald-600 font-bold">Hijau</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-1 bg-[#F59E0B] rounded-full inline-block"></span>
                            <span className={theme === 'light' ? 'text-slate-800' : 'text-slate-200'}>&lt; 63 mm</span>
                          </span>
                          <span className="text-amber-500 font-bold">Kuning</span>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setIsPipeCategoryCollapsed(false)}
                        className={`p-1.5 text-[9px] flex items-center justify-between cursor-pointer transition ${
                          theme === 'light' ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800/50'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
                          <span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span>
                          <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                          <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
                        </span>
                        <span className={`text-[8px] font-sans font-bold ${theme === 'light' ? 'text-[#005baa]' : 'text-sky-400'}`}>
                          Lihat Rincian →
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. Legenda Status Minat Pelanggan (Hanya di Tab 'Semua') */}
            {activeLegendTab === 'all' && (
              <div className={`pt-2 border-t ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] uppercase font-bold ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    Status Minat Pelanggan
                  </span>
                  <span className="text-[9px] text-slate-400">Klik toggle</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
                  <button
                    onClick={() => toggleInterestStatus('Minat')}
                    className={`p-1.5 rounded-lg border text-left flex items-center justify-between transition ${
                      visibleInterestStatuses['Minat']
                        ? theme === 'light'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold shadow-sm'
                          : 'bg-emerald-950/50 border-emerald-800 text-slate-200 font-semibold'
                        : theme === 'light'
                        ? 'bg-slate-100 border-slate-200 text-slate-400'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00FF66] border border-emerald-600 shrink-0"></span>
                      <span>Minat</span>
                    </span>
                    {visibleInterestStatuses['Minat'] ? (
                      <Eye className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                  </button>

                  <button
                    onClick={() => toggleInterestStatus('Tidak Minat')}
                    className={`p-1.5 rounded-lg border text-left flex items-center justify-between transition ${
                      visibleInterestStatuses['Tidak Minat']
                        ? theme === 'light'
                          ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold shadow-sm'
                          : 'bg-rose-950/50 border-rose-800 text-slate-200 font-semibold'
                        : theme === 'light'
                        ? 'bg-slate-100 border-slate-200 text-slate-400'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#FF1744] shrink-0"></span>
                      <span>Tidak Minat</span>
                    </span>
                    {visibleInterestStatuses['Tidak Minat'] ? (
                      <Eye className="w-3 h-3 text-rose-600" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Review Spreading Berulang */}
                <button
                  onClick={() => setShowDuplicateMarks(!showDuplicateMarks)}
                  className={`w-full mt-1.5 p-1.5 rounded-lg border text-left flex items-center justify-between text-[10px] transition ${
                    showDuplicateMarks
                      ? theme === 'light'
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-sm'
                        : 'bg-amber-950/60 border-amber-700 text-amber-200 font-bold'
                      : theme === 'light'
                      ? 'bg-slate-100 border-slate-200 text-slate-400'
                      : 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60'
                  }`}
                  title="Klik untuk tampilkan / sembunyikan tanda target spreading berulang"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border border-dashed border-[#FF9100] flex items-center justify-center text-[8px] text-[#e46423] font-bold">
                      ⌖
                    </span>
                    <span>Review Spreading Berulang (&lt;10m)</span>
                  </span>
                  {showDuplicateMarks ? (
                    <Eye className="w-3.5 h-3.5 text-[#e46423]" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </div>
            )}

            {/* 4. Peta Dasar (Google Satelit, Google Satelit Hybrid, OSM) */}
            {(activeLegendTab === 'all' || activeLegendTab === 'basemap') && (
              <div className={`space-y-1 ${activeLegendTab === 'all' ? 'pt-2 border-t' : ''} ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsBasemapCollapsed(!isBasemapCollapsed)}
                  className={`w-full text-[10px] font-bold uppercase flex items-center justify-between p-1.5 rounded-lg border transition ${
                    theme === 'light'
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>🛰️</span>
                    <span>Peta Dasar:</span>
                    <span className="text-[#005baa] dark:text-sky-400 font-semibold normal-case">
                      {activeBaseLayer === 'google-satellite'
                        ? 'Google Satelit'
                        : activeBaseLayer === 'google-hybrid'
                        ? 'Google Hybrid'
                        : 'OpenStreetMap'}
                    </span>
                  </span>
                  {isBasemapCollapsed ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {(!isBasemapCollapsed || activeLegendTab === 'basemap') && (
                  <div className="grid grid-cols-1 gap-1 pt-1 animate-in fade-in duration-100">
                    <button
                      onClick={() => setActiveBaseLayer('google-satellite')}
                      className={`px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition flex items-center justify-between ${
                        activeBaseLayer === 'google-satellite'
                          ? 'bg-[#005baa] text-white shadow-sm font-bold'
                          : theme === 'light'
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      <span>🌍 Google Satelit</span>
                      {activeBaseLayer === 'google-satellite' && (
                        <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded text-white">Aktif</span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveBaseLayer('google-hybrid')}
                      className={`px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition flex items-center justify-between ${
                        activeBaseLayer === 'google-hybrid'
                          ? 'bg-[#005baa] text-white shadow-sm font-bold'
                          : theme === 'light'
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      <span>🛰️ Google Satelit Hybrid</span>
                      {activeBaseLayer === 'google-hybrid' && (
                        <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded text-white">Aktif</span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveBaseLayer('osm')}
                      className={`px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition flex items-center justify-between ${
                        activeBaseLayer === 'osm'
                          ? 'bg-[#005baa] text-white shadow-sm font-bold'
                          : theme === 'light'
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      <span>🗺️ OpenStreetMap</span>
                      {activeBaseLayer === 'osm' && (
                        <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded text-white">Aktif</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 5. Tombol Aksi Cepat Zoom & Posisi */}
            <div className={`flex gap-1.5 pt-2 border-t ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
              <button
                onClick={handleZoomToLayers}
                title="Fokuskan Kamera ke Seluruh Layer Spasial"
                className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition shadow-sm border ${
                  theme === 'light'
                    ? 'bg-[#005baa] hover:bg-[#004b8d] text-white border-[#005baa]'
                    : 'bg-sky-950 hover:bg-sky-900 text-sky-300 border-sky-800/80'
                }`}
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Zoom Layer</span>
              </button>
              <button
                onClick={handleResetView}
                title="Reset Posisi ke Pusat Konsesi Tangerang"
                className={`py-1.5 px-2.5 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 transition border ${
                  theme === 'light'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Pusat</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Picking Location Banner Mode */}
      {isPickingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-sky-500 text-white px-4 py-1.5 rounded-full font-bold shadow-2xl flex items-center gap-2 animate-bounce text-xs">
          <Radio className="w-3.5 h-3.5 animate-spin" />
          <span>Klik titik lokasi di peta untuk mengambil koordinat pelanggan</span>
        </div>
      )}

      {/* Modal Tabel Atribut Spasial */}
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
