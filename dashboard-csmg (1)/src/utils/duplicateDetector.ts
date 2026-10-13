import { CustomerSurvey, DuplicateCluster, VisitRecord } from '../types/gis';
import { haversineDistanceKm } from './kmlParser';

/**
 * Mendeteksi survei spreading pada titik koordinat yang berdekatan (threshold <= radiusMeter, default 10 meter untuk area perumahan rapat)
 */
export function detectDuplicateSpreading(
  customers: CustomerSurvey[],
  thresholdMeters: number = 10
): {
  processedCustomers: CustomerSurvey[];
  clusters: DuplicateCluster[];
} {
  const clusters: DuplicateCluster[] = [];
  const assignedClusterMap = new Map<string, string>(); // customerId -> groupId

  // Identifikasi pasangan koordinat yang berjarak <= thresholdMeters
  for (let i = 0; i < customers.length; i++) {
    const c1 = customers[i];
    for (let j = i + 1; j < customers.length; j++) {
      const c2 = customers[j];

      // Jika salah satunya sudah di-merge atau diputuskan terpisah oleh analis
      if (c1.analystDecision === 'separate_property' && c2.analystDecision === 'separate_property') {
        continue;
      }

      const distMeters = haversineDistanceKm(c1.latitude, c1.longitude, c2.latitude, c2.longitude) * 1000;

      if (distMeters <= thresholdMeters) {
        let groupId = assignedClusterMap.get(c1.id) || assignedClusterMap.get(c2.id);
        if (!groupId) {
          groupId = `DUP-CLUSTER-${clusters.length + 1}`;
        }
        assignedClusterMap.set(c1.id, groupId);
        assignedClusterMap.set(c2.id, groupId);

        let existingCluster = clusters.find((c) => c.groupId === groupId);
        if (!existingCluster) {
          existingCluster = {
            groupId,
            anchorSurvey: c1,
            surveys: [c1],
            distanceMeters: Math.round(distMeters),
            status: c1.isMerged || c2.isMerged ? 'resolved_merged' : 'pending',
          };
          clusters.push(existingCluster);
        }

        if (!existingCluster.surveys.some((s) => s.id === c2.id)) {
          existingCluster.surveys.push(c2);
          existingCluster.distanceMeters = Math.min(existingCluster.distanceMeters, Math.round(distMeters));
        }
      }
    }
  }

  // Terapkan metadata duplikat pada setiap data survei
  const processedCustomers = customers.map((c) => {
    const groupId = assignedClusterMap.get(c.id);
    if (groupId) {
      const cluster = clusters.find((cl) => cl.groupId === groupId);
      const isResolved = cluster?.status === 'resolved_merged' || c.isMerged || c.analystDecision === 'separate_property' || c.analystDecision === 'merged_history';
      const count = cluster ? cluster.surveys.length : 2;
      return {
        ...c,
        isDuplicateCandidate: !isResolved,
        duplicateCount: count,
        duplicateGroupId: groupId,
        duplicateDistanceMeters: cluster?.distanceMeters || 10,
      };
    }
    return c;
  });

  return { processedCustomers, clusters };
}

/**
 * Menggabungkan beberapa survei kunjungan menjadi 1 Properti Master dengan Riwayat Kunjungan (History)
 */
export function mergeSurveysToPropertyHistory(
  surveysToMerge: CustomerSurvey[],
  canonicalSurveyId: string,
  analystNote?: string
): CustomerSurvey {
  const anchor = surveysToMerge.find((s) => s.id === canonicalSurveyId) || surveysToMerge[0];

  // Susun semua kunjungan sebagai history log lengkap
  const allVisits: VisitRecord[] = [];
  surveysToMerge.forEach((s) => {
    // Ambil histori yang sudah ada jika ada, atau buat record baru
    if (s.historyVisits && s.historyVisits.length > 0) {
      allVisits.push(...s.historyVisits);
    } else {
      allVisits.push({
        visitId: s.id,
        noForm: s.noForm,
        nama: s.nama,
        telepon: s.telepon,
        alamat: s.alamat,
        salesId: s.salesId,
        salesNama: s.salesNama,
        tanggalSpreading: s.tanggalSpreading,
        timestamp: s.timestamp,
        statusMinat: s.statusMinat,
        kebutuhanDebit: s.kebutuhanDebit,
        alasan: s.alasanTidakMinat || s.alasan,
        catatanSales: s.catatanSales,
        fotoProperti: s.fotoProperti || s.fotoRumahUrl,
        coordinates: [s.latitude, s.longitude],
      });
    }
  });

  // Urutkan histori berdasarkan tanggal/waktu terbaru
  allVisits.sort((a, b) => {
    const timeA = new Date(a.timestamp || a.tanggalSpreading).getTime();
    const timeB = new Date(b.timestamp || b.tanggalSpreading).getTime();
    return timeB - timeA;
  });

  // Ambil status terbaru dari kunjungan terakhir
  const latestVisit = allVisits[0];
  const resolvedPhoto =
    latestVisit.fotoProperti ||
    allVisits.find((v) => v.fotoProperti)?.fotoProperti ||
    anchor.fotoProperti ||
    anchor.fotoRumahUrl;

  return {
    ...anchor,
    statusMinat: latestVisit.statusMinat,
    tanggalSpreading: latestVisit.tanggalSpreading,
    timestamp: latestVisit.timestamp || anchor.timestamp,
    kebutuhanDebit: latestVisit.kebutuhanDebit || anchor.kebutuhanDebit,
    alasanTidakMinat: latestVisit.statusMinat === 'Tidak Minat' ? (latestVisit.alasan || anchor.alasanTidakMinat) : undefined,
    alasan: latestVisit.alasan || anchor.alasan,
    catatanSales: `[Riwayat ${allVisits.length}x Kunjungan Tergabung] ${latestVisit.catatanSales || ''}`,
    fotoProperti: resolvedPhoto,
    fotoRumahUrl: resolvedPhoto,
    isMerged: true,
    mergedAt: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
    analystDecision: 'merged_history',
    analystNote: analystNote || `Diverifikasi Analis: Digabungkan dari ${surveysToMerge.length} input spreading`,
    historyVisits: allVisits,
  };
}

/**
 * Storage key untuk keputusan spreading analis
 */
export const STORAGE_KEY_SPREADING_DECISIONS = 'aetra_gis_spreading_analyst_decisions_v2';
export const STORAGE_KEY_LAST_RAW_SIGNATURE = 'aetra_gis_last_raw_signature_v2';

export interface StoredMergedCluster {
  surveyIds: string[];
  noForms: string[];
  coordNames?: string[];
  canonicalSurveyId: string;
  analystNote?: string;
  mergedMaster: CustomerSurvey;
}

export interface SpreadingAnalystDecisionStore {
  mergedClusters: StoredMergedCluster[];
  separatePropertyIds: string[];
  separatePropertyNoForms: string[];
  separateCoordNames?: string[];
}

/**
 * Buat tanda tangan konten (signature) deterministik dari baris data input mentah pelanggan
 * Digunakan untuk memeriksa apakah data input (CSV/Excel/Google Sheet) identik
 */
export function computeCustomersContentSignature(customers: CustomerSurvey[]): string {
  if (!customers || customers.length === 0) return 'empty_0';
  const records = customers.map((c) => {
    const noForm = (c.noForm || '').trim().toLowerCase();
    const nama = (c.nama || '').trim().toLowerCase();
    const tel = (c.telepon || '').trim();
    const lat = typeof c.latitude === 'number' ? c.latitude.toFixed(5) : '0';
    const lng = typeof c.longitude === 'number' ? c.longitude.toFixed(5) : '0';
    const minat = c.statusMinat || '';
    const tgl = (c.tanggalSpreading || c.timestamp || '').trim();
    const sales = (c.salesNama || '').trim().toLowerCase();
    return `${noForm}#${nama}#${tel}#${lat}#${lng}#${minat}#${tgl}#${sales}`;
  });
  records.sort();
  return `${customers.length}__${records.join(';')}`;
}

/**
 * Ekstraksi tanda tangan konten (signature) dari data mentah asli pelanggan,
 * termasuk baris-baris kunjungan yang sebelumnya telah digabungkan (historyVisits) ke dalam master.
 * Fungsi ini memungkinkan perbandingan tepat antara data incoming (e.g. 12 rows)
 * dengan state customers saat ini yang sudah di-merge menjadi master (e.g. 11 rows).
 */
export function computeRawSurveysSignature(customers: CustomerSurvey[]): string {
  if (!customers || customers.length === 0) return 'empty_0';
  const records: string[] = [];

  for (const c of customers) {
    if (c.isMerged && c.historyVisits && c.historyVisits.length > 0) {
      for (const v of c.historyVisits) {
        const noForm = (v.noForm || '').trim().toLowerCase();
        const nama = (v.nama || '').trim().toLowerCase();
        const tel = (v.telepon || '').trim();
        const lat = v.coordinates ? v.coordinates[0]?.toFixed(5) : '0';
        const lng = v.coordinates ? v.coordinates[1]?.toFixed(5) : '0';
        const minat = v.statusMinat || '';
        const tgl = (v.tanggalSpreading || v.timestamp || '').trim();
        const sales = (v.salesNama || '').trim().toLowerCase();
        records.push(`${noForm}#${nama}#${tel}#${lat}#${lng}#${minat}#${tgl}#${sales}`);
      }
    } else {
      const noForm = (c.noForm || '').trim().toLowerCase();
      const nama = (c.nama || '').trim().toLowerCase();
      const tel = (c.telepon || '').trim();
      const lat = typeof c.latitude === 'number' ? c.latitude.toFixed(5) : '0';
      const lng = typeof c.longitude === 'number' ? c.longitude.toFixed(5) : '0';
      const minat = c.statusMinat || '';
      const tgl = (c.tanggalSpreading || c.timestamp || '').trim();
      const sales = (c.salesNama || '').trim().toLowerCase();
      records.push(`${noForm}#${nama}#${tel}#${lat}#${lng}#${minat}#${tgl}#${sales}`);
    }
  }

  records.sort();
  return `${records.length}__${records.join(';')}`;
}

/**
 * Cek apakah dataset mentah baru dari CSV, Excel, atau Google Sheets
 * BENAR-BENAR IDENTIK dengan data input saat ini (bahkan jika sebagian data sudah digabung oleh analis)
 */
export function isIncomingRawDataIdentical(
  incomingRaw: CustomerSurvey[],
  currentCustomers: CustomerSurvey[],
  storedRawSignature?: string | null
): boolean {
  if (!incomingRaw || incomingRaw.length === 0) return false;
  const incomingSig = computeCustomersContentSignature(incomingRaw);

  // 1. Cek terhadap signature raw tersimpan di storage/state
  if (storedRawSignature && incomingSig === storedRawSignature) {
    return true;
  }

  // 2. Cek terhadap signature raw yang diekstrak dari currentCustomers (termasuk historyVisits)
  if (currentCustomers && currentCustomers.length > 0) {
    const currentRawSig = computeRawSurveysSignature(currentCustomers);
    if (incomingSig === currentRawSig) {
      return true;
    }
  }

  return false;
}

/**
 * Cek apakah dua dataset pelanggan bernilai identik
 */
export function areCustomerDatasetsEqual(a: CustomerSurvey[], b: CustomerSurvey[]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return computeCustomersContentSignature(a) === computeCustomersContentSignature(b);
}

export function getSavedRawSignature(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_LAST_RAW_SIGNATURE);
  } catch {
    return null;
  }
}

export function saveRawSignature(sig: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_RAW_SIGNATURE, sig);
  } catch {
    // ignore
  }
}

/**
 * Ambil keputusan analis yang tersimpan secara lokal/IndexedDB
 */
export function loadSpreadingDecisions(): SpreadingAnalystDecisionStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SPREADING_DECISIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        mergedClusters: Array.isArray(parsed.mergedClusters) ? parsed.mergedClusters : [],
        separatePropertyIds: Array.isArray(parsed.separatePropertyIds) ? parsed.separatePropertyIds : [],
        separatePropertyNoForms: Array.isArray(parsed.separatePropertyNoForms) ? parsed.separatePropertyNoForms : [],
      };
    }
  } catch (err) {
    console.warn('Gagal memuat spreading decisions dari storage:', err);
  }
  return { mergedClusters: [], separatePropertyIds: [], separatePropertyNoForms: [] };
}

/**
 * Simpan keputusan spreading analis ke storage permanen
 */
export function saveSpreadingDecisions(store: SpreadingAnalystDecisionStore): void {
  try {
    localStorage.setItem(STORAGE_KEY_SPREADING_DECISIONS, JSON.stringify(store));
  } catch (err) {
    console.warn('Gagal menyimpan spreading decisions ke storage:', err);
  }
}

/**
 * Hapus atau reset seluruh keputusan spreading analis (misal saat pulihkan demo bawaan)
 */
export function clearSpreadingDecisions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_SPREADING_DECISIONS);
    localStorage.removeItem(STORAGE_KEY_LAST_RAW_SIGNATURE);
  } catch (err) {
    // ignore
  }
}

/**
 * Merekonsiliasi data pelanggan baru (dari sync link, CSV, atau Excel)
 * dengan keputusan Spreading Berulang yang telah diverifikasi oleh analis sebelumnya.
 * Menjamin spreading berulang TIDAK TER-RESET selama data input sama maupun saat update berkala.
 */
export function reconcileCustomersWithSpreadingDecisions(
  incoming: CustomerSurvey[],
  existingCustomers?: CustomerSurvey[]
): CustomerSurvey[] {
  if (!incoming || incoming.length === 0) return [];
  const store = loadSpreadingDecisions();

  // Ambil juga merged master yang sedang aktif di existingCustomers jika belum tersimpan di store
  if (existingCustomers && existingCustomers.length > 0) {
    existingCustomers.forEach((cust) => {
      if (cust.isMerged && cust.historyVisits && cust.historyVisits.length > 0) {
        const visitIds = cust.historyVisits.map((v) => v.visitId).filter(Boolean);
        const visitNoForms = cust.historyVisits.map((v) => (v.noForm || '').trim().toLowerCase()).filter(Boolean);
        const exists = store.mergedClusters.some(
          (mc) => mc.canonicalSurveyId === cust.id || mc.surveyIds.some((id) => visitIds.includes(id))
        );
        if (!exists) {
          store.mergedClusters.push({
            surveyIds: [cust.id, ...visitIds],
            noForms: [cust.noForm ? cust.noForm.trim().toLowerCase() : '', ...visitNoForms].filter(Boolean),
            canonicalSurveyId: cust.id,
            analystNote: cust.analystNote,
            mergedMaster: cust,
          });
        }
      } else if (cust.analystDecision === 'separate_property') {
        if (!store.separatePropertyIds.includes(cust.id)) {
          store.separatePropertyIds.push(cust.id);
        }
        if (cust.noForm && !store.separatePropertyNoForms.includes(cust.noForm.trim().toLowerCase())) {
          store.separatePropertyNoForms.push(cust.noForm.trim().toLowerCase());
        }
      }
    });
    saveSpreadingDecisions(store);
  }

  const mergedIdSet = new Set<string>();
  const mergedNoFormSet = new Set<string>();
  store.mergedClusters.forEach((mc) => {
    mc.surveyIds.forEach((id) => mergedIdSet.add(id));
    mc.noForms.forEach((nf) => mergedNoFormSet.add(nf.trim().toLowerCase()));
  });

  const separateIdSet = new Set<string>(store.separatePropertyIds);
  const separateNoFormSet = new Set<string>(store.separatePropertyNoForms.map((nf) => nf.trim().toLowerCase()));

  const result: CustomerSurvey[] = [];
  const handledIncomingIds = new Set<string>();

  // 1. Terapkan cluster merge yang ada
  for (const mc of store.mergedClusters) {
    const matchingSurveys = incoming.filter((item) => {
      const matchId = mc.surveyIds && mc.surveyIds.includes(item.id);
      const matchNoForm = Boolean(item.noForm && mc.noForms && mc.noForms.includes(item.noForm.trim().toLowerCase()));
      const itemCoordName = `${item.latitude?.toFixed(4)},${item.longitude?.toFixed(4)}__${(item.nama || '').trim().toLowerCase()}`;
      const matchCoordName = Boolean(mc.coordNames && mc.coordNames.includes(itemCoordName));
      return matchId || matchNoForm || matchCoordName;
    });

    if (matchingSurveys.length > 0) {
      matchingSurveys.forEach((s) => handledIncomingIds.add(s.id));
      const surveysToMerge = matchingSurveys.length >= 2 ? matchingSurveys : [mc.mergedMaster, ...matchingSurveys];
      const merged = mergeSurveysToPropertyHistory(
        surveysToMerge,
        mc.canonicalSurveyId || matchingSurveys[0].id,
        mc.analystNote
      );
      result.push(merged);
    } else {
      // Pertahankan master jika data master memang ada di database
      result.push(mc.mergedMaster);
    }
  }

  // 2. Masukkan sisa survei incoming yang bukan bagian dari klaster merge
  for (const item of incoming) {
    if (handledIncomingIds.has(item.id)) continue;
    const isPartOfMerge =
      mergedIdSet.has(item.id) ||
      (item.noForm && mergedNoFormSet.has(item.noForm.trim().toLowerCase()));
    if (isPartOfMerge) continue;

    const isSeparate =
      separateIdSet.has(item.id) ||
      (item.noForm && separateNoFormSet.has(item.noForm.trim().toLowerCase()));

    if (isSeparate) {
      result.push({
        ...item,
        isDuplicateCandidate: false,
        analystDecision: 'separate_property',
        analystNote: item.analystNote || 'Diverifikasi Analis: Rumah/objek fisik terpisah',
      });
    } else {
      result.push(item);
    }
  }

  return result;
}
