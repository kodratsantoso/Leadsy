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
  LayoutDashboard,
  BrainCircuit,
  PieChart,
  Briefcase,
  Layers,
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
      width={22}
      height={22}
      className={`${className} object-contain shrink-0`}
      priority
    />
  );
}

// ── Localization Dictionary ──
const i18n = {
  id: {
    badge: "Platform AI-Sales untuk Pertumbuhan Pendapatan",
    headlinePart1: "AI-Powered",
    headlinePart2: "Revenue Intelligence & Sales Execution Platform",
    subtitle:
      "Leadsy membantu tim sales menemukan peluang, menjalankan proses penjualan end-to-end, dan mendorong pertumbuhan pendapatan yang terukur dengan kekuatan AI.",
    feat1Title: "Lead Intelligence",
    feat1Desc: "Temukan dan prioritaskan prospek terbaik dengan AI.",
    feat2Title: "Maps & Territory",
    feat2Desc: "Kelola area, cakupan, dan potensi pasar secara lebih cerdas.",
    feat3Title: "Quotation & Sales Order",
    feat3Desc: "Buat penawaran dan kelola sales order dengan cepat dan akurat.",
    feat4Title: "Professional Services",
    feat4Desc: "Kelola delivery, implementasi, dan layanan purna jual secara terintegrasi.",
    feat5Title: "Revenue Analytics",
    feat5Desc: "Pantau pipeline, kinerja tim, dan pertumbuhan revenue secara real-time.",
    dashTitle: "Dashboard Revenue",
    dashPeriod: "Periode: 3 Bulan Terakhir",
    totalRev: "Total Revenue",
    totalPipe: "Total Pipeline",
    winRate: "Win Rate",
    totalLead: "Total Lead",
    revTrend: "Tren Revenue",
    pipeDist: "Distribusi Pipeline",
    aiInsightTitle: "AI Insight",
    aiInsightBody: "3 peluang bernilai tinggi dengan potensi revenue Rp 4,26 M perlu ditindaklanjuti.",
    authTitle: "Masuk ke Leadsy",
    authDesc: "Kelola pipeline, jalankan penjualan, dan tingkatkan revenue dengan kecerdasan AI.",
    emailLabel: "Email",
    emailPlaceholder: "Masukkan email Anda",
    passwordLabel: "Password",
    passwordPlaceholder: "Masukkan password Anda",
    rememberMe: "Ingat saya",
    forgotPassword: "Lupa password?",
    signIn: "Masuk",
    signingIn: "Sedang Masuk...",
    lockedTitle: "Akun Terkunci Sementara",
    suspendedTitle: "Akun Ditangguhkan (Suspended)",
    orContinueWith: "atau masuk dengan",
    larkLogin: "Masuk dengan Lark",
    googleLogin: "Masuk dengan Google",
    microsoftLogin: "Masuk dengan Microsoft",
    noAccount: "Belum memiliki akun? Silakan",
    contactAdmin: "hubungi administrator",
    accessSuffix: "perusahaan Anda untuk mendapatkan akses ke Leadsy.",
    registerLark: "Daftarkan Workspace Baru dengan Lark (1-Klik)",
  },
  en: {
    badge: "AI-Sales Platform for Revenue Growth",
    headlinePart1: "AI-Powered",
    headlinePart2: "Revenue Intelligence & Sales Execution Platform",
    subtitle:
      "Leadsy empowers sales teams to discover opportunities, execute end-to-end deals, and drive measurable revenue growth with enterprise-grade AI.",
    feat1Title: "Lead Intelligence",
    feat1Desc: "Discover and prioritize high-value prospects with predictive AI.",
    feat2Title: "Maps & Territory",
    feat2Desc: "Manage geographic coverage and territory potential intelligently.",
    feat3Title: "Quotation & Sales Order",
    feat3Desc: "Generate accurate proposals and manage sales orders seamlessly.",
    feat4Title: "Professional Services",
    feat4Desc: "Estimate delivery, track milestones, and manage post-sales services.",
    feat5Title: "Revenue Analytics",
    feat5Desc: "Track pipelines, rep velocity, and forecast revenue growth in real time.",
    dashTitle: "Revenue Dashboard",
    dashPeriod: "Period: Last 3 Months",
    totalRev: "Total Revenue",
    totalPipe: "Total Pipeline",
    winRate: "Win Rate",
    totalLead: "Total Leads",
    revTrend: "Revenue Trend",
    pipeDist: "Pipeline Distribution",
    aiInsightTitle: "AI Insight",
    aiInsightBody: "3 high-value deals with Rp 4.26 B revenue potential require immediate follow-up.",
    authTitle: "Sign in to Leadsy",
    authDesc: "Manage pipelines, accelerate sales execution, and increase revenue with AI.",
    emailLabel: "Email Address",
    emailPlaceholder: "Enter your corporate email",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password?",
    signIn: "Sign In",
    signingIn: "Signing in...",
    lockedTitle: "Account Temporarily Locked",
    suspendedTitle: "Account Suspended",
    orContinueWith: "or continue with",
    larkLogin: "Continue with Lark",
    googleLogin: "Continue with Google",
    microsoftLogin: "Continue with Microsoft",
    noAccount: "Don't have an account yet? Please",
    contactAdmin: "contact your administrator",
    accessSuffix: "to request access to your company's Leadsy workspace.",
    registerLark: "Register New Workspace with Lark (1-Click)",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    if (token) {
      window.location.href = "/dashboard";
    }
  }, [token]);

  // ── Language State ──
  const [lang, setLang] = useState<"id" | "en">("id");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const t = i18n[lang];

  // ── Login Form State ──
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

  // ── 2FA State ──
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
        throw new Error(data?.message || (lang === "id" ? "Kredensial tidak valid. Silakan periksa email dan password Anda." : "Invalid credentials. Please verify your email and password."));
      }

      setLockoutSeconds(0);
      setIsSuspended(false);

      if (data.requires_2fa) {
        setTempToken(data.token);
        setMode("2fa");
        return;
      }

      const workspace = data.workspace || data.user?.tenant;
      if (workspace?.id && typeof window !== "undefined") {
        window.localStorage.setItem("lark_tenant_id", String(workspace.id));
      }

      setAuth(data.token, data.user);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(
        describeThrown(err).isOffline
          ? (lang === "id" ? "Tidak dapat terhubung ke server backend. Pastikan server aktif." : "Cannot connect to server. Please verify backend is running.")
          : describeThrown(err, lang === "id" ? "Terjadi kesalahan saat masuk." : "An error occurred while signing in.").title
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
      if (!res.ok) throw new Error(data?.message || (lang === "id" ? "Kode 2FA tidak valid." : "Invalid 2FA code."));

      const workspace = data.workspace || data.user?.tenant;
      if (workspace?.id && typeof window !== "undefined") {
        window.localStorage.setItem("lark_tenant_id", String(workspace.id));
      }

      setAuth(data.token, data.user);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(describeThrown(err, lang === "id" ? "Terjadi kesalahan saat verifikasi." : "Verification failed.").title);
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
        throw new Error(data?.message || (lang === "id" ? "Gagal memulai login Lark." : "Failed to initiate Lark login."));
      }

      if (!data?.auth_url) {
        throw new Error(lang === "id" ? "URL autentikasi Lark tidak ditemukan." : "Lark authentication URL not found.");
      }

      window.location.href = data.auth_url;
    } catch (err) {
      setError(describeThrown(err, lang === "id" ? "Tidak dapat melanjutkan SSO Lark." : "Could not continue with Lark SSO.").title);
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
      lang === "id"
        ? `Mengalihkan ke portal SSO ${ssoProvider === "google" ? "Google Workspace" : ssoProvider === "microsoft" ? "Microsoft 365" : "Enterprise"} untuk ${ssoDomain}...`
        : `Redirecting to ${ssoProvider === "google" ? "Google Workspace" : ssoProvider === "microsoft" ? "Microsoft 365" : "Enterprise"} SSO portal for ${ssoDomain}...`
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
      setForgotError(lang === "id" ? "Silakan masukkan email akun Anda." : "Please enter your account email.");
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

      setForgotSuccess(data.message || (lang === "id" ? "Kode OTP verifikasi telah dikirim ke email Anda." : "OTP code sent to your email."));
      setForgotStep("otp");
      setResendCooldown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err) {
      setForgotError(describeThrown(err, lang === "id" ? "Gagal mengirimkan kode verifikasi." : "Failed to send verification code.").title);
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
      setForgotError(lang === "id" ? "Kode OTP harus terdiri dari 6 digit angka." : "OTP must be 6 digits.");
      return;
    }
    if (newPassword.length < 8) {
      setForgotError(lang === "id" ? "Kata sandi baru minimal 8 karakter." : "New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError(lang === "id" ? "Konfirmasi kata sandi tidak cocok." : "Password confirmation does not match.");
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
      setSuccess(lang === "id" ? "Kata sandi berhasil diperbarui! Silakan masuk menggunakan kata sandi baru Anda." : "Password updated successfully! Please sign in with your new password.");
    } catch (err) {
      setForgotError(describeThrown(err, lang === "id" ? "Gagal mereset kata sandi." : "Failed to reset password.").title);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-[#0a0b12] text-slate-100 selection:bg-purple-600/30 overflow-x-hidden">
      {/* ── LEFT PANEL: PREMIUM PRODUCT SHOWCASE (61-62% DESKTOP WIDTH) ── */}
      <div className="hidden lg:flex lg:w-[61%] xl:w-[62%] flex-col justify-between p-8 lg:p-12 xl:p-14 2xl:p-16 relative overflow-hidden bg-gradient-to-br from-[#120f26] via-[#090a14] to-[#180e2b] border-r border-white/5">
        {/* Ambient lighting glows */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-purple-600/15 blur-[140px]" />
        <div className="pointer-events-none absolute top-1/3 -right-20 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[150px]" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-[450px] w-[450px] rounded-full bg-indigo-600/10 blur-[130px]" />

        {/* Top Header: Official Leadsy Horizontal Brand Lockup */}
        <div className="relative z-10 flex items-center">
          <Image
            src="/leadsy-horizontal.png"
            alt="Leadsy"
            width={180}
            height={50}
            className="h-10 xl:h-11 w-auto object-contain drop-shadow"
            priority
          />
        </div>

        {/* Center Content: Full Width Hero Showcase */}
        <div className="relative z-10 my-auto py-6 w-full">
          {/* Product Positioning Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/35 bg-purple-500/10 px-3.5 py-1 text-xs font-medium text-purple-300 shadow-sm backdrop-blur-md mb-5">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>{t.badge}</span>
          </div>

          {/* Hero Headline */}
          <h1 className="font-display text-3xl sm:text-4xl lg:text-[40px] xl:text-[46px] 2xl:text-[50px] font-extrabold tracking-tight leading-[1.14] text-white mb-4 max-w-4xl">
            {t.headlinePart1}{" "}
            <span className="bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-300 bg-clip-text text-transparent">
              {t.headlinePart2}
            </span>
          </h1>

          {/* Product Description */}
          <p className="text-sm xl:text-base text-slate-300/85 leading-relaxed mb-8 max-w-2xl">
            {t.subtitle}
          </p>

          {/* Two-Column Showcase: Features (Left) + Large Layered Dashboard (Right) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-center w-full">
            {/* 5 Product Feature Highlights (XL: 5 Columns) */}
            <div className="xl:col-span-5 space-y-4">
              {[
                {
                  icon: Target,
                  title: t.feat1Title,
                  desc: t.feat1Desc,
                  color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
                },
                {
                  icon: MapPin,
                  title: t.feat2Title,
                  desc: t.feat2Desc,
                  color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
                },
                {
                  icon: FileSignature,
                  title: t.feat3Title,
                  desc: t.feat3Desc,
                  color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
                },
                {
                  icon: Users2,
                  title: t.feat4Title,
                  desc: t.feat4Desc,
                  color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
                },
                {
                  icon: TrendingUp,
                  title: t.feat5Title,
                  desc: t.feat5Desc,
                  color: "text-rose-400 bg-rose-400/10 border-rose-400/20",
                },
              ].map((feat, idx) => {
                const IconComponent = feat.icon;
                return (
                  <div key={idx} className="flex items-start gap-3.5 group">
                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${feat.color} shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white tracking-wide">{feat.title}</h4>
                      <p className="text-xs text-slate-400 leading-snug mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Large Product Dashboard Showcase (XL: 7 Columns) */}
            <div className="xl:col-span-7 relative w-full">
              {/* Outer Glow */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-purple-600/30 to-indigo-600/20 blur-xl opacity-75" />

              {/* Main Dashboard Window Frame */}
              <div className="relative rounded-2xl border border-white/10 bg-[#0d0f1a]/95 p-4 xl:p-5 shadow-2xl backdrop-blur-xl">
                {/* Traffic lights & console title */}
                <div className="flex items-center justify-between pb-3.5 border-b border-white/5 mb-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-300 ml-2 flex items-center gap-1.5">
                      <LayoutDashboard className="h-3.5 w-3.5 text-purple-400" />
                      {t.dashTitle}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1">
                    {t.dashPeriod} <ChevronDown className="h-2.5 w-2.5" />
                  </div>
                </div>

                {/* Dashboard Inner Layout: Mini Nav Sidebar + Content */}
                <div className="grid grid-cols-12 gap-3.5">
                  {/* Left Mini Sidebar */}
                  <div className="col-span-3 space-y-1.5 border-r border-white/5 pr-2.5 hidden sm:block">
                    <div className="px-2 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 text-[11px] font-semibold border-l-2 border-purple-500 flex items-center gap-1.5">
                      <LayoutDashboard className="h-3 w-3" />
                      <span>Overview</span>
                    </div>
                    <div className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-[10px] flex items-center gap-1.5">
                      <BrainCircuit className="h-3 w-3" />
                      <span>Intelligence</span>
                    </div>
                    <div className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-[10px] flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      <span>Territory</span>
                    </div>
                    <div className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-[10px] flex items-center gap-1.5">
                      <FileSignature className="h-3 w-3" />
                      <span>Quotations</span>
                    </div>
                    <div className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-[10px] flex items-center gap-1.5">
                      <Briefcase className="h-3 w-3" />
                      <span>Services</span>
                    </div>
                    <div className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-[10px] flex items-center gap-1.5">
                      <PieChart className="h-3 w-3" />
                      <span>Analytics</span>
                    </div>
                  </div>

                  {/* Right Dashboard Metrics & Charts */}
                  <div className="col-span-12 sm:col-span-9 space-y-3">
                    {/* 4 KPI Metric Chips */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5 shadow-inner">
                        <p className="text-[10px] text-slate-400">{t.totalRev}</p>
                        <p className="text-sm font-bold text-white mt-0.5">Rp 12,54 M</p>
                        <span className="text-[9px] text-emerald-400 font-semibold">▲ +18,6%</span>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5 shadow-inner">
                        <p className="text-[10px] text-slate-400">{t.totalPipe}</p>
                        <p className="text-sm font-bold text-white mt-0.5">Rp 28,90 M</p>
                        <span className="text-[9px] text-emerald-400 font-semibold">▲ +24,3%</span>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5 shadow-inner">
                        <p className="text-[10px] text-slate-400">{t.winRate}</p>
                        <p className="text-sm font-bold text-white mt-0.5">37,8%</p>
                        <span className="text-[9px] text-emerald-400 font-semibold">▲ +5,2 pp</span>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5 shadow-inner">
                        <p className="text-[10px] text-slate-400">{t.totalLead}</p>
                        <p className="text-sm font-bold text-white mt-0.5">1.248</p>
                        <span className="text-[9px] text-emerald-400 font-semibold">▲ +12,9%</span>
                      </div>
                    </div>

                    {/* Chart Row: Tren Revenue Curve + Pipeline Donut Summary */}
                    <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5 grid grid-cols-2 gap-2 items-center">
                      {/* Left: Revenue Trend Curve */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-slate-300">{t.revTrend}</p>
                        <svg className="w-full h-11 text-purple-400 drop-shadow" viewBox="0 0 100 35" fill="none">
                          <defs>
                            <linearGradient id="gradCurve" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M0 30 C 20 28, 35 22, 50 14 C 65 6, 80 12, 100 3 L 100 35 L 0 35 Z"
                            fill="url(#gradCurve)"
                          />
                          <path
                            d="M0 30 C 20 28, 35 22, 50 14 C 65 6, 80 12, 100 3"
                            stroke="#a855f7"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          <circle cx="50" cy="14" r="2.5" fill="#c084fc" />
                          <circle cx="100" cy="3" r="2.5" fill="#38bdf8" />
                        </svg>
                      </div>

                      {/* Right: Pipeline Distribution Donut + Legend */}
                      <div className="flex items-center justify-between pl-1">
                        {/* Mini Circular Donut */}
                        <div className="relative flex items-center justify-center shrink-0">
                          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="rgba(255,255,255,0.05)"
                              strokeWidth="3.8"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#c084fc"
                              strokeWidth="3.8"
                              strokeDasharray="32, 100"
                              strokeDashoffset="0"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#818cf8"
                              strokeWidth="3.8"
                              strokeDasharray="24, 100"
                              strokeDashoffset="-32"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#fbbf24"
                              strokeWidth="3.8"
                              strokeDasharray="18, 100"
                              strokeDashoffset="-56"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#f97316"
                              strokeWidth="3.8"
                              strokeDasharray="15, 100"
                              strokeDashoffset="-74"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#34d399"
                              strokeWidth="3.8"
                              strokeDasharray="11, 100"
                              strokeDashoffset="-89"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-[7px] text-slate-400 font-medium leading-none">Pipeline</span>
                            <span className="text-[8px] text-white font-bold leading-tight mt-0.5">28,9M</span>
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="text-right space-y-0.5 text-[8.5px] text-slate-300">
                          <div className="flex items-center justify-end gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                            <span>Prospecting 32%</span>
                          </div>
                          <div className="flex items-center justify-end gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                            <span>Qualification 24%</span>
                          </div>
                          <div className="flex items-center justify-end gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            <span>Proposal 18%</span>
                          </div>
                          <div className="flex items-center justify-end gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                            <span>Negotiation 15%</span>
                          </div>
                          <div className="flex items-center justify-end gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span>Closed Won 11%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating AI Insight Pill Overlap */}
                <div className="mt-3.5 rounded-xl border border-purple-500/40 bg-gradient-to-r from-purple-950/70 via-[#151229]/80 to-purple-950/70 p-3 shadow-xl backdrop-blur-md flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                      <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-purple-200">{t.aiInsightTitle}</p>
                      <p className="text-[11px] text-purple-300/80 leading-snug">
                        {t.aiInsightBody}
                      </p>
                    </div>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-purple-600/30 flex items-center justify-center shrink-0 text-purple-300">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-white/5">
          <span>&copy; {new Date().getFullYear()} Leadsy Platform &middot; PT Prasetia Dwidharma</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Enterprise Sales Infrastructure
          </span>
        </div>
      </div>

      {/* ── RIGHT PANEL: AUTHENTICATION EXPERIENCE (38-39% DESKTOP WIDTH) ── */}
      <div className="flex-1 lg:w-[39%] xl:w-[38%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 bg-[#0c0d16] relative border-l border-white/5">
        {/* Top Bar: Mobile Logo & Language Switcher */}
        <div className="flex items-center justify-between mb-8">
          <div className="lg:hidden flex items-center">
            <Image
              src="/leadsy-horizontal.png"
              alt="Leadsy"
              width={130}
              height={36}
              className="h-8 w-auto object-contain"
              priority
            />
          </div>

          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 shadow-sm"
            >
              <span>{lang === "id" ? "🇮🇩 Bahasa Indonesia" : "🇺🇸 English"}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#121422] p-1.5 shadow-2xl z-50 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => {
                    setLang("id");
                    setShowLangMenu(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    lang === "id" ? "bg-purple-600/20 text-purple-300 font-semibold" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <span className="text-sm">🇮🇩</span> Bahasa Indonesia
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLang("en");
                    setShowLangMenu(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    lang === "en" ? "bg-purple-600/20 text-purple-300 font-semibold" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <span className="text-sm">🇺🇸</span> English
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center: Authentication Form Container (420-460px balanced desktop width) */}
        <div className="w-full max-w-[440px] mx-auto my-auto space-y-6">
          {/* Header Branding & Typography */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center mb-1">
              <Image
                src="/leadsy-horizontal.png"
                alt="Leadsy"
                width={190}
                height={52}
                className="h-11 w-auto object-contain drop-shadow-md"
                priority
              />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {mode === "login" ? t.authTitle : "Two-Factor Authentication (2FA)"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
              {mode === "login"
                ? t.authDesc
                : lang === "id"
                ? "Masukkan 6-digit kode autentikasi dari aplikasi authenticator Anda."
                : "Enter the 6-digit authentication code from your authenticator app."}
            </p>
          </div>

          {/* Suspended Alert */}
          {isSuspended && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-rose-400">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <div>
                <p className="font-semibold text-rose-200">{t.suspendedTitle}</p>
                <p className="mt-0.5 text-rose-300/80 leading-relaxed">
                  {lang === "id"
                    ? "Akun Anda telah dinonaktifkan setelah beberapa kali percobaan gagal. Silakan hubungi Administrator Anda untuk membuka kembali akses."
                    : "Your account has been deactivated following repeated failed login attempts. Please contact your system administrator to restore access."}
                </p>
              </div>
            </div>
          )}

          {/* Lockout Countdown Alert */}
          {lockoutSeconds > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-400">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <p className="font-semibold text-amber-200">{t.lockedTitle}</p>
                <p className="mt-0.5 text-amber-300/80 leading-relaxed">
                  {lang === "id" ? "Terlalu banyak percobaan gagal. Silakan tunggu " : "Too many failed attempts. Please wait "}
                  <span className="font-mono font-bold text-amber-100">
                    {formatLockoutTimer(lockoutSeconds)}
                  </span>{" "}
                  {lang === "id" ? "sebelum mencoba kembali." : "before trying again."}
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
                <label className="text-[13px] font-medium text-slate-300">{t.emailLabel}</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    disabled={loginLoading || lockoutSeconds > 0 || isSuspended}
                    className="h-12 w-full rounded-xl border border-white/10 bg-[#121422] pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 transition-colors"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-slate-300">{t.passwordLabel}</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    disabled={loginLoading || lockoutSeconds > 0 || isSuspended}
                    className="h-12 w-full rounded-xl border border-white/10 bg-[#121422] pl-11 pr-11 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200"
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
                    className="h-4 w-4 rounded border-white/20 bg-[#121422] text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                  />
                  <span className="text-slate-300 font-medium">{t.rememberMe}</span>
                </label>

                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                >
                  {t.forgotPassword}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loginLoading || lockoutSeconds > 0 || isSuspended}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:opacity-95 hover:shadow-purple-600/40 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t.signingIn}</span>
                  </>
                ) : lockoutSeconds > 0 ? (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>Terkunci ({formatLockoutTimer(lockoutSeconds)})</span>
                  </>
                ) : isSuspended ? (
                  <>
                    <ShieldAlert className="h-4 w-4" />
                    <span>{t.suspendedTitle}</span>
                  </>
                ) : (
                  <span>{t.signIn}</span>
                )}
              </button>

              {/* Separator */}
              <div className="relative my-5 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative bg-[#0c0d16] px-3.5 text-xs font-medium text-slate-400">
                  {t.orContinueWith}
                </div>
              </div>

              {/* SSO Buttons Stack */}
              <div className="space-y-2.5">
                {/* Lark SSO */}
                <button
                  type="button"
                  onClick={handleLarkLogin}
                  disabled={larkLoginLoading || lockoutSeconds > 0}
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#121422] text-xs sm:text-sm font-medium text-slate-200 transition-colors hover:bg-white/5 disabled:opacity-50 flex items-center justify-center gap-2.5 shadow-sm"
                >
                  {larkLoginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LarkIcon className="h-4 w-4" />}
                  <span>{larkLoginLoading ? "Mengarahkan ke Lark..." : t.larkLogin}</span>
                </button>

                {/* Google SSO */}
                <button
                  type="button"
                  onClick={() => {
                    setSsoProvider("google");
                    setShowSsoModal(true);
                  }}
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#121422] text-xs sm:text-sm font-medium text-slate-200 transition-colors hover:bg-white/5 flex items-center justify-center gap-2.5 shadow-sm"
                >
                  <GoogleIcon className="h-4 w-4" />
                  <span>{t.googleLogin}</span>
                </button>

                {/* Microsoft SSO */}
                <button
                  type="button"
                  onClick={() => {
                    setSsoProvider("microsoft");
                    setShowSsoModal(true);
                  }}
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#121422] text-xs sm:text-sm font-medium text-slate-200 transition-colors hover:bg-white/5 flex items-center justify-center gap-2.5 shadow-sm"
                >
                  <MicrosoftIcon className="h-4 w-4" />
                  <span>{t.microsoftLogin}</span>
                </button>
              </div>
            </form>
          )}

          {/* ── MODE: 2FA ── */}
          {mode === "2fa" && (
            <form onSubmit={handle2faVerify} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">
                  {lang === "id" ? "Kode Autentikasi 6-Digit" : "6-Digit Authentication Code"}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  required
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="h-12 w-full text-center tracking-[0.5em] font-mono text-xl font-bold rounded-xl border border-white/10 bg-[#121422] text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="flex-1 h-11 rounded-xl border border-white/10 bg-transparent text-xs font-medium text-slate-300 hover:bg-white/5"
                >
                  {lang === "id" ? "Kembali" : "Back"}
                </button>
                <button
                  type="submit"
                  disabled={loginLoading || twoFactorCode.length !== 6}
                  className="flex-1 h-11 rounded-xl bg-purple-600 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
                >
                  {loginLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (lang === "id" ? "Verifikasi" : "Verify")}
                </button>
              </div>
            </form>
          )}

          {/* Access Note Footer */}
          <div className="flex items-start gap-2 pt-2 text-[11px] text-slate-400 leading-relaxed border-t border-white/5">
            <Info className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
            <p>
              {t.noAccount}{" "}
              <button
                type="button"
                onClick={() => setShowAdminContactModal(true)}
                className="text-purple-400 font-semibold hover:underline"
              >
                {t.contactAdmin}
              </button>{" "}
              {t.accessSuffix}
            </p>
          </div>

          {/* Register New Workspace with Lark Link */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setShowOneClickModal(true)}
              className="text-xs text-slate-500 hover:text-purple-400 font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="h-3 w-3 text-purple-400" />
              <span>{t.registerLark}</span>
            </button>
          </div>
        </div>

        {/* Mobile Copyright Footer */}
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
            <div className="rounded-xl border border-border bg-secondary/50 p-3.5 space-y-2">
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
