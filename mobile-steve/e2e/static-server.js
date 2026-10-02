/* eslint-disable no-console */
/**
 * Serveur statique minimal pour l'export web Expo (SPA) : sert les fichiers
 * du dossier exporté et renvoie index.html pour toute route inconnue
 * (expo-router côté client). Usage : node e2e/static-server.js <dir> <port>
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(process.argv[2] || 'dist');
const port = Number(process.argv[3] || 8081);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.join(dir, urlPath);
    if (!file.startsWith(dir)) {
      res.writeHead(403);
      return res.end();
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(dir, 'index.html');
    }
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`static server: http://localhost:${port} → ${dir}`));
