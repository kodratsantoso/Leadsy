export interface HelpArticle {
  id: string;
  title: string;
  summary: string;
  trackId: string;
  role: "Sales" | "Solution Architect" | "Project Manager" | "Finance" | "Customer Success" | "Admin" | "General";
  readTime: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  content: {
    overview: string;
    keyPoints: string[];
    steps: { title: string; description: string; tip?: string }[];
    faqs?: { q: string; a: string }[];
  };
}

export interface HelpTrack {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
  badge: string;
  roleColor: string;
  articlesCount: number;
}

export const HELP_TRACKS: HelpTrack[] = [
  {
    id: "getting-started",
    title: "Memulai & Dasar Platform",
    subtitle: "Getting Started & Onboarding",
    description: "Panduan awal aktivasi akun, eksplorasi navigasi antarmuka, pengaturan multi-tenant, dan otentikasi aman.",
    iconName: "Rocket",
    badge: "Core Basics",
    roleColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    articlesCount: 4,
  },
  {
    id: "sales-discovery",
    title: "Sales & Deal Discovery",
    subtitle: "Geospatial Leads & AI Screening",
    description: "Eksplorasi radar Google Maps, 8-tahap Autonomous AI Screening, evaluasi kelayakan BANTC, dan otomasi cadence.",
    iconName: "Compass",
    badge: "Sales / BDR",
    roleColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    articlesCount: 5,
  },
  {
    id: "solution-architect",
    title: "Solution Architect & Presales",
    subtitle: "Technical Discovery & Presales Sizing",
    description: "Kalkulator estimasi resource, bundling margin produk, penyusunan SOW teknis, dan verifikasi arsitektur solusi.",
    iconName: "Cpu",
    badge: "Presales / SA",
    roleColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    articlesCount: 4,
  },
  {
    id: "project-delivery",
    title: "Delivery & Project Management",
    subtitle: "SOW to Project Plan & Milestone BAST",
    description: "Konversi otomatis dokumen SOW ke WBS Project Plan, pelacakan kapasitas tim Gantt, dan e-sign BAST resmi.",
    iconName: "Kanban",
    badge: "Delivery / PM",
    roleColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    articlesCount: 4,
  },
  {
    id: "finance-invoicing",
    title: "Finance & Commercial Invoicing",
    subtitle: "Milestone Billing, Tax & Cash Settlement",
    description: "Pembuatan faktur komersial otomatis dari BAST, kalkulasi DPP, PPN 11%, estimasi PPh 23, dan rekonsiliasi pembayaran.",
    iconName: "Receipt",
    badge: "Finance / Accounting",
    roleColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    articlesCount: 4,
  },
  {
    id: "customer-success",
    title: "Customer Success & Retention",
    subtitle: "Delivery Handover & Account Health",
    description: "Penerimaan handover dari delivery, pemantauan matriks kesehatan akun (Health Score), SLA alert, dan ekspansi renewal.",
    iconName: "HeartPulse",
    badge: "Customer Success",
    roleColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    articlesCount: 4,
  },
  {
    id: "integrations-security",
    title: "Integrasi & Keamanan Enterprise",
    subtitle: "Lark Open API, WhatsApp & Audit Logs",
    description: "Konfigurasi webhook Lark Base, WhatsApp sidecar service, manajemen role-based access control (RBAC), dan audit trail.",
    iconName: "ShieldCheck",
    badge: "Admin & DevOps",
    roleColor: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    articlesCount: 4,
  },
];

export const HELP_ARTICLES: HelpArticle[] = [
  // Getting Started
  {
    id: "gs-01",
    title: "Pengenalan Ekosistem Leadsy RevOps Operating System",
    summary: "Memahami benang merah Leadsy sebagai platform Revenue & Delivery Lifecycle satu pintu untuk seluruh departemen.",
    trackId: "getting-started",
    role: "General",
    readTime: "4 menit",
    difficulty: "Beginner",
    content: {
      overview:
        "Leadsy bukan sekadar CRM konvensional, melainkan Closed-Loop Operating System yang menghubungkan 5 departemen: Sales, Solution Architect, Project Manager, Finance & Accounting, dan Customer Success.",
      keyPoints: [
        "Satu single source of truth tanpa data silo antar tim.",
        "Otomatisasi proses dari Lead Discovery hingga Penagihan Invoice dan Retensi Klien.",
        "Role Perspective Switcher untuk memfokuskan antarmuka sesuai tanggung jawab masing-masing role.",
      ],
      steps: [
        {
          title: "1. Masuk ke Akun Anda",
          description: "Buka https://leadsy.tech/login dan masukkan kredensial resmi perusahaan Anda.",
          tip: "Pastikan browser Anda mengizinkan cookie sesi aman.",
        },
        {
          title: "2. Jelajahi Global Navigation",
          description: "Gunakan sidebar kiri untuk berpindah antara Dashboard, Leads Workspace, Product Catalog, dan Customer Success.",
        },
        {
          title: "3. Sesuaikan Role Perspective",
          description: "Pada halaman detail Deal, gunakan switcher di header untuk memilih perspektif Sales, SA, PM, Finance, atau CS.",
        },
      ],
      faqs: [
        {
          q: "Apakah setiap user bisa melihat data yang sama?",
          a: "Data tersinkronisasi secara real-time, namun tab kerja disortir secara otomatis berdasarkan perspektif role yang aktif.",
        },
      ],
    },
  },
  {
    id: "gs-02",
    title: "Menggunakan Role Perspective Switcher pada Deal Workspace",
    summary: "Cara berpindah tampilan kerja antar departemen dengan 1 klik tanpa berpindah halaman.",
    trackId: "getting-started",
    role: "General",
    readTime: "3 menit",
    difficulty: "Beginner",
    content: {
      overview:
        "Role Perspective Switcher memungkinkan kolaborator dari berbagai departemen mengakses informasi yang relevan dengan tugas spesifik mereka pada satu Deal yang sama.",
      keyPoints: [
        "Sales: Memfokuskan pada Overview, Cadence, Activity, Quotation, dan Revenue.",
        "Solution Architect: Memfokuskan pada Discovery Teknis, Sizing Margin, dan SOW.",
        "Project Manager: Memfokuskan pada Professional Services, Project Plan, dan Tasks.",
        "Finance: Memfokuskan pada BAST Komersial, Faktur Pajak, dan Settlement.",
        "Customer Success: Memfokuskan pada Onboarding Handover dan Health Score.",
      ],
      steps: [
        {
          title: "1. Buka Halaman Detail Deal",
          description: "Masuk ke menu Leads dan klik salah satu nama prospek aktif.",
        },
        {
          title: "2. Temukan Bar Role di Header Atas",
          description: "Di bagian atas tab detail deal terdapat tombol pilihan role dengan ikon masing-masing departemen.",
        },
        {
          title: "3. Klik Perspektif yang Ingin Anda Buka",
          description: "Tab aktif akan berpindah otomatis ke tab prioritas untuk role tersebut dengan animasi halus.",
        },
      ],
    },
  },

  // Sales & Discovery
  {
    id: "sd-01",
    title: "Panduan Radar Geospasial Google Maps untuk Prospeksi B2B",
    summary: "Memanfaatkan pencarian radius geospasial untuk menemukan ribuan prospek enterprise terverifikasi.",
    trackId: "sales-discovery",
    role: "Sales",
    readTime: "5 menit",
    difficulty: "Beginner",
    content: {
      overview:
        "Fitur Radar Geospasial Leadsy memungkinkan tim BDR dan Sales memetakan kantor, pabrik, atau pusat bisnis berdasarkan koordinat GPS dan kategori industri.",
      keyPoints: [
        "Ekstraksi data resmi: Nama entitas, alamat, nomor telepon kantor, website, dan koordinat.",
        "Penyaringan otomatis terhadap entitas duplikat di database.",
        "Pengelompokan instan ke dalam pipeline prospeksi.",
      ],
      steps: [
        {
          title: "1. Buka Menu Map / Lead Generator",
          description: "Tentukan titik sentral wilayah pencarian pada peta interaktif.",
        },
        {
          title: "2. Atur Radius dan Kategori Industri",
          description: "Pilih target radius (misal 10 km) dan filter sektor industri spesifik.",
        },
        {
          title: "3. Jalankan Ekstraksi Lead",
          description: "Klik 'Generate Leads' untuk memasukkan hasil pencarian ke dalam daftar antrean evaluasi AI.",
          tip: "Gunakan fitur export jika Anda ingin mengunduh daftar ke format spreadsheet CSV.",
        },
      ],
    },
  },
  {
    id: "sd-02",
    title: "Memahami 8-Tahap Autonomous AI Screening Engine",
    summary: "Bagaimana Leadsy mengevaluasi kelayakan prospek secara otomatis dari Eligibility hingga BANTC final.",
    trackId: "sales-discovery",
    role: "Sales",
    readTime: "6 menit",
    difficulty: "Intermediate",
    content: {
      overview:
        "Engine AI Screening Leadsy melakukan validasi multi-sumber tanpa intervensi manual untuk mengukur kesiapan prospek menjadi pelanggan.",
      keyPoints: [
        "Tahap 1: Eligibility & Legalitas Badan Usaha",
        "Tahap 2: Market Fit & ICP Alignment",
        "Tahap 3: Tech Stack & Digital Maturity",
        "Tahap 4: Solvency & Estimasi Kapasitas Finansial",
        "Tahap 5: Authority & Struktur Pengambil Keputusan",
        "Tahap 6: Timeline & Urgensi Pembelian",
        "Tahap 7: Threats & Analisis Kompetitor",
        "Tahap 8: Skor BANTC Final (Grade A/B/C/D)",
      ],
      steps: [
        {
          title: "1. Memicu AI Screening",
          description: "Pada tabel Leads, klik tombol 'Screen with AI' untuk satu lead atau gunakan bulk batching.",
        },
        {
          title: "2. Amati Progress Bar 8-Tahap",
          description: "Sistem akan menjalankan analisis beruntun dan menampilkan indikator visual pada setiap pos verifikasi.",
        },
        {
          title: "3. Tinjau Ringkasan Rekomendasi",
          description: "Periksa executive summary dan rekomendasi taktis pendekatan sales yang dihasilkan AI.",
        },
      ],
    },
  },

  // Solution Architect & Presales
  {
    id: "sa-01",
    title: "Presales Sizing Calculator & Estimasi Kapasitas Resource",
    summary: "Mengalkulasi kebutuhan hari kerja (man-days), level resource teknis, dan margin kotor.",
    trackId: "solution-architect",
    role: "Solution Architect",
    readTime: "5 menit",
    difficulty: "Intermediate",
    content: {
      overview:
        "Presales Sizing Calculator memastikan setiap penawaran solusi teknis memiliki margin profit yang sehat dan alokasi resource yang realistis.",
      keyPoints: [
        "Perhitungan man-days terinci berdasarkan deliverable spesifik.",
        "Simulasi margin kotor proyek secara real-time.",
        "Standarisasi rate card untuk Developer, Solution Architect, PM, dan DevOps.",
      ],
      steps: [
        {
          title: "1. Masuk ke Tab Presales Sizing",
          description: "Buka deal target dan pilih perspektif Solution Architect.",
        },
        {
          title: "2. Tambahkan Deliverable Teknis",
          description: "Masukkan komponen pekerjaan teknis beserta estimasi jumlah man-days.",
        },
        {
          title: "3. Kunci Margin & Simpan Draft",
          description: "Periksa total estimasi biaya internal dan harga jual komersial sebelum dikirim ke Sales.",
        },
      ],
    },
  },
  {
    id: "sa-02",
    title: "Penyusunan & Preview Statement of Work (SOW) Otomatis",
    summary: "Membangun dokumen SOW legal-ready langsung dari data presales sizing dengan penomoran standar.",
    trackId: "solution-architect",
    role: "Solution Architect",
    readTime: "4 menit",
    difficulty: "Intermediate",
    content: {
      overview:
        "Leadsy merangkai dokumen SOW secara otomatis dari hasil kalkulasi presales, lengkap dengan klausul standar, lingkup kerja, dan tahapan pembayaran.",
      keyPoints: [
        "Integrasi klausul legal standar enterprise.",
        "Tabel deliverables dan timeline proyek terisi otomatis.",
        "Dukungan tanda tangan digital PSrE berstandar Kominfo.",
      ],
      steps: [
        {
          title: "1. Klik 'Generate SOW / BAST'",
          description: "Pilih opsi 'Statement of Work' pada modal dokumen profesional.",
        },
        {
          title: "2. Verifikasi Milestone & Termin Pembayaran",
          description: "Pastikan persentase termin (misal 50% DP, 50% Final) sesuai kesepakatan komersial.",
        },
        {
          title: "3. Preview & Cetak PDF",
          description: "Gunakan fitur preview instan untuk memverifikasi tata letak dokumen sebelum diajukan ke klien.",
        },
      ],
    },
  },

  // Project Delivery & PM
  {
    id: "pm-01",
    title: "1-Click Konversi SOW Deliverables Menjadi Project Plan",
    summary: "Mentransformasikan ruang lingkup SOW yang telah disetujui menjadi tugas dan timeline proyek riil.",
    trackId: "project-delivery",
    role: "Project Manager",
    readTime: "4 menit",
    difficulty: "Intermediate",
    content: {
      overview:
        "Menghilangkan proses input manual berulang dari kontrak ke project management system dengan otomasi konversi 1-klik.",
      keyPoints: [
        "Membuat PsProjectPlan dan daftar PsProjectTask secara otomatis.",
        "Menautkan deliverable langsung ke milestone penagihan BAST.",
        "Mencegah ruang lingkup kerja menyimpang (scope creep).",
      ],
      steps: [
        {
          title: "1. Buka Dokumen SOW Berstatus Signed",
          description: "Masuk ke tab Professional Services pada Deal yang telah disetujui klien.",
        },
        {
          title: "2. Klik Tombol 'Inisialisasi Project Plan'",
          description: "Sistem akan membaca setiap baris estimasi dan membuat tiket pekerjaan secara terstruktur.",
        },
        {
          title: "3. Tinjau & Alokasikan Tim di Tab Project Plans",
          description: "Tugaskan personel teknis dan atur tanggal mulai serta batas waktu penyelesaian.",
        },
      ],
    },
  },
  {
    id: "pm-02",
    title: "Penerbitan Berita Acara Serah Terima (BAST) & Digital Signing",
    summary: "Proses penerbitan BAST resmi untuk serah terima milestone pekerjaan kepada klien.",
    trackId: "project-delivery",
    role: "Project Manager",
    readTime: "4 menit",
    difficulty: "Intermediate",
    content: {
      overview:
        "BAST merupakan dokumen legal krusial sebagai bukti serah terima pekerjaan sebelum Finance dapat menerbitkan faktur penagihan.",
      keyPoints: [
        "Nomor BAST resmi dengan format sekuensial enterprise.",
        "Dukungan verifikasi digital tanda tangan kedua belah pihak.",
        "Pemicu otomatis notifikasi real-time ke departemen Finance.",
      ],
      steps: [
        {
          title: "1. Buka Modal Dokumen & Pilih BAST",
          description: "Pilih milestone yang telah diselesaikan tim pengembang.",
        },
        {
          title: "2. Kirim Dokumen untuk Penandatanganan",
          description: "Arahkan klien untuk melakukan tanda tangan digital melalui tautan resmi.",
        },
        {
          title: "3. Notifikasi Otomatis ke Finance",
          description: "Saat BAST berstatus 'Signed', sistem akan otomatis mengirim Interactive Card ke tim Finance via Lark.",
        },
      ],
    },
  },

  // Finance & Accounting
  {
    id: "fin-01",
    title: "Automated Milestone Invoicing dari Signed BAST",
    summary: "Menerbitkan faktur komersial otomatis dengan kalkulasi DPP, PPN 11%, dan PPh 23.",
    trackId: "finance-invoicing",
    role: "Finance",
    readTime: "5 menit",
    difficulty: "Intermediate",
    content: {
      overview:
        "Mempercepat siklus Order-to-Cash dengan mengubah BAST yang telah ditandatangani menjadi faktur komersial berstandar perpajakan Indonesia.",
      keyPoints: [
        "Perhitungan otomatis Dasar Pengenaan Pajak (DPP).",
        "Penambahan PPN 11% dan estimasi potongan PPh Pasal 23 (2%).",
        "Penomoran faktur otomatis format INV-YYYYMM-XXXX.",
        "Pilihan termin pembayaran standar (Net 14, Net 30, Net 60).",
      ],
      steps: [
        {
          title: "1. Terima Notifikasi BAST Signed",
          description: "Periksa kartu notifikasi Lark atau buka tab Revenue pada Deal bersangkutan.",
        },
        {
          title: "2. Klik 'Buat Invoice' pada Tabel BAST",
          description: "Modal pembuatan faktur akan terbuka dengan nilai milestone terisi secara otomatis.",
        },
        {
          title: "3. Sesuaikan Opsi Pajak & Tanggal Jatuh Tempo",
          description: "Pilih tarif PPN dan estimasi potongan PPh 23, lalu klik 'Terbitkan Faktur Resmi'.",
        },
        {
          title: "4. Unduh atau Kirim Faktur ke Klien",
          description: "Gunakan template Blade resmi siap cetak beresolusi tinggi.",
        },
      ],
    },
  },
  {
    id: "fin-02",
    title: "Pencatatan Settlement & Monitoring Piutang (AR Aging)",
    summary: "Mengelola status pembayaran invoice dan memantau saldo piutang berjalan.",
    trackId: "finance-invoicing",
    role: "Finance",
    readTime: "4 menit",
    difficulty: "Beginner",
    content: {
      overview:
        "Memantau arus kas masuk dan memastikan tidak ada piutang yang jatuh tempo tanpa tindak lanjut penagihan.",
      keyPoints: [
        "Status faktur: Draft, Issued, Paid, Partial, Overdue, Cancelled.",
        "Total penagihan, total terbayar, dan sisa piutang (Outstanding AR) dihitung live.",
        "Audit trail pencatatan pembayaran lengkap dengan tanggal dan nomor referensi bank.",
      ],
      steps: [
        {
          title: "1. Buka Daftar Invoice di Tab Revenue",
          description: "Periksa daftar faktur komersial yang telah diterbitkan untuk klien tersebut.",
        },
        {
          title: "2. Klik 'Update Status' pada Faktur Terkait",
          description: "Pilih status pembayaran baru (misal 'Lunas / Paid') dan masukkan tanggal pelunasan.",
        },
        {
          title: "3. Konfirmasi Settlement",
          description: "Statistik total penerimaan kas akan langsung diperbarui secara instan pada ringkasan revenue.",
        },
      ],
    },
  },

  // Customer Success & Retention
  {
    id: "cs-01",
    title: "Prosedur Handover Delivery ke Tim Customer Success",
    summary: "Menerima estafet proyek setelah BAST final untuk memulai program onboarding dan adopsi klien.",
    trackId: "customer-success",
    role: "Customer Success",
    readTime: "4 menit",
    difficulty: "Beginner",
    content: {
      overview:
        "Memastikan transisi yang mulus dari fase konstruksi proyek ke fase operasional dan pemeliharaan jangka panjang.",
      keyPoints: [
        "Notifikasi otomatis ke tim CS saat BAST serah terima final rampung.",
        "Akses penuh ke seluruh riwayat arsitektur, SOW, dan kontak stakeholder pengambil keputusan.",
        "Kick-off sesi onboarding 14 hari pertama pasca-go-live.",
      ],
      steps: [
        {
          title: "1. Tinjau Ringkasan Handover",
          description: "Buka menu Customer Success dan temukan akun yang baru saja menyelesaikan fase delivery.",
        },
        {
          title: "2. Jadwalkan Sesi Pengenalan Onboarding",
          description: "Gunakan integrasi WhatsApp atau email untuk menghubungi person-in-charge (PIC) klien.",
        },
        {
          title: "3. Catat Ekspektasi SLA Klien",
          description: "Dokumentasikan target utilisasi dan jadwal tinjauan berkala (Quarterly Business Review).",
        },
      ],
    },
  },
  {
    id: "cs-02",
    title: "Monitoring Account Health Score & Eskalasi SLA Breach",
    summary: "Mendeteksi sinyal risiko churn lebih awal dan menanggapi eskalasi insiden SLA secara proaktif.",
    trackId: "customer-success",
    role: "Customer Success",
    readTime: "4 menit",
    difficulty: "Intermediate",
    content: {
      overview:
        "Health Score mengombinasikan frekuensi interaksi, kepatuhan pembayaran invoice, dan kepuasan layanan menjadi indikator kesehatan akun.",
      keyPoints: [
        "Skor Kesehatan Akun: Sehat (80-100), Perhatian (60-79), Kritis (<60).",
        "Daemon pemantau SLA otomatis berjalan setiap jam untuk mendeteksi tiket atau pesan tertunda.",
        "Eskalasi darurat langsung ke channel manajemen jika SLA terlampaui.",
      ],
      steps: [
        {
          title: "1. Periksa Health Radar di Customer Success Tab",
          description: "Amati indikator warna pada kartu akun klien Anda.",
        },
        {
          title: "2. Tangani Notifikasi Peringatan SLA",
          description: "Jika muncul peringatan kuning atau merah, segera koordinasikan dengan tim support terkait.",
        },
        {
          title: "3. Lakukan Intervensi Retensi",
          description: "Jadwalkan pertemuan klarifikasi sebelum risiko pembatalan kontrak atau penurunan reputasi terjadi.",
        },
      ],
    },
  },

  // Integrations & Security
  {
    id: "int-01",
    title: "Sinkronisasi Real-Time Lark Open API & Interactive Cards",
    summary: "Mengonfigurasi pengiriman notifikasi interaktif dan sinkronisasi data tabel ke Lark Base.",
    trackId: "integrations-security",
    role: "Admin",
    readTime: "5 menit",
    difficulty: "Advanced",
    content: {
      overview:
        "Menghubungkan Leadsy dengan Lark Workspace perusahaan untuk kolaborasi tim yang lancar melalui bot chat interaktif dan database Lark Base.",
      keyPoints: [
        "Menggunakan Lark App ID dan App Secret yang tersimpan secara terenkripsi (AES-256-GCM).",
        "Pengiriman Interactive Card dengan tombol aksi langsung di aplikasi Lark.",
        "Sinkronisasi dua arah untuk status deal dan jadwal pertemuan.",
      ],
      steps: [
        {
          title: "1. Buka Pengaturan Integrasi di Admin Console",
          description: "Pilih tab Integrasi Lark pada halaman Settings.",
        },
        {
          title: "2. Masukkan App ID & App Secret",
          description: "Pastikan aplikasi Lark telah diberikan permission im:message dan bitable:app.",
        },
        {
          title: "3. Uji Koneksi Webhook",
          description: "Klik tombol 'Test Connection' untuk memverifikasi validitas token akses.",
        },
      ],
    },
  },
  {
    id: "int-02",
    title: "Manajemen Hak Akses Berbasis Peran (RBAC) & Audit Logs",
    summary: "Memastikan kepatuhan tata kelola data enterprise dan pelacakan jejak audit seluruh aktivitas.",
    trackId: "integrations-security",
    role: "Admin",
    readTime: "4 menit",
    difficulty: "Advanced",
    content: {
      overview:
        "Keamanan enterprise Leadsy menerapkan prinsip Least Privilege dan mencatat setiap perubahan data ke tabel audit yang tidak dapat diubah (immutable).",
      keyPoints: [
        "Role granular: Super Admin, Sales Director, BDR, Solution Architect, Project Manager, Finance, CS.",
        "Pencatatan IP address, user agent, dan payload sebelum/sesudah perubahan data.",
        "Perlindungan data sensitif dan enkripsi kredensial integrasi pihak ketiga.",
      ],
      steps: [
        {
          title: "1. Kelola Pengguna di Menu Admin",
          description: "Tetapkan peran yang sesuai untuk setiap anggota tim yang diundang.",
        },
        {
          title: "2. Pantau Halaman Audit Logs",
          description: "Gunakan filter tanggal dan tipe aksi untuk meninjau riwayat operasional sistem.",
        },
        {
          title: "3. Ekspor Laporan Kepatuhan",
          description: "Unduh rekaman log audit untuk kebutuhan audit kepatuhan ISO/SOC 2 perusahaan.",
        },
      ],
    },
  },
];
