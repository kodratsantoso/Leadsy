# Lusha Contact Enrichment Flow

> Last updated: 2026-05-28  
> Source reference: Lusha API V3 official documentation at `https://docs.lusha.com/apis/openapi`.

## Objective

Leadsy uses AI Search first to discover likely LinkedIn PIC contacts from the lead company name. Lusha is then used from an existing Contact record, after the user has chosen or manually created the LinkedIn-backed contact that should be enriched.

## User Journey

1. User opens a Lead Detail page and goes to **Contacts**.
2. User clicks **Add Contact** and chooses **Manual Add** or **Search by AI**.
3. **Search by AI** uses the Settings → AI Default feature route `lead_contact_ai_search`.
4. AI Search returns LinkedIn PIC candidates with name, job title, LinkedIn URL/public ID, confidence, and relevance evidence.
5. Candidates are stored as `AI_LINKEDIN` rows in `contact_enrichment_candidates`; they are not inserted into `lead_contacts` yet.
6. User clicks **Add to Contact** on a selected candidate.
7. Leadsy creates or updates the current lead's `lead_contacts` record and stores the AI raw payload in `lead_contact_payloads`.
8. The Contact UI shows a **Lusha** action per LinkedIn-backed contact.
9. Leadsy requires an initial lead score of **60+** before enabling Lusha.
10. User clicks **Lusha** on a contact, previews Lusha candidates, and confirms **Reveal Phone**.
11. Leadsy calls Lusha V3 contact enrich with `reveal: ["phones"]`.
12. Revealed email/phone data is merged into the selected lead contact flow and the raw reveal payload is stored for auditability.

## API Alignment

- Authentication uses the official `api_key` request header.
- Preview uses `POST https://api.lusha.com/v3/contacts/search`.
- Phone reveal uses `POST https://api.lusha.com/v3/contacts/enrich`.
- Account/rate-limit metadata is read from the V3 response body and rate-limit headers where available.

## Cost Boundary

Lusha V3 search can still be billable through its `api_search` model. Leadsy therefore labels the first step as "preview" rather than "free." Phone reveal is the explicit paid/confirmation step for the user workflow.

## Guardrails

- AI Search candidates are not inserted into `lead_contacts` until the user clicks **Add to Contact**.
- AI Search must not create email or phone values; those remain hidden until enrichment.
- No Lusha preview or reveal when score is below 60.
- Lusha is exposed from Contact UI, not as a generic lead-level Add Contact path.
- Lusha preview candidates are not inserted into `lead_contacts`.
- Automatic background contact enrichment does not call Lusha reveal.
- Phone reveal refuses expired candidates and candidates without revealable phone data.
- Revealed contacts are attached only to the current lead and retain raw provider payloads.
