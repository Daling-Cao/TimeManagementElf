// Build through a fresh staging directory every time. Windows Defender and
// Explorer can briefly lock files in a previous win-unpacked directory; using
// a unique staging directory keeps the one-click build reliable.
//
// Produces two artifacts in release/:
//   - TimeManagementElf-Setup-<version>.exe  (NSIS installer)
//   - TimeManagementElf.exe                  (portable, single exe)
// Artifact names come from `build.nsis.artifactName` / `build.portable.artifactName`
// in package.json; keep them in sync with the names below.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(here, '..');
const { version } = JSON.parse(readFileSync(join(frontendDir, 'package.json'), 'utf8'));
const stagingName = `release-staging-${Date.now()}`;
const stagingDir = join(frontendDir, stagingName);
const releaseDir = join(frontendDir, 'release');
const artifacts = [`TimeManagementElf-Setup-${version}.exe`, 'TimeManagementElf.exe'];

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
  [
    cli,
    '--win',
    'nsis',
    'portable',
    '--x64',
    // Never let electron-builder publish on its own (it would on a CI tag build);
    // the GitHub workflow uploads the release assets itself.
    '--publish',
    'never',
    `--config.directories.output=${stagingName}`,
  ],
  { cwd: frontendDir, stdio: 'inherit' },
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

mkdirSync(releaseDir, { recursive: true });
for (const name of artifacts) {
  const from = join(stagingDir, name);
  if (!existsSync(from)) {
    console.error(`Expected build artifact not found: ${from}`);
    process.exit(1);
  }
  copyFileSync(from, join(releaseDir, name));
}

try {
  rmSync(stagingDir, { recursive: true, force: true, maxRetries: 4, retryDelay: 500 });
} catch (error) {
  console.warn(`Could not remove temporary build directory ${stagingDir}:`, error);
}

console.log('Windows app ready:');
for (const name of artifacts) console.log(`  ${join(releaseDir, name)}`);
