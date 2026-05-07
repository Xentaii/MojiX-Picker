import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import {
  brotliCompressSync,
  constants as zlibConstants,
  gzipSync,
} from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf8'),
) as {
  version: string;
};

const PRECOMPRESS_EXTENSIONS = new Set(['.js', '.json', '.css']);
const PRECOMPRESS_MIN_BYTES = 1024;

function precompressDirectory(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);

    if (entry.isDirectory()) {
      precompressDirectory(fullPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (entry.name.endsWith('.br') || entry.name.endsWith('.gz')) {
      continue;
    }

    if (!PRECOMPRESS_EXTENSIONS.has(extname(entry.name))) {
      continue;
    }

    const { size } = statSync(fullPath);

    if (size < PRECOMPRESS_MIN_BYTES) {
      continue;
    }

    const buffer = readFileSync(fullPath);

    writeFileSync(
      `${fullPath}.br`,
      brotliCompressSync(buffer, {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
          [zlibConstants.BROTLI_PARAM_SIZE_HINT]: size,
        },
      }),
    );
    writeFileSync(
      `${fullPath}.gz`,
      gzipSync(buffer, { level: zlibConstants.Z_BEST_COMPRESSION }),
    );
  }
}

function copyBundleDataPlugin() {
  const jsonModuleLoaderSource = [
    'async function importJsonModule(url) {',
    '  try {',
    `    return (await Function('u', 'return import(u, { with: { type: "json" } });')(url.href)).default;`,
    '  } catch (withError) {',
    `    return (await Function('u', 'return import(u, { assert: { type: "json" } });')(url.href)).default;`,
    '  }',
    '}',
    '',
  ].join('\n');

  return {
    name: 'copy-mojix-data',
    writeBundle() {
      const generatedDir = resolve(__dirname, 'src/core/generated');
      const distDataDir = resolve(__dirname, 'dist/data');
      const distLibNodeDir = resolve(__dirname, 'dist/lib/node');
      const distLibNodeLocaleDir = resolve(distLibNodeDir, 'locales');
      const distLocaleDir = resolve(distDataDir, 'locales');

      mkdirSync(distLocaleDir, { recursive: true });
      mkdirSync(distLibNodeLocaleDir, { recursive: true });
      cpSync(
        resolve(generatedDir, 'emoji-data.json'),
        resolve(distDataDir, 'emoji-data.json'),
      );
      cpSync(
        resolve(generatedDir, 'emoji-bootstrap.en.json'),
        resolve(distDataDir, 'emoji-bootstrap.en.json'),
      );
      for (const fileName of readdirSync(generatedDir)) {
        if (!/^emoji-shard\.[^.]+\.json$/u.test(fileName)) {
          continue;
        }

        cpSync(
          resolve(generatedDir, fileName),
          resolve(distDataDir, fileName),
        );
      }
      for (const fileName of readdirSync(generatedDir)) {
        if (!/^availability\.[^.]+\.json$/u.test(fileName)) {
          continue;
        }

        cpSync(
          resolve(generatedDir, fileName),
          resolve(distDataDir, fileName),
        );
      }
      writeFileSync(
        resolve(distLibNodeDir, 'data.js'),
        [
          jsonModuleLoaderSource,
          "const emojiData = await importJsonModule(new URL('../../data/emoji-data.json', import.meta.url));",
          '',
          'export default emojiData;',
          '',
        ].join('\n'),
        'utf8',
      );

      for (const fileName of readdirSync(generatedDir)) {
        const searchMatch = /^emoji-locale\.([^.]+)\.search\.json$/u.exec(
          fileName,
        );

        if (searchMatch?.[1]) {
          const code = searchMatch[1];
          const localeNodeDir = resolve(distLibNodeLocaleDir, code);

          cpSync(
            resolve(generatedDir, fileName),
            resolve(distLocaleDir, `${code}.search.json`),
          );
          mkdirSync(localeNodeDir, { recursive: true });
          writeFileSync(
            resolve(localeNodeDir, 'search.js'),
            [
              jsonModuleLoaderSource,
              `const searchIndex = await importJsonModule(new URL('../../../../data/locales/${code}.search.json', import.meta.url));`,
              '',
              'export default searchIndex;',
              '',
            ].join('\n'),
            'utf8',
          );
          continue;
        }

        const match = /^emoji-locale\.([^.]+)\.json$/u.exec(fileName);

        if (!match) {
          continue;
        }

        cpSync(
          resolve(generatedDir, fileName),
          resolve(distLocaleDir, `${match[1]}.json`),
        );
        writeFileSync(
          resolve(distLibNodeLocaleDir, `${match[1]}.js`),
          [
            jsonModuleLoaderSource,
            `const localePack = await importJsonModule(new URL('../../../data/locales/${match[1]}.json', import.meta.url));`,
            '',
            'export default localePack;',
            '',
          ].join('\n'),
          'utf8',
        );
      }

      precompressDirectory(resolve(__dirname, 'dist/lib'));
      precompressDirectory(distDataDir);
    },
  };
}

export default defineConfig({
  define: {
    __MOJIX_VERSION__: JSON.stringify(packageJson.version),
  },
  esbuild: {
    legalComments: 'none',
  },
  plugins: [react(), copyBundleDataPlugin()],
  build: {
    outDir: 'dist/lib',
    copyPublicDir: false,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
    minify: 'esbuild',
    sourcemap: false,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        headless: resolve(__dirname, 'src/entries/headless.ts'),
        style: resolve(__dirname, 'src/entries/style.ts'),
        'sprites/apple': resolve(__dirname, 'src/entries/sprites/apple.ts'),
        'sprites/facebook': resolve(__dirname, 'src/entries/sprites/facebook.ts'),
        'sprites/google': resolve(__dirname, 'src/entries/sprites/google.ts'),
        'sprites/twitter': resolve(__dirname, 'src/entries/sprites/twitter.ts'),
        'icons/extra': resolve(__dirname, 'src/entries/icons/extra.ts'),
        'presets/index': resolve(__dirname, 'src/entries/presets/index.ts'),
      },
      name: 'MojiX',
      formats: ['es'],
      cssFileName: 'style',
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
