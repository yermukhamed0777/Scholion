import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const host = '127.0.0.1';
const port = Number(process.argv[2] ?? 4173);
const studyRequestLimit = 2 * 1024 * 1024;
const providerTimeout = 90_000;
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
};

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new RangeError('Use a port between 0 and 65535.');
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  }).end(JSON.stringify(body));
}

function sendError(response, status, message) {
  if (!response.destroyed) sendJson(response, status, { error: { message } });
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function generateStudy(request, response) {
  const mediaType = request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'application/json') {
    request.resume();
    sendError(response, 415, 'Use application/json for study requests.');
    return;
  }

  const chunks = [];
  let size = 0;
  let payload;
  try {
    for await (const chunk of request.iterator({ destroyOnReturn: false })) {
      size += chunk.length;
      if (size > studyRequestLimit) {
        request.resume();
        sendError(response, 413, 'This study request is too large.');
        return;
      }
      chunks.push(chunk);
    }
    payload = JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
  } catch {
    sendError(response, 400, 'Send a valid JSON study request.');
    return;
  }
  if (!hasText(payload?.text)) {
    sendError(response, 400, 'Choose a source with readable text.');
    return;
  }

  const title = hasText(payload.title) ? payload.title.trim() : 'Study source';
  const pages = hasText(payload.pages) ? `\nPages: ${payload.pages.trim()}` : '';
  const prompt = `Title: ${title}${pages}\nExcerpt:\n${payload.text}\nProvide a JSON object with keys: explanation (string) and question (object). The question should have prompt (string), choices (array of 4 strings), correctIndex (int), rationale (string).`;
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

  try {
    const upstream = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaPayload),
      signal: AbortSignal.timeout(providerTimeout),
    });
    if (!upstream.ok) {
      await upstream.body?.cancel();
      sendError(response, 502, 'The study model is unavailable. Check Ollama and try again.');
      return;
    }
    const { choices } = await upstream.json();
    const { explanation, question } = JSON.parse(choices[0].message.content);
    if (!hasText(explanation) || !hasText(question?.prompt) || !hasText(question.rationale) ||
        !Array.isArray(question.choices) || question.choices.length !== 4 || !question.choices.every(hasText) ||
        !Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex >= question.choices.length) {
      sendError(response, 502, 'The study model returned an invalid result. Try again.');
      return;
    }
    if (!response.destroyed) sendJson(response, 200, { explanation, question });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      sendError(response, 504, 'The study model took too long to respond. Try again.');
    } else {
      sendError(response, 502, 'The study model could not generate a response. Check Ollama and try again.');
    }
  }
}

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

server.listen(port, host, () => {
  console.log('ALLaroundPREP is available at http://' + host + ':' + server.address().port);
});
