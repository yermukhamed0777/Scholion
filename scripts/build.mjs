// Static build gate. The browser app is already plain ES modules, so the build
// validates the deployable entrypoints and emits a content manifest without
// copying private material or requiring a bundler.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = join(root, 'build');
const shell = await readFile(join(root, 'dist/index.html'), 'utf8');
const referenced = [...shell.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)].map(match => match[1]);
const missing = [];

for (const file of referenced) {
  try {
    await readFile(join(root, 'dist', file));
  } catch {
    missing.push(`dist/${file}`);
  }
}

const manifestFiles = ['dist/index.html', ...referenced.map(file => `dist/${file}`)];
const manifest = {
  target: 'dist',
  generatedAt: new Date().toISOString(),
  files: [],
};
for (const file of [...new Set(manifestFiles)]) {
  const content = await readFile(join(root, file));
  manifest.files.push({
    path: file,
    bytes: content.length,
    sha256: createHash('sha256').update(content).digest('hex'),
  });
}

if (missing.length) {
  console.error(`Build failed: missing referenced files: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Build passed: ${manifest.files.length} deployable files; manifest written to build/manifest.json.`);
}
