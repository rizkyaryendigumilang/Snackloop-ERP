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
    console.error(`  Error: ${err.message}\n  Stack: ${err.stack}`);
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

  // Test toggleNavbarCollapse exists on sandbox
  assert.strictEqual(typeof sandbox.toggleNavbarCollapse, 'function');

  // Verify outbox handles bulk transactions and invoice payload sanitization
  const outboxCode = fs.readFileSync(path.join(modulesDir, '04-outbox.js'), 'utf8');
  if (!outboxCode.includes("item.type === 'INSERT_BULK_TRANSACTIONS'") || !outboxCode.includes('syncInvoicePayloadToCloud')) {
    throw new Error('04-outbox.js is missing INSERT_BULK_TRANSACTIONS or syncInvoicePayloadToCloud handler');
  }

  // Verify sendWhatsAppOnly does not double-encode %0A with encodeURIComponent
  const trxCode = fs.readFileSync(path.join(modulesDir, '11-transactions.js'), 'utf8');
  const waIdx = trxCode.indexOf('async function sendWhatsAppOnly');
  const waBody = waIdx !== -1 ? trxCode.slice(waIdx, waIdx + 1400) : '';
  if (waBody.includes('%0A')) {
    throw new Error('sendWhatsAppOnly still contains literal %0A that would be double-encoded by encodeURIComponent');
  }

  // Verify hardcoded admin_kiky is removed from 06-auth.js, 04-outbox.js, and 08-users.js
  const usersCode = fs.readFileSync(path.join(modulesDir, '08-users.js'), 'utf8');
  if (authCode.includes('admin_kiky') || outboxCode.includes('admin_kiky') || usersCode.includes('admin_kiky')) {
    throw new Error('Hardcoded admin_kiky reference still present in auth/outbox/users modules');
  }

  // Verify flat INSERT_TRANSACTION payload support in 04-outbox.js
  if (!outboxCode.includes('item.payload.transaction || item.payload')) {
    throw new Error('04-outbox.js does not support flat INSERT_TRANSACTION payloads from dispatchOutboxMutation');
  }

  // Unit test computeJastipLandedCost from 13b-jastip.js
  const jastipCode = fs.readFileSync(path.join(modulesDir, '13b-jastip.js'), 'utf8');
  const jastipFnIdx = jastipCode.indexOf('function computeJastipLandedCost(params)');
  const jastipFnEnd = jastipCode.indexOf('// 3. Render Dashboard', jastipFnIdx);
  vm.runInContext(jastipCode.slice(jastipFnIdx, jastipFnEnd), sandbox);

  const calcFlat = sandbox.computeJastipLandedCost({
    qty: 2,
    priceValas: 1000,
    realRate: 100,
    catalogRate: 110,
    taxPercent: 10,
    taxRefundPercent: 10,
    opsPerItem: 10000,
    logisticsPerItem: 20000,
    customsPerItem: 0,
    feeType: 'flat',
    feeAmount: 30000
  });
  // Net valas = 1000 * 1.1 - 1000 * 0.1 = 1000 -> * 100 = 100,000 + 30,000 = 130,000 landed/item
  // Selling = 1000 * 1.1 * 110 (121,000) + 30,000 + 30,000 fee = 181,000/item
  assert.strictEqual(calcFlat.landedCostPerItem, 130000);
  assert.strictEqual(calcFlat.sellingPricePerItem, 181000);
  assert.strictEqual(calcFlat.totalSellingPrice, 362000);
  assert.strictEqual(calcFlat.totalNetProfit, 102000);

  // Unit test getAllTransactions, findTransactionById & syncDailyInvoiceForCustomerDate
  const getAllIdx = uiUtilsCode.indexOf('function getAllTransactions()');
  const getAllEnd = uiUtilsCode.indexOf('function downloadBlobFile(', getAllIdx);
  vm.runInContext(uiUtilsCode.slice(getAllIdx, getAllEnd), sandbox);

  const syncInvIdx = trxCode.indexOf('function syncDailyInvoiceForCustomerDate(customerName, dateStr)');
  const syncInvEnd = trxCode.indexOf('function confirmDeleteTrx(id)', syncInvIdx);
  sandbox.invoiceData = [
    { id: 101, invoice_number: 'INV-001', customer_name: 'Toko Berkah', date: '2026-11-05', total_amount: 100000, status: 'Belum Lunas' }
  ];
  sandbox.transactionData = {
    'Nov 2026': [
      { id: 1, customer: 'Toko Berkah', date: '2026-11-05', totalSell: 100000, status: 'Lunas' },
      { id: 2, customer: 'Toko Berkah', date: '2026-11-05', totalSell: -25000, status: 'Lunas', isReturn: true }
    ]
  };
  assert.strictEqual(sandbox.getAllTransactions().length, 2);
  assert.strictEqual(sandbox.findTransactionById(2).totalSell, -25000);
  vm.runInContext(trxCode.slice(syncInvIdx, syncInvEnd), sandbox);

  const resUpdate = sandbox.syncDailyInvoiceForCustomerDate('Toko Berkah', '2026-11-05');
  assert.strictEqual(resUpdate.action, 'update');
  assert.strictEqual(sandbox.invoiceData[0].total_amount, 75000);
  assert.strictEqual(sandbox.invoiceData[0].status, 'Lunas');

  sandbox.transactionData['Nov 2026'] = [];
  const resDelete = sandbox.syncDailyInvoiceForCustomerDate('Toko Berkah', '2026-11-05');
  assert.strictEqual(resDelete.action, 'delete');
  assert.strictEqual(sandbox.invoiceData.length, 0);
});

// 14. Enterprise Security Contracts Verification (Bcrypt, P1 Column Isolation, & XSS Sanitization)
runTest('Verify Enterprise Security Contracts (Bcrypt RPC, P1 Column Isolation & XSS Sanitization)', () => {
  const assert = require('assert');
  const authSql = fs.readFileSync(path.join(rootDir, 'database', 'rpc_secure_auth.sql'), 'utf8');
  const dbImproveSql = fs.readFileSync(path.join(rootDir, 'database', 'backend_audit_improvements.sql'), 'utf8');
  const authCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '06-auth.js'), 'utf8');
  const uiUtilsCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '03-ui-utils.js'), 'utf8');

  // Verify pgcrypto extension and Bcrypt crypt usage in SQL
  assert.strictEqual(authSql.includes('CREATE EXTENSION IF NOT EXISTS pgcrypto'), true, 'Missing pgcrypto extension in rpc_secure_auth.sql');
  assert.strictEqual(authSql.includes("gen_salt('bf'"), true, 'Missing Bcrypt salt generation in rpc_secure_auth.sql');
  assert.strictEqual(authSql.includes('crypt('), true, 'Missing crypt verification in rpc_secure_auth.sql');

  // Verify DB Integrity CHECK and Foreign Key constraints
  assert.strictEqual(dbImproveSql.includes('chk_transactions_qty_nonzero'), true, 'Missing chk_transactions_qty_nonzero in backend_audit_improvements.sql');
  assert.strictEqual(dbImproveSql.includes('chk_repack_remaining_qty_nonnegative'), true, 'Missing chk_repack_remaining_qty_nonnegative in backend_audit_improvements.sql');
  assert.strictEqual(dbImproveSql.includes('fk_master_agent_id'), true, 'Missing fk_master_agent_id in backend_audit_improvements.sql');

  // Verify escapeHtml sanitizes <script>, quotes, & and handles non-strings
  const vm = require('vm');
  const sandbox = { 
    String, 
    escapeHtml: null, 
    document: { addEventListener: () => {} }, 
    window: {} 
  };
  const escapeIdx = uiUtilsCode.indexOf('function escapeHtml(str)');
  const escapeEnd = uiUtilsCode.indexOf('function generateId()', escapeIdx);
  vm.createContext(sandbox);
  vm.runInContext(uiUtilsCode.slice(escapeIdx, escapeEnd), sandbox);

  assert.strictEqual(sandbox.escapeHtml('<script>alert("XSS")</script>'), '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
  assert.strictEqual(sandbox.escapeHtml("Tom & Jerry's"), 'Tom &amp; Jerry&#039;s');
  assert.strictEqual(sandbox.escapeHtml(null), '');
  assert.strictEqual(sandbox.escapeHtml(123), '123');

  // Verify validateSessionTTL in 03-ui-utils.js (Session TTL & Auth Security)
  assert.strictEqual(uiUtilsCode.includes('function validateSessionTTL'), true, 'Missing validateSessionTTL in 03-ui-utils.js');
  const ttlSandbox = { Date, validateSessionTTL: null };
  const ttlIdx = uiUtilsCode.indexOf('function validateSessionTTL');
  const ttlEnd = uiUtilsCode.indexOf('// ======================= PENGGANTI', ttlIdx);
  vm.createContext(ttlSandbox);
  vm.runInContext(uiUtilsCode.slice(ttlIdx, ttlEnd), ttlSandbox);

  const now = Date.now();
  // Valid active session (< 7 days)
  assert.strictEqual(ttlSandbox.validateSessionTTL({ username: 'kasir_1', loginAt: now - 1000 }), true);
  // Expired session (> 7 days)
  assert.strictEqual(ttlSandbox.validateSessionTTL({ username: 'kasir_1', loginAt: now - (8 * 24 * 60 * 60 * 1000) }), false);
  // Invalid session payload
  assert.strictEqual(ttlSandbox.validateSessionTTL(null), false);
  assert.strictEqual(ttlSandbox.validateSessionTTL({}), false);
  assert.strictEqual(ttlSandbox.validateSessionTTL({ username: 'kasir' }), false);
});

// 15. Architecture Registry & Enterprise Namespace Encapsulation Verification
runTest('Verify Architecture Registry & Namespace Encapsulation (window.SnackLoop)', () => {
  const assert = require('assert');
  const configCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '01-config.js'), 'utf8');
  const authCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '06-auth.js'), 'utf8');

  // Verify window.SnackLoop has enterprise modules (security, api, actions)
  assert.strictEqual(configCode.includes("version: '2.6.0'"), true, 'SnackLoop registry version mismatch');
  assert.strictEqual(configCode.includes('security:'), true, 'SnackLoop registry missing security namespace');
  assert.strictEqual(configCode.includes('api:'), true, 'SnackLoop registry missing api namespace');
  assert.strictEqual(configCode.includes('actions:'), true, 'SnackLoop registry missing actions namespace');

  // Verify server-side pagination gateway is implemented
  assert.strictEqual(authCode.includes('async function fetchServerPaginatedTransactions'), true, 'Missing fetchServerPaginatedTransactions gateway');
});

// 16. Apple Design System & Fluid Motion Verification (WWDC Guidelines)
runTest('Verify Apple Design System (Spring Physics, Rubberband, Translucent Materials & Optical Typography)', () => {
  const assert = require('assert');
  const styleCss = fs.readFileSync(path.join(rootDir, 'style.css'), 'utf8');
  const uiUtilsCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '03-ui-utils.js'), 'utf8');

  // 1. Verify Apple CSS Timing, Materials & Optical Typography
  assert.strictEqual(styleCss.includes('--ease-apple-spring: cubic-bezier(0.16, 1, 0.3, 1)'), true, 'Missing --ease-apple-spring token in style.css');
  assert.strictEqual(styleCss.includes('--ease-apple-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)'), true, 'Missing --ease-apple-bounce token in style.css');
  assert.strictEqual(styleCss.includes('.apple-glass'), true, 'Missing .apple-glass class in style.css');
  assert.strictEqual(styleCss.includes('backdrop-filter: blur(20px) saturate(180%)'), true, 'Missing Apple standard frosted glass backdrop-filter');
  assert.strictEqual(styleCss.includes('.apple-display'), true, 'Missing .apple-display class in style.css');
  assert.strictEqual(styleCss.includes('letter-spacing: -0.02em'), true, 'Missing Apple optical negative tracking in style.css');
  assert.strictEqual(styleCss.includes('.btn-apple-press:active'), true, 'Missing .btn-apple-press instant touch feedback');
  assert.strictEqual(styleCss.includes('.apple-sheet-handle'), true, 'Missing .apple-sheet-handle class in style.css');
  assert.strictEqual(styleCss.includes('@media (prefers-reduced-transparency: reduce)'), true, 'Missing prefers-reduced-transparency accessibility block');

  // 2. Verify Apple Motion Math in ui-utils (rubberband, momentum projection, spring step)
  const vm = require('vm');
  const sandbox = {
    Math,
    navigator: { vibrate: () => true },
    window: { SnackLoop: {} },
    console: { log: () => {}, warn: () => {} }
  };
  vm.createContext(sandbox);

  // Extract AppleMotion block from uiUtilsCode
  const motionStart = uiUtilsCode.indexOf('// ======================= APPLE DESIGN MOTION & HAPTICS ENGINE ======================= //');
  assert.strictEqual(motionStart !== -1, true, 'Missing Apple Design Motion section in 03-ui-utils.js');
  
  vm.runInContext(uiUtilsCode.slice(motionStart), sandbox);
  const motion = sandbox.window.SnackLoop.AppleMotion;
  assert.strictEqual(typeof motion, 'object', 'AppleMotion namespace not attached to window.SnackLoop');

  // Verify Rubber-banding formula: (overshoot * dim * 0.55) / (dim + 0.55 * |overshoot|)
  const rbResult = motion.rubberband(100, 500, 0.55);
  const expectedRb = (100 * 500 * 0.55) / (500 + 0.55 * 100);
  assert.strictEqual(Math.abs(rbResult - expectedRb) < 0.0001, true, 'Rubberband formula output mismatch');
  assert.strictEqual(motion.rubberband(0, 500), 0, 'Rubberband with zero overshoot should be 0');
  assert.strictEqual(motion.rubberband(-100, 500) < 0, true, 'Negative overshoot should maintain negative sign');

  // Verify Momentum Projection formula: (v / 1000) * d / (1 - d)
  const projResult = motion.projectMomentum(1000, 0.998);
  const expectedProj = (1000 / 1000) * 0.998 / (1 - 0.998); // 499
  assert.strictEqual(Math.abs(projResult - expectedProj) < 0.0001, true, 'Momentum projection formula mismatch');

  // Verify Haptic trigger
  let vibrateCalled = false;
  sandbox.navigator.vibrate = (pattern) => { vibrateCalled = true; return true; };
  motion.triggerHaptic('light');
  assert.strictEqual(vibrateCalled, true, 'triggerHaptic failed to call navigator.vibrate');

  // 3. Verify HTML and Modal Gesture Integration
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  assert.strictEqual(indexHtml.includes('apple-header'), true, 'index.html main header must include apple-header class');
  assert.strictEqual(indexHtml.includes('class="apple-sheet-handle sm:hidden"'), true, 'index.html missing apple-sheet-handle for mobile modals');
  assert.strictEqual(styleCss.includes('.apple-sheet-handle'), true, 'style.css must define .apple-sheet-handle');
  const modalsCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '05-modals.js'), 'utf8');
  assert.strictEqual(modalsCode.includes('attachModalSwipeDismiss'), true, '05-modals.js must implement attachModalSwipeDismiss');
});

// 17. Phase 1 Enhancements (Master Stock, POS Cash Calculator, Web Locks & Dual Valuation)
runTest('Verify Phase 1 Enhancements (Master Stock Tracking, POS Cash Calculator & Multi-Tab Web Locks)', () => {
  const assert = require('assert');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const masterCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '09-master.js'), 'utf8');
  const trxCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '11-transactions.js'), 'utf8');
  const outboxCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '04-outbox.js'), 'utf8');
  const reportsCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '12-reports.js'), 'utf8');
  const printerCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '16-printer.js'), 'utf8');
  const sqlCode = fs.readFileSync(path.join(rootDir, 'database', 'phase1_master_stock_improvements.sql'), 'utf8');

  // 1. Database schema migration file exists
  assert.strictEqual(sqlCode.includes('stock_qty INT DEFAULT 0'), true, 'Missing stock_qty column in migration SQL');
  assert.strictEqual(sqlCode.includes('min_stock INT DEFAULT 5'), true, 'Missing min_stock column in migration SQL');

  // 2. HTML elements for Master Stock & POS Cash Calculator
  assert.strictEqual(indexHtml.includes('id="m-stock"'), true, 'index.html missing m-stock input');
  assert.strictEqual(indexHtml.includes('id="edit-m-stock"'), true, 'index.html missing edit-m-stock input');
  assert.strictEqual(indexHtml.includes('id="t-cash-calculator-box"'), true, 'index.html missing t-cash-calculator-box');
  assert.strictEqual(indexHtml.includes('id="t-cash-tendered"'), true, 'index.html missing t-cash-tendered input');
  assert.strictEqual(indexHtml.includes('id="t-cash-change"'), true, 'index.html missing t-cash-change element');

  // 3. Master Stock logic in 09-master.js
  assert.strictEqual(masterCode.includes('stock_qty: stockQty'), true, '09-master.js missing stock_qty in INSERT_MASTER');
  assert.strictEqual(masterCode.includes('stock_qty: newStock'), true, '09-master.js missing stock_qty in UPDATE_MASTER');

  // 4. POS Cash Calculator & Stock Deduction in 11-transactions.js
  assert.strictEqual(trxCode.includes('calculateChangeDue'), true, '11-transactions.js missing calculateChangeDue');
  assert.strictEqual(trxCode.includes('toggleCashCalculatorVisibility'), true, '11-transactions.js missing toggleCashCalculatorVisibility');
  assert.strictEqual(trxCode.includes('mItem.stock_qty = Math.max(0, mItem.stock_qty - qty)'), true, '11-transactions.js missing optimistic master stock deduction');

  // 5. Multi-Tab Web Locks & Synchronous Beforeunload Cache in 04-outbox.js
  assert.strictEqual(outboxCode.includes('snackloop_outbox_sync_lock'), true, '04-outbox.js missing Web Locks guard');
  assert.strictEqual(outboxCode.includes('_executeSaveCache(true)'), true, '04-outbox.js missing _executeSaveCache(true) on immediate');
  assert.strictEqual(outboxCode.includes('if (forceSync) {'), true, '04-outbox.js missing forceSync check');

  // 6. Dual Inventory Valuation in 12-reports.js
  assert.strictEqual(reportsCode.includes('masterData.forEach'), true, '12-reports.js missing masterData valuation in renderReportInventory');

  // 7. Thermal Receipt printing of cash tendered & change due in 16-printer.js
  assert.strictEqual(printerCode.includes('Tunai/Bayar:'), true, '16-printer.js missing cash tendered receipt row');
  assert.strictEqual(printerCode.includes('Kembalian:'), true, '16-printer.js missing change due receipt row');
});

// 18. VPS Helpdesk SSO Handoff Integration (Endpoint, Direct Ticket Portal & Query Encoding)
runTest('Verify VPS Helpdesk SSO Handoff Integration (Endpoint, Direct Ticket Portal & Query Encoding)', () => {
  const assert = require('assert');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const settingsCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '15-settings.js'), 'utf8');

  // 1. Verify UI entry points and Helpdesk Modal elements
  assert.strictEqual(indexHtml.includes('id="btn-header-helpdesk"'), true, 'index.html missing #btn-header-helpdesk in navbar');
  assert.strictEqual(indexHtml.includes('id="btn-helpdesk"'), true, 'index.html missing #btn-helpdesk in sidebar');
  assert.strictEqual(indexHtml.includes('openHelpdeskTicket()'), true, 'index.html missing openHelpdeskTicket call');
  assert.strictEqual(indexHtml.includes('openHelpdeskModal()'), true, 'index.html missing openHelpdeskModal call');
  assert.strictEqual(indexHtml.includes('id="modal-helpdesk-report"'), true, 'index.html missing #modal-helpdesk-report');
  assert.strictEqual(indexHtml.includes('id="helpdesk-modal-photo"'), true, 'index.html missing #helpdesk-modal-photo');
  assert.strictEqual(indexHtml.includes('id="helpdesk-photo-preview"'), true, 'index.html missing #helpdesk-photo-preview');
  assert.strictEqual(indexHtml.includes('id="helpdesk-modal-description"'), true, 'index.html missing #helpdesk-modal-description');
  assert.strictEqual(indexHtml.includes('id="btn-submit-helpdesk-modal"'), true, 'index.html missing #btn-submit-helpdesk-modal');

  // 2. Verify settings module implementation
  assert.strictEqual(settingsCode.includes("baseUrl: 'https://43.156.236.102/helpdesk/handoff'"), true, 'HELPDESK_CONFIG baseUrl mismatch');
  assert.strictEqual(settingsCode.includes("appSlug: 'snackloop'"), true, 'HELPDESK_CONFIG appSlug mismatch');
  assert.strictEqual(settingsCode.includes('function dapatkanSesiPenggunaAktif'), true, 'Missing dapatkanSesiPenggunaAktif in 15-settings.js');
  assert.strictEqual(settingsCode.includes('function laporkanKendalaKeHelpdesk'), true, 'Missing laporkanKendalaKeHelpdesk in 15-settings.js');
  assert.strictEqual(settingsCode.includes('function buildHelpdeskUrl'), true, 'Missing buildHelpdeskUrl in 15-settings.js');
  assert.strictEqual(settingsCode.includes('function openHelpdeskTicket'), true, 'Missing openHelpdeskTicket in 15-settings.js');
  assert.strictEqual(settingsCode.includes('function openHelpdeskModal'), true, 'Missing openHelpdeskModal in 15-settings.js');
  assert.strictEqual(settingsCode.includes('function handleHelpdeskPhotoUpload'), true, 'Missing handleHelpdeskPhotoUpload in 15-settings.js');
  assert.strictEqual(settingsCode.includes('function removeHelpdeskPhoto'), true, 'Missing removeHelpdeskPhoto in 15-settings.js');
  assert.strictEqual(settingsCode.includes('function submitHelpdeskModal'), true, 'Missing submitHelpdeskModal in 15-settings.js');

  // 3. Test URL generator in VM sandbox
  const vm = require('vm');
  const sandbox = {
    window: { open: () => null, location: { href: 'https://snackloop.local/#pos' } },
    currentUser: 'admin_test',
    currentRole: 'super_admin',
    userData: [{ id: 42, username: 'admin_test', role: 'super_admin' }],
    sessionStorage: { getItem: () => null, setItem: () => {} },
    URLSearchParams: URLSearchParams
  };
  vm.createContext(sandbox);

  const scriptToRun = `
    ${settingsCode.slice(settingsCode.indexOf('const HELPDESK_CONFIG'))}
  `;
  vm.runInContext(scriptToRun, sandbox);

  // Test laporkanKendalaKeHelpdesk with auto_submit and medium priority
  const directReportUrl = sandbox.laporkanKendalaKeHelpdesk({
    subject: 'Barang tidak tampil di POS',
    description: 'Kategori basreng kosong',
    category: 'data_transaction',
    isUrgent: false,
    has_photo: true
  });
  const parsedDirect = new URL(directReportUrl);
  assert.strictEqual(parsedDirect.searchParams.get('app'), 'snackloop');
  assert.strictEqual(parsedDirect.searchParams.get('uid'), '42');
  assert.strictEqual(parsedDirect.searchParams.get('name'), 'admin_test');
  assert.strictEqual(parsedDirect.searchParams.get('role'), 'Owner (Super Admin)');
  assert.strictEqual(parsedDirect.searchParams.get('from_url'), 'https://snackloop.local/#pos');
  assert.strictEqual(parsedDirect.searchParams.get('new'), '1');
  assert.strictEqual(parsedDirect.searchParams.get('auto_submit'), '1');
  assert.strictEqual(parsedDirect.searchParams.get('subject'), 'Barang tidak tampil di POS');
  assert.strictEqual(parsedDirect.searchParams.get('description'), 'Kategori basreng kosong');
  assert.strictEqual(parsedDirect.searchParams.get('category'), 'data_transaction');
  assert.strictEqual(parsedDirect.searchParams.get('priority'), 'medium');
  assert.strictEqual(parsedDirect.searchParams.get('has_photo'), '1');

  // Test laporkanKendalaKeHelpdesk with urgent priority
  const urgentReportUrl = sandbox.laporkanKendalaKeHelpdesk({
    subject: 'Gagal Login Server',
    description: 'Timeout koneksi Supabase',
    category: 'account_login',
    isUrgent: true
  });
  const parsedUrgent = new URL(urgentReportUrl);
  assert.strictEqual(parsedUrgent.searchParams.get('priority'), 'urgent');

  // Test standard user handoff
  const generatedUrl = sandbox.buildHelpdeskUrl({ from_url: 'https://snackloop.local/#dashboard' });
  const parsed = new URL(generatedUrl);
  assert.strictEqual(parsed.origin, 'https://43.156.236.102');
  assert.strictEqual(parsed.pathname, '/helpdesk/handoff');
  assert.strictEqual(parsed.searchParams.get('app'), 'snackloop');
  assert.strictEqual(parsed.searchParams.get('uid'), '42');
  assert.strictEqual(parsed.searchParams.get('name'), 'admin_test');
  assert.strictEqual(parsed.searchParams.get('role'), 'Owner (Super Admin)');
  assert.strictEqual(parsed.searchParams.get('from_url'), 'https://snackloop.local/#dashboard');
  assert.strictEqual(parsed.searchParams.get('new'), '1');

  // Test rich complaint + photo payload
  const richUrl = sandbox.buildHelpdeskUrl({
    subject: 'Struk Printer Error',
    description: 'Printer kasir macet saat cetak',
    category: 'bug_error',
    priority: 'urgent',
    has_photo: '1'
  });
  const richParsed = new URL(richUrl);
  assert.strictEqual(richParsed.searchParams.get('subject'), 'Struk Printer Error');
  assert.strictEqual(richParsed.searchParams.get('description'), 'Printer kasir macet saat cetak');
  assert.strictEqual(richParsed.searchParams.get('category'), 'bug_error');
  assert.strictEqual(richParsed.searchParams.get('priority'), 'urgent');
  assert.strictEqual(richParsed.searchParams.get('has_photo'), '1');

  // Test guest/fallback handoff
  sandbox.currentUser = null;
  sandbox.currentRole = null;
  const guestUrl = sandbox.buildHelpdeskUrl({ from_url: 'https://snackloop.local/login' });
  const guestParsed = new URL(guestUrl);
  assert.strictEqual(guestParsed.searchParams.get('app'), 'snackloop');
  assert.strictEqual(guestParsed.searchParams.get('uid').startsWith('guest_'), true);
  assert.strictEqual(guestParsed.searchParams.get('new'), '1');
});

// 19. Phase 2 Enhancements (FEFO Expiry Dates, Tempo Due-Date Receivables & WA Debt Reminder)
runTest('Verify Phase 2 Enhancements (FEFO Expiry Dates, Tempo Due-Date Receivables & WA Debt Reminder)', () => {
  const assert = require('assert');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const masterCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '09-master.js'), 'utf8');
  const trxCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '11-transactions.js'), 'utf8');
  const sqlCode = fs.readFileSync(path.join(rootDir, 'database', 'phase2_expiry_and_tempo_ar.sql'), 'utf8');

  // 1. Database schema migration file
  assert.strictEqual(sqlCode.includes('expiry_date DATE'), true, 'Missing expiry_date in phase2 SQL');
  assert.strictEqual(sqlCode.includes('due_date DATE'), true, 'Missing due_date in phase2 SQL');

  // 2. HTML elements for Expiry and Tempo
  assert.strictEqual(indexHtml.includes('id="m-expiry"'), true, 'index.html missing m-expiry');
  assert.strictEqual(indexHtml.includes('id="edit-m-expiry"'), true, 'index.html missing edit-m-expiry');
  assert.strictEqual(indexHtml.includes('id="t-fefo-alert"'), true, 'index.html missing t-fefo-alert');
  assert.strictEqual(indexHtml.includes('id="t-tempo-box"'), true, 'index.html missing t-tempo-box');
  assert.strictEqual(indexHtml.includes('id="t-due-date"'), true, 'index.html missing t-due-date');
  assert.strictEqual(indexHtml.includes('value="Tempo"'), true, 'index.html missing Tempo status option');

  // 3. Expiry & AR Debt reminder in 09-master.js
  assert.strictEqual(masterCode.includes('expiry_date: expiryDate'), true, '09-master.js missing expiry_date in insert');
  assert.strictEqual(masterCode.includes('sendCustomerDebtReminder'), true, '09-master.js missing sendCustomerDebtReminder');
  assert.strictEqual(masterCode.includes('unpaidTotal'), true, '09-master.js missing unpaidTotal calculation');

  // 4. FEFO Alert & Tempo tracking in 11-transactions.js
  assert.strictEqual(trxCode.includes('REKOMENDASI FEFO'), true, '11-transactions.js missing FEFO recommendation alert');
  assert.strictEqual(trxCode.includes("status === 'Tempo'"), true, '11-transactions.js missing Tempo status handler');
  assert.strictEqual(trxCode.includes('dueDate'), true, '11-transactions.js missing dueDate field');

  // 5. Matriks Penuaan Piutang (AR Aging Matrix Widget)
  assert.strictEqual(indexHtml.includes('id="widget-ar-aging"'), true, 'index.html missing widget-ar-aging');
  assert.strictEqual(indexHtml.includes('id="ar-total-outstanding"'), true, 'index.html missing ar-total-outstanding');
  assert.strictEqual(indexHtml.includes('id="ar-tier-1-total"'), true, 'index.html missing ar-tier-1-total');
  assert.strictEqual(indexHtml.includes('id="ar-bar-tier1"'), true, 'index.html missing ar-bar-tier1');
  assert.strictEqual(trxCode.includes('function renderArAgingMatrixWidget'), true, '11-transactions.js missing renderArAgingMatrixWidget');
  assert.strictEqual(trxCode.includes('function filterArAgingCategory'), true, '11-transactions.js missing filterArAgingCategory');
});

// 20. Outbox Stock Synchronization, Customer Reactivity, Safe WA Reminder & Repack Expiry
runTest('Verify Outbox Stock Sync, Customer Reactivity, Safe WA Reminder & Repack Expiry', () => {
  const assert = require('assert');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const outboxCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '04-outbox.js'), 'utf8');
  const masterCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '09-master.js'), 'utf8');
  const repackCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '10-repack.js'), 'utf8');
  const trxCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '11-transactions.js'), 'utf8');

  // 1. Outbox: Master stock deduction on INSERT_TRANSACTION fallback & restoration on DELETE_TRANSACTION
  assert.strictEqual(outboxCode.includes('masterUp && masterUp.id'), true, '04-outbox.js missing masterUpdate deduction in fallback path');
  assert.strictEqual(outboxCode.includes('item.payload.masterRestore && item.payload.masterRestore.id'), true, '04-outbox.js missing masterRestore in DELETE_TRANSACTION');

  // 2. Customer Table Reactivity on Trx Delete and Status Change
  assert.strictEqual(trxCode.includes("if (typeof renderCustomer === 'function') renderCustomer();"), true, '11-transactions.js missing renderCustomer reactivity');

  // 3. Safe URL encoding for WA Debt Reminder against apostrophes/quotes
  assert.strictEqual(masterCode.includes("safeCustParam"), true, '09-master.js missing safeCustParam');
  assert.strictEqual(masterCode.includes("decodeURIComponent(custParam)"), true, '09-master.js missing decodeURIComponent in sendCustomerDebtReminder');
  assert.strictEqual(trxCode.includes("safeCustParam"), true, '11-transactions.js missing safeCustParam in AR aging');

  // 4. Repack Expiry Date in Calculator & Warehouse
  assert.strictEqual(indexHtml.includes('id="c-expiry"'), true, 'index.html missing c-expiry in repack form');
  assert.strictEqual(repackCode.includes("document.getElementById('c-expiry')"), true, '10-repack.js missing c-expiry input handling');
  assert.strictEqual(repackCode.includes('expiryBadge'), true, '10-repack.js missing expiryBadge in renderRepackWarehouse');
});

// 21. Dynamic Profit Resolution, Daily Profit Column & Monthly Accumulation Footer
runTest('Verify Dynamic Profit Resolution, Daily Profit Column & Monthly Accumulation Footer', () => {
  const assert = require('assert');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const uiUtilsCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '03-ui-utils.js'), 'utf8');
  const trxCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '11-transactions.js'), 'utf8');

  // 1. Check HTML structure for new column & footer
  assert.strictEqual(indexHtml.includes('data-i18n="th_daily_profit"'), true, 'index.html missing th_daily_profit header');
  assert.strictEqual(indexHtml.includes('id="trx-table-foot"'), true, 'index.html missing trx-table-foot');

  // 2. Check getEffectiveTrxModal & getEffectiveTrxProfit functions
  assert.strictEqual(uiUtilsCode.includes('function getEffectiveTrxModal'), true, '03-ui-utils.js missing getEffectiveTrxModal');
  assert.strictEqual(uiUtilsCode.includes('function getEffectiveTrxProfit'), true, '03-ui-utils.js missing getEffectiveTrxProfit');

  // 3. Test mathematical profit calculation logic in sandbox
  const vm = require('vm');
  const sandbox = {
    masterData: [
      { name: 'Popmie Biasa Kuah Mix 1 Karton 24PCs', source: 'Toko Grosir Tegal Parang', buy: 108000, sell: 130000 },
      { name: 'Chupacups', source: 'Toko Agen Tegal Parang Diah', buy: 22000, sell: 25000 },
      { name: 'Better', source: 'Toko Agen Tegal Parang Diah', buy: 18000, sell: 20000 }
    ],
    repackData: [],
    window: {
      addEventListener: () => {}
    },
    document: {
      getElementById: () => null,
      createElement: () => ({ classList: { add() {}, remove() {} }, appendChild() {} }),
      body: { appendChild() {} },
      addEventListener: () => {}
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(uiUtilsCode, sandbox);

  // Test Case A: Trx with 0 modal and 0 profitPerItem from screenshot (Popmie, 9 pcs, Lunas)
  const testTrxPopmie = {
    date: '2026-09-10',
    customer: 'Pelanggan Retail (Kasir)',
    itemName: 'Popmie Biasa Kuah Mix 1 Karton 24PCs',
    source: 'Toko Grosir Tegal Parang',
    qty: 9,
    buy: 0,
    totalModal: 0,
    sell: 130000,
    totalSell: 1170000,
    profitPerItem: 0,
    status: 'Lunas'
  };
  const modalPopmie = sandbox.getEffectiveTrxModal(testTrxPopmie);
  const profitPopmie = sandbox.getEffectiveTrxProfit(testTrxPopmie);
  assert.strictEqual(modalPopmie, 972000, 'Popmie modal should resolve to 9 * 108000 = 972000');
  assert.strictEqual(profitPopmie, 198000, 'Popmie profit should resolve to 1170000 - 972000 = 198000');

  // Test Case B: Trx with 0 modal (Chupacups, 1 pcs, Lunas)
  const testTrxChupa = {
    date: '2026-11-03',
    customer: 'Mba Ajo',
    itemName: 'Chupacups',
    source: 'Toko Agen Tegal Parang Diah',
    qty: 1,
    buy: 0,
    totalModal: 0,
    sell: 25000,
    totalSell: 25000,
    profitPerItem: 0,
    status: 'Lunas'
  };
  const modalChupa = sandbox.getEffectiveTrxModal(testTrxChupa);
  const profitChupa = sandbox.getEffectiveTrxProfit(testTrxChupa);
  assert.strictEqual(modalChupa, 22000, 'Chupacups modal should resolve to 22000');
  assert.strictEqual(profitChupa, 3000, 'Chupacups profit should resolve to 3000');

  // Test Case C: Pure service/fee with unknown product and 0 modal when Lunas
  const testTrxService = {
    date: '2026-11-03',
    customer: 'Pelanggan Umum',
    itemName: 'Biaya Titip/Jasa',
    source: 'Jasa',
    qty: 1,
    buy: 0,
    totalModal: 0,
    sell: 50000,
    totalSell: 50000,
    profitPerItem: 0,
    extraCost: 5000,
    status: 'Lunas'
  };
  const profitService = sandbox.getEffectiveTrxProfit(testTrxService);
  assert.strictEqual(profitService, 45000, 'Service profit should resolve to totalSell - extraCost = 45000');

  // Test Case D: Selling at a loss (profitPerItem < 0)
  const testTrxLoss = {
    date: '2026-11-03',
    customer: 'Pelanggan Promo',
    itemName: 'Barang Obral',
    qty: 2,
    sell: 15000,
    totalSell: 30000,
    buy: 20000,
    totalModal: 40000,
    profitPerItem: -5000,
    status: 'Lunas'
  };
  const profitLoss = sandbox.getEffectiveTrxProfit(testTrxLoss);
  assert.strictEqual(profitLoss, -10000, 'Loss transaction should return negative profit (-10000)');

  // Test Case E: Return transaction (qty < 0 or isReturn: true)
  const testTrxReturn = {
    date: '2026-11-03',
    customer: 'Pelanggan Retur',
    itemName: 'Chupacups',
    source: 'Toko Agen Tegal Parang Diah',
    qty: -1,
    isReturn: true,
    sell: 25000,
    totalSell: -25000,
    profitPerItem: 3000,
    status: 'Lunas'
  };
  const profitReturn = sandbox.getEffectiveTrxProfit(testTrxReturn);
  assert.strictEqual(profitReturn, -3000, 'Return transaction should reverse profit (-3000)');

  // 4. Verify 11-transactions.js rendering and footer logic
  assert.strictEqual(trxCode.includes('dailyProfitMap'), true, '11-transactions.js missing dailyProfitMap');
  assert.strictEqual(trxCode.includes('dailyProfitDisplay'), true, '11-transactions.js missing dailyProfitDisplay');
  assert.strictEqual(trxCode.includes('TOTAL KESELURUHAN SEBULAN'), true, '11-transactions.js missing monthly total footer');
  assert.strictEqual(trxCode.includes('monthTotalProfitLunas'), true, '11-transactions.js missing monthTotalProfitLunas');
});

// 22. Canonical Master Catalog, Self-Healing Modal & Laba Per Item Precision
runTest('Verify Canonical Master Catalog, Self-Healing Modal & Laba Per Item Precision', () => {
  const assert = require('assert');
  const vm = require('vm');
  const uiUtilsCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '03-ui-utils.js'), 'utf8');
  const sqlUpdateCode = fs.readFileSync(path.join(rootDir, 'database', 'update_master_buy_prices_from_sheet.sql'), 'utf8');

  // 1. Verify SQL file contains proper updates
  assert.strictEqual(sqlUpdateCode.includes('UPDATE master SET buy = 18000, sell = 23000 WHERE name ILIKE \'%Mie Shorr Ayam Panggang%\''), true);
  assert.strictEqual(sqlUpdateCode.includes('UPDATE master SET buy = 50000, sell = 65000'), true);
  assert.strictEqual(sqlUpdateCode.includes('UPDATE transactions t'), true);

  // 2. Evaluate in VM sandbox
  const sandbox = {
    masterData: [
      { id: 1, name: 'Mie Shorr Ayam Panggang', buy: 0, sell: 23000 },
      { id: 2, name: 'Le Mineral 600ml', buy: 0, sell: 65000 },
      { id: 3, name: 'Choki - Choki Stick', buy: 0, sell: 26000 }
    ],
    repackData: [],
    window: {},
    document: {
      getElementById: () => null,
      createElement: () => ({ classList: { add() {}, remove() {} }, appendChild() {} }),
      body: { appendChild() {} },
      addEventListener: () => {}
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(uiUtilsCode, sandbox);

  // 3. Verify canonical catalog exists and has >= 78 products
  const catalog = sandbox.CANONICAL_MASTER_CATALOG || sandbox.window?.SnackLoop?.CANONICAL_MASTER_CATALOG;
  assert.strictEqual(Array.isArray(catalog), true);
  assert.strictEqual(catalog.length >= 78, true);

  // 4. Verify canonical lookup
  const mieShorrPrice = sandbox.getCanonicalMasterPrice('Mie Shorr Ayam Panggang');
  assert.strictEqual(mieShorrPrice.buy, 18000);
  assert.strictEqual(mieShorrPrice.sell, 23000);

  const leMineralPrice = sandbox.getCanonicalMasterPrice('Le Mineral 600ml');
  assert.strictEqual(leMineralPrice.buy, 50000);
  assert.strictEqual(leMineralPrice.sell, 65000);

  // 5. Test Laba Per Item calculation for Mie Shorr with 0 recorded modal
  const trxMieShorr = {
    date: '2026-11-03',
    customer: 'Mba Ajo',
    itemName: 'Mie Shorr Ayam Panggang',
    qty: 1,
    buy: 0,
    totalModal: 0,
    sell: 23000,
    totalSell: 23000,
    profitPerItem: 0,
    status: 'Lunas'
  };
  const unitProfit = sandbox.getEffectiveTrxUnitProfit(trxMieShorr);
  const totalModal = sandbox.getEffectiveTrxModal(trxMieShorr);
  const totalProfit = sandbox.getEffectiveTrxProfit(trxMieShorr);

  // Laba Per Item MUST BE 23.000 - 18.000 = 5.000 (NOT 23.000!)
  assert.strictEqual(unitProfit, 5000, 'Laba Per Item for Mie Shorr must be 5000, not 0 or 23000');
  assert.strictEqual(totalModal, 18000, 'Total Modal for Mie Shorr must resolve to 18000');
  assert.strictEqual(totalProfit, 5000, 'Total Profit for Mie Shorr must be 5000 (NOT total sales 23000)');

  // 6. Test Multi-qty (Momogi Jagung Qty 2: Modal 10.000, Jual 17.000)
  const trxMomogi = {
    date: '2026-11-03',
    customer: 'Mba Ajo',
    itemName: 'Momogi Jagung',
    qty: 2,
    buy: 0,
    totalModal: 0,
    sell: 17000,
    totalSell: 34000,
    profitPerItem: 0,
    status: 'Lunas'
  };
  const unitProfitMomogi = sandbox.getEffectiveTrxUnitProfit(trxMomogi);
  const totalProfitMomogi = sandbox.getEffectiveTrxProfit(trxMomogi);
  assert.strictEqual(unitProfitMomogi, 7000, 'Laba Per Item for Momogi Jagung must be 7000');
  assert.strictEqual(totalProfitMomogi, 14000, 'Total Profit for 2 Momogi Jagung must be 14000');

  // 7. Verify self-healing function heals masterData with 0 buy
  const modified = sandbox.selfHealMasterDataPrices();
  assert.strictEqual(modified, true);
  assert.strictEqual(sandbox.masterData[0].buy, 18000);
  assert.strictEqual(sandbox.masterData[1].buy, 50000);
  assert.strictEqual(sandbox.masterData[2].buy, 19000);
});

// 23. Full Mathematical Proof & Dual-Tier Reconciliation (Zero Variance Guarantee)
runTest('Verify Full Mathematical Proof & Reconciliation (Zero Variance across All Financial Scenarios)', () => {
  const assert = require('assert');
  const vm = require('vm');
  const uiUtilsCode = fs.readFileSync(path.join(rootDir, 'src', 'modules', '03-ui-utils.js'), 'utf8');

  const sandbox = {
    masterData: [
      { id: 1, name: 'Mie Shorr Ayam Panggang', buy: 18000, sell: 23000 },
      { id: 2, name: 'Popmie Biasa Kuah Mix 1 Karton 24PCs', buy: 108000, sell: 130000 },
      { id: 3, name: 'Le Mineral 600ml', buy: 50000, sell: 65000 },
      { id: 4, name: 'Makaroni Ulir 175Grm', buy: 8234, sell: 8000 },
      { id: 5, name: 'Chupacups', buy: 22000, sell: 25000 }
    ],
    repackData: [
      { id: 'BATCH-RPK-01', name: 'Makaroni Repack 50g', modal_per_pcs: 1200, sell_target: 2000 }
    ],
    window: {},
    document: {
      getElementById: () => null,
      createElement: () => ({ classList: { add() {}, remove() {} }, appendChild() {} }),
      body: { appendChild() {} },
      addEventListener: () => {}
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(uiUtilsCode, sandbox);

  const testSuite = [
    { name: 'S1: Single Item Standard', qty: 1, sell: 23000, totalSell: 23000, itemName: 'Mie Shorr Ayam Panggang', status: 'Lunas' },
    { name: 'S2: Multi-Qty Standard', qty: 9, sell: 130000, totalSell: 1170000, itemName: 'Popmie Biasa Kuah Mix 1 Karton 24PCs', status: 'Lunas' },
    { name: 'S3: Multi-Qty with Extra Cost', qty: 10, sell: 65000, totalSell: 650000, extraCost: 15000, itemName: 'Le Mineral 600ml', status: 'Lunas' },
    { name: 'S4: Selling at a Loss', qty: 2, sell: 8000, totalSell: 16000, itemName: 'Makaroni Ulir 175Grm', status: 'Lunas' },
    { name: 'S5: Return Item', qty: -1, isReturn: true, sell: 25000, totalSell: -25000, itemName: 'Chupacups', status: 'Lunas' },
    { name: 'S6: Pure Service/Fee', source: 'Jasa', qty: 1, extraCost: 5000, sell: 30000, totalSell: 30000, itemName: 'Jasa Kirim', status: 'Lunas' },
    { name: 'S7: Repack Batch Sale', source: 'Repack', batch: 'BATCH-RPK-01', qty: 5, sell: 2000, totalSell: 10000, itemName: 'Makaroni Repack 50g', status: 'Lunas' }
  ];

  let sumSell = 0;
  let sumModal = 0;
  let sumProfit = 0;

  testSuite.forEach((t) => {
    const m = sandbox.getEffectiveTrxModal(t);
    const p = sandbox.getEffectiveTrxProfit(t);
    const s = Number(t.totalSell) || 0;

    // Mathematical invariant for every single row: Total Sell - Total Modal == Total Profit
    assert.strictEqual(s - m, p, `Row invariant failed for ${t.name}: Sell (${s}) - Modal (${m}) !== Profit (${p})`);

    sumSell += s;
    sumModal += m;
    sumProfit += p;
  });

  // Global aggregation proof: sum(Sell) - sum(Modal) == sum(Profit)
  const delta = sumSell - sumModal - sumProfit;
  assert.strictEqual(delta, 0, `Global reconciliation variance detected! Delta: ${delta}`);
  assert.strictEqual(sumSell, 1874000);
  assert.strictEqual(sumModal, 1510468);
  assert.strictEqual(sumProfit, 363532);
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
if (process.exitCode) {
  console.error('Test suite failed!');
  process.exit(1);
} else {
  console.log('All tests passed successfully!');
}
