import { existsSync, rmSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = resolve(repoRoot, 'examples/tauri-react');
const installedPackagePath = resolve(
  fixtureRoot,
  'node_modules/mojix-picker',
);
const relativePackagePath = relative(repoRoot, installedPackagePath);

if (
  relativePackagePath.startsWith('..') ||
  relativePackagePath === '' ||
  resolve(repoRoot, relativePackagePath) !== installedPackagePath
) {
  throw new Error(
    `Refusing to remove path outside repository: ${installedPackagePath}`,
  );
}

if (existsSync(installedPackagePath)) {
  rmSync(installedPackagePath, { recursive: true, force: true });
}

const npmCli = process.env.npm_execpath;
const command = npmCli
  ? process.execPath
  : process.platform === 'win32'
    ? 'npm.cmd'
    : 'npm';
const args = [
  ...(npmCli ? [npmCli] : []),
  '--prefix',
  fixtureRoot,
  'install',
];
const result = spawnSync(command, args, {
  cwd: repoRoot,
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
