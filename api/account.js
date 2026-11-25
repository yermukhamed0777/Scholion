// Hosted account routes. Same handlers as the local server, with no secrets
// in the client bundle. Vercel supplies the Node request/response objects.
import { handleAccountRequest } from '../scripts/account-endpoints.mjs';

export default async function handler(request, response) {
  const url = new URL(request.url, 'http://localhost');
  // Rewrites pass the original same-origin path through ?route= so one
  // function can serve every account route without leaking it to the client.
  const pathname = url.searchParams.get('route') || url.pathname;
  const handled = await handleAccountRequest(pathname, request, response);
  if (!handled && !response.writableEnded) response.writeHead(404).end('Not found');
}
