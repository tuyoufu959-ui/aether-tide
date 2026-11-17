import { cpSync, mkdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const sourceRoot = fileURLToPath(new URL('.', import.meta.url));
const outputRoot = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
const within = (parent, child) => {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
};

if (outputRoot === resolve(sourceRoot) || ['game', 'screenshots', 'vendor'].some(name => within(join(sourceRoot, name), outputRoot))) {
  throw new Error('Choose an output directory separate from the source artifacts.');
}
mkdirSync(outputRoot, { recursive: true });
for (const name of ['game', 'screenshots']) {
  const source = join(sourceRoot, name);
  if (!statSync(source).isDirectory()) throw new Error(`Missing ${name}/ directory`);
  const target = join(outputRoot, name);
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true, dereference: false });
}
const dossier = buildDossier(outputRoot, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputRoot, 'dossier.json'), dossier);
console.log(`AETHER TIDE packaged: ${dossier.byteLength} dossier bytes → ${outputRoot}`);
