import React, { useState, useEffect } from 'react';
import {
  getCustomLogoUrl,
  getCustomLogoHeight,
  isLogoRemoved,
  DEFAULT_AETRA_LOGO_SVG,
} from '../utils/logoStorage';

interface AetraLogoProps {
  className?: string;
  customHeight?: number;
  showBadge?: boolean;
  onClick?: () => void;
  showFallbackIfEmpty?: boolean;
}

export const AetraLogo: React.FC<AetraLogoProps> = ({
  className = '',
  customHeight,
  showBadge = false,
  onClick,
  showFallbackIfEmpty = false,
}) => {
  const [logoUrl, setLogoUrl] = useState<string>(() => getCustomLogoUrl());
  const [height, setHeight] = useState<number>(() => customHeight || getCustomLogoHeight());
  const [removed, setRemoved] = useState<boolean>(() => isLogoRemoved());

  useEffect(() => {
    const handleUpdate = () => {
      setLogoUrl(getCustomLogoUrl());
      setRemoved(isLogoRemoved());
      if (!customHeight) {
        setHeight(getCustomLogoHeight());
      }
    };

    window.addEventListener('aetra_logo_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('aetra_logo_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [customHeight]);

  // Jika logo dihapus pengguna dan tidak diminta fallback paksa
  if (removed && !showFallbackIfEmpty && !logoUrl) {
    return null;
  }

  const activeSrc = logoUrl || (showFallbackIfEmpty ? DEFAULT_AETRA_LOGO_SVG : '');
  if (!activeSrc && !showFallbackIfEmpty) return null;

  const currentHeight = customHeight || height;

  // Jika menggunakan logo default contoh bawaan Aetra: render vector SVG murni secara inline
  // Sangat andal, 0ms render, tajam di semua layar dan anti hilang saat reload / refresh
  const isDefaultVector = !activeSrc || activeSrc === DEFAULT_AETRA_LOGO_SVG;

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center justify-center select-none shrink-0 ${
        onClick ? 'cursor-pointer hover:opacity-90 transition' : ''
      } ${
        showBadge
          ? 'bg-white px-2.5 py-1 rounded-xl shadow-xs border border-slate-200/80'
          : ''
      }`}
    >
      {isDefaultVector ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 420 110"
          style={{
            height: `${currentHeight}px`,
            width: 'auto',
            maxHeight: '70px',
            display: 'block',
          }}
          className={`object-contain ${className}`}
          aria-label="Logo Aetra Air Tangerang"
        >
          {/* Teks Brand aetra */}
          <text
            x="10"
            y="72"
            fontFamily="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="900"
            fontSize="74"
            fill="#005baa"
            letterSpacing="-2.5"
          >
            aetra
          </text>
          
          {/* Sub-teks tangerang */}
          <text
            x="14"
            y="98"
            fontFamily="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="700"
            fontSize="20"
            fill="#005baa"
            letterSpacing="4.5"
          >
            TANGERANG
          </text>

          {/* Simbol Tetesan Air / Splash Aetra Khas Biru & Orange */}
          <g transform="translate(258, 4) scale(0.9)">
            {/* Tetesan Biru Utama */}
            <path d="M42 2 C38 16 30 26 30 36 C30 46 36 52 42 52 C48 52 54 46 54 36 C54 26 46 16 42 2 Z" fill="#005baa" />
            {/* Kilau Putih */}
            <path d="M42 12 C40 20 36 26 36 32 C36 36 39 40 42 40 C45 40 48 36 48 32 C48 26 44 20 42 12 Z" fill="#ffffff" opacity="0.9" />
            {/* Percikan Lengkung Kiri Biru */}
            <path d="M38 72 C30 58 14 42 3 38 C1 37 4 32 8 33 C20 38 34 51 41 62 Z" fill="#005baa" />
            {/* Percikan Lengkung Kanan Biru */}
            <path d="M46 72 C54 58 70 42 81 38 C83 37 80 32 76 33 C64 38 50 51 43 62 Z" fill="#005baa" />
            {/* Sayap Lengkung Oranye Kiri */}
            <path d="M40 102 C40 102 34 85 24 70 C17 60 5 54 -4 47 C-7 44 -11 41 -12 38 C-13 36 -10 35 -7 39 C-3 46 0 54 7 57 C9 58 11 55 10 52 C7 46 4 37 3 32 C2 29 5 28 8 32 C14 41 18 51 25 56 C28 58 30 55 27 50 C24 43 20 36 18 30 C17 27 20 26 23 30 C29 40 34 50 36 61 C38 69 39 85 40 102 Z" fill="#e46423" />
            {/* Sayap Lengkung Oranye Kanan */}
            <path d="M44 102 C44 102 50 85 60 70 C67 60 79 54 88 47 C91 44 95 41 96 38 C97 36 94 35 91 39 C87 46 84 54 77 57 C75 58 73 55 74 52 C77 46 80 37 81 32 C82 29 79 28 76 32 C70 41 66 51 59 56 C56 58 54 55 57 50 C60 43 64 36 66 30 C67 27 64 26 61 30 C55 40 50 50 48 61 C46 69 45 85 44 102 Z" fill="#e46423" />
          </g>
        </svg>
      ) : (
        <img
          src={activeSrc}
          alt="Logo Aetra Air Tangerang"
          style={{
            height: `${currentHeight}px`,
            width: 'auto',
            maxHeight: '70px',
            display: 'block',
          }}
          className={`object-contain ${className}`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== DEFAULT_AETRA_LOGO_SVG) {
              target.src = DEFAULT_AETRA_LOGO_SVG;
            }
          }}
        />
      )}
    </div>
  );
};

export default AetraLogo;

