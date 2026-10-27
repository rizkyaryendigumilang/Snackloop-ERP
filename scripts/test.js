const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

console.log('=== [SNACKLOOP ERP - AUTOMATED TEST SUITE] ===\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  process.stdout.write(`TEST ${totalTests}: ${name} ... `);
  try {
    fn();
    console.log('PASSED [OK]');
    passedTests++;
  } catch (err) {
    console.log('FAILED [FAIL]');
    console.error(`  Error: ${err.message}`);
    process.exitCode = 1;
  }
}

const { bundle } = require('./bundle');

// 1. JavaScript Syntax & Modular Architecture Validation
runTest('Verify modular architecture assembly and module syntax', () => {
  bundle();
  const moduleFiles = fs.readdirSync(path.join(rootDir, 'src', 'modules')).filter(f => f.endsWith('.js'));
  if (moduleFiles.length < 10) throw new Error(`Expected at least 10 modules, found ${moduleFiles.length}`);
  for (const mod of moduleFiles) {
    execSync(`node --check src/modules/${mod}`, { cwd: rootDir, stdio: 'pipe' });
  }
});

runTest('Verify assembled script.js syntax', () => {
  execSync('node --check script.js', { cwd: rootDir, stdio: 'pipe' });
});

runTest('Verify sw.js syntax', () => {
  execSync('node --check sw.js', { cwd: rootDir, stdio: 'pipe' });
});

runTest('Verify build.js syntax', () => {
  execSync('node --check scripts/build.js', { cwd: rootDir, stdio: 'pipe' });
});

// 2. Core Web Files Verification
runTest('Verify core files exist and are non-empty', () => {
  const coreFiles = ['index.html', 'script.js', 'style.css', 'sw.js', 'manifest.json'];
  for (const file of coreFiles) {
    const fullPath = path.join(rootDir, file);
    if (!fs.existsSync(fullPath)) throw new Error(`Missing ${file}`);
    const stat = fs.statSync(fullPath);
    if (stat.size === 0) throw new Error(`${file} is empty`);
  }
});

// 3. PWA Manifest Verification
runTest('Validate manifest.json schema and icons', () => {
  const manifestRaw = fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestRaw);
  if (!manifest.name) throw new Error('manifest.json missing name');
  if (!manifest.start_url) throw new Error('manifest.json missing start_url');
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    throw new Error('manifest.json must have icons array');
  }
});

// 4. Capacitor Mobile Configuration
runTest('Validate capacitor.config.json', () => {
  const capRaw = fs.readFileSync(path.join(rootDir, 'capacitor.config.json'), 'utf8');
  const cap = JSON.parse(capRaw);
  if (cap.appId !== 'com.snackloop.erp') {
    throw new Error(`Unexpected appId: ${cap.appId}`);
  }
  if (cap.webDir !== 'dist') {
    throw new Error(`Unexpected webDir: ${cap.webDir}`);
  }
});

// 5. Android & iOS Project Structure
runTest('Verify native Android and iOS wrapper directories', () => {
  const androidManifest = path.join(rootDir, 'android/app/src/main/AndroidManifest.xml');
  const iosProject = path.join(rootDir, 'ios/App/App.xcodeproj/project.pbxproj');
  if (!fs.existsSync(androidManifest)) throw new Error('Missing AndroidManifest.xml');
  if (!fs.existsSync(iosProject)) throw new Error('Missing iOS Xcode project');
});

const { validateAssets } = require('./validate-assets');

// 6. HTML and Manifest Referenced Assets Integrity (Root)
runTest('Verify all local assets referenced in HTML and Manifest exist (Root)', () => {
  const result = validateAssets(rootDir);
  if (result.errors.length > 0) {
    throw new Error(result.errors.join('; '));
  }
});

// 7. Build Output & Dist Assets Verification
runTest('Verify npm run build generates complete dist/ artifacts and valid assets', () => {
  execSync('node scripts/build.js', { cwd: rootDir, stdio: 'pipe' });
  const result = validateAssets(distDir);
  if (result.errors.length > 0) {
    throw new Error(`In dist: ${result.errors.join('; ')}`);
  }
});

// 8. Deployment & Rollback Failure Scenarios Simulation
runTest('Verify deployment & rollback failure scenarios (7 scenarios)', () => {
  execSync('node scripts/test-deploy-simulation.js', { cwd: rootDir, stdio: 'pipe' });
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
if (process.exitCode) {
  console.error('Test suite failed!');
  process.exit(1);
} else {
  console.log('All tests passed successfully!');
}
