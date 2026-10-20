"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PlatformShell } from "@/components/platform-admin/PlatformShell";
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/apiFetch";
import { canAccessPath } from "@/lib/permissions";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [mounted, setMounted] = useState(false);
  const isLandingRoute = pathname === "/";
  const isPublicAuthRoute = pathname === "/login" || pathname.startsWith("/auth/");
  const isPublicRoute = isLandingRoute || isPublicAuthRoute;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token && !isPublicRoute) {
      router.push("/login");
    } else if (mounted && token && isPublicAuthRoute) {
      router.push("/dashboard");
    }
  }, [mounted, token, isPublicRoute, isPublicAuthRoute, router]);

  useEffect(() => {
    if (!mounted || !token || isPublicAuthRoute) return;
    if (user?.role?.permissions?.length) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await apiFetch("/auth/me");
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled && payload?.data) {
          setAuth(token, payload.data);
        }
      } catch {
        // Silent; route middleware on the backend remains the source of truth.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, token, isPublicAuthRoute, user?.role?.permissions?.length, setAuth]);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />; // Stop hydration mismatch visually
  }

  // Bypass the app shell for public routes (landing page & login/auth)
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Prevent flashing secured content
  if (!token) {
    return <div className="min-h-screen bg-background" />; 
  }

  if (user && pathname !== "/dashboard" && !canAccessPath(pathname, user)) {
    router.push("/dashboard");
    return <div className="min-h-screen bg-background" />;
  }

  // Dedicated SaaS Platform Control Plane Shell
  if (pathname.startsWith("/admin")) {
    return <PlatformShell>{children}</PlatformShell>;
  }

  return (
    <AppShell>
      <ImpersonationBanner />
      {children}
    </AppShell>
  );
}
