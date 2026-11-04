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

// 9. Codebase Hygiene & CSS Restraint Verification (Ponytail / Superpowers)
runTest('Verify zero duplicate top-level functions in script.js and no transition:all in style.css', () => {
  const scriptCode = fs.readFileSync(path.join(rootDir, 'script.js'), 'utf8');
  const fnRegex = /^(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/gm;
  const counts = {};
  let m;
  while ((m = fnRegex.exec(scriptCode)) !== null) {
    counts[m[1]] = (counts[m[1]] || 0) + 1;
  }
  const dupes = Object.entries(counts).filter(([, c]) => c > 1).map(([name, c]) => `${name} (${c}x)`);
  if (dupes.length > 0) {
    throw new Error(`Duplicate top-level functions found: ${dupes.join(', ')}`);
  }

  const cssCode = fs.readFileSync(path.join(rootDir, 'style.css'), 'utf8');
  if (/transition\s*:[^;]*\ball\b/i.test(cssCode)) {
    throw new Error('Found forbidden transition: ... all in style.css');
  }
});

// 13. Unit Tests for Core Utilities, Date/Phone Helpers, Financial Math & Auth Guardrails
runTest('Verify core unit logic (month sorting, WA phone normalization, local date, auth safety)', () => {
  const assert = require('assert');
  const vm = require('vm');
  const modulesDir = path.join(rootDir, 'src', 'modules');
  const uiUtilsCode = fs.readFileSync(path.join(modulesDir, '03-ui-utils.js'), 'utf8');
  const authCode = fs.readFileSync(path.join(modulesDir, '06-auth.js'), 'utf8');

  // Ensure loadDataFromCloud does not auto-recreate hardcoded default credentials
  const loadCloudIdx = authCode.indexOf('async function loadDataFromCloud()');
  const loadCloudBody = loadCloudIdx !== -1 ? authCode.slice(loadCloudIdx, loadCloudIdx + 2500) : '';
  if (loadCloudBody.includes("hashPassword('123456')") || loadCloudBody.includes("hashPassword('password123')")) {
    throw new Error('Hardcoded default credential auto-insert found in loadDataFromCloud()');
  }

  // Evaluate pure helper functions from 03-ui-utils.js in an isolated VM context
  const sandbox = {
    Date,
    Math,
    String,
    Array,
    Object,
    parseInt,
    isNaN,
    document: { addEventListener: () => {} },
    window: {}
  };
  vm.createContext(sandbox);
  vm.runInContext(uiUtilsCode, sandbox);

  // Test parseMonthKey & sortMonthKeys
  assert.strictEqual(sandbox.parseMonthKey('Jan 2026'), 2026 * 12 + 0);
  assert.strictEqual(sandbox.parseMonthKey('Nov 2026'), 2026 * 12 + 10);
  const unsorted = ['Nov 2026', 'Mar 2026', 'Des 2025', 'Apr 2026'];
  assert.deepStrictEqual(Array.from(sandbox.sortMonthKeys(unsorted, true)), ['Des 2025', 'Mar 2026', 'Apr 2026', 'Nov 2026']);
  assert.deepStrictEqual(Array.from(sandbox.sortMonthKeys(unsorted, false)), ['Nov 2026', 'Apr 2026', 'Mar 2026', 'Des 2025']);

  // Test normalizeWaPhone
  assert.strictEqual(sandbox.normalizeWaPhone('0812-3456-7890'), '6281234567890');
  assert.strictEqual(sandbox.normalizeWaPhone('+62 812 3456 7890'), '6281234567890');
  assert.strictEqual(sandbox.normalizeWaPhone('', '0811-2233-4455'), '6281122334455');

  // Test getLocalDateStr
  const localSample = new Date(2026, 10, 5, 0, 30, 0); // 5 Nov 2026 00:30 local time
  assert.strictEqual(sandbox.getLocalDateStr(localSample), '2026-11-05');
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
if (process.exitCode) {
  console.error('Test suite failed!');
  process.exit(1);
} else {
  console.log('All tests passed successfully!');
}
