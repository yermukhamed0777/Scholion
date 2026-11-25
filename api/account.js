// Hosted account routes. Same handlers as the local server, with no secrets
// in the client bundle. Vercel supplies the Node request/response objects.
import { handleAccountRequest } from '../scripts/account-endpoints.mjs';

export default async function handler(request, response) {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  await handleAccountRequest(pathname, request, response);
}
