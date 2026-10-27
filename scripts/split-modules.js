const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'src', 'modules');
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir, { recursive: true });
}

const originalScript = fs.readFileSync(path.resolve(__dirname, '..', 'script.js'), 'utf8');
const lines = originalScript.split('\n');

const MODULE_BOUNDARIES = [
  { file: '01-config.js', start: 1, end: 41 },
  { file: '02-i18n.js', start: 42, end: 292 },
  { file: '03-ui-utils.js', start: 293, end: 435 },
  { file: '04-outbox.js', start: 436, end: 728 },
  { file: '05-modals.js', start: 729, end: 886 },
  { file: '06-auth.js', start: 887, end: 1395 },
  { file: '07-agents.js', start: 1396, end: 1474 },
  { file: '08-users.js', start: 1475, end: 1580 },
  { file: '09-master.js', start: 1581, end: 1841 },
  { file: '10-repack.js', start: 1842, end: 1945 },
  { file: '11-transactions.js', start: 1946, end: 3037 },
  { file: '12-reports.js', start: 3038, end: 3888 },
  { file: '13-returns.js', start: 3889, end: 4550 },
  { file: '14-pwa.js', start: 4551, end: 4724 },
  { file: '15-settings.js', start: 4725, end: 4914 },
  { file: '16-printer.js', start: 4915, end: lines.length }
];

console.log('[split-modules] Extracting modules from script.js into src/modules/...');
for (const mod of MODULE_BOUNDARIES) {
  const modLines = lines.slice(mod.start - 1, mod.end);
  const modContent = modLines.join('\n');
  const destPath = path.join(srcDir, mod.file);
  fs.writeFileSync(destPath, modContent, 'utf8');
  console.log(`  ✔ Extracted ${mod.file} (lines ${mod.start}-${mod.end}, ${modLines.length} lines, ${modContent.length} bytes)`);
}

console.log('[split-modules] Successfully split into', MODULE_BOUNDARIES.length, 'modules!');
