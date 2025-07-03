import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';
import json from '@rollup/plugin-json';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const packageJson = require('./package.json');

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
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
      typescript({ tsconfig: './tsconfig.json' }),
      postcss({
        config: {
          path: './postcss.config.js',
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
      // React and React JSX runtime
      'react',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-dom',
      // Node.js built-in modules that should not be bundled
      'fs',
      'path',
      'http',
      'https',
      'crypto',
      'stream',
      'util',
      'url',
      'assert',
      'zlib',
      'events',
      'buffer',
      'querystring',
      'os',
      'child_process',
      'cluster',
      'dgram',
      'dns',
      'domain',
      'module',
      'net',
      'readline',
      'repl',
      'string_decoder',
      'sys',
      'timers',
      'tls',
      'tty',
      'v8',
      'vm',
      'worker_threads',
    ],
  },
  {
    input: 'dist/esm/types/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
]; 