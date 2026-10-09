import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // CORS Middleware for API routes
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Server-side Proxy for Google Spreadsheet to bypass browser CORS & authentication redirects
  // Uses real-time Google Visualization (gviz) query first to bypass Google's stale export cache
  app.get('/api/proxy-sheet', async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).json({ error: 'Parameter url diperlukan.' });
      }

      // Always set anti-caching headers so client/proxies never serve stale sheet data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      let cleanUrl = targetUrl.trim();
      let spreadsheetId = '';
      let gidParam = '';

      // Check for published web link (/spreadsheets/d/e/2PACX-.../)
      const pubMatch = cleanUrl.match(/\/spreadsheets\/d\/e\/(2PACX-[a-zA-Z0-9-_]+)/);
      // Standard spreadsheet ID (panjang minimal 20 karakter, hindari /d/e/)
      const standardMatch = cleanUrl.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9-_]{20,})/);

      const gidMatch = cleanUrl.match(/[#&?]gid=([0-9]+)/);
      if (gidMatch && gidMatch[1]) {
        gidParam = `&gid=${gidMatch[1]}`;
      }

      if (standardMatch && standardMatch[1]) {
        spreadsheetId = standardMatch[1];
      }

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/csv, text/plain, */*',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
      };

      let text = '';
      let isPrivate = false;

      // STRATEGI UTAMA 1: Jika link berupa publikasi web (/spreadsheets/d/e/...)
      if (pubMatch && pubMatch[1]) {
        const pubCsvUrl = `https://docs.google.com/spreadsheets/d/e/${pubMatch[1]}/pub?output=csv${gidParam}&_t=${Date.now()}`;
        try {
          const pubRes = await fetch(pubCsvUrl, { method: 'GET', redirect: 'follow', headers });
          if (pubRes.ok) {
            const candidate = await pubRes.text();
            if (candidate && !candidate.includes('<!DOCTYPE html>') && !candidate.includes('accounts.google.com')) {
              text = candidate;
            }
          }
        } catch (e) {
          console.warn('pubCsv fetch warning:', e);
        }
      }

      // STRATEGI UTAMA 2: Google Visualization API (gviz/tq) untuk standard sheet
      // Endpoint resmi Google ini langsung terhubung ke live calculation engine tanpa delay batch export!
      if (!text && spreadsheetId) {
        // Coba gviz dengan tq=select * dan cache-buster untuk menjamin data sel terbaru ditarik realtime
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv${gidParam}&tq=select%20*&_t=${Date.now()}`;
        try {
          const gvizRes = await fetch(gvizUrl, { method: 'GET', redirect: 'follow', headers });
          if (gvizRes.ok) {
            const candidate = await gvizRes.text();
            if (
              candidate &&
              !candidate.startsWith('/*O_o*/') &&
              !candidate.includes('<!DOCTYPE html>') &&
              !candidate.includes('accounts.google.com') &&
              !candidate.includes('ServiceLogin')
            ) {
              text = candidate;
            } else if (candidate.includes('accounts.google.com') || candidate.includes('ServiceLogin')) {
              isPrivate = true;
            }
          }
        } catch (e) {
          console.warn('gviz select fetch warning:', e);
        }

        // Jika select * tidak dapat data, coba fallback gviz polos
        if (!text && !isPrivate) {
          const gvizPlainUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv${gidParam}&_t=${Date.now()}`;
          try {
            const gvizPlainRes = await fetch(gvizPlainUrl, { method: 'GET', redirect: 'follow', headers });
            if (gvizPlainRes.ok) {
              const candidate = await gvizPlainRes.text();
              if (
                candidate &&
                !candidate.startsWith('/*O_o*/') &&
                !candidate.includes('<!DOCTYPE html>') &&
                !candidate.includes('accounts.google.com') &&
                !candidate.includes('ServiceLogin')
              ) {
                text = candidate;
              }
            }
          } catch (e) {
            console.warn('gviz plain fetch warning:', e);
          }
        }
      }

      // STRATEGI KETIGA: Direct export CSV dengan cache buster
      if (!text && !isPrivate) {
        let exportUrl = cleanUrl;
        if (spreadsheetId && !exportUrl.includes('output=csv') && !exportUrl.includes('format=csv')) {
          const gidForExport = gidParam ? gidParam : '&gid=0';
          exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv${gidForExport}&_t=${Date.now()}&nocache=${Date.now()}`;
        } else {
          const sep = exportUrl.includes('?') ? '&' : '?';
          exportUrl = `${exportUrl}${sep}_t=${Date.now()}`;
        }

        const expRes = await fetch(exportUrl, { method: 'GET', redirect: 'follow', headers });
        if (expRes.ok) {
          const candidate = await expRes.text();
          if (
            candidate &&
            !candidate.includes('<!DOCTYPE html>') &&
            !candidate.includes('accounts.google.com') &&
            !candidate.includes('ServiceLogin')
          ) {
            text = candidate;
          } else if (candidate.includes('accounts.google.com') || candidate.includes('ServiceLogin')) {
            isPrivate = true;
          }
        }
      }

      if (isPrivate) {
        return res.status(403).json({
          error:
            'Google Sheets ini masih memerlukan login akun Google (status privat). Silakan buka Google Sheet > Bagikan > Ubah Akses Umum menjadi "Siapa saja yang memiliki link dapat melihat" dengan peran "Pelihat", lalu coba lagi.',
        });
      }

      if (!text || text.trim().length === 0) {
        return res.status(502).json({
          error:
            'Gagal mengambil data baris dari Google Sheets. Pastikan spreadsheet memiliki data dan akses diset ke publik ("Siapa saja yang memiliki link dapat melihat").',
        });
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.send(text);
    } catch (err: any) {
      console.error('Error fetching sheet in proxy:', err);
      return res.status(500).json({
        error: err.message || 'Terjadi kesalahan saat mengambil data spreadsheet dari server.',
      });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server GIS Aetra berjalan di port ${PORT}`);
  });
}

startServer();
