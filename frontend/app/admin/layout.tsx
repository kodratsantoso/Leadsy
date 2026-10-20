"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Check if user is logged in
    const token = typeof window !== "undefined" ? localStorage.getItem("leadsy_token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }

    // Check if user has superadmin role
    if (user && user.role?.name !== "super_admin") {
      router.replace("/dashboard");
    }
  }, [mounted, user, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (user && user.role?.name !== "super_admin") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-destructive/10 text-destructive mb-4">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The SaaS Platform Administrator Panel is exclusively accessible to platform superadmins. You are being redirected to your workspace dashboard.
        </p>
        <Link href="/dashboard" className="mt-6">
          <Button variant="default" size="sm" className="rounded-xl">
            Return to Customer Workspace
          </Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
