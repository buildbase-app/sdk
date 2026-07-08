'use client';

import IntlMessageFormat from 'intl-messageformat';
import React, { createContext, useContext, useMemo } from 'react';
import { en } from './messages/en';
import type { PartialSDKMessages, SDKLocale, SDKMessages, TranslationKey } from './types';

/** Values that can be interpolated into ICU messages */
export type TranslationValues = Record<string, string | number | boolean>;

// ─── Message Registry ──────────────────────────────────────────────────────────

// Lazy-load non-English translations to keep the initial bundle small.
// English is always bundled (default). Others are loaded on demand.
const messageLoaders: Record<SDKLocale, () => Promise<SDKMessages>> = {
  en: async () => en,
  es: async () => (await import('./messages/es')).es,
  fr: async () => (await import('./messages/fr')).fr,
  de: async () => (await import('./messages/de')).de,
  ja: async () => (await import('./messages/ja')).ja,
  zh: async () => (await import('./messages/zh')).zh,
  hi: async () => (await import('./messages/hi')).hi,
  ar: async () => (await import('./messages/ar')).ar,
};

/** All supported locale codes */
export const SUPPORTED_LOCALES: SDKLocale[] = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi', 'ar'];

// ─── Locale Resolution ────────────────────────────────────────────────────────

/**
 * Resolves a requested locale to the closest supported locale.
 * Handles regional variants: "zh-TW" → "zh", "es-MX" → "es", "pt-BR" → "en".
 */
export function resolveLocale(requested: string): SDKLocale {
  const normalized = requested.toLowerCase().replace('_', '-');

  // Exact match
  if (SUPPORTED_LOCALES.includes(normalized as SDKLocale)) {
    return normalized as SDKLocale;
  }

  // Strip region: "zh-TW" → "zh", "es-MX" → "es"
  const base = normalized.split('-')[0] as SDKLocale;
  if (SUPPORTED_LOCALES.includes(base)) {
    return base;
  }

  return 'en';
}

/**
 * BCP 47 locale tags with native numbering systems for Intl formatters.
 * - "hi" → "hi-u-nu-deva" (Devanagari: १, २, ३)
 * - "ar" → "ar-u-nu-arab" (Arabic-Indic: ١, ٢, ٣)
 * Used by ICU MessageFormat and all Intl.NumberFormat/DateTimeFormat calls.
 */
const NATIVE_NUMERAL_LOCALES: Partial<Record<SDKLocale, string>> = {
  hi: 'hi-u-nu-deva',
  ar: 'ar-u-nu-arab',
};

/**
 * Get the Intl-compatible locale string for number/date formatting.
 * Appends Unicode numbering system extension where applicable.
 * e.g. "hi" → "hi-u-nu-deva" (₹१.०० instead of ₹1.00)
 */
export function getFormattingLocale(locale: SDKLocale): string {
  return NATIVE_NUMERAL_LOCALES[locale] ?? locale;
}

// ─── Message Overrides ─────────────────────────────────────────────────────────

/**
 * Deep-merge implementor overrides over a locale bundle.
 * Strings replace; objects merge recursively; non-matching shapes are ignored.
 */
function mergeMessages<T>(base: T, overrides: DeepOverrides<T>): T {
  const result = { ...base };
  for (const key of Object.keys(overrides) as Array<keyof T>) {
    const override = overrides[key];
    const baseValue = base[key];
    if (typeof override === 'string') {
      result[key] = override as T[keyof T];
    } else if (
      override &&
      typeof override === 'object' &&
      baseValue &&
      typeof baseValue === 'object'
    ) {
      result[key] = mergeMessages(baseValue, override as DeepOverrides<T[keyof T]>);
    }
  }
  return result;
}

type DeepOverrides<T> = {
  [K in keyof T]?: T[K] extends string ? string : DeepOverrides<T[K]>;
};

// ─── Context ───────────────────────────────────────────────────────────────────

interface TranslationContextValue {
  messages: SDKMessages;
  locale: SDKLocale;
  /** BCP 47 locale with native numbering system for Intl formatters */
  formattingLocale: string;
}

const TranslationContext = createContext<TranslationContextValue>({
  messages: en,
  locale: 'en',
  formattingLocale: 'en',
});

// ─── Provider ──────────────────────────────────────────────────────────────────

/**
 * Internal translation provider. Wraps children with the translation context.
 * Used by SaaSOSProvider — not exported to consumers directly.
 *
 * Accepts any locale string (e.g. "zh-TW") and resolves it to the closest
 * supported locale via `resolveLocale()`.
 */
export function TranslationProvider({
  locale: rawLocale = 'en',
  messageOverrides,
  children,
}: {
  locale?: string;
  /** Per-key string overrides deep-merged over the loaded locale bundle */
  messageOverrides?: PartialSDKMessages;
  children: React.ReactNode;
}) {
  const locale = resolveLocale(rawLocale);
  const [loadedMessages, setLoadedMessages] = React.useState<SDKMessages>(en);

  React.useEffect(() => {
    if (locale === 'en') {
      setLoadedMessages(en);
      return;
    }
    let cancelled = false;
    const loader = messageLoaders[locale];
    if (loader) {
      loader().then(m => {
        if (!cancelled) setLoadedMessages(m);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const messages = useMemo(
    () => (messageOverrides ? mergeMessages(loadedMessages, messageOverrides) : loadedMessages),
    [loadedMessages, messageOverrides]
  );

  const formattingLocale = getFormattingLocale(locale);
  const value = useMemo(
    () => ({ messages, locale, formattingLocale }),
    [messages, locale, formattingLocale]
  );

  return React.createElement(TranslationContext.Provider, { value }, children);
}

// ─── Memoized Intl Formatters ─────────────────────────────────────────────────

// Sharing Intl formatter instances across format() calls avoids recreating
// expensive Intl constructors on every render. Up to ~30x speedup on
// messages that use {count, plural, ...} or number/date formatting.

const numberFormatCache = new Map<string, Intl.NumberFormat>();
const dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();
const pluralRulesCache = new Map<string, Intl.PluralRules>();

function stableKey(locale: string, opts?: object): string {
  return opts ? `${locale}:${JSON.stringify(opts)}` : locale;
}

const memoizedFormatters = {
  getNumberFormat(locale: string, opts?: Intl.NumberFormatOptions): Intl.NumberFormat {
    const key = stableKey(locale, opts);
    let fmt = numberFormatCache.get(key);
    if (!fmt) {
      fmt = new Intl.NumberFormat(locale, opts);
      numberFormatCache.set(key, fmt);
    }
    return fmt;
  },
  getDateTimeFormat(locale: string, opts?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const key = stableKey(locale, opts);
    let fmt = dateTimeFormatCache.get(key);
    if (!fmt) {
      fmt = new Intl.DateTimeFormat(locale, opts);
      dateTimeFormatCache.set(key, fmt);
    }
    return fmt;
  },
  getPluralRules(locale: string, opts?: Intl.PluralRulesOptions): Intl.PluralRules {
    const key = stableKey(locale, opts);
    let fmt = pluralRulesCache.get(key);
    if (!fmt) {
      fmt = new Intl.PluralRules(locale, opts);
      pluralRulesCache.set(key, fmt);
    }
    return fmt;
  },
};

// ─── ICU MessageFormat Cache ──────────────────────────────────────────────────

// Cache compiled ICU messages to avoid re-parsing on every render.
// Bounded by message catalog size (~400 keys × 8 locales = ~3200 entries max).
const icuCache = new Map<string, IntlMessageFormat>();

function getOrCreateICU(raw: string, locale: string): IntlMessageFormat {
  const cacheKey = `${locale}:${raw}`;
  let msg = icuCache.get(cacheKey);
  if (!msg) {
    msg = new IntlMessageFormat(raw, locale, undefined, {
      formatters: memoizedFormatters,
    });
    icuCache.set(cacheKey, msg);
  }
  return msg;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Access SDK translations. Returns a type-safe `t()` function for nested key
 * lookup with optional ICU MessageFormat interpolation.
 *
 * @example
 * ```tsx
 * const { t } = useTranslation();
 *
 * // Simple lookup — autocomplete and compile-time typo checking
 * t('settings.common.refresh')  // → 'Refresh'
 *
 * // ICU interpolation with placeholders
 * t('usage.estOverageCharges', { amount: '$12.50' })
 * // → 'Estimated overage charges this period: $12.50'
 *
 * // ICU plural rules (handles Arabic's 6 forms, etc.)
 * t('users.memberCount', { count: 3 })
 * // → '3 members'
 * ```
 */
export function useTranslation() {
  const { messages, locale, formattingLocale } = useContext(TranslationContext);

  const t = useMemo(() => {
    // Dot-path key lookup; returns undefined when the key is missing
    const lookup = (source: SDKMessages, key: string): string | undefined => {
      let current: unknown = source;
      for (const part of key.split('.')) {
        if (current && typeof current === 'object' && part in current) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
      return typeof current === 'string' ? current : undefined;
    };

    return (key: TranslationKey, values?: TranslationValues): string => {
      // Fallback chain: active locale → English → the key itself
      const raw = lookup(messages, key) ?? lookup(en, key) ?? key;

      // Fast path: no values → return raw string (zero overhead for static strings)
      if (!values) return raw;

      // ICU MessageFormat: parse, cache, and format with formattingLocale
      // (e.g. "hi-u-nu-deva" for Devanagari numerals in Hindi)
      try {
        const msg = getOrCreateICU(raw, formattingLocale);
        const result = msg.format(values);
        return typeof result === 'string' ? result : String(result);
      } catch {
        // If ICU parsing fails, fall back to simple placeholder replacement
        return raw.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? `{${k}}`));
      }
    };
  }, [messages, formattingLocale]);

  /** Text direction for current locale */
  const dir: 'rtl' | 'ltr' = locale === 'ar' ? 'rtl' : 'ltr';

  /** Format a number with locale-aware digits (e.g. 3 → ३ in Hindi, ٣ in Arabic) */
  const fmtNum = useMemo(() => {
    return (n: number) => n.toLocaleString(formattingLocale);
  }, [formattingLocale]);

  /** Format cents as locale-aware currency (e.g. 100, 'usd' → $1.00 or ١٫٠٠ US$) */
  const fmtCents = useMemo(() => {
    return (cents: number, currency: string): string => {
      const code = (currency ?? '').trim().toUpperCase();
      if (!code)
        return (cents / 100).toLocaleString(formattingLocale, { minimumFractionDigits: 2 });
      try {
        return new Intl.NumberFormat(formattingLocale, {
          style: 'currency',
          currency: code,
          minimumFractionDigits: 2,
        }).format(cents / 100);
      } catch {
        // Fallback for unknown currency codes
        return (cents / 100).toLocaleString(formattingLocale, { minimumFractionDigits: 2 });
      }
    };
  }, [formattingLocale]);

  return { t, locale, formattingLocale, dir, fmtNum, fmtCents, messages };
}

// ─── Re-exports ────────────────────────────────────────────────────────────────

export type { PartialSDKMessages, SDKLocale, SDKMessages, TranslationKey } from './types';
