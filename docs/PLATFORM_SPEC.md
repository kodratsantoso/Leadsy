# Leadsy Platform — Spesifikasi & Alur Kerja

> **Dokumen hidup.** Diperbarui setiap kali ada improvisasi fitur.
> Versi terakhir: 2026-05-12

---

## Daftar Isi

1. [Gambaran Platform](#1-gambaran-platform)
2. [Arsitektur Teknis](#2-arsitektur-teknis)
3. [Modul: Lead Management](#3-modul-lead-management)
4. [Modul: Maps & Territory — Geo Product Fit Intelligence](#4-modul-maps--territory--geo-product-fit-intelligence)
5. [Modul: Products & ICP](#5-modul-products--icp)
6. [Modul: Lead Intelligence Engine](#6-modul-lead-intelligence-engine)
7. [Modul: Funnel & Pipeline](#7-modul-funnel--pipeline)
8. [Modul: WhatsApp](#8-modul-whatsapp)
9. [Modul: AI Infrastructure](#9-modul-ai-infrastructure)
10. [Modul: Settings & Konfigurasi](#10-modul-settings--konfigurasi)
11. [Modul: Audit Logs](#11-modul-audit-logs)
12. [Peta Koneksi Antar Fitur](#12-peta-koneksi-antar-fitur)
13. [Alur Kerja End-to-End](#13-alur-kerja-end-to-end)
14. [Tabel Referensi API](#14-tabel-referensi-api)
15. [Tabel AI Feature Routes](#15-tabel-ai-feature-routes)
16. [Changelog Spesifikasi](#16-changelog-spesifikasi)

---

## 1. Gambaran Platform

**Leadsy** adalah platform sales intelligence B2B yang dirancang untuk pasar Indonesia. Fungsinya adalah menjadi lapisan kualifikasi lead sebelum masuk ke CRM atau pipeline penjualan.

```
Sumber Lead → Leadsy (Qualify + Score + Match) → Pipeline / CRM → Sales Execution
```

### Tujuan Utama

| Tujuan | Implementasi |
|---|---|
| Temukan prospek baru dari peta | Maps & Territory + Geo Product Fit |
| Kualifikasi lead secara otomatis | AI Scoring + Qualification Engine |
| Cocokkan lead dengan produk yang relevan | Product Matching (BANT + AI) |
| Cegah lead lemah masuk pipeline | Dedup + Score Gate |
| Kontak langsung via WhatsApp | WhatsApp Integration |
| Semua keputusan bisa diaudit | Audit Log System |

### Pengguna Utama

- Sales Development Representative (SDR)
- Account Executive (AE)
- Sales Manager / Approver
- Revenue Operations Analyst
- Administrator / System Owner

---

## 2. Arsitektur Teknis

### Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, TanStack Query |
| Backend | Laravel 11, PHP 8.2 |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| AI | Multi-provider: OpenAI / Anthropic / Gemini (via AI Routing) |
| Deployment | Docker Compose + Coolify, Traefik reverse proxy |
| Maps | Google Places API (Nearby Search, Text Search, Place Details) |

### Deployment Topology

```
Internet → Traefik (HTTPS)
              ├── leadsy.virtuenet.space       → Frontend (Next.js, port 3000)
              └── leadsy.virtuenet.space/api/* → Backend (Laravel, port 8000)
                        ├── PostgreSQL (port 5432, internal)
                        ├── Redis (port 6379, internal)
                        └── WhatsApp Sidecar (port 3002, internal)
```

### Pola Komunikasi Frontend–Backend

Frontend memanggil backend via Next.js rewrite proxy:
```
Browser → /api/* (Next.js) → http://backend:8000/api/* (Laravel)
```
Semua request terautentikasi dengan Laravel Sanctum token yang disimpan di Zustand store (`useAuthStore`).

---

## 3. Modul: Lead Management

### Apa Ini

Pusat data semua lead yang ditemukan atau diinput manual. Setiap lead merepresentasikan satu perusahaan/bisnis yang berpotensi menjadi pelanggan.

### Kapabilitas

- CRUD lead (create, view, edit, delete)
- Filter: stage, kualifikasi, duplicate status, score range, search
- Export ke CSV
- Deduplication otomatis (4-tier priority)
- Push lead ke funnel pipeline
- Log aktivitas, meeting, kontak
- View detail lead dengan semua intelligence

### Alur: Membuat Lead Manual

```
User klik "New Lead"
  → Isi Company Name (wajib) + field opsional
  → POST /api/leads
  → Dedup check otomatis (domain → name+lokasi → email → phone)
    ├─ exact_duplicate → 409 (ditolak)
    └─ new / probable → Lead tersimpan dengan duplicate_status
  → Lead muncul di tabel dengan score "—" (belum dianalisis)
```

### Alur: Lead dari Maps Discovery

```
Maps Discovery (lihat Modul 4)
  → User klik "Add to Leads Pipeline"
  → POST /api/maps/add-to-leads
  → Dedup check
  → Lead.source = google_maps, external_place_id tersimpan
  → Jika product dipilih: LeadProductMatch otomatis dibuat dari fit analysis
```

### Field Lead Utama

| Field | Keterangan |
|---|---|
| `company_name` | Nama perusahaan — wajib |
| `address`, `lat`, `lng` | Lokasi |
| `phone`, `email`, `website` | Kontak |
| `business_category` | Kategori bisnis (dari Maps atau manual) |
| `industry_id` | Terhubung ke tabel industries |
| `lead_score` | 0–100, hasil AI scoring |
| `qualification_status` | `pending` / `eligible` / `potential` / `not_eligible` |
| `duplicate_status` | `new` / `probable_duplicate` / `exact_duplicate` |
| `external_place_id` | Google Maps Place ID (jika dari Maps) |
| `ai_mode` | `full_ai` / `hybrid` / `manual` |

### Deduplication Logic

Pengecekan berurutan — berhenti di match pertama:

```
1. Domain match (website_domain) → exact_duplicate
2. Name + lokasi ≤ 500m        → probable_duplicate
3. Email match                  → probable_duplicate
4. Phone match                  → probable_duplicate
5. Tidak ada match              → new
```

### Syarat Masuk Pipeline (Push to Funnel)

Lead HARUS memenuhi semua syarat ini sebelum bisa dipush ke funnel:
- `lead_score ≥ 60`
- `qualification_status` = `eligible` atau `potential`

Jika tidak memenuhi, tombol push disabled dengan tooltip penjelasan.

---

## 4. Modul: Maps & Territory — Geo Product Fit Intelligence

### Apa Ini

Fitur pencarian bisnis berdasarkan lokasi geografis menggunakan Google Places API, diperkuat dengan analisis kesesuaian produk (product-fit) menggunakan AI.

### Kapabilitas

- Geocoding area (nama area → koordinat)
- Nearby Search dan Text Search
- Radius hingga 50 km
- Dedup check per hasil (bisnis sudah ada di pipeline atau belum)
- **Geo Product Fit Analysis** — analisis kesesuaian produk vs bisnis yang ditemukan
- Filter hasil by: has phone, not in pipeline, fit level, fit score
- Sort by: fit score, rating
- Add to Leads dengan product-fit context

### Panel Layout

```
┌─────────────────────┬─────────────────────────┬──────────────────────┐
│   Search Panel      │      Google Map          │   Results Panel      │
│  (360px)            │   (flex-1)               │   (420px)            │
│                     │                          │                      │
│ • Target Territory  │  [Markers berdasarkan    │ • Analyze Product    │
│ • Product Fit Target│   fit level:             │   Fit button         │
│ • Discovery Target  │   🟢 High / 🟡 Medium /  │ • Filter/Sort bar    │
│ • Radius slider     │   ⚪ Default / ✅ InPipeline│ • List hasil        │
│ • AI Mode selector  │  ]                       │   (klik → detail)   │
│ • Filters & History │                          │ • Detail view +      │
│ • Run Scan button   │                          │   fit analysis card  │
└─────────────────────┴─────────────────────────┴──────────────────────┘
```

### Alur: Discovery Scan

```
1. User geocode area ("Menteng, Jakarta") → GET /api/maps/geocode
2. Set radius (500m – 50km), keyword/category, AI mode
3. [Opsional] Pilih produk untuk analisis fit
4. Klik "Run Discovery Scan"
   → GET /api/maps/search?lat=...&lng=...&radius=...&limit=50
   → Backend: 1–3 halaman Google Places API (maks 50 hasil)
   → Setiap hasil: dedup check (sudah di pipeline atau belum)
5. Hasil muncul di peta (markers) + list panel
```

### Alur: Geo Product Fit Analysis

```
[Setelah Discovery Scan berhasil + produk sudah dipilih]

User klik "Analyze Product Fit"
  ↓
Fase 1 — Rule-Based Pre-Score (SEMUA hasil, gratis, instan)
  → category/industry match vs product.target_industry (30 pts)
  → keyword match vs product.keywords[] (25 pts)
  → region match vs product.supported_regions (15 pts)
  → website/phone/email availability (15 pts)
  → rating quality (15 pts)
  → Output: pre_fit_score per bisnis
  ↓
Fase 2 — AI Deep Analysis (TOP-10 pre_score, via AI Routing)
  → Feature route: geo_product_fit_analysis
  → 10 dimensi: industry fit, use-case relevance, pain point,
    company scale, region, buyer persona, budget signal,
    digital maturity, competitor replacement, data confidence
  → Output: fit_score, fit_level, reasoning[], matched_signals[],
    recommended_approach, potential_use_case, risk_flags[]
  ↓
Cache check sebelum AI call:
  → Jika (place_id + product_id + source_hash + product_hash) cocok
  → Gunakan cached result dari geo_product_fit_analyses
  ↓
Results di-merge ke state frontend
  → Markers berubah warna sesuai fit level
  → List menampilkan fit score bar + fit level badge
  → Feedback: "X high-fit businesses found"
```

### Scoring Guide

| Score | Fit Level | Warna Marker | Rekomendasi |
|---|---|---|---|
| 80–100 | High | Emerald green | Prioritas utama |
| 60–79 | Medium | Amber/kuning | Layak follow-up |
| 40–59 | Low | Neutral gray | Butuh info lebih |
| < 40 | Unknown | Default | Tidak direkomendasikan |

### Cache & Cost Control

| Mekanisme | Detail |
|---|---|
| Max AI per run | 10 (default), max 15 |
| Pre-score | Gratis, jalan di semua hasil |
| Cache key | `(place_id, product_id, source_payload_hash, product_payload_hash)` |
| Invalidasi cache | Otomatis saat metadata produk atau data bisnis berubah |
| Trigger | Manual oleh user (tidak ada auto-analyze) |

### Koneksi ke Modul Lain

- **Products** — Pilih produk sebagai basis analisis
- **Lead Management** — Add to Leads dari hasil Maps, membawa fit context
- **Lead Product Match** — Saat lead ditambahkan, `LeadProductMatch` otomatis dibuat dari `GeoProductFitAnalysis`
- **AI Infrastructure** — Routing via `geo_product_fit_analysis` feature route

---

## 5. Modul: Products & ICP

### Apa Ini

Katalog produk platform. Setiap produk memiliki metadata ICP (Ideal Customer Profile) yang digunakan oleh AI untuk product matching, geo fit analysis, dan lead scoring.

### Kapabilitas

- CRUD produk
- **AI Generate** — generate semua metadata dari nama produk
- **AI dari URL** — AI fetch dan analisis website produk
- **AI dari PDF** — upload one-pager PDF, AI ekstrak dan isi metadata
- Status aktif/tidak aktif (hanya produk aktif digunakan di Maps)

### Metadata Produk (12 Field ICP)

| Field | Digunakan Oleh |
|---|---|
| `name` | Semua modul |
| `description` | Product matching, Geo fit |
| `category` | Geo fit pre-score, Product matching |
| `target_industry` | Geo fit pre-score (+30 pts), Product matching |
| `target_company_size` | Product matching |
| `target_pain_points` | Product matching AI prompt |
| `target_buyer_persona` | Product matching AI prompt |
| `ideal_company_profile` | Product matching AI prompt |
| `supported_regions` | Geo fit pre-score (+15 pts) |
| `budget_range` | Product matching |
| `use_cases[]` | Product matching AI, Geo fit AI |
| `competitor_notes` | Product matching AI |
| `keywords[]` | Geo fit pre-score (+25 pts) |

### Alur: AI Generate dari Nama

```
User input Product Name → klik "AI Generate"
  → POST /api/products/ai-generate (JSON: {product_name})
  → Backend: load available categories dari DB
  → AI call (feature: product_metadata_generation)
  → Prompt: nama produk + daftar kategori valid
  → AI returns JSON → normalise → fill 12 fields
  → Frontend: semua field terisi, editable
```

### Alur: AI Generate dari Website URL

```
User input URL referensi → klik "Analyze URL"
  → POST /api/products/ai-generate (JSON: {reference_url, product_name?})
  → Backend: Laravel HTTP client fetch URL (timeout 15s)
  → Strip HTML: hapus script/style, extract meta description + body text
  → Potong ke maks 6.000 karakter
  → AI call dengan konten website sebagai konteks
  → AI returns structured metadata → fill 12 fields
```

### Alur: AI Generate dari PDF

```
User upload PDF one-pager → klik "Analyze PDF"
  → POST /api/products/ai-generate (multipart: {pdf_file, product_name?})
  → Backend: smalot/pdfparser ekstrak teks dari PDF
  → Validasi: minimal 100 karakter teks (PDF bukan scan-only)
  → Potong ke maks 6.000 karakter
  → AI call dengan teks PDF sebagai konteks
  → AI returns structured metadata → fill 12 fields
  
Note: PDF scan/image-only tidak didukung (tidak ada OCR)
Max file size: 10 MB
```

### Prioritas Sumber AI Generate

Ketiga sumber bisa digunakan secara independen atau bersamaan (nama + URL atau nama + PDF). Backend otomatis memilih metode berdasarkan input yang tersedia:

```
Ada pdf_file  → generateFromPdf()
Ada reference_url → generateFromUrl()
Hanya product_name → generate()
```

### Koneksi ke Modul Lain

- **Lead Product Matching** — ICP metadata dikirim ke AI untuk evaluasi BANT
- **Geo Product Fit** — Semua field ICP digunakan dalam prompt analisis
- **Maps Discovery** — Hanya produk status `active` muncul di product selector

---

## 6. Modul: Lead Intelligence Engine

### Apa Ini

Kumpulan service AI yang mengevaluasi, mengkualifikasi, dan mencocokkan lead dengan produk. Semua berjalan via AI Routing yang bisa dikonfigurasi di Settings.

### Sub-Fitur

#### 6a. Lead Scoring

Memberikan skor 0–100 pada setiap lead berdasarkan data yang tersedia.

| Komponen | Bobot |
|---|---|
| Data completeness (email, phone, website) | Rule-based |
| Industry alignment dengan produk | Rule-based |
| Contact count + decision-maker signals | Rule-based |
| Activity + engagement level | Rule-based |
| AI BANT + competitor analysis | AI (feature: `lead_scoring`) |

**Grade:**
- 80–100 → Hot
- 60–79 → Warm
- < 60 → Cold

#### 6b. Lead Qualification

Evaluasi eligibilitas lead untuk masuk pipeline.

```
POST /api/qualification/evaluate
  → Parameter set aktif dimuat dari DB
  → Setiap parameter dievaluasi vs data lead
  → AI evaluasi keseluruhan (feature: qualification_analysis)
  → Output: eligible / potential / not_eligible + reason + risk_flags
```

Status qualification wajib `eligible` atau `potential` untuk push to funnel.

#### 6c. Product Matching (Lead → Products)

Mencocokkan lead yang sudah ada di pipeline dengan semua produk aktif.

```
POST /api/leads/{lead}/match-products
  → Semua produk aktif dimuat
  → Per produk: rule-based pre-score + AI BANT analysis
  → Feature route: product_matching
  → Output: LeadProductMatch per produk
    (match_score, match_level, bant_analysis, reasoning, recommended_approach)
```

Berbeda dengan Geo Product Fit:
- Product Matching: lead (sudah di pipeline) → semua produk
- Geo Product Fit: tempat/bisnis (dari Maps) → satu produk yang dipilih

#### 6d. AI Analysis

Analisis mendalam per lead: company summary, probable needs, urgency level, potential use case, suggested approach.

```
Feature route: lead_analysis
Output: lead_ai_analyses record
```

#### 6e. Meeting Evaluation + Transcript

Evaluasi rekaman meeting atau transkrip untuk signal intent, sentiment, buying signals, objections.

```
Feature routes: meeting_evaluation, transcript_evaluation
Output: lead_ai_evaluations record
```

### Koneksi ke Modul Lain

- **Products** — Metadata ICP produk digunakan sebagai konteks matching
- **Lead Management** — Score dan kualifikasi menjadi syarat push to funnel
- **Geo Product Fit** — Saat lead dari Maps ditambahkan, `LeadProductMatch` langsung dibuat dari fit analysis

---

## 7. Modul: Funnel & Pipeline

### Apa Ini

Manajemen stage perjalanan lead dari discovery hingga closing.

### Kapabilitas

- Konfigurasi stage funnel (nama, sequence)
- Push lead ke stage berikutnya
- Lead hanya bisa masuk jika lolos score + qualification gate
- History stage setiap lead dicatat di `lead_funnel_history`

### Gate Aturan Push ke Funnel

```
lead.lead_score ≥ 60  AND
lead.qualification_status IN ('eligible', 'potential')
```

Jika tidak terpenuhi → tombol push disabled + tooltip alasan.

---

## 8. Modul: WhatsApp

### Apa Ini

Integrasi WhatsApp untuk menghubungi lead langsung dari platform menggunakan Baileys (multi-device).

### Arsitektur

```
Frontend → Backend (Laravel) → WhatsApp Sidecar (Node.js/Baileys, port 3002)
                    ↑
          Webhook: sidecar → backend (QR, status, inbound message)
```

### Kapabilitas

- QR code pairing
- Session management
- Kirim/terima pesan
- Broadcast ke multiple leads
- AI analysis percakapan (feature: `whatsapp_analysis`)
- Tombol "Open WhatsApp" langsung dari tabel Leads

### Koneksi ke Modul Lain

- **Lead Management** — Tombol direct WhatsApp contact dari list leads
- **AI Infrastructure** — AI intent analysis dari percakapan

---

## 9. Modul: AI Infrastructure

### Apa Ini

Sistem routing AI terpusat yang memungkinkan semua fitur menggunakan AI tanpa hardcode provider. Provider, model, dan prioritas dikonfigurasi lewat Settings → AI Defaults.

### Arsitektur

```
Fitur (e.g. geo_product_fit_analysis)
  → AIRoutingService: lookup feature route dari DB
  → AiOrchestrationService.call(featureName, prompt)
     → AIPriorityResolverService: ambil route berurutan (priority 1, 2, 3...)
     → tryModel(route): kirim ke provider spesifik
     ├─ Berhasil → cache result (jika cache_ttl dikonfigurasi) → return
     └─ Gagal → fallback ke route priority berikutnya
  → logRequest ke ai_requests table (usage tracking)
```

### Semua AI Feature Routes

| Feature Key | Digunakan Oleh | Keterangan |
|---|---|---|
| `lead_analysis` | Lead detail page | Analisis mendalam perusahaan |
| `lead_scoring` | Lead rescore | BANT scoring 0–100 |
| `qualification_analysis` | Qualification engine | Evaluasi eligibilitas |
| `product_matching` | Lead product match | BANT + competitor per produk |
| `product_understanding` | AI analysis | Pemahaman produk |
| `icp_generation` | ICP profiles | Generate ICP profile |
| `meeting_evaluation` | Meeting log | Evaluasi hasil meeting |
| `transcript_evaluation` | Transcript | Signal dari transkrip |
| `next_action_recommendation` | Lead detail | Rekomendasi langkah |
| `recommendation_engine` | Dashboard | Rekomendasi pipeline |
| `summary_generation` | Various | Ringkasan konten |
| `revenue_intelligence_analysis` | Revenue | Analisis revenue |
| `whatsapp_analysis` | WhatsApp | Intent percakapan |
| `product_metadata_generation` | Products | Generate ICP metadata |
| `geo_product_fit_analysis` | Maps Discovery | Fit score bisnis vs produk |

### Provider yang Didukung

- **OpenAI** (GPT-4, GPT-3.5)
- **Anthropic** (Claude Opus, Sonnet, Haiku)
- **Google Gemini** (Pro, Flash)

Setiap feature route bisa dikonfigurasi dengan multiple model + priority fallback + max_retries + timeout + cache_ttl.

### Cost Control Mechanisms

| Mekanisme | Implementasi |
|---|---|
| Provider priority | Pakai model murah dulu jika tersedia |
| Collision detection | Skip AI call jika request sama dalam 30 detik |
| Cache TTL | Per feature route, bisa dikonfigurasi |
| Geo Fit batching | Maks 10–15 AI calls per run Maps |
| Rule-based pre-filter | Semua fitur pakai rule-based dulu sebelum AI |

---

## 10. Modul: Settings & Konfigurasi

### Apa Ini

Pusat konfigurasi seluruh platform.

### Sub-Section

| Section | Isi |
|---|---|
| **Users & Roles** | CRUD user, role assignment, permission management |
| **AI Defaults** | Konfigurasi feature routes, provider, model, priority |
| **Integrations** | Google Maps API key, Maps enabled/disabled, default center |
| **ICP Profiles** | Kelola profil ICP global |
| **Webhooks** | Konfigurasi outbound webhooks |
| **Environment** | Variabel environment |
| **Security** | Password policy, session management |
| **Notifications** | Preferensi notifikasi per user |
| **Backup** | Backup database |

### Public Settings Endpoint

`GET /api/settings/public` — dikonsumsi frontend tanpa auth untuk:
- `GOOGLE_MAPS_BROWSER_API_KEY` → digunakan MapPage untuk render Google Maps
- `GOOGLE_MAPS_ENABLED` → tampilkan atau sembunyikan Maps
- `GOOGLE_MAPS_DEFAULT_CENTER_LAT/LNG` → default center peta

---

## 11. Modul: Audit Logs

### Apa Ini

Pencatatan semua aksi penting dalam sistem untuk keperluan compliance dan debugging.

### Yang Dicatat

- Login / logout / failed login
- CRUD pada semua entitas utama
- AI calls (feature, model, user)
- Map discovery run
- Geo product fit analysis run
- Lead push to funnel
- Permission denied attempts

### Format Record

Setiap audit log menyimpan: `action`, `module`, `record_type`, `record_id`, `before_value`, `after_value`, `status`, `metadata_json`, `ip_address`, `user_agent`.

### Export

Audit logs bisa diexport ke CSV/XLSX/TXT langsung dari UI.

---

## 12. Peta Koneksi Antar Fitur

```
                    ┌─────────────────┐
                    │   AI Infrastructure│
                    │  (15 feature routes)│
                    └────────┬────────┘
                             │ digunakan oleh semua fitur AI
         ┌───────────────────┼─────────────────────┐
         │                   │                      │
    ┌────▼────┐         ┌────▼─────┐         ┌─────▼────┐
    │ Products │◄────────│  Lead    │────────►│  Funnel  │
    │  & ICP   │         │ Intelligence│        │ Pipeline │
    │          │         │ Engine    │         │          │
    └────┬─────┘         └────┬─────┘         └──────────┘
         │                    │
         │ ICP metadata        │ score + qualification
         │ keywords/industry   │ gate untuk push
         ▼                    ▼
    ┌────────────────────────────────┐
    │  Maps & Territory              │
    │  Geo Product Fit Intelligence  │◄──── Google Places API
    │                                │
    │  1. Discovery Scan             │
    │  2. Rule Pre-score (gratis)    │
    │  3. AI Fit Analysis (top 10)   │
    └────────────┬───────────────────┘
                 │ Add to Leads
                 │ (bawa fit context)
                 ▼
    ┌────────────────────┐      ┌──────────────┐
    │   Lead Management  │◄────►│  WhatsApp    │
    │                    │      │  Integration │
    │ • Dedup check      │      └──────────────┘
    │ • Score & qualify  │
    │ • Product match    │
    │ • Activity log     │
    └────────────────────┘
                 │
                 ▼
    ┌────────────────────┐
    │   Audit Logs       │
    │   (semua aksi)     │
    └────────────────────┘
```

### Koneksi Kritis: Products ↔ Maps ↔ Leads

Ini adalah alur utama yang menghubungkan tiga modul inti:

```
Products (ICP Metadata)
    ↓ dipilih di Maps
Maps Discovery (temukan bisnis)
    ↓ Geo Product Fit Analysis
    ↓ fit_score + reasoning per bisnis
    ↓ user klik "Add to Leads"
Lead (dibuat dengan fit context)
    ↓ LeadProductMatch otomatis dibuat
Lead Product Matching (tersedia di detail lead)
```

### Koneksi: LeadProductMatch dari Dua Sumber

| Sumber | Method | Trigger | Scope |
|---|---|---|---|
| Maps → Add to Leads | `GeoProductFitAnalysis` → `LeadProductMatch` | Saat add to leads dengan produk dipilih | 1 produk yang dipilih |
| Lead detail → Match Products | `LeadProductMatchingService` | Manual atau otomatis | Semua produk aktif |

Kedua sumber menghasilkan record di tabel `lead_product_matches` yang sama, sehingga tampil konsisten di detail lead.

---

## 13. Alur Kerja End-to-End

### Workflow A: Discovery → Qualified Lead → Pipeline

```
1. Buka Maps & Territory
2. Pilih produk target (e.g. "Enterprise ERP Solution")
3. Geocode area target (e.g. "Kawasan Industri Cikarang")
4. Set radius 10 km, kategori "Manufacturing"
5. Run Discovery Scan → dapat 35 bisnis
6. Klik "Analyze Product Fit"
   → Rule pre-score semua 35
   → AI analisis 10 terbaik
7. Filter: "High Fit only" → tersisa 4 bisnis
8. Klik bisnis dengan skor 87 → buka detail
   → Lihat reasoning: "Kategori manufacturing cocok, ada website, 
     rating tinggi, region Jawa Barat sesuai target"
   → Recommended approach: "Cold call + demo ERP modul inventory"
9. Klik "Add to Leads Pipeline"
   → Lead dibuat
   → LeadProductMatch dibuat (fit_score: 87, match_level: strong)
10. Buka Lead detail
11. Klik "Re-Score" → AI scoring BANT
    → Score: 72 (Warm)
12. Klik "Qualify" → AI qualification
    → Status: eligible
13. Klik "Push to Funnel" → Lead masuk pipeline stage 1
14. Log aktivitas: "Call scheduled"
15. Kirim WhatsApp introduction
```

### Workflow B: Onboard Produk Baru dengan AI

```
1. Buka Products → Add Product
2. Input nama: "Cloud HRM Solusi Indonesia"
3. Option A — Generate dari nama:
   → Klik "AI Generate"
   → AI isi 12 field metadata
4. Option B — Generate dari website:
   → Input URL: https://www.hrmsolutions.id
   → Klik "Analyze URL"
   → AI fetch, parse, isi field dari konten website
5. Option C — Generate dari PDF:
   → Upload "HRM_OnePageR_2026.pdf"
   → Klik "Analyze PDF"
   → AI ekstrak teks PDF, isi field
6. Review semua field (bisa edit manual)
7. Klik "Create Product" → tersimpan
8. Produk kini tersedia di Maps product selector
   dan Product Matching engine
```

### Workflow C: Review Queue Lead Baru

```
1. Lead baru masuk (dari Maps atau manual)
2. Notification di dashboard (jika dikonfigurasi)
3. Buka Leads → filter "pending" qualification
4. Klik lead → detail page
5. Lihat AI Analysis: company_summary, probable_needs
6. Klik "Qualify" → AI evaluasi
7. Jika result "not_eligible": tambahkan note, archive
8. Jika "eligible": review product matches
9. Push to funnel → masuk pipeline
10. Assign ke AE → log aktivitas "Handoff"
```

---

## 14. Tabel Referensi API

### Lead Management

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/leads` | List leads dengan filter + pagination |
| POST | `/api/leads` | Create lead manual |
| GET | `/api/leads/{id}` | Detail lead |
| PUT | `/api/leads/{id}` | Update lead |
| DELETE | `/api/leads/{id}` | Hapus lead |
| GET | `/api/leads/export` | Export CSV |
| POST | `/api/leads/{id}/push-to-funnel` | Push ke funnel stage |
| POST | `/api/leads/{id}/rescore` | Trigger re-scoring AI |
| POST | `/api/leads/{id}/activities` | Log aktivitas |
| POST | `/api/leads/{id}/meetings` | Log meeting |
| POST | `/api/leads/{id}/contacts` | Tambah kontak |
| POST | `/api/leads/{id}/match-products` | Jalankan product matching |

### Maps & Territory

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/maps/geocode?query=` | Konversi nama area → koordinat |
| GET | `/api/maps/categories` | Daftar kategori dari DB |
| GET | `/api/maps/search` | Nearby / text search |
| GET | `/api/maps/place-details/{placeId}` | Detail bisnis |
| POST | `/api/maps/geo-product-fit/analyze` | Batch fit analysis |
| GET | `/api/maps/geo-product-fit/results` | Ambil cached results |
| POST | `/api/maps/add-to-leads` | Tambah ke leads |
| GET | `/api/maps/search-history` | Riwayat pencarian |

### Products

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/products` | List produk (`?status=active` filter) |
| POST | `/api/products` | Create produk |
| PUT | `/api/products/{id}` | Update produk |
| DELETE | `/api/products/{id}` | Hapus produk |
| POST | `/api/products/ai-generate` | AI generate metadata (name/URL/PDF) |

### AI & Settings

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/settings/public` | Public settings (Maps key, dll) |
| GET | `/api/ai/providers` | Daftar AI providers |
| GET | `/api/ai/feature-routes` | Konfigurasi feature routes |
| POST | `/api/ai/feature-routes` | Update feature route |
| GET | `/api/audit-logs` | Daftar audit log |

---

## 15. Tabel AI Feature Routes

Konfigurasi di **Settings → AI Defaults**. Setiap fitur bisa punya multiple model dengan priority fallback.

| Feature Key | Modul | Kompleksitas | Rekomendasi Model |
|---|---|---|---|
| `geo_product_fit_analysis` | Maps | Medium | Gemini Flash / GPT-3.5 |
| `product_metadata_generation` | Products | Low | GPT-3.5 / Gemini Flash |
| `product_matching` | Lead Intelligence | High | GPT-4 / Claude Sonnet |
| `lead_scoring` | Lead Intelligence | Medium | GPT-3.5 / Gemini Pro |
| `qualification_analysis` | Lead Intelligence | High | GPT-4 / Claude Sonnet |
| `lead_analysis` | Lead Intelligence | High | GPT-4 / Claude Opus |
| `icp_generation` | ICP Profiles | Medium | GPT-3.5 / Gemini Pro |
| `meeting_evaluation` | Lead Intelligence | High | Claude Sonnet / GPT-4 |
| `transcript_evaluation` | Lead Intelligence | High | Claude Sonnet / GPT-4 |
| `whatsapp_analysis` | WhatsApp | Low | GPT-3.5 / Gemini Flash |
| `summary_generation` | Various | Low | GPT-3.5 / Gemini Flash |

---

## 16. Changelog Spesifikasi

### 2026-05-12 — v1.0 (Dokumen dibuat)

Dokumen spesifikasi platform pertama dibuat mencakup semua fitur yang telah diimplementasikan hingga Phase 16.

### 2026-05-12 — Products: AI dari URL dan PDF

- Tambah kapabilitas `generateFromUrl()` — AI analisis website produk
- Tambah kapabilitas `generateFromPdf()` — AI analisis PDF one-pager (smalot/pdfparser)
- Endpoint `/api/products/ai-generate` kini support tiga source mode
- Frontend: tambah "AI Reference Source" card di form produk

### 2026-05-12 — Geo-Based Product Fit Intelligence (Phase 16)

- Tambah product selector di Maps Discovery
- Implementasi two-phase scoring: rule pre-score (semua) + AI deep (top 10)
- Marker warna berdasarkan fit level
- Cache hasil di `geo_product_fit_analyses`
- Add to Leads membawa product-fit context ke `LeadProductMatch`

### 2026-05-12 — Fixes

- `TableShell` overflow-x-auto (tabel responsif)
- Leads page: compact Actions cell, hapus verbose Score text
- Backend Dockerfile: hapus `postgresql-server-dev-all` (reduce build size 1 GB)

---

*Dokumen ini dikelola bersama kode. Setiap improvisasi fitur harus disertai update pada bagian yang relevan di dokumen ini.*
