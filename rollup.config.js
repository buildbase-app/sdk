import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { createRequire } from 'module';
import dts from 'rollup-plugin-dts';
import postcss from 'rollup-plugin-postcss';

const require = createRequire(import.meta.url);
const packageJson = require('./package.json');

// Externalize peer deps AND runtime dependencies. Bundling them would (a) bloat
// the output, (b) ship a second copy on top of the one npm installs from
// `dependencies`, and (c) break identity-sensitive libs — a zod schema or a
// react-hook-form / React context created by a bundled copy fails `instanceof`
// and context-sharing against the consumer's own copy. Externalizing lets npm
// dedupe to a single instance. Node builtins are always external.
const bundledExternals = [
  ...Object.keys(packageJson.peerDependencies || {}),
  ...Object.keys(packageJson.dependencies || {}),
];
const external = id => {
  // Node builtins (e.g. 'crypto', 'node:crypto') — never bundle.
  if (id.startsWith('node:')) return true;
  // Exact matches
  if (bundledExternals.includes(id)) return true;
  // Sub-path matches (e.g. @radix-ui/react-dialog/dist/index.mjs, zod/v4/...)
  if (bundledExternals.some(dep => id.startsWith(dep + '/'))) return true;
  // React internals
  if (id === 'react/jsx-runtime' || id === 'react/jsx-dev-runtime') return true;
  return false;
};

const createPlugins = ({
  extractCss = false,
  cssPath = 'styles.css',
  declarationDir = 'dist/types',
  // Must sit inside the Rollup output dir. Single-file builds resolve to
  // 'dist'; the multi-chunk react build overrides this to 'dist/react'.
  outDir = 'dist',
} = {}) => [
  resolve({ browser: true, preferBuiltins: false }),
  commonjs({ transformMixedEsModules: true }),
  json(),
  typescript({
    tsconfig: './tsconfig.build.json',
    declaration: true,
    declarationDir,
    outDir,
    rootDir: 'src',
  }),
  postcss({
    config: { path: './postcss.config.cjs' },
    extensions: ['.css'],
    minimize: true,
    inject: false,
    extract: extractCss ? cssPath : false,
    modules: {
      scopeBehaviour: 'local',
      generateScopedName: 'saas-os-[name]__[local]',
    },
  }),
  terser(),
];

const treeshakeConfig = {
  moduleSideEffects: id => id.endsWith('.css'),
};

export default [
  // ─── @buildbase/sdk (server-safe, no React) ────────────────────────────────
  {
    input: 'src/index.ts',
    preserveEntrySignatures: 'exports-only',
    treeshake: treeshakeConfig,
    output: [
      { file: 'dist/index.cjs', format: 'cjs', sourcemap: false, inlineDynamicImports: true },
      { file: 'dist/index.mjs', format: 'esm', sourcemap: false, inlineDynamicImports: true },
    ],
    plugins: createPlugins({ declarationDir: 'dist/types' }),
    external,
  },

  // ─── @buildbase/sdk/react (client, "use client") ──────────────────────────
  {
    input: 'src/react.ts',
    preserveEntrySignatures: 'exports-only',
    treeshake: treeshakeConfig,
    // Directory output (not single-file) so Rollup can split the dynamic
    // import()s — the per-locale i18n bundles and the lazy Settings/Subscription
    // dialogs — into separate chunks that consumers only load on demand.
    // inlineDynamicImports is intentionally omitted (it would defeat splitting).
    output: [
      {
        dir: 'dist/react',
        format: 'cjs',
        sourcemap: false,
        exports: 'named',
        entryFileNames: 'index.cjs',
        chunkFileNames: 'chunks/[name]-[hash].cjs',
      },
      {
        dir: 'dist/react',
        format: 'esm',
        sourcemap: false,
        exports: 'named',
        entryFileNames: 'index.mjs',
        chunkFileNames: 'chunks/[name]-[hash].mjs',
      },
    ],
    plugins: [
      ...createPlugins({
        extractCss: true,
        cssPath: 'styles.css',
        declarationDir: 'dist/react/types',
        outDir: 'dist/react',
      }),
      {
        name: 'use-client-directive',
        renderChunk(code) {
          return `"use client";\n${code}`;
        },
      },
    ],
    external,
  },

  // ─── @buildbase/sdk/data (reference data, Zod schema) ─────────────────────
  {
    input: 'src/data.ts',
    preserveEntrySignatures: 'exports-only',
    treeshake: treeshakeConfig,
    output: [
      { file: 'dist/data/index.cjs', format: 'cjs', sourcemap: false, inlineDynamicImports: true },
      { file: 'dist/data/index.mjs', format: 'esm', sourcemap: false, inlineDynamicImports: true },
    ],
    plugins: createPlugins({ declarationDir: 'dist/data/types' }),
    external,
  },

  // ─── Type declarations ─────────────────────────────────────────────────────
  {
    input: 'dist/types/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
  {
    input: 'dist/react/types/react.d.ts',
    output: [{ file: 'dist/react/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
  {
    input: 'dist/data/types/data.d.ts',
    output: [{ file: 'dist/data/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
];
