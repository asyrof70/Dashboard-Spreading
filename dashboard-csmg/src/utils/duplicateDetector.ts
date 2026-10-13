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
      const count = cluster ? cluster.surveys.length : 2;
      return {
        ...c,
        isDuplicateCandidate: true,
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
