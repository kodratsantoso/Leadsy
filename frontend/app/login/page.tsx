"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
  ShieldAlert,
  KeyRound,
  Info,
  ChevronDown,
  Target,
  MapPin,
  FileSignature,
  Users2,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/apiFetch";
import { describeThrown } from "@/lib/apiError";
import { LarkOneClickModal } from "@/components/integrations/LarkOneClickModal";
import { Modal } from "@/components/ui/modal";

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
    <Image
      src="/lark-logo.png"
      alt="Lark"
      width={24}
      height={24}
      className={`${className} object-contain shrink-0`}
      priority
    />
  );
}

function LeadsyLogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <Image
      src="/leadsy-logo.png"
      alt="Leadsy"
      width={80}
      height={80}
      className={`${className} object-contain`}
      priority
    />
  );
}

export default function LoginPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    if (token) {
      window.location.href = "/dashboard";
    }
  }, [token]);

  // ── Login state ──
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Rate Limiting & Suspension State ──
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [isSuspended, setIsSuspended] = useState(false);
  const [attemptsWarning, setAttemptsWarning] = useState<string | null>(null);

  // ── Language Selector ──
  const [lang, setLang] = useState<"id" | "en">("id");
  const [showLangMenu, setShowLangMenu] = useState(false);

  // ── 2FA state ──
  const [mode, setMode] = useState<"login" | "2fa">("login");
  const [tempToken, setTempToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  // ── Modals State ──
  const [showOneClickModal, setShowOneClickModal] = useState(false);
  const [showAdminContactModal, setShowAdminContactModal] = useState(false);
  const [larkLoginLoading, setLarkLoginLoading] = useState(false);

  // ── SSO Domain Modal ──
  const [showSsoModal, setShowSsoModal] = useState(false);
  const [ssoDomain, setSsoDomain] = useState("");
  const [ssoProvider, setSsoProvider] = useState<"google" | "microsoft" | "enterprise">("google");

  // ── Forgot Password OTP State ──
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "otp">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
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

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatLockoutTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // ── Login Handler ──
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

      // Reset lockout & suspension state on success
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
    setSuccess(
      `Mengalihkan ke portal SSO ${
        ssoProvider === "google" ? "Google Workspace" : ssoProvider === "microsoft" ? "Microsoft 365" : "Enterprise"
      } untuk ${ssoDomain}...`
    );

    setTimeout(() => {
      window.location.href = `/api/auth/sso/login?provider=${ssoProvider}&domain=${encodeURIComponent(ssoDomain.trim())}`;
    }, 800);
  };

  // ── Forgot Password Handlers ──
  const openForgotPassword = () => {
    setForgotEmail(loginEmail);
    setForgotStep("email");
    setForgotOtp(["", "", "", "", "", ""]);
    setNewPassword("");
    setConfirmPassword("");
    setForgotError("");
    setForgotSuccess("");
    setShowForgotModal(true);
  };

  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    if (!forgotEmail.trim()) {
      setForgotError("Silakan masukkan email akun Anda.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await apiFetch("/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal mengirimkan kode OTP.");

      setForgotSuccess(data.message || "Kode OTP verifikasi telah dikirim ke email Anda.");
      setForgotStep("otp");
      setResendCooldown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err) {
      setForgotError(describeThrown(err, "Gagal mengirimkan kode verifikasi.").title);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const nextDigits = [...forgotOtp];
    nextDigits[index] = value.slice(-1);
    setForgotOtp(nextDigits);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !forgotOtp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    const fullOtp = forgotOtp.join("");
    if (fullOtp.length !== 6) {
      setForgotError("Kode OTP harus terdiri dari 6 digit angka.");
      return;
    }
    if (newPassword.length < 8) {
      setForgotError("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await apiFetch("/auth/forgot-password/verify-and-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          otp: fullOtp,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal memperbarui kata sandi.");

      setShowForgotModal(false);
      setLoginEmail(forgotEmail.trim());
      setLoginPassword("");
      setLockoutSeconds(0);
      setIsSuspended(false);
      setAttemptsWarning(null);
      setSuccess("Kata sandi berhasil diperbarui! Silakan masuk menggunakan kata sandi baru Anda.");
    } catch (err) {
      setForgotError(describeThrown(err, "Gagal mereset kata sandi.").title);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col lg:grid lg:grid-cols-12 selection:bg-purple-600/30">
      {/* ── LEFT COLUMN: Brand Hero & Intelligence Showcase (lg:col-span-7) ── */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-10 xl:p-14 relative overflow-hidden bg-gradient-to-br from-[#120f26] via-[#0b0c16] to-[#180e2b] border-r border-white/5">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-purple-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[450px] w-[450px] rounded-full bg-amber-500/10 blur-[140px]" />

        {/* Top Header Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <LeadsyLogoMark className="h-10 w-10 drop-shadow-md" />
          <span className="text-2xl font-bold tracking-tight text-white flex items-center">
            Leadsy
          </span>
        </div>

        {/* Main Content Area */}
        <div className="relative z-10 my-auto py-8 max-w-2xl">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1 text-xs font-medium text-purple-300 shadow-sm backdrop-blur-sm mb-6">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>Platform AI-Sales untuk Pertumbuhan Pendapatan</span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-[1.2] mb-4">
            AI-Powered{" "}
            <span className="bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-300 bg-clip-text text-transparent">
              Revenue Intelligence
            </span>{" "}
            &amp; Sales Execution Platform
          </h1>

          {/* Subtitle */}
          <p className="text-sm xl:text-base text-slate-300/80 leading-relaxed mb-8 max-w-xl">
            Leadsy membantu tim sales menemukan peluang, menjalankan proses penjualan end-to-end,
            dan mendorong pertumbuhan pendapatan yang terukur dengan kekuatan AI.
          </p>

          {/* Grid Layout: Feature Highlights & Dashboard Mockup */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* 5 Feature Highlights (5 cols) */}
            <div className="xl:col-span-5 space-y-3.5">
              {[
                {
                  icon: Target,
                  title: "Lead Intelligence",
                  desc: "Temukan dan prioritaskan prospek terbaik dengan AI.",
                  color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
                },
                {
                  icon: MapPin,
                  title: "Maps & Territory",
                  desc: "Kelola area, cakupan, dan potensi pasar secara lebih cerdas.",
                  color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
                },
                {
                  icon: FileSignature,
                  title: "Quotation & Sales Order",
                  desc: "Buat penawaran dan kelola sales order dengan cepat dan akurat.",
                  color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
                },
                {
                  icon: Users2,
                  title: "Professional Services",
                  desc: "Kelola delivery, implementasi, dan layanan purna jual secara terintegrasi.",
                  color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
                },
                {
                  icon: TrendingUp,
                  title: "Revenue Analytics",
                  desc: "Pantau pipeline, kinerja tim, dan pertumbuhan revenue secara real-time.",
                  color: "text-rose-400 bg-rose-400/10 border-rose-400/20",
                },
              ].map((feat, idx) => {
                const IconComponent = feat.icon;
                return (
                  <div key={idx} className="flex items-start gap-3 group">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${feat.color}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white tracking-wide">{feat.title}</h4>
                      <p className="text-[11px] text-slate-400 leading-snug">{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Interactive UI Mockup (7 cols) */}
            <div className="xl:col-span-7 relative">
              {/* Glass dashboard frame */}
              <div className="rounded-2xl border border-white/10 bg-[#0e101a]/90 p-4 shadow-2xl backdrop-blur-md">
                {/* Mockup header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-semibold text-slate-200">Dashboard Revenue</span>
                  </div>
                  <div className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                    Periode: 3 Bulan Terakhir <ChevronDown className="h-2.5 w-2.5" />
                  </div>
                </div>

                {/* 4 KPI Chips */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-lg bg-white/[0.03] p-2 border border-white/5">
                    <p className="text-[10px] text-slate-400">Total Revenue</p>
                    <p className="text-xs font-bold text-white mt-0.5">Rp 12,54 M</p>
                    <span className="text-[9px] text-emerald-400 font-medium">▲ +18,6%</span>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-2 border border-white/5">
                    <p className="text-[10px] text-slate-400">Total Pipeline</p>
                    <p className="text-xs font-bold text-white mt-0.5">Rp 28,90 M</p>
                    <span className="text-[9px] text-emerald-400 font-medium">▲ +24,3%</span>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-2 border border-white/5">
                    <p className="text-[10px] text-slate-400">Win Rate</p>
                    <p className="text-xs font-bold text-white mt-0.5">37,8%</p>
                    <span className="text-[9px] text-emerald-400 font-medium">▲ +5,2 pp</span>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-2 border border-white/5">
                    <p className="text-[10px] text-slate-400">Total Lead</p>
                    <p className="text-xs font-bold text-white mt-0.5">1.248</p>
                    <span className="text-[9px] text-emerald-400 font-medium">▲ +12,9%</span>
                  </div>
                </div>

                {/* Mini Visual Chart & Donut */}
                <div className="rounded-lg bg-white/[0.02] p-2.5 border border-white/5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-medium">Tren Revenue</p>
                    <svg className="h-9 w-28 text-purple-400" viewBox="0 0 100 30" fill="none">
                      <path
                        d="M0 25 C20 20, 40 22, 55 12 C70 5, 85 10, 100 2"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">Pipeline Distribution</p>
                    <div className="flex items-center gap-1.5 mt-1 justify-end">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                      <span className="text-[9px] text-slate-300">Proposal 18%</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ml-1" />
                      <span className="text-[9px] text-slate-300">Won 11%</span>
                    </div>
                  </div>
                </div>

                {/* Floating AI Insight Pill */}
                <div className="mt-3 rounded-xl border border-purple-500/30 bg-purple-950/40 p-2.5 shadow-lg flex items-center justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-semibold text-purple-200">AI Insight</p>
                      <p className="text-[10px] text-purple-300/80 leading-tight">
                        3 peluang bernilai tinggi dengan potensi revenue Rp 4,26 M perlu ditindaklanjuti.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom subtle copyright / build note */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-white/5">
          <span>&copy; {new Date().getFullYear()} Leadsy Platform &middot; PT Prasetia Dwidharma</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Enterprise Sales Infrastructure
          </span>
        </div>
      </div>

      {/* ── RIGHT COLUMN: Authentication Form (lg:col-span-5) ── */}
      <div className="flex-1 lg:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 bg-[#0c0d14] relative">
        {/* Top Right: Language Switcher */}
        <div className="flex items-center justify-between lg:justify-end mb-6">
          <div className="lg:hidden flex items-center gap-2">
            <LeadsyLogoMark className="h-6 w-6" />
            <span className="text-lg font-bold text-white">Leadsy</span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
            >
              <span>{lang === "id" ? "🇮🇩 Bahasa Indonesia" : "🇺🇸 English"}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-xl border border-white/10 bg-[#121420] p-1.5 shadow-xl z-50">
                <button
                  type="button"
                  onClick={() => {
                    setLang("id");
                    setShowLangMenu(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    lang === "id" ? "bg-purple-600/20 text-purple-300" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <span>🇮🇩</span> Bahasa Indonesia
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLang("en");
                    setShowLangMenu(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    lang === "en" ? "bg-purple-600/20 text-purple-300" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <span>🇺🇸</span> English
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center: Auth Form Container */}
        <div className="w-full max-w-sm mx-auto my-auto space-y-5">
          {/* Form Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center mb-1">
              <LeadsyLogoMark className="h-16 w-16 drop-shadow-lg" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {mode === "login" ? "Masuk ke Leadsy" : "Verifikasi Dua Langkah (2FA)"}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              {mode === "login"
                ? "Kelola pipeline, jalankan penjualan, dan tingkatkan revenue dengan kecerdasan AI."
                : "Masukkan 6-digit kode autentikasi dari aplikasi authenticator Anda."}
            </p>
          </div>

          {/* Suspended Alert */}
          {isSuspended && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-rose-400">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <div>
                <p className="font-semibold text-rose-200">Akun Ditangguhkan (Suspended)</p>
                <p className="mt-0.5 text-rose-300/80 leading-relaxed">
                  Akun Anda telah dinonaktifkan setelah beberapa kali percobaan gagal. Silakan hubungi Administrator Anda untuk membuka kembali akses.
                </p>
              </div>
            </div>
          )}

          {/* Lockout Countdown Alert */}
          {lockoutSeconds > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-400">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <p className="font-semibold text-amber-200">Akun Terkunci Sementara</p>
                <p className="mt-0.5 text-amber-300/80 leading-relaxed">
                  Terlalu banyak percobaan gagal. Silakan tunggu{" "}
                  <span className="font-mono font-bold text-amber-100">
                    {formatLockoutTimer(lockoutSeconds)}
                  </span>{" "}
                  sebelum mencoba kembali.
                </p>
              </div>
            </div>
          )}

          {/* Remaining Attempts Warning */}
          {attemptsWarning && lockoutSeconds === 0 && !isSuspended && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span className="leading-relaxed">{attemptsWarning}</span>
            </div>
          )}

          {/* General Error Banner */}
          {error && !attemptsWarning && lockoutSeconds === 0 && !isSuspended && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span className="leading-relaxed">{success}</span>
            </div>
          )}

          {/* ── MODE: LOGIN ── */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Email</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Masukkan email Anda"
                    disabled={loginLoading || lockoutSeconds > 0 || isSuspended}
                    className="w-full rounded-xl border border-white/10 bg-[#141624] pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Masukkan password Anda"
                    disabled={loginLoading || lockoutSeconds > 0 || isSuspended}
                    className="w-full rounded-xl border border-white/10 bg-[#141624] pl-9 pr-10 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-[#141624] text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                  />
                  <span className="text-slate-300">Ingat saya</span>
                </label>

                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  Lupa password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loginLoading || lockoutSeconds > 0 || isSuspended}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-600/25 transition-all hover:opacity-95 hover:shadow-purple-600/35 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sedang Masuk...</span>
                  </>
                ) : lockoutSeconds > 0 ? (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>Terkunci ({formatLockoutTimer(lockoutSeconds)})</span>
                  </>
                ) : isSuspended ? (
                  <>
                    <ShieldAlert className="h-4 w-4" />
                    <span>Akun Ditangguhkan</span>
                  </>
                ) : (
                  <span>Masuk</span>
                )}
              </button>

              {/* Separator */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative bg-[#0c0d14] px-3 text-[11px] font-medium text-slate-400">
                  atau masuk dengan
                </div>
              </div>

              {/* SSO Buttons Stack */}
              <div className="space-y-2">
                {/* Lark SSO */}
                <button
                  type="button"
                  onClick={handleLarkLogin}
                  disabled={larkLoginLoading || lockoutSeconds > 0}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-[#121422] py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/5 disabled:opacity-50"
                >
                  {larkLoginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LarkIcon className="h-4 w-4" />}
                  <span>{larkLoginLoading ? "Mengarahkan ke Lark..." : "Masuk dengan Lark"}</span>
                </button>

                {/* Google SSO */}
                <button
                  type="button"
                  onClick={() => {
                    setSsoProvider("google");
                    setShowSsoModal(true);
                  }}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-[#121422] py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/5"
                >
                  <GoogleIcon className="h-4 w-4" />
                  <span>Masuk dengan Google</span>
                </button>

                {/* Microsoft SSO */}
                <button
                  type="button"
                  onClick={() => {
                    setSsoProvider("microsoft");
                    setShowSsoModal(true);
                  }}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-[#121422] py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/5"
                >
                  <MicrosoftIcon className="h-4 w-4" />
                  <span>Masuk dengan Microsoft</span>
                </button>
              </div>
            </form>
          )}

          {/* ── MODE: 2FA ── */}
          {mode === "2fa" && (
            <form onSubmit={handle2faVerify} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Kode Autentikasi 6-Digit</label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  required
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.5em] font-mono text-lg rounded-xl border border-white/10 bg-[#141624] py-3 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="flex-1 rounded-xl border border-white/10 bg-transparent py-2.5 text-xs font-medium text-slate-300 hover:bg-white/5"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={loginLoading || twoFactorCode.length !== 6}
                  className="flex-1 rounded-xl bg-purple-600 py-2.5 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
                >
                  {loginLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Verifikasi"}
                </button>
              </div>
            </form>
          )}

          {/* Footer Note */}
          <div className="flex items-start gap-2 pt-2 text-[11px] text-slate-400 leading-relaxed border-t border-white/5">
            <Info className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
            <p>
              Belum memiliki akun? Silakan{" "}
              <button
                type="button"
                onClick={() => setShowAdminContactModal(true)}
                className="text-purple-400 font-semibold hover:underline"
              >
                hubungi administrator
              </button>{" "}
              perusahaan Anda untuk mendapatkan akses ke Leadsy.
            </p>
          </div>

          {/* Registration 1-Click Lark Link */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setShowOneClickModal(true)}
              className="text-[11px] text-slate-500 hover:text-purple-400 font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="h-3 w-3 text-purple-400" />
              <span>Daftarkan Workspace Baru dengan Lark (1-Klik)</span>
            </button>
          </div>
        </div>

        {/* Bottom copyright on mobile */}
        <div className="lg:hidden text-center text-xs text-slate-500 pt-6">
          &copy; {new Date().getFullYear()} Leadsy Platform &middot; PT Prasetia Dwidharma
        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL (EMAIL + 6-DIGIT OTP) ── */}
      {showForgotModal && (
        <Modal
          open={showForgotModal}
          onOpenChange={setShowForgotModal}
          title="Reset Kata Sandi Akun"
          description="Pulihkan akses akun Leadsy Anda menggunakan kode verifikasi OTP yang dikirimkan ke email terdaftar."
          size="md"
        >
          {forgotError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{forgotError}</span>
            </div>
          )}

          {forgotSuccess && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>{forgotSuccess}</span>
            </div>
          )}

          {forgotStep === "email" ? (
            <form onSubmit={handleSendResetOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Email Terdaftar</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="nama@perusahaan.com"
                    className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Kami akan mengirimkan 6-digit kode OTP ke alamat email ini untuk memverifikasi identitas Anda.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="rounded-xl border border-input bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Mengirim Kode...</span>
                    </>
                  ) : (
                    <span>Kirim Kode OTP</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndResetPassword} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Kode Verifikasi OTP (6-Digit)</label>
                  {resendCooldown > 0 ? (
                    <span className="text-[11px] text-muted-foreground">Kirim ulang ({resendCooldown}s)</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendResetOtp}
                      className="text-[11px] text-purple-500 hover:underline font-medium"
                    >
                      Kirim Ulang OTP
                    </button>
                  )}
                </div>

                <div className="flex justify-center gap-2">
                  {forgotOtp.map((digit, i) => (
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
                      className="h-11 w-10 text-center font-mono text-base font-bold rounded-xl border border-input bg-background text-foreground focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Kata Sandi Baru</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Konfirmasi Kata Sandi Baru</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setForgotStep("email")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Ganti Email
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Kata Sandi Baru</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* ── CONTACT ADMINISTRATOR MODAL ── */}
      {showAdminContactModal && (
        <Modal
          open={showAdminContactModal}
          onOpenChange={setShowAdminContactModal}
          title="Bantuan Akses Akun Leadsy"
          description="Untuk keamanan perusahaan, pembuatan akun dan pembukaan blokir akun dikelola terpusat oleh IT / Sales Operations Administrator."
          size="sm"
        >
          <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
            <div className="rounded-xl border border-border bg-secondary/50 p-3 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-purple-500" />
                <span>Prosedur Pembukaan Akun &amp; Akses:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li>Hubungi Admin IT atau Sales Ops di perusahaan Anda.</li>
                <li>Admin dapat membuka kunci akun Anda dalam 1-klik melalui menu <strong>Settings &gt; Users &gt; Unlock</strong>.</li>
                <li>Atau gunakan opsi <strong>Lupa Password</strong> untuk mereset akun secara mandiri via kode OTP email.</li>
              </ul>
            </div>

            <p className="text-center text-[11px]">
              Dukungan teknis platform Leadsy:{" "}
              <a href="mailto:support@leadsy.tech" className="text-purple-400 font-semibold hover:underline">
                support@leadsy.tech
              </a>
            </p>

            <button
              type="button"
              onClick={() => setShowAdminContactModal(false)}
              className="w-full rounded-xl bg-secondary py-2 text-xs font-semibold text-foreground hover:bg-secondary/80"
            >
              Tutup
            </button>
          </div>
        </Modal>
      )}

      {/* ── SSO DOMAIN MODAL ── */}
      {showSsoModal && (
        <Modal
          open={showSsoModal}
          onOpenChange={setShowSsoModal}
          title={`Masuk dengan ${ssoProvider === "google" ? "Google Workspace" : ssoProvider === "microsoft" ? "Microsoft 365" : "Enterprise SSO"}`}
          description="Masukkan domain email perusahaan Anda untuk melanjutkan otentikasi Single Sign-On."
          size="sm"
        >
          <form onSubmit={handleSsoSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Domain Perusahaan</label>
              <input
                type="text"
                required
                autoFocus
                value={ssoDomain}
                onChange={(e) => setSsoDomain(e.target.value)}
                placeholder="misal: perusahaan.co.id"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSsoModal(false)}
                className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-500"
              >
                <span>Lanjutkan SSO</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── 4-STEP LARK ONE-CLICK REGISTRATION MODAL ── */}
      {showOneClickModal && (
        <LarkOneClickModal
          open={showOneClickModal}
          onOpenChange={setShowOneClickModal}
          isPublic
          onSuccess={(tenant) => {
            setShowOneClickModal(false);
            setSuccess(`Workspace "${tenant.tenant_name || "Lark"}" berhasil dibuat dan dihubungkan ke Lark!`);
          }}
        />
      )}
    </div>
  );
}
