import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveServerConfig } from './server-config.js';
import { probeOllama } from './generation-capability.js';
import { generateStudy } from './study-endpoint.mjs';
import { handleAccountRequest } from './account-endpoints.mjs';

const siteRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const { host, port } = resolveServerConfig(process.env, process.argv.slice(2));
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
};

const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Invalid path');
    return;
  }

  if (pathname === '/api/generate-study') {
    if (request.method === 'POST') await generateStudy(request, response);
    else response.writeHead(405, { Allow: 'POST' }).end();
    return;
  }
  if (pathname === '/api/config' || pathname.startsWith('/api/auth/') || pathname.startsWith('/api/workspace')) {
    const handled = await handleAccountRequest(pathname, request, response, process.env, { probeGeneration: probeOllama });
    if (!handled) {
      response.writeHead(404, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Not found' }));
    }
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  const path = resolve(siteRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
  const relativePath = relative(siteRoot, path);
  const contentType = contentTypes[extname(path)];
  if (relativePath === '..' || relativePath.startsWith('..' + sep) || !contentType) {
    response.writeHead(404).end('File not found');
    return;
  }

  try {
    const file = await stat(path);
    if (!file.isFile()) {
      response.writeHead(404).end('File not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': file.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(path).on('error', () => response.destroy()).pipe(response);
  } catch {
    response.writeHead(404).end('File not found');
  }
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the other process or choose another port.`);
    process.exitCode = 1;
  } else {
    throw error;
  }
});

server.listen(port, host, () => {
  console.log('Scholion is available at http://' + host + ':' + server.address().port + '/');
});
