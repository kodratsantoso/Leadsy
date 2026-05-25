"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function LarkCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Finalizing Lark login...");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      setStatus("error");
      setMessage("Lark authentication failed: missing authorization code.");
      return;
    }

    if (!state) {
      setStatus("error");
      setMessage("Lark authentication failed: login state is missing.");
      return;
    }

    const finalizeLogin = async () => {
      try {
        const res = await fetch("/api/auth/lark/callback", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, state }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Unable to complete Lark login.");
        }

        setAuth(data.token, data.user);
        setStatus("success");
        setMessage("Authenticated successfully. Redirecting...");
        window.setTimeout(() => {
          router.replace("/");
          router.refresh();
        }, 700);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "Lark SSO login failed. Please try again.");
      }
    };

    finalizeLogin();
  }, [router, searchParams, setAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-10 text-center shadow-xl">
        {status === "loading" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--brand-soft)]">
              <Loader2 className="h-8 w-8 animate-spin text-[color:var(--brand)]" />
            </div>
            <p className="text-lg font-semibold">Finishing Lark authentication...</p>
            <p className="text-sm text-muted-foreground">Please keep this window open while we validate your login.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--status-success-soft)]">
              <CheckCircle2 className="h-8 w-8 text-[color:var(--status-success)]" />
            </div>
            <p className="text-lg font-semibold">Login successful</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-lg font-semibold">Lark authentication failed</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="inline-flex items-center justify-center rounded-lg bg-[color:var(--brand)] px-4 py-2 text-sm font-medium text-[color:var(--brand-foreground)] transition hover:bg-[color:var(--brand-hover)]"
            >
              Return to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
