// Usage: node generate-levels.cjs          (run once)
//        node generate-levels.cjs --watch  (re-run whenever levels/ changes)
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONFIG = path.join(ROOT, 'levels.json');
const MANIFEST = path.join(ROOT, 'level-manifest.json');
const NAME = /^(\d+)-(\d+)-(\d+)\.png$/i;          // LAND-AREA-LEVEL.png

function readConfig() {
  if (!fs.existsSync(CONFIG))
    return {musicUnlocks:[0,10,25,45], levelDirectory:'levels/', lands:[]};
  return JSON.parse(fs.readFileSync(CONFIG, 'utf8'));   // throws on bad JSON so nothing gets overwritten
}
const levelDir = config => (config.levelDirectory || 'levels/').replace(/\\/g, '/').replace(/\/?$/, '/');

function writeIfChanged(file, data) {
  const text = JSON.stringify(data, null, 2) + '\n';
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return false;
  fs.writeFileSync(file, text);
  return true;
}

function build() {
  const config = readConfig();
  config.lands = config.lands || [];
  const dir = levelDir(config);

  // 1. scan PNGs
  const found = {}, maxA = {};
  let maxL = 0;
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    const m = NAME.exec(f); if (!m) continue;
    const [L, A, N] = [+m[1], +m[2], +m[3]];
    if (L < 1 || A < 1 || N < 1) continue;
    (found[`${L}-${A}`] ||= []).push({number:N, path:dir + f});
    maxL = Math.max(maxL, L);
    maxA[L] = Math.max(maxA[L] || 0, A);
  }

  // 2. manifest, sorted by land, area, level
  const manifest = {};
  Object.keys(found)
    .sort((a, b) => { const [al, aa] = a.split('-').map(Number), [bl, ba] = b.split('-').map(Number); return al - bl || aa - ba; })
    .forEach(k => { manifest[k] = found[k].sort((a, b) => a.number - b.number); });

  // 3. add any new lands/areas to levels.json (existing entries are never changed or removed)
  const added = [];
  while (config.lands.length < maxL) {
    const n = config.lands.length + 1;
    config.lands.push({name:`Land ${n}`, areas:[{name:'Area 1'}]});
    added.push(`Land ${n}`);
  }
  for (let L = 1; L <= maxL; L++) {
    const land = config.lands[L-1];
    land.areas = land.areas || [];
    while (land.areas.length < (maxA[L] || 0)) {
      land.areas.push({name:`Area ${land.areas.length + 1}`});
      added.push(`${L}-${land.areas.length}`);
    }
    for (let A = 1; A <= land.areas.length; A++)
      if (!manifest[`${L}-${A}`]) console.warn(`Warning: no levels for ${L}-${A}; it will block later areas.`);
  }

  const m = writeIfChanged(MANIFEST, manifest);
  const c = writeIfChanged(CONFIG, config);
  const count = Object.values(manifest).reduce((a, l) => a + l.length, 0);
  console.log(`${count} levels found.` + (m ? ' level-manifest.json updated.' : '') +
    (c ? ` levels.json updated (added ${added.join(', ') || 'formatting only'}).` : '') +
    (!m && !c ? ' Nothing to change.' : ''));
}

function safeBuild() { try { build(); } catch (e) { console.error('Generate failed:', e.message); } }

if (process.argv.includes('--watch')) {
  safeBuild();
  const watchDir = path.join(ROOT, levelDir(readConfig()));
  let t;
  fs.watch(watchDir, () => { clearTimeout(t); t = setTimeout(safeBuild, 300); });
  console.log('Watching ' + watchDir + ' (Ctrl+C to stop)');
} else build();