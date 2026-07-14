'use client';

import { ExternalLink } from 'lucide-react';
import {
  fillMcpTemplate,
  mcpServerKey,
  useMcpConnection,
  type McpClientGuide,
  type McpConnectionConfig,
} from '../../contexts/McpConfigContext';
import { useTranslation } from '../../i18n';
import { cn } from '../../lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { CopyField } from '../ui/copy-field';
import { SectionHeader } from '../ui/section-header';

export interface ConnectMcpGuideProps {
  /**
   * Connection config. Defaults to the `mcp` prop passed to `SaaSOSProvider`
   * (via `useMcpConnection()`); pass explicitly to render a guide elsewhere.
   */
  config?: McpConnectionConfig | null;
  /** Heading. Defaults to the translated title; `null` hides it. */
  title?: string | null;
  /** Sub-heading. Defaults to the translated description; `null` hides it. */
  description?: string | null;
  className?: string;
}

/**
 * A friendly "Connect an agent" guide: the server address, a copy-and-paste
 * prompt for chat assistants, and step-by-step setup for the major AI apps
 * (ChatGPT, Claude, Cursor, VS Code, Windsurf, Cline by default; override via
 * `config.clients`). Renders `null` when no MCP `url` is configured.
 *
 * Shown inside `<ConnectedAgents />`; also exported for standalone use.
 */
export function ConnectMcpGuide({ config, title, description, className }: ConnectMcpGuideProps) {
  const { t } = useTranslation();
  const fromProvider = useMcpConnection();
  const mcp = config ?? fromProvider;

  if (!mcp?.url) return null;

  const displayName = mcp.name?.trim() || 'app';
  const vars = { url: mcp.url, name: displayName, key: mcpServerKey(displayName) };

  const configFileClient = (
    id: string,
    name: string,
    path: string,
    snippet: string
  ): McpClientGuide => ({
    id,
    name,
    // Wrap the file path in a Unicode LTR isolate (LRI…PDI) so it renders in
    // order inside an RTL sentence (otherwise the leading `~/` and trailing `:`
    // reorder in Arabic). Display-only text — never copied.
    instructions: t('security.mcpAddToConfigFile', { path: `\u2066${path}\u2069` }),
    snippet,
  });

  const defaultClients: McpClientGuide[] = [
    { id: 'chatgpt', name: 'ChatGPT', instructions: t('security.mcpClientChatgptInstructions') },
    { id: 'claude', name: 'Claude', instructions: t('security.mcpClientClaudeInstructions') },
    configFileClient(
      'cursor',
      'Cursor',
      '~/.cursor/mcp.json',
      `{
  "mcpServers": {
    "{{key}}": {
      "url": "{{url}}"
    }
  }
}`
    ),
    configFileClient(
      'vscode',
      'VS Code',
      '.vscode/mcp.json',
      `{
  "servers": {
    "{{key}}": {
      "type": "http",
      "url": "{{url}}"
    }
  }
}`
    ),
    configFileClient(
      'windsurf',
      'Windsurf',
      '~/.codeium/windsurf/mcp_config.json',
      `{
  "mcpServers": {
    "{{key}}": {
      "serverUrl": "{{url}}"
    }
  }
}`
    ),
    { id: 'cline', name: 'Cline', instructions: t('security.mcpClientClineInstructions') },
  ];

  const clients = mcp.clients ?? defaultClients;

  const resolvedTitle = title === undefined ? t('security.mcpGuideTitle') : title;
  const resolvedDescription =
    description === undefined ? t('security.mcpGuideDescription') : description;

  const copyLabel = t('security.mcpCopy');
  const copiedLabel = t('security.mcpCopied');

  const promptTemplate =
    mcp.prompt === false ? null : (mcp.prompt ?? t('security.mcpPromptTemplate'));
  // Copied value uses the raw URL/name; the displayed value isolates them
  // (LRI…PDI for the always-LTR URL, FSI…PDI for the direction-agnostic name)
  // so they don't reorder inside an RTL prompt sentence.
  const promptText = fillMcpTemplate(promptTemplate ?? undefined, vars);
  const promptDisplay = fillMcpTemplate(promptTemplate ?? undefined, {
    ...vars,
    url: `\u2066${vars.url}\u2069`,
    name: `\u2068${vars.name}\u2069`,
  });

  return (
    <div className={cn('space-y-5', className)}>
      <SectionHeader title={resolvedTitle} description={resolvedDescription} />

      {/* Step 1 — the address some apps just ask you to paste. */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t('security.mcpServerUrlLabel')}</p>
        <p className="text-xs text-muted-foreground">{t('security.mcpServerUrlHint')}</p>
        <CopyField value={mcp.url} copyLabel={copyLabel} copiedLabel={copiedLabel} />
      </div>

      {/* Step 2 — a sentence to paste into any chat assistant. */}
      {promptText && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{t('security.mcpPromptLabel')}</p>
          <p className="text-xs text-muted-foreground">{t('security.mcpPromptHint')}</p>
          <CopyField
            value={promptText}
            displayValue={promptDisplay}
            copyLabel={copyLabel}
            copiedLabel={copiedLabel}
            variant="text"
          />
        </div>
      )}

      {/* Step 3 — pick-your-app step-by-step. */}
      {clients.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{t('security.mcpClientsLabel')}</p>
          <Accordion
            type="single"
            collapsible
            defaultValue={clients[0]?.id}
            className="rounded-md border px-3"
          >
            {clients.map(client => {
              const instructions = fillMcpTemplate(client.instructions, vars);
              const snippet = fillMcpTemplate(client.snippet, vars);
              return (
                <AccordionItem key={client.id} value={client.id}>
                  <AccordionTrigger>{client.name}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {instructions && (
                        <p className="text-sm text-muted-foreground">{instructions}</p>
                      )}
                      {snippet && (
                        <CopyField
                          value={snippet}
                          copyLabel={copyLabel}
                          copiedLabel={copiedLabel}
                          variant="code"
                        />
                      )}
                      {client.actionUrl && (
                        <a
                          href={client.actionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          {client.actionLabel ?? client.actionUrl}
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}

      {mcp.docsUrl && (
        <a
          href={mcp.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {t('security.mcpLearnMore')}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
