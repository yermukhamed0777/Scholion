// Resolve how the local app server binds. Local development keeps the server
// on loopback, while a hosted runtime that supplies PORT listens on all
// interfaces so a reverse proxy can reach it.
export function resolveServerConfig(env = {}, argv = []) {
  const port = Number(env.PORT ?? argv[0] ?? 4173);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new RangeError('Use a port between 0 and 65535.');
  }
  const host = env.HOST || (env.PORT ? '0.0.0.0' : '127.0.0.1');
  return { host, port };
}
