import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  CustomerSurvey,
  DiameterColorRule,
  DuplicateCluster,
  FilterState,
  InterestStatus,
  PipeNetworkLayer,
  SalesRep,
  ServiceZoneLayer,
  ZoneArea,
} from './types/gis';
import {
  INITIAL_CUSTOMERS,
  INITIAL_SALES,
  INITIAL_ZONES,
  SAMPLE_PIPELINE_GEOJSON,
  SAMPLE_SERVICE_ZONES_GEOJSON,
} from './data/sampleData';
import {
  calculateLineStringLength,
  isPointInsideZoneFeatureCollection,
} from './utils/kmlParser';
import {
  getDerivedZonesFromServiceLayers,
  isCustomerMatchingZone,
} from './utils/zoneHelper';
import { detectDuplicateSpreading, mergeSurveysToPropertyHistory } from './utils/duplicateDetector';
import {
  loadPipeLayersFromStorage,
  loadServiceZoneLayersFromStorage,
  loadPipeLayersFromStorageAsync,
  loadServiceZoneLayersFromStorageAsync,
  savePipeLayersToStorage,
  saveServiceZoneLayersToStorage,
  clearSpatialLayersStorage,
} from './utils/spatialStorage';
import { MapComponent } from './components/MapComponent';
import { CompactHeaderToolbar } from './components/CompactHeaderToolbar';
import { FilterSidebar } from './components/FilterSidebar';
import { CustomerTable } from './components/CustomerTable';
import { UploadNetworkModal } from './components/UploadNetworkModal';
import { SecurityPrivacyModal } from './components/SecurityPrivacyModal';
import { AddCustomerModal } from './components/AddCustomerModal';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { SupabaseGuideModal } from './components/SupabaseGuideModal';
import { SalesAnalystModal } from './components/SalesAnalystModal';
import { ZoneColorModal } from './components/ZoneColorModal';
import { LayerSymbologyModal } from './components/LayerSymbologyModal';
import { LogoManagerModal } from './components/LogoManagerModal';
import { SpreadsheetSyncModal } from './components/SpreadsheetSyncModal';
import { SalesManagerModal } from './components/SalesManagerModal';
import { DraggableFloatingSwitcher } from './components/DraggableFloatingSwitcher';
import {
  loadCustomersFromPersistentStorage,
  saveCustomersToPersistentStorage,
  getSavedLinkedSpreadsheetConfig,
  saveLinkedSpreadsheetConfig,
  fetchFromGoogleSpreadsheet,
} from './utils/spreadsheetParser';
import { loadSalesFromStorage, saveSalesToStorage, resetSalesToDefault } from './utils/salesStorage';
import { SymbologyRule } from './types/gis';
import {
  Zap,
  MapPin,
  Table as TableIcon,
  X,
  Palette,
} from 'lucide-react';

export default function App() {
  // Master Data State (with persistent storage)
  const [customers, setCustomers] = useState<CustomerSurvey[]>(() => {
    return loadCustomersFromPersistentStorage(INITIAL_CUSTOMERS);
  });
  const [salesList, setSalesList] = useState<SalesRep[]>(() => {
    return loadSalesFromStorage(INITIAL_SALES);
  });
  const [zones] = useState<ZoneArea[]>(INITIAL_ZONES);

  // Sync customers to storage whenever modified
  useEffect(() => {
    saveCustomersToPersistentStorage(customers);
  }, [customers]);

  // Sync sales list to storage whenever modified
  useEffect(() => {
    saveSalesToStorage(salesList);
  }, [salesList]);

  // Initial Default Pipeline Layers
  const defaultPipeLayers: PipeNetworkLayer[] = [
    {
      id: 'default-aetra-pipes',
      name: 'Jaringan Pipa Utama Aetra Tangerang',
      fileName: 'jaringan_pipa_aetra_master.geojson',
      type: 'GeoJSON',
      visible: true,
      color: '#EF4444',
      width: 3.0,
      totalLengthKm: calculateLineStringLength(SAMPLE_PIPELINE_GEOJSON),
      featuresCount: SAMPLE_PIPELINE_GEOJSON.features.length,
      geoJsonData: SAMPLE_PIPELINE_GEOJSON,
      uploadDate: '2026-09-30',
    },
  ];

  // Initial Default Service Zone Layers
  const defaultZoneLayers: ServiceZoneLayer[] = [
    {
      id: 'default-aetra-zones',
      name: 'Batas Zona Pelayanan Kecamatan Aetra Tangerang',
      fileName: 'batas_zona_pelayanan_aetra.geojson',
      type: 'GeoJSON',
      visible: true,
      borderColor: '#38BDF8',
      fillColor: '#0284C7',
      borderWidth: 2.5,
      fillOpacity: 0.16,
      featuresCount: SAMPLE_SERVICE_ZONES_GEOJSON.features.length,
      geoJsonData: SAMPLE_SERVICE_ZONES_GEOJSON,
      uploadDate: '2026-09-30',
    },
  ];

  // Pipeline Layers with Persistent Storage (IndexedDB + Memory Cache)
  const [pipeLayers, setPipeLayers] = useState<PipeNetworkLayer[]>(() => {
    const loaded = loadPipeLayersFromStorage();
    return loaded !== null ? loaded : defaultPipeLayers;
  });

  // Service Zone Layers with Persistent Storage (IndexedDB + Memory Cache)
  const [serviceZoneLayers, setServiceZoneLayers] = useState<ServiceZoneLayer[]>(() => {
    const loaded = loadServiceZoneLayersFromStorage();
    return loaded !== null ? loaded : defaultZoneLayers;
  });

  // Guard to prevent premature overwriting of IndexedDB before initial load finishes
  const isHydratedRef = useRef(false);

  // Async hydration on mount from IndexedDB to restore custom uploaded KMZ/KML layers safely
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      loadPipeLayersFromStorageAsync(),
      loadServiceZoneLayersFromStorageAsync(),
    ]).then(([savedPipes, savedZones]) => {
      if (!isMounted) return;
      if (savedPipes !== null && Array.isArray(savedPipes)) {
        setPipeLayers(savedPipes);
      } else if (savedPipes === null) {
        savePipeLayersToStorage(defaultPipeLayers);
      }

      if (savedZones !== null && Array.isArray(savedZones)) {
        setServiceZoneLayers(savedZones);
      } else if (savedZones === null) {
        saveServiceZoneLayersToStorage(defaultZoneLayers);
      }

      isHydratedRef.current = true;
    }).catch((err) => {
      console.warn('Hydration error:', err);
      isHydratedRef.current = true;
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync to persistent storage whenever layers change (Only AFTER initial hydration)
  useEffect(() => {
    if (isHydratedRef.current) {
      savePipeLayersToStorage(pipeLayers);
    }
  }, [pipeLayers]);

  useEffect(() => {
    if (isHydratedRef.current) {
      saveServiceZoneLayersToStorage(serviceZoneLayers);
    }
  }, [serviceZoneLayers]);

  // View state: 'map' is default and occupies 85-90%+ of screen
  const [activeTab, setActiveTab] = useState<'map' | 'table'>('map');

  // Filter State: 5 sales, date range, zone, and service area boundary
  const [filter, setFilter] = useState<FilterState>({
    zonaId: '',
    salesId: '',
    statusMinat: ['Minat', 'Tidak Minat'],
    startDate: '',
    endDate: '',
    searchQuery: '',
    onlyOutsideNetwork: false,
    filterDuplicateMode: 'all',
    onlyInsideServiceZone: false,
    selectedServiceZoneLayerId: '',
  });

  // UI Modals State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAnalystModalOpen, setIsAnalystModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [isQuickSyncing, setIsQuickSyncing] = useState(false);
  const [isSpreadsheetLinked, setIsSpreadsheetLinked] = useState<boolean>(() => Boolean(getSavedLinkedSpreadsheetConfig()?.url));
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isZoneColorModalOpen, setIsZoneColorModalOpen] = useState(false);
  const [isSymbologyModalOpen, setIsSymbologyModalOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  
  // State Terpisah: Pelanggan yang difokuskan di Peta vs Pelanggan yang dibuka di Modal Rincian
  const [focusedMapCustomer, setFocusedMapCustomer] = useState<CustomerSurvey | null>(null);
  const [detailModalCustomer, setDetailModalCustomer] = useState<CustomerSurvey | null>(null);

  // Visibilitas Master Zona Pelayanan pada Peta / Legenda
  const [showServiceZones, setShowServiceZones] = useState<boolean>(true);

  // Atribut yang dipilih untuk label zona pelayanan di peta dan filter (Sinkron ke Legenda GIS)
  const [zoneLabelAttribute, setZoneLabelAttribute] = useState<string>('kecamatan');

  const handleToggleServiceZoneLayer = (layerId: string) => {
    setServiceZoneLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleToggleShowServiceZones = () => {
    setShowServiceZones((prev) => !prev);
  };

  // Daftar Zona Pelayanan yang diekstrak dinamis dari layer zona import yang visibilitasnya AKTIF di legenda
  // Penamaan label di filter OTOMATIS menyesuaikan dengan kolom atribut label yang dipilih di legenda GIS
  const activeVisibleZones = useMemo(() => {
    const derived = getDerivedZonesFromServiceLayers(serviceZoneLayers, showServiceZones, zoneLabelAttribute);
    return derived.length > 0 ? derived : (serviceZoneLayers.length === 0 ? INITIAL_ZONES : []);
  }, [serviceZoneLayers, showServiceZones, zoneLabelAttribute]);

  // Theme State: 'light' (default #ffffff, #005baa, #e46423) or 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Real-time notification banner
  const [liveToast, setLiveToast] = useState<{ message: string; type: 'info' | 'success' } | null>({
    message: 'Sistem GIS Aktif: Realtime sync dari 5 sales AppSheet siap menerima data spreading.',
    type: 'info',
  });

  // Coordinate picking on map for Add Customer form
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedCoordinates, setPickedCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Auto-focus bounding box for newly uploaded or selected spatial layer
  const [focusBounds, setFocusBounds] = useState<{ minLng: number; minLat: number; maxLng: number; maxLat: number } | null>(null);

  // Jalankan deteksi duplikat / spreading berulang (<10 meter untuk area perumahan rapat)
  const { processedCustomers, clusters } = useMemo(() => {
    return detectDuplicateSpreading(customers, 10);
  }, [customers]);

  // Filter data sesuai Sales (5 orang), Rentang Periode, Batas Zona Pelayanan, dan Status Minat
  const filteredCustomers = useMemo(() => {
    const activeZoneCollections = serviceZoneLayers
      .filter((l) => l.visible && showServiceZones)
      .map((l) => l.geoJsonData);

    const seenUniquePropertyKeys = new Set<string>();

    return processedCustomers.filter((cust) => {
      // 1. Filter Sales (Petugas Sales AppSheet)
      if (filter.salesId) {
        const selectedRep = salesList.find((s) => s.id === filter.salesId);
        const matchId = cust.salesId === filter.salesId;
        const matchName =
          selectedRep &&
          cust.salesNama &&
          (cust.salesNama.toLowerCase().trim() === selectedRep.nama.toLowerCase().trim() ||
            cust.salesNama.toLowerCase().includes(selectedRep.nama.toLowerCase()) ||
            selectedRep.nama.toLowerCase().includes(cust.salesNama.toLowerCase()));

        if (!matchId && !matchName) {
          return false;
        }
      }

      // 2. Filter Status Minat
      if (filter.statusMinat.length > 0 && !filter.statusMinat.includes(cust.statusMinat)) {
        return false;
      }

      // 3. Filter Zona Pelayanan (Disesuaikan dinamis dengan zona pelayanan yang di-import & aktif di legenda)
      if (filter.zonaId) {
        const selectedZone = activeVisibleZones.find(
          (z) => z.id === filter.zonaId || z.kode === filter.zonaId || z.nama === filter.zonaId
        );
        if (selectedZone) {
          if (!isCustomerMatchingZone(cust, selectedZone)) {
            return false;
          }
        } else if (activeVisibleZones.length > 0) {
          return false;
        }
      }

      // 4. Filter Periode Tanggal (Tanggal berapa s/d berapa)
      if (filter.startDate && cust.tanggalSpreading < filter.startDate) {
        return false;
      }
      if (filter.endDate && cust.tanggalSpreading > filter.endDate) {
        return false;
      }

      // 5. Filter Mode Duplikat Spreading
      if (filter.filterDuplicateMode === 'duplicates_only') {
        if (!cust.isDuplicateCandidate) {
          return false;
        }
      } else if (filter.filterDuplicateMode === 'unique_only') {
        const propKey = cust.propertyId || cust.duplicateGroupId || cust.id;
        if (seenUniquePropertyKeys.has(propKey)) {
          return false; // Hilangkan kunjungan berulang pada rumah fisik yang sama
        }
        seenUniquePropertyKeys.add(propKey);
      }

      // 6. Filter Spasial: Hanya Titik di Dalam Batas Zona Pelayanan (Point-in-Polygon)
      if (filter.onlyInsideServiceZone && activeZoneCollections.length > 0) {
        let insideAny = false;
        for (const zoneCollection of activeZoneCollections) {
          const res = isPointInsideZoneFeatureCollection(cust.latitude, cust.longitude, zoneCollection);
          if (res.inside) {
            insideAny = true;
            break;
          }
        }
        if (!insideAny) {
          return false;
        }
      }

      // 7. Pencarian Teks
      if (filter.searchQuery) {
        const q = filter.searchQuery.toLowerCase();
        const matchName = cust.nama.toLowerCase().includes(q);
        const matchAddress = cust.alamat.toLowerCase().includes(q);
        const matchSales = cust.salesNama.toLowerCase().includes(q);
        const matchZone = cust.zonaNama.toLowerCase().includes(q);
        if (!matchName && !matchAddress && !matchSales && !matchZone) {
          return false;
        }
      }

      return true;
    });
  }, [processedCustomers, filter, serviceZoneLayers, showServiceZones, activeVisibleZones]);

  // Statistik Ringkas untuk Toolbar Atas
  // Total Kunjungan Lapangan Spreading (Termasuk seluruh riwayat survei yang digabungkan ke properti master)
  const totalSpreadingVisits = useMemo(() => {
    return filteredCustomers.reduce((acc, c) => {
      const count = c.historyVisits && c.historyVisits.length > 0 ? c.historyVisits.length : 1;
      return acc + count;
    }, 0);
  }, [filteredCustomers]);

  // Jumlah Properti Fisik Unik di Lapangan
  const uniquePropertiesCount = filteredCustomers.length;

  const minatCount = filteredCustomers.filter((c) => c.statusMinat === 'Minat').length;
  const tidakMinatCount = filteredCustomers.filter((c) => c.statusMinat === 'Tidak Minat').length;

  // Total cluster duplikat yang belum diselesaikan
  const pendingDuplicatesCount = clusters.filter((c) => c.status === 'pending').length;

  // Handler: Merge survei berulang ke 1 Riwayat Properti Master (Mendukung seleksi survei parsial)
  const handleMergeCluster = (
    cluster: DuplicateCluster | string,
    canonicalSurveyId: string,
    analystNote?: string,
    selectedSurveyIds?: string[]
  ) => {
    const clusterObj = typeof cluster === 'string' ? clusters.find((c) => c.groupId === cluster) : cluster;
    if (!clusterObj) return;

    // Filter hanya data yang dipilih untuk digabungkan
    const targetIds = selectedSurveyIds && selectedSurveyIds.length >= 2
      ? selectedSurveyIds
      : clusterObj.surveys.map((s) => s.id);

    const surveysToMerge = clusterObj.surveys.filter((s) => targetIds.includes(s.id));
    const unmergedSurveys = clusterObj.surveys.filter((s) => !targetIds.includes(s.id));

    const mergedMaster = mergeSurveysToPropertyHistory(surveysToMerge, canonicalSurveyId, analystNote);
    const mergedIdsSet = new Set(surveysToMerge.map((s) => s.id));

    setCustomers((prev) => {
      // Tandai data survei yang tidak dipilih agar tetap ada sebagai properti terpisah
      const updatedPrev = prev.map((c) => {
        if (unmergedSurveys.some((u) => u.id === c.id)) {
          return {
            ...c,
            isDuplicateCandidate: false,
            analystDecision: 'separate_property' as const,
            analystNote: analystNote ? `Diverifikasi Analis: Tidak digabung (${analystNote})` : 'Diverifikasi Analis: Rumah/objek fisik terpisah',
          };
        }
        return c;
      });

      const remaining = updatedPrev.filter((c) => !mergedIdsSet.has(c.id));
      const nextCustomers = [mergedMaster, ...remaining];
      saveCustomersToPersistentStorage(nextCustomers);
      return nextCustomers;
    });

    setLiveToast({
      message: unmergedSurveys.length > 0
        ? `✅ Berhasil menggabungkan ${surveysToMerge.length} survei spreading terpilih ke 1 master: ${mergedMaster.nama} (${unmergedSurveys.length} data lainnya dibiarkan sebagai properti terpisah).`
        : `✅ Berhasil menggabungkan seluruh (${surveysToMerge.length}) survei spreading ke 1 properti riwayat master: ${mergedMaster.nama}.`,
      type: 'success',
    });
  };

  // Handler: Tetapkan sebagai properti terpisah
  const handleSeparateCluster = (cluster: DuplicateCluster | string, analystNote?: string) => {
    const clusterObj = typeof cluster === 'string' ? clusters.find((c) => c.groupId === cluster) : cluster;
    if (!clusterObj) return;

    const clusterSurveyIds = new Set(clusterObj.surveys.map((s) => s.id));

    setCustomers((prev) =>
      prev.map((c) => {
        if (clusterSurveyIds.has(c.id)) {
          return {
            ...c,
            isDuplicateCandidate: false,
            analystDecision: 'separate_property',
            analystNote: analystNote || 'Diverifikasi Analis: Rumah/objek fisik terpisah',
          };
        }
        return c;
      })
    );

    setLiveToast({
      message: `✓ Verifikasi selesai: Titik spreading ditetapkan sebagai rumah/properti terpisah.`,
      type: 'info',
    });
  };

  // Handler: Update warna zona per kecamatan
  const handleUpdateZoneColors = (layerId: string, updatedGeoJson: GeoJSON.FeatureCollection) => {
    setServiceZoneLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, geoJsonData: updatedGeoJson } : l))
    );
  };

  // Handler: Tambah survei baru
  const handleAddCustomer = (newCustomer: CustomerSurvey) => {
    setCustomers((prev) => {
      const next = [newCustomer, ...prev];
      saveCustomersToPersistentStorage(next);
      return next;
    });
    setFocusedMapCustomer(newCustomer);
    setLiveToast({
      message: `🎉 Data spreading baru berhasil ditambahkan: ${newCustomer.nama} (${newCustomer.statusMinat})`,
      type: 'success',
    });
  };

  // Handler: Simulasi Push Spreading Baru dari Sales AppSheet
  const handleSimulateRealtimePush = () => {
    const randomSales = salesList[Math.floor(Math.random() * salesList.length)];
    const randomZone = zones[Math.floor(Math.random() * zones.length)];
    const randomStatus: InterestStatus = Math.random() > 0.3 ? 'Minat' : 'Tidak Minat';

    const newSimulated: CustomerSurvey = {
      id: `CUST-LIVE-${Date.now().toString().slice(-4)}`,
      nama: `Bpk/Ibu Pelanggan Baru (${randomSales.nama.split(' ')[0]})`,
      alamat: `Jl. Raya ${randomZone.kecamatan} RT 0${Math.floor(Math.random() * 5) + 1}/02`,
      telepon: `0812-8899-${Math.floor(Math.random() * 9000) + 1000}`,
      latitude: randomZone.centerLat + (Math.random() - 0.5) * 0.008,
      longitude: randomZone.centerLng + (Math.random() - 0.5) * 0.008,
      statusMinat: randomStatus,
      salesId: randomSales.id,
      salesNama: randomSales.nama,
      zonaId: randomZone.id,
      zonaNama: randomZone.nama,
      tanggalSpreading: '2026-09-30',
      kebutuhanDebit: 'Rumah Tangga 1',
      jarakKePipaMeter: Math.floor(Math.random() * 25) + 5,
      catatanSales: `[Realtime AppSheet Sync] Input langsung via mobile appsheet oleh ${randomSales.nama}.`,
    };

    setCustomers((prev) => [newSimulated, ...prev]);
    setFocusedMapCustomer(newSimulated);
    setLiveToast({
      message: `⚡ [REALTIME APPSHEET] ${randomSales.nama} baru saja submit spreading di ${randomZone.nama}!`,
      type: 'success',
    });
  };

  // Handler: Fokus Titik Pelanggan di Peta & Auto Tutup Seluruh Halaman / Modal Overlay
  const handleFocusCustomerOnMap = (cust: CustomerSurvey) => {
    setFocusedMapCustomer(cust);
    setDetailModalCustomer(null); // Auto close detail modal!
    setIsAnalystModalOpen(false); // Auto close analyst modal!
    setIsUploadModalOpen(false);
    setIsSpreadsheetModalOpen(false);
    setIsSalesModalOpen(false);
    setIsGuideModalOpen(false);
    setIsZoneColorModalOpen(false);
    setIsSymbologyModalOpen(false);
    setIsLogoModalOpen(false);
    setIsAddCustomerModalOpen(false);
    setIsSidebarOpen(false);
    setActiveTab('map'); // Auto close table overlay & direct switch to full map view!
    setFocusBounds({
      minLat: cust.latitude - 0.001,
      maxLat: cust.latitude + 0.001,
      minLng: cust.longitude - 0.001,
      maxLng: cust.longitude + 0.001,
    });
    setLiveToast({
      message: `📍 Menampilkan lokasi: ${cust.nama} (${cust.alamat}) di peta satelit GIS.`,
      type: 'info',
    });
  };

  // Handler: Update status customer
  const handleUpdateCustomerStatus = (id: string, newStatus: InterestStatus) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, statusMinat: newStatus } : c))
    );
    if (focusedMapCustomer && focusedMapCustomer.id === id) {
      setFocusedMapCustomer((prev) => (prev ? { ...prev, statusMinat: newStatus } : null));
    }
    if (detailModalCustomer && detailModalCustomer.id === id) {
      setDetailModalCustomer((prev) => (prev ? { ...prev, statusMinat: newStatus } : null));
    }
  };

  // Handler: Hapus 1 Data Pelanggan
  const handleDeleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    if (focusedMapCustomer && focusedMapCustomer.id === id) {
      setFocusedMapCustomer(null);
    }
    if (detailModalCustomer && detailModalCustomer.id === id) {
      setDetailModalCustomer(null);
    }
    setLiveToast({
      message: '🗑️ Data kunjungan berhasil dihapus dari dashboard.',
      type: 'info',
    });
  };

  // Handler: Hapus Banyak Data Pelanggan Sekaligus (Bulk Delete)
  const handleBulkDeleteCustomers = (ids: string[]) => {
    const idSet = new Set(ids);
    setCustomers((prev) => prev.filter((c) => !idSet.has(c.id)));
    if (focusedMapCustomer && idSet.has(focusedMapCustomer.id)) {
      setFocusedMapCustomer(null);
    }
    if (detailModalCustomer && idSet.has(detailModalCustomer.id)) {
      setDetailModalCustomer(null);
    }
    setLiveToast({
      message: `🗑️ Berhasil menghapus ${ids.length} data kunjungan terpilih.`,
      type: 'info',
    });
  };

  // Handler: Hapus Seluruh Data Pelanggan di Dashboard
  const handleClearAllCustomers = () => {
    setCustomers([]);
    setFocusedMapCustomer(null);
    setDetailModalCustomer(null);
    saveCustomersToPersistentStorage([]);
    setLiveToast({
      message: '🗑️ Seluruh data kunjungan di dashboard telah dibersihkan.',
      type: 'info',
    });
  };

  // Handler: Update & Kelola Daftar Nama Sales (Filter & Data Spreading)
  const handleSaveSalesList = (updatedList: SalesRep[], cascadeUpdateCustomers: boolean) => {
    setSalesList(updatedList);
    saveSalesToStorage(updatedList);

    if (cascadeUpdateCustomers) {
      const salesNameMap = new Map(updatedList.map((s) => [s.id, s.nama]));
      setCustomers((prev) => {
        const updatedCusts = prev.map((c) => {
          if (c.salesId && salesNameMap.has(c.salesId)) {
            return {
              ...c,
              salesNama: salesNameMap.get(c.salesId)!,
            };
          }
          return c;
        });
        saveCustomersToPersistentStorage(updatedCusts);
        return updatedCusts;
      });
    }

    setLiveToast({
      message: `✓ Nama petugas sales berhasil diperbarui (${updatedList.length} sales). Filter data otomatis tersinkron.`,
      type: 'success',
    });
  };

  // Handler: Reset Nama Sales ke Default Bawaan Aetra
  const handleResetDefaultSales = () => {
    const defaults = resetSalesToDefault();
    setSalesList(defaults);
    saveSalesToStorage(defaults);
    setLiveToast({
      message: '🔄 Daftar nama petugas sales telah direset ke 5 petugas default Aetra.',
      type: 'info',
    });
  };

  // Handler: Pulihkan Data Pelanggan Bawaan Demo
  const handleRestoreDefaultCustomers = () => {
    setCustomers(INITIAL_CUSTOMERS);
    setFocusedMapCustomer(null);
    setDetailModalCustomer(null);
    setLiveToast({
      message: '🔄 Data demo bawaan pelanggan berhasil dipulihkan (12 pelanggan).',
      type: 'info',
    });
  };

  // Handler: Import Data dari Spreadsheet (Excel/CSV atau Google Sheet)
  const handleImportSpreadsheetCustomers = (imported: CustomerSurvey[], mode: 'append' | 'replace') => {
    let nextCustomers: CustomerSurvey[];
    if (mode === 'replace') {
      nextCustomers = imported;
    } else {
      // Upsert cerdas: jika No Form atau ID sudah ada, perbarui SEMUA data kolomnya dengan data terbaru
      const updatedMap = new Map<string, CustomerSurvey>();
      customers.forEach((c) => {
        const key = c.noForm?.trim().toLowerCase() || c.id;
        updatedMap.set(key, c);
      });
      imported.forEach((item) => {
        const key = item.noForm?.trim().toLowerCase() || item.id;
        const existing = updatedMap.get(key);
        if (existing) {
          updatedMap.set(key, { ...existing, ...item, id: existing.id });
        } else {
          updatedMap.set(key, item);
        }
      });
      nextCustomers = Array.from(updatedMap.values());
    }

    setCustomers(nextCustomers);
    saveCustomersToPersistentStorage(nextCustomers);
    setIsSpreadsheetLinked(Boolean(getSavedLinkedSpreadsheetConfig()?.url));

    // Sinkronkan juga customer yang sedang dilihat di modal rincian / fokus peta
    if (detailModalCustomer) {
      const match = nextCustomers.find(
        (c) => c.id === detailModalCustomer.id || (c.noForm && c.noForm === detailModalCustomer.noForm)
      );
      if (match) setDetailModalCustomer(match);
    }
    if (focusedMapCustomer) {
      const match = nextCustomers.find(
        (c) => c.id === focusedMapCustomer.id || (c.noForm && c.noForm === focusedMapCustomer.noForm)
      );
      if (match) setFocusedMapCustomer(match);
    } else if (imported.length > 0) {
      setFocusedMapCustomer(imported[0]);
    }

    const mCount = nextCustomers.filter((c) => c.statusMinat === 'Minat').length;
    const tmCount = nextCustomers.filter((c) => c.statusMinat === 'Tidak Minat').length;

    setLiveToast({
      message: `🎉 Berhasil ${mode === 'replace' ? 'memperbarui seluruh' : 'menyelaraskan'} data spreading: ${nextCustomers.length} data (${mCount} Minat, ${tmCount} Tidak Minat)! Seluruh kolom data tersinkronisasi.`,
      type: 'success',
    });
  };

  // Handler: Quick Sync dari Google Sheet yang Sudah Terhubung
  const handleQuickSyncSpreadsheet = async () => {
    const saved = getSavedLinkedSpreadsheetConfig();
    if (!saved || !saved.url) {
      setIsSpreadsheetModalOpen(true);
      return;
    }
    setIsQuickSyncing(true);
    try {
      const result = await fetchFromGoogleSpreadsheet(saved.url, saved.mapping);
      if (result.customers.length > 0) {
        setCustomers(result.customers);
        saveCustomersToPersistentStorage(result.customers);

        // Update objek customer yang sedang aktif di modal atau fokus peta
        setFocusedMapCustomer((prev) => {
          if (!prev) return null;
          const updated = result.customers.find((c) => c.id === prev.id || (c.noForm && c.noForm === prev.noForm));
          return updated || prev;
        });
        setDetailModalCustomer((prev) => {
          if (!prev) return null;
          const updated = result.customers.find((c) => c.id === prev.id || (c.noForm && c.noForm === prev.noForm));
          return updated || prev;
        });

        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        saveLinkedSpreadsheetConfig({
          ...saved,
          lastSyncedAt: timeStr,
          lastSyncTimestamp: Date.now(),
          lastSyncedCount: result.customers.length,
        });
        setIsSpreadsheetLinked(true);
        const mCount = result.customers.filter((c) => c.statusMinat === 'Minat').length;
        const tmCount = result.customers.filter((c) => c.statusMinat === 'Tidak Minat').length;
        setLiveToast({
          message: `⚡ [SYNC SEMUA KOLOM REALTIME] Berhasil memperbarui ${result.customers.length} data spreading (${mCount} Minat, ${tmCount} Tidak Minat). Semua kolom data telah tersinkronisasi!`,
          type: 'success',
        });
      }
    } catch (err: any) {
      setLiveToast({
        message: `⚠️ Gagal sinkron Google Sheets: ${err.message || 'Periksa koneksi link'}`,
        type: 'info',
      });
    } finally {
      setIsQuickSyncing(false);
    }
  };

  // Auto-sync Google Sheets di Latar Belakang secara responsif
  useEffect(() => {
    let isCancelled = false;

    const checkAndSync = async () => {
      const saved = getSavedLinkedSpreadsheetConfig();
      if (!saved || !saved.url || !saved.autoSync) return;

      const intervalMs = (saved.intervalMinutes || 1) * 60 * 1000;
      const lastSync = saved.lastSyncTimestamp || 0;
      if (Date.now() - lastSync < intervalMs) {
        return;
      }

      try {
        const result = await fetchFromGoogleSpreadsheet(saved.url, saved.mapping);
        if (isCancelled) return;
        if (result.customers.length > 0) {
          const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setCustomers(result.customers);
          saveCustomersToPersistentStorage(result.customers);

          // Update data yang sedang dibuka jika ada perubahan
          setFocusedMapCustomer((prev) => {
            if (!prev) return null;
            const updated = result.customers.find((c) => c.id === prev.id || (c.noForm && c.noForm === prev.noForm));
            return updated || prev;
          });
          setDetailModalCustomer((prev) => {
            if (!prev) return null;
            const updated = result.customers.find((c) => c.id === prev.id || (c.noForm && c.noForm === prev.noForm));
            return updated || prev;
          });

          saveLinkedSpreadsheetConfig({
            ...saved,
            lastSyncedAt: timeStr,
            lastSyncTimestamp: Date.now(),
            lastSyncedCount: result.customers.length,
          });
          setIsSpreadsheetLinked(true);
          const mCount = result.customers.filter((c) => c.statusMinat === 'Minat').length;
          const tmCount = result.customers.filter((c) => c.statusMinat === 'Tidak Minat').length;
          setLiveToast({
            message: `🔄 [AUTO-SYNC SEMUA KOLOM] ${result.customers.length} data spreading tersinkron (${mCount} Minat, ${tmCount} Tidak Minat) pukul ${timeStr}.`,
            type: 'success',
          });
        }
      } catch (err) {
        console.warn('Auto-sync background check notice:', err);
      }
    };

    // Polling scheduler setiap 10 detik memeriksa apakah jadwal autoSync sudah tiba
    const timerId = setInterval(checkAndSync, 10000);
    checkAndSync();

    return () => {
      isCancelled = true;
      clearInterval(timerId);
    };
  }, [isSpreadsheetLinked]);

  // Handler: Restore default demo layers
  const handleRestoreDefaultLayers = () => {
    setPipeLayers(defaultPipeLayers);
    setServiceZoneLayers(defaultZoneLayers);
    savePipeLayersToStorage(defaultPipeLayers);
    saveServiceZoneLayersToStorage(defaultZoneLayers);
    setLiveToast({
      message: '🔄 Layer bawaan sistem (Pipa Utama & Zona Kecamatan Aetra) berhasil dipulihkan.',
      type: 'info',
    });
  };

  // Handler: Update Simbologi Pipa (Gaya QGIS)
  const handleUpdatePipeSymbology = (layerId: string, classifyColumn: string, rules: SymbologyRule[], strokeWidth?: number) => {
    setPipeLayers((prev) =>
      prev.map((l) =>
        l.id === layerId
          ? {
              ...l,
              classifyColumn,
              symbologyRules: rules,
              width: strokeWidth !== undefined ? strokeWidth : (l.width || 3.0),
            }
          : l
      )
    );
    setLiveToast({
      message: `🎨 Simbologi QGIS aktif: Kolom [${classifyColumn.toUpperCase()}] dengan ${rules.length} aturan warna & ketebalan garis tersinkron ke peta & legenda.`,
      type: 'success',
    });
  };

  // Handler: Update Simbologi Zona Pelayanan (Gaya QGIS)
  const handleUpdateZoneSymbology = (layerId: string, classifyColumn: string, rules: SymbologyRule[]) => {
    setServiceZoneLayers((prev) =>
      prev.map((l) =>
        l.id === layerId
          ? {
              ...l,
              classifyColumn,
              symbologyRules: rules,
            }
          : l
      )
    );
    setLiveToast({
      message: `🎨 Simbologi Zona aktif: Kolom [${classifyColumn.toUpperCase()}] dengan ${rules.length} warna tersinkron ke peta & legenda.`,
      type: 'success',
    });
  };

  // Map click for picking location
  const handleMapClick = (lat: number, lng: number) => {
    if (isPickingLocation) {
      setPickedCoordinates({ lat, lng });
      setIsPickingLocation(false);
      setIsAddCustomerModalOpen(true);
    }
  };

  return (
    <div
      className={`h-screen w-screen overflow-hidden ${
        theme === 'light' ? 'bg-[#f8fafc] text-slate-800' : 'bg-slate-950 text-slate-100'
      } flex flex-col font-['Plus_Jakarta_Sans',sans-serif]`}
    >
      {/* 1. COMPACT TOP HEADER & QUICK FILTER (< 8% Height) */}
      <CompactHeaderToolbar
        totalSpreadingVisits={totalSpreadingVisits}
        uniquePropertiesCount={uniquePropertiesCount}
        minatCount={minatCount}
        tidakMinatCount={tidakMinatCount}
        duplicateCount={pendingDuplicatesCount}
        salesList={salesList}
        filter={filter}
        onFilterChange={setFilter}
        onOpenAnalystModal={() => setIsAnalystModalOpen(true)}
        onOpenAddSurveyModal={() => setIsAddCustomerModalOpen(true)}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onOpenSpreadsheetModal={() => setIsSpreadsheetModalOpen(true)}
        isSpreadsheetLinked={isSpreadsheetLinked}
        onQuickSyncSpreadsheet={handleQuickSyncSpreadsheet}
        isQuickSyncing={isQuickSyncing}
        onOpenSalesModal={() => setIsSalesModalOpen(true)}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
        onOpenLogoModal={() => setIsLogoModalOpen(true)}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      />

      {/* 2. REAL-TIME TOAST / NOTIFICATION STRIP */}
      {liveToast && (
        <div
          className={`${
            theme === 'light'
              ? 'bg-[#005baa]/10 border-b border-[#005baa]/20 text-[#005baa]'
              : 'bg-sky-950/90 border-b border-sky-800/80 text-sky-200'
          } px-3 py-1 flex items-center justify-between text-[11px] z-10 shrink-0`}
        >
          <div className="flex items-center gap-2 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="truncate font-medium">{liveToast.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button
              onClick={handleSimulateRealtimePush}
              className={`px-2 py-0.5 rounded ${
                theme === 'light'
                  ? 'bg-[#005baa] hover:bg-[#004b8d] text-white shadow-sm'
                  : 'bg-sky-800 hover:bg-sky-700 text-sky-100'
              } text-[10px] font-bold flex items-center gap-1 transition`}
              title="Simulasikan sales lapangan menginput data baru di AppSheet"
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>Simulasi Push AppSheet</span>
            </button>
            <button
              onClick={() => setLiveToast(null)}
              className={theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-sky-400 hover:text-white'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN MAP WORKSPACE (Occupies 85%+ of Viewport) */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Leaflet Map Canvas */}
        <MapComponent
          customers={filteredCustomers}
          pipeLayers={pipeLayers}
          serviceZoneLayers={serviceZoneLayers}
          selectedCustomer={focusedMapCustomer}
          onSelectCustomer={(cust) => {
            setFocusedMapCustomer(cust);
            setDetailModalCustomer(cust);
          }}
          onOpenAnalystModal={() => setIsAnalystModalOpen(true)}
          onOpenZoneColorModal={() => setIsZoneColorModalOpen(true)}
          onOpenSymbologyModal={() => setIsSymbologyModalOpen(true)}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onMapClick={handleMapClick}
          isPickingLocation={isPickingLocation}
          focusBounds={focusBounds}
          theme={theme}
          showServiceZones={showServiceZones}
          onToggleShowServiceZones={handleToggleShowServiceZones}
          onToggleServiceZoneLayer={handleToggleServiceZoneLayer}
          onDeleteServiceZoneLayer={(id) => {
            setServiceZoneLayers((prev) => {
              const updated = prev.filter((z) => z.id !== id);
              saveServiceZoneLayersToStorage(updated);
              return updated;
            });
            setLiveToast({
              message: '🗑️ File batas zona berhasil dihapus dari sistem.',
              type: 'info',
            });
          }}
          onDeletePipeLayer={(id) => {
            setPipeLayers((prev) => {
              const updated = prev.filter((l) => l.id !== id);
              savePipeLayersToStorage(updated);
              return updated;
            });
            setLiveToast({
              message: '🗑️ File jaringan pipa berhasil dihapus dari sistem.',
              type: 'info',
            });
          }}
          zoneLabelAttribute={zoneLabelAttribute}
          onZoneLabelAttributeChange={setZoneLabelAttribute}
        />

        {/* Slide-out Compact GIS Filter Drawer (Collapsible) */}
        {isSidebarOpen && (
          <div
            className={`absolute top-3 left-3 z-20 w-80 max-h-[calc(100%-24px)] overflow-y-auto shadow-2xl rounded-xl border ${
              theme === 'light'
                ? 'border-slate-200 bg-white/95 text-slate-800'
                : 'border-slate-700/80 bg-slate-900/95 text-slate-100'
            } backdrop-blur-md`}
          >
            <div
              className={`flex items-center justify-between p-3 border-b ${
                theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/80'
              }`}
            >
              <span className={`font-extrabold text-xs uppercase tracking-wider ${theme === 'light' ? 'text-[#005baa]' : 'text-slate-100'}`}>
                Panel Filter GIS &amp; Batas Zona
              </span>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className={`p-1 rounded ${theme === 'light' ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3">
              <FilterSidebar
                filter={filter}
                onFilterChange={setFilter}
                zones={activeVisibleZones}
                salesList={salesList}
                serviceZoneLayers={serviceZoneLayers}
                totalFiltered={filteredCustomers.length}
                totalAll={customers.length}
                onClearAllCustomers={handleClearAllCustomers}
                onRestoreDefaultCustomers={handleRestoreDefaultCustomers}
                onOpenSpreadsheetModal={() => setIsSpreadsheetModalOpen(true)}
                onOpenSalesModal={() => setIsSalesModalOpen(true)}
                theme={theme}
                zoneLabelAttribute={zoneLabelAttribute}
              />
            </div>
          </div>
        )}

        {/* Floating Quick Controls (Draggable View Switcher: Peta Satelit GIS vs Tabel Data Pelanggan) */}
        <DraggableFloatingSwitcher
          activeTab={activeTab}
          onTabChange={setActiveTab}
          customerCount={filteredCustomers.length}
          theme={theme}
        />

        {/* Modal Overlay Table jika user ingin melihat tabel data */}
        {activeTab === 'table' && (
          <div
            className={`absolute inset-0 z-30 ${
              theme === 'light' ? 'bg-slate-900/40' : 'bg-slate-950/95'
            } backdrop-blur-md p-4 sm:p-6 overflow-y-auto`}
          >
            <div className="max-w-6xl mx-auto space-y-4">
              <div
                className={`flex items-center justify-between pb-3 border-b ${
                  theme === 'light' ? 'border-slate-200 bg-white p-4 rounded-xl shadow-sm' : 'border-slate-800'
                }`}
              >
                <div>
                  <h3 className={`font-extrabold text-base ${theme === 'light' ? 'text-[#005baa]' : 'text-slate-100'}`}>
                    Daftar Data Survei Pelanggan Aetra Air Tangerang
                  </h3>
                  <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Data hasil spreading dari 5 orang sales AppSheet
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('map')}
                  className="px-4 py-2 bg-[#005baa] hover:bg-[#004b8d] text-white font-bold rounded-lg text-xs transition shadow-md"
                >
                  Kembali ke Peta Satelit
                </button>
              </div>

              <CustomerTable
                customers={filteredCustomers}
                onSelectCustomer={(cust) => setDetailModalCustomer(cust)}
                onFocusMap={handleFocusCustomerOnMap}
                onDeleteCustomer={handleDeleteCustomer}
                onBulkDeleteCustomers={handleBulkDeleteCustomers}
                onClearAllCustomers={handleClearAllCustomers}
                onRestoreDefaultCustomers={handleRestoreDefaultCustomers}
                onOpenSpreadsheetModal={() => setIsSpreadsheetModalOpen(true)}
                theme={theme}
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. MODALS */}
      {/* A. Sales Analyst Duplicate Detection & Property Merge Modal */}
      <SalesAnalystModal
        isOpen={isAnalystModalOpen}
        onClose={() => setIsAnalystModalOpen(false)}
        clusters={clusters}
        onMergeCluster={handleMergeCluster}
        onSeparateCluster={handleSeparateCluster}
        onFocusSurveyOnMap={handleFocusCustomerOnMap}
        theme={theme}
      />

      {/* B. Upload KMZ / KML / GeoJSON / SHP Pipeline & Service Zone Layer */}
      <UploadNetworkModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        pipeLayers={pipeLayers}
        serviceZoneLayers={serviceZoneLayers}
        onAddPipeLayer={(newLayer) => {
          setPipeLayers((prev) => {
            const updated = [...prev, newLayer];
            savePipeLayersToStorage(updated);
            return updated;
          });
        }}
        onAddServiceZoneLayer={(newZone) => {
          setServiceZoneLayers((prev) => {
            const updated = [...prev, newZone];
            saveServiceZoneLayersToStorage(updated);
            return updated;
          });
        }}
        onReplacePipeLayer={(id, newLayer) => {
          setPipeLayers((prev) => {
            const updated = prev.map((l) => (l.id === id ? newLayer : l));
            savePipeLayersToStorage(updated);
            return updated;
          });
        }}
        onReplaceServiceZoneLayer={(id, newZone) => {
          setServiceZoneLayers((prev) => {
            const updated = prev.map((z) => (z.id === id ? newZone : z));
            saveServiceZoneLayersToStorage(updated);
            return updated;
          });
        }}
        onTogglePipeLayer={(id) => {
          setPipeLayers((prev) => {
            const updated = prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
            savePipeLayersToStorage(updated);
            return updated;
          });
        }}
        onToggleServiceZoneLayer={(id) => {
          setServiceZoneLayers((prev) => {
            const updated = prev.map((z) => (z.id === id ? { ...z, visible: !z.visible } : z));
            saveServiceZoneLayersToStorage(updated);
            return updated;
          });
        }}
        onDeletePipeLayer={(id) => {
          setPipeLayers((prev) => {
            const updated = prev.filter((l) => l.id !== id);
            savePipeLayersToStorage(updated);
            return updated;
          });
        }}
        onDeleteServiceZoneLayer={(id) => {
          setServiceZoneLayers((prev) => {
            const updated = prev.filter((z) => z.id !== id);
            saveServiceZoneLayersToStorage(updated);
            return updated;
          });
        }}
        onRestoreDefaultLayers={handleRestoreDefaultLayers}
        onFocusLayerBounds={(bounds) => setFocusBounds(bounds)}
        theme={theme}
      />

      {/* C. Add Customer Survey Form (Simulates AppSheet Field Submission) */}
      <AddCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onAddCustomer={handleAddCustomer}
        zones={activeVisibleZones.length > 0 ? activeVisibleZones : INITIAL_ZONES}
        salesList={salesList}
        pipeLayers={pipeLayers}
        pickedCoordinates={pickedCoordinates}
        onStartPickCoordinate={() => {
          setIsAddCustomerModalOpen(false);
          setIsPickingLocation(true);
        }}
        theme={theme}
      />

      {/* D. Customer Detail & History Modal */}
      <CustomerDetailModal
        customer={detailModalCustomer}
        onClose={() => setDetailModalCustomer(null)}
        onUpdateStatus={handleUpdateCustomerStatus}
        onDeleteCustomer={handleDeleteCustomer}
        onFocusMap={handleFocusCustomerOnMap}
        theme={theme}
      />

      {/* E. Import & Live Sync Google Spreadsheet / Excel Modal */}
      <SpreadsheetSyncModal
        isOpen={isSpreadsheetModalOpen}
        onClose={() => setIsSpreadsheetModalOpen(false)}
        onImportCustomers={handleImportSpreadsheetCustomers}
        currentCustomerCount={customers.length}
        onSyncComplete={() => setIsSpreadsheetLinked(true)}
        theme={theme}
      />

      {/* F. Supabase Architecture, SQL Schema & Apps Script Guide */}
      <SupabaseGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      {/* G. Zone Color & Kecamatan Customization Modal */}
      <ZoneColorModal
        isOpen={isZoneColorModalOpen}
        onClose={() => setIsZoneColorModalOpen(false)}
        serviceZoneLayers={serviceZoneLayers}
        onUpdateZoneColors={handleUpdateZoneColors}
        theme={theme}
      />

      {/* H. QGIS-Style Layer Symbology & Color Customizer */}
      <LayerSymbologyModal
        isOpen={isSymbologyModalOpen}
        onClose={() => setIsSymbologyModalOpen(false)}
        pipeLayers={pipeLayers}
        serviceZoneLayers={serviceZoneLayers}
        onUpdatePipeSymbology={handleUpdatePipeSymbology}
        onUpdateZoneSymbology={handleUpdateZoneSymbology}
        theme={theme}
      />

      {/* I. Custom Logo Upload & Height Settings Modal */}
      <LogoManagerModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
        theme={theme}
      />

      {/* J. Sales Manager Modal (Ubah & Kelola Nama Sales untuk Filter) */}
      <SalesManagerModal
        isOpen={isSalesModalOpen}
        onClose={() => setIsSalesModalOpen(false)}
        salesList={salesList}
        onSaveSalesList={handleSaveSalesList}
        onResetDefaultSales={handleResetDefaultSales}
        theme={theme}
      />

      {/* K. Keamanan & Privasi Data IndexedDB Modal */}
      <SecurityPrivacyModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        pipeLayersCount={pipeLayers.length}
        serviceZoneLayersCount={serviceZoneLayers.length}
        customerSurveysCount={customers.length}
        theme={theme}
        onClearLocalCache={() => {
          clearSpatialLayersStorage();
          setPipeLayers([]);
          setServiceZoneLayers([]);
          setLiveToast({
            message: '🧹 Seluruh data spasial lokal berhasil dibersihkan dari IndexedDB.',
            type: 'info',
          });
        }}
      />
    </div>
  );
};
