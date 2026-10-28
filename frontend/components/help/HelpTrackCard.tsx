"use client";

import { HelpTrack, HelpArticle } from "./helpData";
import {
  Rocket,
  Compass,
  Cpu,
  Kanban,
  Receipt,
  HeartPulse,
  ShieldCheck,
  ChevronRight,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpTrackCardProps {
  track: HelpTrack;
  articles: HelpArticle[];
  completedArticleIds: string[];
  isSelected: boolean;
  onSelect: (trackId: string) => void;
}

export function HelpTrackCard({
  track,
  articles,
  completedArticleIds,
  isSelected,
  onSelect,
}: HelpTrackCardProps) {
  const trackArticles = articles.filter((a) => a.trackId === track.id);
  const completedCount = trackArticles.filter((a) => completedArticleIds.includes(a.id)).length;
  const progressPct = trackArticles.length > 0 ? Math.round((completedCount / trackArticles.length) * 100) : 0;

  const getIcon = () => {
    switch (track.iconName) {
      case "Rocket":
        return <Rocket className="w-5 h-5 text-blue-500" />;
      case "Compass":
        return <Compass className="w-5 h-5 text-emerald-500" />;
      case "Cpu":
        return <Cpu className="w-5 h-5 text-indigo-500" />;
      case "Kanban":
        return <Kanban className="w-5 h-5 text-amber-500" />;
      case "Receipt":
        return <Receipt className="w-5 h-5 text-purple-500" />;
      case "HeartPulse":
        return <HeartPulse className="w-5 h-5 text-rose-500" />;
      case "ShieldCheck":
        return <ShieldCheck className="w-5 h-5 text-slate-500" />;
      default:
        return <BookOpen className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div
      onClick={() => onSelect(track.id)}
      className={cn(
        "cursor-pointer text-left p-5 rounded-2xl border transition-all duration-200 relative group flex flex-col justify-between",
        isSelected
          ? "bg-primary/5 border-primary shadow-md shadow-primary/5 ring-1 ring-primary/20"
          : "bg-card border-border/70 hover:border-border hover:shadow-sm hover:translate-y-[-2px]"
      )}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="p-2.5 rounded-xl bg-muted/60 border border-border/50 group-hover:scale-105 transition-transform duration-200">
            {getIcon()}
          </div>
          <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", track.roleColor)}>
            {track.badge}
          </span>
        </div>

        {/* Title & Subtitle */}
        <h3 className="font-bold text-foreground text-base tracking-tight group-hover:text-primary transition-colors">
          {track.title}
        </h3>
        <p className="text-xs font-medium text-muted-foreground/90 mt-0.5">
          {track.subtitle}
        </p>
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
          {track.description}
        </p>
      </div>

      {/* Footer: Progress & Article Count */}
      <div className="mt-5 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
          <span>{trackArticles.length} Modul Panduan</span>
          <span className="font-semibold text-foreground">
            {progressPct === 100 ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
              </span>
            ) : (
              `${completedCount}/${trackArticles.length} Selesai`
            )}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progressPct === 100 ? "bg-emerald-500" : "bg-primary"
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
