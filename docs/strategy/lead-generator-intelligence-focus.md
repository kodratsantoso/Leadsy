# Leadsy Focus Plan: Lead Generator & Lead Intelligence

> Status: active focus  
> Last updated: 2026-05-27  
> Purpose: keep near-term development focused on Leadsy's strongest core: finding better leads, enriching them, qualifying them, and turning raw prospects into high-confidence sales opportunities.

## 1. Current Direction

Long-term CRM expansion is paused for now. The active product focus is:

1. **Lead Generator**: discover, import, classify, enrich, deduplicate, and route high-potential leads.
2. **Lead Intelligence**: score, qualify, analyze, match products, generate discovery questions, summarize conversations/transcripts, and explain next best actions.

This keeps Leadsy differentiated as a pre-CRM sales intelligence engine instead of spreading effort across broad enterprise CRM modules too early.

## 2. Product Objective

Leadsy should answer these core questions better than a generic CRM:

- Where can we find new potential customers?
- Which leads are worth pursuing first?
- Why is a lead qualified or not qualified?
- Which product should be offered?
- What questions should sales ask?
- What signals, risks, objections, and next actions are visible from activities, meetings, WhatsApp, and transcripts?
- How can the team move from raw lead data to actionable sales intelligence faster?

## 3. Active Scope

### Lead Generator

- Map-based lead discovery.
- Bulk lead import.
- Lead source and channel classification.
- Deduplication and merge/review workflow.
- Lead enrichment from website, Maps, and contact payloads.
- Geo product fit analysis.
- Lead Pool as intake/triage for unassigned generated leads.
- Better filters for generated, enriched, duplicate, high-potential, and stale leads.

### Lead Intelligence

- Lead scoring model improvements.
- Qualification engine improvements.
- BANTC question guide improvements.
- Product matching improvements.
- Transcript and meeting intelligence improvements.
- WhatsApp conversation intelligence.
- Explainable AI reasoning and risk flags.
- Next best action recommendations.
- Intelligence dashboard and drilldowns.

## 4. Near-Term Backlog

### LG-001: Lead Generator Command Center

- Create a focused view for generated leads from Maps, import, WhatsApp, Lark Base, and manual sources.
- Add filters for source, channel, enrichment status, duplicate status, product fit, score, and owner.
- Add bulk actions: assign, rescore, qualify, enrich, export, archive/review.

### LG-002: Deduplication Review & Merge

- Build a review queue for probable duplicate leads.
- Show duplicate reason: domain, name/location, email, phone.
- Allow merge, keep separate, or mark as false positive.
- Preserve audit trail.

### LG-003: Enrichment Pipeline Visibility

- Show enrichment status per lead.
- Add retry enrichment.
- Show last enrichment timestamp and source.
- Surface missing data fields.

### LG-004: Geo Product Fit Enhancements

- Improve fit explanation for map-discovered businesses.
- Add product-fit filters and sorting to generated lead review.
- Store latest fit result on lead intake for easier triage.

### LI-001: Intelligence Snapshot

- Create a normalized intelligence snapshot per lead:
  - score,
  - qualification,
  - product fit,
  - BANTC completeness,
  - latest sentiment/intent,
  - objections,
  - buying signals,
  - recommended next action.

### LI-002: Next Best Action

- Generate a concise recommendation for each lead.
- Use lead score, stage, activity history, transcript/WhatsApp signals, product match, and follow-up history.
- Store recommendation with explanation and timestamp.

### LI-003: Scoring & Qualification Explainability

- Expand score breakdown UI.
- Show hard-stop rules and soft signals.
- Separate rule-based reasons from AI augmentation.
- Make rescoring results easier to compare against previous runs.

### LI-004: Product Match Workbench

- Improve product match ranking and comparison.
- Show why a product is recommended or rejected.
- Add sales approach guidance per recommended product.

### LI-005: Meeting & Transcript Intelligence Loop

- Make meeting BANTC capture update intelligence quality.
- Use transcripts to update objections, buying signals, sentiment, and next action.
- Show intelligence changes after each activity.

## 5. Deferred For Now

The following roadmap items are intentionally paused:

- Account & Opportunity CRM.
- CPQ and quotation workflows.
- Service ticketing.
- Partner/PRM portal.
- Low-code platform.
- BI builder beyond the dashboards needed for lead intelligence.
- Broad enterprise governance expansion beyond what is required for leads/intelligence.

## 6. Execution Principle

Every near-term improvement should strengthen at least one of these loops:

1. Discover better leads.
2. Clean and enrich lead data.
3. Prioritize leads with explainable intelligence.
4. Recommend the next sales action.
5. Feed activity outcomes back into intelligence.

