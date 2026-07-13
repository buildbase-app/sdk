'use client';

import React from 'react';

import { useTranslation } from '../../i18n';

export interface FullScreenLoaderProps {
  /** Content to display centered on screen. Falls back to a default spinner + message. */
  children?: React.ReactNode;
  /** Message shown below the default spinner (only used when no children are provided). Defaults to the translated "Loading..." */
  message?: string;
  /** Background color of the overlay. Defaults to white (dark mode: near-black). */
  backgroundColor?: string;
}

/** Default spinner used when no children are provided. */
const DefaultSpinner = ({ message }: { message: string }) => (
  <>
    <div
      className="bb-fs-loader-spinner"
      style={{
        width: 40,
        height: 40,
        border: '3px solid hsl(var(--muted, 210 40% 96%))',
        borderTopColor: 'hsl(var(--muted-foreground, 215.4 16.3% 46.9%))',
        borderRadius: '50%',
        animation: 'bb-fs-loader-spin 0.6s linear infinite',
      }}
    />
    <p
      aria-hidden="true"
      style={{
        marginTop: 16,
        color: 'hsl(var(--muted-foreground, 215.4 16.3% 46.9%))',
        fontSize: 14,
      }}
    >
      {message}
    </p>
    <style>{`
      @keyframes bb-fs-loader-spin { to { transform: rotate(360deg) } }
      @media (prefers-reduced-motion: reduce) {
        .bb-fs-loader-spinner { animation: none !important; }
      }
      @media (prefers-color-scheme: dark) {
        .bb-fs-loader-spinner {
          border-color: hsl(var(--muted, 217.2 32.6% 17.5%)) !important;
          border-top-color: hsl(var(--muted-foreground, 215 20.2% 65.1%)) !important;
        }
      }
    `}</style>
  </>
);

/**
 * Full-screen overlay that centers its content.
 * Uses inline styles — works without any CSS imports.
 * Respects dark mode and reduced-motion preferences.
 *
 * @example Default spinner
 * ```tsx
 * <FullScreenLoader message="Signing you in..." />
 * ```
 *
 * @example Custom content
 * ```tsx
 * <FullScreenLoader>
 *   <img src="/logo.svg" alt="Logo" />
 *   <p>Loading your workspace...</p>
 * </FullScreenLoader>
 * ```
 */
export const FullScreenLoader = ({
  children,
  message: messageProp,
  backgroundColor,
}: FullScreenLoaderProps) => {
  const { t } = useTranslation();
  const message = messageProp ?? t('settings.common.loading');
  return (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="bb-fs-loader"
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2147483647,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: backgroundColor ?? undefined,
    }}
  >
    {/* Screen-reader-only live text for message updates */}
    <span
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0,0,0,0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {message}
    </span>
    {children ?? <DefaultSpinner message={message} />}
    <style>{`
      .bb-fs-loader {
        background-color: hsl(var(--background, 0 0% 100%));
      }
      @media (prefers-color-scheme: dark) {
        .bb-fs-loader {
          background-color: hsl(var(--background, 222.2 84% 4.9%));
        }
        .bb-fs-loader p {
          color: hsl(var(--muted-foreground, 215 20.2% 65.1%)) !important;
        }
      }
    `}</style>
  </div>
  );
};

FullScreenLoader.displayName = 'FullScreenLoader';
