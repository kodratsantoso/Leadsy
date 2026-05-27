# Lusha Contact Enrichment Flow

> Last updated: 2026-05-27  
> Source reference: Lusha API V3 official documentation at `https://docs.lusha.com/apis/openapi`.

## Objective

Leadsy uses Lusha only when a lead is close enough to the target profile to justify paid contact reveal. The user must explicitly confirm which PIC candidate should be revealed before phone data is persisted.

## User Journey

1. User opens a Lead Detail page.
2. User clicks **Enrich Contacts** and selects **Lusha**.
3. Leadsy requires an initial lead score of **60+** before enabling Lusha search.
4. Leadsy calls Lusha V3 contact search and stores preview candidates in `contact_enrichment_candidates`.
5. The modal displays only non-sensitive preview fields: PIC name, role/title, company, domain, availability flags, and estimated reveal credits.
6. User clicks **Reveal Phone** on a selected candidate.
7. Leadsy calls Lusha V3 contact enrich with `reveal: ["phones"]`.
8. Only after successful reveal does Leadsy create or update a `lead_contacts` record for the currently open lead.
9. The raw reveal payload is stored in `lead_contact_payloads` for auditability.

## API Alignment

- Authentication uses the official `api_key` request header.
- Preview uses `POST https://api.lusha.com/v3/contacts/search`.
- Phone reveal uses `POST https://api.lusha.com/v3/contacts/enrich`.
- Account/rate-limit metadata is read from the V3 response body and rate-limit headers where available.

## Cost Boundary

Lusha V3 search can still be billable through its `api_search` model. Leadsy therefore labels the first step as "preview" rather than "free." Phone reveal is the explicit paid/confirmation step for the user workflow.

## Guardrails

- No Lusha preview or reveal when score is below 60.
- Preview candidates are not inserted into `lead_contacts`.
- Automatic background contact enrichment does not call Lusha reveal.
- Phone reveal refuses expired candidates and candidates without revealable phone data.
- Revealed contacts are attached only to the current lead and retain raw provider payloads.
