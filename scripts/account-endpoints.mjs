// Same-origin account endpoints. Configuration stays on the server; the
// browser only ever receives HttpOnly session cookies and its own data.

import { sendError, sendJson } from './study-endpoint.mjs';
import { resolveGenerationCapability } from './generation-capability.js';
import { clientKey, createRateLimiter } from './rate-limit.js';
import { deleteSourceFromWorkspace, emptyWorkspace, isValidWorkspace } from './workspace-state.mjs';
import {
  readSupabaseConfig, readWorkspace, refreshSession, sessionUser, signIn, signOut, signUp, writeWorkspace,
} from './supabase.mjs';

const cookieName = 'scholion_session';
const refreshCookieName = 'scholion_refresh';
const rateLimiters = new Map();
const rateDefaults = { auth: 30, workspace: 120, restore: 5 };

function limitFor(kind, env) {
  const value = Number(env[`RATE_LIMIT_${kind.toUpperCase()}_MAX`]);
  return Number.isInteger(value) && value > 0 ? value : rateDefaults[kind];
}

function limiter(kind, limit) {
  const id = `${kind}:${limit}`;
  if (!rateLimiters.has(id)) rateLimiters.set(id, createRateLimiter({ limit, windowMs: 60_000 }));
  return rateLimiters.get(id);
}

function cookieValue(request, name) {
  for (const part of (request.headers.cookie || '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      try { return decodeURIComponent(rest.join('=')); } catch { return null; }
    }
  }
  return null;
}

function sessionToken(request) {
  return cookieValue(request, cookieName);
}

function cookieAttributes(request) {
  const forwarded = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  const secure = Boolean(request.socket?.encrypted) || forwarded === 'https';
  return `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

function setSession(response, tokens, request) {
  const attributes = cookieAttributes(request);
  const cookies = [
    tokens?.access_token
      ? `${cookieName}=${encodeURIComponent(tokens.access_token)}; ${attributes}; Max-Age=3600`
      : `${cookieName}=; ${attributes}; Max-Age=0`,
    tokens?.refresh_token
      ? `${refreshCookieName}=${encodeURIComponent(tokens.refresh_token)}; ${attributes}; Max-Age=604800`
      : `${refreshCookieName}=; ${attributes}; Max-Age=0`,
  ];
  response.setHeader('Set-Cookie', cookies);
}

// A browser form from another origin must never be able to change an account
// or a workspace. Non-browser clients have no Origin header; JSON content type
// and SameSite cookies still constrain those requests.
function assertSameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return;
  let parsed;
  try { parsed = new URL(origin); } catch {
    throw Object.assign(new Error('This request is not allowed.'), { status: 403 });
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.host !== request.headers.host) {
    throw Object.assign(new Error('This request is not allowed.'), { status: 403 });
  }
}

async function resolveSession(config, request, response) {
  if (!config) return null;
  const access = sessionToken(request);
  const refresh = cookieValue(request, refreshCookieName);
  if (!access && !refresh) return null;
  if (access) {
    try {
      const user = await sessionUser(config, access);
      if (user) return user;
    } catch (error) {
      if (error.status !== 401) throw error;
    }
  }
  if (!refresh) return null;
  const renewed = await refreshSession(config, refresh);
  if (!renewed?.access_token) return null;
  setSession(response, renewed, request);
  return sessionUser(config, renewed.access_token);
}

async function readJson(request, limit = 1024 * 1024) {
  const mediaType = request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'application/json') {
    throw Object.assign(new Error('Use application/json for this request.'), { status: 415 });
  }
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

export async function handleAccountRequest(pathname, request, response, env = process.env, dependencies = {}) {
  const config = readSupabaseConfig(env);
  const configured = () => {
    if (!config) throw Object.assign(new Error('Accounts are not configured for this deployment.'), { status: 503 });
    return config;
  };

  if (pathname === '/api/config') {
    const generationStatus = await resolveGenerationCapability(env, dependencies.probeGeneration || null);
    sendJson(response, 200, {
      accounts: Boolean(config),
      generation: generationStatus.kind,
      generationStatus,
    });
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
    if (request.method !== 'GET') {
      assertSameOrigin(request);
      const kind = pathname === '/api/workspace/restore' ? 'restore'
        : workspaceRoutes.includes(pathname) ? 'workspace' : 'auth';
      const decision = limiter(kind, limitFor(kind, env))(clientKey(request));
      if (!decision.allowed) {
        response.setHeader('Retry-After', String(decision.retryAfter));
        sendError(response, 429, 'Too many requests. Try again shortly.');
        return true;
      }
    }

    if (pathname === '/api/auth/signup' || pathname === '/api/auth/login') {
      if (request.method !== 'POST') {
        response.writeHead(405, { Allow: 'POST' }).end();
        return true;
      }
      const body = await readJson(request);
      const result = pathname.endsWith('signup')
        ? await signUp(configured(), body?.email, body?.password)
        : await signIn(configured(), body?.email, body?.password);
      setSession(response, result, request);
      sendJson(response, 200, { user: result?.user ?? null });
      return true;
    }

    if (pathname === '/api/auth/logout') {
      if (request.method !== 'POST') {
        response.writeHead(405, { Allow: 'POST' }).end();
        return true;
      }
      const activeConfig = configured();
      try {
        await signOut(activeConfig, sessionToken(request));
      } catch {
        // Revocation failure must not leave a live cookie in the browser.
      }
      setSession(response, null, request);
      sendJson(response, 200, { ok: true });
      return true;
    }

    if (pathname === '/api/auth/session') {
      const active = await resolveSession(config, request, response);
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
      const allowedIds = String(env.WORKSPACE_RESTORE_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
      if (!allowedIds.includes(body.userId)) {
        throw Object.assign(new Error('This restore token is not scoped to that user.'), { status: 403 });
      }
      await writeWorkspace(configured(), body.userId, body.state);
      sendJson(response, 200, { ok: true });
      return true;
    }

    const active = await resolveSession(config, request, response);
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
