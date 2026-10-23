import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { raceRelay } from './src/core/race_relay.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.txt': 'text/plain'
};

const AUDIO_EXTS = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.aac', '.flac']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif']);

const server = http.createServer((req, res) => {
  const decodedUrl = decodeURIComponent(req.url.split('?')[0]);

  // API Route: PeerRacer Arcade race rooms
  if (raceRelay(req, res, decodedUrl, req.url.split('?')[1] || '')) return;

  // API Route: Get User Music Files
  if (decodedUrl === '/api/music') {
    const musicDirs = [
      path.join(__dirname, 'game play music'),
      path.join(__dirname, 'game_play_music')
    ];

    const tracks = [];
    for (const dir of musicDirs) {
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (AUDIO_EXTS.has(ext)) {
              const fullPath = path.join(dir, file);
              const stats = fs.statSync(fullPath);
              const relFolder = path.basename(dir);
              tracks.push({
                name: path.basename(file, ext),
                filename: file,
                url: `/${encodeURIComponent(relFolder)}/${encodeURIComponent(file)}`,
                size: stats.size,
                ext: ext.replace('.', '').toUpperCase()
              });
            }
          }
        } catch (e) {
          console.error('[!] Error scanning music folder:', e);
        }
      }
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ tracks }));
    return;
  }

  // API Route: Get Custom Game Mods & Sprites
  if (decodedUrl === '/api/mods') {
    const modsBase = path.join(__dirname, 'mods');
    const categories = ['backgrounds', 'card_backs', 'card_faces', 'chips'];
    const mods = {
      modsDir: modsBase,
      backgrounds: [],
      cardBacks: [],
      cardFaces: [],
      chips: []
    };

    const keyMap = {
      backgrounds: 'backgrounds',
      card_backs: 'cardBacks',
      card_faces: 'cardFaces',
      chips: 'chips'
    };

    categories.forEach(cat => {
      const catDir = path.join(modsBase, cat);
      if (fs.existsSync(catDir)) {
        try {
          const files = fs.readdirSync(catDir);
          for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (IMAGE_EXTS.has(ext)) {
              const fullPath = path.join(catDir, file);
              const stats = fs.statSync(fullPath);
              const targetKey = keyMap[cat];
              mods[targetKey].push({
                name: path.basename(file, ext).replace(/[_-]/g, ' '),
                id: path.basename(file, ext),
                filename: file,
                category: cat,
                url: `/mods/${cat}/${encodeURIComponent(file)}`,
                size: stats.size,
                ext: ext.replace('.', '').toUpperCase()
              });
            }
          }
        } catch (err) {
          console.error(`[!] Error scanning mod category ${cat}:`, err);
        }
      }
    });

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(mods));
    return;
  }

  // API Route: Get Available Deck Collections
  if (decodedUrl === '/api/decks') {
    const decksBase = path.join(__dirname, 'decks');
    const deckCollections = [];

    if (fs.existsSync(decksBase)) {
      try {
        const folders = fs.readdirSync(decksBase);

        for (const folder of folders) {
          const folderPath = path.join(decksBase, folder);
          const stats = fs.statSync(folderPath);

          // Only process directories and ignore backup folders
          if (stats.isDirectory() && !folder.includes('backup')) {
            // Check if this folder contains card images
            const folderContents = fs.readdirSync(folderPath);
            const hasCards = folderContents.some(file => {
              const ext = path.extname(file).toLowerCase();
              return IMAGE_EXTS.has(ext) && (file.includes('_') || file.toLowerCase().includes('card'));
            });

            if (hasCards) {
              // Find a sample image (prefer K_spades, K_hearts, A_spades in that order)
              let sampleImage = `/decks/${folder}/K_spades.png`;
              const sampleCandidates = ['K_spades.png', 'K_hearts.png', 'A_spades.png', 'A_hearts.png'];

              for (const candidate of sampleCandidates) {
                if (folderContents.includes(candidate)) {
                  sampleImage = `/decks/${folder}/${candidate}`;
                  break;
                }
              }

              // Create deck collection entry
              let deckName = folder.split('_').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ');
              let deckIcon = '🎴';

              const manifestPath = path.join(folderPath, 'deck_manifest.json');
              if (fs.existsSync(manifestPath)) {
                try {
                  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                  if (manifest.name) deckName = manifest.name;
                  if (manifest.icon) deckIcon = manifest.icon;
                } catch (e) {}
              }

              deckCollections.push({
                id: folder,
                name: deckName,
                icon: deckIcon,
                sample: sampleImage,
                path: `/decks/${folder}`,
                cardCount: folderContents.filter(f => {
                  const ext = path.extname(f).toLowerCase();
                  return IMAGE_EXTS.has(ext);
                }).length
              });
            }
          }
        }
      } catch (err) {
        console.error('[!] Error scanning decks directory:', err);
      }
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ decks: deckCollections }));
    return;
  }

  // Normal file serving
  let reqPath = decodedUrl;
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(__dirname, reqPath);

  // Security check to prevent path traversal outside root
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${reqPath}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Handle HTTP Range Requests for Audio Streaming
    const range = req.headers.range;
    if (range && AUDIO_EXTS.has(ext)) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[+] Solitaire Sovereign server running at http://localhost:${PORT}`);
});
