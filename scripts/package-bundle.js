import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to generate a clean, timestamped version string with optional git hash
function generateVersionString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');

  const timestamp = `${year}.${month}.${day}-${hours}${mins}${secs}`;

  let gitHash = '';
  try {
    gitHash = execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    // Git not initialized or CLI unavailable
  }

  return gitHash ? `${timestamp}-${gitHash}` : timestamp;
}

// 1. Determine bundle version
const argVersion = process.argv[2];
const bundleVersion = argVersion || generateVersionString();

console.log(`📦 Packaging Live Update bundle version: ${bundleVersion}...`);

// 2. Update version in public/version.json for web/app reference
const versionJsonPath = path.join(rootDir, 'public', 'version.json');
fs.writeFileSync(versionJsonPath, JSON.stringify({ version: bundleVersion, updatedAt: new Date().toISOString() }, null, 2));

// 3. Always run fresh Vite build
console.log('🏗️  Building Vite production assets...');
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

// 4. Prepare live updates directory
const updatesDir = path.join(rootDir, 'public', 'live-updates');
if (!fs.existsSync(updatesDir)) {
  fs.mkdirSync(updatesDir, { recursive: true });
}

const bundleFileName = `bundle-${bundleVersion}.zip`;
const bundleFilePath = path.join(updatesDir, bundleFileName);

if (fs.existsSync(bundleFilePath)) {
  fs.unlinkSync(bundleFilePath);
}

// 5. Compress dist output
const distDir = path.join(rootDir, 'dist');
console.log(`🤐 Zipping ${distDir} -> ${bundleFilePath}...`);

if (process.platform === 'win32') {
  const psCmd = `powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${bundleFilePath}' -Force"`;
  execSync(psCmd, { stdio: 'inherit' });
} else {
  execSync(`cd "${distDir}" && zip -r "${bundleFilePath}" .`, { stdio: 'inherit' });
}

const stats = fs.statSync(bundleFilePath);
const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`✅ Bundle created successfully (${fileSizeInMB} MB)`);

// 6. Update manifest.json
const manifestPath = path.join(updatesDir, 'manifest.json');
const manifest = {
  bundleId: bundleVersion,
  url: `/live-updates/${bundleFileName}`,
  updatedAt: new Date().toISOString(),
  sizeBytes: stats.size
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`📋 Updated live-update manifest at ${manifestPath}:`);
console.log(JSON.stringify(manifest, null, 2));
