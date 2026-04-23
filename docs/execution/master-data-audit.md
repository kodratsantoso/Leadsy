# Master-Data Hardcoding Audit

## Date
2026-04-20

## Scope
- `frontend/app`
- `backend/app`

## Summary
Hardcoding is now mostly concentrated in three categories:
- UI-only navigation and presentation lists
- operational enums that are acceptable in code for now
- business-config lists that should move to DB or config before enterprise rollout

## High-Risk Business Lists To Externalize

### Qualification and rule-definition metadata
- Root-only files currently holding business-config lists:
  - `app/qualification/page.tsx`
  - `app/icp-profiles/page.tsx`
  - `app/settings/revenue-rules/page.tsx`
- Examples:
  - qualification select options
  - ICP required-field options
  - ICP company-size options
  - revenue-rule condition types, actions, severities
- Why it matters:
  - These lists shape governance and scoring behavior, not just UI presentation.
  - Keeping them in page code makes policy changes require deploys and increases root-vs-runtime drift risk.

### AI feature catalog
- File:
  - `backend/app/Services/AI/AIRoutingService.php`
- Why it matters:
  - Feature identifiers are effectively administrative master data for routing, health, and prompt-template governance.
  - This is a strong candidate for config or DB-backed administration over time.

## Medium-Risk Operational Enums

### Sales activity and transcript enums
- Files:
  - `backend/app/Services/Sales/LeadActivityService.php`
  - `backend/app/Services/Sales/LeadMeetingService.php`
  - `backend/app/Services/Sales/LeadFollowUpService.php`
  - `backend/app/Services/Sales/LeadTranscriptService.php`
- Examples:
  - activity types
  - meeting types
  - follow-up statuses
  - transcript source types and evaluation statuses
- Assessment:
  - These are acceptable as code constants while workflows are still stabilizing.
  - They should move out of service classes if operators need to extend them without code changes.

### Notification channel keys
- File:
  - `frontend/app/settings/notifications/page.tsx`
- Examples:
  - `notify_inapp_enabled`
  - `notify_email_enabled`
  - `notify_whatsapp_enabled`
- Assessment:
  - Lower risk than qualification policy, but still a master-data candidate because the UI assumes exactly three channels.

## Low-Risk UI Lists
- Files such as:
  - `frontend/app/settings/page.tsx`
  - `frontend/components/layout/app-shell.tsx`
- Examples:
  - settings cards
  - sidebar links
  - tab labels
- Assessment:
  - These are presentation lists, not data-governance lists.
  - They matter for discoverability, but not for data integrity.

## Recommended Backlog
1. Externalize qualification, ICP, and revenue-rule option catalogs first.
2. Decide whether sales workflow enums remain code-level constants or become admin-managed reference data.
3. Expand notifications settings so the channel list can be driven from integration config or a reference endpoint.
