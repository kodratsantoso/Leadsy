# Prompt Template: Claude Presentation Deck Generator for Leadsy
**Dokumen Panduan & Template Prompt Siap Pakai untuk Claude AI**  
**Kegunaan:** Membuat materi presentasi eksekutif (Pitch Deck / Product Deck / Sales Deck) untuk produk Leadsy.

---

## Petunjuk Penggunaan
1. Buka akun **Claude (Claude 3.5 Sonnet atau Claude Opus)** di [claude.ai](https://claude.ai).
2. Salin seluruh teks di dalam blok prompt di bawah ini.
3. Tempelkan (*paste*) ke percakapan Claude dan kirimkan.
4. Claude akan menghasilkan slide presentasi lengkap berstandar eksekutif (bisa dalam format **Marp Markdown**, **HTML Slides**, atau struktur presentasi PowerPoint).

---

```markdown
# PROMPT UNTUK CLAUDE AI:

Halo Claude, bertindaklah sebagai Principal Enterprise Product Strategist dan Chief Marketing Officer kelas dunia. 

Tolong buatkan materi file presentasi (Presentation Pitch Deck) profesional, komprehensif, dan persuasif mengenai produk B2B SaaS bernama "Leadsy". 

Presentasi ini ditujukan kepada audiens tingkat C-Level (CEO, CRO, VP of Sales, Head of Digital Transformation, dan Investor).

Format yang diinginkan adalah format Markdown Marp (atau HTML/CSS Slide Deck) yang siap dikonversi ke PowerPoint / PDF, lengkap dengan:
- Judul Slide & Subjudul yang menarik.
- Poin-poin narasi berbobot (*high-impact bullet points*).
- Rancangan visual/layout cue (misal: 2-column comparison, metric cards, process diagram).
- Speaker Notes lengkap di setiap slide untuk panduan presenter.

Berikut adalah profil dan arsitektur produk Leadsy yang wajib Anda masukkan ke dalam presentasi:

---

### PROFIL PRODUK: LEADSY
- Tagline: "Autonomous Enterprise Revenue & Omnichannel Intelligence Platform"
- Definisi Singkat: Leadsy adalah platform SaaS pendapatan terpadu yang menjembatani kesenjangan antara penemuan prospek berbasis wilayah (Map POI Discovery), percakapan otomatis AI SDR, manajemen pipeline CRM, siklus keuangan Order-to-Cash (Quotation, Sales Order, Invoice, Pajak PPN/PPh), hingga retensi dan perpanjangan kontrak pelanggan (Customer Success & Renewals).
- Target Pasar: Perusahaan B2B Enterprise, Distributor, Logistik, Layanan Korporat, Perusahaan Teknologi, dan Multi-Branch Enterprise.

### 5 PILAR KEUNGGULAN UTAMA LEADSY (KEY VALUE PILLARS):
1. Territory & Map Sourcing Engine:
   - Terintegrasi dengan Google Maps API dan Lusha Contact Enrichment.
   - Fitur Draggable Territory Center Marker untuk mengeksplorasi wilayah target baru dalam hitungan detik.
   - Mengubah tempat usaha di peta menjadi calon pelanggan di CRM hanya dengan 1-klik.

2. Unified Omnichannel Inbox & Autonomous AI SDR:
   - Integrasi WhatsApp resmi (Mekari Qontak) dan operasional lapangan (WhatsApp Baileys Engine).
   - Database riil menyimpan seluruh riwayat percakapan secara permanen (mencegah data hilang saat tim sales resign).
   - AI SDR Copilot otomatis mengevaluasi kualifikasi BANTC (Budget, Authority, Need, Timeline, Context) dan memberikan saran balasan instan.

3. Full Lifecycle Order-to-Cash (O2C):
   - Tidak berhenti di tahap deal "Closed Won".
   - Terintegrasi langsung dengan penerbitan Quotation, Sales Order, Faktur Pajak (PPN 11%, PPh 23), dan pelacakan invoice.
   - Menghilangkan friksi komunikasi antara tim Sales dan tim Finance.

4. Predictive Customer Success & Renewal Intelligence:
   - Customer Health Score Matrix (Healthy, Warning, Critical) secara otomatis mendeteksi akun pelanggan yang berisiko churn.
   - Mesin kalkulasi Renewal Intelligence mendeteksi kontrak yang mendekati jatuh tempo dan otomatis menghitung potensi pendapatan berulang (ARR/MRR).

5. Enterprise Governance & Multi-Provider AI Engine:
   - Multi-tenant ready, Role-Based Access Control (RBAC), dan audit log audit trail.
   - Manajemen AI terpusat (OpenAI, DeepSeek, Anthropic, Gemini) dengan enkripsi masking API key dan kontrol prompt versioning.

---

### STRUKTUR PRESENTASI YANG DIMINTA (MINIMAL 12 - 15 SLIDE):

1. Slide 1: Cover Slide
   - Judul: "LEADSY: The Autonomous Enterprise Revenue Engine"
   - Subjudul: Menghubungkan Territory Discovery, AI Omnichannel, CRM, dan Order-to-Cash ke Dalam Satu Ekosistem Pendapatan Terpadu.
   - Meta: Presenter, Tanggal, Versi.

2. Slide 2: The Core Problem (B2B Revenue Fragmentation)
   - Tantangan enterprise: 70% waktu sales habis untuk administrasi manual, data obrolan WhatsApp tim sales terpecah dan hilang, gap antara Sales dan Finance saat closing, serta churn pelanggan karena tidak ada early warning.

3. Slide 3: The Solution (Enter Leadsy)
   - Memperkenalkan Leadsy sebagai platform orkestrasi siklus pendapatan end-to-end tanpa data silos.

4. Slide 4: Arsitektur Ekosistem Pendapatan (End-to-End Workflow Diagram)
   - Visualisasi alur: Map POI Sourcing → AI Qualification → Omnichannel Engagement → Deal Negotiation → Order-to-Cash → Customer Success & Renewals.

5. Slide 5: Pillar 1 - Geospatial Territory & Map Discovery
   - Fitur radius search, draggable center marker, dan konversi instan Google Places ke Leads database.

6. Slide 6: Pillar 2 - Unified Omnichannel Inbox & Autonomous AI SDR
   - Dual WhatsApp engine (Mekari Qontak + Baileys), evaluasi BANTC otomatis, dan asisten balasan pintar 24/7.

7. Slide 7: Pillar 3 - CRM Pipeline & Presales Technical Validation
   - Visual funnel stages, scoring matrix, dan kolaborasi Presales Solution Architect (Technical Win & POC success rate).

8. Slide 8: Pillar 4 - Seamless Order-to-Cash (O2C)
   - Pembuatan Quotation, Sales Order, penghitungan pajak otomatis (PPN/PPh), dan penerbitan invoice langsung dari lead detail.

9. Slide 9: Pillar 5 - Customer Success & Predictive Renewal Intelligence
   - Health Matrix (Healthy, Warning, Critical), deteksi kontrak kedaluwarsa, dan pencegahan churn proaktif.

10. Slide 10: Enterprise Governance, Security, & AI Engine
    - Multi-provider AI (DeepSeek, OpenAI, Anthropic), masked credentials, RBAC, dan audit trail compliance.

11. Slide 11: Business Impact & Measurable ROI Metrics
    - Metrik perbandingan: 3.5x faster qualification, 80% time saved on territory sourcing, 100% conversation retention, dan <15 menit quote-to-order.

12. Slide 12: Live Dashboard & Matrix Experience
    - Fitur interaktif: Lead Geography Matrix 540px Full-Width, Target Revenue Quota Cascading, dan Pipeline Health radial chart.

13. Slide 13: Enterprise Implementation & Deployment
    - K3s Kubernetes microservices, on-premise/hybrid ready, persistent volume protection, zero downtime rolling update.

14. Slide 14: Closing & Strategic Call-to-Action (CTA)
    - Ringkasan nilai, langkah pilot project, dan kontak demonstrasi.

---

Tolong buatkan slide deck ini sekarang dengan gaya bahasa eksekutif yang tajam, percaya diri, elegan, dan berorientasi pada ROI bisnis nyata!
```
