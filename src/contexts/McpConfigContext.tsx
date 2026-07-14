'use client';

import React, { createContext, useContext, useMemo } from 'react';

/**
 * Setup steps for one app/tool a person can connect to the server, shown as an
 * expandable row in the connect guide. In `instructions` and `snippet` you can
 * use these placeholders, filled in at render time:
 * `{{url}}` (server address), `{{name}}` (display name), `{{key}}` (a short
 * safe id used as the key inside config files).
 */
export interface McpClientGuide {
  /** Stable identifier (React key). */
  id: string;
  /** Display name shown on the row, e.g. `"Cursor"`. Not translated (proper noun). */
  name: string;
  /** Plain-language steps shown above the snippet (what to click / where to paste). */
  instructions?: string;
  /** A config snippet the person copies and pastes. Usually JSON. */
  snippet?: string;
  /** Optional button link (e.g. a one-click install deep link). */
  actionUrl?: string;
  /** Label for {@link actionUrl}. */
  actionLabel?: string;
}

/**
 * MCP connection info passed to `SaaSOSProvider` via the `mcp` prop. Drives the
 * "Connect an agent" guide on the Connected Agents screen. The guide only
 * renders when `url` is set.
 *
 * @example
 * ```tsx
 * <SaaSOSProvider
 *   mcp={{
 *     url: 'https://app.example.com/api/mcp',
 *     name: 'Acme',
 *     docsUrl: 'https://docs.example.com/agents',
 *   }}
 * >
 * ```
 */
export interface McpConnectionConfig {
  /** MCP server endpoint URL. Required — the guide renders only when set. */
  url: string;
  /** Friendly server name used in prose and snippets. Defaults to `'app'`. */
  name?: string;
  /** "Learn more" docs link shown at the bottom of the guide. */
  docsUrl?: string;
  /**
   * The app/tool setup rows. When omitted, a translated built-in set covering
   * the major AI apps (ChatGPT, Claude, Cursor, VS Code, Windsurf, Cline) is
   * used. Provide your own to override or extend.
   */
  clients?: McpClientGuide[];
  /**
   * The copy-and-paste prompt shown for chat-style AIs ("paste this to connect").
   * Defaults to a translated sentence; pass a string to customize (supports
   * `{{url}}`/`{{name}}`), or `false` (or an empty string) to hide the prompt
   * block entirely.
   */
  prompt?: string | false;
}

const McpConfigContext = createContext<McpConnectionConfig | null>(null);

/**
 * Fill `{{url}}` / `{{name}}` / `{{key}}` (and any extra vars) placeholders in a
 * guide template. Single pass, so a value that itself contains `{{…}}` text is
 * never re-substituted; unknown placeholders are left untouched.
 *
 * Values are inserted **verbatim** — when a template is JSON (a client
 * `snippet`), pass values that are already valid inside a JSON string (the
 * built-in snippets only interpolate the URL and the JSON-safe {@link mcpServerKey}).
 */
export function fillMcpTemplate(
  template: string | undefined,
  vars: Record<string, string>
): string | undefined {
  if (!template) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in vars ? vars[key] : match
  );
}

/**
 * A short, file-safe id derived from a display name — used as the `{{key}}`
 * (the JSON key inside config-file snippets). Always `[a-z0-9-]+`, so it is
 * safe to drop into JSON unescaped; falls back to `'app'` when the name has no
 * ASCII alphanumerics (e.g. a non-Latin name).
 */
export function mcpServerKey(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'app';
}

export function McpConfigProvider({
  mcp,
  children,
}: {
  mcp?: McpConnectionConfig;
  children: React.ReactNode;
}) {
  // Trim a trailing slash so snippets read cleanly; null when no url configured.
  const value = useMemo<McpConnectionConfig | null>(() => {
    if (!mcp?.url) return null;
    return { ...mcp, url: mcp.url.replace(/\/+$/, '') };
  }, [mcp]);
  return <McpConfigContext.Provider value={value}>{children}</McpConfigContext.Provider>;
}

/**
 * The MCP connection config passed to `SaaSOSProvider`, or `null` when none was
 * provided. Use it to build a custom connect guide; the ready-made UI is
 * `<ConnectMcpGuide />` (and it's embedded in `<ConnectedAgents />`).
 */
export function useMcpConnection(): McpConnectionConfig | null {
  return useContext(McpConfigContext);
}
