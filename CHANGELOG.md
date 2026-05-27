# Changelog — Leadsy Platform

Semua perubahan signifikan pada platform ini dicatat di sini.

Format: [Semantic Versioning](https://semver.org/)
- **MAJOR** — perubahan besar / fitur utama / arsitektur baru
- **MINOR** — fitur baru yang backward-compatible
- **PATCH** — bug fix, perbaikan minor, optimasi

---

## [1.2.3] — 2026-05-27 · Patch Release

### What's New
- **Google Ads Connection Fix** — Google Ads Lead Forms now has an OAuth authorization URL with the official `adwords` scope and can test API credentials by refreshing OAuth tokens automatically.
- **Google Ads API Mode Guard** — connection test now uses API mode when Developer Token, Customer ID, and OAuth credentials are present, even if the Mode field still contains `webhook`.

### Quality
- Added backend coverage for Google Ads OAuth URL generation and refresh-token based accessible-customer testing.

## [1.2.2] — 2026-05-27 · Patch Release

### What's New
- **Lusha Two-Step Reveal Flow** — Lead Detail enrichment now searches Lusha V3 contact previews first, shows PIC name and role, and saves a contact only after the user confirms phone reveal.
- **Score-Gated Enrichment** — Lusha is blocked until the lead has an initial score of 60+, keeping paid enrichment focused on near-eligible leads.
- **Contact Candidate Persistence** — added preview candidate storage so Lusha search results are auditable and separate from confirmed lead contacts.

### Quality
- Added feature tests for score gating, preview-only candidate storage, and reveal-to-contact persistence.
- Refreshed deploy database snapshots after applying the contact enrichment candidate migration.

## [1.2.1] — 2026-05-27 · Patch Release

### What's New
- **Provider-Specific Integration Setting** — credential form disesuaikan per platform berdasarkan dokumentasi resmi, bukan satu form generik untuk semua channel.
- **Active Connection Checks** — Settings → Integration Setting sekarang memiliki endpoint backend untuk OAuth URL generation, token/API-key checks, webhook setup checks, dan preview data yang aman untuk platform yang mendukungnya.
- **Credential Matrix Documentation** — menambahkan matrix kebutuhan credential dan batas implementasi per platform untuk Facebook/Instagram, TikTok, YouTube, LinkedIn, Google Ads, Mekari Qontak, HubSpot, Salesforce, Pipedrive, Zapier, Make, dan Hunter.io.

### Quality
- Test backend baru mencakup Hunter API-key check, webhook URL setup check, dan OAuth URL validation guard.

## [1.2.0] — 2026-05-27 · Minor Release

### What's New
- **Integration Module Phase 1** — fondasi backend Integration Hub ditambahkan secara isolated di namespace `integration_*` untuk connection registry, credential store, entity mapping, dan webhook event intake.
- **AES-256-GCM Credential Security** — credential pihak ketiga disimpan sebagai authenticated encryption envelope dengan nonce acak, tag GCM, key id, AAD scoped per tenant/connection/type/key, dan HMAC-SHA256 blind fingerprint.
- **Provider Failure State Foundation** — connection dapat ditandai `action_required` saat token/API provider gagal, sehingga Phase 2 bisa menampilkan re-authentication state tanpa menyentuh core lead logic.
- **Webhook Idempotency Foundation** — inbound webhook event memiliki `idempotency_key` unik berbasis provider, external event id, dan payload hash untuk mencegah proses lead ganda.

### Dokumentasi
- README, task list, strategy note, platform spec, dan ADR diperbarui untuk mencatat batas Phase 1 dan guardrail anti-halusinasi endpoint provider.

### Quality
- Test baru mencakup AES-GCM round trip, AAD tamper rejection, scoped fingerprints, tenant-linked connection records, encrypted credential reveal, entity mappings, webhook events, dan provider auth failure state.

## [1.1.0] — 2026-05-26 · Minor Release

### What's New
- **Mobile Field Sales MVP** — aplikasi Expo/React Native baru di `mobile/` untuk Android dan iOS, dengan login Leadsy, Lead Inbox, Lead Detail, one-tap Call/WhatsApp/Email/Maps, Sales Visit, GPS Clock In/Out, foto evidence, client signature, visit result, notes, dan fake-location risk signal dasar.
- **Sales Visit Backend** — tabel `sales_visits` dan `sales_visit_media`, API protected untuk list visit, clock-in, clock-out, dan upload media, plus audit trail untuk koordinat, jarak dari lead, akurasi GPS, risk status, dan device metadata.
- **Expo Go Testing Helper** — script `npm run mobile:expo-go` mendeteksi IP LAN otomatis, mengarah ke API lokal `:3001`, dan membuka Expo LAN mode agar tester tinggal scan QR.
- **Lark SSO Production Flow** — Lark Custom App OAuth diperbaiki dari auth URL, callback, token exchange, user info, hingga penyimpanan Sanctum token sebelum redirect dashboard.
- **Lark Role Persistence** — user yang login via Lark tidak lagi menimpa role yang diatur di Leadsy Settings.
- **Lark Base Two-Way Sync** — Settings → Integrations kini mendukung Base app token, table/field discovery, record preview, manual Leadsy Leads ↔ Lark Base field mapping, Auto Match assistance, dan manual push/pull sync.
- **Deploy Database Snapshot Refresh** — snapshot PostgreSQL struktur dan data diperbarui untuk membawa record production/local baseline saat deploy fresh environment.
- **Dashboard Sales Contract Clarification** — dokumentasi menjelaskan perbedaan `Achievement Sales` sebagai realisasi `lead_outcomes.deal_size` per target period, versus funnel `Won` sebagai pipeline/terminal estimate dari `leads.estimated_closing_amount`.

### Dokumentasi
- README root, backend, frontend, mobile, platform spec, SSOT, API contract, task list, dan progress log diperbarui untuk release 1.1.0.
- Catatan distribusi mobile ditambahkan: Android via Google Play/internal testing/APK/AAB, iOS via TestFlight/App Store.

### Deployment
- Snapshot importer tetap opt-in via `IMPORT_LEADSY_DB_SNAPSHOT=true`.
- Snapshot membawa encrypted secrets yang tetap bergantung pada Laravel `APP_KEY`; jika APP_KEY berbeda, credentials AI/Lark harus diinput ulang.

## [1.0.0] — 2026-05-12 · Major Release

**First stable production release.** Semua modul inti selesai dan deployed ke production.

### Fitur Utama
- **Lead Management** — CRUD leads, dedup 4-tier, score gate, push to funnel
- **Maps & Territory** — Google Places discovery (nearby + text search, radius hingga 50 km)
- **Geo Product Fit Intelligence** — two-phase scoring (rule pre-score + AI deep analysis), fit level markers, filter/sort, cache by payload hash
- **Products & ICP** — katalog produk dengan AI metadata generation dari nama, URL, atau PDF
- **Lead Intelligence Engine** — AI scoring (BANT), qualification engine, product matching, transcript evaluation
- **Funnel & Pipeline** — stage management, score + qualification gate
- **WhatsApp Integration** — Baileys sidecar, QR pairing, broadcast, AI intent analysis
- **AI Infrastructure** — multi-provider routing (OpenAI/Anthropic/Gemini), 15 feature routes, fallback, cost control
- **Audit Logs** — semua aksi tercatat, export CSV/XLSX/TXT
- **Settings** — AI Defaults, Integrations, Users & Roles, ICP Profiles

### Perbaikan Deployment
- Hapus `postgresql-server-dev-all` dari `Dockerfile.production` — reduce build size 1 GB, build time ~10x lebih cepat
- Stable Docker volume names via `COOLIFY_RESOURCE_UUID` untuk mencegah data loss saat redeploy

### Perbaikan UI
- Table component: horizontal scroll (`overflow-x-auto`) — kolom tidak lagi terpotong
- Leads page: compact Actions cell, hapus verbose Score text per baris

### Dokumentasi
- `docs/PLATFORM_SPEC.md` — spesifikasi platform lengkap (living document)

---

## [0.9.0] — 2026-05-11 · Minor Release

### Fitur Baru
- **Geo Product Fit Analysis** — analisis kesesuaian produk vs bisnis yang ditemukan di Maps
  - Rule-based pre-score pada semua hasil (gratis, instan)
  - AI deep analysis pada top-10 kandidat
  - Persist cache di `geo_product_fit_analyses`
  - Bridge ke `LeadProductMatch` saat add to leads
- **Product Selector di Maps** — pilih produk sebelum scan untuk aktifkan analisis
- **Fit Level Markers** — marker peta berwarna berdasarkan fit level (emerald/amber/neutral)
- **Filter & Sort by Fit** — filter fit level, sort by score, filter by has phone/not in pipeline
- AI feature route `geo_product_fit_analysis` ditambahkan ke catalog

### Backend
- `GeoProductFitService` — two-phase scoring engine
- `GeoProductFitAnalysis` model + migration `geo_product_fit_analyses`
- `MapDiscoveryController` — tambah `analyzeProductFit`, `productFitResults`, update `addToLeads`
- `ProductController` — tambah `?status=active` filter

---

## [0.8.0] — 2026-04-25 · Minor Release

### Fitur Baru
- **AI Product Metadata Generation** — generate semua 12 field ICP dari nama produk
- **Lead Product Matching** — BANT + competitor AI analysis per produk
- **ICP Profiles** — kelola profil ideal customer profile
- Lead Product Match Runs — audit trail setiap matching run
- `lead_product_matches` extended dengan BANT analysis, AI provenance

---

## [0.7.0] — 2026-04-20 · Minor Release

### Fitur Baru
- **Products Catalog** — CRUD produk dengan 12 field ICP metadata
- **Industries & Sub-Industries** — database-backed, tidak lagi hardcoded
- Dedup berbasis domain URL

---

## [0.6.0] — 2026-04-18 · Minor Release

### Fitur Baru
- **Qualification Engine** — parameter sets, workflow, review queue
- **Revenue Intelligence** — revenue rules, analysis per lead
- **Meeting & Transcript Evaluation** — AI evaluasi signal dari meeting dan transkrip
- Lead follow-up system

---

## [0.5.0] — 2026-04-17 · Minor Release

### Fitur Baru
- **Lead Intelligence** — AI scoring BANT, activity log, meeting log
- **Contact Management** — multiple contacts per lead, set primary
- **Funnel Stages** — database-backed stages, push to funnel dengan gate validation
- Dashboard dengan funnel metrics dan heatmap

---

## [0.4.0] — 2026-04-16 · Minor Release

### Fitur Baru
- **WhatsApp Integration** — Baileys sidecar (Node.js), QR pairing, send/receive message, broadcast
- AI intent analysis pada percakapan WhatsApp (`whatsapp_analysis` route)
- WhatsApp conversation history di UI

---

## [0.3.0] — 2026-04-15 · Minor Release

### Fitur Baru
- **Maps & Territory** — Google Places API (Nearby + Text Search), radius search, marker layer
- **Place Details** — enrichment phone, website, jam operasional
- Map Search History — riwayat pencarian per user
- Discovery Categories — kategori bisnis dari DB
- Dedup check otomatis pada hasil Maps

### AI Infrastructure
- `AiOrchestrationService` — multi-provider routing dengan fallback
- `AIRouterService` — priority resolver, collision detection, cost-aware routing
- AI feature routes di database — configurable via Settings → AI Defaults

---

## [0.2.0] — 2026-04-13 · Minor Release

### Fitur Baru
- **Lead Management** — CRUD leads, filter komprehensif, export CSV, bulk import
- **Deduplication** — 4-tier priority (domain → name+lokasi → email → phone)
- **Audit Logs** — before/after tracking, IP, user agent, export
- RBAC Middleware — permission-based access control

---

## [0.1.0] — 2026-04-11 · Initial Release

### Foundation
- Laravel 11 backend, Next.js 15 frontend
- PostgreSQL + Redis + Docker Compose setup
- Laravel Sanctum authentication
- AppShell dengan sidebar navigation, theme toggle (light/dark)
- Super admin seeder, roles & permissions foundation
- Coolify deployment configuration
- `GET /api/health` endpoint

---

*Dokumen ini diperbarui setiap kali versi baru dirilis.*
*Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/)*
