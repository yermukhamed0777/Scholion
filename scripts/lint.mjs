// Dependency-free lint gate: syntax plus the project's publish-safety rules.
// It intentionally avoids a network install so `npm ci` alone is sufficient.

import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const directories = ['dist', 'scripts', 'api', 'tests'];
const sourceExtensions = new Set(['.js', '.mjs']);
const problems = [];

async function sourceFiles() {
  const files = [];
  for (const directory of directories) {
    for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
      if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
        files.push(join(directory, entry.name));
      }
    }
  }
  return files;
}

const files = await sourceFiles();
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', join(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) problems.push(`${file}: ${result.stderr.trim()}`);
}

for (const file of ['dist/app.js', 'dist/study.js', 'dist/index.html']) {
  const source = await readFile(join(root, file), 'utf8');
  for (const forbidden of ['SUPABASE_SERVICE_ROLE_KEY', 'OLLAMA_URL']) {
    if (source.includes(forbidden)) problems.push(`${file}: browser bundle exposes ${forbidden}`);
  }
  if (/sk-[A-Za-z0-9]{16,}/.test(source)) problems.push(`${file}: browser bundle contains a credential-like token`);
  if (file === 'dist/index.html' && !/<html\s+lang="en"/.test(source)) {
    problems.push('dist/index.html: missing document language');
  }
}

for (const file of files.filter(name => name.startsWith('scripts/'))) {
  const source = await readFile(join(root, file), 'utf8');
  for (const line of source.split(/\r?\n/)) {
    if (/console\.(log|error|warn|info|debug)\s*\(/.test(line) &&
        !/Scholion is available|Port \$\{port\} is already in use/.test(line)) {
      problems.push(`${file}: unexpected console call: ${line.trim()}`);
    }
  }
}

if (problems.length) {
  console.error('Lint failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`Lint passed: ${files.length} JavaScript files checked; browser bundles carry no server secrets.`);
}
