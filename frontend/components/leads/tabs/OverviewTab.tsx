'use client';

import React from 'react';
import Link from 'next/link';
import {
  Building2,
  Pencil,
  ExternalLink,
  User,
  Star,
  Plus,
  DollarSign,
  Target,
  ShieldCheck,
  Activity,
  CornerDownRight,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SalesCadenceStatusCard } from '@/components/leads/SalesCadenceStatusCard';
import { NextBestActionPanel } from '@/components/leads/NextBestActionPanel';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';

export interface OverviewTabProps {
  leadId: string | number;
  leadData: any;
  contacts: any[];
  progressData: any;
  activitiesList: any[];
  formatCurrency: (amount?: number | null) => string;
  openEditCompanyInfo: () => void;
  setActiveTab: (tab: string) => void;
  setIsCadenceModalOpen: (open: boolean) => void;
  setShowAddContact: (show: boolean) => void;
  setAddContactMode: (mode: 'manual' | 'google' | 'linkedin' | 'deep') => void;
  setEnrichmentFeedback: (feedback: any) => void;
  mapsEnabled?: boolean;
  mapsApiKey?: string;
  mapCenter?: { lat: number; lng: number } | null;
  geocodeFeedback?: string | null;
}

export function OverviewTab({
  leadId,
  leadData,
  contacts,
  progressData,
  activitiesList,
  formatCurrency,
  openEditCompanyInfo,
  setActiveTab,
  setIsCadenceModalOpen,
  setShowAddContact,
  setAddContactMode,
  setEnrichmentFeedback,
  mapsEnabled,
  mapsApiKey,
  mapCenter,
  geocodeFeedback,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Sales Cadence Multi-Touch Status Card */}
      <SalesCadenceStatusCard
        leadId={Number(leadId)}
        leadName={leadData?.company_name || 'Lead'}
        onOpenEnrollModal={() => setIsCadenceModalOpen(true)}
      />

      {/* AI Next Best Action Recommendations Engine */}
      <NextBestActionPanel
        leadId={leadId}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onOpenModal={(modal) => {
          if (modal === 'cadence') setIsCadenceModalOpen(true);
        }}
      />

      {/* Row 1: Company Profile + Key Contacts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Profile */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[var(--brand)]" />
              <h3 className="font-semibold">Company Profile</h3>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={openEditCompanyInfo} title="Edit lead information">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">Industry:</span> <span className="font-medium">{leadData.industry?.name || '—'}</span></div>
            {leadData.subIndustry?.name && (
              <div><span className="text-muted-foreground">Sub-Industry:</span> <span className="font-medium">{leadData.subIndustry.name}</span></div>
            )}
            {leadData.businessCategory && (
              <div><span className="text-muted-foreground">Business Category:</span> <span className="font-medium">{leadData.businessCategory.name}</span></div>
            )}
            <div><span className="text-muted-foreground">Company Size:</span> <span className="font-medium">{leadData.company_size_estimate || '—'}</span></div>
            <div><span className="text-muted-foreground">Company Email:</span> <span className="font-medium">{leadData.email || '—'}</span></div>
            <div><span className="text-muted-foreground">Company Phone:</span> <span className="font-medium">{leadData.phone || '—'}</span></div>
            <div>
              <span className="text-muted-foreground">Website:</span>{' '}
              {leadData.website ? (
                <a href={leadData.website} target="_blank" rel="noreferrer" className="text-[var(--brand)] hover:underline inline-flex items-center gap-1">
                  {leadData.website} <ExternalLink className="h-3 w-3 inline" />
                </a>
              ) : '—'}
            </div>
            <div><span className="text-muted-foreground">Initial Product:</span> <span className="font-medium">{leadData.product?.name || '—'}</span></div>
            {leadData.address && (
              <div><span className="text-muted-foreground">Address:</span> <span className="font-medium">{leadData.address}</span></div>
            )}
          </div>
        </div>

        {/* Key Contacts */}
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[var(--brand)]" />
                <h3 className="font-semibold">Key Contacts</h3>
              </div>
              <button
                onClick={() => setActiveTab('contacts')}
                className="text-xs text-[var(--brand)] hover:underline"
              >
                Manage all ({contacts.length}) →
              </button>
            </div>
            {contacts.length > 0 ? (
              <div className="space-y-3">
                {contacts.slice(0, 3).map((c: any) => (
                  <div key={c.id} className="flex items-start gap-3 rounded-lg bg-muted/20 p-3 text-sm">
                    <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium truncate">{c.name}</p>
                        {c.is_primary && <Star className="h-3 w-3 fill-[var(--status-warning)] text-[var(--status-warning)] shrink-0" />}
                      </div>
                      {c.title && <p className="text-xs text-muted-foreground truncate">{c.title}</p>}
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {c.email && <span>{c.email}</span>}
                        {c.phone && <span>{c.phone}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {contacts.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">+{contacts.length - 3} more contacts recorded</p>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <p className="mb-3">No contacts recorded yet</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddContactMode('manual');
                    setEnrichmentFeedback(null);
                    setShowAddContact(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Contact
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Commercial & Deal Summary + Presales Solution Readiness */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Commercial & Deal Pipeline */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[var(--status-success)]" />
              <h3 className="font-semibold">Commercial & Deal Pipeline</h3>
            </div>
            <button
              onClick={() => setActiveTab('orders')}
              className="text-xs text-[var(--brand)] hover:underline"
            >
              Orders & SOW →
            </button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Est. Closing Value:</span>
              <span className="font-semibold text-foreground">
                {leadData.estimated_closing_amount != null
                  ? formatCurrency(Number(leadData.estimated_closing_amount))
                  : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Realized Revenue:</span>
              <span className="font-semibold text-[var(--status-success)]">
                {leadData.realized_closing_amount != null && Number(leadData.realized_closing_amount) > 0
                  ? formatCurrency(Number(leadData.realized_closing_amount))
                  : 'Rp 0'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Target Close Date:</span>
              <span className="font-medium">
                {leadData.target_closing_date
                  ? new Date(leadData.target_closing_date).toLocaleDateString()
                  : 'Not set'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Lead Age:</span>
              <span className="font-medium">
                {leadData.created_at
                  ? `${Math.floor((new Date().getTime() - new Date(leadData.created_at).getTime()) / (1000 * 60 * 60 * 24))} days active (since ${new Date(leadData.created_at).toLocaleDateString()})`
                  : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Lead Channel:</span>
              <span className="font-medium capitalize">
                {leadData.sources?.[0]?.channel_type?.name || leadData.sources?.[0]?.source_type?.replace(/_/g, ' ') || 'Direct'}
              </span>
            </div>
          </div>
        </div>

        {/* Presales & Solution Readiness */}
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-[var(--brand)]" />
                <h3 className="font-semibold">Presales & Solution Readiness</h3>
              </div>
              <button
                onClick={() => setActiveTab('discovery')}
                className="text-xs text-[var(--brand)] hover:underline"
              >
                Discovery Workspace →
              </button>
            </div>
            
            {leadData.discoveryRecord ? (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Discovery Completeness</span>
                    <span className="text-sm font-bold text-foreground">
                      {leadData.discoveryRecord.completeness_score}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        leadData.discoveryRecord.completeness_score >= 80
                          ? 'bg-[var(--status-success)]'
                          : leadData.discoveryRecord.completeness_score >= 50
                          ? 'bg-[var(--status-warning)]'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, leadData.discoveryRecord.completeness_score))}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Technical Readiness:</span>
                  <Badge variant={leadData.discoveryRecord.is_ready_for_solution_design ? 'success' : 'outline'}>
                    {leadData.discoveryRecord.is_ready_for_solution_design
                      ? 'Ready for Solution Design'
                      : 'Incomplete Requirements'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="rounded-lg bg-muted/30 p-2">
                    <span className="block text-xs text-muted-foreground">Facts</span>
                    <span className="font-bold text-[var(--status-success)]">
                      {leadData.discoveryRecord.provenance_counts?.fact ?? 0}
                    </span>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2">
                    <span className="block text-xs text-muted-foreground">Assumptions</span>
                    <span className="font-bold text-[var(--status-warning)]">
                      {leadData.discoveryRecord.provenance_counts?.assumption ?? 0}
                    </span>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2">
                    <span className="block text-xs text-muted-foreground">AI Extracted</span>
                    <span className="font-bold text-[var(--status-info)]">
                      {leadData.discoveryRecord.provenance_counts?.ai_extracted ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground space-y-3">
                <p>Discovery belum dimulai untuk lead ini.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab('discovery')}
                >
                  Buka Discovery Workspace
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Account Team & Recent Engagement */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Account & Delivery Team */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--brand)]" />
              <h3 className="font-semibold">Account & Delivery Team</h3>
            </div>
            <button
              onClick={() => setActiveTab('team')}
              className="text-xs text-[var(--brand)] hover:underline"
            >
              Team & Split →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/20 p-3 border border-border/40">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sales Owner</span>
              <span className="font-medium text-foreground">{leadData.owner?.name || 'Unassigned'}</span>
            </div>
            <div className="rounded-lg bg-muted/20 p-3 border border-border/40">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Presales Architect</span>
              <span className="font-medium text-foreground">{leadData.presales_owner?.name || leadData.presalesOwner?.name || 'Unassigned'}</span>
            </div>
            <div className="rounded-lg bg-muted/20 p-3 border border-border/40">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Account Manager</span>
              <span className="font-medium text-foreground">{leadData.am_owner?.name || leadData.amOwner?.name || 'Unassigned'}</span>
            </div>
            <div className="rounded-lg bg-muted/20 p-3 border border-border/40">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Customer Success</span>
              <span className="font-medium text-foreground">{leadData.csm_owner?.name || leadData.csmOwner?.name || 'Unassigned'}</span>
            </div>
          </div>
        </div>

        {/* Recent Engagement & Next Action */}
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[var(--status-info)]" />
                <h3 className="font-semibold">Recent Engagement & Follow-Up</h3>
              </div>
              <button
                onClick={() => setActiveTab('activities')}
                className="text-xs text-[var(--brand)] hover:underline"
              >
                History ({progressData.total_activities ?? 0}) →
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {/* Latest Activity */}
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Latest Activity</span>
                {activitiesList.length > 0 ? (
                  <div className="rounded-lg bg-muted/20 p-3 border border-border/40">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-[11px] font-medium">
                        {activitiesList[0].activity_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {activitiesList[0].activity_date
                          ? new Date(activitiesList[0].activity_date).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                    <p className="text-xs text-foreground line-clamp-2">
                      {activitiesList[0].description || 'No description recorded'}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Belum ada aktivitas yang dicatat.</p>
                )}
              </div>

              {/* Next Scheduled Follow-up */}
              <div className="pt-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Next Follow-Up</span>
                <div className={`rounded-lg p-3 border ${
                  progressData.next_follow_up?.is_overdue
                    ? 'border-[var(--status-danger)]/40 bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)]'
                    : 'border-border/40 bg-muted/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">
                      {progressData.next_follow_up?.due_date
                        ? new Date(progressData.next_follow_up.due_date).toLocaleDateString()
                        : 'No scheduled follow-up'}
                    </span>
                    {progressData.next_follow_up?.is_overdue && (
                      <Badge variant="danger" className="text-[10px] uppercase font-bold">Overdue</Badge>
                    )}
                  </div>
                  {progressData.next_follow_up?.purpose && (
                    <p className="mt-1 text-xs text-muted-foreground truncate" title={progressData.next_follow_up.purpose}>
                      {progressData.next_follow_up.purpose}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Corporate Hierarchy + Location */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Group Company */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[var(--brand)]" />
              <h3 className="font-semibold">Group Company</h3>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={openEditCompanyInfo} title="Edit lead information">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-4 text-sm">
            {/* Parent company */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Parent Company</p>
              {leadData.parent_lead ? (
                <Link
                  href={`/leads/${leadData.parent_lead.id}`}
                  className="flex items-center gap-2 rounded-lg border border-[var(--brand)]/30 bg-[color-mix(in_oklch,var(--brand)_6%,transparent)] px-3 py-2 transition-colors hover:bg-[color-mix(in_oklch,var(--brand)_10%,transparent)]"
                >
                  <Building2 className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <span className="font-medium text-[var(--brand)]">{leadData.parent_lead.company_name}</span>
                  <ExternalLink className="ml-auto h-3 w-3 text-[var(--brand)]/60" />
                </Link>
              ) : (
                <p className="text-muted-foreground">— Standalone company —</p>
              )}
            </div>

            {/* Subsidiaries */}
            {leadData.subsidiaries && leadData.subsidiaries.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Subsidiaries ({leadData.subsidiaries.length})
                </p>
                <div className="space-y-1.5">
                  {leadData.subsidiaries.map((sub: any) => (
                    <Link
                      key={sub.id}
                      href={`/leads/${sub.id}`}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-[var(--brand)]/30 hover:bg-muted/30"
                    >
                      <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1 font-medium">{sub.company_name}</span>
                      {sub.qualification_status && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          sub.qualification_status === 'eligible' ? 'bg-[color-mix(in_oklch,var(--status-success)_15%,transparent)] text-[var(--status-success)]' :
                          sub.qualification_status === 'potential' ? 'bg-[color-mix(in_oklch,var(--status-warning)_15%,transparent)] text-[var(--status-warning)]' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {sub.qualification_status.replace(/_/g, ' ')}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {!leadData.parent_lead && (!leadData.subsidiaries || leadData.subsidiaries.length === 0) && (
              <p className="text-xs text-muted-foreground">
                No group company relationship set. Use the edit button to link this lead to a parent company.
              </p>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[var(--brand)]" />
              <h3 className="font-semibold">Location</h3>
            </div>
            {leadData.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  leadData.lat && leadData.lng
                    ? `${leadData.lat},${leadData.lng}`
                    : leadData.address
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-[var(--brand)] hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Open Maps
              </a>
            )}
          </div>
          {leadData.address ? (
            <div>
              <p className="mb-3 flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                {leadData.address}
              </p>
              {mapsEnabled && mapsApiKey ? (
                <div className="h-[240px] overflow-hidden rounded-xl border border-border bg-[color:var(--surface-subtle)] relative">
                  {mapCenter ? (
                    <APIProvider apiKey={mapsApiKey}>
                      <Map
                        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"}
                        center={mapCenter}
                        defaultCenter={mapCenter}
                        defaultZoom={15}
                        gestureHandling="cooperative"
                        disableDefaultUI={true}
                      >
                        <AdvancedMarker position={mapCenter}>
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-[color:var(--brand)] text-white shadow-lg">
                            <MapPin className="h-4 w-4" />
                          </div>
                        </AdvancedMarker>
                      </Map>
                    </APIProvider>
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                      {geocodeFeedback || "Loading map..."}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-[180px] items-center justify-center rounded-xl border border-border bg-[color:var(--surface-subtle)] p-6 text-center text-sm text-muted-foreground">
                  Maps preview is unavailable. Click Open Maps to view location externally.
                </div>
              )}
              {(leadData.lat != null || leadData.lng != null || mapCenter != null) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Coordinates: {leadData.lat != null ? leadData.lat : mapCenter?.lat.toFixed(6)}, {leadData.lng != null ? leadData.lng : mapCenter?.lng.toFixed(6)}
                </p>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <p className="mb-2">No physical address recorded</p>
              <Button variant="outline" size="sm" onClick={openEditCompanyInfo}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Address
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
