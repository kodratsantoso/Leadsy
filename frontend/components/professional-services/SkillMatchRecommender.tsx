'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { 
  Sparkles, CheckCircle2, UserCheck, ShieldCheck, 
  Target, Zap, ArrowRight, Loader2, Award, Clock 
} from 'lucide-react';

const SKILL_OPTIONS = [
  'Enterprise Architecture',
  'Cloud Infrastructure (AWS/GCP)',
  'Kubernetes & CI/CD',
  'Core Banking Integration',
  'Cybersecurity & Compliance',
  'Data Engineering & AI',
  'ERP SAP/Oracle Integration',
  'High-Throughput API Gateway',
];

export function SkillMatchRecommender() {
  const toast = useToast();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    'Enterprise Architecture',
    'Cloud Infrastructure (AWS/GCP)',
  ]);
  const [minMandays, setMinMandays] = useState<number>(5);
  const [recommendations, setRecommendations] = useState<any[] | null>(null);

  const recommendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/professional-services/psa-dashboard/recommend-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skills: selectedSkills,
          min_mandays: minMandays,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setRecommendations(data.recommended_candidates || []);
      toast.success(
        'Rekomendasi Berhasil',
        `Ditemukan ${data.recommended_candidates?.length || 0} staf yang paling cocok dengan kriteria proyek.`
      );
    },
    onError: (err: any) => {
      toast.error('Gagal Memuat Rekomendasi', err.message || 'Terjadi kesalahan sistem.');
    },
  });

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  return (
    <div className="space-y-6">
      {/* Criteria Card */}
      <Card className="border-border">
        <CardHeader className="border-b border-border bg-muted/20 pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            AI Presales &amp; Delivery Staff Matcher (Enterprise Resource Allocation)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Pilih kebutuhan skill proyek dan sistem akan menghitung kesesuaian keahlian serta ketersediaan kapasitas konsultan.
          </p>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              KEBUTUHAN SKILL PROYEK (PILIH SATU ATAU LEBIH)
            </label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-brand text-white border-brand shadow-xs'
                        : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Target Mandays Dibutuhkan:</span>
              <input
                type="number"
                min={1}
                max={30}
                value={minMandays}
                onChange={(e) => setMinMandays(Number(e.target.value))}
                className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground text-center"
              />
              <span className="text-xs text-muted-foreground">MD</span>
            </div>

            <Button
              onClick={() => recommendMutation.mutate()}
              disabled={recommendMutation.isPending || selectedSkills.length === 0}
              className="bg-brand text-white hover:bg-brand/90 gap-1.5 shadow-sm text-xs h-9 px-4"
            >
              {recommendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 fill-current" />
              )}
              Jalankan AI Skill Match
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {recommendations && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              HASIL REKOMENDASI KANDIDAT ARSITEK &amp; KONSULTAN ({recommendations.length} KANDIDAT)
            </h3>
            <span className="text-xs text-muted-foreground">
              Skor Komposit = 60% Kecocokan Skill + 40% Ketersediaan Kapasitas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((cand, idx) => {
              const isTop = idx === 0;
              return (
                <Card
                  key={cand.user_id}
                  className={`border transition-all ${
                    isTop ? 'border-brand/50 shadow-md ring-1 ring-brand/30 bg-brand/2' : 'border-border'
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-foreground">{cand.name}</h4>
                          {isTop && (
                            <span title="Best Match" className="p-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px]">
                              <Award className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{cand.role}</p>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-extrabold text-brand tabular-nums">
                          {cand.composite_score}%
                        </div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Match Score
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 bg-muted/30 p-2.5 rounded-lg text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Skill Fit Score:</span>
                        <span className="font-semibold text-foreground">{cand.skill_match_score}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Kapasitas Tersedia:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {cand.availability_score}% ({cand.current_utilization_pct}% utilized)
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        MATCHING SKILLS
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {cand.matching_skills?.length > 0 ? (
                          cand.matching_skills.map((ms: string, mIdx: number) => (
                            <span
                              key={mIdx}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium"
                            >
                              {ms}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">General Presales Fit</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <Badge variant="outline" className={`text-[10px] ${
                        cand.recommendation === 'Highly Recommended'
                          ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                          : 'border-border text-muted-foreground'
                      }`}>
                        {cand.recommendation}
                      </Badge>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast.success(
                            'Alokasi Ditugaskan',
                            `${cand.name} telah diprioritaskan untuk penugasan proyek presales ini.`
                          );
                        }}
                        className="h-7 text-xs border-brand/30 text-brand hover:bg-brand hover:text-white"
                      >
                        Pilih Kandidat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
