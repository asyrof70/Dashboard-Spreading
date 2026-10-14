import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Table as TableIcon,
  Download,
  Layers,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Info,
} from 'lucide-react';

interface AttributeTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  layerName: string;
  geoJsonData: GeoJSON.FeatureCollection | null;
  theme?: 'light' | 'dark';
}

export const AttributeTableModal: React.FC<AttributeTableModalProps> = ({
  isOpen,
  onClose,
  layerName,
  geoJsonData,
  theme = 'light',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const isLight = theme === 'light';

  // 1. Ekstraksi semua kolom atribut dari seluruh feature
  const { allColumns, rows, geometryTypes } = useMemo(() => {
    if (!geoJsonData || !Array.isArray(geoJsonData.features) || geoJsonData.features.length === 0) {
      return { allColumns: [], rows: [], geometryTypes: [] };
    }

    const colSet = new Set<string>();
    const geomSet = new Set<string>();

    geoJsonData.features.forEach((f) => {
      if (f.geometry?.type) {
        geomSet.add(f.geometry.type);
      }
      if (f.properties) {
        Object.keys(f.properties).forEach((k) => {
          if (k !== 'layerType') {
            colSet.add(k);
          }
        });
      }
    });

    const cols = Array.from(colSet).sort((a, b) => a.localeCompare(b));

    const featureRows = geoJsonData.features.map((f, idx) => {
      const props = f.properties || {};
      const rowData: Record<string, any> = { _fid: idx + 1, _geomType: f.geometry?.type || 'Unknown' };
      cols.forEach((col) => {
        rowData[col] = props[col] !== undefined && props[col] !== null ? props[col] : '';
      });
      return rowData;
    });

    return {
      allColumns: cols,
      rows: featureRows,
      geometryTypes: Array.from(geomSet),
    };
  }, [geoJsonData]);

  // 2. Filter & Sort rows
  const filteredAndSortedRows = useMemo(() => {
    let result = rows;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(term)
        )
      );
    }

    if (sortColumn) {
      result = [...result].sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return result;
  }, [rows, searchTerm, sortColumn, sortDirection]);

  // 3. Pagination
  const totalPages = Math.ceil(filteredAndSortedRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedRows.slice(start, start + rowsPerPage);
  }, [filteredAndSortedRows, currentPage, rowsPerPage]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    if (rows.length === 0 || allColumns.length === 0) return;
    const header = ['FID', 'TIPE_GEOMETRI', ...allColumns].join(',');
    const csvRows = filteredAndSortedRows.map((r) => {
      const line = [
        r._fid,
        r._geomType,
        ...allColumns.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`),
      ];
      return line.join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent([header, ...csvRows].join('\n'));
    const link = document.createElement('a');
    link.href = csvContent;
    link.download = `tabel_atribut_${layerName.toLowerCase().replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 overflow-hidden">
      <div
        className={`${
          isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900 text-slate-100 border-slate-800'
        } border rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
      >
        {/* Header */}
        <div
          className={`px-5 py-3.5 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-slate-800'
          } flex items-center justify-between shrink-0`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-[#005baa]/10 text-[#005baa] dark:text-sky-400 shrink-0">
              <TableIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight truncate">
                  Tabel Atribut: {layerName}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-[#005baa]/15 text-[#005baa] dark:text-sky-300">
                  {geometryTypes.join(', ') || 'Geometri Spasial'}
                </span>
              </div>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'} truncate`}>
                Menampilkan seluruh kolom & baris data dari file yang diunggah ({rows.length} total baris, {allColumns.length} kolom terdeteksi)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-[#005baa] border-blue-200 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-750 text-sky-300 border-slate-700'
              }`}
              title="Unduh Tabel Atribut sebagai file CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition ${
                isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Pencarian & Info */}
        <div
          className={`px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 ${
            isLight ? 'bg-slate-100/60 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nilai atribut di seluruh kolom..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-[#005baa] ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              />
            </div>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
              Tampil <strong className="text-[#005baa] dark:text-sky-400">{filteredAndSortedRows.length}</strong> dari {rows.length} baris
            </span>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Baris:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={`px-1.5 py-0.5 rounded border text-[11px] font-bold ${
                  isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                }`}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Body Table Container */}
        <div className="flex-1 overflow-auto scrollbar-thin">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Info className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
              <div className="font-bold text-sm">Tidak Ada Data Atribut Ditemukan</div>
              <div className="text-xs">File layer ini tidak memuat tabel atribut atau fitur spasial.</div>
            </div>
          ) : allColumns.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Info className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
              <div className="font-bold text-sm">Objek Geometri Terdeteksi Tanpa Kolom Atribut Tambahan</div>
              <div className="text-xs">
                Terdapat {rows.length} geometri ({geometryTypes.join(', ')}), namun tidak ada properti non-spasial di dalam file.
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead
                className={`sticky top-0 z-10 font-bold uppercase tracking-wider text-[10.5px] border-b ${
                  isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}
              >
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 w-12 text-center">FID</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 w-24">Tipe Geometri</th>
                  {allColumns.map((col) => {
                    const isSorted = sortColumn === col;
                    return (
                      <th
                        key={col}
                        onClick={() => handleSort(col)}
                        className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-800 transition select-none"
                      >
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="truncate">{col}</span>
                          <span className="text-[10px] text-slate-400">
                            {isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11px]">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={allColumns.length + 2} className="py-8 text-center text-slate-400">
                      Tidak ada baris yang sesuai dengan kata kunci "{searchTerm}".
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr
                      key={row._fid}
                      className={`transition ${
                        isLight ? 'hover:bg-sky-50/60' : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800 text-center font-bold text-slate-400">
                        {row._fid}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800 font-sans text-[10px] text-slate-500 dark:text-slate-400">
                        {row._geomType}
                      </td>
                      {allColumns.map((col) => {
                        const val = row[col];
                        return (
                          <td
                            key={col}
                            className={`py-2 px-3 border-r border-slate-100 dark:border-slate-800 max-w-[240px] truncate ${
                              val === '' || val === null || val === undefined
                                ? 'text-slate-300 dark:text-slate-600 italic'
                                : isLight
                                ? 'text-slate-800'
                                : 'text-slate-200'
                            }`}
                            title={String(val ?? '')}
                          >
                            {val !== '' && val !== null && val !== undefined ? String(val) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Pagination */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between text-xs shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950/90 border-slate-800 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px]">
            <span>Halaman {currentPage} dari {totalPages}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={`p-1.5 rounded-lg border text-xs font-bold transition disabled:opacity-30 disabled:cursor-not-allowed ${
                isLight ? 'bg-white hover:bg-slate-100 border-slate-300' : 'bg-slate-900 hover:bg-slate-800 border-slate-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono font-bold text-[#005baa] dark:text-sky-400">{currentPage}</span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={`p-1.5 rounded-lg border text-xs font-bold transition disabled:opacity-30 disabled:cursor-not-allowed ${
                isLight ? 'bg-white hover:bg-slate-100 border-slate-300' : 'bg-slate-900 hover:bg-slate-800 border-slate-700'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
