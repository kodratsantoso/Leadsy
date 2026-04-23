"use client";

import { AppShell } from "@/components/layout/app-shell";
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token && pathname !== "/login") {
      router.push("/login");
    }
  }, [mounted, token, pathname, router]);

  useEffect(() => {
    if (!mounted || !token || pathname === "/login") return;
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
  }, [mounted, token, pathname, user?.role?.permissions?.length, setAuth]);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />; // Stop hydration mismatch visually
  }

  // Bypass the app shell for the login route
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Prevent flashing secured content
  if (!token) {
    return <div className="min-h-screen bg-background" />; 
  }

  if (user && !canAccessPath(pathname, user)) {
    router.push("/");
    return <div className="min-h-screen bg-background" />;
  }

  return <AppShell>{children}</AppShell>;
}
