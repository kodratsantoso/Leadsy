# 06 — Open Questions & Required Information

**Target Application:** Leadsy Platform (`leadsy.tech`)  
**Audit Date:** October 21, 2026  
**Auditor:** Senior Product Architect & SaaS Consultant  

---

## 1. Product & Business Strategy Questions

### Q-BUS-01: What is the primary monetization and billing model planned for external commercial tenants?
- **Why It Matters:**  
  Phase 1 added dynamic pricing plans (`Starter`, `Pro`, `Enterprise`) and telemetry calculations for MRR/ARR, but automated payment gateway billing (e.g. Midtrans, Xendit, Stripe webhook subscriptions) is not yet wired to automated license cutoff.
- **Decision That Depends On It:**  
  Whether to implement self-serve credit card / VA checkout flows or retain high-touch sales order invoicing with manual tenancy provisioning by the platform superadmin.

### Q-BUS-02: Is the mobile application (`mobile/`) intended for official App Store / Play Store release or internal sales APK distribution?
- **Why It Matters:**  
  The `mobile/` directory contains an Expo/React Native prototype. It lacks automated CI builds, EAS credentials, or App Store compliance manifests.
- **Decision That Depends On It:**  
  Whether engineering resources should prioritize hardening the web application's mobile viewport ergonomics or formalize a mobile release pipeline with EAS Build.

---

## 2. Users & Operational Workflows Questions

### Q-USR-01: How frequently do sales teams encounter duplicate leads across different territories?
- **Why It Matters:**  
  The platform includes `DeduplicationService` and an approval merge workflow (`leads.merge`), but currently matches strictly on exact phone normalization or sanitized company name strings.
- **Decision That Depends On It:**  
  Whether to invest in fuzzy matching / AI-driven entity resolution or keep deterministic phone/domain matching.

### Q-USR-02: What is the expected volume of WhatsApp messages processed per tenant per day?
- **Why It Matters:**  
  The Node.js Baileys sidecar stores session credentials on disk (`baileys_auth_info`). Heavy concurrent messaging across hundreds of active WhatsApp numbers could strain local WebSocket memory or lead to WhatsApp anti-spam bans.
- **Decision That Depends On It:**  
  Whether the platform should transition enterprise customers exclusively to official Cloud API / Mekari Qontak gateways or continue supporting the Baileys multi-device sidecar.

---

## 3. Technical Architecture Questions

### Q-TEC-01: When can the deprecated root-level UI directories (`app/`, `components/`, `lib/`, `store/`) be permanently removed?
- **Why It Matters:**  
  `app/README.md` states they are legacy duplicates kept for compatibility. They bloat search results and risk accidental developer edits.
- **Decision That Depends On It:**  
  Scheduling a cleanup release to prune root mirrors and confirm that no external build script depends on them.

### Q-TEC-02: Should child models be scoped automatically via a composite trait or parent relation proxy?
- **Why It Matters:**  
  Currently, models like `LeadQuotation` have a `tenant_id` column but do not use `BelongsToTenant`. Adding the trait requires verifying that all creation flows automatically supply `tenant_id` or resolve it from context.
- **Decision That Depends On It:**  
  The specific refactoring pattern used to resolve **SEC-001** without causing breaking regressions in existing background jobs.

---

## 4. Infrastructure & Operations Questions

### Q-INF-01: What are the root causes of the Redis queue worker daemon stalling noted in `console.php`?
- **Why It Matters:**  
  `backend/routes/console.php` reveals that the queue worker has "repeatedly gone silent for hours at a time", forcing a fallback cron command for screening.
- **Decision That Depends On It:**  
  Whether the issue is a Redis connection timeout, memory leak in background Chrome/PDF rendering (Spatie Browsershot), or a missing supervisor restart policy in `k8s/leadsy-prod-workers.yaml`.

### Q-INF-02: What are the database persistent volume backup and disaster recovery schedules?
- **Why It Matters:**  
  `scripts/db-backup-local.sh` exists, but there is no verifiable evidence in the repository showing automated off-site S3 snapshot scheduling for the PostgreSQL persistent volume.
- **Decision That Depends On It:**  
  Designing an automated database backup retention schedule and recovery time objective (RTO) documentation.

---

## 5. Security & Compliance Questions

### Q-SEC-01: Does Leadsy handle data subject to Indonesian PDP (Personal Data Protection) Law or GDPR?
- **Why It Matters:**  
  The system ingests executive names, personal phone numbers, WhatsApp chats, and identity photos (KTP / Signatory IDs).
- **Decision That Depends On It:**  
  Determining required data retention lifecycles, user consent tracking, and encryption requirements for PII stored in `lead_contacts` and `sales_visits`.

### Q-SEC-02: Are there external webhooks (e.g. Meta Ads, TikTok Ads) that require IP whitelisting or HMAC signatures?
- **Why It Matters:**  
  `backend/routes/api.php` exposes several webhook receivers under `/api/webhooks/*`. Some routes verify shared secrets (`WHATSAPP_WEBHOOK_SECRET`), while others rely on custom payload keys.
- **Decision That Depends On It:**  
  Standardizing HMAC SHA-256 signature verification across all incoming webhook handlers.
