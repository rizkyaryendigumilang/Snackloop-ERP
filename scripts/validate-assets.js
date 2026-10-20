const fs = require('fs');
const path = require('path');

function extractLocalAssets(baseDir) {
  const indexPath = path.join(baseDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`index.html not found at: ${indexPath}`);
  }

  const htmlContent = fs.readFileSync(indexPath, 'utf8');
  const assets = new Set();

  // 1. Extract src and href attributes from HTML
  const attrRegex = /\b(?:src|href)\s*=\s*(['"])([^'"]+)\1/gi;
  let match;
  while ((match = attrRegex.exec(htmlContent)) !== null) {
    let url = match[2].trim();
    // Exclude external URLs, inline data, anchors, protocols
    if (/^(?:https?:|\/\/|data:|mailto:|tel:|javascript:|#)/i.test(url)) {
      continue;
    }
    // Remove query params and hash
    url = url.split('?')[0].split('#')[0].trim();
    if (!url) continue;

    // Normalize path
    url = url.replace(/^\.\//, '');
    assets.add(url);
  }

  // 2. Extract Service Worker registration from script tags
  const swRegex = /serviceWorker\.register\(\s*(['"])([^'"]+)\1/gi;
  while ((match = swRegex.exec(htmlContent)) !== null) {
    let url = match[2].trim().split('?')[0].split('#')[0].trim();
    url = url.replace(/^\.\//, '');
    assets.add(url);
  }

  // 3. Extract icons from manifest.json
  const manifestPath = path.join(baseDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (Array.isArray(manifest.icons)) {
        for (const icon of manifest.icons) {
          if (icon && typeof icon.src === 'string') {
            let url = icon.src.split('?')[0].split('#')[0].trim();
            url = url.replace(/^\.\//, '');
            assets.add(url);
          }
        }
      }
    } catch (err) {
      throw new Error(`Invalid manifest.json: ${err.message}`);
    }
  }

  return Array.from(assets).sort();
}

function validateAssets(baseDir) {
  console.log(`[validate-assets] Checking assets in: ${baseDir}`);
  const assets = extractLocalAssets(baseDir);
  const errors = [];
  const verified = [];

  for (const asset of assets) {
    const fullPath = path.join(baseDir, asset);
    if (!fs.existsSync(fullPath)) {
      errors.push(`Missing asset: ${asset} (expected at ${fullPath})`);
    } else {
      const stat = fs.statSync(fullPath);
      if (stat.size === 0) {
        errors.push(`Empty asset (0 bytes): ${asset}`);
      } else {
        verified.push({ asset, size: stat.size });
      }
    }
  }

  return { assets, verified, errors };
}

if (require.main === module) {
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
  const result = validateAssets(targetDir);

  console.log(`[validate-assets] Found ${result.assets.length} local assets:`);
  for (const item of result.verified) {
    console.log(`  ✔ ${item.asset} (${item.size} bytes)`);
  }

  if (result.errors.length > 0) {
    console.error('\n[validate-assets] Validation errors:');
    for (const err of result.errors) {
      console.error(`  ✖ ${err}`);
    }
    process.exit(1);
  } else {
    console.log(`[validate-assets] All ${result.assets.length} assets are valid!`);
  }
}

module.exports = { extractLocalAssets, validateAssets };
