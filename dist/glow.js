// Restrained pointer-follow glow for interactive cards. The glow is a visual
// accent only: it is enabled for fine pointers, disabled for reduced motion,
// and never replaces the keyboard focus outline.

const defaultMediaQuery = query =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query)
    : { matches: false };

const clamp = value => Math.max(0, Math.min(100, value));

export function canUsePointerGlow(mediaQuery = defaultMediaQuery) {
  return typeof mediaQuery === 'function' &&
    mediaQuery('(hover: hover) and (pointer: fine)').matches &&
    !mediaQuery('(prefers-reduced-motion: reduce)').matches;
}

export function glowPosition(event, card) {
  const rect = typeof card.getBoundingClientRect === 'function'
    ? card.getBoundingClientRect()
    : { left: 0, top: 0, width: 0, height: 0 };
  const x = rect.width ? ((event.clientX - rect.left) / rect.width) * 100 : 50;
  const y = rect.height ? ((event.clientY - rect.top) / rect.height) * 100 : 50;
  return { x: clamp(x), y: clamp(y) };
}

function clearGlow(root) {
  root.querySelectorAll('[data-glowing="true"]').forEach(card => {
    delete card.dataset.glowing;
    card.style.removeProperty('--glow-x');
    card.style.removeProperty('--glow-y');
  });
}

export function bindPointerGlow(root, mediaQuery = defaultMediaQuery) {
  if (!root || !canUsePointerGlow(mediaQuery)) return () => {};

  const onMove = event => {
    const card = event.target?.closest?.('[data-glow]');
    if (!card || !root.contains(card)) {
      clearGlow(root);
      return;
    }
    const { x, y } = glowPosition(event, card);
    card.style.setProperty('--glow-x', `${x.toFixed(1)}%`);
    card.style.setProperty('--glow-y', `${y.toFixed(1)}%`);
    if (card.dataset.glowing !== 'true') {
      clearGlow(root);
      card.dataset.glowing = 'true';
    }
  };
  const onLeave = () => clearGlow(root);

  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerleave', onLeave);
  return () => {
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerleave', onLeave);
    clearGlow(root);
  };
}
