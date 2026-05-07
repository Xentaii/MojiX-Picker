import { existsSync, readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { execSync } from 'node:child_process';

const packageRoot = process.cwd();
const packageJson = JSON.parse(
  readFileSync(join(packageRoot, 'package.json'), 'utf8'),
);

function collectExportTargets(value, targets = new Set()) {
  if (typeof value === 'string') {
    targets.add(value);
    return targets;
  }

  if (!value || typeof value !== 'object') {
    return targets;
  }

  for (const nested of Object.values(value)) {
    collectExportTargets(nested, targets);
  }

  return targets;
}

function normalizeTarballPath(filePath) {
  return normalize(filePath).replace(/\\/g, '/').replace(/^\.\//, '');
}

function ensureExportTargetsExist() {
  const exportTargets = collectExportTargets(packageJson.exports);

  for (const target of exportTargets) {
    const normalizedTarget = normalizeTarballPath(target);
    const absoluteTarget = join(packageRoot, normalizedTarget);

    if (!existsSync(absoluteTarget)) {
      throw new Error(
        `Export target is missing on disk: ${normalizedTarget}`,
      );
    }
  }
}

function runPackDryRun() {
  const output = execSync('npm pack --json --dry-run --ignore-scripts', {
    cwd: packageRoot,
    encoding: 'utf8',
  });

  const trimmedOutput = output.trim();
  const jsonStart = trimmedOutput.indexOf('[');

  if (jsonStart < 0) {
    throw new Error(`Unexpected npm pack output:\n${output}`);
  }

  return JSON.parse(trimmedOutput.slice(jsonStart));
}

function ensureTarballContainsExports(packEntries) {
  const files = new Set(
    (packEntries[0]?.files ?? []).map((entry) =>
      normalizeTarballPath(entry.path),
    ),
  );
  const exportTargets = collectExportTargets(packageJson.exports);

  for (const target of exportTargets) {
    const normalizedTarget = normalizeTarballPath(target);

    if (!files.has(normalizedTarget)) {
      throw new Error(
        `Export target is missing from npm pack output: ${normalizedTarget}`,
      );
    }
  }
}

function ensureTarballContainsDataAssets(packEntries) {
  const files = new Set(
    (packEntries[0]?.files ?? []).map((entry) =>
      normalizeTarballPath(entry.path),
    ),
  );

  if (!files.has('dist/data/emoji-data.json')) {
    throw new Error('Tarball is missing dist/data/emoji-data.json');
  }

  if (!files.has('dist/data/emoji-bootstrap.en.json')) {
    throw new Error('Tarball is missing dist/data/emoji-bootstrap.en.json');
  }

  for (const vendor of ['apple', 'google', 'twitter', 'facebook']) {
    const availabilityPath = `dist/data/availability.${vendor}.json`;

    if (!files.has(availabilityPath)) {
      throw new Error(`Tarball is missing ${availabilityPath}`);
    }
  }
}

function ensureTarballHasNoCjs(packEntries) {
  const cjsFiles = (packEntries[0]?.files ?? [])
    .map((entry) => normalizeTarballPath(entry.path))
    .filter((filePath) => filePath.endsWith('.cjs'));

  if (cjsFiles.length > 0) {
    throw new Error(
      `Tarball unexpectedly contains CJS files:\n${cjsFiles.join('\n')}`,
    );
  }
}

const PRECOMPRESSION_REQUIRED = [
  'dist/data/emoji-bootstrap.en.json',
  'dist/data/emoji-data.json',
  'dist/lib/style.css',
];

function ensurePrecompressedAssets(packEntries) {
  const files = new Set(
    (packEntries[0]?.files ?? []).map((entry) =>
      normalizeTarballPath(entry.path),
    ),
  );

  for (const original of PRECOMPRESSION_REQUIRED) {
    for (const suffix of ['.br', '.gz']) {
      const variant = `${original}${suffix}`;

      if (!files.has(variant)) {
        throw new Error(
          `Tarball is missing pre-compressed asset: ${variant}`,
        );
      }
    }
  }
}

ensureExportTargetsExist();
const packEntries = runPackDryRun();
ensureTarballContainsExports(packEntries);
ensureTarballContainsDataAssets(packEntries);
ensureTarballHasNoCjs(packEntries);
ensurePrecompressedAssets(packEntries);

console.log('Package export verification passed.');
