// Copyright (c) 2022 Sam Blenny
//
// This is a utility class for Kochab serverless api endpoints.
//

import * as https from 'node:https';

// This value gets compared to the KOCHAB_API_FENCE environment variable
const apiFence = 1;

export interface JsonData {
    [key: string]: object;
};

// Return true if API access is allowed (when apiFence >= KOCHAB_API_FENCE).
//
// The point of this is to have a kill switch feature for old code so it will
// not attempt to make use of API keys to access 3rd party APIs. The problem
// is that Vercel's per-commit preview deployments are, AFAIK, permanent and
// have easily predictable URLs. So, outdated or insecure code could provide
// long-term public access to Kochab API endpoints that would trigger access
// to 3rd party APIs. The kill switch feature is also a way to cut down on
// API quota usage due to crawlers hitting the URLs for old preview
// deployments.
//
// Intended usage:
// 1. Increment apiFence (see above) when deploying new features
// 2. (Optional) increase value of KOCHAB_API_FENCE in Vercel's dashboard to
//    adjust the threshold (how old of deployment) where Kochab's kill switch
//    feature will be activated
//
export function apiAccessAllowed(): boolean {
    const envFenceStr = process.env.KOCHAB_API_FENCE || '';
    const envFenceInt = Number.parseInt(envFenceStr);
    if(isNaN(envFenceInt) || apiFence < envFenceInt) {
        return false;
    }
    return true;
}

// Return NASA API key from environment variable
export function getNasaKey(): string {
    return process.env.NASA_API_KEY || '';
}

// Wrap all the boilerplate for doing an HTTP GET request, promise style
export function getJson(url: string) {
    return new Promise<JsonData>((resolve, reject) => {
        if(!apiAccessAllowed()) {
            reject(new Error('API access not allowed'));
            return;
        }
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
