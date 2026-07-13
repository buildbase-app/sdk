# MCP & Agent Readiness — the complete guide

This is the full guide for anyone building an app on `@buildbase/sdk` who wants AI agents to discover it, authenticate to it, and operate it over MCP. It explains **every concept, every document, and every flow** — end to end — for both human readers and AI assistants.

If you read nothing else, read [The 60-second model](#the-60-second-model) and [The cold-start flow](#the-cold-start-flow-url--tool-call). Everything after that is depth.

**Contents**

1. [The 60-second model](#the-60-second-model)
2. [The actors](#the-actors)
3. [Architecture at a glance](#architecture-at-a-glance)
4. [The cold-start flow: URL → tool call](#the-cold-start-flow-url--tool-call)
5. [Agent readiness (discovery)](#agent-readiness-discovery)
6. [The MCP server](#the-mcp-server)
7. [Authentication, in depth](#authentication-in-depth)
8. [Scopes & resources: restrict or open up](#scopes--resources-restrict-or-open-up)
9. [Setup](#setup)
10. [Spec compliance](#spec-compliance)
11. [Verify & troubleshoot](#verify--troubleshoot)
12. [API reference](#api-reference)

---

## The 60-second model

An **AI agent** (Claude Desktop, ChatGPT, Cursor, the MCP Inspector, or your own) wants to use your app. Three things have to be true:

1. **It can find you.** Your app serves machine-readable _discovery documents_ at well-known URLs — this is "agent readiness."
2. **It can log in.** Your app exposes an OAuth flow the agent can walk automatically — discover the auth server, register itself, get a token with PKCE.
3. **It can act.** Your app runs an **MCP server** — a small JSON-RPC endpoint that lists _tools_ and runs them, each under the logged-in user's permissions.

The SDK gives you all three. **Who owns what** is the key idea:

> **BuildBase (the platform) runs the OAuth flow and owns the authorization server. Your app owns everything else** — it mints its own access tokens with its own secret, owns its APIs and MCP tools, and declares its own resources and scopes. **The platform never sees your token or your secret.** That is the security guarantee.

The SDK's job is to make your side one config object, while never taking control away: every default is overridable, every restriction is opt-in, and the BuildBase pieces are optional (you can run a standalone MCP server with only your own tools).

---

## The actors

Four parties take part. Keep them straight and every flow below reads cleanly.

| Actor                  | What it is                                                      | What it holds                                                     | What it does                                                                         |
| ---------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Agent / MCP client** | Claude Desktop, ChatGPT, Cursor, MCP Inspector, or your own bot | An access token (after login)                                     | Discovers your app, logs in, calls tools                                             |
| **Your app**           | The site built on `@buildbase/sdk` (e.g. the webapp, imejis)    | `SYSTEM_SECRET` (signs its own tokens), `BUILDBASE_CLIENT_SECRET` | Serves discovery docs, runs the MCP server, **mints & verifies its own tokens**      |
| **Platform AS**        | The BuildBase authorization server (`ord/server`)               | Its own signing keys, the OAuth client registry                   | Runs login/consent/PKCE, publishes RFC 8414 metadata, calls your app to mint a token |
| **The SDK**            | `@buildbase/sdk` + `@buildbase/sdk/mcp` in your app's process   | Nothing — it's a library                                          | Builds discovery docs, runs the MCP handler, does the crypto for mint/verify         |

The SDK is **not** a network service. It runs inside your app. When this guide says "the SDK verifies the token," it means your app verifies it, using SDK code, with your secret, in your process.

---

## Architecture at a glance

```
                          ┌──────────────────────────────────────────────┐
                          │                  YOUR APP                     │
                          │            (built on @buildbase/sdk)          │
   ┌───────────┐         │                                                │
   │   Agent   │  1.GET  │   /.well-known/*        ← discovery documents  │
   │   / MCP   │────────▶│   /robots.txt /llms.txt   (agent readiness)    │
   │  client   │         │                                                │
   │           │  4.POST │   /api/mcp              ← MCP server (tools)    │
   │           │────────▶│      │                                         │
   │           │         │      └─ buildbaseAuth() verifies YOUR token    │
   └─────┬─────┘         │      └─ tools run under the user's session ────┼──┐
         │               │                                                │  │
         │               │   /api/auth/oauth2-token ← app mints its token │  │
         │               │      (applicationTokenUrl, called by platform) │  │
         │               └───────────────────▲────────────────────────────┘  │
         │ 2. OAuth flow                      │ 3. "mint a token for this user"│
         │ (authorize, consent, PKCE)         │    (signed webhook call)       │
         ▼                                    │                                │
   ┌──────────────────────────────────────────┴───────┐                       │
   │              PLATFORM AS (ord/server)             │      user's real      │
   │  /.well-known/oauth-authorization-server (8414)   │      permissions ◀────┘
   │  /authorize  /token  /register(DCR)  /consent     │
   └───────────────────────────────────────────────────┘
```

Read it as: the agent **discovers** (1), runs the **OAuth flow** with the platform (2), the platform **calls your app to mint** the token (3), and the agent then **calls your MCP server** with that token (4). The next section walks all four in order.

---

## The cold-start flow: URL → tool call

This is the whole story: an agent that knows only your MCP URL ends up listing and calling tools, with a logged-in user, no manual configuration. It is exactly what the MCP Inspector and Claude Desktop do.

```
Agent                Your app                         Platform AS
  │                     │                                  │
  │ 1. POST /api/mcp (no token)                            │
  │────────────────────▶│                                  │
  │ 401 + WWW-Authenticate:                                │
  │    resource_metadata="…/.well-known/                   │
  │        oauth-protected-resource/mcp"                   │
  │◀────────────────────│                                  │
  │                     │                                  │
  │ 2. GET that metadata (RFC 9728)                        │
  │────────────────────▶│                                  │
  │    { resource, authorization_servers:[AS], scopes }    │
  │◀────────────────────│                                  │
  │                     │                                  │
  │ 3. GET AS metadata (RFC 8414)  ───────────────────────▶│
  │    { authorization_endpoint, token_endpoint,           │
  │      registration_endpoint, code_challenge_methods,    │
  │      token_endpoint_auth_methods:["none",…] }          │
  │◀───────────────────────────────────────────────────────│
  │                     │                                  │
  │ 4. POST /register (DCR, token_endpoint_auth_method=none)│
  │    ───────────────────────────────────────────────────▶│
  │    { client_id }  ← public client, NO client_secret    │
  │◀───────────────────────────────────────────────────────│
  │                     │                                  │
  │ 5. Browser: /authorize?…&code_challenge=… (PKCE)       │
  │    ───────────────────────────────────────────────────▶│
  │        user logs in + consents to the scopes           │
  │    ◀── redirect back with ?code=… ────────────────────│
  │                     │                                  │
  │ 6. POST /token (code + code_verifier, NO secret)  ─────▶│
  │                     │   6a. "mint a token for this user"│
  │                     │◀─────────────────────────────────│
  │                     │   6b. app verifies the call,      │
  │                     │       mints ITS token, returns it │
  │                     │─────────────────────────────────▶│
  │    { access_token } ◀──────────────────────────────────│
  │◀────────────────────────────────────────────────────── │
  │                     │                                  │
  │ 7. POST /api/mcp  Authorization: Bearer <access_token> │
  │────────────────────▶│  buildbaseAuth verifies aud+sig, │
  │                     │  decrypts sid → user's session   │
  │    { tools: [...] } │  tool runs under user's perms    │
  │◀────────────────────│                                  │
```

**Step by step:**

1. **The 401 challenge.** The agent POSTs to `/api/mcp` with no token. Your MCP handler answers `401` with a `WWW-Authenticate: Bearer resource_metadata="…"` header (RFC 9728 / 6750). That header is the thread the agent pulls.
2. **Protected-resource metadata.** The agent GETs the `resource_metadata` URL. It gets back `{ resource, authorization_servers, scopes_supported }` — _which_ auth server to talk to and _what_ scopes exist.
3. **Authorization-server metadata (RFC 8414).** The agent GETs the AS metadata. It learns the `authorization_endpoint`, `token_endpoint`, `registration_endpoint`, that PKCE `S256` is required, and that `"none"` (public client) auth is allowed.
4. **Dynamic client registration (RFC 7591).** The agent registers itself as a **public client** (`token_endpoint_auth_method: "none"`). The platform issues a `client_id` and **no client secret** — the agent is a native app that can't keep a secret, so PKCE is its authentication instead.
5. **Authorize + consent (with PKCE).** The agent opens `/authorize` in a browser with a `code_challenge`. The user logs in and consents to the requested scopes (shown with human descriptions). The platform redirects back with a one-time `code`.
6. **Token exchange → your app mints.** The agent POSTs the `code` + `code_verifier` (PKCE) to `/token`, no secret. The platform validates PKCE, then **calls your app's `applicationTokenUrl`** ("mint a token for this user"). Your app verifies that call, mints **its own** access token (with the user's session embedded, encrypted), and returns it. The platform relays it to the agent. **The platform never generated or inspected your token.**
7. **The tool call.** The agent calls `/api/mcp` again, now with `Authorization: Bearer <access_token>`. Your MCP handler verifies the signature and audience, decrypts the `sid` claim back into the user's BuildBase session, and runs the tool **under that user's real permissions**.

Every arrow above is served by the SDK (your side) or the platform AS (BuildBase's side). You wire two routes; the flow just works.

---

## Agent readiness (discovery)

"Agent readiness" = serving the machine-readable documents an AI client looks for. In the SDK, one function resolves the **entire** surface:

```ts
const doc = await resolveAgentPath(pathname, config); // → { status, contentType, body, cacheControl, vary? } | null
```

You hand `doc` to your framework's response. `agent.serveAgentPath` (from `createAgentStack`) already wraps this with CORS + the OPTIONS preflight.

### Every document, and who reads it

| Path                                                | Standard                   | What it says                                  | Who reads it           |
| --------------------------------------------------- | -------------------------- | --------------------------------------------- | ---------------------- |
| `/robots.txt`                                       | RFC 9309 + Content Signals | Crawl rules, AI-bot rules, AI-usage prefs     | Crawlers, AI bots      |
| `/sitemap.xml`                                      | Sitemaps                   | Canonical URLs                                | Crawlers               |
| `/llms.txt`, `/llms-full.txt`                       | llmstxt.org                | Human-language overview / full docs for LLMs  | LLMs reading your site |
| `/.well-known/agent.json`                           | Agent Card                 | Who you are + links to every other doc        | Generic agents         |
| `/.well-known/agent-card.json`                      | A2A                        | Agent-to-agent card (served by default)       | A2A clients            |
| `/.well-known/mcp/server-card.json`                 | SEP-1649 v1.0              | Your MCP endpoint, transport, capabilities    | MCP clients            |
| `/.well-known/mcp.json`                             | SEP-1960                   | Multi-server discovery manifest               | MCP clients            |
| `/.well-known/oauth-protected-resource[/…]`         | RFC 9728                   | This resource + its auth server + scopes      | Any OAuth agent        |
| `/.well-known/oauth-authorization-server`           | RFC 8414                   | The AS endpoints (proxied from platform)      | Any OAuth agent        |
| `/.well-known/openid-configuration`                 | OIDC alias                 | Same as above, for OIDC probers               | OIDC clients           |
| `/.well-known/agent-skills/index.json` + `SKILL.md` | Agent Skills               | How-to docs the agent can follow              | Agents that self-teach |
| `/.well-known/api-catalog`                          | RFC 9727                   | Your APIs (openapi, docs, status)             | API-consuming agents   |
| `/auth.md`                                          | convention                 | Human/agent auth instructions                 | Agents, developers     |
| `/security.txt`                                     | RFC 9116                   | Security contact                              | Researchers, agents    |
| `/.well-known/http-message-signatures-directory`    | Web Bot Auth               | Your outbound-bot signing keys (opt-in)       | Sites your bot calls   |
| `config.extraPaths['/…']`                           | anything                   | Any literal doc (x402/UCP/ACP, openapi.json…) | Whatever needs it      |

DNS-AID records can't be served over HTTP; `buildDnsAidRecords(config)` returns the `_agents` SVCB/HTTPS records to publish at your DNS provider.

### What's yours vs the platform's

Almost everything is **yours**, defined locally in `AgentReadyConfig` and served from your origin with no platform round-trip. The **only** platform-owned thing is the pointer to its authorization server: `fetchAgentReadiness(config)` fetches `{ enabled, authorizationServer }`, cached and **fail-soft** (any error → `{ enabled: false }`, so a discovery route never 500s). The RFC 8414 AS metadata is re-served from your origin as a fail-soft proxy of the platform's, so agents that only probe your origin still find it.

### robots.txt, Content Signals, AI bots

`config.robots`: `policies` (base `User-agent` groups), `aiBots` (`'allow'` default | `'deny'` | explicit list for the crawlers in `AI_BOT_USER_AGENTS`), `contentSignals` (`{ search, aiInput, aiTrain }` → a `Content-Signal:` directive), `sitemaps`.

### Markdown negotiation & the Link header

- `wantsMarkdown(acceptHeader)` — q-value-aware "does this client prefer `text/markdown`?" Use it in middleware to serve a markdown variant of content pages to agents.
- `negotiateMarkdown(accept, { html, markdown })` — picks the variant, returns a document with `vary: 'Accept'`.
- `buildDiscoveryLinkHeader(config)` — the `Link` response value advertising your discovery docs. Sync and pure — safe in edge middleware.

---

## The MCP server

A live, stateless **Streamable HTTP** MCP server (MCP 2025-11-25, negotiating down to 2024-11-05). It speaks JSON-RPC over a single POST endpoint. Pure functions plus a Web-standard `fetch(Request)` adapter, so it runs on Node 18+, edge, Deno, Bun. Server-only, zero React; the `@buildbase/sdk/mcp` entry is separate because it uses zod at runtime.

### The request lifecycle

Every request to your MCP endpoint runs this pipeline (all in `createMcpHandler`):

```
POST /api/mcp
  │
  ├─ OPTIONS? → 204 preflight (CORS)                     [before anything]
  ├─ method ≠ POST? → 405
  ├─ body > maxRequestBytes? → 413                       [DoS guard]
  ├─ auth.verify(token) → McpAuthInfo | null             [YOUR verify / buildbaseAuth]
  │     └─ null → 401 + WWW-Authenticate (RFC 9728)
  ├─ rateLimit(auth, req)? → 429 if refused              [your gate, fails closed]
  ├─ dispatch JSON-RPC:
  │     ├─ initialize   → protocolVersion + capabilities
  │     ├─ tools/list   → tools visible to THIS token's scopes
  │     └─ tools/call   → run one tool:
  │            ├─ context(auth, req) → ctx.custom
  │            ├─ validate input (zod or raw JSON Schema)
  │            ├─ ctx.bb = buildbase.withSession(auth.sessionId)
  │            └─ execute(input, ctx) → result (or in-band isError)
  └─ CORS headers on the way out
```

Two things make this safe by construction: a tool only appears in `tools/list` if the token carries its `requiredScopes`, and every tool runs under the user's BuildBase session, so **the platform enforces the user's real permissions** — an agent can never exceed what the user could do.

### Built-in tools

The built-ins cover the full BuildBase surface (workspaces, users, subscription, plans, invoices, usage, credits, features, permissions, settings). Choose how much to expose:

```ts
builtinTools: 'readonly'; // DEFAULT — reads only (least privilege)
builtinTools: 'all'; // + writes, destructive & billing ops
builtinTools: false; // none (custom tools only)
builtinTools: {
  include: ['get_quota_usage', 'record_usage'];
} // exactly these
builtinTools: {
  exclude: ['delete_workspace', 'purchase_credits'];
} // reads minus these
```

Built-ins carry **no** scope requirement — the read/write boundary for them is `builtinTools`, not scopes (the agent is the authenticated app user, and the platform still enforces the user's permissions underneath).

### Custom tools

```ts
import { defineMcpTool } from '@buildbase/sdk/mcp';

defineMcpTool({
  name: 'search_orders',
  description: 'Search orders in our own database',
  inputSchema: z.object({ query: z.string() }), // zod → validated + published as JSON Schema
  requiredScopes: ['orders:read'], // optional per-tool gating
  annotations: { readOnlyHint: true },
  execute: (input, ctx) =>
    ctx.custom.db.order.findMany({ where: { name: { contains: input.query } } }),
});
```

`ctx` is `{ bb, auth, workspaceId, custom }` — `bb` is the session-scoped BuildBase client, `auth` the verified `McpAuthInfo`, `custom` whatever your `context(auth, req)` factory returned (your Prisma client, services, request info). A custom tool named like a built-in **replaces** it.

**Tool results.** Return any JSON-serializable value and the handler wraps it (string → one text block; object → JSON text + `structuredContent`). For full control — images, audio, resource links, mixed blocks, or the `isError` flag — return a wire-shaped `McpToolResult` built with the exported helpers:

```ts
import { mcpImage, mcpResourceLink, mcpText } from '@buildbase/sdk/mcp';

execute: async (input, ctx) => ({
  content: [
    mcpText('Revenue chart for Q2:'),
    mcpImage(chartPngBase64, 'image/png'),
    mcpResourceLink('https://app.example.com/reports/q2.pdf', 'q2-report', {
      mimeType: 'application/pdf',
    }),
  ],
  structuredContent: { totalCents: 1_299_00, currency: 'usd' },
});
```

### Resources & prompts

Beyond tools, the handler serves the other two MCP server primitives — both **opt-in**, and the `initialize` capabilities only advertise what you actually configured:

- **Resources** (`resources/list` / `resources/read` / `resources/templates/list`) — context a host loads without spending tool calls. `builtinResources: true` exposes a deliberately small BuildBase catalog: `buildbase://profile`, `buildbase://workspaces`, and the `buildbase://workspace/{workspaceId}` template (richer data — subscription, usage, credits — stays tools-only). Add your own with `defineMcpResource` / `defineMcpResourceTemplate`:

  ```ts
  createMcpHandler({
    buildbase,
    builtinResources: true,
    resources: [
      defineMcpResource({
        uri: 'app://docs/getting-started',
        name: 'getting-started',
        mimeType: 'text/markdown',
        read: () => gettingStartedMarkdown,
      }),
    ],
    resourceTemplates: [
      defineMcpResourceTemplate({
        uriTemplate: 'app://orders/{orderId}',
        name: 'order',
        read: (params, _uri, ctx) => ctx.custom.db.order.find(params.orderId),
      }),
    ],
  });
  ```

  `read` may return a string (text contents), any object (pretty-printed JSON), or an explicit `{ text }` / `{ blob }` shape. `requiredScopes` gates visibility exactly like tools; an under-scoped token gets the same `-32002` as a nonexistent URI (no existence oracle).

- **Prompts** (`prompts/list` / `prompts/get`) — user-facing workflow templates (hosts surface them as slash-commands). No built-ins — they're app-specific by nature:

  ```ts
  prompts: [
    defineMcpPrompt({
      name: 'analyze_usage',
      description: 'Review quota usage and suggest actions',
      arguments: [{ name: 'workspaceId', required: true }],
      get: async (args, ctx) => {
        const usage = await ctx.bb.usage.getAll(args.workspaceId);
        return `Review this workspace's quota usage and suggest actions:\n${JSON.stringify(usage)}`;
      },
    }),
  ],
  ```

  `get` may return a string (one user text message) or full `McpPromptMessage[]` with mixed content (text, images, audio, embedded resources).

**Deliberately not implemented** (they need a server→client push channel; the stateless transport has none — and that statelessness is what keeps the handler edge-safe): resource subscriptions, `listChanged` notifications, sampling, elicitation, roots. Experimental spec features (tasks) wait until they stabilize.

### Production hardening

| Option                        | Effect                                                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `maxRequestBytes`             | Body cap (default 1 MiB → 413), before parsing                                                                                          |
| `rateLimit(auth, req)`        | Stateless gate; return `false`/`{ok:false,retryAfter}` → 429. Fails **closed**                                                          |
| `allowedOrigins`              | DNS-rebinding protection (non-matching browser Origin → 403)                                                                            |
| `cors`                        | On by default (`*`, safe for a Bearer API; reflects `allowedOrigins` when set). `cors:[…]` narrows, `cors:false` off. OPTIONS automatic |
| `formatToolError(err,{tool})` | Redact client-facing tool-error text; full error still hits `onError`                                                                   |
| `onError(err, ctx)`           | Fires for auth, rate-limit, context, tool-execution, schema-conversion failures                                                         |

### No lock-in

`buildbase` is optional (omit it → standalone server with only your tools; `ctx.bb` throws a clear error if touched). `context()` injects your own per-request context. Raw JSON Schema tools skip zod. `handle()` is a pure function you can wrap or route around. `provideWebMcpTools([...])` (core entry) registers in-page tools with WebMCP-capable browsers, independent of the server.

---

## Authentication, in depth

### The trust model

The whole design turns on one rule: **your app signs and verifies its own tokens; the platform never holds your signing secret.**

- Your app holds `SYSTEM_SECRET` (signs/verifies the access tokens agents carry) and `BUILDBASE_CLIENT_SECRET` (shared with the platform, used to authenticate the platform's calls _to_ your app).
- The platform holds its own OAuth keys and the client registry. It runs login, consent, PKCE, and refresh, but when it's time to issue an access token it **calls your app** to mint one.

Because the platform can't sign a token your app would accept (it lacks `SYSTEM_SECRET`), it can neither forge your tokens nor read what's inside them. That's the guarantee.

### Two paths for minting & verifying

**Path A — presets (recommended).** The SDK does the whole mint and the whole verify:

```ts
// MINT — in your applicationTokenUrl route
import { handleAppTokenRequest, mintAgentToken } from '@buildbase/sdk';
const { status, body } = await handleAppTokenRequest({
  authorization: req.headers.get('authorization'),
  clientSecret: process.env.BUILDBASE_CLIENT_SECRET!,   // authenticates the platform's call
  mintToken: (claims) => mintAgentToken({ claims, secret: process.env.SYSTEM_SECRET! }),
});

// VERIFY — in your MCP server
import { buildbaseAuth } from '@buildbase/sdk/mcp';
auth: buildbaseAuth({
  secret: process.env.SYSTEM_SECRET!,
  resource: ['https://app.example.com/mcp', 'https://app.example.com/api/mcp'],
  requireAudience: true,
}),
```

**Path B — bring your own token.** Use this when your app mints **one token format for both its own web sessions and agents** (the reference webapp does this). You still verify the platform's call with `handleAppTokenRequest`, but you sign with your own function and verify with `auth.verify(token, req) → McpAuthInfo`. The SDK exports every primitive: `verifyClientJwt`, `signClientJwt`, `extractBearerToken`, `bearerChallenge`, `createSessionRefCrypto`.

### The mint flow (applicationTokenUrl)

The platform calls this on **every** grant (initial code exchange _and_ every refresh):

```
Platform AS                         Your app (/api/auth/oauth2-token)
  │                                    │
  │ POST, Authorization: Bearer <JWT   │
  │   signed with BUILDBASE_CLIENT_    │
  │   SECRET; claims = { id, email,    │
  │   scope, resource, sessionId, … }  │
  │───────────────────────────────────▶│ handleAppTokenRequest:
  │                                    │  1. verify JWT (HS256, timing-safe,
  │                                    │     no alg-confusion, exp required)
  │                                    │  2. your mintToken(claims):
  │                                    │     - upsert the user (your DB)
  │                                    │     - mintAgentToken: sign HS256 w/
  │                                    │       SYSTEM_SECRET, aud=resource,
  │                                    │       sid=encrypt(sessionId)
  │  { success, token, expiresIn }     │
  │◀───────────────────────────────────│
```

`claims.sessionId` is a **per-user BuildBase session** bound to this grant (fresh on every mint, including refresh). You embed it **encrypted** and never store it — so the agent's access to BuildBase simply expires with its token.

### The verify flow (every MCP request)

```
Agent → POST /api/mcp, Authorization: Bearer <access_token>
  │
  buildbaseAuth.verify(token):
   1. verifyClientJwt(token, SYSTEM_SECRET)      → signature + exp OK?      else 401
   2. aud includes one of `resource`?            (RFC 8707)                 else 401
        (MCP_AUTH_DEBUG=1 logs received vs expected aud here)
   3. decrypt `sid` claim → BuildBase sessionId  (AES-256-GCM)
   4. map claims → McpAuthInfo { sessionId, userId, workspaceId, scopes, claims }
  │
  → tools run with ctx.bb = buildbase.withSession(sessionId)
```

If the token has no `sid` (or it fails to decrypt), `sessionId` is empty: built-in BuildBase tools then fail with the platform's own 401 in-band, while your session-less tools (e.g. public content) keep working.

### The session channel (`sid`) — why encrypted

JWTs are **signed, not encrypted** — anyone holding the token (including the agent) can read its payload. The BuildBase session is a live credential, so it must never travel in plaintext. The SDK encrypts it into the `sid` claim:

- **Cipher:** AES-256-GCM. **Key:** `SHA-256(SYSTEM_SECRET + ":bb-session")`. **Wire format:** `base64url(iv[12] || authTag[16] || ciphertext)`.
- `createSessionRefCrypto(secret)` gives you `encryptSessionRef` / `decryptSessionRef`. It uses **WebCrypto** (Node 18+, Bun, Deno, edge, browsers) and is **byte-compatible** with a Node `createCipheriv('aes-256-gcm', …)` implementation of the same layout — so an app that mints with Node crypto and verifies with the SDK (or vice-versa) interoperates.
- The session is **never stored** anywhere — not in a DB, not in a cookie. It lives only inside the token and expires with it.

### Public clients & PKCE (why no client secret)

Native agents (Claude Desktop, Cursor, CLIs) can't safely keep a secret. So they register as **public clients** — `token_endpoint_auth_method: "none"` (RFC 7591) — and the platform issues them a `client_id` with **no** `client_secret`. Their authentication at the token endpoint is **PKCE** (RFC 7636) instead:

```
authorize:  client sends code_challenge = BASE64URL(SHA256(code_verifier))
token:      client sends the original code_verifier
platform:   SHA256(code_verifier) must equal the stored code_challenge, else reject
```

The platform **forces** PKCE for public clients: a token exchange with no `code_verifier` is refused. This is entirely platform-side — your `applicationTokenUrl` mints exactly the same way regardless of client type.

### Refresh & revoke

- **Refresh:** the platform calls your `applicationTokenUrl` again with `grantType: "refresh_token"` and a **fresh** `sessionId`. You mint a new access token the same way. For public clients the refresh token itself rotates (OAuth 2.1) and is family-revoked on reuse — all platform-side.
- **Revoke (optional):** register an `applicationRevokeUrl` and handle it with `handleAppRevokeRequest({ onRevoke })`. The platform POSTs `{ userId, clientId, reason }` (signed with your client secret) when a grant is revoked, so you can drop any server-side state you keep.

### Serving multiple integrations

Each integration (an AI agent, Zapier, n8n…) is its own OAuth client with its own id/secret, but they share one `applicationTokenUrl`: the platform sends the caller's `clientId`; pick the matching secret from a map. Selecting by `clientId` is safe — it's public and only _picks_ the key; the HS256 signature is still the real gate.

---

## Scopes & resources: restrict or open up

This is the customization model. Everything is opt-in; defaults are least-privilege. **Three levers for scopes, two for resources.**

### Scopes — three levers

```
        ┌─────────────────────────────────────────────────────────────┐
        │ 1. DECLARE (the catalog)                                     │
        │    scopes: [{ name:'designs:read', description:'View …' }]   │
        │    → scopes_supported in YOUR RFC 9728 protected-resource    │
        │      metadata (served from your origin). Scopes are          │
        │      app-owned; the shared AS stays scope-agnostic.          │
        ├─────────────────────────────────────────────────────────────┤
        │ 2. GATE (per tool — the restriction)                         │
        │    defineMcpTool({ …, requiredScopes:['designs:write'] })    │
        │    → hidden from tools/list AND refused unless the token     │
        │      carries ALL of them (YOUR scope names)                  │
        ├─────────────────────────────────────────────────────────────┤
        │ 3. THE FLOOR (always on)                                     │
        │    every tool runs under the user's BuildBase session →      │
        │    the platform enforces the user's REAL permissions.        │
        │    Scopes narrow within what the user can do; never widen.   │
        └─────────────────────────────────────────────────────────────┘
```

A token with **no** `scope` claim sees only tools that require none — a scoped tool can never be unlocked by an absent claim. Built-in tools are restricted by `builtinTools` (not scopes).

### Resources — two levers (RFC 8707 / 9728)

```
   1. DECLARE:  protectedResources (or createAgentStack derives three —
                the API root, the canonical <host>/mcp, and the endpoint URL)
                → the /.well-known/oauth-protected-resource* metadata

   2. BIND:     buildbaseAuth({ resource, requireAudience }) enforces the
                token's `aud` — it MUST include one of your resources, else 401.
                This is the whole gate: a token minted for resource A is
                rejected at resource B. The shared authorization server stays
                resource-agnostic — it passes the RFC 8707 `resource` param
                through opaquely; your app owns and enforces the audience.
```

**The RFC 9728 convention** BuildBase uses: the canonical MCP resource identifier is `<host>/mcp` (metadata at `/.well-known/oauth-protected-resource/mcp`), even when the HTTP route lives elsewhere (e.g. Next.js `/api/mcp`). The 401 `WWW-Authenticate` points there. `createAgentStack` registers all three identifiers so RFC 9728 path-derivation resolves whichever one a client picks.

### The customization spectrum

| You want…                                      | Do this                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| Safest possible, zero config                   | `createAgentStack({ secret })` → readonly built-ins, audience-bound, no custom tools |
| Fine-grained per-tool access                   | Declare `scopes`, set `requiredScopes` on each custom tool                           |
| Widen the built-in surface                     | `builtinTools: 'all'` or `{ include: [...] }`                                        |
| Your own token format / unified web+agent auth | `createMcpHandler` + your own `auth.verify` + `resolveAgentPath`                     |
| A discovery doc the SDK has no builder for     | `discovery.extraPaths['/whatever'] = '…'`                                            |
| Override any derived value                     | `mcp.*` / `discovery.*` on the stack, or the builder configs directly                |

---

## Setup

### Fast path — `createAgentStack`

One config derives the MCP handler, the SEP-1649 server card, the RFC 9728 protected-resource metadata (root + `<host>/mcp` + endpoint), the API-catalog entry, the BuildBase client, `buildbaseAuth`, CORS, and the discovery `Link` header.

```ts
// lib/agent.ts
import { createAgentStack, defineMcpTool } from '@buildbase/sdk/mcp';
import { z } from 'zod';

export const agent = createAgentStack({
  serverUrl: process.env.NEXT_PUBLIC_BUILDBASE_SERVER_URL!,
  orgId: process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID!,
  siteUrl: 'https://app.example.com',
  site: { name: 'My App', description: 'What it does.' },
  secret: process.env.SYSTEM_SECRET!, // wires buildbaseAuth
  scopes: [
    { name: 'designs:read', description: 'View designs' },
    { name: 'render:execute', description: 'Render images' },
  ],
  mcp: {
    builtinTools: 'readonly',
    tools: [
      defineMcpTool({
        name: 'render_image',
        description: 'Render an image from a template',
        inputSchema: z.object({ templateId: z.string() }),
        requiredScopes: ['render:execute'],
        execute: (input, { bb, workspaceId }) => renderTemplate(input.templateId),
      }),
    ],
  },
});
```

The `agent` object above is framework-agnostic. Wire it with whichever of the two adapters your framework speaks:

- **`agent.mcp.fetch(Request) → Response`** — Web standard. Next.js App Router, Hono, Bun, Deno, Cloudflare Workers, any edge runtime. `agent.routes` is a ready-made `{ GET, POST, DELETE, OPTIONS }` over it.
- **`agent.mcp.handle({ method, headers, body }) → { status, headers, body }`** — pure object in/out. Express, Fastify, Koa, Node `http`, Next.js Pages Router.
- **`agent.serveAgentPath(Request) → Response`** (fetch-style) or **`agent.resolvePath(path) → DiscoveryDocument | null`** (pure) for the discovery documents.

### Framework recipes

Every recipe wires the same two things: the **MCP endpoint** and the **discovery documents**. The mint route (`applicationTokenUrl`) is separate — see [Mint route](#mint-route-applicationtokenurl-per-framework) — because it upserts users in _your_ database, so `createAgentStack` can't own it.

**Next.js — App Router**

```ts
// app/api/mcp/route.ts
import { agent } from '@/lib/agent';
export const { GET, POST, DELETE, OPTIONS } = agent.routes;

// app/.well-known/[...path]/route.ts — plus identical one-liners at
// app/robots.txt/route.ts, app/auth.md/route.ts, app/security.txt/route.ts, app/llms.txt/route.ts
import { agent } from '@/lib/agent';
export const GET = agent.serveAgentPath;
export const OPTIONS = agent.serveAgentPath;
```

**Next.js — Pages Router** (`pages/api/*`, Node `req`/`res`)

```ts
// pages/api/mcp.ts
import { agent } from '@/lib/agent';
export const config = { api: { bodyParser: false } }; // MCP parses the raw body itself
export default async function handler(req, res) {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const r = await agent.mcp.handle({
    method: req.method!,
    headers: req.headers as Record<string, string | undefined>,
    body: Buffer.concat(chunks).toString('utf8'),
  });
  res.status(r.status);
  for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
  res.send(r.body);
}

// pages/api/agent/[...path].ts — discovery docs. Only pages/api/** files are
// API routes, so the well-known paths are rewritten here (next.config.js below).
export default async function handler(req, res) {
  const doc = await agent.resolvePath(req.url!.split('?')[0].replace(/^\/api\/agent/, ''));
  if (!doc) return res.status(404).json({ error: 'not_found' });
  res.setHeader('Content-Type', doc.contentType);
  res.setHeader('Cache-Control', doc.cacheControl);
  res.send(doc.body);
}
```

```js
// next.config.js — route the agent paths into the API handler above
module.exports = {
  async rewrites() {
    return [
      { source: '/.well-known/:path*', destination: '/api/agent/.well-known/:path*' },
      { source: '/robots.txt', destination: '/api/agent/robots.txt' },
      { source: '/sitemap.xml', destination: '/api/agent/sitemap.xml' },
      { source: '/llms.txt', destination: '/api/agent/llms.txt' },
      { source: '/llms-full.txt', destination: '/api/agent/llms-full.txt' },
      { source: '/auth.md', destination: '/api/agent/auth.md' },
      { source: '/security.txt', destination: '/api/agent/security.txt' },
    ];
  },
};
```

**Express**

```ts
import express from 'express';
const app = express();
app.use(express.text({ type: '*/*' })); // give MCP the raw JSON string

app.all('/api/mcp', async (req, res) => {
  const r = await agent.mcp.handle({
    method: req.method,
    headers: req.headers as Record<string, string | undefined>,
    body: req.body,
  });
  res.status(r.status).set(r.headers).send(r.body);
});

// One middleware serves every discovery document.
app.use(async (req, res, next) => {
  const doc = await agent.resolvePath(req.path);
  if (!doc) return next();
  res
    .status(doc.status)
    .set('Content-Type', doc.contentType)
    .set('Cache-Control', doc.cacheControl)
    .send(doc.body);
});
```

**Fastify**

```ts
fastify.addContentTypeParser('*', { parseAs: 'string' }, (_req, body, done) => done(null, body));

fastify.all('/api/mcp', async (req, reply) => {
  const r = await agent.mcp.handle({
    method: req.method,
    headers: req.headers as Record<string, string | undefined>,
    body: req.body,
  });
  reply.code(r.status).headers(r.headers).send(r.body);
});

fastify.setNotFoundHandler(async (req, reply) => {
  const doc = await agent.resolvePath(new URL(req.url, 'http://x').pathname);
  if (!doc) return reply.code(404).send({ error: 'not_found' });
  reply.code(doc.status).header('Content-Type', doc.contentType).send(doc.body);
});
```

**Hono** (Node, Bun, Deno, or Workers)

```ts
import { Hono } from 'hono';
const app = new Hono();
app.all('/api/mcp', c => agent.mcp.fetch(c.req.raw));
app.get('*', async c => {
  const res = await agent.serveAgentPath(c.req.raw);
  return res.status === 404 ? c.notFound() : res;
});
```

**Bun**

```ts
Bun.serve({
  port: 3000,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    if (pathname === '/api/mcp') return agent.mcp.fetch(req);
    return agent.serveAgentPath(req); // 404 for non-agent paths
  },
});
```

**Deno**

```ts
Deno.serve(req => {
  const { pathname } = new URL(req.url);
  return pathname === '/api/mcp' ? agent.mcp.fetch(req) : agent.serveAgentPath(req);
});
```

**Cloudflare Workers / edge**

```ts
export default {
  async fetch(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url);
    return pathname === '/api/mcp' ? agent.mcp.fetch(req) : agent.serveAgentPath(req);
  },
};
```

> Pass secrets via `env` on Workers (no `process.env`): build the stack inside the handler, or once per isolate — `createAgentStack` is cheap and stateless.

**React / Vue / any SPA (client-side)**

An SPA has no server, so it can't _host_ the MCP server or the discovery documents — those live in your backend (any recipe above). What a browser app _does_ own is **WebMCP**: in-page tools an in-browser agent can call directly via `navigator.modelContext`.

```tsx
// A React component, mounted once. No-op in browsers without WebMCP.
import { provideWebMcpTools } from '@buildbase/sdk';
import { useEffect } from 'react';

export function WebMcpTools() {
  useEffect(() => {
    provideWebMcpTools([
      {
        name: 'get_current_selection',
        description: "Return the user's current in-app selection",
        inputSchema: { type: 'object', properties: {} },
        execute: () => getSelectionFromStore(),
      },
    ]);
  }, []);
  return null;
}
```

For OAuth from an SPA: the agent (not your React code) runs the browser OAuth flow against the platform; your React app only needs to render your normal login. The MCP server + mint route stay on your backend.

### Mint route (`applicationTokenUrl`) per framework

The platform calls this on every grant to mint your token. It's the one route `createAgentStack` can't generate — it touches your database. See [the mint flow](#the-mint-flow-applicationtokenurl).

```ts
// Next.js App Router — app/api/auth/oauth2-token/route.ts
import { handleAppTokenRequest, mintAgentToken } from '@buildbase/sdk';
export async function POST(req: Request) {
  const { status, body } = await handleAppTokenRequest({
    authorization: req.headers.get('authorization'),
    clientSecret: process.env.BUILDBASE_CLIENT_SECRET!,
    mintToken: async claims => {
      await upsertUser(claims); // your DB
      return mintAgentToken({ claims, secret: process.env.SYSTEM_SECRET! });
    },
  });
  return Response.json(body, { status });
}

// Express / Node — same handler, req/res style
app.post('/api/auth/oauth2-token', async (req, res) => {
  const { status, body } = await handleAppTokenRequest({
    authorization: req.headers.authorization,
    clientSecret: process.env.BUILDBASE_CLIENT_SECRET!,
    mintToken: async claims => {
      await upsertUser(claims);
      return mintAgentToken({ claims, secret: process.env.SYSTEM_SECRET! });
    },
  });
  res.status(status).json(body);
});
```

### Manual wiring

When your app mints one token format for both web sessions and agents, or needs custom per-request auth, use the primitives directly:

```ts
import { createMcpHandler, defineMcpTool, buildbaseAuth } from '@buildbase/sdk/mcp';
import { resolveAgentPath, type AgentReadyConfig } from '@buildbase/sdk';

const mcp = createMcpHandler({
  buildbase,
  serverInfo: { name: 'my-app', version: '1.0.0' },
  auth: buildbaseAuth({ secret, resource }), // or your own auth.verify
  builtinTools: 'readonly',
  tools: [
    /* … */
  ],
});

const agentConfig: AgentReadyConfig = {
  serverUrl,
  orgId,
  siteUrl,
  site: { name },
  scopes: [{ name: 'demo:read', description: '…' }],
  protectedResources: [{ resource: `${siteUrl}/mcp` }], // scopes inherited from catalog
  mcpServerCard: mcp.serverCard({ endpoint: `${siteUrl}/api/mcp` }),
  // skills, apiCatalog, robots, security — all optional
};
// route: const doc = await resolveAgentPath(new URL(req.url).pathname, agentConfig)
```

### Environment variables

| Var                                | Held by             | Purpose                                           |
| ---------------------------------- | ------------------- | ------------------------------------------------- |
| `SYSTEM_SECRET`                    | Your app only       | Signs & verifies the access tokens agents carry   |
| `BUILDBASE_CLIENT_SECRET`          | Your app + platform | Authenticates the platform's calls to your app    |
| `NEXT_PUBLIC_BUILDBASE_SERVER_URL` | Public              | The platform AS base URL                          |
| `NEXT_PUBLIC_BUILDBASE_ORG_ID`     | Public              | Your org id                                       |
| `MCP_AUTH_DEBUG=1`                 | Optional            | Logs received-vs-expected `aud` on auth rejection |

Never expose `SYSTEM_SECRET` or `BUILDBASE_CLIENT_SECRET` to the browser — they sign/authenticate tokens. Only the `NEXT_PUBLIC_*` values are client-safe.

### Production checklist

- [ ] **`builtinTools`** set deliberately — default `'readonly'`; prefer an explicit `{ include: [...] }` allowlist over `'all'`.
- [ ] **`requireAudience: true`** on `buildbaseAuth` (the stack sets it) so audience-less tokens are rejected.
- [ ] **Short token lifetime** — mint agent tokens with a small `expiresInSec` (≈1h). Refresh re-mints; long-lived agent tokens are a liability.
- [ ] **`rateLimit`** wired to your own store (KV/Redis/edge), and platform/edge rate limiting in front of `/api/mcp`.
- [ ] **`maxRequestBytes`** left at the 1 MiB default (or lower); **`allowedOrigins`** set if browser MCP clients connect from known origins.
- [ ] **`formatToolError`** returns a generic string in production so tool errors don't leak internals (`onError` still gets the full error for your logs).
- [ ] **HTTPS everywhere** — `siteUrl` is `https://`, so the derived resource URIs, card, and challenge are all TLS.
- [ ] **`onError` → your logger** for auth, rate-limit, context, and tool failures.
- [ ] **Verify the discovery surface is live** — run the [cold-start curl walk](#verify--troubleshoot) against production; every well-known URL returns 200 and the 401 challenge points at a real one.
- [ ] **Scale-out safe** — the MCP server is stateless (no session store); `createAgentStack` is cheap to build per-isolate/worker.

---

## Spec compliance

| Spec                        | Target        | Where it lives                                                                                                                                                                                                 |
| --------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP protocol                | 2025-11-25    | `initialize` advertises it; server card `protocolVersion`                                                                                                                                                      |
| MCP auth                    | 2025-06-18    | RFC 9728 challenge → RFC 8414 metadata → DCR + PKCE                                                                                                                                                            |
| Server card                 | SEP-1649 v1.0 | `buildMcpServerCard` — `$schema`, `version:"1.0"`, `transport:{type,url}`, boolean caps                                                                                                                        |
| Discovery manifest          | SEP-1960      | `buildMcpDiscoveryManifest` — `$schema`, `version:"1.0"`, per-server `transport` object                                                                                                                        |
| AS metadata                 | RFC 8414      | Proxied from platform; advertises `"none"` (public clients) + `S256`. Scope-agnostic — scopes live on your RFC 9728 metadata                                                                                   |
| Protected resource          | RFC 9728      | `buildProtectedResourceMetadata` — root + `<host>/mcp` + endpoint                                                                                                                                              |
| Resource indicators         | RFC 8707      | `resource` passed through the AS → `aud`; `buildbaseAuth` enforces the audience at your resource                                                                                                               |
| Dynamic client registration | RFC 7591      | Platform issues public clients (`none`, no secret)                                                                                                                                                             |
| PKCE                        | RFC 7636      | Forced for public clients; token exchange requires `code_verifier`                                                                                                                                             |
| Bearer challenge            | RFC 6750      | `bearerChallenge` / the handler's 401                                                                                                                                                                          |
| isitagentready.com          | —             | robots + Content Signals, sitemap, Link header, markdown negotiation, llms.txt/-full, Agent + A2A cards, agent-skills, API catalog, MCP server card, OAuth discovery, Web Bot Auth (opt-in), DNS-AID (records) |

---

## Verify & troubleshoot

**List tools with the real MCP client:**

```bash
npx @modelcontextprotocol/inspector --cli <mcp-url> --transport http \
  --header "Authorization: Bearer <token>" --method tools/list
```

**Walk the discovery chain by hand** (this is what a cold agent does):

```bash
# 1. the 401 points you at the resource metadata
curl -sS -i -X POST <app>/api/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | grep -i www-authenticate
# 2. → 3. follow resource metadata → authorization_servers → AS metadata
curl -sS <app>/.well-known/oauth-protected-resource/mcp | jq
curl -sS <app>/.well-known/oauth-authorization-server | jq   # token_endpoint_auth_methods must include "none"
```

| Symptom                                   | Likely cause                                  | Fix                                                                                            |
| ----------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Agent gets `401` and stops                | `WWW-Authenticate` missing or points at a 404 | Set `auth.resourceMetadataUrl` (or use `createAgentStack`); confirm the URL returns 200        |
| Token rejected with `401`                 | `aud` mismatch                                | Set `MCP_AUTH_DEBUG=1`; ensure the token's `aud` includes your `resource`                      |
| Built-in tools fail but custom tools work | Token has no/undecryptable `sid`              | Confirm the platform sends `sessionId` and you embed it; same `SYSTEM_SECRET` on mint + verify |
| Tool missing from `tools/list`            | Its `requiredScopes` aren't in the token      | Grant the scope, or drop the requirement                                                       |
| Client can't register                     | DCR disabled for the org                      | Enable `agentReadiness.dynamicClientRegistration` in org settings                              |

---

## API reference

**`@buildbase/sdk/mcp`** — `createAgentStack`, `createMcpHandler`, `defineMcpTool`, `builtinMcpTools`, `selectBuiltinTools`, `buildbaseAuth`, `mintAgentToken`, `createSessionRefCrypto`; re-exports `signClientJwt`, `verifyClientJwt`, `extractBearerToken`, `bearerChallenge`, `AppBridgeError`. Types: `AgentStack`, `AgentStackConfig`, `CreateMcpHandlerConfig`, `McpHandler`, `McpToolDefinition`, `McpToolContext`, `McpAuthInfo`, `McpHttpRequest`, `McpHttpResponse`, `McpToolAnnotations`, `McpBuildBaseClient`, `BuiltinMcpToolName`, `BuildBaseAuthOptions`, `MintAgentTokenOptions`, `SessionRefCrypto`, `McpServerCard`.

**`@buildbase/sdk` (core)** — discovery: `resolveAgentPath`, `resolveWellKnown`, `fetchAgentReadiness`, `clearAgentReadinessCache`, `buildAgentCard`, `buildA2AAgentCard`, `buildProtectedResourceMetadata`, `buildAgentSkillsIndex`, `buildSkillMd`, `buildSecurityTxt`, `buildLlmsTxt`, `buildLlmsFullTxt`, `buildRobotsTxt`, `buildSitemap`, `buildApiCatalog`, `buildMcpServerCard`, `buildMcpDiscoveryManifest`, `buildAuthMd`, `buildWebBotAuthDirectory`, `buildDnsAidRecords`, `buildDiscoveryLinkHeader`, `wantsMarkdown`, `negotiateMarkdown`, `provideWebMcpTools`, `sha256Digest`, `AI_BOT_USER_AGENTS`. App-bridge: `handleAppTokenRequest`, `handleAppRevokeRequest`, `verifyAppTokenRequest`, `verifyAppRevokeRequest`, `appTokenSuccess`, `appTokenFailure`. Presets: `mintAgentToken`, `buildbaseAuth`, `createSessionRefCrypto`. Types: `AgentReadyConfig`, `AgentReadinessBundle`, `AgentSkill`, `AppScope`, `ApiCatalogApi`, `A2ACardConfig`, `A2ACardSkill`, `DnsAidRecord`, `McpServerCard`, `RobotsConfig`, `RobotsPolicy`, `ContentSignals`, `SitemapUrl`, `DiscoveryDocument`, `WebMcpTool`, `AppTokenRequestClaims`, `AppRevokeRequestClaims`, `AppTokenResult`, `AppTokenResponseBody`, `HandlerResult`, `VerifyClientJwtOptions`.

---

_This guide is the canonical reference. The README's Agent Readiness / MCP Server / OAuth2 App Bridge sections are the short overview and link here; `AGENTS.md` carries the dense per-symbol reference._
