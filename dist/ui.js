const icons = {
  orbit: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-35 12 12)"/><circle cx="19.5" cy="5.4" r="1.45" fill="currentColor" stroke="none"/>',
  'layout-dashboard': '<rect x="3" y="3" width="8" height="11" rx="1.6"/><rect x="15" y="3" width="6" height="6" rx="1.6"/><rect x="3" y="18" width="8" height="3" rx="1.2"/><rect x="15" y="13" width="6" height="8" rx="1.6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  sparkle: '<path d="M12 2.5c.8 5.3 4.2 8.7 9.5 9.5-5.3.8-8.7 4.2-9.5 9.5C11.2 16.2 7.8 12.8 2.5 12c5.3-.8 8.7-4.2 9.5-9.5Z"/>',
  sparkles: '<path d="M11 3c.7 4.5 3.5 7.3 8 8-4.5.7-7.3 3.5-8 8-.7-4.5-3.5-7.3-8-8 4.5-.7 7.3-3.5 8-8ZM19 2v5m2.5-2.5h-5M20 16v5m2.5-2.5h-5"/>',
  'folder-open': '<path d="M3 19V6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v2M3 19l2.5-8h15.1a1 1 0 0 1 1 1.25L19 19H3Z"/>',
  folder: '<path d="M3 7V6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
  'clipboard-list': '<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V3h6v2M9 11h6m-6 4h6"/>',
  'list-checks': '<path d="m3 6 1.5 1.5L7 5m-4 7 1.5 1.5L7 11m-4 7 1.5 1.5L7 17m4-11h10m-10 6h10m-10 6h10"/>',
  'chart-no-axes-column': '<path d="M5 20v-5m7 5V9m7 11V4"/>',
  'bar-chart-3': '<path d="M4 4v16h16M9 16v-3m5 3V9m5 7V6"/>',
  'arrow-up-right': '<path d="M7 17 17 7M7 7h10v10"/>',
  'arrow-left': '<path d="m12 5-7 7 7 7m-7-7h14"/>',
  'arrow-right': '<path d="m12 5 7 7-7 7m7-7H5"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'book-open': '<path d="M12 7v13m0-13C9 5 5 5 3 6v13c3-1 6-1 9 1 3-2 6-2 9-1V6c-2-1-6-1-9 1Z"/>',
  'book-open-text': '<path d="M12 7v13m0-13C9 5 5 5 3 6v13c3-1 6-1 9 1 3-2 6-2 9-1V6c-2-1-6-1-9 1ZM6 9l3 1m-3 3 3 1m6-4 3-1m-3 5 3-1"/>',
  'graduation-cap': '<path d="m2 9 10-5 10 5-10 5-10-5Zm4 2v5c3 3 9 3 12 0v-5m4-2v6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  'map-pin': '<path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/>',
  languages: '<path d="M3 5h12m-6-2v2M5 8c2 4 5 6 9 7M13 5c-1 5-4 8-10 11m11 5 4-9 4 9m-6.7-3h5.4"/>',
  calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 8h7m-7 4h.1m3.4 0h.1m3.4 0h.1m-7.1 4h.1m3.4 0h.1m3.4 0h.1"/>',
  bookmark: '<path d="M6 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16l-6-4-6 4V5Z"/>',
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  'circle-check': '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
  'circle-help': '<circle cx="12" cy="12" r="9"/><path d="M10 9a2 2 0 1 1 3.4 1.4c-.8.7-1.4 1-1.4 2.6m0 3h.01"/>',
  'file-text': '<path d="M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6m-6 4h6"/>',
  upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4"/>',
  'cloud-upload': '<path d="M6 17a4 4 0 0 1-.8-7.9A7 7 0 0 1 18.8 10a3.5 3.5 0 0 1-.3 7H17m-5 4v-9m-3 3 3-3 3 3"/>',
  'lightbulb': '<path d="M9 18h6m-5 3h4m-5-6c0-1-1.2-2-1.8-3a5.5 5.5 0 1 1 9.6 0C16.2 13 15 14 15 15H9Z"/>',
  'monitor': '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  'shield-check': '<path d="M12 2.5 20 6v5c0 5-4 8-8 10.5C8 19 4 16 4 11V6l8-3.5Z"/><path d="m8.5 12 2 2 5-5"/>',
};

const escapeCharacters = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => escapeCharacters[character]);
}

export function icon(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${Object.hasOwn(icons, name) ? icons[name] : icons['book-open']}</svg>`;
}
