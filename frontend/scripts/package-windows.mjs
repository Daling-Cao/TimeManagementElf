// Build through a fresh staging directory every time. Windows Defender and
// Explorer can briefly lock files in a previous win-unpacked directory; using
// a unique staging directory keeps the one-click build reliable.
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(here, '..');
const stagingName = `release-staging-${Date.now()}`;
const stagingDir = join(frontendDir, stagingName);
const releaseDir = join(frontendDir, 'release');
const artifactName = 'TimeManagementElf.exe';

const cli = join(
  frontendDir,
  'node_modules',
  'electron-builder',
  'out',
  'cli',
  'cli.js',
);
const result = spawnSync(
  process.execPath,
  [cli, '--win', 'portable', `--config.directories.output=${stagingName}`],
  { cwd: frontendDir, stdio: 'inherit' },
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

mkdirSync(releaseDir, { recursive: true });
copyFileSync(join(stagingDir, artifactName), join(releaseDir, artifactName));

try {
  rmSync(stagingDir, { recursive: true, force: true, maxRetries: 4, retryDelay: 500 });
} catch (error) {
  console.warn(`Could not remove temporary build directory ${stagingDir}:`, error);
}

console.log(`Portable Windows app ready: ${join(releaseDir, artifactName)}`);
