"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Sparkles, LayoutDashboard, Search } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

interface HelpNavbarProps {
  onSearchFocus?: () => void;
}

export function HelpNavbar({ onSearchFocus }: HelpNavbarProps) {
  const { resolved } = useTheme();
  const token = useAuthStore((state) => state.token);

  const logoSrc = resolved === "dark" ? "/Leadsy_logo_dark.png" : "/Leadsy_logo_light.png";

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Section Badge */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative h-8 w-24 sm:w-28 flex items-center">
              <Image
                src={logoSrc}
                alt="Leadsy Platform"
                width={120}
                height={35}
                className="h-7 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                priority
              />
            </div>
          </Link>
          <div className="h-4 w-px bg-border/80" />
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Pusat Bantuan & LMS</span>
          </div>
        </div>

        {/* Center / Right: Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onSearchFocus && (
            <button
              onClick={onSearchFocus}
              className="hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 hover:bg-muted/70 px-3 py-1.5 rounded-lg border border-border/60 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari panduan...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-mono">
                ⌘K
              </kbd>
            </button>
          )}

          <ThemeToggle />

          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs sm:text-sm font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Landing Page</span>
            </Button>
          </Link>

          {token ? (
            <Link href="/dashboard">
              <Button size="sm" className="gap-1.5 text-xs sm:text-sm shadow-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Buka Dashboard</span>
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="sm" className="gap-1.5 text-xs sm:text-sm shadow-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                Masuk
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
