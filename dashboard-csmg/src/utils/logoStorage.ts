// Logo Resmi Aetra Air Tangerang (High Quality Vector SVG)
export const DEFAULT_AETRA_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 110" width="100%" height="100%">
  <!-- Teks Brand aetra -->
  <text x="10" y="72" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="74" fill="%23005baa" letter-spacing="-2.5">aetra</text>
  
  <!-- Sub-teks tangerang -->
  <text x="14" y="98" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="20" fill="%23005baa" letter-spacing="4.5">TANGERANG</text>

  <!-- Simbol Tetesan Air / Splash Aetra Khas Biru & Orange -->
  <g transform="translate(258, 4) scale(0.9)">
    <!-- Tetesan Biru Utama -->
    <path d="M42 2 C38 16 30 26 30 36 C30 46 36 52 42 52 C48 52 54 46 54 36 C54 26 46 16 42 2 Z" fill="%23005baa"/>
    <!-- Kilau Putih -->
    <path d="M42 12 C40 20 36 26 36 32 C36 36 39 40 42 40 C45 40 48 36 48 32 C48 26 44 20 42 12 Z" fill="%23ffffff" opacity="0.9"/>
    
    <!-- Percikan Lengkung Kiri Biru -->
    <path d="M38 72 C30 58 14 42 3 38 C1 37 4 32 8 33 C20 38 34 51 41 62 Z" fill="%23005baa"/>
    <!-- Percikan Lengkung Kanan Biru -->
    <path d="M46 72 C54 58 70 42 81 38 C83 37 80 32 76 33 C64 38 50 51 43 62 Z" fill="%23005baa"/>
    
    <!-- Sayap Lengkung Oranye Kiri -->
    <path d="M40 102 C40 102 34 85 24 70 C17 60 5 54 -4 47 C-7 44 -11 41 -12 38 C-13 36 -10 35 -7 39 C-3 46 0 54 7 57 C9 58 11 55 10 52 C7 46 4 37 3 32 C2 29 5 28 8 32 C14 41 18 51 25 56 C28 58 30 55 27 50 C24 43 20 36 18 30 C17 27 20 26 23 30 C29 40 34 50 36 61 C38 69 39 85 40 102 Z" fill="%23e46423"/>
    
    <!-- Sayap Lengkung Oranye Kanan -->
    <path d="M44 102 C44 102 50 85 60 70 C67 60 79 54 88 47 C91 44 95 41 96 38 C97 36 94 35 91 39 C87 46 84 54 77 57 C75 58 73 55 74 52 C77 46 80 37 81 32 C82 29 79 28 76 32 C70 41 66 51 59 56 C56 58 54 55 57 50 C60 43 64 36 66 30 C67 27 64 26 61 30 C55 40 50 50 48 61 C46 69 45 85 44 102 Z" fill="%23e46423"/>
  </g>
</svg>`;

const STORAGE_KEY = 'aetra_custom_logo_url_v2';
const HEIGHT_STORAGE_KEY = 'aetra_custom_logo_height_v2';

export function getCustomLogoUrl(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim()) {
      return stored;
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_AETRA_LOGO_SVG;
}

export function saveCustomLogoUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, url);
    window.dispatchEvent(new Event('aetra_logo_updated'));
  } catch (e) {
    console.warn('Gagal menyimpan logo ke localStorage:', e);
  }
}

export function resetCustomLogoUrl(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('aetra_logo_updated'));
  } catch (e) {
    // ignore
  }
}

export function getCustomLogoHeight(): number {
  try {
    const stored = localStorage.getItem(HEIGHT_STORAGE_KEY);
    if (stored) {
      const val = parseInt(stored, 10);
      if (!isNaN(val) && val >= 20 && val <= 80) {
        return val;
      }
    }
  } catch (e) {
    // ignore
  }
  return 34;
}

export function saveCustomLogoHeight(height: number): void {
  try {
    localStorage.setItem(HEIGHT_STORAGE_KEY, height.toString());
    window.dispatchEvent(new Event('aetra_logo_updated'));
  } catch (e) {
    // ignore
  }
}
