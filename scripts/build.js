const fs = require('fs');
const path = require('path');
const { bundle } = require('./bundle');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

const EXCLUDED = new Set([
  'node_modules',
  'android',
  'ios',
  'dist',
  'src',
  '.git',
  '.github',
  '.gitignore',
  '.vscode',
  '.idea',
  'scripts',
  'package.json',
  'package-lock.json',
  'capacitor.config.json',
  'capacitor.config.ts',
  'capacitor.config.js',
  'Customer',
  'Data Penjualan'
]);

function build() {
  console.log('[build] Assembling modular JavaScript architecture...');
  bundle();

  console.log('[build] Cleaning dist directory...');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  const entries = fs.readdirSync(rootDir);
  for (const entry of entries) {
    if (EXCLUDED.has(entry)) continue;

    const srcPath = path.join(rootDir, entry);
    const destPath = path.join(distDir, entry);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true });
      console.log(`[build] Copied directory: ${entry}`);
    } else if (stat.isFile()) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`[build] Copied file: ${entry}`);
    }
  }

  console.log('[build] Build completed successfully into dist/');
}

build();
