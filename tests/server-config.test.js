import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveServerConfig } from '../scripts/server-config.js';

test('local development binds loopback on the default port', () => {
  assert.deepEqual(resolveServerConfig(), { host: '127.0.0.1', port: 4173 });
  assert.deepEqual(resolveServerConfig({}, ['5180']), { host: '127.0.0.1', port: 5180 });
});

test('a hosted PORT binds all interfaces for the reverse proxy', () => {
  assert.deepEqual(resolveServerConfig({ PORT: '8080' }, []), { host: '0.0.0.0', port: 8080 });
});

test('PORT takes priority over a positional argument', () => {
  assert.deepEqual(resolveServerConfig({ PORT: '9000' }, ['5180']), { host: '0.0.0.0', port: 9000 });
});

test('an explicit HOST overrides the default', () => {
  assert.deepEqual(resolveServerConfig({ HOST: '127.0.0.1', PORT: '8080' }, []), { host: '127.0.0.1', port: 8080 });
});

test('invalid ports are rejected with a clear error', () => {
  assert.throws(() => resolveServerConfig({}, ['not-a-port']), RangeError);
  assert.throws(() => resolveServerConfig({}, ['70000']), RangeError);
  assert.throws(() => resolveServerConfig({ PORT: '-1' }, []), RangeError);
});
