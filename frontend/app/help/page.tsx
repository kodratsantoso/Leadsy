"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { HelpNavbar } from "@/components/help/HelpNavbar";
import { HelpTrackCard } from "@/components/help/HelpTrackCard";
import { HelpArticleModal } from "@/components/help/HelpArticleModal";
import { HELP_TRACKS, HELP_ARTICLES, HelpArticle } from "@/components/help/helpData";
import { Button } from "@/components/ui/button";
import {
  Search,
  Sparkles,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  HelpCircle,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
  Layers,
  Award,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_FILTERS = [
  "Semua Role",
  "Sales",
  "Solution Architect",
  "Project Manager",
  "Finance",
  "Customer Success",
  "Admin",
] as const;

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("Semua Role");
  const [selectedTrackId, setSelectedTrackId] = useState<string>("getting-started");
  const [activeArticle, setActiveArticle] = useState<HelpArticle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [completedArticleIds, setCompletedArticleIds] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load LMS progress from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("leadsy_help_completed_articles");
      if (stored) {
        setCompletedArticleIds(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save progress
  const toggleArticleCompletion = (id: string) => {
    setCompletedArticleIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("leadsy_help_completed_articles", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const resetProgress = () => {
    if (confirm("Reset seluruh progres pembelajaran LMS Anda?")) {
      setCompletedArticleIds([]);
      localStorage.removeItem("leadsy_help_completed_articles");
    }
  };

  // Filtered articles
  const filteredArticles = useMemo(() => {
    return HELP_ARTICLES.filter((article) => {
      const matchesTrack = selectedTrackId ? article.trackId === selectedTrackId : true;
      const matchesRole =
        selectedRole === "Semua Role"
          ? true
          : article.role.toLowerCase() === selectedRole.toLowerCase() || article.role === "General";
      const matchesSearch =
        searchQuery.trim() === ""
          ? true
          : article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.content.overview.toLowerCase().includes(searchQuery.toLowerCase());

      // If user is searching, ignore track restriction to show global results
      if (searchQuery.trim() !== "") {
        return matchesRole && matchesSearch;
      }
      return matchesTrack && matchesRole && matchesSearch;
    });
  }, [searchQuery, selectedRole, selectedTrackId]);

  const activeTrack = useMemo(() => {
    return HELP_TRACKS.find((t) => t.id === selectedTrackId) || HELP_TRACKS[0];
  }, [selectedTrackId]);

  const totalArticles = HELP_ARTICLES.length;
  const totalCompleted = completedArticleIds.length;
  const overallProgressPct = Math.round((totalCompleted / totalArticles) * 100);

  const openArticle = (article: HelpArticle) => {
    setActiveArticle(article);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-primary/20 selection:text-primary">
      <HelpNavbar onSearchFocus={() => searchInputRef.current?.focus()} />

      <main className="flex-1 pb-24">
        {/* Hero Banner with Search */}
        <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-primary/5 via-background to-background pt-12 pb-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              <span>LEADSY LEARNING CENTER & LMS</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
              Pusat Panduan & Akademi Operasional{" "}
              <span className="bg-gradient-to-r from-primary via-indigo-500 to-violet-600 bg-clip-text text-transparent">
                Leadsy
              </span>
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Jelajahi dokumentasi interaktif, standar alur kerja lintas departemen (Sales, Presales, PM, Finance, CS), dan panduan teknis operasional.
            </p>

            {/* Main Search Input */}
            <div className="max-w-2xl mx-auto relative pt-2">
              <div className="relative flex items-center">
                <Search className="w-5 h-5 absolute left-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik topik panduan, role, fitur (misal: BAST, SOW, PPN, AI Screening)..."
                  className="w-full h-13 pl-12 pr-4 rounded-2xl bg-card border border-border/80 shadow-md shadow-primary/5 text-sm sm:text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>

            {/* Role Filter Chips */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
              {ROLE_FILTERS.map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    "text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-200",
                    selectedRole === role
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                      : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* LMS Overall Progress Bar Card */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-lg shadow-black/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-foreground">
                    Progres Kurikulum Leadsy Anda
                  </h3>
                  {overallProgressPct === 100 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Award className="w-3 h-3" /> Certified
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalCompleted} dari {totalArticles} modul panduan telah diselesaikan ({overallProgressPct}%)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-72 shrink-0">
              <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    overallProgressPct === 100 ? "bg-emerald-500" : "bg-primary"
                  )}
                  style={{ width: `${overallProgressPct}%` }}
                />
              </div>
              <button
                onClick={resetProgress}
                title="Reset progres"
                className="text-muted-foreground hover:text-foreground p-1 text-xs"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Learning Tracks Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Pilih Jalur Pembelajaran & Departemen
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Pilih topik spesifik sesuai tanggung jawab operasional Anda di Leadsy
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HELP_TRACKS.map((track) => (
              <HelpTrackCard
                key={track.id}
                track={track}
                articles={HELP_ARTICLES}
                completedArticleIds={completedArticleIds}
                isSelected={selectedTrackId === track.id && searchQuery === ""}
                onSelect={(id) => {
                  setSelectedTrackId(id);
                  setSearchQuery("");
                }}
              />
            ))}
          </div>
        </section>

        {/* Track Detail / Articles Listing */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-6">
          <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {searchQuery ? "Hasil Pencarian Global" : activeTrack.badge}
                </span>
                <h3 className="text-xl font-bold text-foreground mt-2">
                  {searchQuery ? `Hasil untuk "${searchQuery}"` : activeTrack.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {searchQuery
                    ? `Ditemukan ${filteredArticles.length} modul yang cocok.`
                    : activeTrack.description}
                </p>
              </div>

              <div className="text-xs text-muted-foreground font-medium shrink-0">
                Menampilkan {filteredArticles.length} Modul
              </div>
            </div>

            {/* Articles Grid */}
            {filteredArticles.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <HelpCircle className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                <h4 className="font-semibold text-foreground text-sm">Tidak ada artikel yang cocok</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Coba ubah kata kunci pencarian Anda atau pilih filter role yang berbeda.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedRole("Semua Role");
                  }}
                >
                  Reset Filter
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredArticles.map((article) => {
                  const isCompleted = completedArticleIds.includes(article.id);
                  return (
                    <div
                      key={article.id}
                      onClick={() => openArticle(article)}
                      className={cn(
                        "group cursor-pointer p-5 rounded-xl border transition-all duration-200 flex flex-col justify-between",
                        isCompleted
                          ? "bg-emerald-500/[0.02] border-emerald-500/30 hover:border-emerald-500/50"
                          : "bg-background border-border/70 hover:border-primary/40 hover:shadow-sm hover:translate-y-[-1px]"
                      )}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                            {article.role}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock className="w-3 h-3" /> {article.readTime}
                            </span>
                            {isCompleted && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                          </div>
                        </div>

                        <h4 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors leading-snug">
                          {article.title}
                        </h4>

                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {article.summary}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-medium text-primary">
                        <span>Baca Panduan Lengkap</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Quick Enterprise Help & Support Footer Banner */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="p-8 rounded-3xl bg-gradient-to-r from-primary/10 via-indigo-500/5 to-violet-600/10 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary">
                <MessageSquare className="w-3 h-3" />
                Dukungan Operasional Langsung
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                Butuh Bantuan atau Training Khusus untuk Tim Anda?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                Tim Customer Success dan Solution Architect kami siap mendampingi sesi enablement untuk seluruh divisi perusahaan Anda.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a href="mailto:support@leadsy.tech">
                <Button variant="outline" className="gap-2">
                  Email Support
                </Button>
              </a>
              <a href="https://leadsy.tech/login">
                <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  Buka Platform
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Article Detail Reader Modal */}
      <HelpArticleModal
        article={activeArticle}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isCompleted={activeArticle ? completedArticleIds.includes(activeArticle.id) : false}
        onToggleComplete={(id) => toggleArticleCompletion(id)}
      />
    </div>
  );
}
