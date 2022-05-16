// Note, you don't need to import Vercel branded types:
// - VercelRequest is node:http.IncomingMessage plus some helper functions
// - VercelResponse is node:http.ServerResponse plus some helper functions
// - see https://github.com/vercel/vercel/blob/main/packages/node/src/types.ts
import type { IncomingMessage, ServerResponse } from 'node:http';
import { apiAccessAllowed, getJson, getNasaKey, JsonData } from "./_kochab";

// Return json with a link to NASA's Astronomy Picture Of the Day
export default (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if(!apiAccessAllowed()) {
        res.statusCode = 500;
        res.end('500 api access not allowed (check KOCHAB_API_FENCE env var)');
        return;
    }
    const key = getNasaKey();
    const url = `https://api.nasa.gov/planetary/apod?api_key=${key}`;
    getJson(url)
        .then((data: JsonData) => {
            res.statusCode = 200;
            res.setHeader('Cache-Control', 's-maxage=3600'); // 1 hour
            const shortData = filterApodJson(data);
            const html = formatApod(shortData);
            res.end(html);
        })
        .catch((err) => {
            console.log(err);
            res.statusCode = 500;
            res.end('500 NASA api error');
        });
};

// Remove the long description and other non-interesting keys
function filterApodJson(data: JsonData): JsonData {
    const filter = ['explanation', 'hdurl', 'media_type', 'service_version'];
    for(const k of filter) {
        if(data.hasOwnProperty(k)) {
            delete data[k];
        }
    }
    return data;
}

// Format APOD json as an html fragment
function formatApod(data: JsonData): string {
    const keys = ['copyright', 'date', 'title', 'url'];
    let missing = false;
    for(const k of keys) {
        if(!data.hasOwnProperty(k)) {
            missing = true;
        }
    }
    if(missing) {
        return "\n<div class='kochabErr'>Loading NASA APOD json failed</div>";
    }
    let html = "\n<figure class='kochabApod'>\n";
    html += `<img src="${data.url}" alt="${data.title}">`;
    html += `<figcaption>${data.title}<br>${data.copyright}<br>\n`;
    html += `NASA Astronomy Picture of the Day ${data.date}</figcaption>\n`;
    html += "\n</figure>\n";
    return html;
}
