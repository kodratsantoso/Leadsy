'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ProgressiveFluxLoader } from '@/components/ui/progressive-flux-loader';
import {
  ExternalLink,
  Mail,
  Pencil,
  Phone,
  Plus,
  Star,
  Trash2,
  User,
  Zap,
} from 'lucide-react';

const SOURCE_STYLES: Record<string, string> = {
  LUSHA: 'bg-[color-mix(in_oklch,var(--brand)_15%,transparent)] text-[var(--brand)] border-[var(--brand)]/30',
  GOOGLE_SEARCH: 'bg-[color-mix(in_oklch,var(--status-info)_15%,transparent)] text-[var(--status-info)] border-[var(--status-info)]/30',
  LINKEDIN: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  manual: 'bg-[color-mix(in_oklch,var(--status-success)_15%,transparent)] text-[var(--status-success)] border-[var(--status-success)]/30',
  website: 'bg-[color-mix(in_oklch,var(--status-info)_15%,transparent)] text-[var(--status-info)] border-[var(--status-info)]/30',
  other: 'bg-muted text-muted-foreground border-border',
};

function SourceBadge({ source }: { source?: string | null }) {
  const label = source === 'GOOGLE_SEARCH' ? 'GOOGLE' : source?.toUpperCase() ?? 'OTHER';
  const style = SOURCE_STYLES[source ?? 'other'] ?? SOURCE_STYLES.other;
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${style}`}>
      {label}
    </span>
  );
}

function ConfidenceDot({ score }: { score?: number | null }) {
  const pct = score ?? 0;
  const color =
    pct >= 80
      ? 'bg-[var(--status-success)]'
      : pct >= 50
        ? 'bg-[var(--status-warning)]'
        : 'bg-[var(--status-danger)]';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16">
        <ProgressiveFluxLoader
          layout="feature"
          value={pct}
          showLabel={false}
          barClassName="h-1.5"
          gradient={`var(${color.replace('bg-[var(', '--').replace(')]', ')')})`}
        />
      </div>
      <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

interface ContactsTabProps {
  contacts: any[];
  lushaEligible: boolean;
  lushaContactOptions: any[];
  onAddContact: () => void;
  onOpenLusha: () => void;
  onSetPrimary: (id: number) => void;
  isSetPrimaryPending?: boolean;
  onEditContact: (contact: any) => void;
  onDeleteContact: (id: number) => void;
}

export function ContactsTab({
  contacts,
  lushaEligible,
  lushaContactOptions,
  onAddContact,
  onOpenLusha,
  onSetPrimary,
  isSetPrimaryPending,
  onEditContact,
  onDeleteContact,
}: ContactsTabProps) {
  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onAddContact} size="sm">
          <Plus className="h-3.5 w-3.5" /> Add Contact
        </Button>
        <Button
          onClick={onOpenLusha}
          disabled={!lushaEligible || lushaContactOptions.length === 0}
          variant="outline"
          size="sm"
          tooltip={
            !lushaEligible
              ? 'Requires initial lead score of 60+'
              : lushaContactOptions.length === 0
                ? 'Add a contact with LinkedIn, email, or full name first'
                : 'Search Lusha for hidden email and phone data'
          }
        >
          <Zap className="h-3.5 w-3.5" /> Lusha
        </Button>
      </div>

      {/* Contacts list */}
      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <User className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No contacts yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add manually or use Search by Google from Add Contact to discover LinkedIn PIC candidates.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact: any) => (
            <div
              key={contact.id}
              className={`rounded-xl border bg-card p-4 shadow-sm transition-colors ${
                contact.is_primary ? 'border-[var(--status-warning)]/40' : 'border-border'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--brand)_15%,transparent)] text-[var(--brand)]">
                  <User className="h-5 w-5" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{contact.name}</p>
                    {contact.is_primary && (
                      <span className="flex items-center gap-0.5 rounded-full bg-[color-mix(in_oklch,var(--status-warning)_15%,transparent)] px-2 py-0.5 text-[10px] font-bold text-[var(--status-warning)]">
                        <Star className="h-2.5 w-2.5 fill-[var(--status-warning)]" /> Primary
                      </span>
                    )}
                    <SourceBadge source={contact.source} />
                  </div>
                  {contact.title && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{contact.title}</p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {contact.linkedin_url && (
                      <a
                        href={contact.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" /> LinkedIn
                      </a>
                    )}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="h-3 w-3" /> PIC Email: {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Phone className="h-3 w-3" /> PIC Phone: {contact.phone}
                      </a>
                    )}
                  </div>

                  <div className="mt-2">
                    <ConfidenceDot score={contact.confidence_score} />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  {!contact.is_primary && (
                    <button
                      onClick={() => onSetPrimary(contact.id)}
                      disabled={isSetPrimaryPending}
                      title="Set as primary"
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-[color-mix(in_oklch,var(--status-warning)_10%,transparent)] hover:text-[var(--status-warning)] disabled:opacity-50"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onEditContact(contact)}
                    title="Edit contact"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteContact(contact.id)}
                    title="Delete contact"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] hover:text-[var(--status-danger)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
