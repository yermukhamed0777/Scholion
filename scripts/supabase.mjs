// Server-only Supabase adapter. The browser never sees the service-role key or
// a provider URL. With no configuration the account endpoints return 503 and
// the local-only workspace keeps working.

export function readSupabaseConfig(env = {}) {
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey } = env;
  if (!url || !anonKey || !serviceKey) return null;
  try {
    const parsed = new URL(url);
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
    if (!['http:', 'https:'].includes(parsed.protocol) || (parsed.protocol === 'http:' && !loopback)) return null;
    return {
      base: parsed.href.replace(/\/$/, ''),
      anonKey,
      serviceKey,
      table: env.SUPABASE_TABLE || 'workspaces',
    };
  } catch {
    return null;
  }
}

async function request(config, path, { method = 'GET', body, token, service = false, prefer } = {}) {
  const key = service ? config.serviceKey : config.anonKey;
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (service) headers.Authorization = `Bearer ${config.serviceKey}`;
  if (prefer) headers.Prefer = prefer;
  let response;
  try {
    response = await fetch(config.base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw Object.assign(new Error('The account service is unavailable.'), { status: 502 });
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    // Upstream bodies are never relayed verbatim: they may contain provider
    // internals or learner-supplied values. Clients receive one fixed message
    // per status class; details stay out of logs and error bodies alike.
    const message = response.status === 401 ? 'The email or password is incorrect.'
      : response.status === 400 || response.status === 422 ? 'Check the account details and try again.'
        : response.status === 429 ? 'Too many attempts. Try again shortly.'
          : 'The account service is unavailable.';
    throw Object.assign(new Error(message), { status: response.status === 401 ? 401 : 502 });
  }
  return data;
}

const credentials = (email, password) => {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw Object.assign(new Error('Use a valid email and a password of 8 to 128 characters.'), { status: 400 });
  }
  return { email: email.trim().toLowerCase(), password };
};

export async function signUp(config, email, password) {
  const body = credentials(email, password);
  return request(config, '/auth/v1/signup', { method: 'POST', body });
}

export async function signIn(config, email, password) {
  const body = credentials(email, password);
  return request(config, '/auth/v1/token?grant_type=password', { method: 'POST', body });
}

// A short-lived access token can be renewed without asking for the password
// again. A rejected refresh is an ordinary signed-out state, not a failure.
export async function refreshSession(config, refreshToken) {
  if (typeof refreshToken !== 'string' || !refreshToken) return null;
  try {
    return await request(config, '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', body: { refresh_token: refreshToken },
    });
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}

export async function sessionUser(config, token) {
  if (typeof token !== 'string' || !token) return null;
  try {
    return await request(config, '/auth/v1/user', { token });
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}

export async function signOut(config, token) {
  if (typeof token !== 'string' || !token) return;
  await request(config, '/auth/v1/logout', { method: 'POST', token });
}

export async function readWorkspace(config, userId) {
  const rows = await request(config,
    `/rest/v1/${encodeURIComponent(config.table)}?user_id=eq.${encodeURIComponent(userId)}&select=data`,
    { service: true });
  return Array.isArray(rows) && rows[0]?.data ? rows[0].data : null;
}

export async function writeWorkspace(config, userId, state) {
  await request(config, `/rest/v1/${encodeURIComponent(config.table)}`, {
    method: 'POST',
    service: true,
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: { user_id: userId, data: state, updated_at: new Date().toISOString() },
  });
}
