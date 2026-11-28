'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Log exception to console
    console.error('[Leadsy Client Runtime Error]:', error);

    // Auto-heal for transient React 19 hook count desync during concurrent route navigation (#310)
    const isHookCountMismatch =
      error?.message?.includes('310') ||
      error?.message?.includes('Rendered more hooks') ||
      error?.message?.includes('Rendered fewer hooks') ||
      error?.message?.includes('Rules of Hooks');

    if (isHookCountMismatch && typeof window !== 'undefined') {
      const healKey = `leadsy_auto_heal_${window.location.pathname}`;
      const lastHeal = sessionStorage.getItem(healKey);
      const now = Date.now();

      // Trigger automatic recovery once per route transition within 3 seconds
      if (!lastHeal || now - Number(lastHeal) > 3000) {
        sessionStorage.setItem(healKey, String(now));
        setIsRetrying(true);
        const timer = setTimeout(() => {
          reset();
        }, 80);
        return () => clearTimeout(timer);
      }
    }
  }, [error, reset]);

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    } else {
      reset();
    }
  };

  const isMinifiedHookError =
    error?.message?.includes('310') ||
    error?.message?.includes('Rendered more hooks') ||
    error?.message?.includes('Rendered fewer hooks');

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-8 text-center shadow-xl space-y-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[var(--status-danger-bg,rgba(239,68,68,0.1))] text-[var(--status-danger,#ef4444)] flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Terjadi Kesalahan Aplikasi
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {isMinifiedHookError
              ? 'Terjadi sedikit kendala rendering saat berpindah halaman. Silakan muat ulang halaman untuk melanjutkan.'
              : error?.message || 'Terjadi kesalahan tidak terduga pada browser saat memuat data.'}
          </p>
          {error?.digest && !isMinifiedHookError && (
            <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
              Error Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={handleReload}
            disabled={isRetrying}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand)] text-[var(--brand-foreground,#ffffff)] font-medium text-sm hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
          >
            <RotateCcw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Memulihkan Tampilan...' : 'Coba Muat Ulang'}
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-primary)] font-medium text-sm hover:bg-[var(--surface-subtle)] transition-colors"
          >
            <Home className="w-4 h-4" />
            Ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
