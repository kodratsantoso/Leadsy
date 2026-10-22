# 01 — Product & Module Inventory

**Target Application:** Leadsy Platform (`leadsy.tech`)  
**Audit Date:** October 21, 2026  
**Auditor:** Senior Product Architect & SaaS Consultant  

---

## 1. Product & User Overview

### 1.1 Product Purpose & Target Audience
Leadsy is designed for B2B commercial organizations, sales management, business development executives, and presales architects. The application replaces fragmented spreadsheets and disjointed sales tools by combining:
- Geospatial market discovery (Google Maps).
- Predictive AI qualification (ICP scoring, BANT-C evaluation, transcript analysis).
- In-app multi-device communication (WhatsApp Baileys integration).
- Proposal-to-delivery financial tracking (Quotation, Sales Orders, Tax Codes, Invoicing).
- Multi-tenant enterprise SaaS management (Superadmin console, packaging, quotas).

### 1.2 Target User Personas & Defined Roles

| Role Key | Display Name | Core Permissions & Focus |
|---|---|---|
| `super_admin` | **Super Admin** | Full platform access, multi-tenant switching, tenant provisioning, system audit logs, global feature flags, and AI provider routing. |
| `admin` | **Tenant Admin** | Organization-wide administration: user management, company banking setup, integrations (Lark/Documenso), and security policy configuration. |
| `sales_manager` | **Sales Manager** | Pipeline oversight, lead assignment, stage gate approvals, revenue targets, KPI tracking, and stalled deal remediation. |
| `sales_exec` | **Sales / BD Executive** | Lead discovery, contact logging, meeting notes, quotation drafts, WhatsApp customer follow-ups, and sales visit recording. |
| `presales` | **Presales / Research Analyst** | Technical discovery, solution design completeness, competitive battlecard generation, and professional services estimation. |
| `viewer` | **Viewer / Auditor** | Read-only inspection of leads, products, and activity logs. |

---

## 2. Complete Module Inventory

Below is the verified inventory of the 12 core application functional domains discovered across the codebase.

```
                                  LEADSY SAAS PLATFORM
                                           │
  ┌───────────────────┬────────────────────┼───────────────────┬───────────────────┐
  │                   │                    │                   │                   │
  ▼                   ▼                    ▼                   ▼                   ▼
Geospatial Radar   AI Intelligence     Sales Funnel       Order-to-Cash      Integrations Hub
(Maps & Places)    & Scoring Engine    & WhatsApp CRM     & PSA Delivery     (Lark, Documenso)
```

### Module 1: Geospatial Lead Radar & Territory Discovery
- **Business Purpose:** Visual prospecting on Google Maps within custom radius/polygons.
- **Key Entities:** `Territory`, `MapSearchHistory`, `MapCandidate`, `GeoProductFitAnalysis`.
- **Pages / Routes:**
  - `/map` (`frontend/app/map/page.tsx`)
  - `/lead-generator` (`frontend/app/lead-generator/page.tsx`)
- **Backend APIs:**
  - `GET /api/maps/search`, `GET /api/maps/categories`, `GET /api/maps/geocode`, `POST /api/maps/add-to-leads`, `POST /api/maps/geo-product-fit/analyze`.
- **Status:** **Implemented & Verified** (Core discovery flow verified in integration test suites).

### Module 2: AI Qualification, ICP Matching & Scoring Engine
- **Business Purpose:** Automated qualification of leads against target buyer personas, financial health, and BANT-C criteria.
- **Key Entities:** `LeadScore`, `LeadScoreBreakdown`, `LeadIcpMatch`, `IcpProfile`, `AiRequest`, `AiAttentionHighlight`.
- **Pages / Routes:**
  - `/qualification/reviews` (`frontend/app/qualification/reviews/page.tsx`)
  - `/settings/icp-profiles` (`frontend/app/settings/icp-profiles/page.tsx`)
  - `/settings/ai-screening-monitor` (`frontend/app/settings/ai-screening-monitor/page.tsx`)
- **Backend APIs:**
  - `POST /api/leads/{id}/qualify`, `GET /api/leads/{id}/scoring-breakdown`, `POST /api/leads/ai-screening/run-batch`.
- **Status:** **Implemented & Verified** (Covered by `LeadScoringServiceTest` and `ICPMatchingServiceTest`).

### Module 3: Lead Lifecycle & Pipeline Funnel Management
- **Business Purpose:** End-to-end sales pipeline progression with revenue gates and stage progression audit trails.
- **Key Entities:** `Lead`, `LeadActivity`, `LeadContact`, `LeadFunnelHistory`, `FunnelStage`.
- **Pages / Routes:**
  - `/leads` (`frontend/app/leads/page.tsx`)
  - `/leads/[id]` (`frontend/app/leads/[id]/page.tsx`)
  - `/leads/trash` (`frontend/app/leads/trash/page.tsx`)
- **Backend APIs:**
  - `GET /api/leads`, `POST /api/leads`, `GET /api/leads/{id}`, `PUT /api/leads/{id}`, `POST /api/leads/{id}/stage`, `DELETE /api/leads/{id}`.
- **Status:** **Implemented & Verified** (Primary production CRM workflow).

### Module 4: Meeting Transcripts & BANT-C Intelligence
- **Business Purpose:** Uploading audio transcripts or Lark Minutes to extract BANT-C qualification signals, summary PDFs, and action items.
- **Key Entities:** `LeadTranscript`, `MeetingSummaryDocument`, `LeadBantcQuestionGuide`.
- **Pages / Routes:**
  - Embedded inside Lead Detail (`frontend/app/leads/[id]/page.tsx` tabs: *Activities*, *Transcripts*).
- **Backend APIs:**
  - `POST /api/leads/{id}/transcripts`, `POST /api/leads/{id}/transcripts/analyze`, `GET /api/leads/{id}/meeting-summary/pdf`.
- **Status:** **Implemented & Verified** (Asynchronous jobs `AnalyzeTranscriptJob` and `GenerateMeetingSummaryPdfJob`).

### Module 5: WhatsApp Multi-Device Gateway & Conversation CRM
- **Business Purpose:** Direct WhatsApp messaging, contact synchronization, and template campaign broadcasting.
- **Key Entities:** `WhatsappConversation`, `WhatsappMessage`, `WhatsappContact`, `WhatsappSession`.
- **Pages / Routes:**
  - `/whatsapp` (`frontend/app/whatsapp/page.tsx`)
  - `/whatsapp/local` (`frontend/app/whatsapp/local/page.tsx`)
  - `/whatsapp/qontak` (`frontend/app/whatsapp/qontak/page.tsx`)
- **Backend APIs:**
  - `GET /api/whatsapp/conversations`, `POST /api/whatsapp/send`, `GET /api/whatsapp/session-status`, `POST /api/webhooks/whatsapp`.
- **Status:** **Implemented & Verified** (Requires operational `whatsapp-service` Node.js sidecar).

### Module 6: Order-to-Cash (O2C) & Commercial Quotations
- **Business Purpose:** Product tier catalog selection, multi-item quotation builder, tax calculations (PPN/PPH), approval workflows, and conversion to Sales Orders.
- **Key Entities:** `LeadQuotation`, `LeadQuotationItem`, `LeadSalesOrder`, `TaxCode`, `WithholdingTaxCode`.
- **Pages / Routes:**
  - Embedded inside Lead Detail (`frontend/app/leads/[id]/page.tsx` tab: *Order-to-Cash*).
  - `/settings/o2c/*` (Item Settings, Tax Codes, Withholding Tax).
- **Backend APIs:**
  - `GET/POST /api/leads/{id}/quotations`, `GET /api/quotations/{id}`, `POST /api/quotations/{id}/convert-to-sales-order`, `POST /api/quotations/{id}/generate-pdf`.
- **Status:** **Implemented & Verified** (Covered by `OrderToCashTest.php`).

### Module 7: Professional Services Automation (PSA) & Project Plans
- **Business Purpose:** Service complexity estimation, role rate cards, project delivery task breakdown, change request tracking, and BAST client sign-offs.
- **Key Entities:** `PsEstimation`, `PsProjectPlan`, `PsProjectTask`, `PsChangeRequest`, `PsBastDocument`.
- **Pages / Routes:**
  - `/professional-services` (`frontend/app/professional-services/page.tsx`)
  - `/professional-services/estimations/[id]`
  - `/professional-services/project-plans/[id]`
  - `/professional-services/psa-dashboard`
- **Backend APIs:**
  - `GET /api/ps/estimations`, `POST /api/ps/estimations`, `GET /api/ps/project-plans/{id}`, `POST /api/ps/basts`.
- **Status:** **Implemented & Verified**.

### Module 8: Customer Success & Churn Intelligence
- **Business Purpose:** Post-sale customer health scoring, proactive churn detection, contract renewal pipelines, and NPS/CSAT tracking.
- **Key Entities:** `CustomerHealthScore`, `CustomerRenewalOpportunity`, `CustomerOnboardingMilestone`, `CustomerFeedback`.
- **Pages / Routes:**
  - `/customer-success` (`frontend/app/customer-success/page.tsx`)
  - `/customer-success/[leadId]`
  - `/customer-success/renewals`
- **Backend APIs:**
  - `GET /api/customer-success/health-scores`, `GET /api/customer-success/renewals`, `POST /api/customer-success/churn-risks`.
- **Status:** **Implemented & Verified** (Scheduled daily artisan detection commands).

### Module 9: Lark Open Platform Enterprise Sync
- **Business Purpose:** Bi-directional table synchronization with Lark Base (Bitable) and SSO user authentication.
- **Key Entities:** `LarkIntegration`, `LarkBaseTable`, `LarkSync`, `LarkEvent`.
- **Pages / Routes:**
  - `/settings/integrations/lark-base` (`frontend/app/settings/integrations/lark-base/page.tsx`)
  - `/auth/lark/callback`
- **Backend APIs:**
  - `POST /api/lark/sync-all`, `GET /api/lark/tables`, `POST /api/webhooks/lark`.
- **Status:** **Implemented & Verified** (Verified in `LarkBaseSyncApiTest.php`).

### Module 10: Multi-Tenant SaaS Platform Administration
- **Business Purpose:** Superadmin control plane for tenant provisioning, dynamic packaging tiers (`plans`), resource quotas, user impersonation, and live financial metrics.
- **Key Entities:** `Tenant`, `Plan`, `AuditLog`, `User`.
- **Pages / Routes:**
  - `/admin/tenants` (`frontend/app/admin/tenants/page.tsx`)
  - `/admin/tenants/[id]` (`frontend/app/admin/tenants/[id]/page.tsx`)
  - `/admin/plans` (`frontend/app/admin/plans/page.tsx`)
  - `/admin/metrics` (`frontend/app/admin/metrics/page.tsx`)
  - `/admin/infrastructure` (`frontend/app/admin/infrastructure/page.tsx`)
  - `/admin/ai-accounting` (`frontend/app/admin/ai-accounting/page.tsx`)
- **Backend APIs:**
  - `GET/POST /api/platform/tenants`, `GET /api/platform/tenants/{id}/deep`, `GET/POST /api/platform/plans`, `POST /api/platform/tenants/{id}/impersonate`.
- **Status:** **Implemented & Verified** (Recent Phase 1 & 2 releases).

### Module 11: Security & Session Policy Configuration
- **Business Purpose:** 2FA TOTP generation, configurable idle session timeout, password complexity policy enforcement, and audit logs.
- **Key Entities:** `SecuritySetting`, `AuditLog`, `PersonalAccessToken`.
- **Pages / Routes:**
  - `/settings/security` (`frontend/app/settings/security/page.tsx`)
  - `/audit-logs` (`frontend/app/audit-logs/page.tsx`)
- **Backend APIs:**
  - `GET/PUT /api/settings/security`, `POST /api/auth/2fa/enable`, `GET /api/audit-logs`.
- **Status:** **Implemented & Verified**.

### Module 12: Mobile Lead Companion (Expo / React Native)
- **Business Purpose:** On-the-field mobile app for sales visits and quick check-ins.
- **Location:** `mobile/` directory (`mobile/App.tsx`, `mobile/package.json`).
- **Status:** **Partially Implemented / Independent Prototype** (Present in workspace, runs on Expo Go, not compiled into web runtime).

---

## 3. Feature Coverage Matrix

| Module | Core Features | Frontend UI Page | Backend API Endpoint | Database Persistence | Status |
|---|---|---|---|---|---|
| **Geospatial Discovery** | Google Map Radar, Radius Search, Fit Analysis | `/map` | `/api/maps/search` | `map_candidates` | **Implemented & Verified** |
| **Lead Funnel** | Kanban/List, Stage Transitions, Lead Trash | `/leads`, `/leads/[id]` | `/api/leads` | `leads`, `lead_funnel_history` | **Implemented & Verified** |
| **AI Intelligence** | ICP Matching, Scoring, Pre-Meeting Screening | `/qualification/reviews` | `/api/leads/{id}/qualify` | `lead_scores`, `ai_requests` | **Implemented & Verified** |
| **Transcripts & BANT** | Audio/Text Ingestion, Meeting Summary PDF | Lead Detail Tabs | `/api/leads/{id}/transcripts` | `lead_transcripts` | **Implemented & Verified** |
| **WhatsApp CRM** | Live Chat, Session QR, Campaign Dispatch | `/whatsapp` | `/api/whatsapp/send` | `whatsapp_messages` | **Implemented & Verified** |
| **Order-to-Cash** | Product Tiers, Quotation PDF, Sales Orders | Lead Detail Tabs | `/api/leads/{id}/quotations` | `lead_quotations` | **Implemented & Verified** |
| **PSA Management** | Cost Estimation, Task Plans, BAST Signing | `/professional-services` | `/api/ps/estimations` | `ps_estimations`, `ps_tasks` | **Implemented & Verified** |
| **Customer Success** | Churn Warning, Renewal Pipeline, NPS/CSAT | `/customer-success` | `/api/customer-success/health-scores` | `customer_health_scores` | **Implemented & Verified** |
| **Lark Sync** | 2-Way Bitable Sync, SSO, Meeting Minutes | `/settings/integrations/lark-base`| `/api/lark/sync-all` | `lark_syncs`, `lark_base_tables` | **Implemented & Verified** |
| **Platform Admin** | Tenant 360°, Plan Packaging, MRR Telemetry | `/admin/*` | `/api/platform/*` | `tenants`, `plans`, `audit_logs`| **Implemented & Verified** |
| **Mobile App** | Sales Visit Check-in, Lead Directory | `mobile/` | `/api/sales-visits` | `sales_visits` | **Partially Implemented (Mobile)** |

---

## 4. Discovered Critical User Workflows

### Workflow 1: Map Discovery to CRM Lead
1. **Entry Point:** `/map`
2. **User Action:** Search target coordinates and radius, click "Discover Businesses", and select candidates to "Add to Leads".
3. **Frontend:** Dispatches `POST /api/maps/add-to-leads` with place metadata.
4. **Backend:** `MapDiscoveryController::addToLeads` executes `DeduplicationService` (checks phone/name), creates `Lead` record, and dispatches background queue jobs (`ScoreLeadJob`, `ICPMatchLeadJob`, `RunAiLeadProfilingJob`).
5. **Persistence:** `leads`, `lead_scores`, `lead_icp_matches`.
6. **Verification:** Tested and functional.

### Workflow 2: Meeting Transcript Ingestion & BANT-C Signal Extraction
1. **Entry Point:** `/leads/[id]` (Tab: *Transcripts*)
2. **User Action:** Paste meeting transcript text or provide Lark Minutes URL.
3. **Frontend:** Calls `POST /api/leads/{id}/transcripts`.
4. **Backend:** Dispatches `AnalyzeTranscriptJob` to `AiOrchestrationService` with prompt template `transcript_bantc_extractor`. Extracts Budget, Authority, Needs, Timeline, Competitors.
5. **Persistence:** Saves extracted attributes to `lead_transcripts` and updates `leads` via `LeadBantcSyncService`.
6. **Verification:** Unit and Feature tested.

### Workflow 3: Commercial Proposal & Quotation Approval
1. **Entry Point:** `/leads/[id]` (Tab: *Order-to-Cash*)
2. **User Action:** Click "Create Quotation", select product items and tier quantities, apply tax codes, and submit for approval.
3. **Frontend:** Calls `POST /api/leads/{id}/quotations`.
4. **Backend:** Calculates line totals, checks SaaS Product Tier requirements, computes PPN/PPH, and saves quotation.
5. **Persistence:** `lead_quotations`, `lead_quotation_items`.
6. **Verification:** Tested, but has **SEC-001** IDOR exposure on standalone direct `{id}` routes.
