'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception to console
    console.error('[Leadsy Client Runtime Error]:', error);
  }, [error]);

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
            {error?.message || 'Terjadi kesalahan tidak terduga pada browser saat memuat data.'}
          </p>
          {error?.digest && (
            <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
              Error Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand)] text-[var(--brand-foreground,#ffffff)] font-medium text-sm hover:opacity-90 transition-opacity shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Coba Muat Ulang
          </button>
          <Link
            href="/"
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
