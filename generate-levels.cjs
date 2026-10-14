
const fs = require('fs');
const path = require('path');

const levelsDirectory = path.join(__dirname, 'levels');

const files = fs.readdirSync(levelsDirectory);

const discoveredLevels = {};

const pattern = /^(\d+)-(\d+)-(\d+)\.png$/i;

for (const file of files) {
  const match = file.match(pattern);

  if (!match) continue;

  const land = Number(match[1]);
  const area = Number(match[2]);
  const level = Number(match[3]);

  const key = `${land}-${area}`;

  if (!discoveredLevels[key]) {
    discoveredLevels[key] = [];
  }

  discoveredLevels[key].push({
    number: level,
    path: `levels/${file}`
  });
}

// Sort levels numerically
for (const key in discoveredLevels) {
  discoveredLevels[key].sort(
    (a, b) => a.number - b.number
  );
}

// Generate manifest
fs.writeFileSync(
  path.join(__dirname, 'level-manifest.json'),
  JSON.stringify(discoveredLevels, null, 2)
);

console.log('Level manifest generated successfully!');
