"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, AlertCircle, CheckCircle2, Mail, ArrowLeft, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/apiFetch";
import { useTheme } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Mode = "login" | "register";
type RegisterStep = "form" | "otp";

const inputCls =
  "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { resolved } = useTheme();

  // ── Shared state ──
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Login state ──
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

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

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setSuccess("");
    setRegisterStep("form");
    setOtpDigits(["", "", "", "", "", ""]);
  };

  // ── Login ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError("");
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const rawText = await res.text();
      let data: any = null;
      try { data = rawText ? JSON.parse(rawText) : null; } catch { throw new Error("Invalid response from backend."); }
      if (!res.ok) throw new Error(data?.message || "Invalid credentials. Please try again.");
      setAuth(data.token, data.user);
      router.push("/");
    } catch (err: any) {
      setError(
        err.message?.includes("fetch") || err.message?.includes("Failed to fetch")
          ? "Cannot connect to the backend. Please ensure the server is running."
          : err.message || "An unexpected error occurred."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Send OTP ──
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!regName.trim()) { setError("Please enter your name."); return; }
    if (regPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (regPassword !== regConfirm) { setError("Passwords do not match."); return; }
    setSendingOtp(true);
    try {
      const res = await apiFetch("/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to send code.");
      setRegisterStep("otp");
      setCountdown(60);
      setSuccess("Verification code sent! Check your email.");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || "Failed to send verification code.");
    } finally {
      setSendingOtp(false);
    }
  };

  // ── OTP input handlers ──
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value.slice(-1);
    setOtpDigits(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...otpDigits];
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setOtpDigits(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // ── Final register submit ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const otp = otpDigits.join("");
    if (otp.length < 6) { setError("Please enter the full 6-digit code."); return; }
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
      if (!res.ok) throw new Error(data?.message || "Registration failed.");
      setAuth(data.token, data.user);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setRegisterLoading(false);
    }
  };

  // ── Resend OTP ──
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setError("");
    setSuccess("");
    setSendingOtp(true);
    try {
      const res = await apiFetch("/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to resend code.");
      setOtpDigits(["", "", "", "", "", ""]);
      setCountdown(60);
      setSuccess("New verification code sent!");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
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
        <div className="mb-7 flex flex-col items-center">
          <Image
            src={logoSrc}
            alt="Leadsy"
            width={360}
            height={128}
            className="mb-4 h-32 w-auto object-contain"
            priority
          />
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Sign in to your account"
              : registerStep === "form"
              ? "Create a new account"
              : "Verify your email"}
          </p>
        </div>

        {/* Alert banners */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--status-success)]/20 bg-[var(--status-success)]/10 p-3 text-sm text-[var(--status-success)]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Email Address</label>
              <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={inputCls} placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
            </div>
            <div className="pt-2">
              <button type="submit" disabled={loginLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-50">
                {loginLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loginLoading ? "Signing in..." : "Sign In"}
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground pt-1">
              Don&apos;t have an account?{" "}
              <button type="button" onClick={() => switchMode("register")} className="text-[var(--brand)] hover:text-[var(--brand)] font-medium">
                Create one
              </button>
            </p>
          </form>
        )}

        {/* ── REGISTER STEP 1: FORM ── */}
        {mode === "register" && registerStep === "form" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Full Name</label>
              <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} className={inputCls} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Email Address</label>
              <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className={inputCls} placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input type="password" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className={inputCls} placeholder="At least 8 characters" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
              <input type="password" required value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} className={inputCls} placeholder="Repeat password" />
            </div>
            <div className="pt-2">
              <button type="submit" disabled={sendingOtp} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-50">
                {sendingOtp ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending code...</> : <><Mail className="h-4 w-4" /> Send Verification Code</>}
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground pt-1">
              Already have an account?{" "}
              <button type="button" onClick={() => switchMode("login")} className="text-[var(--brand)] hover:text-[var(--brand)] font-medium">
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* ── REGISTER STEP 2: OTP ── */}
        {mode === "register" && registerStep === "otp" && (
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)]/15">
                <Mail className="h-5 w-5 text-[var(--brand)]" />
              </div>
              <p className="text-sm text-muted-foreground">We sent a 6-digit code to</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{regEmail}</p>
              <p className="mt-1 text-xs text-muted-foreground">Enter the code below — it expires in 10 minutes.</p>
            </div>

            <div className="flex items-center justify-center gap-2" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="h-12 w-11 rounded-lg border border-input bg-background text-center text-xl font-bold text-foreground caret-[var(--brand)] focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              ))}
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={registerLoading || otpDigits.join("").length < 6}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-50"
              >
                {registerLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {registerLoading ? "Creating account..." : "Create Account"}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => { setRegisterStep("form"); setError(""); setSuccess(""); setOtpDigits(["", "", "", "", "", ""]); }}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" /> Change email
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || sendingOtp}
                  className="flex items-center gap-1 text-muted-foreground hover:text-[var(--brand)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`h-3 w-3 ${sendingOtp ? "animate-spin" : ""}`} />
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
