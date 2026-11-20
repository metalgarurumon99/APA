const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const ROOT_DIR = path.resolve(__dirname, '..');
const BLOCKED_SEGMENTS = new Set(['.git', '.env', 'scripts', 'Tabel', 'node_modules']);
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

const server = http.createServer((req, res) => {
    let rawUrlPath;
    try {
        rawUrlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    } catch (_) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Bad Request');
        return;
    }

    if (rawUrlPath.includes('\0')) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Bad Request');
        return;
    }

    const relPath = rawUrlPath.replace(/^\/+/, '');
    let filePath = path.resolve(ROOT_DIR, relPath || 'index.html');
    if (rawUrlPath.endsWith('/')) {
        filePath = path.resolve(ROOT_DIR, relPath, 'index.html');
    }

    // Proteksi Path Traversal: pastikan filePath selalu berada di dalam ROOT_DIR
    if (filePath !== ROOT_DIR && !filePath.startsWith(ROOT_DIR + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
    }

    // Blokir akses ke dotfile dan direktori sensitif
    const segments = path.relative(ROOT_DIR, filePath).split(path.sep);
    if (segments.some(seg => seg.startsWith('.') || BLOCKED_SEGMENTS.has(seg))) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    res.writeHead(200, {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff'
    });
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        }
        res.end('Internal Server Error');
    });
    stream.pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running at http://127.0.0.1:${PORT}`);
});
