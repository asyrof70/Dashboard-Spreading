import React, { useState, useEffect } from 'react';
import { getCustomLogoUrl, getCustomLogoHeight, DEFAULT_AETRA_LOGO_SVG } from '../utils/logoStorage';

interface AetraLogoProps {
  className?: string;
  customHeight?: number;
  showBadge?: boolean;
  onClick?: () => void;
}

export const AetraLogo: React.FC<AetraLogoProps> = ({
  className = '',
  customHeight,
  showBadge = false,
  onClick,
}) => {
  const [logoUrl, setLogoUrl] = useState<string>(() => getCustomLogoUrl());
  const [height, setHeight] = useState<number>(() => customHeight || getCustomLogoHeight());

  useEffect(() => {
    const handleUpdate = () => {
      setLogoUrl(getCustomLogoUrl());
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

  const currentHeight = customHeight || height;

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
      <img
        src={logoUrl || DEFAULT_AETRA_LOGO_SVG}
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
    </div>
  );
};

export default AetraLogo;
