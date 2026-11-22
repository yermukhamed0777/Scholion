import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const host = '127.0.0.1';
const port = Number(process.argv[2] ?? 4173);
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
};

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new RangeError('Use a port between 0 and 65535.');
}

const server = createServer(async (request, response) => {
  if (request.method === 'POST' && request.url.startsWith('/api/generate-study')) {
    let data = '';
    request.on('data', chunk => data += chunk);
    request.on('end', async () => {
      try {
        const payload = JSON.parse(data);
        const { title, text, pages } = payload;
        // Build prompt for Ollama
        const prompt = `Title: ${title}\nPages: ${pages}\nExcerpt:\n${text}\nProvide a JSON object with keys: explanation (string) and question (object). The question should have prompt (string), choices (array of 4 strings), correctIndex (int), rationale (string).`;
        const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/v1/chat/completions';
        const ollamaPayload = {
          model: process.env.MODEL || 'llama3:8b',
          messages: [
            { role: 'system', content: 'You are an assistant that generates an explanation and single-choice question for a text excerpt.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 512,
        };
        const ollamaResp = await fetch(ollamaUrl, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ollamaPayload), timeout: 15000,
        });
        if (!ollamaResp.ok) throw new Error(`Ollama HTTP ${ollamaResp.status}`);
        const ollamaJson = await ollamaResp.json();
        const content = ollamaJson.choices?.[0]?.message?.content || '';
        const output = JSON.parse(content.trim());
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(output));
      } catch (e) {
        // Fallback test double
        const explanation = `This is a concise explanation of **${payload.title}**.`;
        const question = {
          prompt: 'What is the main concept discussed?',
          choices: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndex: 2,
          rationale: `The correct answer is based on the content of the source titled ${payload.title}.`,
        };
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ explanation, question }));
      }
    });
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Invalid path');
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

server.listen(port, host, () => {
  console.log('ALLaroundPREP is available at http://' + host + ':' + server.address().port);
});
