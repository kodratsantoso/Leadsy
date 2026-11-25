"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  ArrowLeft,
  RefreshCw,
  LogIn,
  Sparkles,
  Clock,
  ShieldAlert,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/apiFetch";
import { useTheme } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { describeThrown } from "@/lib/apiError";
import { LarkOneClickModal } from "@/components/integrations/LarkOneClickModal";
import { Modal } from "@/components/ui/modal";

type Mode = "login" | "register" | "2fa";
type RegisterStep = "form" | "otp";

const inputCls =
  "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[color:var(--brand)] focus:outline-none focus:ring-1 focus:ring-[color:var(--brand)]";

// ── SSO Brand Icons ──
function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function MicrosoftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 23 23">
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  );
}

function LarkIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M3.2 8.5C3.2 5.46 5.66 3 8.7 3h6.6c3.04 0 5.5 2.46 5.5 5.5v7c0 3.04-2.46 5.5-5.5 5.5H8.7c-3.04 0-5.5-2.46-5.5-5.5v-7z"
        fill="#00D6B9"
      />
      <path d="M8.5 7.5L15.5 12L8.5 16.5V7.5Z" fill="#0052FF" />
      <path d="M12 9.5L17.5 12L12 14.5V9.5Z" fill="#3370FF" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);
  const { resolved } = useTheme();

  useEffect(() => {
    if (token) {
      window.location.href = "/dashboard";
    }
  }, [token]);

  // ── Shared state ──
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Login state ──
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Rate Limiting & Suspension State ──
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [isSuspended, setIsSuspended] = useState(false);
  const [attemptsWarning, setAttemptsWarning] = useState<string | null>(null);

  // ── SSO Modals State ──
  const [showSsoModal, setShowSsoModal] = useState(false);
  const [ssoDomain, setSsoDomain] = useState("");
  const [ssoProvider, setSsoProvider] = useState<"google" | "microsoft" | "enterprise">("google");

  // ── 2FA state ──
  const [tempToken, setTempToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  // ── Register state ──
  const [registerStep, setRegisterStep] = useState<RegisterStep>("form");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [larkLoginLoading, setLarkLoginLoading] = useState(false);
  const [showOneClickModal, setShowOneClickModal] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Live timer for 10-minute lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const formatLockoutTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setSuccess("");
    setAttemptsWarning(null);
    setRegisterStep("form");
    setOtpDigits(["", "", "", "", "", ""]);
    setTwoFactorCode("");
  };

  // ── Login ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError("");
    setAttemptsWarning(null);

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error(`Invalid response from backend: ${rawText.slice(0, 150)}`);
      }

      if (!res.ok) {
        if (res.status === 429 && data?.retry_after_seconds) {
          setLockoutSeconds(data.retry_after_seconds);
        }
        if (data?.status === "account_suspended" || res.status === 403) {
          setIsSuspended(true);
        }
        if (data?.attempts_left !== undefined) {
          setAttemptsWarning(data.message);
        }
        throw new Error(data?.message || "Kredensial tidak valid. Silakan periksa email dan password Anda.");
      }

      // Reset any lockout state on success
      setLockoutSeconds(0);
      setIsSuspended(false);

      if (data.requires_2fa) {
        setTempToken(data.token);
        setMode("2fa");
        return;
      }

      // Automatically store resolved workspace
      const workspace = data.workspace || data.user?.tenant;
      if (workspace?.id && typeof window !== "undefined") {
        window.localStorage.setItem("lark_tenant_id", String(workspace.id));
      }

      setAuth(data.token, data.user);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(
        describeThrown(err).isOffline
          ? "Tidak dapat terhubung ke server backend. Pastikan server aktif."
          : describeThrown(err, "Terjadi kesalahan saat masuk.").title
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handle2faVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError("");
    try {
      const res = await apiFetch("/auth/login/2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ code: twoFactorCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Kode 2FA tidak valid.");

      const workspace = data.workspace || data.user?.tenant;
      if (workspace?.id && typeof window !== "undefined") {
        window.localStorage.setItem("lark_tenant_id", String(workspace.id));
      }

      setAuth(data.token, data.user);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(describeThrown(err, "Terjadi kesalahan saat verifikasi.").title);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLarkLogin = async () => {
    setError("");
    setLarkLoginLoading(true);

    try {
      const savedTenantId = typeof window !== "undefined" ? window.localStorage.getItem("lark_tenant_id") : null;
      const query = savedTenantId ? `?tenant_id=${encodeURIComponent(savedTenantId)}` : "";
      const res = await apiFetch(`/auth/lark/auth-url${query}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Gagal memulai login Lark.");
      }

      if (!data?.auth_url) {
        throw new Error("URL autentikasi Lark tidak ditemukan.");
      }

      window.location.href = data.auth_url;
    } catch (err) {
      setError(describeThrown(err, "Tidak dapat melanjutkan SSO Lark.").title);
    } finally {
      setLarkLoginLoading(false);
    }
  };

  const handleSsoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ssoDomain.trim()) return;

    setShowSsoModal(false);
    setError("");
    setSuccess(`Mengalihkan ke portal SSO ${ssoProvider === "google" ? "Google Workspace" : ssoProvider === "microsoft" ? "Microsoft 365" : "Enterprise"} untuk ${ssoDomain}...`);

    // Initiate SSO redirect
    setTimeout(() => {
      // In production, routes to /api/auth/sso/login?domain=...
      window.location.href = `/api/auth/sso/login?provider=${ssoProvider}&domain=${encodeURIComponent(ssoDomain.trim())}`;
    }, 800);
  };

  // ── Register: step 1 (send OTP) ──
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (regPassword !== regConfirm) {
      setError("Kata sandi tidak cocok.");
      return;
    }
    if (regPassword.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }

    setSendingOtp(true);
    try {
      const res = await apiFetch("/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal mengirim kode verifikasi.");

      setSuccess(`Kode verifikasi telah dikirim ke ${regEmail}`);
      setRegisterStep("otp");
      setCountdown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(describeThrown(err, "Gagal mengirim kode.").title);
    } finally {
      setSendingOtp(false);
    }
  };

  // ── Register: step 2 (verify OTP & create account) ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const otp = otpDigits.join("");
    if (otp.length < 6) {
      setError("Masukkan kode verifikasi 6 digit.");
      return;
    }

    setRegisterLoading(true);
    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          password_confirmation: regConfirm,
          otp,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Registrasi gagal.");

      setSuccess("Akun berhasil dibuat! Silakan masuk.");
      setMode("login");
      setLoginEmail(regEmail);
      setLoginPassword("");
      setRegisterStep("form");
    } catch (err) {
      setError(describeThrown(err, "Registrasi gagal.").title);
    } finally {
      setRegisterLoading(false);
    }
  };

  // OTP box input helpers
  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otpDigits];
    next[index] = val.slice(-1);
    setOtpDigits(next);
    if (val && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtpDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || sendingOtp) return;
    setError("");
    setSendingOtp(true);
    try {
      const res = await apiFetch("/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal mengirim ulang kode.");
      setCountdown(60);
      setSuccess("Kode verifikasi baru telah dikirim!");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(describeThrown(err, "Gagal mengirim ulang kode.").title);
    } finally {
      setSendingOtp(false);
    }
  };

  const logoSrc = resolved === "dark" ? "/Leadsy_logo_dark.png" : "/Leadsy_logo_light.png";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      {/* Theme toggle — top-right corner */}
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center">
          <Image
            src={logoSrc}
            alt="Leadsy"
            width={280}
            height={96}
            className="mb-4 h-24 w-auto object-contain"
            priority
          />
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Masuk ke akun Leadsy Anda"
              : registerStep === "form"
              ? "Daftar akun baru"
              : "Verifikasi email Anda"}
          </p>
        </div>

        {/* Suspended Alert */}
        {isSuspended && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold text-foreground">Akun Ditangguhkan (Suspended)</p>
              <p className="mt-0.5 text-muted-foreground leading-relaxed">
                Akun Anda telah dinonaktifkan demi keamanan setelah beberapa kali percobaan gagal. Silakan hubungi Administrator Anda untuk membuka kembali akses.
              </p>
            </div>
          </div>
        )}

        {/* Lockout Countdown Alert */}
        {lockoutSeconds > 0 && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold text-foreground">Akun Terkunci Sementara</p>
              <p className="mt-0.5 text-muted-foreground leading-relaxed">
                Terlalu banyak percobaan gagal. Silakan tunggu{" "}
                <span className="font-mono font-bold text-foreground">
                  {formatLockoutTimer(lockoutSeconds)}
                </span>{" "}
                sebelum mencoba kembali.
              </p>
            </div>
          </div>
        )}

        {/* Remaining Attempts Warning */}
        {attemptsWarning && lockoutSeconds === 0 && !isSuspended && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span className="leading-relaxed">{attemptsWarning}</span>
          </div>
        )}

        {/* General Error banner */}
        {error && !attemptsWarning && lockoutSeconds === 0 && !isSuspended && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success banner */}
        {success && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-[color:var(--status-success)]/20 bg-[color:var(--status-success-soft)] p-3 text-sm text-[color:var(--status-success)]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Email Address</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className={inputCls}
                placeholder="you@company.com"
                disabled={loginLoading || lockoutSeconds > 0 || isSuspended}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
                disabled={loginLoading || lockoutSeconds > 0 || isSuspended}
              />
            </div>

            <div className="space-y-3 pt-1">
              <button
                type="submit"
                disabled={loginLoading || lockoutSeconds > 0 || isSuspended}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--brand)] py-2.5 text-sm font-medium text-[color:var(--brand-foreground)] transition-colors hover:bg-[color:var(--brand-hover)] disabled:opacity-50"
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sedang Masuk...
                  </>
                ) : lockoutSeconds > 0 ? (
                  <>
                    <Clock className="h-4 w-4" /> Terkunci ({formatLockoutTimer(lockoutSeconds)})
                  </>
                ) : isSuspended ? (
                  <>
                    <ShieldAlert className="h-4 w-4" /> Akun Ditangguhkan
                  </>
                ) : (
                  "Sign In"
                )}
              </button>

              {/* Separator */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative bg-card px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  atau masuk dengan SSO
                </div>
              </div>

              {/* SSO Buttons */}
              <div className="space-y-2">
                {/* Lark SSO */}
                <button
                  type="button"
                  onClick={handleLarkLogin}
                  disabled={larkLoginLoading || lockoutSeconds > 0}
                  className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-background py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
                >
                  {larkLoginLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LarkIcon className="h-4 w-4" />
                  )}
                  {larkLoginLoading ? "Mengarahkan ke Lark..." : "Login with Lark"}
                </button>

                {/* Google SSO */}
                <button
                  type="button"
                  onClick={() => {
                    setSsoProvider("google");
                    setShowSsoModal(true);
                  }}
                  className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-background py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/80"
                >
                  <GoogleIcon className="h-4 w-4" />
                  Sign in with Google
                </button>

                {/* Microsoft SSO */}
                <button
                  type="button"
                  onClick={() => {
                    setSsoProvider("microsoft");
                    setShowSsoModal(true);
                  }}
                  className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-background py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/80"
                >
                  <MicrosoftIcon className="h-4 w-4" />
                  Sign in with Microsoft
                </button>

                {/* Enterprise SAML / Okta */}
                <button
                  type="button"
                  onClick={() => {
                    setSsoProvider("enterprise");
                    setShowSsoModal(true);
                  }}
                  className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border/80 bg-secondary/30 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Enterprise SSO (SAML / Okta)
                </button>
              </div>

              {/* Register New Workspace Divider */}
              <div className="relative my-3 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative bg-card px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Perusahaan Baru?
                </div>
              </div>

              {/* Register Workspace Button */}
              <button
                type="button"
                onClick={() => setShowOneClickModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand/30 bg-brand/10 py-2 text-xs font-semibold text-brand transition-colors hover:bg-brand/20"
              >
                <Sparkles className="h-3.5 w-3.5 text-brand" />
                Daftarkan Workspace Baru dengan Lark (1-Klik)
              </button>
            </div>

            <p className="text-center text-xs text-muted-foreground pt-1">
              Belum punya akun?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="font-medium text-[color:var(--brand)] hover:text-[color:var(--brand-light)]"
              >
                Daftar sekarang
              </button>
            </p>
          </form>
        )}

        {/* ── 2FA VERIFICATION ── */}
        {mode === "2fa" && (
          <form onSubmit={handle2faVerify} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Authentication Code</label>
              <input
                type="text"
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className={inputCls}
                placeholder="6-digit code or recovery code"
                autoComplete="one-time-code"
                autoFocus
              />
            </div>
            <div className="space-y-3">
              <button
                type="submit"
                disabled={loginLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--brand)] py-2.5 text-sm font-medium text-[color:var(--brand-foreground)] transition-colors hover:bg-[color:var(--brand-hover)] disabled:opacity-50"
              >
                {loginLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loginLoading ? "Verifying..." : "Verify Code"}
              </button>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" /> Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* ── REGISTER STEP 1 ── */}
        {mode === "register" && registerStep === "form" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Full Name</label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className={inputCls}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Work Email</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className={inputCls}
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className={inputCls}
                placeholder="Minimal 8 karakter"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
              <input
                type="password"
                required
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                className={inputCls}
                placeholder="Ulangi kata sandi"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={sendingOtp}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--brand)] py-2.5 text-sm font-medium text-[color:var(--brand-foreground)] transition-colors hover:bg-[color:var(--brand-hover)] disabled:opacity-50"
              >
                {sendingOtp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Mengirim kode...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" /> Kirim Kode Verifikasi
                  </>
                )}
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground pt-1">
              Sudah memiliki akun?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-medium text-[color:var(--brand)] hover:text-[color:var(--brand-light)]"
              >
                Masuk
              </button>
            </p>
          </form>
        )}

        {/* ── REGISTER STEP 2: OTP ── */}
        {mode === "register" && registerStep === "otp" && (
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--status-info-soft)]">
                <Mail className="h-5 w-5 text-[color:var(--brand)]" />
              </div>
              <p className="text-sm text-muted-foreground">Kode 6-digit dikirim ke</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{regEmail}</p>
              <p className="mt-1 text-xs text-muted-foreground">Kode berlaku selama 10 menit.</p>
            </div>

            <div className="flex items-center justify-center gap-2" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="h-12 w-11 rounded-lg border border-input bg-background text-center text-xl font-bold text-foreground caret-indigo-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              ))}
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={registerLoading || otpDigits.join("").length < 6}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--brand)] py-2.5 text-sm font-medium text-[color:var(--brand-foreground)] transition-colors hover:bg-[color:var(--brand-hover)] disabled:opacity-50"
              >
                {registerLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {registerLoading ? "Membuat akun..." : "Buat Akun"}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setRegisterStep("form");
                    setError("");
                    setSuccess("");
                    setOtpDigits(["", "", "", "", "", ""]);
                  }}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" /> Ganti email
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || sendingOtp}
                  className="flex items-center gap-1 text-muted-foreground hover:text-[color:var(--brand)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`h-3 w-3 ${sendingOtp ? "animate-spin" : ""}`} />
                  {countdown > 0 ? `Kirim ulang (${countdown}s)` : "Kirim ulang"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Modal SSO Domain Discovery */}
        <Modal
          open={showSsoModal}
          onOpenChange={setShowSsoModal}
          title={
            ssoProvider === "google"
              ? "Sign in with Google Workspace"
              : ssoProvider === "microsoft"
              ? "Sign in with Microsoft 365"
              : "Enterprise Single Sign-On (SSO)"
          }
          description="Masukkan alamat email atau domain perusahaan Anda untuk melanjutkan ke portal autentikasi SSO organisasi."
          size="sm"
        >
          <form onSubmit={handleSsoSubmit} className="space-y-4 pt-1">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Email Kerja / Domain Perusahaan
              </label>
              <input
                type="text"
                required
                value={ssoDomain}
                onChange={(e) => setSsoDomain(e.target.value)}
                className={inputCls}
                placeholder="you@company.com"
                autoFocus
              />
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                Sistem akan memverifikasi konfigurasi SSO organisasi Anda (Google SAML, Microsoft Entra ID, atau Okta). Jika SSO belum diaktifkan, Administrator dapat mengonfigurasinya di <strong>Pengaturan Integrasi</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSsoModal(false)}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-[color:var(--brand)] px-4 py-2 text-xs font-semibold text-[color:var(--brand-foreground)] hover:bg-[color:var(--brand-hover)]"
              >
                Lanjutkan ke SSO <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </form>
        </Modal>

        {/* 1-Click Lark Workspace Registration Modal */}
        <LarkOneClickModal
          open={showOneClickModal}
          onOpenChange={setShowOneClickModal}
          isPublic={true}
        />
      </div>
    </div>
  );
}
