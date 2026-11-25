// Same-origin account endpoints. Configuration stays on the server; the
// browser only ever receives an HttpOnly session cookie and its own data.

import { sendError, sendJson } from './study-endpoint.mjs';
import { deleteSourceFromWorkspace, emptyWorkspace, isValidWorkspace } from './workspace-state.mjs';
import { readSupabaseConfig, readWorkspace, sessionUser, signIn, signOut, signUp, writeWorkspace } from './supabase.mjs';

const cookieName = 'scholion_session';

function sessionToken(request) {
  for (const part of (request.headers.cookie || '').split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === cookieName) {
      try { return decodeURIComponent(rest.join('=')); } catch { return null; }
    }
  }
  return null;
}

function setSession(response, token) {
  response.setHeader('Set-Cookie', token
    ? `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`
    : `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

async function readJson(request, limit = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('This request is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Send a valid JSON request.'), { status: 400 });
  }
}

function replyError(response, error) {
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 600 ? error.status : 502;
  sendError(response, status, error?.message || 'The account request could not be completed.');
}

export async function handleAccountRequest(pathname, request, response, env = process.env) {
  const config = readSupabaseConfig(env);
  const configured = () => {
    if (!config) throw Object.assign(new Error('Accounts are not configured for this deployment.'), { status: 503 });
    return config;
  };

  if (pathname === '/api/config') {
    sendJson(response, 200, { accounts: Boolean(config), generation: 'local-only' });
    return true;
  }

  const authRoutes = ['/api/auth/signup', '/api/auth/login', '/api/auth/logout', '/api/auth/session'];
  const workspaceRoutes = ['/api/workspace', '/api/workspace/migrate', '/api/workspace/delete-source', '/api/workspace/restore'];
  if (![...authRoutes, ...workspaceRoutes].includes(pathname)) return false;
  if (!config && workspaceRoutes.includes(pathname)) {
    sendError(response, 503, 'Accounts are not configured for this deployment.');
    return true;
  }

  try {
    if (pathname === '/api/auth/signup' || pathname === '/api/auth/login') {
      if (request.method !== 'POST') {
        response.writeHead(405, { Allow: 'POST' }).end();
        return true;
      }
      const body = await readJson(request);
      const result = pathname.endsWith('signup')
        ? await signUp(configured(), body?.email, body?.password)
        : await signIn(configured(), body?.email, body?.password);
      if (result?.access_token) setSession(response, result.access_token);
      sendJson(response, 200, { user: result?.user ?? null });
      return true;
    }

    if (pathname === '/api/auth/logout') {
      if (request.method !== 'POST') {
        response.writeHead(405, { Allow: 'POST' }).end();
        return true;
      }
      await signOut(configured(), sessionToken(request));
      setSession(response, null);
      sendJson(response, 200, { ok: true });
      return true;
    }

    if (pathname === '/api/auth/session') {
      const active = config ? await sessionUser(config, sessionToken(request)) : null;
      sendJson(response, 200, { user: active ? { id: active.id, email: active.email ?? null } : null });
      return true;
    }

    if (pathname === '/api/workspace/restore') {
      if (request.method !== 'POST') {
        response.writeHead(405, { Allow: 'POST' }).end();
        return true;
      }
      const expected = env.WORKSPACE_RESTORE_TOKEN;
      if (!expected || request.headers['x-restore-token'] !== expected) {
        throw Object.assign(new Error('Backup restore is not permitted.'), { status: 403 });
      }
      const body = await readJson(request);
      if (typeof body?.userId !== 'string' || !isValidWorkspace(body.state)) {
        throw Object.assign(new Error('Send a user id and a valid workspace backup.'), { status: 400 });
      }
      await writeWorkspace(configured(), body.userId, body.state);
      sendJson(response, 200, { ok: true });
      return true;
    }

    const active = config ? await sessionUser(config, sessionToken(request)) : null;
    if (!active) {
      sendError(response, 401, 'Sign in to use your private workspace.');
      return true;
    }
    const activeConfig = configured();
    const userId = active.id;

    if (pathname === '/api/workspace' && request.method === 'GET') {
      const stored = await readWorkspace(activeConfig, userId);
      sendJson(response, 200, { state: stored ?? emptyWorkspace() });
      return true;
    }

    if (pathname === '/api/workspace' && request.method === 'PUT') {
      const state = await readJson(request);
      if (!isValidWorkspace(state)) {
        throw Object.assign(new Error('Send a valid workspace state.'), { status: 400 });
      }
      await writeWorkspace(activeConfig, userId, state);
      sendJson(response, 200, { ok: true });
      return true;
    }

    if (pathname === '/api/workspace/migrate' && request.method === 'POST') {
      const body = await readJson(request);
      if (!isValidWorkspace(body?.state)) {
        throw Object.assign(new Error('Send a valid workspace to migrate.'), { status: 400 });
      }
      const existing = await readWorkspace(activeConfig, userId);
      const state = existing ?? body.state;
      if (!existing) await writeWorkspace(activeConfig, userId, state);
      sendJson(response, 200, { state });
      return true;
    }

    if (pathname === '/api/workspace/delete-source' && request.method === 'POST') {
      const body = await readJson(request);
      if (typeof body?.sourceId !== 'string') {
        throw Object.assign(new Error('Choose a source to delete.'), { status: 400 });
      }
      const stored = await readWorkspace(activeConfig, userId);
      if (!stored) {
        sendError(response, 404, 'No saved workspace was found for this account.');
        return true;
      }
      const state = deleteSourceFromWorkspace(stored, body.sourceId);
      await writeWorkspace(activeConfig, userId, state);
      sendJson(response, 200, { state });
      return true;
    }

    response.writeHead(405, { Allow: 'GET, POST, PUT' }).end();
    return true;
  } catch (error) {
    replyError(response, error);
    return true;
  }
}
