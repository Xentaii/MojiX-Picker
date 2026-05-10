import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmpDir = resolve(repoRoot, '.tmp');
const targetTarball = resolve(tmpDir, 'mojix-picker-local.tgz');

mkdirSync(tmpDir, { recursive: true });
rmSync(targetTarball, { force: true });

const npmCli = process.env.npm_execpath;
const command = npmCli
  ? process.execPath
  : process.platform === 'win32'
    ? 'npm.cmd'
    : 'npm';
const args = [
  ...(npmCli ? [npmCli] : []),
  'pack',
  '--pack-destination',
  tmpDir,
  '--ignore-scripts',
  '--json',
];

const result = spawnSync(command, args, {
  cwd: repoRoot,
  encoding: 'utf8',
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.stderr.write(result.stderr ?? '');
  process.exit(result.status ?? 1);
}

const packed = JSON.parse(result.stdout);
const tarball = Array.isArray(packed) ? packed[0]?.filename : undefined;

if (!tarball) {
  throw new Error('npm pack did not report a generated tarball.');
}

renameSync(resolve(tmpDir, tarball), targetTarball);
console.log(`Packed local MojiX package to ${targetTarball}`);
