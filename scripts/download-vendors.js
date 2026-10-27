const fs = require('fs');
const path = require('path');
const https = require('https');

const vendorDir = path.resolve(__dirname, '..', 'vendor');
const faCssDir = path.join(vendorDir, 'fontawesome', 'css');
const faFontDir = path.join(vendorDir, 'fontawesome', 'webfonts');

[vendorDir, faCssDir, faFontDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const LIBS = [
  { name: 'feather.min.js', url: 'https://cdn.jsdelivr.net/npm/feather-icons/dist/feather.min.js', dest: path.join(vendorDir, 'feather.min.js') },
  { name: 'supabase.min.js', url: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js', dest: path.join(vendorDir, 'supabase.min.js') },
  { name: 'chart.min.js', url: 'https://cdn.jsdelivr.net/npm/chart.js/dist/chart.umd.min.js', dest: path.join(vendorDir, 'chart.min.js') },
  { name: 'xlsx.full.min.js', url: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', dest: path.join(vendorDir, 'xlsx.full.min.js') },
  { name: 'html2pdf.bundle.min.js', url: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js', dest: path.join(vendorDir, 'html2pdf.bundle.min.js') },
  { name: 'fontawesome/css/all.min.css', url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', dest: path.join(faCssDir, 'all.min.css') },
  { name: 'fontawesome/webfonts/fa-solid-900.woff2', url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2', dest: path.join(faFontDir, 'fa-solid-900.woff2') },
  { name: 'fontawesome/webfonts/fa-brands-400.woff2', url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2', dest: path.join(faFontDir, 'fa-brands-400.woff2') },
  { name: 'fontawesome/webfonts/fa-regular-400.woff2', url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2', dest: path.join(faFontDir, 'fa-regular-400.woff2') }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    function get(currentUrl) {
      https.get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return get(response.headers.location);
        }
        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve());
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }

    get(url);
  });
}

async function run() {
  console.log('[download-vendors] Starting download of core vendor libraries...');
  for (const lib of LIBS) {
    if (fs.existsSync(lib.dest) && fs.statSync(lib.dest).size > 0) {
      console.log(`  Already exists: ${lib.name} (${fs.statSync(lib.dest).size} bytes)`);
      continue;
    }
    process.stdout.write(`  Downloading ${lib.name} ... `);
    try {
      await download(lib.url, lib.dest);
      const stat = fs.statSync(lib.dest);
      console.log(`OK (${stat.size} bytes)`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }
  console.log('[download-vendors] Finished.');
}

run();
