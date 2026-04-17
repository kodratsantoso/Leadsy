# Architecture Decision Records (ADR)

## ADR-001: Interim Next.js API Layer
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: Since PHP/Docker are not available on the host, implement a Next.js API layer for frontend E2E validation while maintaining the Laravel backend as the production target.
- **Rationale**: Allows full feature validation without infrastructure dependencies.
- **Impact**: Frontend can be tested end-to-end; Laravel backend deploys via Docker when ready.

## ADR-002: Multi-Provider AI Architecture
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: Implement a provider-agnostic AI orchestration layer supporting OpenAI, Anthropic, and Google Gemini with automatic fallback routing.
- **Rationale**: BRD §4 requires multi-provider support with fallback. Each provider has different API contracts that must be abstracted.
- **Impact**: Services (AiOrchestrationService) handle provider-specific formatting. Model routes define primary + fallback for each function.

## ADR-003: 4-Tier Deduplication Priority
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: Dedup engine uses priority: Domain > Name+Location (500m) > Email > Phone. Exact domain match = exact_duplicate; others = probable_duplicate.
- **Rationale**: BRD §3.7 defines exact order. Domain is the strongest signal, name+proximity handles cases where companies have multiple entries.
- **Impact**: DeduplicationService implements this exactly. New contacts can be appended to existing leads without creating duplicates.

## ADR-004: Split Map Layout Architecture
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: Map page uses 3-panel layout: Left (controls + lead list) | Center (map + markers) | Right (slide-out lead drawer).
- **Rationale**: BRD §12.2B requires this exact layout for optimal sales workflow. No full-page reloads for lead selection.
- **Impact**: Map page is a single client component with state-driven drawer. Selected lead syncs between list and map markers.

## ADR-005: Queue-Based Async Processing
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: AI scoring, deduplication checks, and lead enrichment run as queued jobs (Redis/Horizon).
- **Rationale**: These operations involve external APIs with variable latency. Sync execution would degrade UX.
- **Impact**: ScoreLeadJob, DeduplicateLeadJob, EnrichLeadJob dispatch to named queues (scoring, enrichment, default).

## ADR-006: RBAC Middleware Pattern
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: Route-level RBAC via `permission` middleware alias. Super admins bypass all checks. Permission matrix loaded from database via role->permissions pivot.
- **Rationale**: BRD §5.1 requires permission matrix. Middleware approach is Laravel-standard and testable.
- **Impact**: Every sensitive route has ->middleware('permission:xxx'). CheckPermission middleware checks user role's permissions.

## ADR-007: Integration Configuration Layer
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: All 3rd party integration keys (Maps, Webhooks, WhatsApp, AI endpoints where needed) will be stored in an `integration_configs` table rather than hardcoded `.env` files.
- **Rationale**: The execution prompt requires a unified architecture for Integration setup, allowing admin users to dynamically change/test inputs.
- **Impact**: The UI polls `/api/settings/public` for safe keys. Encrypted keys stay strictly backend only.

## ADR-008: WhatsApp Session Mock Simulator
- **Date**: 2026-04-11
- **Status**: Deprecated (Replaced by ADR-010)
- **Decision**: WhatsApp QR implementation will use a simulated mock-state-machine built on Laravel Cache to mimic QR generation and session scanning. 
- **Rationale**: Setting up a persistent Web Socket (Baileys/WWebJS) session requires a Node.js daemon which is outside the PHP standard infrastructure scope natively. This allows validation of the frontend UI polling logic exactly as intended by the BRD without heavy side-car architecture.
- **Impact**: Backend endpoint `POST /api/whatsapp/session/init` populates Cache and automatically transitions to `connected` after 8 seconds. Frontend correctly polls this state and unlocks WhatsApp UI actions.

## ADR-009: Map Discovery Module & Strategy
- **Date**: 2026-04-16
- **Status**: Active
- **Decision**: Separated Google Maps querying into its own controller (`MapDiscoveryController`) and introduced caching (`map_candidates`) and a history table (`map_search_history`). Frontend was shifted to a pure 3-pane sync state with `use-map-discovery` hook separating UI from API. `external_place_id` added as #1 dedup rule.
- **Rationale**: Keeps `LeadController` focused strictly on the pipeline CRM logic. Caching prevents extremely expensive Google Maps API loops. Dedup via place ID ensures the highest fidelity pipeline possible (preventing double entry before even reaching website/email matching logic).
- **Impact**: Map Discovery represents a top-level independent flow, with strict CRM handover.

## ADR-010: WhatsApp Real Baileys Sidecar Architecture
- **Date**: 2026-04-16
- **Status**: Active
- **Decision**: Replaced the WhatsApp mock simulator (ADR-008) with a real Node.js Baileys-based sidecar container (`whatsapp-service`). Integrated conversational DB schema (`whatsapp_conversations`, `whatsapp_contacts`), AI-based intent analysis via `AnalyzeWhatsAppConversationJob`, and a 5-tab Next.js frontend UI for Session, Direct Messaging, Broadcasts, AI-analyzed Conversations, and Privacy Rules.
- **Rationale**: Required for genuine WhatsApp capability matching the BRD. Docker volume persistence provides stable QR sessions, resolving earlier limitations. AI queue separation isolates expensive LLM conversational intent analysis from incoming real-time webhooks.
- **Impact**: Real WhatsApp capability activated. Backend now communicates to `whatsapp-service:3002` internally. Sessions survive container restarts.

