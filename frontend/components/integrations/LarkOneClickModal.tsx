"use client";

import React, { useEffect, useState, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2, ExternalLink, CheckCircle2, AlertCircle, Sparkles, Copy, Check } from "lucide-react";

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
        throw new Error(data.message || "Failed to initiate Lark app registration.");
      }

      setDeviceCode(data.device_code);
      setUserCode(data.user_code);
      setVerificationUrl(data.verification_url);
      setStatus("ready");

      // Auto start polling
      startPolling(data.device_code);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage((err as Error)?.message || "Failed to start registration.");
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
            }, 1000);
          }
        } else if (data.status === "denied" || data.status === "expired") {
          cleanupPolling();
          setStatus("error");
          setErrorMessage(data.message || "Authorization was denied or expired.");
        }
      } catch (err: unknown) {
        // network jitter; continue polling
      }
    }, 3500);
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
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="1-Click Auto Provision Lark Custom App"
      description="Leadsy connects directly to your Lark workspace and configures all required scopes automatically."
      size="md"
      preventClose={status === "polling" || status === "success"}
    >
      <div className="space-y-5 p-2">
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Connecting to Lark Open Platform...</p>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-[var(--status-danger)]/30 bg-[var(--status-danger-soft)] p-4 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-[var(--status-danger)] mx-auto" />
            <p className="text-sm text-foreground font-medium">{errorMessage}</p>
            <Button size="sm" onClick={handleStart}>
              Try Again
            </Button>
          </div>
        )}

        {status === "success" && (
          <div className="rounded-2xl border border-[var(--status-success)]/30 bg-[var(--status-success-soft)] p-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-[var(--status-success)] mx-auto animate-bounce" />
            <h4 className="text-base font-semibold text-foreground">App Created Successfully!</h4>
            <p className="text-xs text-muted-foreground">
              All permissions (Base, Docs, Minutes, SSO) have been provisioned and linked to Leadsy.
            </p>
            {isPublic ? (
              <p className="text-xs font-medium text-primary">Redirecting to Dashboard...</p>
            ) : (
              <Button size="sm" onClick={() => onOpenChange(false)} className="mt-2">
                Done
              </Button>
            )}
          </div>
        )}

        {(status === "ready" || status === "polling") && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  User Verification Code
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <Sparkles className="h-3 w-3" />
                  Pre-configured
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-background border border-border px-4 py-2.5">
                <span className="font-mono text-xl font-bold tracking-widest text-foreground">
                  {userCode || "----"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCode}
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Click the button below to authorize the pre-configured <strong>Leadsy AI</strong> application in your Lark workspace.
              </p>
            </div>

            <Button
              className="w-full gap-2 py-6 text-sm font-semibold shadow-md"
              onClick={() => {
                if (verificationUrl) {
                  window.open(verificationUrl, "_blank", "noopener,noreferrer");
                }
              }}
            >
              <ExternalLink className="h-4 w-4" />
              Open Lark Authorization Page
            </Button>

            <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Waiting for confirmation in your Lark browser window...</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
