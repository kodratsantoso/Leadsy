# Changelog — Leadsy Platform

Semua perubahan signifikan pada platform ini dicatat di sini.

Format: [Semantic Versioning](https://semver.org/)
- **MAJOR** — perubahan besar / fitur utama / arsitektur baru
- **MINOR** — fitur baru yang backward-compatible
- **PATCH** — bug fix, perbaikan minor, optimasi

---

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
