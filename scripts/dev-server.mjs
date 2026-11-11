// Local development server: `npm run dev` → http://127.0.0.1:3000
// Serves the static site and runs api/*.js the way Vercel does (default export handler(req, res)).
// Secrets come from .env.local (see README); they are only visible to the api/ handlers, never to the browser.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv(path.join(ROOT, '.env.local'));

/* Vercel-style response helpers used by some handlers. */
function decorate(res) {
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)); return res; };
  return res;
}

async function runApi(name, req, res) {
  const file = path.join(ROOT, 'api', `${name}.js`);
  if (!/^[a-z0-9-]+$/.test(name) || !fs.existsSync(file)) {
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'Not found' }));
  }
  const { default: handler } = await import(pathToFileURL(file).href);
  await handler(req, decorate(res));
}

function serveStatic(urlPath, res) {
  const relative = decodeURIComponent(urlPath === '/' ? '/index.html' : urlPath);
  const file = path.resolve(ROOT, `.${relative}`);
  // Never serve dotfiles (.env.local holds the service-role key, .git, …) or server-side code.
  const blocked = /(^|[\\/])(\.[^\\/]*|node_modules|supabase|scripts|lib|api)([\\/]|$)/.test(path.relative(ROOT, file));
  if (!file.startsWith(ROOT + path.sep) || blocked || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404;
    return res.end('Not found');
  }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (pathname.startsWith('/api/')) await runApi(pathname.slice(5).replace(/\/$/, ''), req, res);
    else serveStatic(pathname, res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.statusCode = 500;
    res.end('Internal error');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Residence Trainer: http://127.0.0.1:${PORT}`);
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) console.warn('! .env.local не знайдено: адмін-функції (api/) не працюватимуть');
});
