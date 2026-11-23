import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bindPointerGlow, canUsePointerGlow, glowPosition } from '../dist/glow.js';

function mediaQuery({ finePointer = true, reducedMotion = false } = {}) {
  return query => ({
    matches: query.includes('pointer: fine') ? finePointer
      : query.includes('prefers-reduced-motion') ? reducedMotion
      : false,
  });
}

test('glow is limited to fine pointers without reduced motion', () => {
  assert.equal(canUsePointerGlow(mediaQuery()), true);
  assert.equal(canUsePointerGlow(mediaQuery({ finePointer: false })), false);
  assert.equal(canUsePointerGlow(mediaQuery({ reducedMotion: true })), false);
  assert.equal(canUsePointerGlow(undefined), false);
});

test('glow position maps a pointer to card-relative percentages', () => {
  const card = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 200, height: 100 }) };
  assert.deepEqual(glowPosition({ clientX: 200, clientY: 100 }, card), { x: 50, y: 50 });
  assert.deepEqual(glowPosition({ clientX: 100, clientY: 50 }, card), { x: 0, y: 0 });
  assert.deepEqual(glowPosition({ clientX: 300, clientY: 150 }, card), { x: 100, y: 100 });
});

test('glow position clamps pointers outside the card', () => {
  const card = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) };
  assert.deepEqual(glowPosition({ clientX: -50, clientY: 200 }, card), { x: 0, y: 100 });
});

test('glow position falls back to center when the card has no box', () => {
  assert.deepEqual(glowPosition({ clientX: 10, clientY: 20 }, {}), { x: 50, y: 50 });
});

test('bindPointerGlow ignores unsupported devices without attaching listeners', () => {
  const attached = new Set();
  const root = {
    addEventListener: type => attached.add(type),
    removeEventListener: () => {},
  };
  const unbind = bindPointerGlow(root, mediaQuery({ finePointer: false }));
  assert.equal(attached.size, 0);
  assert.equal(typeof unbind, 'function');
  unbind();
});
