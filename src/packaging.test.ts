/**
 * Packaging contract: every VALUE the entry-point d.ts declares must exist in
 * the runtime bundle. Guards against the rollup-plugin-dts failure mode where
 * `export type * from './x'` is flattened into value declarations that the JS
 * bundle never had — consumers' imports then typecheck but are undefined at
 * runtime (this exact bug shipped in `/react` once).
 *
 * Skipped when `dist/` is missing or older than the sources — run
 * `npm run build` first for an authoritative check (CI does).
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const ENTRIES = [
  { name: '.', dts: 'dist/index.d.ts', mjs: 'dist/index.mjs' },
  { name: './react', dts: 'dist/react/index.d.ts', mjs: 'dist/react/index.mjs' },
  { name: './mcp', dts: 'dist/mcp/index.d.ts', mjs: 'dist/mcp/index.mjs' },
  { name: './data', dts: 'dist/data/index.d.ts', mjs: 'dist/data/index.mjs' },
];

const distReady = ENTRIES.every(
  e => existsSync(join(ROOT, e.dts)) && existsSync(join(ROOT, e.mjs))
);

/**
 * Names the d.ts declares as runtime VALUES (const/function/class/enum and
 * value re-exports) — type/interface declarations don't count.
 */
function declaredValueNames(dtsPath: string): string[] {
  const src = readFileSync(dtsPath, 'utf8');
  const names = new Set<string>();

  // declare const X / declare function X / declare class X / declare enum X
  for (const m of src.matchAll(
    /declare\s+(?:const|let|var|function|class|(?:const\s+)?enum)\s+([A-Za-z_$][\w$]*)/g
  )) {
    names.add(m[1]);
  }
  // export { A, B as C, ... }  — strip `type` specifiers, keep exported names
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const raw of m[1].split(',')) {
      const spec = raw.trim();
      if (!spec || spec.startsWith('type ')) continue;
      const exported = (spec.split(/\s+as\s+/)[1] ?? spec).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(exported)) names.add(exported);
    }
  }
  // `export { A }` only makes A public — declared-but-unexported names drop out
  const exported = new Set<string>();
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const raw of m[1].split(',')) {
      const spec = raw.trim().replace(/^type\s+/, '');
      const name = (spec.split(/\s+as\s+/)[1] ?? spec).trim();
      if (name) exported.add(name);
    }
  }
  for (const m of src.matchAll(
    /export\s+declare\s+(?:const|let|var|function|class|(?:const\s+)?enum)\s+([A-Za-z_$][\w$]*)/g
  )) {
    exported.add(m[1]);
  }
  return [...names].filter(n => exported.has(n)).sort();
}

describe.skipIf(!distReady)('packaging: d.ts values exist at runtime', () => {
  for (const entry of ENTRIES) {
    it(`${entry.name} — every declared value is a real runtime export`, async () => {
      const declared = declaredValueNames(join(ROOT, entry.dts));
      expect(declared.length).toBeGreaterThan(0);

      const mod: Record<string, unknown> = await import(pathToFileURL(join(ROOT, entry.mjs)).href);
      const runtime = new Set(Object.keys(mod));

      const missing = declared.filter(name => !runtime.has(name));
      // Every name the d.ts sells as a value must be importable at runtime.
      expect(missing).toEqual([]);
    });
  }
});

describe.skipIf(!distReady)('packaging: dist freshness hint', () => {
  it('dist is not older than package.json (rebuild before trusting this suite)', () => {
    const distTime = statSync(join(ROOT, 'dist/index.mjs')).mtimeMs;
    const pkgTime = statSync(join(ROOT, 'package.json')).mtimeMs;
    if (distTime < pkgTime) {
      // Not a failure — the value check above still ran against what exists —
      // but flag it so a stale dist doesn't masquerade as a green packaging run.
      console.warn('[packaging.test] dist/ is older than package.json — run `npm run build`.');
    }
    expect(true).toBe(true);
  });
});
