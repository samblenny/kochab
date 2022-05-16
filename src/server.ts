// Copyright (c) 2022 Sam Blenny
//
// This is a primitive approximation of Vercel's hosting, meant for local dev.
//
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { join, normalize, posix } from 'node:path';
import { readFile } from 'node:fs';

// Root directory for static files
const root = 'public';

const rewrites: Record<string, string> = {
    '/': 'index.html',
};

// Root directory for compiled api serverless function modules
const apiRoot = '../api';

const api404 = `${apiRoot}/404.js`;

const apiRewrites: Record<string, string> = {
    '/api/hello': `${apiRoot}/hello.js`,
    '/api/nasa-apod': `${apiRoot}/nasa-apod.js`
}

// Resolve filename to MIME type according to file extensions
function mimeType(file: string): string {
    const ext = posix.extname(file);
    if(ext === '.html') { return 'text/html;charset=UTF-8'; }
    if(ext === '.css')  { return 'text/css;charset=UTF-8'; }
    if(ext === '.txt')  { return 'text/plain;charset=UTF-8'; }
    return 'text/html;charset=UTF-8';
}

// Serve 404 page for http.ServerResponse
function serve404(res: ServerResponse) {
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
function serveFile(res: ServerResponse, status: number, file: string) {
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
function serveApi404(res: ServerResponse) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 404;
    res.end('{ "status": 404 }');
}

// Serve http.ServerResponse for api serverless function endpoints
function routeApiRequest(req: IncomingMessage, res: ServerResponse) {
    const key = req.url || '';
    if(apiRewrites.hasOwnProperty(key)) {
        const apiModule = apiRewrites[key];
        import(apiModule)
            .then(module => {
                module.default(req, res);  // Normal serverless function
            })
            .catch(err => {
                console.log(err);
                serveApi404(res);          // Fallback api 404
            });
    } else {
        import(api404)
            .then(module => {
                module.default(req, res);  // Normal custom api 404
            })
            .catch(err => {
                console.log(err);
                serveApi404(res);          // Fallback api 404
            });
    }
}

// Server for responding to HTTP requests
const server = createServer((req: IncomingMessage, res) => {
    const normUrl = posix.normalize(decodeURI(req.url || '/'));
    const normDir = posix.dirname(normUrl);
    const normBase = posix.basename(normUrl);
    if(normUrl.startsWith('/api/')) {
        routeApiRequest(req, res);
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
server.listen(8000, '0.0.0.0', () => {
  console.log('Listening HTTP port 8000 on all interfaces (CAUTION!)');
});
