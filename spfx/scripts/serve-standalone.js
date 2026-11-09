/**
 * Serves dist-standalone/ on http://localhost:PORT (default 4173) with no dependencies.
 * It is only a convenience: index.html also opens by double-click. Localhost counts as a secure
 * context, which some browser features need. Usage: node scripts/serve-standalone.js [port]
 */
const fs = require('fs');
const http = require('http');
const path = require('path');

const dir = path.join(__dirname, '..', 'dist-standalone');
const port = Number(process.argv[2] || process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.map': 'application/json', '.json': 'application/json' };

http.createServer((req, res) => {
  const name = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = path.normalize(path.join(dir, name === '/' ? 'index.html' : name));
  if (file.indexOf(dir) !== 0 || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`http://localhost:${port}`));
