"use client";

import { useEffect, useState } from "react";
import { LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";

interface ImpersonationMeta {
  original_token: string;
  original_user: any;
  tenant_name: string;
  tenant_id: number;
  started_at: string;
}

export function ImpersonationBanner() {
  const [meta, setMeta] = useState<ImpersonationMeta | null>(null);

  useEffect(() => {
    const checkMeta = () => {
      if (typeof window === "undefined") return;
      const stored = localStorage.getItem("leadsy_impersonation_meta");
      if (stored) {
        try {
          setMeta(JSON.parse(stored));
        } catch {
          setMeta(null);
        }
      } else {
        setMeta(null);
      }
    };

    checkMeta();
    window.addEventListener("storage", checkMeta);
    return () => window.removeEventListener("storage", checkMeta);
  }, []);

  if (!meta) return null;

  const handleExit = () => {
    try {
      if (meta.original_token && meta.original_user) {
        useAuthStore.getState().setAuth(meta.original_token, meta.original_user);
      }
    } catch (e) {
      console.error("Error restoring superadmin auth:", e);
    } finally {
      localStorage.removeItem("leadsy_impersonation_meta");
      window.location.href = "/admin/tenants";
    }
  };

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-500/30 bg-gradient-to-r from-amber-950/90 via-amber-900/90 to-yellow-950/90 px-4 py-2 text-amber-200 shadow-md backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
          <Shield className="h-3.5 w-3.5" />
        </div>
        <div className="text-xs sm:text-sm">
          <span className="font-semibold text-amber-300">Support Impersonation Active:</span>{" "}
          Viewing workspace <strong className="text-white underline decoration-amber-400/50 underline-offset-2">{meta.tenant_name}</strong> (Tenant #{meta.tenant_id}) as Platform Superadmin.
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={handleExit}
          size="sm"
          className="h-7 gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-slate-950 shadow transition-all hover:bg-amber-400"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Exit Impersonation</span>
        </Button>
      </div>
    </div>
  );
}
