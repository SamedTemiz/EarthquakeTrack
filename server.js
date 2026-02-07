const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8081;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp'
};

http.createServer((req, res) => {
    // Parse URL to ignore query strings (e.g. style.css?v=2024)
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

    if (parsedUrl.pathname === '/sitemap.xml') {
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url>
            <loc>https://earthquaketrack.com.tr/</loc>
            <priority>1.0</priority>
          </url>
          <url>
            <loc>https://earthquaketrack.com.tr/izmir</loc>
            <priority>0.8</priority>
          </url>
        </urlset>`;
        
        res.writeHead(200, { 'Content-Type': 'application/xml' });
        return res.end(sitemap);
    }
    
    let filePath = '.' + parsedUrl.pathname;
    if (filePath === './') filePath = './index.html';

    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}).listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
