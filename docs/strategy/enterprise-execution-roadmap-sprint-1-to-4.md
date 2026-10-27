# Rencana Eksekusi & Roadmap Implementasi Leadsy Enterprise (Sprint 1 – 4)

**Dokumen Acuan:** [Laporan Audit Komprehensif Leadsy Platform (v1.31.0)](file:///Users/m61pd0625/Downloads/leadsy_comprehensive_audit_report.pdf)  
**Tujuan Strategis:** Mentransformasi Leadsy dari CRM internal menjadi *Enterprise-Grade Revenue & Presales Operating System* yang andal, scalable, patuh hukum (UU PDP), dan terotomasi secara cerdas.  
**Durasi Total:** 8 Minggu (4 Sprint @ 2 Minggu per Sprint)  
**Status Realisasi Saat Ini:**  
- **Sprint 1 (Reliabilitas Core & Kepatuhan PDP):** ✅ **SELESAI (100%)** — Commit `338d687` & `e7e8a7e`
- **Sprint 2 (RevOps Velocity & Queue Governance):** ✅ **SELESAI (100%)** — Commit `f4f4165`
- **Sprint 3 (Omnichannel & Autonomous AI):** 🚀 **SEDANG BERJALAN (IN PROGRESS)**
- **Sprint 4 (Enterprise Scale & Governance):** ⏳ Terjadwal

---

## 1. Timeline & Phasing Overview

```mermaid
gantt
    title Roadmap Eksekusi Leadsy Enterprise (8 Minggu)
    dateFormat  YYYY-MM-DD
    section Phase 1: Reliabilitas & Kestabilan Core (COMPLETED)
    Server-Sent Events (SSE) AI Pipeline     :done, p1_1, 2026-11-02, 2026-11-05
    Zero-Downtime K3s Pod Hardening         :done, p1_2, 2026-11-04, 2026-11-05
    1-Click PSA Est to Quote Converter       :done, p1_3, 2026-11-05, 2026-11-06
    PII Data Masking Gateway (UU PDP)       :done, p1_4, 2026-11-05, 2026-11-06

    section Phase 2: RevOps & Queue Governance (COMPLETED)
    Semantic Caching di Redis (Vector/Hash)  :done, p2_1, 2026-11-07, 2026-11-08
    Queue & DLQ Inspector di Admin           :done, p2_2, 2026-11-08, 2026-11-09
    Predictive Deal Slippage Engine          :done, p2_3, 2026-11-09, 2026-11-10
    Automated SOW & BAST Doc Assembler       :done, p2_4, 2026-11-10, 2026-11-11

    section Phase 3: Omnichannel & AI Copilot (COMPLETED)
    Multi-Touch Sales Cadence Engine        :done, p3_1, 2026-11-12, 2026-11-14
    Unified Omnichannel Inbox (/inbox)       :done, p3_2, 2026-11-14, 2026-11-15
    In-Context Sales Copilot Drawer          :done, p3_3, 2026-11-15, 2026-11-16
    Autonomous AI SDR Prospecting Agent      :done, p3_4, 2026-11-16, 2026-11-17

    section Phase 4: Enterprise Scale & Governance (ACTIVE)
    Resource Capacity Gantt Matrix (PSA)     :active, p4_1, 2026-11-18, 6d
    Enterprise SSO (Azure AD / Okta / SAML)  :p4_2, 2026-11-24, 5d
    PSrE Legal Digital Signature (Privy/VIDA):p4_3, 2026-11-29, 5d
    Offline-First Field Sales PWA Sync       :p4_4, 2026-12-04, 6d
```

---

## 2. Rincian Eksekusi per Fase Sprint

### 🚀 FASE 1 (Sprint 1) — Reliabilitas Core & Fondasi Keamanan [SELESAI ✅]
**Fokus:** Menghilangkan timeout/error network, memastikan zero-downtime saat deployment, menghubungkan presales ke sales, dan mengamankan privasi data.

#### Task 1.1: Server-Sent Events (SSE) Real-time Stream untuk Pipeline AI
- **Masalah Diselesaikan:** Menghilangkan polling HTTP (interval 2s) yang rentan gateway timeout (502/504) pada reverse proxy/Cloudflare.
- **Backend Deliverables:**
  - Endpoint stream SSE: `GET /api/leads/{id}/ai-screening/stream` dan `GET /api/products/ai-generate/stream/{jobId}` menggunakan Laravel EventStream (`Symfony\Component\HttpFoundation\StreamedResponse`).
  - Broadcast progres tiap stage (misal: `event: stage_started`, `event: stage_completed`, `event: error`).
- **Frontend Deliverables:**
  - Buat hook `useEventSource` di `frontend/lib/hooks/use-event-source.ts`.
  - Update `runAiScreening` di `frontend/lib/aiScreeningPipeline.ts` dan form auto-profile produk di `frontend/app/products/[id]/page.tsx`.
- **Kriteria Selesai (DoD):**
  - AI Screening 9-stage dan Product Scraping berjalan mulus tanpa HTTP polling berulang.
  - Beban request HTTP ke server berkurang >85%.

#### Task 1.2: Zero-Downtime Deployment Pod Hardening di K3s
- **Masalah Diselesaikan:** Menghilangkan respons error *"The server is not responding right now"* saat GitHub Actions melakukan rollout commit baru.
- **DevOps Deliverables:**
  - Update `k8s/leadsy-prod-frontend.yaml` dan backend deployment:
    ```yaml
    lifecycle:
      preStop:
        exec:
          command: ["/bin/sh", "-c", "sleep 15"]
    terminationGracePeriodSeconds: 45
    readinessProbe:
      httpGet:
        path: /api/health
        port: 8000
      initialDelaySeconds: 10
      periodSeconds: 5
    ```
- **Kriteria Selesai (DoD):**
  - Push commit ke branch `main` tidak menghasilkan downtime atau koneksi terputus sama sekali pada browser pengguna yang aktif.

#### Task 1.3: Jembatan 1-Klik Konversi Estimasi PSA ke Quotation Komersial
- **Masalah Diselesaikan:** Menghapus proses manual salin-tempel dari scope teknis presales ke dokumen penawaran harga sales.
- **Deliverables:**
  - Backend: `POST /api/professional-services/estimations/{id}/convert-to-quotation`.
  - Frontend: Tombol aksi *Convert to Quotation* di `/professional-services/estimations/[id]` yang memunculkan modal pratinjau margin dan klausul komersial.
- **Kriteria Selesai (DoD):**
  - Estimasi Man-Days yang disetujui otomatis bertransformasi menjadi line items quotation lengkap dengan rate card dan pajak terhitung.

#### Task 1.4: PII Masking & Sanitizer Gateway untuk LLM (Kepatuhan UU PDP)
- **Masalah Diselesaikan:** Mencegah kebocoran data rahasia klien (NIK, rekening bank, nomor pribadi direksi) ke server LLM pihak ketiga luar negeri.
- **Deliverables:**
  - Middleware / Interceptor pada `AiOrchestrationService` yang melakukan regex anonymization (menyamarkan nama, no telp, email, nomor rekening menjadi token seperti `[PERSON_1]`, `[PHONE_1]`, `[BANK_ACCOUNT_1]`).
  - De-anonymize kembali saat respons LLM diterima sebelum disimpan ke database Leadsy.
- **Kriteria Selesai (DoD):**
  - Payload prompt ke BytePlus/OpenAI bersih dari identitas personal riil tanpa mengurangi akurasi analisis AI.

---

### 📈 FASE 2 (Sprint 2) — RevOps Velocity & Queue Governance [SELESAI ✅]
**Fokus:** Optimasi biaya AI, transparansi antrean background worker, dan kecerdasan prediktif sales deal.

#### Task 2.1: Semantic Caching di Redis untuk Scraping & Profiling
- **Deliverables:**
  - Service `SemanticCacheService` di backend menggunakan hashing URL + nama perusahaan (TTL 14 hari).
  - Melewati pemanggilan AI jika domain yang sama sudah pernah di-profiling dalam 14 hari terakhir kecuali dipicu dengan flag `--force-refresh`.
- **Kriteria Selesai (DoD):**
  - Latensi auto-profiling untuk prospek yang pernah discrape turun dari 25 detik ke < 1 detik.
  - Penghematan konsumsi token BytePlus/OpenAI sebesar 40–60%.

#### Task 2.2: Queue & Dead-Letter Queue (DLQ) Inspector di Admin Console
- **Deliverables:**
  - Halaman monitoring baru di `/admin/infrastructure` sub-tab *Background Jobs*.
  - Menampilkan metrik antrean aktif, job tertunda, dan daftar *Failed Jobs* dengan pesan error trace.
  - Tombol aksi: *Retry Job*, *Retry All Failed*, dan *Purge Stale Cache*.
- **Kriteria Selesai (DoD):**
  - Superadmin dapat mendiagnosis dan memulihkan job AI yang macet dalam 1 klik tanpa akses SSH/terminal server.

#### Task 2.3: Predictive Deal Slippage & Win Probability Engine
- **Deliverables:**
  - Service `DealProbabilityEvaluationService`: Menghitung skor probabilitas menang (0–100%) berdasarkan skor BANTC, deal velocity, dan tren komunikasi.
  - Indikator peringatan dini (*Slippage Warning Badge*) pada papan Kanban Lead Pipeline (`/leads`) untuk deal yang berisiko meleset dari kuartal berjalan.
- **Kriteria Selesai (DoD):**
  - Sales manajer mendapatkan visualisasi instan mengenai pipeline yang sehat vs pipeline yang macet (*at-risk*).

#### Task 2.4: Automated SOW & BAST Document Assembler
- **Deliverables:**
  - Template generator dokumen Word/PDF resmi berstandar perusahaan yang merangkum hasil Discovery Workspace, Man-Days PSA, daftar deliverable, dan klausul hukum BAST.
  - Integrasi tombol *Generate SOW Document* dan *Generate BAST Document*.
- **Kriteria Selesai (DoD):**
  - Dokumen serah terima dan perjanjian kerja siap cetak dan tandatangan dihasilkan otomatis dalam format PDF.

---

### 💬 FASE 3 (Sprint 3) — Omnichannel Sales Execution & Autonomous AI [SELESAI ✅]
**Fokus:** Menyatukan kanal komunikasi sales, mengotomasi follow-up terjadwal, dan menghadirkan asisten AI proaktif.

#### Task 3.1: Multi-Touch Sales Cadence / Sequence Engine
- **Deliverables:**
  - Entitas skema database: `sales_sequences`, `sales_sequence_steps`, `lead_sequence_enrollments`.
  - Mesin eksekusi terjadwal (Scheduler harian) yang memicu langkah outreach:
    - Step 1 (Hari 0): Kirim pesan template WhatsApp personal.
    - Step 2 (Hari 2): Jika tidak ada respon, jadwalkan tugas panggilan telepon BANTC.
    - Step 3 (Hari 5): Kirim email perkenalan profil solusi.
- **Kriteria Selesai (DoD):**
  - Sales rep dapat mendaftarkan lead ke dalam sequence dan sistem mengeksekusi langkah secara otomatis.

#### Task 3.2: Unified Omnichannel Inbox (`/inbox`)
- **Deliverables:**
  - Antarmuka satu pintu di frontend yang menggabungkan percakapan WhatsApp lokal Baileys, akun BSP Qontak, mention Lark, dan email sales.
  - Fitur kolaborasi tim: Catatan internal (*private comments*) antar sales dan manajer pada thread chat yang sama.
- **Kriteria Selesai (DoD):**
  - Tidak ada lagi perpindahan tab/aplikasi untuk membalas prospek; semua komunikasi terekam di riwayat aktivitas lead.

#### Task 3.3: In-Context Sales Copilot Drawer di Lead Details
- **Deliverables:**
  - Komponen *Copilot Sidecar* yang dapat dibuka/tutup di sisi kanan halaman `/leads/[id]`.
  - Berinteraksi langsung dengan model AI yang memegang seluruh memori lead (transkrip rapat, profil perusahaan, kendala teknis discovery).
  - Prompt shortcut instan: *"Buatkan strategi counter objection harga"*, *"Ringkas kebutuhan teknis untuk presales"*, *"Draft pesan WhatsApp tindak lanjut"*.
- **Kriteria Selesai (DoD):**
  - Respons copilot relevan 100% terhadap konteks spesifik lead yang sedang dibuka.

#### Task 3.4: Autonomous AI SDR (Background Prospecting & Signal Ingestion)
- **Deliverables:**
  - Command terjadwal `leadsy:autonomous-prospecting-scan`: Memindai direktori target industri dan kata kunci wilayah tertentu.
  - Ekstraksi sinyal niat beli (berita ekspansi bisnis, pembukaan pabrik, lowongan kerja IT/manajemen).
  - Otomatis memasukkan kandidat lead berpotensi tinggi ke status *Discovery Ingestion* untuk ditinjau oleh tim sales.
- **Kriteria Selesai (DoD):**
  - Prospek baru berkualitas masuk ke pipeline secara otomatis setiap minggu tanpa input manual.

---

### 🏢 FASE 4 (Sprint 4: Minggu 7–8) — Enterprise Governance & Skalabilitas Sistem [SIAP DIKERJAKAN 🚀]
**Fokus:** Kesiapan integrasi korporat skala besar, sertifikasi hukum, dan operasional lapangan offline.

#### Task 4.1: Resource Capacity Gantt Matrix & Skill Tagging (PSA Enterprise)
- **Deliverables:**
  - Tampilan visual beban kerja tim presales (`/professional-services/psa-dashboard`): Heatmap alokasi jam kerja per minggu, tingkat utilitas, dan kapasitas cadangan (*bench*).
  - Fitur rekomendasi arsitek terbaik berdasarkan kecocokan skill proyek.
- **Kriteria Selesai (DoD):**
  - Mencegah *overallocated* pada arsitek presales dan mengoptimalkan utilitas staf delivery.

#### Task 4.2: Enterprise SSO Federation (Microsoft Azure AD / Okta / Google Workspace)
- **Deliverables:**
  - Modul autentikasi SAML 2.0 / OIDC terintegrasi di Laravel Sanctum & Next.js.
  - Konfigurasi mandiri di menu Tenant 360 Admin (`/admin/tenants/[id]`) untuk pemetaan grup IDP ke Role Leadsy.
- **Kriteria Selesai (DoD):**
  - Klien korporat dapat mengelola hak akses karyawan langsung melalui identity provider perusahaan mereka.

#### Task 4.3: Integrasi Legal Digital Signature Resmi Indonesia (PSrE)
- **Deliverables:**
  - Integrasi API ke penyedia PSrE terakreditasi Kominfo (PrivyID / Peruri / VIDA).
  - Status pelacakan envelope digital signature langsung di tab dokumen komersial O2C.
- **Kriteria Selesai (DoD):**
  - Dokumen SPK dan Quotation yang ditandatangani memiliki sertifikat digital sah berkekuatan hukum penuh di Indonesia.

#### Task 4.4: Offline-First Field Sales PWA Sync Engine
- **Deliverables:**
  - Integrasi Service Worker dan penyimpanan lokal IndexedDB pada frontend Next.js.
  - Kemampuan mencatat log kunjungan lapangan (*Sales Visit Check-in*), mengunggah foto geotagged bukti kunjungan, dan mencatat formulir discovery tanpa internet.
  - Auto-sync saat perangkat mendeteksi koneksi online.
- **Kriteria Selesai (DoD):**
  - Sales lapangan tetap produktif saat berada di kawasan industri atau area perkebunan terpencil tanpa hambatan jaringan.

---

## 3. Matriks Alokasi Tim & Kebutuhan Resource

| Peran | Alokasi Beban | Tanggung Jawab Utama |
| :--- | :---: | :--- |
| **Backend Engineer** | 100% | Endpoint SSE, Semantic Caching Redis, Queue & DLQ API, EDA Event Bus, PII Masker, Cadence Engine. |
| **Frontend Engineer** | 100% | SSE Stream consumer, Omnichannel Inbox UI, Copilot Drawer, 1-Click Converter Modal, PWA Offline-Sync. |
| **DevOps / Infra** | 50% | K3s Zero-Downtime Pod Tuning, Redis Vector Setup, Database Table Partitioning, CI/CD Pipeline. |
| **QA / Tester** | 50% | Verifikasi End-to-End, load testing SSE concurrent streams, uji kompatibilitas UU PDP data masking. |

---

## 4. Evaluasi Risiko & Mitigasi

| Risiko Potensial | Tingkat | Rencana Mitigasi |
| :--- | :---: | :--- |
| **Koneksi SSE Terputus pada Jaringan Mobile Lemah** | Sedang | Terapkan auto-reconnect dengan *exponential backoff* dan simpan *last-event-id* agar stream melanjutkan event yang terlewat. |
| **Biaya Token AI Meningkat saat Cadence Otomatis Berjalan** | Sedang | Batasi kuota token harian per tenant melalui *Tenant AI Budget Cap* dan prioritaskan model ringan (Doubao 1.5 Lite / Qwen 2.5) untuk tugas rutin. |
| **Nomor WhatsApp Terblokir saat Menjalankan Cadence Masif** | Tinggi | Terapkan *smart throttling* (jeda acak 30–90 detik antar pesan) dan gunakan WhatsApp Official BSP (Mekari Qontak) untuk outreach skala besar. |
