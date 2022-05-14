// Copyright (c) 2022 Sam Blenny
//
// This is a primitive approximation of Vercel's hosting, meant for local dev.
//
import { createServer } from 'node:http';
import { readFile } from 'node:fs';
import { join, normalize, posix } from 'node:path';

// Root directory for static files
const root = 'public';

// List of route rewrite transformations for static files
const rewrites = {
    '/': 'index.html',
};

// Resolve filename to MIME type according to file extensions
function mimeType(file) {
    const ext = posix.extname(file);
    if(ext === '.html') { return 'text/html;charset=UTF-8'; }
    if(ext === '.css')  { return 'text/css;charset=UTF-8'; }
    if(ext === '.txt')  { return 'text/plain;charset=UTF-8'; }
    return 'text/html;charset=UTF-8';
}

// Serve 404 page for http.ServerResponse
function serve404(res) {
    const file = "404.html";
    const filePath = join(root, normalize(file));
    res.statusCode = 404;
    res.setHeader('Content-Type', mimeType(file));
    readFile(filePath, function (err, data) {
        if(err) {
            // Failsafe in case there's a problem reading 404.html
            res.end("404 Not Found");
        } else {
            // Normal custom 404 page
            res.end(data);
        }
    });
}

// Serve http.ServerResponse, with given status, from a static file
function serveFile(res, status, file) {
    res.setHeader('Content-Type', mimeType(file));
    const filePath = join(root, normalize(file));
    readFile(filePath, function (err, data) {
        if(err) {
            serve404(res);
        } else {
            res.statusCode = status;
            res.end(data);
        }
    });
}

// Serve JSON 404 for http.ServerResponse to an api endpoint
function serveApi404(res) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 404;
    res.end('{ "status": 404 }');
}

// Serve http.ServerResponse for an api endpoint
function routeApiRequest(req, res, normUrl) {
    serveApi404(res);
}

// Server for responding to HTTP requests
const server = createServer((req, res) => {
    const normUrl = posix.normalize(decodeURI(req.url));
    const normDir = posix.dirname(normUrl);
    const normBase = posix.basename(normUrl);
    if(normUrl.startsWith('/api/')) {
        routeApiRequest(req, res, normUrl);
    } else if(/^[._]/.test(normDir) || normBase.startsWith('_')) {
        // Directories starting with '.' or '_' are not allowed.
        // Files starting with '_' are not allowed.
        serveFile(res, 404, '404.html');
    } else if(rewrites.hasOwnProperty(normUrl)) {
        // Apply route rewrites, if applicable
        serveFile(res, 200, rewrites[normUrl]);
    } else {
        // Otherwise just try to serve the file
        serveFile(res, 200, normUrl);
    }
});

// Start server listening on all iterfaces
server.listen('8000', '0.0.0.0', () => {
  console.log('Listening HTTP port 8000 on all interfaces (CAUTION!)');
});
