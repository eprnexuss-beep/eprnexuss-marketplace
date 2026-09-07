const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const FROM = 'EPR Nexus';
const TO = 'EPR Nexuss';

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage'
]);
const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json',
  '.md', '.txt', '.env', '.example', '.yml', '.yaml', '.xml', '.svg'
]);

let changedFiles = 0;
let replacements = 0;

function shouldRead(file) {
  const base = path.basename(file);
  return TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()) ||
    base === '.env' || base === '.env.example';
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.isFile() || !shouldRead(full)) continue;

    let text;
    try {
      text = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }

    const count = text.split(FROM).length - 1;
    if (!count) continue;

    fs.writeFileSync(full, text.replaceAll(FROM, TO), 'utf8');
    changedFiles += 1;
    replacements += count;
    console.log(`Updated ${path.relative(ROOT, full)} (${count} replacement${count === 1 ? '' : 's'})`);
  }
}

console.log(`Applying company branding: "${FROM}" -> "${TO}"`);
walk(ROOT);
console.log(`\nDone. ${replacements} replacement${replacements === 1 ? '' : 's'} across ${changedFiles} file${changedFiles === 1 ? '' : 's'}.`);
console.log('Internal names such as EPR-Nexus and database identifiers were intentionally left unchanged.');
