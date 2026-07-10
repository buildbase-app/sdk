import dts from 'rollup-plugin-dts';

// Type-declaration bundling, run as a SEPARATE rollup invocation after the JS
// build (see the `build` script). Keeping these in the same process as the
// configs that emit dist/*/types intermittently raced plugin-typescript's
// async declaration writes ("Could not resolve entry module dist/types/index.d.ts").
export default [
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
  {
    input: 'dist/mcp/types/mcp.d.ts',
    output: [{ file: 'dist/mcp/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
];
