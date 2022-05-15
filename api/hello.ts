// Note, you don't need to import Vercel branded types:
// - VercelRequest is node:http.IncomingMessage plus some helper functions
// - VercelResponse is node:http.ServerResponse plus some helper functions
// - see https://github.com/vercel/vercel/blob/main/packages/node/src/types.ts
import type { IncomingMessage, ServerResponse } from 'node:http';

export default (req: IncomingMessage, res: ServerResponse) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end('{ "message": "Hello" }');
};
