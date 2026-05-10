#!/usr/bin/env node
// Flattens docs/**/*.md into a GitHub Wiki layout.
//
// Usage:
//   node scripts/sync-wiki.mjs <source-dir> <target-dir>
//
// Wikis don't support nested pages: every page lives at the wiki root.
// We map source paths to predictable wiki names by capitalizing each path
// segment and joining with '-'. README.md inherits its parent directory's
// name (or becomes 'Home' at the source root). Relative markdown links
// inside pages are rewritten to point at the new flat names; static assets
// under docs/assets/ are copied to wiki/assets/ verbatim and the rewritten
// links point at that folder.

import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const SOURCE_DIR = resolve(args[0] ?? 'docs');
const TARGET_DIR = resolve(args[1] ?? 'wiki');
const ASSETS_FOLDER = 'assets';

function titleCase(word) {
  if (!word) {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// Wiki page names join segments with '-'. We normalize each path segment by
// converting '_' to '-' and title-casing each '-' delimited chunk so
// 'caching-and-storage' becomes 'Caching-And-Storage'.
function normalizeSegment(segment) {
  return segment
    .replace(/_/g, '-')
    .split('-')
    .map(titleCase)
    .join('-');
}

function toWikiPageName(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  const file = segments.pop() ?? '';
  const stem = file.replace(/\.md$/i, '');

  if (stem.toUpperCase() === 'README') {
    if (segments.length === 0) {
      return 'Home';
    }
    return segments.map(normalizeSegment).join('-');
  }

  return [...segments.map(normalizeSegment), normalizeSegment(stem)].join('-');
}

function extractPageTitle(content, fallback) {
  const match = content.match(/^#\s+(.+?)\s*$/m);
  return match ? match[1].trim().replace(/`/g, '') : fallback;
}

function groupLabel(group) {
  if (group === 'Api') {
    return 'API';
  }
  return group;
}

async function walk(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const result = [];

  for (const entry of entries) {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = resolve(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...(await walk(full, relPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (entry.name.endsWith('.md')) {
      result.push({ kind: 'page', relPath, fullPath: full });
      continue;
    }

    // Track non-markdown assets so the link rewriter can move them too.
    result.push({ kind: 'asset', relPath, fullPath: full });
  }

  return result;
}

function resolveRelativeLink(sourceRelPath, target) {
  const sourceDir = dirname(sourceRelPath);
  const combined =
    sourceDir === '.' ? target : `${sourceDir}/${target}`;
  const segments = combined.replace(/\\/g, '/').split('/');
  const stack = [];

  for (const segment of segments) {
    if (segment === '' || segment === '.') {
      continue;
    }
    if (segment === '..') {
      stack.pop();
      continue;
    }
    stack.push(segment);
  }

  return stack.join('/');
}

function rewriteLinks(content, sourceRelPath, pageByRelPath, assetByRelPath) {
  return content.replace(
    /(!?)\[([^\]]*)\]\(([^)]+)\)/g,
    (match, bang, text, target) => {
      // Skip absolute URLs, mailto, anchors-only, and empty targets.
      if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) {
        return match;
      }

      const [linkPath, hash] = target.split('#');
      if (!linkPath) {
        return match;
      }

      const resolved = resolveRelativeLink(sourceRelPath, linkPath);

      if (resolved.toLowerCase().endsWith('.md')) {
        const pageName = pageByRelPath.get(resolved);
        if (!pageName) {
          return match;
        }
        const newTarget = hash ? `${pageName}#${hash}` : pageName;
        return `${bang}[${text}](${newTarget})`;
      }

      const assetName = assetByRelPath.get(resolved);
      if (!assetName) {
        return match;
      }
      const newTarget = hash ? `${assetName}#${hash}` : assetName;
      return `${bang}[${text}](${newTarget})`;
    },
  );
}

function buildSidebar(pageByRelPath, pageTitleByRelPath) {
  const groups = new Map();

  for (const [relPath, wikiName] of pageByRelPath) {
    const segments = relPath.split('/');
    const group = segments.length > 1 ? normalizeSegment(segments[0]) : 'Top-level';
    const list = groups.get(group) ?? [];
    list.push({ relPath, wikiName });
    groups.set(group, list);
  }

  const preferredGroups = ['Top-level', 'Guides', 'Api', 'Releases'];
  const orderedGroups = [
    ...preferredGroups.filter((group) => groups.has(group)),
    ...Array.from(groups.keys())
      .filter((group) => !preferredGroups.includes(group))
      .sort(),
  ];
  const lines = ['# Documentation', ''];

  for (const group of orderedGroups) {
    const pages = groups.get(group);
    if (!pages || pages.length === 0) {
      continue;
    }

    lines.push(`## ${groupLabel(group)}`);
    pages.sort((a, b) => {
      if (a.wikiName === 'Home') {
        return -1;
      }
      if (b.wikiName === 'Home') {
        return 1;
      }
      const aLabel = pageTitleByRelPath.get(a.relPath) ?? a.wikiName;
      const bLabel = pageTitleByRelPath.get(b.relPath) ?? b.wikiName;
      return aLabel.localeCompare(bLabel);
    });
    for (const { relPath, wikiName } of pages) {
      const label =
        wikiName === 'Home'
          ? 'Home'
          : pageTitleByRelPath.get(relPath) ?? wikiName.replace(/-/g, ' ');
      lines.push(`- [${label}](${wikiName})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function ensureCleanTarget() {
  if (!existsSync(TARGET_DIR)) {
    await mkdir(TARGET_DIR, { recursive: true });
    return;
  }

  // Wipe the previous wiki snapshot but keep .git so the wiki commit
  // history is preserved across runs.
  for (const entry of await readdir(TARGET_DIR, { withFileTypes: true })) {
    if (entry.name === '.git') {
      continue;
    }
    await rm(join(TARGET_DIR, entry.name), {
      recursive: true,
      force: true,
    });
  }
}

async function main() {
  if (!existsSync(SOURCE_DIR)) {
    throw new Error(`Source directory not found: ${SOURCE_DIR}`);
  }

  const entries = await walk(SOURCE_DIR);
  const pageEntries = entries.filter((e) => e.kind === 'page');
  const assetEntries = entries.filter((e) => e.kind === 'asset');

  if (pageEntries.length === 0) {
    console.log(`No markdown pages found in ${SOURCE_DIR}.`);
    return;
  }

  const pageByRelPath = new Map();
  const pageTitleByRelPath = new Map();
  for (const entry of pageEntries) {
    pageByRelPath.set(entry.relPath, toWikiPageName(entry.relPath));
  }

  const assetByRelPath = new Map();
  for (const entry of assetEntries) {
    const flatName = `${ASSETS_FOLDER}/${entry.relPath
      .replace(/\\/g, '/')
      .replace(/^.*?\//, '')}`;
    assetByRelPath.set(entry.relPath, flatName);
  }

  await ensureCleanTarget();

  for (const entry of assetEntries) {
    const target = assetByRelPath.get(entry.relPath);
    if (!target) {
      continue;
    }
    const targetPath = join(TARGET_DIR, target);
    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(entry.fullPath, targetPath);
  }

  for (const entry of pageEntries) {
    const wikiName = pageByRelPath.get(entry.relPath);
    if (!wikiName) {
      continue;
    }
    const raw = await readFile(entry.fullPath, 'utf8');
    const fallbackTitle = pageByRelPath.get(entry.relPath) ?? entry.relPath;
    pageTitleByRelPath.set(entry.relPath, extractPageTitle(raw, fallbackTitle));
    const rewritten = rewriteLinks(
      raw,
      entry.relPath,
      pageByRelPath,
      assetByRelPath,
    );
    await writeFile(join(TARGET_DIR, `${wikiName}.md`), rewritten);
  }

  await writeFile(
    join(TARGET_DIR, '_Sidebar.md'),
    buildSidebar(pageByRelPath, pageTitleByRelPath),
  );

  console.log(
    `Synced ${pageEntries.length} page(s) and ${assetEntries.length} asset(s) into ${relative(process.cwd(), TARGET_DIR) || '.'}`,
  );
}

await main();
