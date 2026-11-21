// Nightjar — hand-in program (Node 22, standard library only).
//
// Copies this repository's game/ and screenshots/ into the output
// directory and writes /output/dossier.json with the vendored make.fun
// library, so the sealed scorer can check the entry. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The output directory itself is never removed: its contents are
// cleared entry by entry first, so a second run writes exactly the
// same bytes as the first.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Make sure the output directory exists, then empty it entry by entry.
// The directory itself stays put: the grader owns it, we only own
// what is inside it.
mkdirSync(out, { recursive: true });
for (const entry of readdirSync(out)) {
  rmSync(join(out, entry), { recursive: true, force: true });
}

// Hand in the game and its screenshots.
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The dossier the judge reads, written by the kit's library from the
// files we just copied. The caps mirror the scorer's own limits so a
// hand-in that passes here passes there.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Nightjar handed in to ${out}`);
