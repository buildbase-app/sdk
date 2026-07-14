'use client';

import { Check, Copy } from 'lucide-react';
import * as React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';

/**
 * Copy a string to the clipboard, resolving `true` on success. Falls back to a
 * hidden-textarea `execCommand('copy')` where the async Clipboard API is
 * unavailable (insecure origins, older browsers).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * - `inline`: one-line monospace field that truncates (server URLs).
 * - `code`: multi-line monospace block for JSON/config snippets.
 * - `text`: wrapped normal-weight text for a sentence (the paste-in prompt).
 */
export type CopyFieldVariant = 'inline' | 'code' | 'text';

export interface CopyFieldProps {
  /** The value copied to the clipboard. */
  value: string;
  /**
   * What to render, when it must differ from what's copied — e.g. the same
   * text with Unicode bidi isolates added so an embedded URL renders correctly
   * inside RTL prose. Defaults to {@link value}.
   */
  displayValue?: string;
  /** Accessible label for the copy button (e.g. "Copy"). */
  copyLabel: string;
  /** Announced/visible label after a successful copy (e.g. "Copied"). */
  copiedLabel: string;
  /** How to render the value. Default `inline`. */
  variant?: CopyFieldVariant;
  className?: string;
}

/**
 * A read-only value with a copy-to-clipboard button and transient "copied"
 * feedback. Pick the {@link CopyFieldVariant} that matches the content.
 *
 * Responsive by variant: `inline` is a single compact row (the copy label
 * hides below `sm` so long URLs keep their room); `code`/`text` put the copy
 * button in a top toolbar so the block below spans full width — long JSON
 * scrolls horizontally inside its own block instead of squeezing the button.
 */
export function CopyField({
  value,
  displayValue,
  copyLabel,
  copiedLabel,
  variant = 'inline',
  className,
}: CopyFieldProps) {
  const shown = displayValue ?? value;
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const onCopy = async () => {
    const ok = await copyToClipboard(value);
    if (!ok) return;
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const copyButton = (hideLabelOnMobile: boolean) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onCopy}
      aria-label={copied ? copiedLabel : copyLabel}
      className="h-7 shrink-0 gap-1.5 px-2"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span className={cn('text-xs', hideLabelOnMobile && 'hidden sm:inline')}>
        {copied ? copiedLabel : copyLabel}
      </span>
    </Button>
  );

  // Inline (URL): one compact row; the URL truncates, the button stays put and
  // sheds its text label on the narrowest screens. Forced LTR — a URL is never
  // right-to-left, even inside an RTL dialog.
  if (variant === 'inline') {
    return (
      <div
        dir="ltr"
        className={cn(
          'flex items-center gap-2 rounded-md border bg-muted/40 py-1 ps-3 pe-1',
          className
        )}
      >
        <code className="min-w-0 flex-1 truncate text-xs" title={value}>
          {shown}
        </code>
        {copyButton(true)}
      </div>
    );
  }

  // Code / prompt: toolbar on top, full-width block below. Code is forced LTR
  // (JSON must never mirror in an RTL locale); the prompt is natural language,
  // so it inherits the ambient direction.
  return (
    <div
      dir={variant === 'code' ? 'ltr' : undefined}
      className={cn('overflow-hidden rounded-md border bg-muted/40', className)}
    >
      <div className="flex justify-end border-b bg-muted/30 px-1.5 py-1">{copyButton(false)}</div>
      {variant === 'code' ? (
        <pre className="overflow-x-auto p-3 text-start text-xs leading-relaxed">
          <code>{shown}</code>
        </pre>
      ) : (
        <p className="p-3 text-sm leading-relaxed">{shown}</p>
      )}
    </div>
  );
}
