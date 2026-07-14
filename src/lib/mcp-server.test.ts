/**
 * MCP handler tests — tool result shaping (content blocks vs legacy auto-wrap).
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  createMcpHandler,
  mcpAudio,
  mcpEmbeddedResource,
  mcpImage,
  mcpResourceLink,
  mcpText,
  type McpToolResult,
} from './mcp-server';

function handlerWith(execute: () => unknown) {
  return createMcpHandler({
    auth: false,
    serverInfo: { name: 'test', version: '0.0.0' },
    tools: [
      {
        name: 'probe',
        description: 'test tool',
        inputSchema: z.object({}),
        execute,
      },
    ],
  });
}

async function callProbe(execute: () => unknown) {
  const res = await handlerWith(execute).handle({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'probe', arguments: {} },
    }),
  });
  expect(res.status).toBe(200);
  return JSON.parse(res.body).result;
}

describe('content block helpers', () => {
  it('produce spec-shaped blocks', () => {
    expect(mcpText('hi')).toEqual({ type: 'text', text: 'hi' });
    expect(mcpImage('AAAA', 'image/png')).toEqual({
      type: 'image',
      data: 'AAAA',
      mimeType: 'image/png',
    });
    expect(mcpAudio('BBBB', 'audio/wav')).toEqual({
      type: 'audio',
      data: 'BBBB',
      mimeType: 'audio/wav',
    });
    expect(
      mcpResourceLink('https://x.test/r.pdf', 'report', { mimeType: 'application/pdf' })
    ).toEqual({
      type: 'resource_link',
      uri: 'https://x.test/r.pdf',
      name: 'report',
      mimeType: 'application/pdf',
    });
    expect(mcpEmbeddedResource({ uri: 'mem://a', text: 'body' })).toEqual({
      type: 'resource',
      resource: { uri: 'mem://a', text: 'body' },
    });
  });
});

describe('tools/call result shaping', () => {
  it('passes a wire-shaped McpToolResult through untouched (mixed blocks)', async () => {
    const toolResult: McpToolResult = {
      content: [mcpText('chart below'), mcpImage('iVBORw0KGgo=', 'image/png')],
      structuredContent: { points: 3 },
    };
    const result = await callProbe(() => toolResult);
    expect(result.content).toEqual(toolResult.content);
    expect(result.structuredContent).toEqual({ points: 3 });
    expect(result.isError).toBe(false);
  });

  it('honors an explicit isError on a wire-shaped result', async () => {
    const result = await callProbe(() => ({
      content: [mcpText('quota exceeded')],
      isError: true,
    }));
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('quota exceeded');
  });

  it('auto-wraps a plain string as one text block', async () => {
    const result = await callProbe(() => 'done');
    expect(result.content).toEqual([{ type: 'text', text: 'done' }]);
    expect(result.structuredContent).toBeUndefined();
    expect(result.isError).toBe(false);
  });

  it('auto-wraps a plain object as JSON text + structuredContent', async () => {
    const result = await callProbe(() => ({ id: 'w1', name: 'Acme' }));
    expect(result.structuredContent).toEqual({ id: 'w1', name: 'Acme' });
    expect(JSON.parse(result.content[0].text)).toEqual({ id: 'w1', name: 'Acme' });
  });

  it('does not false-positive on a data object whose content array is not MCP blocks', async () => {
    const cmsDoc = { content: [{ heading: 'Intro' }, { paragraph: 'text' }], title: 'Doc' };
    const result = await callProbe(() => cmsDoc);
    // Treated as plain data: JSON text + structuredContent, not pass-through.
    expect(result.structuredContent).toEqual(cmsDoc);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
  });

  it('does not false-positive on an empty content array', async () => {
    const data = { content: [] as unknown[] };
    const result = await callProbe(() => data);
    expect(result.content[0].type).toBe('text');
    expect(result.structuredContent).toEqual(data);
  });

  it('returns invalid arguments as an isError tool result, not a protocol error (SEP-1303)', async () => {
    const handler = createMcpHandler({
      auth: false,
      tools: [
        {
          name: 'strictly',
          description: 'needs a number',
          inputSchema: z.object({ count: z.number() }),
          execute: () => 'never',
        },
      ],
    });
    const res = await handler.handle({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'strictly', arguments: { count: 'three' } },
      }),
    });
    const rpc = JSON.parse(res.body);
    expect(rpc.error).toBeUndefined();
    expect(rpc.result.isError).toBe(true);
    expect(rpc.result.content[0].text).toContain('count');
  });
});

// ─── Resources & prompts ──────────────────────────────────────────────────────

async function rpc(handler: ReturnType<typeof createMcpHandler>, method: string, params?: unknown) {
  const res = await handler.handle({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 7, method, params: params ?? {} }),
  });
  return JSON.parse(res.body);
}

const resourceHandler = () =>
  createMcpHandler({
    auth: false,
    resources: [
      {
        uri: 'app://greeting',
        name: 'greeting',
        mimeType: 'text/plain',
        read: () => 'hello',
      },
      {
        uri: 'app://config',
        name: 'config',
        read: () => ({ flag: true }),
      },
    ],
    resourceTemplates: [
      {
        uriTemplate: 'app://orders/{orderId}',
        name: 'order',
        read: params => ({ id: params.orderId, status: 'shipped' }),
      },
    ],
    prompts: [
      {
        name: 'summarize_order',
        description: 'Summarize one order',
        arguments: [{ name: 'orderId', required: true }],
        get: args => `Summarize order ${args.orderId}.`,
      },
    ],
  });

describe('resources', () => {
  it('advertises resources/prompts capabilities only when configured', async () => {
    const bare = createMcpHandler({ auth: false, tools: [] });
    const withBoth = resourceHandler();
    const bareInit = await rpc(bare, 'initialize', { protocolVersion: '2025-11-25' });
    const richInit = await rpc(withBoth, 'initialize', { protocolVersion: '2025-11-25' });
    expect(bareInit.result.capabilities.resources).toBeUndefined();
    expect(bareInit.result.capabilities.prompts).toBeUndefined();
    expect(richInit.result.capabilities.resources).toEqual({});
    expect(richInit.result.capabilities.prompts).toEqual({});
    expect(richInit.result.protocolVersion).toBe('2025-11-25');
  });

  it('resources/* is method-not-found when nothing is configured', async () => {
    const bare = createMcpHandler({ auth: false, tools: [] });
    const res = await rpc(bare, 'resources/list');
    expect(res.error.code).toBe(-32601);
  });

  it('lists resources and templates', async () => {
    const handler = resourceHandler();
    const list = await rpc(handler, 'resources/list');
    expect(list.result.resources.map((r: { uri: string }) => r.uri)).toEqual([
      'app://greeting',
      'app://config',
    ]);
    const templates = await rpc(handler, 'resources/templates/list');
    expect(templates.result.resourceTemplates[0].uriTemplate).toBe('app://orders/{orderId}');
  });

  it('reads a fixed resource: string → text contents with declared mimeType', async () => {
    const read = await rpc(resourceHandler(), 'resources/read', { uri: 'app://greeting' });
    expect(read.result.contents).toEqual([
      { uri: 'app://greeting', mimeType: 'text/plain', text: 'hello' },
    ]);
  });

  it('reads an object resource as pretty JSON', async () => {
    const read = await rpc(resourceHandler(), 'resources/read', { uri: 'app://config' });
    expect(read.result.contents[0].mimeType).toBe('application/json');
    expect(JSON.parse(read.result.contents[0].text)).toEqual({ flag: true });
  });

  it('matches URI templates and decodes params', async () => {
    const read = await rpc(resourceHandler(), 'resources/read', {
      uri: 'app://orders/ord%2F42',
    });
    expect(JSON.parse(read.result.contents[0].text)).toEqual({ id: 'ord/42', status: 'shipped' });
  });

  it('returns -32002 with the uri for unknown resources', async () => {
    const read = await rpc(resourceHandler(), 'resources/read', { uri: 'app://nope' });
    expect(read.error.code).toBe(-32002);
    expect(read.error.data.uri).toBe('app://nope');
  });

  it('rejects a missing or non-string uri with -32602, not -32002', async () => {
    const missing = await rpc(resourceHandler(), 'resources/read', {});
    expect(missing.error.code).toBe(-32602);
    const nonString = await rpc(resourceHandler(), 'resources/read', { uri: 42 });
    expect(nonString.error.code).toBe(-32602);
  });
});

// ─── Scope gating (hostile / under-scoped tokens) ─────────────────────────────

/** Tokens map 1:1 to scope grants: 'admin' → ['admin'], anything else → []. */
const scopedHandler = () =>
  createMcpHandler({
    auth: {
      verify: token => ({ sessionId: 's1', scopes: token === 'admin' ? ['admin'] : [] }),
      resourceMetadataUrl: 'https://app.example.com/.well-known/oauth-protected-resource',
    },
    resources: [
      {
        uri: 'app://secret/data',
        name: 'secret',
        requiredScopes: ['admin'],
        read: () => 'classified',
      },
      { uri: 'app://public/data', name: 'public', read: () => 'open' },
    ],
    resourceTemplates: [
      // Deliberately overlaps app://secret/data — a laxer template must never
      // serve a URI owned by a stricter exact resource.
      {
        uriTemplate: 'app://secret/{what}',
        name: 'secret-template',
        read: params => `template:${params.what}`,
      },
      {
        uriTemplate: 'app://admin/{what}',
        name: 'admin-template',
        requiredScopes: ['admin'],
        read: params => `admin:${params.what}`,
      },
    ],
    prompts: [
      {
        name: 'admin_prompt',
        requiredScopes: ['admin'],
        get: () => 'for admins only',
      },
      { name: 'open_prompt', get: () => 'for everyone' },
    ],
  });

async function rpcAs(
  handler: ReturnType<typeof createMcpHandler>,
  token: string,
  method: string,
  params?: unknown
) {
  const res = await handler.handle({
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 9, method, params: params ?? {} }),
  });
  return JSON.parse(res.body);
}

describe('scope gating', () => {
  it('an under-scoped exact resource does NOT fall through to a laxer matching template', async () => {
    const handler = scopedHandler();
    const read = await rpcAs(handler, 'noscope', 'resources/read', { uri: 'app://secret/data' });
    // Must be indistinguishable from not-found — and above all must not serve
    // the template's content for the exact resource's URI.
    expect(read.result).toBeUndefined();
    expect(read.error.code).toBe(-32002);
  });

  it('a sufficiently-scoped token reads the exact resource, not the template', async () => {
    const read = await rpcAs(scopedHandler(), 'admin', 'resources/read', {
      uri: 'app://secret/data',
    });
    expect(read.result.contents[0].text).toBe('classified');
  });

  it('the overlapping template still serves URIs the exact resource does not own', async () => {
    const read = await rpcAs(scopedHandler(), 'noscope', 'resources/read', {
      uri: 'app://secret/other',
    });
    expect(read.result.contents[0].text).toBe('template:other');
  });

  it('an under-scoped template read returns -32002', async () => {
    const read = await rpcAs(scopedHandler(), 'noscope', 'resources/read', {
      uri: 'app://admin/logs',
    });
    expect(read.error.code).toBe(-32002);
    const ok = await rpcAs(scopedHandler(), 'admin', 'resources/read', {
      uri: 'app://admin/logs',
    });
    expect(ok.result.contents[0].text).toBe('admin:logs');
  });

  it('resources/list and resources/templates/list hide under-scoped entries', async () => {
    const handler = scopedHandler();
    const list = await rpcAs(handler, 'noscope', 'resources/list');
    expect(list.result.resources.map((r: { uri: string }) => r.uri)).toEqual(['app://public/data']);
    const templates = await rpcAs(handler, 'noscope', 'resources/templates/list');
    expect(templates.result.resourceTemplates.map((t: { name: string }) => t.name)).toEqual([
      'secret-template',
    ]);
    const adminList = await rpcAs(handler, 'admin', 'resources/list');
    expect(adminList.result.resources).toHaveLength(2);
  });

  it('prompts/list hides under-scoped prompts and prompts/get treats them as unknown', async () => {
    const handler = scopedHandler();
    const list = await rpcAs(handler, 'noscope', 'prompts/list');
    expect(list.result.prompts.map((p: { name: string }) => p.name)).toEqual(['open_prompt']);
    const got = await rpcAs(handler, 'noscope', 'prompts/get', { name: 'admin_prompt' });
    expect(got.result).toBeUndefined();
    expect(got.error.code).toBe(-32602);
    const ok = await rpcAs(handler, 'admin', 'prompts/get', { name: 'admin_prompt' });
    expect(ok.result.messages[0].content.text).toBe('for admins only');
  });
});

describe('prompts', () => {
  it('lists prompts with arguments', async () => {
    const list = await rpc(resourceHandler(), 'prompts/list');
    expect(list.result.prompts).toEqual([
      {
        name: 'summarize_order',
        description: 'Summarize one order',
        arguments: [{ name: 'orderId', required: true }],
      },
    ]);
  });

  it('renders a string return as one user text message', async () => {
    const got = await rpc(resourceHandler(), 'prompts/get', {
      name: 'summarize_order',
      arguments: { orderId: 'ord_1' },
    });
    expect(got.result.description).toBe('Summarize one order');
    expect(got.result.messages).toEqual([
      { role: 'user', content: { type: 'text', text: 'Summarize order ord_1.' } },
    ]);
  });

  it('rejects missing required arguments with -32602', async () => {
    const got = await rpc(resourceHandler(), 'prompts/get', { name: 'summarize_order' });
    expect(got.error.code).toBe(-32602);
    expect(got.error.message).toContain('orderId');
  });

  it('rejects unknown prompts with -32602', async () => {
    const got = await rpc(resourceHandler(), 'prompts/get', { name: 'nope' });
    expect(got.error.code).toBe(-32602);
  });
});
