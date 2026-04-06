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

export default [
  {
    input: 'src/index.ts',
    preserveEntrySignatures: 'exports-only',
    treeshake: {
      moduleSideEffects: id => {
        // CSS files have side effects
        if (id.endsWith('.css')) return true;
        // Allow tree-shaking for other modules
        return false;
      },
    },
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: false,
        inlineDynamicImports: true,
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: false,
        inlineDynamicImports: true,
      },
    ],
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs({
        transformMixedEsModules: true,
      }),
      json(),
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: true,
        declarationDir: 'dist/types',
        rootDir: 'src',
      }),
      postcss({
        config: {
          path: './postcss.config.cjs',
        },
        extensions: ['.css'],
        minimize: true,
        inject: false,
        extract: 'saas-os.css',
        modules: {
          scopeBehaviour: 'local',
          generateScopedName: 'saas-os-[name]__[local]',
        },
      }),
      terser(),
    ],
    external: [
      ...Object.keys(packageJson.peerDependencies || {}),
      'react',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-dom',
    ],
  },
  {
    input: 'dist/types/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
];
