'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Leadsy Global Error]:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#090d16', color: '#f8fafc', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ maxWidth: '28rem', width: '100%', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: '#131b2e', padding: '2rem', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: '#ffffff' }}>
            Terjadi Kendala Sistem
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {error?.message || 'Aplikasi mengalami kendala saat inisialisasi awal. Silakan refresh halaman.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => reset()}
              style={{ padding: '0.625rem 1.25rem', borderRadius: '0.75rem', backgroundColor: '#4f46e5', color: '#ffffff', fontWeight: 500, fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}
            >
              Coba Lagi
            </button>
            <button
              onClick={() => { window.location.href = '/login'; }}
              style={{ padding: '0.625rem 1.25rem', borderRadius: '0.75rem', backgroundColor: 'transparent', color: '#cbd5e1', fontWeight: 500, fontSize: '0.875rem', border: '1px solid rgba(255, 255, 255, 0.2)', cursor: 'pointer' }}
            >
              Halaman Login
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
