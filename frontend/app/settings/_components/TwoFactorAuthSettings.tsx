"use client";

import { useState } from "react";
import { Lock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/apiFetch";

export function TwoFactorAuthSettings() {
  const { user, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState("");
  const [qrCodeSvg, setQrCodeSvg] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isEnabled = user?.two_factor_enabled;

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/auth/2fa/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate 2FA");
      setSecret(data.secret);
      setQrCodeSvg(data.qr_code_svg);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to verify code");
      
      setRecoveryCodes(data.recovery_codes);
      setSuccess("2FA enabled successfully.");
      
      // Update local user state
      const currentToken = useAuthStore.getState().token;
      if (user && currentToken) {
        setAuth(currentToken, { ...user, two_factor_enabled: true });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to disable Two-Factor Authentication?")) return;
    
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to disable 2FA");
      
      setSuccess("2FA disabled successfully.");
      setSecret("");
      setQrCodeSvg("");
      setCode("");
      
      // Update local user state
      const currentToken = useAuthStore.getState().token;
      if (user && currentToken) {
        setAuth(currentToken, { ...user, two_factor_enabled: false });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Lock className="h-4 w-4 text-red-500" />
        <h3 className="text-sm font-semibold">MFA (Two-Factor Authentication)</h3>
      </div>
      
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-[color:var(--status-success)]/20 bg-[color:var(--status-success-soft)] p-3 text-sm text-[color:var(--status-success)]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {isEnabled ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-[color:var(--status-success)] font-medium">
            <CheckCircle2 className="h-4 w-4" />
            2FA is Enabled
          </div>
          <p className="text-xs text-muted-foreground">
            Your account is secured with Two-Factor Authentication.
          </p>
          <form onSubmit={handleDisable} className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Confirm with Code to Disable</label>
              <input 
                type="text" 
                required 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" 
                placeholder="6-digit code" 
              />
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex items-center justify-center gap-2 rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-sm font-medium hover:bg-destructive/20 transition-colors"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Disable 2FA
            </button>
          </form>
        </div>
      ) : secret ? (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Scan this QR code with your Authenticator app (e.g. Google Authenticator).
          </p>
          <div className="bg-white p-2 rounded-lg inline-block" dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
          <p className="text-xs text-muted-foreground">Or enter this secret manually: <strong className="select-all font-mono text-foreground">{secret}</strong></p>
          
          <form onSubmit={handleEnable} className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Verification Code</label>
              <input 
                type="text" 
                required 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" 
                placeholder="6-digit code" 
              />
            </div>
            <div className="flex gap-2">
              <button 
                type="submit" 
                disabled={loading} 
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[color:var(--brand)] text-[color:var(--brand-foreground)] px-4 py-2 text-sm font-medium hover:bg-[color:var(--brand-hover)] transition-colors"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify & Enable
              </button>
              <button 
                type="button" 
                onClick={() => { setSecret(""); setQrCodeSvg(""); setCode(""); setError(""); setSuccess(""); }} 
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary/90 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Protect your account with an extra layer of security.
          </p>
          <button 
            onClick={handleGenerate} 
            disabled={loading} 
            className="flex items-center justify-center gap-2 rounded-lg bg-[color:var(--brand)] text-[color:var(--brand-foreground)] px-4 py-2 text-sm font-medium hover:bg-[color:var(--brand-hover)] transition-colors"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Set up 2FA
          </button>
        </div>
      )}

      {recoveryCodes.length > 0 && (
        <div className="mt-6 p-4 border border-[color:var(--status-warning)]/30 bg-[color:var(--status-warning)]/10 rounded-lg">
          <h4 className="text-sm font-bold text-[color:var(--status-warning)] flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Save these Recovery Codes
          </h4>
          <p className="text-xs text-[color:var(--status-warning)]/80 mt-1 mb-3">
            If you lose your device, you can use these codes to access your account. Each code can only be used once. Store them securely.
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {recoveryCodes.map((rc, i) => (
              <div key={i} className="bg-background border border-border p-2 rounded text-center select-all">{rc}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
