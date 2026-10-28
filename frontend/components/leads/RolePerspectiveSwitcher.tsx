'use client';

import * as React from 'react';
import {
  Briefcase,
  Layers,
  Wrench,
  FolderKanban,
  Receipt,
  HeartHandshake,
  Check,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export type DepartmentPerspective = 'all' | 'sales' | 'sa' | 'pm' | 'finance' | 'cs';

export interface RolePerspective {
  id: DepartmentPerspective;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  primaryTab: string;
  description: string;
  badgeClass: string;
}

export const ROLE_PERSPECTIVES: RolePerspective[] = [
  {
    id: 'all',
    label: 'Semua Tab (All)',
    shortLabel: 'Semua',
    icon: Layers,
    primaryTab: 'overview',
    description: 'Tampilan lengkap seluruh alur kerja operasional lead.',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  },
  {
    id: 'sales',
    label: 'Sales & Commercial',
    shortLabel: 'Sales',
    icon: Briefcase,
    primaryTab: 'overview',
    description: 'Fokus pada kualifikasi prospek, BANTC, SPIN pain points, dan follow-up.',
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  {
    id: 'sa',
    label: 'Solution Architect',
    shortLabel: 'Presales / SA',
    icon: Wrench,
    primaryTab: 'discovery',
    description: 'Fokus pada Discovery Workspace, estimasi mandays PSA, dan AI bundling margin.',
    badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  },
  {
    id: 'pm',
    label: 'Project Delivery (PM)',
    shortLabel: 'PM / Delivery',
    icon: FolderKanban,
    primaryTab: 'projects',
    description: 'Fokus pada Rencana Kerja WBS, utilisasi resource tim, dan penandatanganan BAST.',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'finance',
    label: 'Finance & Accounting',
    shortLabel: 'Finance',
    icon: Receipt,
    primaryTab: 'revenue',
    description: 'Fokus pada nilai kontrak, faktur termin penagihan (invoicing), PPN 11%, dan kas masuk.',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  {
    id: 'cs',
    label: 'Customer Success',
    shortLabel: 'Customer Success',
    icon: HeartHandshake,
    primaryTab: 'customer journey',
    description: 'Fokus pada skor kesehatan pelanggan (Health Score), onboarding, dan retensi/renewal.',
    badgeClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
  },
];

interface RolePerspectiveSwitcherProps {
  currentPerspective: DepartmentPerspective;
  onPerspectiveChange: (perspective: DepartmentPerspective, primaryTab: string) => void;
}

export function RolePerspectiveSwitcher({
  currentPerspective,
  onPerspectiveChange,
}: RolePerspectiveSwitcherProps) {
  const activeCfg = ROLE_PERSPECTIVES.find((p) => p.id === currentPerspective) || ROLE_PERSPECTIVES[0];

  return (
    <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Sudut Pandang Lintas Departemen (Cross-Department Perspective)
          </span>
        </div>

        {currentPerspective !== 'all' && (
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', activeCfg.badgeClass)}>
            Mode: {activeCfg.label}
          </span>
        )}
      </div>

      {/* Perspective Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {ROLE_PERSPECTIVES.map((p) => {
          const Icon = p.icon;
          const isActive = currentPerspective === p.id;

          return (
            <button
              key={p.id}
              onClick={() => onPerspectiveChange(p.id, p.primaryTab)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={p.description}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{p.shortLabel}</span>
              {isActive && <Check className="h-3 w-3 stroke-[3]" />}
            </button>
          );
        })}
      </div>

      {currentPerspective !== 'all' && (
        <p className="text-[11px] text-muted-foreground italic pl-1 border-l-2 border-primary/50">
          {activeCfg.description} (Membuka tab: <strong className="text-foreground capitalize">{activeCfg.primaryTab}</strong>)
        </p>
      )}
    </div>
  );
}
