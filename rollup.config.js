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

const peerDeps = Object.keys(packageJson.peerDependencies || {});
const external = id => {
  // Exact matches
  if (peerDeps.includes(id)) return true;
  // Sub-path matches (e.g. @radix-ui/react-dialog/dist/index.mjs)
  if (peerDeps.some(dep => id.startsWith(dep + '/'))) return true;
  // React internals
  if (id === 'react/jsx-runtime' || id === 'react/jsx-dev-runtime') return true;
  return false;
};

const createPlugins = ({ extractCss = false, cssPath = 'styles.css', declarationDir = 'dist/types' } = {}) => [
  resolve({ browser: true, preferBuiltins: false }),
  commonjs({ transformMixedEsModules: true }),
  json(),
  typescript({
    tsconfig: './tsconfig.build.json',
    declaration: true,
    declarationDir,
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
      { file: 'dist/index.js', format: 'cjs', sourcemap: false, inlineDynamicImports: true },
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
    output: [
      { file: 'dist/react/index.js', format: 'cjs', sourcemap: false, inlineDynamicImports: true },
      { file: 'dist/react/index.mjs', format: 'esm', sourcemap: false, inlineDynamicImports: true },
    ],
    plugins: [
      ...createPlugins({ extractCss: true, cssPath: 'styles.css', declarationDir: 'dist/react/types' }),
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
      { file: 'dist/data/index.js', format: 'cjs', sourcemap: false, inlineDynamicImports: true },
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
