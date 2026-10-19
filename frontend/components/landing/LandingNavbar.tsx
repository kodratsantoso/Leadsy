"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTheme } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, X, Sparkles, ShieldCheck, Layers, Cpu, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolved } = useTheme();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const logoSrc = resolved === "dark" ? "/Leadsy_logo_dark.png" : "/Leadsy_logo_light.png";

  const navLinks = [
    { label: "Fitur Unggulan", href: "#features" },
    { label: "AI Pipeline", href: "#pipeline" },
    { label: "Solusi B2B", href: "#capabilities" },
    { label: "Perbandingan", href: "#comparison" },
    { label: "Keamanan Enterprise", href: "#security" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/60 shadow-sm shadow-primary/5 py-3"
          : "bg-transparent py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative h-9 w-28 sm:w-32 flex items-center">
              <Image
                src={logoSrc}
                alt="Leadsy Platform"
                width={140}
                height={40}
                className="h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                priority
              />
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3 h-3 text-primary animate-pulse" />
              Enterprise AI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 bg-muted/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/50">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs lg:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 px-3 py-1.5 rounded-full transition-all duration-150"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            {token ? (
              <Link href="/dashboard">
                <Button size="sm" className="gap-2 shadow-sm shadow-primary/25 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                  Buka Dashboard
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-xs sm:text-sm font-medium hover:bg-muted/80">
                    Masuk
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="sm" className="gap-1.5 shadow-sm shadow-primary/25 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs sm:text-sm">
                    Mulai Sekarang
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex sm:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="sm:hidden border-b border-border/80 bg-background/95 backdrop-blur-2xl px-5 pt-3 pb-6 animate-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col gap-2 mb-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            {token ? (
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button className="w-full gap-2 justify-center">
                  Buka Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full justify-center">
                    Masuk
                  </Button>
                </Link>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full justify-center gap-2">
                    Mulai Sekarang
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
