"use client";

import Link from "next/link";
import { CloudOff, RefreshCw, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOfflineSync } from "@/lib/offline/offlineSyncManager";

export default function OfflinePage() {
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();

  const handleRetry = async () => {
    if (navigator.onLine) {
      await syncNow();
      window.location.href = "/dashboard";
      return;
    }
    window.location.reload();
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-10 pt-safe pb-safe">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardContent className="flex flex-col items-center space-y-5 p-6 text-center sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--warning-soft)] text-[var(--warning)]">
            {isOnline ? <CheckCircle2 className="h-7 w-7 text-[var(--success)]" /> : <CloudOff className="h-7 w-7" />}
          </div>

          <div className="space-y-2">
            <Badge variant={isOnline ? "success" : "warning"}>
              {isOnline ? "Koneksi Pulih" : "Mode Offline"}
            </Badge>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {isOnline ? "Anda Kembali Online" : "Tidak Ada Koneksi Internet"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isOnline
                ? "Koneksi jaringan telah tersedia kembali. Anda dapat melanjutkan aktivitas workspace sekarang."
                : "Leadsy tidak dapat menjangkau server saat ini. Catatan lapangan atau field check-in yang sudah tersimpan di antrean perangkat tetap aman dan akan tersinkronisasi otomatis saat sinyal kembali."}
            </p>
          </div>

          {pendingCount > 0 && (
            <div className="w-full rounded-xl border border-border bg-[var(--surface-subtle)] px-4 py-3 text-left">
              <p className="text-xs font-semibold text-foreground">
                {pendingCount} aktivitas lapangan tersimpan di antrean lokal
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Data akan dikirim otomatis begitu koneksi internet stabil.
              </p>
            </div>
          )}

          <div className="flex w-full flex-col gap-2.5 sm:flex-row">
            <Button
              variant="default"
              className="w-full flex-1 gap-2"
              onClick={handleRetry}
              disabled={isSyncing}
            >
              <RefreshCw className={isSyncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              {isOnline ? "Buka Workspace" : "Coba Muat Ulang"}
            </Button>
            {isOnline && (
              <Link href="/dashboard" className="w-full flex-1">
                <Button variant="outline" className="w-full gap-2">
                  Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

