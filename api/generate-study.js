// Hosted entry point for the same generation contract used by the local
// server. Vercel serves dist/ as static files and routes POSTs here.
import { generateStudy } from '../scripts/study-endpoint.mjs';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.writeHead(405, { Allow: 'POST' }).end();
    return;
  }
  await generateStudy(request, response);
}
