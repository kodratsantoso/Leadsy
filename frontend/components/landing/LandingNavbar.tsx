"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTheme } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, X, Sparkles, ShieldCheck, Layers, Cpu, MapPin, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("#features");
  const { resolved } = useTheme();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const navLinks = [
    { label: "Fitur Unggulan", href: "#features" },
    { label: "AI Pipeline", href: "#pipeline" },
    { label: "Tampilan Layar", href: "#screens" },
    { label: "Keamanan Enterprise", href: "#security" },
    { label: "Pusat Bantuan & LMS", href: "/help" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Scroll Spy to detect current section
      const scrollPos = window.scrollY + 120;
      for (let i = navLinks.length - 1; i >= 0; i--) {
        const link = navLinks[i];
        if (link.href.startsWith("#")) {
          const el = document.querySelector(link.href);
          if (el) {
            const top = (el as HTMLElement).offsetTop;
            if (scrollPos >= top) {
              setActiveSection(link.href);
              break;
            }
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [navLinks]);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const navHeight = 80;
        const targetPos = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
        window.scrollTo({
          top: targetPos,
          behavior: "smooth",
        });
        setActiveSection(href);
        setMobileOpen(false);
      }
    }
  };

  const logoSrc = resolved === "dark" ? "/Leadsy_logo_dark.png" : "/Leadsy_logo_light.png";

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

          {/* Desktop Navigation with Smooth Scroll Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-muted/40 backdrop-blur-md p-1.5 rounded-full border border-border/60 shadow-xs relative">
            {navLinks.map((link) => {
              const isActive = activeSection === link.href;
              const isDirectLink = !link.href.startsWith("#");

              if (isDirectLink) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-xs lg:text-sm font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-background/60 flex items-center gap-1 active:scale-[0.98]"
                  >
                    <span>{link.label}</span>
                  </Link>
                );
              }

              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleSmoothScroll(e, link.href)}
                  className={cn(
                    "text-xs lg:text-sm font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 relative active:scale-[0.98]",
                    isActive
                      ? "bg-background text-primary font-semibold shadow-xs shadow-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3">
            <Link href="/help">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full px-3.5 h-8 gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-[0.98]"
              >
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span>Pusat Bantuan</span>
              </Button>
            </Link>

            <ThemeToggle />

            {token ? (
              <Link href="/dashboard">
                <Button
                  size="sm"
                  className="rounded-full px-4 h-8 gap-1.5 shadow-sm shadow-primary/25 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm transition-all active:scale-[0.98]"
                >
                  Buka Dashboard
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full px-3.5 h-8 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-[0.98]"
                  >
                    Masuk
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="sm"
                    className="rounded-full px-4 h-8 gap-1.5 shadow-sm shadow-primary/25 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm transition-all active:scale-[0.98]"
                  >
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
            {navLinks.map((link) => {
              const isActive = activeSection === link.href;
              const isDirectLink = !link.href.startsWith("#");

              if (isDirectLink) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-sm font-medium py-2 px-3 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-between"
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-primary" />
                  </Link>
                );
              }

              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleSmoothScroll(e, link.href)}
                  className={cn(
                    "text-sm font-medium py-2 px-3 rounded-md transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
          <div className="pt-3 border-t border-border/80 flex flex-col gap-2.5">
            {token ? (
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button className="w-full h-10 rounded-xl gap-2 justify-center shadow-sm shadow-primary/25 bg-primary text-primary-foreground font-semibold active:scale-[0.98]">
                  Buka Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full h-10 rounded-xl justify-center font-medium border-border/80 hover:bg-muted/80 active:scale-[0.98]">
                    Masuk
                  </Button>
                </Link>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full h-10 rounded-xl justify-center gap-2 shadow-sm shadow-primary/25 bg-primary text-primary-foreground font-semibold active:scale-[0.98]">
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
