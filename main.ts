// main.ts — entry program for SOLARA HEAT (make.fun gta6-01).
// Node 22, standard library only. Copies game/ and screenshots/ from this
// repository to /output and writes /output/dossier.json describing the game.
// Run locally: MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const ROOT = process.cwd();

function listFiles(dir, base) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...listFiles(p, base + '/' + name));
    else out.push({ path: base + '/' + name, bytes: st.size });
  }
  return out;
}

function main() {
  mkdirSync(OUT, { recursive: true });
  const gameDir = join(ROOT, 'game');
  const shotsDir = join(ROOT, 'screenshots');
  if (!existsSync(gameDir)) throw new Error('game/ not found');
  cpSync(gameDir, join(OUT, 'game'), { recursive: true });
  if (existsSync(shotsDir)) cpSync(shotsDir, join(OUT, 'screenshots'), { recursive: true });
  const gameFiles = listFiles(gameDir, 'game');
  const shotFiles = existsSync(shotsDir) ? listFiles(shotsDir, 'screenshots') : [];
  const sources = [];
  for (const f of gameFiles) {
    if (/\.(html|js|mjs|css)$/.test(f.path) && !f.path.includes('/vendor/')) {
      sources.push({ path: f.path, bytes: f.bytes, text: readFileSync(join(ROOT, f.path), 'utf8').slice(0, 20000) });
    }
  }
  const dossier = {
    title: 'SOLARA HEAT',
    game: 'SOLARA HEAT — original open-world crime game in Solara Coast',
    files: { game: gameFiles, screenshots: shotFiles },
    sources,
    totals: {
      gameFiles: gameFiles.length,
      gameBytes: gameFiles.reduce((a, f) => a + f.bytes, 0),
      screenshots: shotFiles.length
    }
  };
  writeFileSync(join(OUT, 'dossier.json'), JSON.stringify(dossier, null, 2) + '\n');
  console.log('wrote ' + OUT + ' gameFiles=' + gameFiles.length + ' screenshots=' + shotFiles.length);
}
main();
