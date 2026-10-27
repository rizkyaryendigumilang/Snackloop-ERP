const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'src', 'modules');
const outputScript = path.resolve(__dirname, '..', 'script.js');

function bundle() {
  if (!fs.existsSync(srcDir)) {
    throw new Error(`src/modules directory not found at: ${srcDir}`);
  }

  const moduleFiles = fs.readdirSync(srcDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  if (moduleFiles.length === 0) {
    throw new Error('No .js module files found in src/modules');
  }

  const chunks = [
    '// ==========================================================================',
    '// SnackLoop ERP - Modular Architecture Bundle',
    `// Generated on ${new Date().toISOString()} from ${moduleFiles.length} source modules in src/modules/`,
    '// ==========================================================================\n'
  ];

  for (const file of moduleFiles) {
    const filePath = path.join(srcDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    chunks.push(`// --- [MODULE: ${file}] ---`);
    chunks.push(content.trim());
    chunks.push('\n');
  }

  const bundled = chunks.join('\n');
  fs.writeFileSync(outputScript, bundled, 'utf8');
  console.log(`[bundle] Successfully assembled script.js from ${moduleFiles.length} modules (${bundled.length} bytes)`);
}

if (require.main === module) {
  bundle();
}

module.exports = { bundle };
