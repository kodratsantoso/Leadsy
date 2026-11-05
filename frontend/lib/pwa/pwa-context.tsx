"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Download, Share, PlusSquare, Smartphone, CheckCircle2, MoreVertical } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

interface PwaContextValue {
  isStandalone: boolean;
  canNativePrompt: boolean;
  isIos: boolean;
  canOfferInstall: boolean;
  requestInstall: () => Promise<void>;
  openInstallGuide: () => void;
}

const PwaContext = createContext<PwaContextValue>({
  isStandalone: false,
  canNativePrompt: false,
  isIos: false,
  canOfferInstall: false,
  requestInstall: async () => undefined,
  openInstallGuide: () => undefined,
});

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register tenant-safe Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // Silent fallback in restricted browser contexts
        });
    }

    const ua = window.navigator.userAgent || "";
    const iosDetected =
      /iPad|iPhone|iPod/.test(ua) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    setIsIos(iosDetected);

    const checkStandalone = () => {
      const standaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
      const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
      setIsStandalone(standaloneMedia || iosStandalone);
    };

    checkStandalone();

    const mql = window.matchMedia("(display-mode: standalone)");
    const handleDisplayChange = () => checkStandalone();
    mql.addEventListener?.("change", handleDisplayChange);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setGuideOpen(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      mql.removeEventListener?.("change", handleDisplayChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const requestInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setDeferredPrompt(null);
        }
        return;
      } catch {
        // Fall through to manual guide modal
      }
    }
    setGuideOpen(true);
  }, [deferredPrompt]);

  const openInstallGuide = useCallback(() => {
    setGuideOpen(true);
  }, []);

  const value = useMemo<PwaContextValue>(
    () => ({
      isStandalone,
      canNativePrompt: Boolean(deferredPrompt),
      isIos,
      canOfferInstall: !isStandalone,
      requestInstall,
      openInstallGuide,
    }),
    [isStandalone, deferredPrompt, isIos, requestInstall, openInstallGuide]
  );

  return (
    <PwaContext.Provider value={value}>
      {children}
      <Modal
        open={guideOpen}
        onOpenChange={setGuideOpen}
        title="Install Aplikasi Leadsy"
        description="Akses workspace penjualan, Omnichannel Inbox, dan Field Map langsung dari layar utama perangkat Anda."
        size="md"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            {deferredPrompt && (
              <Button variant="default" onClick={requestInstall} className="gap-2">
                <Download className="h-4 w-4" />
                Install Sekarang
              </Button>
            )}
            <Button variant={deferredPrompt ? "outline" : "default"} onClick={() => setGuideOpen(false)}>
              Mengerti
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-[var(--surface-subtle)] p-3.5">
            <img
              src="/icons/icon-192.png"
              alt="Leadsy Icon"
              className="h-12 w-12 shrink-0 rounded-xl border border-border bg-card object-contain p-1"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">Leadsy Workspace</p>
                <Badge variant="brand">PWA</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Layar penuh tanpa bilah browser, akses satu ketukan, dan sinkronisasi antrean lapangan offline.
              </p>
            </div>
          </div>

          {isIos ? (
            <div className="space-y-3 rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Smartphone className="h-4 w-4 text-[var(--brand)]" />
                Panduan iPhone / iPad (Safari)
              </div>
              <ol className="space-y-2.5 text-sm text-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-strong)] text-xs font-bold">
                    1
                  </span>
                  <span>
                    Ketuk ikon <strong>Bagikan / Share</strong>{" "}
                    <Share className="inline h-3.5 w-3.5 text-[var(--brand)]" /> di bagian bawah atau atas Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-strong)] text-xs font-bold">
                    2
                  </span>
                  <span>
                    Gulir ke bawah lalu pilih <strong>Add to Home Screen</strong> (Tambah ke Layar Utama){" "}
                    <PlusSquare className="inline h-3.5 w-3.5 text-[var(--brand)]" />.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-strong)] text-xs font-bold">
                    3
                  </span>
                  <span>
                    Ketuk <strong>Add / Tambah</strong> di pojok kanan atas untuk membuka Leadsy sebagai aplikasi penuh.
                  </span>
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Smartphone className="h-4 w-4 text-[var(--brand)]" />
                Panduan Android / Chrome / Edge
              </div>
              <ol className="space-y-2.5 text-sm text-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-strong)] text-xs font-bold">
                    1
                  </span>
                  <span>
                    Ketuk menu browser <MoreVertical className="inline h-3.5 w-3.5 text-[var(--brand)]" /> di pojok
                    kanan atas (atau ikon Install di bilah alamat).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-strong)] text-xs font-bold">
                    2
                  </span>
                  <span>
                    Pilih <strong>Install app</strong> atau <strong>Add to Home screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-strong)] text-xs font-bold">
                    3
                  </span>
                  <span>
                    Konfirmasi <strong>Install</strong>{" "}
                    <CheckCircle2 className="inline h-3.5 w-3.5 text-[var(--success)]" /> untuk menyematkan Leadsy di
                    perangkat Anda.
                  </span>
                </li>
              </ol>
            </div>
          )}
        </div>
      </Modal>
    </PwaContext.Provider>
  );
}

export function usePwaInstall() {
  return useContext(PwaContext);
}
