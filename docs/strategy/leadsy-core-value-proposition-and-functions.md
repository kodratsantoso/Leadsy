# Core Value Proposition & Functional Breakdown: Leadsy
**Strategic Product Definition & Business Impact Whitepaper**  
**Versi:** v1.2 (Oktober 2026)

---

## 1. Value Proposition (Mengapa Leadsy Dibutuhkan Enterprise?)

Dalam dunia B2B Enterprise, kendala terbesar tim penjualan adalah **fragmentasi data (data silos)** dan **pekerjaan manual yang lambat**:
- Tim lapangan mencari prospek secara manual tanpa panduan geospasial teritori.
- Komunikasi WhatsApp terpisah dari CRM dan sering hilang saat staf sales berganti.
- Estimasi nilai deal tidak terhubung langsung dengan sistem pembuatan penawaran (Quotation) dan penagihan (Invoice/Pajak).
- Setelah deal *Closed Won*, tidak ada pemantauan kesehatan pelanggan sehingga risiko *churn* (klien berhenti) tinggi dan perpanjangan kontrak terlambat.

### Nilai Utama (Core Value Proposition) Leadsy:

> **"Leadsy adalah Autonomous Enterprise Revenue Platform yang menyatukan seluruh mata rantai pendapatan bisnis (Lead Discovery, AI Omnichannel SDR, Deal Execution, Order-to-Cash, hingga Predictive Customer Retention) ke dalam satu ekosistem terpadu berbasis data intelijen real-time."**

---

## 2. Keuntungan Bisnis & ROI Terukur (Enterprise Business Impact)

| Metrik Keberhasilan | Dampak dengan Menggunakan Leadsy |
| :--- | :--- |
| **Kecepatan Kualifikasi Prospek (Time-to-Qualify)** | **Meningkat 3.5x Lebih Cepat** berkat Autonomous AI SDR yang otomatis mengevaluasi kriteria BANTC dan profil ICP 24/7. |
| **Efisiensi Pencarian Wilayah (Territory Sourcing)** | **Menghemat 80% Waktu Riset** dengan integrasi Google Maps POI Discovery dan penentuan target berbasis radius teritorial. |
| **Integritas & Retensi Data Percakapan** | **100% Data Percakapan Tersimpan Permanen** di database perusahaan melalui integrasi WhatsApp Baileys & Mekari Qontak resmi, mencegah hilangnya kontak saat staf sales resign. |
| **Siklus Konversi Order (Quote-to-Order Cycle)** | **Dipangkas dari 3 Hari Menjadi < 15 Menit** dengan modul Order-to-Cash (O2C) langsung dari kartu lead dengan kalkulasi otomatis PPN dan PPh. |
| **Retensi Pelanggan & Perpanjangan Kontrak** | **Pencegahan Churn hingga 40%** melalui sistem deteksi dini Customer Health Matrix dan notifikasi otomatis kontrak yang mendekati jatuh tempo. |
| **Akurasi Peramalan Pendapatan (Revenue Forecast)** | **Transparansi 100% Target vs Realisasi** dengan fitur quota cascading dan buffer rate management untuk level Direksi dan VP. |

---

## 3. Matriks Fungsional Lengkap (Functional Feature Matrix)

### Modul 1: Intelligence Dashboard & Geographic Matrix (`/dashboard`)
* **Lead Geography Matrix:** Tampilan peta interaktif seluas 540px dengan kemampuan ekspansi penuh (12 kolom) yang memetakan ratusan lead database berdasarkan koordinat latitude/longitude dan warna tahap funnel.
* **Pipeline Health Radial & Distribution:** Visualisasi kualitas pipeline secara grafis (Hot, Warm, Cold) menggunakan Highcharts dan ApexCharts.
* **Sales Quota & Cascading:** Pelacakan pencapaian target bulanan/tahunan (SDR Sourced vs Realized Revenue) dengan proteksi buffer rate bagi manajer.

### Modul 2: Map & Territory Sourcing Engine (`/map`)
* **Interactive Radius Discovery:** Penelusuran prospek berbasis radius dari titik koordinat tertentu menggunakan Google Places API.
* **Draggable Center Marker:** Fleksibilitas untuk menggeser titik pusat teritori secara langsung di atas peta untuk eksplorasi wilayah baru.
* **AI Prospecting Mode:** Mode segmentasi pintar yang menyaring tempat usaha berdasarkan probabilitas kebutuhan produk Leadsy.
* **Direct Pipeline Conversion:** Satu klik untuk menyimpan data tempat bisnis menjadi Lead terdaftar di database.

### Modul 3: Unified Omnichannel Inbox & AI SDR (`/inbox`)
* **Database-Backed Messaging:** Terhubung langsung ke 195+ percakapan aktif dan 311+ riwayat pesan di database tanpa dummy data.
* **Dual WhatsApp Engine:**
  - *Mekari Qontak Official API:* Untuk jalur resmi broadcast dan pesan bisnis enterprise bersertifikasi.
  - *Local WhatsApp Baileys Engine:* Untuk operasional lapangan, direct messaging tim, dan QR code generation mandiri.
* **AI SDR Copilot:** Menghasilkan rekomendasi balasan pesan cerdas secara otomatis untuk mempercepat proses kualifikasi prospek.
* **Contextual 360° Sidebar:** Menampilkan nilai deal, skor kesehatan, funnel stage, dan checklist BANTC di samping jendela obrolan.

### Modul 4: CRM Pipeline & Order-to-Cash (O2C) (`/leads`)
* **Kanban & List Funnel Views:** Pengorganisasian tahapan kesepakatan bisnis yang fleksibel dan terstruktur.
* **Complete O2C Lifecycle:**
  - *Quotation:* Pembuatan penawaran harga resmi dengan rincian line item.
  - *Sales Order:* Konversi penawaran menjadi pesanan penjualan resmi.
  - *Tax Compliance:* Perhitungan otomatis Tax Codes (PPN 11%) dan Withholding Tax (PPh 23).
  - *Invoicing:* Manajemen status pembayaran tagihan dan pencatatan kas masuk.

### Modul 5: Customer Success & Predictive Renewals (`/customer-success`)
* **Health Scoring Algorithm:** Evaluasi dinamis status akun pelanggan (Healthy, Warning, Critical) berdasarkan audit trail, aktivitas, dan riwayat transaksi.
* **Automated Renewal Intelligence:** Sistem otomatis mendeteksi kontrak yang akan habis masa berlakunya dan menghasilkan rekomendasi perpanjangan kontrak berserta kalkulasi nilai komersialnya.

### Modul 6: Enterprise Governance & AI Settings (`/settings`)
* **Multi-Point Access Navigation:** Akses langsung melalui sidebar menu (`Settings Overview`), tombol pintas header, dropdown avatar, dan `Cmd+K`.
* **Centralized AI Engine Management:** Konfigurasi multi-provider (DeepSeek, OpenAI, Anthropic, Gemini), masking kredensial API, pengujian koneksi, versioning prompt template, dan pemantauan biaya komputasi AI.
* **Multi-Tenant Foundation & RBAC:** Dukungan skema isolasi tenant dan pembatasan hak akses berbasis peran pengguna (*User & Roles*).
