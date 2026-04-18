"use client";

import { AppShell } from "@/components/layout/app-shell";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token && pathname !== "/login") {
      router.push("/login");
    }
  }, [mounted, token, pathname, router]);

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

  return <AppShell>{children}</AppShell>;
}
