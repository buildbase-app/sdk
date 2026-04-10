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

const external = [
  ...Object.keys(packageJson.peerDependencies || {}),
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom',
];

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
];
