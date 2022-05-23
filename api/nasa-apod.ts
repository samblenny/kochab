// Note, you don't need to import Vercel branded types:
// - VercelRequest is node:http.IncomingMessage plus some helper functions
// - VercelResponse is node:http.ServerResponse plus some helper functions
// - see https://github.com/vercel/vercel/blob/main/packages/node/src/types.ts
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getJson, getNasaKey, JsonData } from "./_kochab";

// Return html fragment for NASA's Astronomy Picture Of the Day
export default (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const key = getNasaKey();
    const url = `https://api.nasa.gov/planetary/apod?api_key=${key}`;
    getJson(url)
        .then((data: JsonData) => {
            res.statusCode = 200;
            res.setHeader('Cache-Control', 's-maxage=300'); // 5 minutes
            const html = formatApod(data);
            res.end(html);
        })
        .catch((err) => {
            console.log(err);
            res.statusCode = 500;
            res.end('500 NASA api error');
        });
};

// Format APOD json as an html fragment
function formatApod(data: JsonData): string {
    const keys = ['copyright', 'date', 'title', 'url'];
    let missing = false;
    const copyright = data.copyright || "[photographer not provided (Hubble?)]";
    const date = data.date || "[date not provided]";
    const title = data.title || "[title not provided]";
    const url = data.url || "";
    let html = "<figure class='kochabApod'>\n";
    html += `<img src="${url}" alt="${title}">\n`;
    html += `<figcaption>${title}<br>\n${copyright}<br>\n`;
    html += `NASA Astronomy Picture of the Day ${date}\n</figcaption>\n`;
    html += "</figure>\n";
    return html;
}
