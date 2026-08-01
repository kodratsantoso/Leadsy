# AI Meeting Summary Design Audit

## Overview
This document audits the existing components and data structures related to the AI Meeting Summary functionality in Leadsy, as requested for the redesign of the Meeting Transcript result page.

## Component Audit

| Required Capability | Existing Component / Implementation | File Path | Decision |
| :--- | :--- | :--- | :--- |
| **Meeting Summary page** | Inline rendering inside the main Lead detail page for Transcripts | `frontend/app/leads/[id]/page.tsx` (lines ~3695-3971) | **Extend**: Extract this inline logic into a reusable `MeetingSummaryReport.tsx` component. |
| **AI result source** | `LeadAiEvaluation` (Polymorphic Model) returning JSON object | `backend/app/Models/LeadAiEvaluation.php` | **Reuse**: No backend model changes required. The presentation layer will map these existing fields. |
| **Charts** | `react-apexcharts` (ApexCharts) | `frontend/package.json` | **Reuse**: We will use ApexCharts for the compact indicator and relevant chart. |
| **Tables** | `Table`, `TableHeader`, `TableRow`, `TableCell` | `frontend/components/ui/table.tsx` | **Reuse**: The existing Shadcn-compatible table component will be used. |
| **Export** | Server-side PDF via `GenerateMeetingSummaryPdfJob` | `backend/app/Jobs/GenerateMeetingSummaryPdfJob.php` & `frontend/app/leads/[id]/page.tsx` | **Reuse**: We will keep the "Generate Summary PDF" button which triggers the backend job, and potentially add a local window.print() CSS stylesheet for client-side printing. |
| **Design system** | Custom UI components (`Card`, `Badge`, `Button`, `lucide-react` icons) | `frontend/components/ui/*` | **Reuse**: All styling will rely on existing semantic tokens (e.g., `var(--brand)`, `var(--status-success)`). |

## Data Mapping Strategy

The new component will map the existing `LeadAiEvaluation` JSON fields to the new layout without mutating the backend:

- `summary` → **Executive Summary**
- `bantc_extracted`, `challenge`, `legacy_tools` → **Key Pain Points** / **Customer Needs**
- `objections_detected`, `buying_signals` → **Key Discussions**
- `action_items` → **Action Items Table**
- `missing_information`, `risks` → Highlighted in **Conclusion** or **Action Plan**
- `next_best_action`, `estimated_closing_date` → **Next-Step Summary**
- Custom fields in `general_sections_json` or `meeting_type_sections_json` → **Topics Discussed Table**
- `sentiment`, `intent_level`, `interest_level` → **Primary Indicator Chart**

## Layout Considerations
- The new `MeetingSummaryReport` component will wrap the content in a responsive 2-column grid for desktop and 1-column for mobile.
- A `@media print` CSS block will be used inside the component (or via Tailwind `print:` modifiers) to ensure it stays within two A4 pages, hides navigation, and preserves colors (`print-color-adjust: exact`).

## AI Governance
- No new AI endpoints will be triggered.
- We will solely rely on the pre-existing `evaluation` object passed from the query cache in `frontend/app/leads/[id]/page.tsx`.
