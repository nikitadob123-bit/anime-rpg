/* Простой статический сервер для разработки: node tools/serve.js [порт] */
const http = require('http'), fs = require('fs'), path = require('path');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
exports.serve = function (port, root) {
  root = root || path.join(__dirname, '..');
  return new Promise((res) => { const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('not found'); } r.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); fs.createReadStream(f).pipe(r); }).listen(port || 0, '127.0.0.1', () => res(srv)); });
};
if (require.main === module) exports.serve(+process.argv[2] || 8080).then((s) => console.log('http://127.0.0.1:' + s.address().port + '/'));
