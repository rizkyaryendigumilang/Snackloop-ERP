const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('=== [SNACKLOOP ERP - DEPLOYMENT & ROLLBACK SIMULATION TEST] ===\n');

const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'snackloop-sim-'));
const workspaceRoot = path.resolve(__dirname, '..');

let totalScenarios = 0;
let passedScenarios = 0;

function runScenario(title, fn) {
  totalScenarios++;
  console.log(`\n--------------------------------------------------------------`);
  console.log(`SCENARIO ${totalScenarios}: ${title}`);
  console.log(`--------------------------------------------------------------`);
  try {
    fn();
    console.log(`>>> RESULT: PASSED [OK]\n`);
    passedScenarios++;
  } catch (err) {
    console.error(`>>> RESULT: FAILED [FAIL]: ${err.message}\n`);
    process.exitCode = 1;
  }
}

// Helper to create a release fixture
function createReleaseFixture(dir, versionTag, corruptOption = null) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  // Copy real assets from dist/ or root
  const coreAssets = [
    'index.html', 'script.js', 'style.css', 'sw.js', 'manifest.json',
    'Snackloop-logo.png', 'Snackloop-logo.svg', 'favicon-32x32.png',
    'favicon.ico', 'apple-touch-icon.png', 'icon-192.png'
  ];

  for (const asset of coreAssets) {
    const src = path.join(workspaceRoot, asset);
    const dest = path.join(dir, asset);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    } else {
      fs.writeFileSync(dest, `dummy content for ${asset}`);
    }
  }

  // Tag index.html with version
  let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  html = html.replace('<title>SnackLoop ERP</title>', `<title>SnackLoop ERP ${versionTag}</title>`);
  
  if (corruptOption === 'MISSING_SCRIPT') {
    fs.rmSync(path.join(dir, 'script.js'));
  } else if (corruptOption === 'EMPTY_CSS') {
    fs.writeFileSync(path.join(dir, 'style.css'), '');
  } else if (corruptOption === 'CORRUPT_HTML') {
    html = '<html><body>Corrupted App Without Required Tags</body></html>';
  }

  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

// Shell-independent deployment executor replicating deployment logic in ci-cd-web-vps.yml
function executeDeployment(options) {
  const {
    liveDir,
    deployParent,
    stageDir,
    releaseArchive,
    releaseSha,
    simulateBackupFailure = false,
    simulateRsyncFailure = false,
    simulateCorruptRollback = false
  } = options;

  let backupFile = null;
  let isLiveModified = false;

  const log = [];
  function record(msg) { log.push(msg); }

  try {
    // 1. Verify / prepare live target
    if (!fs.existsSync(liveDir)) {
      fs.mkdirSync(liveDir, { recursive: true });
      record(`Created live directory: ${liveDir}`);
    }

    fs.mkdirSync(deployParent, { recursive: true });
    if (fs.existsSync(stageDir)) fs.rmSync(stageDir, { recursive: true, force: true });
    fs.mkdirSync(stageDir, { recursive: true });

    // 2. Unpack release to staging
    record(`Unpacking release to staging: ${stageDir}`);
    execSync(`tar -xzf "${releaseArchive}" -C "${stageDir}"`, { stdio: 'pipe' });

    // 3. Staging Pre-validation
    const required = ['index.html', 'script.js', 'style.css', 'manifest.json'];
    for (const f of required) {
      const p = path.join(stageDir, f);
      if (!fs.existsSync(p) || fs.statSync(p).size === 0) {
        throw new Error(`Staging validation failed: ${f} missing or empty`);
      }
    }

    // 4. Create Backup if live is not empty
    const liveEntries = fs.readdirSync(liveDir);
    if (liveEntries.length > 0) {
      if (simulateBackupFailure) {
        throw new Error('Simulated failure during backup creation');
      }
      backupFile = path.join(deployParent, `backup-${releaseSha}-${Date.now()}.tar.gz`);
      record(`Backing up live files to: ${backupFile}`);
      execSync(`tar -czf "${backupFile}" -C "${liveDir}" .`, { stdio: 'pipe' });
      
      // Verify backup integrity
      execSync(`tar -tzf "${backupFile}"`, { stdio: 'pipe' });

      if (simulateCorruptRollback) {
        fs.writeFileSync(backupFile, 'CORRUPTED TAR DATA');
      }
    } else {
      record('Live directory is initially empty; skipping backup creation');
    }

    // 5. Atomic Sync to Live
    isLiveModified = true;
    if (simulateRsyncFailure) {
      throw new Error('Simulated network / disk crash during rsync to live');
    }

    // Clear live and sync from staging
    const stageEntries = fs.readdirSync(stageDir);
    for (const entry of stageEntries) {
      const s = path.join(stageDir, entry);
      const d = path.join(liveDir, entry);
      if (fs.statSync(s).isDirectory()) {
        fs.cpSync(s, d, { recursive: true });
      } else {
        fs.copyFileSync(s, d);
      }
    }

    // 6. Post-Deployment Verification & Asset Audit on Live
    record('Verifying live files and asset references...');
    for (const f of required) {
      const p = path.join(liveDir, f);
      if (!fs.existsSync(p) || fs.statSync(p).size === 0) {
        throw new Error(`Post-deploy verification failed: ${f} missing or empty in live directory`);
      }
    }

    const liveHtml = fs.readFileSync(path.join(liveDir, 'index.html'), 'utf8');
    if (!liveHtml.includes('<title>SnackLoop ERP')) {
      throw new Error('Post-deploy health check failed: HTML title tag missing or invalid');
    }

    // Clean staging
    fs.rmSync(stageDir, { recursive: true, force: true });
    return { success: true, backupFile, log, exitCode: 0 };

  } catch (deployErr) {
    record(`Error occurred: ${deployErr.message}`);

    // Rollback execution
    let rollbackSuccess = false;
    if (isLiveModified && backupFile && fs.existsSync(backupFile)) {
      record('Executing automatic rollback from backup...');
      try {
        // Test backup archive first
        execSync(`tar -tzf "${backupFile}"`, { stdio: 'pipe' });
        // Empty live and restore from backup
        for (const f of fs.readdirSync(liveDir)) {
          fs.rmSync(path.join(liveDir, f), { recursive: true, force: true });
        }
        execSync(`tar -xzf "${backupFile}" -C "${liveDir}"`, { stdio: 'pipe' });
        rollbackSuccess = true;
        record('Rollback successfully restored previous live release');
      } catch (rollbackErr) {
        record(`CRITICAL: Rollback failed! ${rollbackErr.message}`);
      }
    } else if (isLiveModified && !backupFile) {
      record('Live was modified on initial install; cleaning corrupted partial files');
      for (const f of fs.readdirSync(liveDir)) {
        fs.rmSync(path.join(liveDir, f), { recursive: true, force: true });
      }
    }

    if (fs.existsSync(stageDir)) fs.rmSync(stageDir, { recursive: true, force: true });
    return {
      success: false,
      error: deployErr.message,
      rollbackSuccess,
      backupFile,
      log,
      exitCode: 1
    };
  }
}

// =========================================================================
// RUN SCENARIOS
// =========================================================================

const simHome = path.join(testRoot, 'home');
const simLive = path.join(testRoot, 'srv-www-snackloop');
const simDeployParent = path.join(simHome, '.deploy-snackloop');

fs.mkdirSync(simHome, { recursive: true });

// Pre-create tarball helper
function buildReleaseArchive(srcDir, tarPath) {
  if (fs.existsSync(tarPath)) fs.rmSync(tarPath);
  execSync(`tar -czf "${tarPath}" -C "${srcDir}" .`, { stdio: 'pipe' });
}

// -------------------------------------------------------------------------
runScenario('Direktori live awalnya kosong (Initial Deployment)', () => {
  if (fs.existsSync(simLive)) fs.rmSync(simLive, { recursive: true, force: true });
  
  const rel1Dir = path.join(testRoot, 'rel1');
  createReleaseFixture(rel1Dir, 'v1.0.0');
  const rel1Tar = path.join(simHome, 'web-dist-1.tar.gz');
  buildReleaseArchive(rel1Dir, rel1Tar);

  const res = executeDeployment({
    liveDir: simLive,
    deployParent: simDeployParent,
    stageDir: path.join(simDeployParent, 'stage-1'),
    releaseArchive: rel1Tar,
    releaseSha: '1111111111111111111111111111111111111111'
  });

  if (res.exitCode !== 0 || !res.success) throw new Error('Initial deploy should succeed');
  const html = fs.readFileSync(path.join(simLive, 'index.html'), 'utf8');
  if (!html.includes('v1.0.0')) throw new Error('Live index.html does not contain v1.0.0');
  console.log('  Live directory populated cleanly on initial deploy.');
});

// -------------------------------------------------------------------------
runScenario('Normal update with backup created', () => {
  const rel2Dir = path.join(testRoot, 'rel2');
  createReleaseFixture(rel2Dir, 'v2.0.0');
  const rel2Tar = path.join(simHome, 'web-dist-2.tar.gz');
  buildReleaseArchive(rel2Dir, rel2Tar);

  const res = executeDeployment({
    liveDir: simLive,
    deployParent: simDeployParent,
    stageDir: path.join(simDeployParent, 'stage-2'),
    releaseArchive: rel2Tar,
    releaseSha: '2222222222222222222222222222222222222222'
  });

  if (res.exitCode !== 0 || !res.success) throw new Error('Update should succeed');
  if (!res.backupFile || !fs.existsSync(res.backupFile)) throw new Error('Backup file was not created');
  const html = fs.readFileSync(path.join(simLive, 'index.html'), 'utf8');
  if (!html.includes('v2.0.0')) throw new Error('Live index.html was not updated to v2.0.0');
  console.log(`  Live updated to v2.0.0. Backup retained at: ${res.backupFile}`);
});

// -------------------------------------------------------------------------
runScenario('Aset wajib hilang setelah rsync (Validation failure & Rollback)', () => {
  const rel3Dir = path.join(testRoot, 'rel3');
  createReleaseFixture(rel3Dir, 'v3.0.0', 'MISSING_SCRIPT');
  const rel3Tar = path.join(simHome, 'web-dist-3.tar.gz');
  buildReleaseArchive(rel3Dir, rel3Tar);

  const res = executeDeployment({
    liveDir: simLive,
    deployParent: simDeployParent,
    stageDir: path.join(simDeployParent, 'stage-3'),
    releaseArchive: rel3Tar,
    releaseSha: '3333333333333333333333333333333333333333'
  });

  if (res.exitCode === 0) throw new Error('Deploy should have failed with missing script');
  console.log(`  Deploy failed as expected: ${res.error}`);
  
  // Verify live is still v2.0.0 (unmodified because staging caught it before live)
  const html = fs.readFileSync(path.join(simLive, 'index.html'), 'utf8');
  if (!html.includes('v2.0.0')) throw new Error('Live was corrupted when staging failed');
  console.log('  Live directory preserved at v2.0.0.');
});

// -------------------------------------------------------------------------
runScenario('Rsync gagal di tengah proses (Mid-sync failure & Rollback)', () => {
  const rel4Dir = path.join(testRoot, 'rel4');
  createReleaseFixture(rel4Dir, 'v4.0.0');
  const rel4Tar = path.join(simHome, 'web-dist-4.tar.gz');
  buildReleaseArchive(rel4Dir, rel4Tar);

  const res = executeDeployment({
    liveDir: simLive,
    deployParent: simDeployParent,
    stageDir: path.join(simDeployParent, 'stage-4'),
    releaseArchive: rel4Tar,
    releaseSha: '4444444444444444444444444444444444444444',
    simulateRsyncFailure: true
  });

  if (res.exitCode === 0) throw new Error('Deploy should have failed');
  if (!res.rollbackSuccess) throw new Error('Rollback should have succeeded');
  console.log(`  Deploy failed mid-sync: ${res.error}`);
  console.log('  Rollback triggered and restored live.');

  const html = fs.readFileSync(path.join(simLive, 'index.html'), 'utf8');
  if (!html.includes('v2.0.0')) throw new Error('Rollback did not restore live to v2.0.0');
  console.log('  Live verified restored to v2.0.0.');
});

// -------------------------------------------------------------------------
runScenario('Backup gagal dibuat (Pre-deployment abort)', () => {
  const rel5Dir = path.join(testRoot, 'rel5');
  createReleaseFixture(rel5Dir, 'v5.0.0');
  const rel5Tar = path.join(simHome, 'web-dist-5.tar.gz');
  buildReleaseArchive(rel5Dir, rel5Tar);

  const res = executeDeployment({
    liveDir: simLive,
    deployParent: simDeployParent,
    stageDir: path.join(simDeployParent, 'stage-5'),
    releaseArchive: rel5Tar,
    releaseSha: '5555555555555555555555555555555555555555',
    simulateBackupFailure: true
  });

  if (res.exitCode === 0) throw new Error('Deploy should have failed when backup fails');
  console.log(`  Deploy aborted before touching live: ${res.error}`);

  const html = fs.readFileSync(path.join(simLive, 'index.html'), 'utf8');
  if (!html.includes('v2.0.0')) throw new Error('Live was modified despite backup failure');
  console.log('  Live directory untouched and safe at v2.0.0.');
});

// -------------------------------------------------------------------------
runScenario('Health check gagal (Corrupted HTML content post-sync & Rollback)', () => {
  const rel6Dir = path.join(testRoot, 'rel6');
  createReleaseFixture(rel6Dir, 'v6.0.0', 'CORRUPT_HTML');
  const rel6Tar = path.join(simHome, 'web-dist-6.tar.gz');
  buildReleaseArchive(rel6Dir, rel6Tar);

  const res = executeDeployment({
    liveDir: simLive,
    deployParent: simDeployParent,
    stageDir: path.join(simDeployParent, 'stage-6'),
    releaseArchive: rel6Tar,
    releaseSha: '6666666666666666666666666666666666666666'
  });

  if (res.exitCode === 0) throw new Error('Deploy should have failed on corrupted HTML');
  if (!res.rollbackSuccess) throw new Error('Rollback should have succeeded after health check failure');
  console.log(`  Health check rejected release: ${res.error}`);

  const html = fs.readFileSync(path.join(simLive, 'index.html'), 'utf8');
  if (!html.includes('v2.0.0')) throw new Error('Rollback did not restore live to v2.0.0');
  console.log('  Live verified restored to v2.0.0.');
});

// -------------------------------------------------------------------------
runScenario('Rollback gagal (Corrupted backup alert & emergency exit)', () => {
  const rel7Dir = path.join(testRoot, 'rel7');
  createReleaseFixture(rel7Dir, 'v7.0.0');
  const rel7Tar = path.join(simHome, 'web-dist-7.tar.gz');
  buildReleaseArchive(rel7Dir, rel7Tar);

  const res = executeDeployment({
    liveDir: simLive,
    deployParent: simDeployParent,
    stageDir: path.join(simDeployParent, 'stage-7'),
    releaseArchive: rel7Tar,
    releaseSha: '7777777777777777777777777777777777777777',
    simulateRsyncFailure: true,
    simulateCorruptRollback: true
  });

  if (res.exitCode === 0) throw new Error('Deploy must return non-zero exit code');
  if (res.rollbackSuccess) throw new Error('Rollback should not report success when archive corrupted');
  console.log('  Rollback failure detected and handled without masking error code.');
  console.log(`  Exit code non-zero preserved: ${res.exitCode}`);
});

// Clean test fixtures
fs.rmSync(testRoot, { recursive: true, force: true });

console.log(`\n==============================================================`);
console.log(`SIMULATION RESULTS: ${passedScenarios}/${totalScenarios} Scenarios Passed.`);
console.log(`==============================================================\n`);

if (process.exitCode) {
  process.exit(1);
}
