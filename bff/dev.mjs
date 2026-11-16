// Local dev server for the BFF: `npm run dev` (reads ./.env.local).
// The iOS simulator reaches it at http://127.0.0.1:8787.
import http from 'node:http';
import fs from 'node:fs';
import { createApp, readConfig } from './src/proxy.js';

const envFile = process.env.BFF_ENV_FILE || new URL('./.env.local', import.meta.url).pathname;
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const handle = createApp({ config: readConfig(process.env) });
const port = Number(process.env.PORT || 8787);

http
  .createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(`http://127.0.0.1:${port}${req.url}`, {
      method: req.method,
      headers: Object.entries(req.headers).flatMap(([k, v]) =>
        Array.isArray(v) ? v.map((x) => [k, x]) : [[k, String(v)]],
      ),
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
    });
    const response = await handle(request, { fallbackIp: req.socket.remoteAddress || '' });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  })
  .listen(port, '127.0.0.1', () => console.log(`BFF on http://127.0.0.1:${port}`));
