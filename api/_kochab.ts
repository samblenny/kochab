// Copyright (c) 2022 Sam Blenny
//
// This is a utility module for Kochab serverless api endpoints.
//

import * as https from 'node:https';

export interface JsonData {
    [key: string]: object;
};

// Return NASA API key from environment variable
export function getNasaKey(): string {
    return process.env.NASA_API_KEY || '';
}

// Wrap all the boilerplate for doing an HTTP GET request, promise style
export function getJson(url: string) {
    return new Promise<JsonData>((resolve, reject) => {
        https.get(url, (res) => {
            const status = res.statusCode;
            const mime = res.headers['content-type'] || '';
            if(status !== 200) {
                reject(new Error(`http status ${status}`));
            } else if(mime !== 'application/json') {
                reject(new Error(`wrong content-type: ${mime}`));
            } else {
                let body = "";
                res.setEncoding('utf8');
                res.on('data', (chunk: string) => {
                    body += chunk;
                });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    } catch (err) {
                        reject(err);
                    };
                });
            }
            res.resume();
        }).on('error', reject);
    });
}
