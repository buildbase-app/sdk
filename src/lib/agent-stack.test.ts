import { describe, expect, it } from 'vitest';
import { createAgentStack } from './agent-stack';

const stack = createAgentStack({
  serverUrl: 'https://api.buildbase.test',
  orgId: 'a'.repeat(24),
  siteUrl: 'https://app.example.com/',
  site: { name: 'Example App', description: 'Test app' },
  secret: 'test-secret',
});

describe('createAgentStack', () => {
  it('derives the MCP endpoint, card, and catalog from one config', () => {
    expect(stack.mcpEndpoint).toBe('https://app.example.com/api/mcp');
    expect(stack.config.mcpServerCard?.endpoint).toBe(stack.mcpEndpoint);
    // RFC 9728 convention: canonical <host>/mcp first, then the literal
    // endpoint URL, then the whole-API root.
    const resources = stack.config.protectedResources?.map(r => r.resource);
    expect(resources).toEqual([
      'https://app.example.com/mcp',
      'https://app.example.com/api/mcp',
      'https://app.example.com',
    ]);
    expect(stack.config.apiCatalog?.[0].anchor).toBe(stack.mcpEndpoint);
    expect(stack.linkHeader).toContain('agent-card.json');
  });

  it('serves pure discovery documents', async () => {
    const robots = await stack.resolvePath('/robots.txt');
    expect(robots?.status).toBe(200);
    expect(robots?.body).toContain('User-agent');

    const a2a = await stack.resolvePath('/.well-known/agent-card.json');
    const card = JSON.parse(a2a!.body);
    expect(card.name).toBe('Example App');
    expect(card.supportedInterfaces[0].serviceUrl).toBe('https://app.example.com');
    expect(card.skills.length).toBeGreaterThan(0);

    const mcpCard = await stack.resolvePath('/.well-known/mcp/server-card.json');
    const parsed = JSON.parse(mcpCard!.body);
    expect(parsed.$schema).toBe('https://modelcontextprotocol.io/schemas/server-card/v1.0');
    expect(parsed.version).toBe('1.0');
    expect(parsed.protocolVersion).toBe('2025-11-25');
    expect(parsed.transport).toEqual({ type: 'streamable-http', url: stack.mcpEndpoint });
    expect(parsed.capabilities).toEqual({ tools: true, resources: false, prompts: false });

    const manifest = await stack.resolvePath('/.well-known/mcp.json');
    const m = JSON.parse(manifest!.body);
    expect(m.$schema).toBe('https://modelcontextprotocol.io/schemas/mcp-discovery/v1.0');
    expect(m.version).toBe('1.0');
    expect(m.servers[0].transport).toEqual({ type: 'streamable-http', url: stack.mcpEndpoint });
    expect(m.servers[0].capabilities.tools).toBe(true);

    const mcpMeta = await stack.resolvePath('/.well-known/oauth-protected-resource/mcp');
    expect(JSON.parse(mcpMeta!.body).resource).toBe('https://app.example.com/mcp');
  });

  it('extraPaths override built-ins and add commerce/openapi docs', async () => {
    const s = createAgentStack({
      serverUrl: 'https://api.buildbase.test',
      orgId: 'a'.repeat(24),
      siteUrl: 'https://app.example.com',
      site: { name: 'Example App' },
      secret: 'test-secret',
      discovery: {
        extraPaths: {
          '/openapi.json': '{"openapi":"3.1.0"}',
          '/robots.txt': { body: 'User-agent: *\nDisallow:', contentType: 'text/plain' },
        },
      },
    });
    const openapi = await s.resolvePath('/openapi.json');
    expect(openapi?.contentType).toBe('application/json');
    const robots = await s.resolvePath('/robots.txt');
    expect(robots?.body).toContain('Disallow:');
  });

  it('MCP route rejects tokenless requests with an RFC 9728 challenge + CORS', async () => {
    const res = await stack.routes.POST(
      new Request('https://app.example.com/api/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      })
    );
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toContain(
      'https://app.example.com/.well-known/oauth-protected-resource/mcp'
    );
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('answers preflight without auth', async () => {
    const res = await stack.routes.OPTIONS(
      new Request('https://app.example.com/api/mcp', { method: 'OPTIONS' })
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-headers')).toContain('Authorization');
  });

  it('throws without a secret or explicit auth', () => {
    expect(() =>
      createAgentStack({
        serverUrl: 'https://api.buildbase.test',
        orgId: 'a'.repeat(24),
        siteUrl: 'https://app.example.com',
        site: { name: 'X' },
      })
    ).toThrow(/secret/);
  });
});
