import { cp, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(rootDir, 'dist');

const copies = [
  ['script.js', 'script.js'],
  ['script.en.js', 'script.en.js'],
  ['modelscope-static/script.js', 'modelscope-static/script.js']
];

for (const [source, target] of copies) {
  const sourcePath = join(rootDir, source);
  const targetPath = join(distDir, target);
  await mkdir(dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath, { force: true });
}
