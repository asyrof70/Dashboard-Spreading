import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Table as TableIcon, GripVertical, RotateCcw } from 'lucide-react';

interface DraggableFloatingSwitcherProps {
  activeTab: 'map' | 'table';
  onTabChange: (tab: 'map' | 'table') => void;
  customerCount: number;
  theme?: 'light' | 'dark';
}

export const DraggableFloatingSwitcher: React.FC<DraggableFloatingSwitcherProps> = ({
  activeTab,
  onTabChange,
  customerCount,
  theme = 'light',
}) => {
  // State posisi dalam pixel (null = default center-bottom)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const hasMovedRef = useRef<boolean>(false);

  // Inisialisasi posisi default di tengah bawah saat mount
  useEffect(() => {
    const updateDefaultPos = () => {
      if (!elementRef.current) return;
      const rect = elementRef.current.getBoundingClientRect();
      const defaultX = Math.max(16, (window.innerWidth - rect.width) / 2);
      const defaultY = Math.max(16, window.innerHeight - rect.height - 24);
      
      // Hanya set jika belum pernah digeser pengguna
      setPosition((prev) => prev ?? { x: defaultX, y: defaultY });
    };

    updateDefaultPos();
    window.addEventListener('resize', updateDefaultPos);
    return () => window.removeEventListener('resize', updateDefaultPos);
  }, []);

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Hanya klik kiri
    if (!elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position ? position.x : rect.left,
      initialY: position ? position.y : rect.top,
    };
    hasMovedRef.current = false;
    setIsDragging(true);
    e.preventDefault();
  };

  // Touch Drag Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!elementRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = elementRef.current.getBoundingClientRect();
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialX: position ? position.x : rect.left,
      initialY: position ? position.y : rect.top,
    };
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current || !elementRef.current) return;

      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasMovedRef.current = true;
      }

      const rect = elementRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 12;
      const maxY = window.innerHeight - rect.height - 12;

      const nextX = Math.min(Math.max(12, dragStartRef.current.initialX + deltaX), maxX);
      const nextY = Math.min(Math.max(60, dragStartRef.current.initialY + deltaY), maxY);

      setPosition({ x: nextX, y: nextY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !dragStartRef.current || !elementRef.current || e.touches.length !== 1) return;
      const touch = e.touches[0];

      const deltaX = touch.clientX - dragStartRef.current.startX;
      const deltaY = touch.clientY - dragStartRef.current.startY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasMovedRef.current = true;
      }

      const rect = elementRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 12;
      const maxY = window.innerHeight - rect.height - 12;

      const nextX = Math.min(Math.max(12, dragStartRef.current.initialX + deltaX), maxX);
      const nextY = Math.min(Math.max(60, dragStartRef.current.initialY + deltaY), maxY);

      setPosition({ x: nextX, y: nextY });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
      window.addEventListener('touchcancel', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
      window.removeEventListener('touchcancel', handleDragEnd);
    };
  }, [isDragging]);

  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!elementRef.current) return;
    const rect = elementRef.current.getBoundingClientRect();
    const defaultX = Math.max(16, (window.innerWidth - rect.width) / 2);
    const defaultY = Math.max(16, window.innerHeight - rect.height - 24);
    setPosition({ x: defaultX, y: defaultY });
  };

  const handleTabClick = (tab: 'map' | 'table') => {
    if (hasMovedRef.current) {
      // Abaikan klik jika baru selesai drag
      return;
    }
    onTabChange(tab);
  };

  const isLight = theme === 'light';

  return (
    <div
      ref={elementRef}
      style={{
        position: 'fixed',
        left: position ? `${position.x}px` : '50%',
        top: position ? `${position.y}px` : 'auto',
        bottom: position ? 'auto' : '24px',
        transform: position ? 'none' : 'translateX(-50%)',
        zIndex: 25,
        touchAction: 'none',
      }}
      className={`select-none flex items-center gap-1.5 ${
        isLight
          ? `bg-white/95 backdrop-blur-md border ${
              isDragging ? 'border-[#005baa] ring-2 ring-[#005baa]/30 shadow-lg' : 'border-slate-200 shadow-xl'
            } text-slate-800`
          : `bg-slate-950/95 backdrop-blur-md border ${
              isDragging ? 'border-sky-400 shadow-sky-500/20 ring-2 ring-sky-500/30' : 'border-slate-700/80'
            } text-slate-100 shadow-2xl`
      } p-1.5 rounded-2xl text-xs font-semibold transition-shadow`}
    >
      {/* Drag Handle Grip */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`flex items-center justify-center pl-1 pr-0.5 py-1 ${
          isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-500 hover:text-slate-200'
        } cursor-grab active:cursor-grabbing transition`}
        title="Geser posisi tombol ke mana saja agar tidak menutupi legenda atau peta"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Button: Peta Satelit GIS */}
      <button
        type="button"
        onClick={() => handleTabClick('map')}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
          activeTab === 'map'
            ? isLight
              ? 'bg-[#005baa] text-white shadow-md font-bold'
              : 'bg-sky-500 text-white shadow-md font-bold'
            : isLight
            ? 'text-slate-600 hover:text-[#005baa] hover:bg-sky-50'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
        }`}
      >
        <MapPin className="w-3.5 h-3.5" />
        <span>Peta Satelit GIS</span>
      </button>

      {/* Button: Tabel Data Pelanggan */}
      <button
        type="button"
        onClick={() => handleTabClick('table')}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
          activeTab === 'table'
            ? isLight
              ? 'bg-[#005baa] text-white shadow-md font-bold'
              : 'bg-sky-500 text-white shadow-md font-bold'
            : isLight
            ? 'text-slate-600 hover:text-[#005baa] hover:bg-sky-50'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
        }`}
      >
        <TableIcon className="w-3.5 h-3.5" />
        <span>Tabel Data Pelanggan ({customerCount})</span>
      </button>

      {/* Reset Position (Tampil jika sudah digeser) */}
      {position && (
        <button
          type="button"
          onClick={handleResetPosition}
          className={`p-1 rounded-lg ${
            isLight
              ? 'text-slate-400 hover:text-[#e46423] hover:bg-orange-50'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/80'
          } transition`}
          title="Kembalikan tombol ke posisi tengah bawah"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
