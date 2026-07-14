import { describe, expect, it } from 'vitest';
import { fillMcpTemplate, mcpServerKey } from './McpConfigContext';

describe('fillMcpTemplate', () => {
  const vars = { url: 'https://app.example.com/api/mcp', name: 'acme' };

  it('substitutes every {{url}} and {{name}} occurrence', () => {
    expect(fillMcpTemplate('connect {{name}} at {{url}} ({{url}})', vars)).toBe(
      'connect acme at https://app.example.com/api/mcp (https://app.example.com/api/mcp)'
    );
  });

  it('leaves templates without placeholders untouched', () => {
    expect(fillMcpTemplate('no placeholders here', vars)).toBe('no placeholders here');
  });

  it('passes undefined through (optional fields)', () => {
    expect(fillMcpTemplate(undefined, vars)).toBeUndefined();
  });

  it('does not treat the substituted url as a new placeholder source', () => {
    // A url that itself contains "{{name}}" text must not be re-substituted.
    const tricky = { url: 'https://x/{{name}}', name: 'acme' };
    expect(fillMcpTemplate('{{url}}', tricky)).toBe('https://x/{{name}}');
  });

  it('substitutes the {{key}} slug used inside config snippets', () => {
    const snippet = '{ "mcpServers": { "{{key}}": { "url": "{{url}}" } } }';
    expect(fillMcpTemplate(snippet, { ...vars, key: 'acme' })).toBe(
      '{ "mcpServers": { "acme": { "url": "https://app.example.com/api/mcp" } } }'
    );
  });

  it('leaves unknown placeholders intact instead of blanking them', () => {
    expect(fillMcpTemplate('hi {{unknown}} {{name}}', vars)).toBe('hi {{unknown}} acme');
  });
});

describe('mcpServerKey', () => {
  it('slugifies a normal name', () => {
    expect(mcpServerKey('Acme Inc.')).toBe('acme-inc');
    expect(mcpServerKey('My Cool App')).toBe('my-cool-app');
  });

  it('always yields a JSON-safe [a-z0-9-] key', () => {
    expect(mcpServerKey('A/B?C#D')).toMatch(/^[a-z0-9-]+$/);
    expect(mcpServerKey('  Padded  ')).toBe('padded');
  });

  it('falls back to "app" when the name has no ASCII alphanumerics', () => {
    expect(mcpServerKey('日本語')).toBe('app');
    expect(mcpServerKey('!!!')).toBe('app');
    expect(mcpServerKey('')).toBe('app');
  });

  it('never leaves leading/trailing dashes', () => {
    expect(mcpServerKey('---edge---')).toBe('edge');
  });
});
