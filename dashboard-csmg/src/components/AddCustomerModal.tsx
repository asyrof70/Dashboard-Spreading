import React, { useState } from 'react';
import { CustomerSurvey, InterestStatus, PipeNetworkLayer, SalesRep, ZoneArea } from '../types/gis';
import { calculateDistanceToNearestPipeline } from '../utils/kmlParser';
import { X, UserPlus, MapPin, Check, Crosshair, Camera, Image as ImageIcon, Calendar, FileText } from 'lucide-react';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomer: (customer: CustomerSurvey) => void;
  zones: ZoneArea[];
  salesList: SalesRep[];
  pipeLayers: PipeNetworkLayer[];
  pickedCoordinates?: { lat: number; lng: number } | null;
  onStartPickCoordinate: () => void;
  theme?: 'light' | 'dark';
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onAddCustomer,
  zones,
  salesList,
  pipeLayers,
  pickedCoordinates,
  onStartPickCoordinate,
  theme = 'light',
}) => {
  const isLight = theme === 'light';

  // 17 AppSheet Form Fields
  const [timestamp, setTimestamp] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace('T', ' ');
  });
  const [salesId, setSalesId] = useState(salesList[0]?.id || 'SLS-01');
  const [nama, setNama] = useState('');
  const [telepon, setTelepon] = useState('');
  const [alamat, setAlamat] = useState('');
  const [blok, setBlok] = useState('');
  const [nomorRumah, setNomorRumah] = useState('');
  const [rt, setRt] = useState('');
  const [rw, setRw] = useState('');
  const [desa, setDesa] = useState('');
  const [kecamatan, setKecamatan] = useState(zones[0]?.kecamatan || 'Sepatan');
  const [latitude, setLatitude] = useState(pickedCoordinates?.lat?.toString() || '-6.1145');
  const [longitude, setLongitude] = useState(pickedCoordinates?.lng?.toString() || '106.5732');
  const [jenisAreaTarget, setJenisAreaTarget] = useState<'Adhoc' | 'CAPEX'>('Adhoc');
  const [statusMinat, setStatusMinat] = useState<InterestStatus>('Minat');
  const [alasanTidakMinat, setAlasanTidakMinat] = useState('');
  const [noForm, setNoForm] = useState(() => `FRM-AETRA-${Math.floor(1000 + Math.random() * 9000)}`);
  const [fotoProperti, setFotoProperti] = useState<string>('');
  const [fotoPreviewName, setFotoPreviewName] = useState<string>('');

  // Update if pickedCoordinates changes from map click
  React.useEffect(() => {
    if (pickedCoordinates) {
      setLatitude(pickedCoordinates.lat.toFixed(6));
      setLongitude(pickedCoordinates.lng.toFixed(6));
    }
  }, [pickedCoordinates]);

  if (!isOpen) return null;

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoPreviewName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoProperti(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Get current device GPS location
  const handleGetDeviceLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(6));
          setLongitude(pos.coords.longitude.toFixed(6));
        },
        (err) => {
          alert('Gagal mengambil GPS HP: ' + err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert('Perangkat Anda tidak mendukung fitur Geolocation GPS.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !alamat.trim()) {
      alert('Nama Calon Pelanggan dan Alamat wajib diisi.');
      return;
    }

    const latNum = parseFloat(latitude) || -6.1145;
    const lngNum = parseFloat(longitude) || 106.5732;

    const selectedSales = salesList.find((s) => s.id === salesId) || salesList[0];
    const selectedZona = zones.find((z) => z.kecamatan.toLowerCase() === kecamatan.toLowerCase()) || zones[0];

    // Hitung jarak ke pipa terdekat
    const collections = pipeLayers.map((l) => l.geoJsonData);
    const calculatedDist = calculateDistanceToNearestPipeline(latNum, lngNum, collections);

    const fullAddress = `${alamat.trim()}${blok ? `, Blok ${blok.trim()}` : ''}${
      nomorRumah ? ` No. ${nomorRumah.trim()}` : ''
    }${rt || rw ? `, RT ${rt || '-'}/RW ${rw || '-'}` : ''}${desa ? `, Desa ${desa.trim()}` : ''}${
      kecamatan ? `, Kec. ${kecamatan.trim()}` : ''
    }`;

    const newCustomer: CustomerSurvey = {
      id: `CUST-${Date.now().toString().slice(-4)}`,
      timestamp,
      nama: nama.trim(),
      telepon: telepon.trim() || '0812-0000-0000',
      alamat: fullAddress,
      blok: blok.trim() || undefined,
      nomorRumah: nomorRumah.trim() || undefined,
      rt: rt.trim() || undefined,
      rw: rw.trim() || undefined,
      desa: desa.trim() || undefined,
      kecamatan: kecamatan.trim() || undefined,
      latitude: latNum,
      longitude: lngNum,
      jenisAreaTarget,
      statusMinat,
      alasanTidakMinat: statusMinat === 'Tidak Minat' ? alasanTidakMinat.trim() || undefined : undefined,
      noForm: noForm.trim() || undefined,
      fotoProperti: fotoProperti || undefined,
      fotoRumahUrl: fotoProperti || undefined,

      salesId: selectedSales.id,
      salesNama: selectedSales.nama,
      zonaId: selectedZona.id,
      zonaNama: selectedZona.nama,
      tanggalSpreading: timestamp.slice(0, 10),
      jarakKePipaMeter: calculatedDist,
      catatanSales: `[Form AppSheet: ${noForm}] Area: ${jenisAreaTarget}. ${
        statusMinat === 'Tidak Minat' && alasanTidakMinat ? `Alasan: ${alasanTidakMinat}` : ''
      }`,
    };

    onAddCustomer(newCustomer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div
        className={`${
          isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900 text-slate-100 border-slate-800'
        } border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          } flex items-center justify-between`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isLight ? 'bg-[#005baa]/10 text-[#005baa]' : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-extrabold text-sm sm:text-base ${isLight ? 'text-[#005baa]' : 'text-slate-100'}`}>
                  Input Survei Lapangan (AppSheet Form)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#e46423] text-white">
                  17 Field Sync
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>
                Entri data spreading sales langsung terhubung ke database GIS Aetra Air Tangerang
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs max-h-[78vh] overflow-y-auto">
          {/* Section 1: Metadata Form & Sales */}
          <div
            className={`p-3 rounded-xl border ${
              isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'
            } grid grid-cols-1 sm:grid-cols-3 gap-3`}
          >
            {/* 1. Timestamp */}
            <div>
              <label className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} block mb-1 flex items-center gap-1`}>
                <Calendar className="w-3.5 h-3.5 text-[#005baa]" />
                <span>Timestamp *</span>
              </label>
              <input
                type="text"
                required
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className={`w-full ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                } border rounded-lg px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-[#005baa]`}
              />
            </div>

            {/* 2. Nama Sales */}
            <div>
              <label className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} block mb-1`}>
                Nama Sales *
              </label>
              <select
                value={salesId}
                onChange={(e) => setSalesId(e.target.value)}
                className={`w-full ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                } border rounded-lg px-2.5 py-1.5 font-semibold text-xs focus:outline-none focus:border-[#005baa] cursor-pointer`}
              >
                {salesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama} ({s.nip})
                  </option>
                ))}
              </select>
            </div>

            {/* 16. No. Form */}
            <div>
              <label className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} block mb-1 flex items-center gap-1`}>
                <FileText className="w-3.5 h-3.5 text-[#e46423]" />
                <span>No. Form *</span>
              </label>
              <input
                type="text"
                required
                value={noForm}
                onChange={(e) => setNoForm(e.target.value)}
                className={`w-full ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                } border rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs focus:outline-none focus:border-[#005baa]`}
              />
            </div>
          </div>

          {/* Section 2: Data Pelanggan */}
          <div className="space-y-3">
            <h4 className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-[#005baa]' : 'text-sky-400'}`}>
              Identitas Calon Pelanggan &amp; Kontak
            </h4>

            {/* 3. Nama Calon Pelanggan & 4. No Telepon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} block mb-1`}>
                  Nama Calon Pelanggan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bpk. H. Syarifudin"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className={`w-full ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                  } border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#005baa]`}
                />
              </div>

              <div>
                <label className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} block mb-1`}>
                  No Telepon / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 0812-8899-2211"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  className={`w-full ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                  } border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#005baa]`}
                />
              </div>
            </div>

            {/* 5. Alamat Utama */}
            <div>
              <label className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} block mb-1`}>
                Alamat (Nama Jalan / Nama Komplek Perumahan) *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Jl. Raya Mauk KM 4, Perumahan Mutiara Garuda"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                className={`w-full ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                } border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#005baa]`}
              />
            </div>

            {/* 6. Blok, 7. No, 8. RT, 9. RW */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} block mb-1`}>
                  Blok
                </label>
                <input
                  type="text"
                  placeholder="Contoh: B3"
                  value={blok}
                  onChange={(e) => setBlok(e.target.value)}
                  className={`w-full ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                  } border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#005baa]`}
                />
              </div>
              <div>
                <label className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} block mb-1`}>
                  No (Nomor Rumah)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 12A"
                  value={nomorRumah}
                  onChange={(e) => setNomorRumah(e.target.value)}
                  className={`w-full ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                  } border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#005baa]`}
                />
              </div>
              <div>
                <label className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} block mb-1`}>
                  RT
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 04"
                  value={rt}
                  onChange={(e) => setRt(e.target.value)}
                  className={`w-full ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                  } border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#005baa]`}
                />
              </div>
              <div>
                <label className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} block mb-1`}>
                  RW
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 02"
                  value={rw}
                  onChange={(e) => setRw(e.target.value)}
                  className={`w-full ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                  } border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#005baa]`}
                />
              </div>
            </div>

            {/* 10. Desa & 11. Kecamatan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} block mb-1`}>
                  Desa / Kelurahan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Desa Sarakan / Sukamantri"
                  value={desa}
                  onChange={(e) => setDesa(e.target.value)}
                  className={`w-full ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                  } border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#005baa]`}
                />
              </div>
              <div>
                <label className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} block mb-1`}>
                  Kecamatan
                </label>
                <select
                  value={kecamatan}
                  onChange={(e) => setKecamatan(e.target.value)}
                  className={`w-full ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                  } border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#005baa] cursor-pointer`}
                >
                  <option value="Sepatan">Sepatan</option>
                  <option value="Sepatan Timur">Sepatan Timur</option>
                  <option value="Pasar Kemis">Pasar Kemis</option>
                  <option value="Balaraja">Balaraja</option>
                  <option value="Cikupa">Cikupa</option>
                  <option value="Curug">Curug</option>
                  <option value="Sindang Jaya">Sindang Jaya</option>
                  <option value="Rajeg">Rajeg</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Koordinat Properti (12) */}
          <div
            className={`p-3.5 rounded-xl border ${
              isLight ? 'bg-sky-50/70 border-sky-200' : 'bg-slate-950 border-slate-800'
            } space-y-2`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`font-bold ${isLight ? 'text-[#005baa]' : 'text-slate-200'} flex items-center gap-1.5`}>
                <MapPin className="w-4 h-4 text-[#005baa]" />
                <span>12. Koordinat Properti (Latitude / Lintang &amp; Longitude / Bujur)</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onStartPickCoordinate}
                  className="px-2.5 py-1 rounded-lg bg-[#005baa] hover:bg-[#004b8d] text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition"
                  title="Klik lokasi rumah langsung di atas peta satelit Google"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Pilih dari Peta GIS</span>
                </button>
                <button
                  type="button"
                  onClick={handleGetDeviceLocation}
                  className={`px-2.5 py-1 rounded-lg ${
                    isLight ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  } border font-semibold text-[11px] transition`}
                  title="Ambil titik presisi dari sensor GPS HP sales"
                >
                  GPS HP
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <span className={`text-[10px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'} block mb-0.5`}>
                  Latitude (Lintang) *
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className={`w-full ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                  } border rounded px-2.5 py-1 text-xs font-mono font-bold`}
                />
              </div>
              <div>
                <span className={`text-[10px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'} block mb-0.5`}>
                  Longitude (Bujur) *
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className={`w-full ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                  } border rounded px-2.5 py-1 text-xs font-mono font-bold`}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Jenis Area & Minat (13, 14, 15) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 13. Jenis Area Target */}
            <div>
              <label className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} block mb-1`}>
                13. Jenis Area Target *
              </label>
              <select
                value={jenisAreaTarget}
                onChange={(e) => setJenisAreaTarget(e.target.value as 'Adhoc' | 'CAPEX')}
                className={`w-full ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                } border rounded-lg px-3 py-1.5 font-bold text-xs focus:outline-none focus:border-[#005baa] cursor-pointer`}
              >
                <option value="Adhoc">Adhoc (Permintaan Langsung / Eksisting)</option>
                <option value="CAPEX">CAPEX (Area Proyek Pengembangan Jaringan Baru)</option>
              </select>
            </div>

            {/* 14. Status minat pelanggan */}
            <div>
              <label className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} block mb-1`}>
                14. Status Minat Pelanggan *
              </label>
              <select
                value={statusMinat}
                onChange={(e) => setStatusMinat(e.target.value as InterestStatus)}
                className={`w-full ${
                  statusMinat === 'Minat'
                    ? isLight
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-400 font-bold'
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-700 font-bold'
                    : isLight
                    ? 'bg-rose-50 text-rose-800 border-rose-400 font-bold'
                    : 'bg-rose-950/80 text-rose-300 border-rose-700 font-bold'
                } border rounded-lg px-3 py-1.5 text-xs focus:outline-none cursor-pointer`}
              >
                <option value="Minat">Minat (Peminat Sambungan Baru)</option>
                <option value="Tidak Minat">Tidak Minat (Menolak Sambungan)</option>
              </select>
            </div>
          </div>

          {/* 15. Alasan tidak minat (Muncul jika Tidak Minat - Tidak Wajib) */}
          {statusMinat === 'Tidak Minat' && (
            <div className={`p-3 rounded-xl border ${isLight ? 'bg-rose-50/60 border-rose-200' : 'bg-rose-950/30 border-rose-800/60'}`}>
              <label className={`text-[11px] font-bold ${isLight ? 'text-rose-900' : 'text-rose-300'} block mb-1`}>
                15. Alasan Tidak Minat <span className="font-normal text-[10px] text-slate-500">(Tidak wajib diisi)</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Air sumur masih jernih / merasa tarif bulanan tinggi..."
                value={alasanTidakMinat}
                onChange={(e) => setAlasanTidakMinat(e.target.value)}
                className={`w-full ${
                  isLight ? 'bg-white border-rose-300 text-slate-800' : 'bg-slate-900 border-rose-800 text-slate-200'
                } border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-rose-500`}
              />
            </div>
          )}

          {/* Section 5: Foto Properti (17) */}
          <div
            className={`p-3 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            } space-y-2`}
          >
            <label className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} block flex items-center gap-1.5`}>
              <Camera className="w-4 h-4 text-[#005baa]" />
              <span>17. Foto (Foto Properti Calon Pelanggan)</span>
            </label>

            <div className="flex items-center gap-3">
              <label
                className={`cursor-pointer px-3 py-1.5 rounded-lg ${
                  isLight ? 'bg-[#005baa]/10 hover:bg-[#005baa]/20 text-[#005baa] border-blue-200' : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border-slate-700'
                } border font-bold text-xs flex items-center gap-1.5 transition`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Pilih / Upload Foto</span>
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
              </label>
              <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'} truncate`}>
                {fotoPreviewName || 'Belum ada foto yang dipilih (opsional)'}
              </span>
            </div>

            {fotoProperti && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={fotoProperti}
                  alt="Preview Properti"
                  className="w-20 h-20 object-cover rounded-lg border border-slate-300 shadow-sm"
                />
                <div className="text-[11px] text-slate-500">
                  <div className="font-semibold text-emerald-600">✓ Foto berhasil dimuat</div>
                  <div>Foto tersinkron dengan record survei AppSheet</div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div
            className={`pt-3 flex items-center justify-end gap-2 border-t ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-semibold text-xs ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              } transition`}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#005baa] hover:bg-[#004b8d] text-white font-bold rounded-lg text-xs shadow-md shadow-[#005baa]/20 transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Simpan &amp; Plot ke Peta GIS</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
