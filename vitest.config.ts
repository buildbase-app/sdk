import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The SDK ships browser (React) and server (mcp/app-bridge) code; the
    // security-critical suites here are all pure/server-side.
    globals: false,
  },
});
