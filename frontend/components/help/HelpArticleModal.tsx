"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { HelpArticle } from "./helpData";
import { CheckCircle2, Circle, Clock, BookOpen, HelpCircle, Share2, Sparkles, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface HelpArticleModalProps {
  article: HelpArticle | null;
  isOpen: boolean;
  onClose: () => void;
  isCompleted: boolean;
  onToggleComplete: (id: string) => void;
}

export function HelpArticleModal({
  article,
  isOpen,
  onClose,
  isCompleted,
  onToggleComplete,
}: HelpArticleModalProps) {
  const [copied, setCopied] = useState(false);

  if (!article) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.origin + "/help?article=" + article.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const footer = (
    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
      <button
        onClick={() => onToggleComplete(article.id)}
        className={cn(
          "flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 border",
          isCompleted
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
            : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <Circle className="w-4 h-4" />
        )}
        {isCompleted ? "Sudah Dipelajari (Selesai)" : "Tandai Sudah Selesai"}
      </button>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
          {copied ? "Tersalin!" : "Bagikan Tautan"}
        </Button>
        <Button onClick={onClose} size="sm">
          Tutup
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open: boolean) => !open && onClose()}
      title={article.title}
      description={article.summary}
      size="xl"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Meta badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
            {article.role}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {article.readTime}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">
            {article.difficulty}
          </span>
        </div>

        {/* Overview Callout */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="w-4 h-4 text-primary" />
            Ikhtisar Modul Pembelajaran
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {article.content.overview}
          </p>
        </div>

        {/* Key Points */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Poin Kunci & Manfaat
          </h4>
          <div className="grid gap-2">
            {article.content.keyPoints.map((point, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Langkah-Langkah Penggunaan (Step-by-Step)
          </h4>
          <div className="space-y-3">
            {article.content.steps.map((step, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/30 transition-colors space-y-2"
              >
                <div className="font-semibold text-sm text-foreground">
                  {step.title}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
                {step.tip && (
                  <div className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-medium">
                    💡 <strong>Tips:</strong> {step.tip}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* FAQs if present */}
        {article.content.faqs && article.content.faqs.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              Pertanyaan yang Sering Diajukan (FAQ)
            </h4>
            <div className="space-y-2">
              {article.content.faqs.map((faq, idx) => (
                <div key={idx} className="p-3.5 rounded-lg bg-muted/30 border border-border/60 text-xs sm:text-sm">
                  <div className="font-semibold text-foreground mb-1">Q: {faq.q}</div>
                  <div className="text-muted-foreground leading-relaxed">A: {faq.a}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
