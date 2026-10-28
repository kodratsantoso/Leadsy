# Dokumen UAT (User Acceptance Testing) Menyeluruh
## Leadsy Enterprise — RevOps-to-Cash-to-Value Operating System

- **Aplikasi:** Leadsy Enterprise
- **Versi Rilis:** v1.42.0
- **URL Pengujian (Produksi):** [https://leadsy.tech](https://leadsy.tech)
- **Status Sesi:** Pengujian Penerimaan Pengguna (UAT Sign-off)
- **Target Penguji:** Product Owner, Solution Architect, Sales Lead, Project Manager, Finance Manager, Customer Success Lead.

---

## 1. Prasyarat & Lingkungan Pengujian

Sebelum memulai pengujian, pastikan:
1. Menggunakan browser modern (Google Chrome, Mozilla Firefox, Safari, atau Microsoft Edge) versi terbaru.
2. Membuka URL resmi produksi: `https://leadsy.tech`.
3. Memastikan domain legacy `https://leadsy.virtuenet.space` mengembalikan redirect 301 ke `https://leadsy.tech`.
4. Akun pengujian memiliki hak akses ke modul Leads, Presales, Professional Services, Revenue, Customer Success, dan Help Center.

---

## 2. Matriks Kasus Uji (Test Cases Matrix)

### Skenario 1: Sales / BDR — Prospeksi Geospasial & Autonomous AI Screening

| ID | Fitur / Fungsi | Langkah Pengujian | Hasil yang Diharapkan | Status (Pass/Fail) | Catatan |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-001** | Landing Page & CTA Help Center | 1. Buka `https://leadsy.tech`<br>2. Periksa navbar atas dan tombol CTA di hero.<br>3. Klik tombol "Pusat Bantuan & LMS". | Halaman berpindah mulus ke `/help` dengan animasi Motion UI tanpa error. | [ ] | |
| **TC-002** | Login & Autentikasi | 1. Klik tombol "Masuk" / "Portal Masuk Tim".<br>2. Masukkan email & password terdaftar.<br>3. Klik Masuk. | Berhasil login, token tersimpan di state sesi, dan diarahkan ke Dashboard. | [ ] | |
| **TC-003** | Radar Wilayah Google Maps | 1. Buka menu **Map** / **Lead Generator**.<br>2. Tentukan radius dan target kategori industri.<br>3. Klik Generate Leads. | Titik koordinat entitas bisnis terpetakan di radar geospasial dengan detail alamat dan kontak. | [ ] | |
| **TC-004** | 8-Tahap AI Screening | 1. Buka menu **Leads**.<br>2. Klik tombol "Screen with AI" pada salah satu prospek.<br>3. Amati progress bar 8-tahap. | Sistem mengevaluasi 8 pos validasi (Eligibility s/d BANTC) secara berurutan dan menghasilkan skor BANTC (Grade A/B/C/D). | [ ] | |
| **TC-005** | Cadence & WhatsApp Outreach | 1. Buka tab **Cadence** pada detail prospek.<br>2. Tinjau template pesan tindak lanjut.<br>3. Klik kirim atau jadwalkan cadence. | Pesan cadence tercatat di riwayat interaksi dan terhubung ke antrean WhatsApp. | [ ] | |

---

### Skenario 2: Solution Architect — Presales Sizing, Bundling Margin & SOW

| ID | Fitur / Fungsi | Langkah Pengujian | Hasil yang Diharapkan | Status (Pass/Fail) | Catatan |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-006** | Role Perspective: Solution Architect | 1. Buka halaman detail Deal.<br>2. Pada header atas, klik tab **"Solution Architect"** di Role Perspective Switcher. | Tampilan berpindah otomatis ke tab prioritas SA (Technical Discovery, Presales Sizing, SOW). | [ ] | |
| **TC-007** | Presales Sizing Calculator | 1. Buka tab **Presales Sizing**.<br>2. Tambahkan komponen deliverable teknis dan jumlah man-days.<br>3. Ubah level engineer (Junior, Senior, Architect). | Biaya internal dan harga jual komersial terhitung otomatis secara instan. | [ ] | |
| **TC-008** | Product Bundling Margin | 1. Buka modal **Product Bundling**.<br>2. Pilih kombinasi produk software/hardware dan jasa profesional.<br>3. Periksa margin kotor gabungan. | Muncul indikator visual kesehatan margin (Hijau jika aman, Kuning/Merah jika di bawah threshold). | [ ] | |
| **TC-009** | Statement of Work (SOW) Generation | 1. Klik tombol **"Generate SOW / BAST"**.<br>2. Pilih tipe "Statement of Work".<br>3. Tentukan termin pembayaran (misal 50% DP, 50% Final). | Dokumen SOW terbuat lengkap dengan penomoran standar dan tabel deliverables. | [ ] | |
| **TC-010** | SOW Instant Preview & Print | 1. Pada daftar dokumen, klik tombol Preview/Cetak.<br>2. Tinjau tata letak dokumen di modal viewer. | Dokumen tampil rapi sesuai layout standar corporate, siap diunduh PDF. | [ ] | |

---

### Skenario 3: Project Manager — SOW-to-Project Plan Converter & BAST

| ID | Fitur / Fungsi | Langkah Pengujian | Hasil yang Diharapkan | Status (Pass/Fail) | Catatan |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-011** | Role Perspective: Project Manager | 1. Pada Deal Workspace, klik opsi **"Project Manager"** di switcher. | Antarmuka memfokuskan tab ke Professional Services, Project Plan, dan Tasks. | [ ] | |
| **TC-012** | 1-Click SOW to Project Plan | 1. Buka dokumen SOW yang berstatus *Approved/Signed*.<br>2. Klik tombol **"Inisialisasi Project Plan"**.<br>3. Konfirmasi aksi. | Sistem mengonversi seluruh deliverable SOW menjadi `PsProjectPlan` dan `PsProjectTask` otomatis. | [ ] | |
| **TC-013** | WBS & Timeline Project Plan | 1. Buka tab **Project Plans**.<br>2. Periksa daftar tiket tugas dan timeline.<br>3. Tetapkan PIC teknis dan tanggal target. | Tiket tugas tersimpan dengan status dan assignee yang valid tanpa duplikasi. | [ ] | |
| **TC-014** | Penerbitan BAST Milestone | 1. Buka modal dokumen, pilih tipe **"BAST"**.<br>2. Pilih milestone yang telah selesai (misal BAST Tahap 1).<br>3. Buat dokumen serah terima. | BAST terbit dengan nomor format resmi dan klausul serah terima pekerjaan. | [ ] | |
| **TC-015** | BAST Digital Sign & Notifikasi Otomatis | 1. Tandatangani BAST (status berubah menjadi *Signed*).<br>2. Periksa trigger webhook. | Sistem otomatis mengirimkan Interactive Card ke Finance via Lark untuk penagihan invoice. | [ ] | |

---

### Skenario 4: Finance & Accounting — Automated Milestone Invoicing & Tax

| ID | Fitur / Fungsi | Langkah Pengujian | Hasil yang Diharapkan | Status (Pass/Fail) | Catatan |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-016** | Role Perspective: Finance & Accounting | 1. Klik opsi **"Finance & Accounting"** di Role Switcher.<br>2. Amati tab yang diprioritaskan. | Tab berpindah ke Revenue & Invoices, BAST Komersial, dan Ringkasan Margin. | [ ] | |
| **TC-017** | Pembuatan Faktur dari Signed BAST | 1. Pada kartu BAST yang telah signed, klik tombol **"Buat Invoice"**.<br>2. Periksa isian nominal milestone pada modal. | Nominal DPP milestone terisi otomatis dari nilai kontrak BAST tanpa input manual. | [ ] | |
| **TC-018** | Kalkulasi Pajak Indonesia (PPN 11% & PPh 23) | 1. Centang opsi PPN 11%.<br>2. Centang opsi estimasi potongan PPh Pasal 23 (2%).<br>3. Periksa total akhir tagihan. | Total tagihan menghitung: `DPP + PPN (11%) - Estimasi PPh 23 (2%)` secara akurat. | [ ] | |
| **TC-019** | Cetak & Unduh Faktur Komersial PDF | 1. Klik tombol "Cetak / Unduh Faktur" pada daftar invoice.<br>2. Tinjau template HTML/PDF resmi. | Faktur komersial tampil dengan format formal, kop surat perusahaan, nomor `INV-YYYYMM-XXXX`, dan rekening bank. | [ ] | |
| **TC-020** | Pencatatan Settlement Pembayaran | 1. Pada faktur berstatus *Issued*, klik **"Update Status"**.<br>2. Pilih status "Lunas (Paid)" dan masukkan tanggal pelunasan.<br>3. Simpan. | Status berubah menjadi Paid, dan ringkasan Total Paid serta Outstanding AR ter-update live. | [ ] | |

---

### Skenario 5: Customer Success — Handover, SLA Monitoring & Health Score

| ID | Fitur / Fungsi | Langkah Pengujian | Hasil yang Diharapkan | Status (Pass/Fail) | Catatan |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-021** | Handover Otomatis Pasca-Delivery | 1. Selesaikan milestone final proyek.<br>2. Buka menu **Customer Success**. | Akun klien muncul di daftar antrean onboarding dengan alert handover baru. | [ ] | |
| **TC-022** | Account Health Radar & Scoring | 1. Buka kartu detail akun di Customer Success.<br>2. Periksa matriks indikator kesehatan. | Skor kesehatan akun (Health Score 0-100) terkalkulasi dengan badge warna (Sehat, Perhatian, Kritis). | [ ] | |
| **TC-023** | Customer Journey Timeline | 1. Buka tab Customer Journey.<br>2. Tinjau histori peristiwa dari awal prospeksi hingga serah terima. | Catatan meeting, delivery milestone, dan pembayaran tampil kronologis dari awal hingga akhir. | [ ] | |
| **TC-024** | SLA Breach Daemon Escalation | 1. Simulasikan tiket atau lead yang melewati batas SLA respons.<br>2. Jalankan scheduler / periksa log. | Sistem mencatat status SLA Breach dan menembakkan alert peringatan darurat ke Lark/WhatsApp. | [ ] | |

---

### Skenario 6: Help Center & Learning Management System (LMS)

| ID | Fitur / Fungsi | Langkah Pengujian | Hasil yang Diharapkan | Status (Pass/Fail) | Catatan |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-025** | Navigasi Jalur Pembelajaran (`/help`) | 1. Buka URL `https://leadsy.tech/help`.<br>2. Klik berbagai kartu jalur pembelajaran (Sales, SA, PM, Finance, CS). | Daftar modul berganti sesuai jalur yang dipilih dengan transisi mulus. | [ ] | |
| **TC-026** | Pencarian Global Artikel | 1. Pada kotak pencarian di hero, ketik kata kunci "PPN" atau "BAST".<br>2. Periksa hasil pencarian. | Sistem menampilkan seluruh artikel yang relevan secara real-time tanpa reload halaman. | [ ] | |
| **TC-027** | Pembaca Panduan Interaktif & FAQ | 1. Klik salah satu kartu panduan.<br>2. Baca ikhtisar, instruksi bertahap, dan FAQ.<br>3. Uji tombol "Bagikan Tautan". | Modal panduan terbuka dengan konten terstruktur, tombol bagikan berhasil menyalin link artikel. | [ ] | |
| **TC-028** | LMS Progress Tracker (Sertifikasi) | 1. Di dalam modal panduan, klik tombol **"Tandai Sudah Selesai"**.<br>2. Tutup modal dan amati bar progress kurikulum di atas. | Persentase progres kurikulum bertambah, tersimpan permanen di local storage browser. | [ ] | |

---

### Skenario 7: Keamanan, Multi-Tenancy & Infrastruktur K3s

| ID | Fitur / Fungsi | Langkah Pengujian | Hasil yang Diharapkan | Status (Pass/Fail) | Catatan |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-029** | Isolasi Data Multi-Tenant | 1. Akses data deal dari akun tenant A.<br>2. Verifikasi kueri database. | Tidak ada kebocoran data (*data bleeding*) ke tenant B; kueri terisolasi otomatis oleh tenant scope. | [ ] | |
| **TC-030** | Audit Log Trail | 1. Lakukan perubahan status deal atau invoice.<br>2. Buka menu **Audit Logs** (sebagai Admin). | Tercatat log mutasi data lengkap dengan user ID, IP address, timestamp, dan diff perubahan. | [ ] | |
| **TC-031** | Domain Redirect 301 | 1. Buka browser dan ketik `https://leadsy.virtuenet.space/`. | Browser otomatis dialihkan permanen (HTTP 301) ke domain resmi `https://leadsy.tech/`. | [ ] | |
| **TC-032** | Health Check Endpoint | 1. Akses `https://leadsy.tech/api/health` via browser atau cURL. | Mengembalikan respons HTTP 200: `{"status":"ok","timestamp":"..."}`. | [ ] | |

---

## 3. Ringkasan Hasil Pengujian

- **Total Kasus Uji:** 32 Kasus Uji (TC-001 s/d TC-032)
- **Total Lulus (Pass):** _______
- **Total Gagal (Fail):** _______
- **Tingkat Kelulusan:** _______ %

---

## 4. Lembar Persetujuan (Sign-off Acceptance)

Dengan menandatangani dokumen ini, seluruh pemangku kepentingan menyatakan bahwa sistem **Leadsy Enterprise v1.42.0** telah diuji secara menyeluruh dan memenuhi kriteria penerimaan fungsional, arsitektural, dan operasional.

| Departemen | Nama Peninjau | Jabatan | Tanggal | Tanda Tangan |
| :--- | :--- | :--- | :--- | :--- |
| **Product Owner** | ____________________ | VP Product / Business Lead | ____________ | [________________] |
| **Sales & Business Dev** | ____________________ | Head of Sales / BDR Lead | ____________ | [________________] |
| **Solution Architect** | ____________________ | Lead Solution Architect | ____________ | [________________] |
| **Project Delivery** | ____________________ | Head of Project Management | ____________ | [________________] |
| **Finance & Accounting** | ____________________ | Finance & Accounting Lead | ____________ | [________________] |
| **Customer Success** | ____________________ | Head of Customer Success | ____________ | [________________] |
