"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  Building2,
  Bot,
  Database,
  FileText,
  Lock,
} from "lucide-react";

type LarkOneClickModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPublic?: boolean;
  onSuccess?: (credentials: { app_id: string; app_secret?: string; tenant_name?: string }) => void;
};

export function LarkOneClickModal({
  open,
  onOpenChange,
  isPublic = false,
  onSuccess,
}: LarkOneClickModalProps) {
  const [loading, setLoading] = useState(false);
  const [deviceCode, setDeviceCode] = useState<string>("");
  const [userCode, setUserCode] = useState<string>("");
  const [verificationUrl, setVerificationUrl] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "ready" | "polling" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const setAuth = useAuthStore((state) => state.setAuth);

  const startEndpoint = isPublic
    ? "/api/auth/lark/register-app/start"
    : "/api/lark/register-app/start";

  const pollEndpoint = isPublic
    ? "/api/auth/lark/register-app/poll"
    : "/api/lark/register-app/poll";

  const cleanupPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const handleStart = async () => {
    cleanupPolling();
    setLoading(true);
    setStatus("idle");
    setErrorMessage("");
    setActiveStep(1);

    try {
      const res = await apiFetch(startEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: "lark",
          app_name: "Leadsy AI",
          app_desc: "AI Sales Intelligence & CRM Engine",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menginisiasi registrasi aplikasi Lark.");
      }

      setDeviceCode(data.device_code);
      setUserCode(data.user_code);
      setVerificationUrl(data.verification_url);
      setStatus("ready");
      setActiveStep(1);

      // Auto start polling
      startPolling(data.device_code);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage((err as Error)?.message || "Gagal memulai registrasi.");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (code: string) => {
    cleanupPolling();
    setStatus("polling");

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(pollEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_code: code }),
        });

        const data = await res.json();

        if (data.status === "success") {
          cleanupPolling();
          setStatus("success");
          setActiveStep(4);

          if (onSuccess) {
            onSuccess({
              app_id: data.app_id,
              tenant_name: data.tenant_name,
            });
          }

          if (isPublic && data.token && data.user) {
            setAuth(data.token, data.user);
            setTimeout(() => {
              window.location.href = data.redirect || "/dashboard";
            }, 1200);
          }
        } else if (data.status === "denied" || data.status === "expired") {
          cleanupPolling();
          setStatus("error");
          setErrorMessage(data.message || "Otorisasi ditolak atau telah kedaluwarsa.");
        }
      } catch (err: unknown) {
        // network jitter; continue polling
      }
    }, 3000);
  };

  useEffect(() => {
    if (open) {
      handleStart();
    } else {
      cleanupPolling();
      setStatus("idle");
    }

    return () => cleanupPolling();
  }, [open]);

  const handleCopyCode = () => {
    if (userCode) {
      navigator.clipboard.writeText(userCode);
      setCopied(true);
      setActiveStep(2);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenLark = () => {
    if (verificationUrl) {
      setActiveStep(3);
      window.open(verificationUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Daftarkan Workspace Baru dengan Lark (1-Klik)"
      description="Panduan langkah demi langkah menghubungkan organisasi Lark Anda dengan Leadsy AI secara otomatis."
      size="lg"
      preventClose={status === "polling" || status === "success"}
    >
      <div className="space-y-6 p-1">
        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div
            className={`rounded-xl border p-2.5 transition-all ${
              activeStep >= 1
                ? "border-brand/40 bg-brand/10 text-foreground"
                : "border-border bg-secondary/20 text-muted-foreground opacity-60"
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-brand">Langkah 1</div>
            <div className="text-xs font-medium mt-0.5">Salin Kode</div>
          </div>
          <div
            className={`rounded-xl border p-2.5 transition-all ${
              activeStep >= 2
                ? "border-brand/40 bg-brand/10 text-foreground"
                : "border-border bg-secondary/20 text-muted-foreground opacity-60"
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-brand">Langkah 2</div>
            <div className="text-xs font-medium mt-0.5">Buka Lark</div>
          </div>
          <div
            className={`rounded-xl border p-2.5 transition-all ${
              activeStep >= 3
                ? "border-brand/40 bg-brand/10 text-foreground"
                : "border-border bg-secondary/20 text-muted-foreground opacity-60"
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-brand">Langkah 3</div>
            <div className="text-xs font-medium mt-0.5">Konfirmasi Izin</div>
          </div>
          <div
            className={`rounded-xl border p-2.5 transition-all ${
              status === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 font-semibold"
                : "border-border bg-secondary/20 text-muted-foreground opacity-60"
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">Langkah 4</div>
            <div className="text-xs font-medium mt-0.5">Selesai & Masuk</div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-brand" />
            <p className="text-sm font-medium text-foreground">Menghubungkan ke Lark Open Platform...</p>
            <p className="text-xs text-muted-foreground">Menyiapkan kode otorisasi dan konfigurasi otomatis.</p>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-center space-y-3">
            <AlertCircle className="h-9 w-9 text-destructive mx-auto" />
            <h4 className="text-sm font-semibold text-foreground">Kendala Otorisasi Lark</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">{errorMessage}</p>
            <Button size="sm" onClick={handleStart} className="mt-2">
              Coba Ulang Registrasi
            </Button>
          </div>
        )}

        {/* Success State */}
        {status === "success" && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-base font-bold text-foreground">Workspace Berhasil Didaftarkan!</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Aplikasi Leadsy AI telah berhasil terhubung dengan organisasi Lark Anda. Seluruh hak akses (Lark Base, Docs, Minutes, SSO) telah aktif.
            </p>
            {isPublic ? (
              <div className="flex items-center justify-center gap-2 pt-2 text-xs font-medium text-brand">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Membuka Dashboard Leadsy...</span>
              </div>
            ) : (
              <Button size="sm" onClick={() => onOpenChange(false)} className="mt-2">
                Selesai
              </Button>
            )}
          </div>
        )}

        {/* Ready / Polling Walkthrough */}
        {(status === "ready" || status === "polling") && (
          <div className="space-y-4">
            {/* Step 1 Box: Copy Code */}
            <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground">
                    1
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Salin Kode Verifikasi (User Code)
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                  <Sparkles className="h-3 w-3" />
                  Pra-konfigurasi
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-background border border-border px-4 py-3">
                <div>
                  <span className="font-mono text-2xl font-bold tracking-widest text-foreground">
                    {userCode || "----"}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Kode ini berlaku selama 10 menit untuk menghubungkan akun Anda.
                  </p>
                </div>
                <Button
                  variant={copied ? "default" : "outline"}
                  size="sm"
                  onClick={handleCopyCode}
                  className="gap-1.5 text-xs font-semibold"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Tersalin!" : "Salin Kode"}
                </Button>
              </div>
            </div>

            {/* Step 2 & 3 Box: Open Lark & Authorize */}
            <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground">
                  2
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Buka Portal Otorisasi Lark & Konfirmasi
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Klik tombol di bawah ini. Jendela baru <strong>Lark Open Platform</strong> akan terbuka. Masukkan kode di atas jika diminta, lalu klik <strong>Authorize / Konfirmasi</strong>.
              </p>

              <Button
                className="w-full gap-2 py-5 text-sm font-semibold shadow-md"
                onClick={handleOpenLark}
              >
                <Image
                  src="/lark-logo.png"
                  alt="Lark Logo"
                  width={20}
                  height={20}
                  className="h-5 w-5 shrink-0 object-contain"
                />
                <span>Buka Halaman Otorisasi Lark</span>
                <ExternalLink className="h-4 w-4 ml-auto" />
              </Button>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-brand shrink-0" />
                  <span>Sinkronisasi Tabel Lark Base</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-brand shrink-0" />
                  <span>Lark Minutes AI Transcript</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-brand shrink-0" />
                  <span>Notifikasi Bot Interaktif</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-brand shrink-0" />
                  <span>Single Sign-On (SSO) Aman</span>
                </div>
              </div>
            </div>

            {/* Step 4: Automatic Polling Detection */}
            <div className="flex items-center justify-center gap-2.5 rounded-xl border border-brand/20 bg-brand/5 p-3 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-brand shrink-0" />
              <span>
                Menunggu konfirmasi di jendela browser Lark Anda... (Sistem memeriksa otomatis)
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
