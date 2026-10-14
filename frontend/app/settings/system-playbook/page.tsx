"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Bot,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Workflow,
  MessageSquare,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type DomainKey =
  | "all"
  | "profiling"
  | "qualification"
  | "product"
  | "meeting"
  | "deal"
  | "success";

interface AiFeatureItem {
  key: string;
  title: string;
  domain: DomainKey;
  domainLabel: string;
  positioning: string;
  trigger: string;
  objective: string;
  inputDescription: string;
  outputFormat: string;
  schemaSnippet: string;
}

const DOMAINS: { key: DomainKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "all", label: "Semua Domain (33)", icon: Layers },
  { key: "profiling", label: "1. Profiling & Enrichment (7)", icon: Sparkles },
  { key: "qualification", label: "2. Kualifikasi & Scoring (7)", icon: CheckCircle2 },
  { key: "product", label: "3. Presales & Produk (5)", icon: Layers },
  { key: "meeting", label: "4. Meeting Intelligence (5)", icon: Calendar },
  { key: "deal", label: "5. Deal & PS Estimasi (4)", icon: DollarSign },
  { key: "success", label: "6. Revenue & CSM (5)", icon: TrendingUp },
];

const AI_FEATURES_CATALOG: AiFeatureItem[] = [
  // DOMAIN 1: Profiling & Enrichment
  {
    key: "lead_ai_profiling",
    title: "Lead AI Company Profiling & Web Research",
    domain: "profiling",
    domainLabel: "1. Profiling & Enrichment",
    positioning: "Top of Funnel / Ingestion / On-demand Lead Profile",
    trigger: "Tombol 'AI Profiling' pada detail lead atau dipicu saat import baru",
    objective: "Melakukan riset bisnis otonom melalui live web search (DuckDuckGo/Tavily + web scraper resmi) untuk menganalisis model bisnis, skala, dan potensi masalah prospek.",
    inputDescription: "Nama perusahaan, URL website resmi, industri awal, kontak, portofolio produk internal.",
    outputFormat: "JSON terstruktur tersimpan di profil lead & riwayat analisis lead.",
    schemaSnippet: `{
  "company_summary": "Penyedia solusi logistik rantai dingin terkemuka di Jabodetabek...",
  "core_business": "B2B Cold Chain Storage & Fleet Distribution",
  "target_market": "Produsen F&B, Distributor Farmasi, Modern Retail",
  "estimated_size": "Enterprise (500+ karyawan)",
  "industry": "Transport & Logistics",
  "strategic_initiatives": ["Digitalisasi armada", "Otomasi WMS di 3 hub utama"],
  "potential_pain_points": ["Visibilitas rute pengiriman", "SLA follow-up PO lambat"],
  "recommended_product_ids": [1, 4]
}`,
  },
  {
    key: "lead_company_enrichment",
    title: "Lead Company Firmographic Enrichment",
    domain: "profiling",
    domainLabel: "1. Profiling & Enrichment",
    positioning: "Ingestion / Verification",
    trigger: "Background job saat data perusahaan disimpan",
    objective: "Mengekstrak atribut firmografis legal dan infrastruktur teknologi dari biografi atau teks profil perusahaan.",
    inputDescription: "Deskripsi mentah profil perusahaan, bio LinkedIn, atau media.",
    outputFormat: "Field database: legal_name, domain, headquarters_city, tech_stack.",
    schemaSnippet: `{
  "legal_name": "PT Sumber Distribusi Makmur",
  "domain": "sumberdistribusi.co.id",
  "headquarters_city": "Surabaya",
  "country": "Indonesia",
  "tech_stack": ["SAP S/4HANA", "Microsoft 365"],
  "year_founded": 2012
}`,
  },
  {
    key: "lead_enrichment",
    title: "Lead Firmographic Fast Direct Enrichment",
    domain: "profiling",
    domainLabel: "1. Profiling & Enrichment",
    positioning: "Data Normalization",
    trigger: "Dipanggil saat proses penyeragaman master data prospek",
    objective: "Verifikasi dan format ulang alamat, kota, dan entitas kontak bisnis.",
    inputDescription: "Field kota dan nama entitas bisnis mentah.",
    outputFormat: "JSON pemetaan kota, provinsi, dan kode area terverifikasi.",
    schemaSnippet: `{
  "city": "Jakarta Selatan",
  "province": "DKI Jakarta",
  "verified_phone_prefix": "6221",
  "address_standardized": "Gedung Menara Mandiri Lt. 12, Jl. Jend. Sudirman"
}`,
  },
  {
    key: "lead_industry_classification",
    title: "Lead Industry Classification",
    domain: "profiling",
    domainLabel: "1. Profiling & Enrichment",
    positioning: "Lead Segmentation",
    trigger: "Setelah profiling awal atau saat kategori kosong",
    objective: "Mengklasifikasikan bidang usaha perusahaan prospek ke dalam taksonomi industri CRM/KBLI yang seragam.",
    inputDescription: "Deskripsi bisnis dan nama perusahaan.",
    outputFormat: "ID industri dan label sub-industri pada profil lead.",
    schemaSnippet: `{
  "primary_industry": "Manufacturing",
  "sub_industry": "Food & Beverage Processing",
  "confidence_score": 94,
  "rationale": "Perusahaan mengoperasikan 4 pabrik pengolahan susu kemasan..."
}`,
  },
  {
    key: "lead_business_category_classification",
    title: "Lead Business Category Classification",
    domain: "profiling",
    domainLabel: "1. Profiling & Enrichment",
    positioning: "Lead Segmentation",
    trigger: "Pipeline intake",
    objective: "Menentukan model transaksi prospek (B2B, B2G, Distribusi, Agensi, Prinsipal).",
    inputDescription: "Teks profil dan kanal penjualan prospek.",
    outputFormat: "JSON model bisnis dan klasifikasi sektor.",
    schemaSnippet: `{
  "business_category": "B2B Distributor",
  "is_b2b": true,
  "is_government": false,
  "confidence_score": 90
}`,
  },
  {
    key: "lead_company_size_classification",
    title: "Lead Company Size Tiering",
    domain: "profiling",
    domainLabel: "1. Profiling & Enrichment",
    positioning: "Territory & Account Tiering",
    trigger: "Saat profil firmografis diperbarui",
    objective: "Mengelompokkan ukuran organisasi ke tier Startup, SME, Mid-Market, atau Enterprise berdasarkan jumlah pegawai dan estimasi skala.",
    inputDescription: "Jumlah pegawai dan cakupan kantor cabang.",
    outputFormat: "Tier label pada database leads.",
    schemaSnippet: `{
  "size_tier": "Mid-Market",
  "estimated_headcount_range": "100-500",
  "confidence_score": 85
}`,
  },
  {
    key: "lead_contact_google_search_keyword",
    title: "Lead Contact Search Query Generation",
    domain: "profiling",
    domainLabel: "1. Profiling & Enrichment",
    positioning: "Account Research / OSINT Discovery",
    trigger: "Tab Kontak pada profil Lead",
    objective: "Menyusun kueri pencarian Google dorking presisi untuk menemukan profil LinkedIn pengambil keputusan (C-Level, Direktur, Head).",
    inputDescription: "Nama perusahaan prospek dan target peranan.",
    outputFormat: "Array string query pencarian terformat.",
    schemaSnippet: `[
  "\\\"PT Sumber Makmur\\\" (\\\"Chief Technology Officer\\\" OR \\\"Direktur IT\\\") site:linkedin.com/in",
  "\\\"PT Sumber Makmur\\\" (\\\"VP Procurement\\\" OR \\\"Head of Purchasing\\\") site:linkedin.com/in"
]`,
  },

  // DOMAIN 2: Kualifikasi & Scoring
  {
    key: "lead_scoring",
    title: "Lead Scoring Analysis",
    domain: "qualification",
    domainLabel: "2. Kualifikasi & Scoring",
    positioning: "Sales Prioritization",
    trigger: "Otomatis setiap ada aktivitas atau pembaruan profil lead",
    objective: "Menghitung probabilitas konversi (0-100) dan grade prospek (A, B, C, D) berbasis kecocokan firmografis, urgensi, dan respon.",
    inputDescription: "Profil perusahaan, histori aktivitas, interaksi WhatsApp, respon meeting.",
    outputFormat: "Nilai skor numerik, grade, sinyal positif, dan sinyal risiko.",
    schemaSnippet: `{
  "score": 88,
  "score_grade": "A",
  "positive_signals": ["Ada kebutuhan mendesak Q4", "Sponsor proyek level Direktur"],
  "negative_signals": ["Evaluasi kompetitor paralel sedang berjalan"],
  "score_explanation": "Kecocokan industri sangat tinggi dan anggaran telah dialokasikan..."
}`,
  },
  {
    key: "qualification_analysis",
    title: "BANTC / MEDDPICC Qualification Analysis",
    domain: "qualification",
    domainLabel: "2. Kualifikasi & Scoring",
    positioning: "Discovery Stage Qualification",
    trigger: "Tombol 'Run Qualification' pada Lead Detail",
    objective: "Menganalisis kematangan prospek pada pilar Budget, Authority, Need, Timeline, dan Competitor.",
    inputDescription: "Notulen meeting, histori chat, dan catatan sales rep.",
    outputFormat: "Widget kualifikasi visual BANTC pada CRM.",
    schemaSnippet: `{
  "budget_status": "Confirmed (IDR 500M - 1B)",
  "authority_status": "Decision Maker Identified (Pak Budi - VP Ops)",
  "need_urgency": "Critical (Peluncuran sistem baru November)",
  "timeline_commitment": "1-3 months",
  "competitor_presence": ["Salesforce", "Custom In-house"],
  "overall_qualification": "Fully Qualified"
}`,
  },
  {
    key: "lead_analysis",
    title: "Lead 360 Comprehensive Audit",
    domain: "qualification",
    domainLabel: "2. Kualifikasi & Scoring",
    positioning: "Pipeline Review",
    trigger: "Review pipeline mingguan atau tab analisis lead",
    objective: "Melakukan audit menyeluruh terhadap kelemahan, kelebihan, dan deal breaker pada suatu peluang.",
    inputDescription: "Seluruh log interaksi, profil perusahaan, dan penawaran yang diajukan.",
    outputFormat: "Daftar deal breaker, win probability, dan strategi mitigasi.",
    schemaSnippet: `{
  "strengths": ["Dukungan kuat dari tim teknis pengguna"],
  "weaknesses": ["Proses procurement memerlukan approval dewan komisaris"],
  "deal_breakers": ["Persyaratan on-premise data center lokal"],
  "recommended_strategy": "Tawarkan opsi hybrid cloud yang memenuhi regulasi OJK",
  "win_probability": 75
}`,
  },
  {
    key: "icp_generation",
    title: "ICP Profile Dynamic Generation",
    domain: "qualification",
    domainLabel: "2. Kualifikasi & Scoring",
    positioning: "Go-To-Market / ICP Settings",
    trigger: "Settings ➔ ICP Profiles ➔ 'Generate from Catalog'",
    objective: "Menyintesis profil pelanggan ideal (ICP) otomatis dari seluruh portofolio produk CRM yang ada.",
    inputDescription: "Daftar produk, fitur, use case, dan harga.",
    outputFormat: "Template profil ICP di tabel icp_profiles.",
    schemaSnippet: `{
  "profile_name": "Mid-Market F&B Distribution",
  "target_industries": ["Food & Beverage", "Retail Distribution"],
  "headcount_range": "100-1000",
  "key_pain_points": ["Kebocoran stok", "Penagihan faktur lambat"],
  "recommended_weights": { "firmographic": 30, "need": 40, "budget": 30 }
}`,
  },
  {
    key: "lead_icp_matching",
    title: "Lead ICP Matching Evaluation",
    domain: "qualification",
    domainLabel: "2. Kualifikasi & Scoring",
    positioning: "Lead Triage",
    trigger: "Saat lead dibuat atau dicocokkan dengan ICP aktif",
    objective: "Menghitung persentase kecocokan (0-100%) prospek terhadap kriteria ICP aktif.",
    inputDescription: "Data lead vs profil ICP terpilih.",
    outputFormat: "Badge persentase keselarasan ICP pada kartu lead.",
    schemaSnippet: `{
  "icp_match_percentage": 92,
  "matched_criteria": ["Industri sesuai", "Skala organisasi masuk rentang"],
  "unmatched_criteria": ["Lokasi gudang di luar pulau utama"],
  "tier_recommendation": "Tier 1 Priority"
}`,
  },
  {
    key: "lead_initial_rescore",
    title: "Lead Initial Batch Re-Score",
    domain: "qualification",
    domainLabel: "2. Kualifikasi & Scoring",
    positioning: "Batch Pipeline Cleanup",
    trigger: "Command batch scoring atau pembaruan bobot scoring",
    objective: "Menghitung ulang skor lead secara massal saat formula kualifikasi sistem diperbarui.",
    inputDescription: "Kumpulan data prospek dalam batch.",
    outputFormat: "Pembaruan skor massal di tabel leads.",
    schemaSnippet: `{ "lead_id": 104, "old_score": 45, "new_score": 72, "grade": "B" }`,
  },
  {
    key: "geo_product_fit_analysis",
    title: "Geo Product Fit Analysis",
    domain: "qualification",
    domainLabel: "2. Kualifikasi & Scoring",
    positioning: "Territory Planning",
    trigger: "Tab Wilayah / Analisis Peta Lead",
    objective: "Mengevaluasi kesiapan infrastruktur dan logistik wilayah prospek terhadap produk yang ditawarkan.",
    inputDescription: "Kota, provinsi, dan spesifikasi produk.",
    outputFormat: "Tingkat kesesuaian wilayah dan potensi hambatan.",
    schemaSnippet: `{
  "geo_fit_level": "High",
  "regional_advantages": ["Tersedia jaringan fiber optik andal di Kawasan Industri KIIC"],
  "regional_barriers": ["Jadwal kunjungan teknisi darat terbatas di akhir pekan"],
  "notes": "Sangat layak untuk penawaran paket Enterprise SLA"
}`,
  },

  // DOMAIN 3: Presales & Produk
  {
    key: "product_understanding",
    title: "Product Understanding Intelligence",
    domain: "product",
    domainLabel: "3. Presales & Produk",
    positioning: "Product Catalog Knowledge Ingestion",
    trigger: "Saat admin menambahkan produk baru atau mengunggah brosur",
    objective: "Mengurai teks brosur atau URL produk menjadi data semantik terstruktur siap pakai.",
    inputDescription: "Teks deskripsi produk, manual PDF, atau URL spesifikasi.",
    outputFormat: "Katalog persona, use case, dan nilai diferensiasi produk.",
    schemaSnippet: `{
  "target_industries": ["Banking", "Fintech", "Insurance"],
  "pain_points_solved": ["Verifikasi identitas manual", "Fraud pembukaan rekening"],
  "buyer_personas": ["Chief Risk Officer", "Head of Digital Onboarding"],
  "differentiators": ["Response time di bawah 1 detik", "Terakreditasi ISO 27001"]
}`,
  },
  {
    key: "product_matching",
    title: "Lead Product Matching Analysis",
    domain: "product",
    domainLabel: "3. Presales & Produk",
    positioning: "Presales Solution Formulation",
    trigger: "Tombol 'Match Products' pada detail prospek",
    objective: "Merekomendasikan produk CRM paling relevan untuk prospek beserta sudut penawaran (pitch angle).",
    inputDescription: "Kebutuhan prospek dan seluruh katalog produk aktif.",
    outputFormat: "Daftar rekomendasi produk dengan skor kecocokan.",
    schemaSnippet: `{
  "recommended_products": [
    {
      "product_id": 2,
      "product_name": "Omnichannel WhatsApp CRM",
      "match_score": 95,
      "pitch_angle": "Fokus pada integrasi CS ticketing dan respon pesan otomatis di bawah 1 menit."
    }
  ]
}`,
  },
  {
    key: "product_metadata_generation",
    title: "Product Metadata & Tag Generator",
    domain: "product",
    domainLabel: "3. Presales & Produk",
    positioning: "Catalog Management",
    trigger: "Form pembuatan produk baru",
    objective: "Menghasilkan tag pencarian, kategori, dan kata kunci industri dari ringkasan produk.",
    inputDescription: "Nama produk dan ringkasan fitur.",
    outputFormat: "Array tags dan kategori untuk indexing CRM.",
    schemaSnippet: `{ "tags": ["automation", "whatsapp-api", "ticketing", "sla-monitoring"], "category": "Communications" }`,
  },
  {
    key: "product_specification_comparison",
    title: "Product Specification Web Diff AI",
    domain: "product",
    domainLabel: "3. Presales & Produk",
    positioning: "Catalog Governance & Competitor Monitoring",
    trigger: "Settings ➔ Scrape & Compare atau Product Specs Diff",
    objective: "Mendeteksi perubahan fitur antara data CRM internal dengan data web resmi/kompetitor hasil web scrape.",
    inputDescription: "JSON produk internal vs teks hasil scraping website.",
    outputFormat: "Diff perubahan spesifikasi dan rekomendasi pembaruan.",
    schemaSnippet: `{
  "changes": [
    { "field": "pricing_notes", "old_value": "Per user/bulan", "new_value": "Tiered usage-based", "type": "updated" }
  ],
  "confidence_score": 92
}`,
  },
  {
    key: "product_question_generation",
    title: "Discovery & BANTC Question Guide Generator",
    domain: "product",
    domainLabel: "3. Presales & Produk",
    positioning: "Presales Preparation",
    trigger: "Sebelum sesi meeting atau saat menyiapkan proposal",
    objective: "Menyusun daftar pertanyaan penemuan kebutuhan (discovery questions) yang dirancang khusus untuk industri prospek.",
    inputDescription: "Produk yang ditargetkan dan profil industri prospek.",
    outputFormat: "Daftar pertanyaan terstruktur untuk sales rep.",
    schemaSnippet: `{
  "discovery_questions": [
    "Bagaimana tim operasional Anda saat ini memvalidasi bukti pengiriman barang di 10 cabang?",
    "Berapa rata-rata waktu yang dibutuhkan untuk rekonsiliasi invoice dengan pihak ekspedisi?"
  ]
}`,
  },

  // DOMAIN 4: Meeting Intelligence
  {
    key: "pre_meeting_brief_generation",
    title: "Pre-Meeting 1-Page Executive Brief",
    domain: "meeting",
    domainLabel: "4. Meeting Intelligence",
    positioning: "15 Menit Sebelum Pertemuan Klien",
    trigger: "Halaman Aktivitas Meeting ➔ 'Generate Pre-Meeting Brief'",
    objective: "Menyajikan ringkasan eksekutif 1 halaman berisi profil peserta, agenda utama, target deal, do's & don'ts, dan topik pembuka.",
    inputDescription: "Profil lead, catatan aktivitas sebelumnya, agenda meeting, riwayat chat.",
    outputFormat: "Kartu panduan siap baca sebelum sales masuk ruang meeting.",
    schemaSnippet: `{
  "meeting_objective": "Mendapatkan kesepakatan ruang lingkup PoC selama 14 hari.",
  "attendees_intel": "Pak Hendra (CFO) fokus pada efisiensi biaya; Ibu Maya (Head of CS) fokus kemudahan aplikasi.",
  "dos_and_donts": ["DO: Tunjukkan live dashboard respon waktu", "DON'T: Bahas kenaikan biaya tahun kedua saat demo awal"],
  "opening_talking_point": "Apresiasi atas ekspansi cabang mereka di Semarang minggu lalu."
}`,
  },
  {
    key: "meeting_summary",
    title: "Meeting Summary Generation (Multi-Type)",
    domain: "meeting",
    domainLabel: "4. Meeting Intelligence",
    positioning: "Post-Meeting Documentation",
    trigger: "Setelah meeting selesai dan notulen disimpan",
    objective: "Merangkum hasil pertemuan dengan prompt terspesialisasi sesuai jenis meeting (Discovery, Demo, Follow-up, Proposal, Closing, atau CSM Handover).",
    inputDescription: "Catatan kasar atau transkrip meeting + jenis meeting yang dipilih.",
    outputFormat: "Notulen resmi terstruktur, action items bertanggal, dan komitmen kedua pihak.",
    schemaSnippet: `{
  "executive_summary": "Klien menyetujui arsitektur teknis namun meminta diskon volume sebesar 10%...",
  "agreed_points": ["Implementasi dimulai awal bulan depan", "Integrasi ke ERP internal via REST API"],
  "action_items": [
    { "assignee": "AE", "task": "Kirim draf revisi penawaran harga", "due_date": "2026-10-16" }
  ],
  "next_meeting_date": "2026-10-20"
}`,
  },
  {
    key: "activity_transcript_analysis",
    title: "Activity Audio Transcript Analysis",
    domain: "meeting",
    domainLabel: "4. Meeting Intelligence",
    positioning: "Transcript Processing (Audio to Text)",
    trigger: "Saat file transkrip audio rekaman diunggah ke aktivitas",
    objective: "Membedah transkrip percakapan panjang untuk mengekstrak catatan komprehensif, hasil kesepakatan, dan sinyal BANTC.",
    inputDescription: "Teks transkrip rekaman pertemuan.",
    outputFormat: "Pembaruan otomatis catatan aktivitas dan data kualifikasi lead.",
    schemaSnippet: `{
  "description": "Diskusi mendalam mengenai kebutuhan integrasi SLA WhatsApp...",
  "outcome": "Klien meminta draf kontrak revisi paling lambat Jumat",
  "bantc": {
    "budget": "Rp 750.000.000",
    "authority": "Disetujui Ibu Rina (Direktur Operasional)",
    "needs": "Otomasi routing chat ke 20 cabang",
    "timeline": "Go-live Q4 2026",
    "competitor": "Tidak ada vendor lain yang aktif dipertimbangkan"
  }
}`,
  },
  {
    key: "meeting_evaluation",
    title: "Meeting & Conversation Evaluation",
    domain: "meeting",
    domainLabel: "4. Meeting Intelligence",
    positioning: "Sales Quality & Coaching",
    trigger: "Setelah ringkasan meeting atau chat dianalisis",
    objective: "Mengevaluasi sentimen klien, tingkat minat, deteksi keberatan tersembunyi, sinyal beli, dan rekomendasi aksi berikutnya.",
    inputDescription: "Teks percakapan meeting atau catatan sales.",
    outputFormat: "Skor sentimen, deteksi keberatan, dan next best action.",
    schemaSnippet: `{
  "sentiment": "Positive",
  "intent_level": "High",
  "interest_level": "Strong",
  "objections_detected": ["Kekhawatiran waktu migrasi data pelanggan lama"],
  "buying_signals": ["Menanyakan nomor rekening untuk uang muka", "Meminta draf NDA"],
  "next_best_action": "Kirim dokumen jaminan keamanan data dan jadwal timeline migrasi",
  "confidence_score": 92
}`,
  },
  {
    key: "whatsapp_analysis",
    title: "WhatsApp Conversation Intelligence",
    domain: "meeting",
    domainLabel: "4. Meeting Intelligence",
    positioning: "Daily Messaging Triage",
    trigger: "Pesan WhatsApp masuk atau sesi chat ditutup di inbox CRM",
    objective: "Menganalisis riwayat obrolan WhatsApp untuk mendeteksi urgensi pesan, komitmen sales, dan rekomendasi draf balasan cepat.",
    inputDescription: "Percakapan pesan WhatsApp antara prospek dan sales rep.",
    outputFormat: "Indikator urgensi, daftar pertanyaan yang belum terjawab, dan draf balasan.",
    schemaSnippet: `{
  "sentiment": "Neutral-Urgent",
  "urgency_level": "Immediate (Klien butuh penawaran sebelum jam 3 sore)",
  "client_inquiries": ["Apakah sistem support multi-cabang tanpa biaya lisensi tambahan?"],
  "suggested_reply": "Selamat siang Pak, betul sistem kami mendukung multi-cabang tanpa biaya lisensi per cabang. Berikut draf proposal yang sudah disesuaikan..."
}`,
  },

  // DOMAIN 5: Deal & PS Estimasi
  {
    key: "competitive_battle_card",
    title: "Competitive Battle Card Intelligence",
    domain: "deal",
    domainLabel: "5. Deal & PS Estimasi",
    positioning: "Objection Handling & Competitive Deals",
    trigger: "Lead Detail ➔ 'Generate Battle Card' vs Nama Kompetitor",
    objective: "Menghasilkan kartu strategi perang tanding instan melawan kompetitor spesifik (kelebihan, kelemahan kompetitor, talking points, dan strategi harga).",
    inputDescription: "Nama kompetitor yang sedang dievaluasi klien dan portofolio Leadsy.",
    outputFormat: "Kartu visual perbandingan taktik sales.",
    schemaSnippet: `{
  "competitor_name": "Vendor XYZ",
  "advantages": ["Support tim lokal 24/7 di Jakarta", "Gratis biaya setup integrasi API"],
  "weaknesses": ["Biaya tersembunyi untuk penambahan kuota pesan WhatsApp", "SLA server sering down di akhir bulan"],
  "counter_tactics": ["Tunjukkan perbandingan TCO (Total Cost of Ownership) 3 tahun"],
  "key_talking_points": ["Dengan Leadsy, seluruh fitur analitik sudah termasuk tanpa add-on mahal."]
}`,
  },
  {
    key: "ps_task_breakdown_generation",
    title: "Professional Service Task Breakdown AI",
    domain: "deal",
    domainLabel: "5. Deal & PS Estimasi",
    positioning: "Presales Technical Scoping & Pricing",
    trigger: "Estimasi PS ➔ 'Generate AI Task Breakdown'",
    objective: "Memecah ruang lingkup proyek teknis menjadi Work Breakdown Structure (WBS) hierarkis lengkap dengan peran tim dan estimasi mandays.",
    inputDescription: "Ringkasan ruang lingkup proyek, target deliverables, peran tim yang tersedia.",
    outputFormat: "Tabel hierarki tugas, peran teknis, kompleksitas, dan mandays.",
    schemaSnippet: `{
  "task_breakdown": [
    {
      "task_name": "Integrasi Database & API",
      "deliverable": "Konektor sinkronisasi data pelanggan real-time",
      "suggested_role": { "role_name": "Senior Backend Engineer", "confidence": "high" },
      "complexity": { "complexity_name": "Medium", "multiplier": 1.2 },
      "base_mandays": 12
    }
  ],
  "summary": {
    "total_base_mandays": 38,
    "confidence_level": "high",
    "pm_review_notes": ["Perlu konfirmasi spesifikasi webhook dari pihak ketiga"]
  }
}`,
  },
  {
    key: "next_action_recommendation",
    title: "Next Best Action Recommendation Engine",
    domain: "deal",
    domainLabel: "5. Deal & PS Estimasi",
    positioning: "Pipeline Deal Acceleration",
    trigger: "Panel Next Step pada Detail Lead / Deal Review",
    objective: "Memberikan rekomendasi aksi penjualan terbaik yang harus diambil hari ini untuk mencegah deal mandek (stalled).",
    inputDescription: "Tahapan deal saat ini, hari sejak kontak terakhir, skor lead, dan histori.",
    outputFormat: "Widget rekomendasi aksi prioritas beserta draf pesan follow up.",
    schemaSnippet: `{
  "recommended_action": "Kirimkan studi kasus klien perbankan serupa yang sukses menghemat 30% waktu operasional",
  "rationale": "Deal telah berada di tahap evaluasi selama 12 hari tanpa interaksi",
  "channel": "WhatsApp & Email",
  "confidence_score": 88
}`,
  },
  {
    key: "summary_generation",
    title: "Multi-Touchpoint Account Summary",
    domain: "deal",
    domainLabel: "5. Deal & PS Estimasi",
    positioning: "Account Review & Transition",
    trigger: "Tab Ringkasan Akun atau saat perpindahan sales rep",
    objective: "Merangkum puluhan interaksi terpisah menjadi 1 narasi perkembangan akun yang runut dan jelas.",
    inputDescription: "Histori panggilan, chat, email, dan penawaran yang pernah dibuat.",
    outputFormat: "Ringkasan eksekutif perjalanan akun.",
    schemaSnippet: `{
  "account_story": "Prospek masuk via Google Ads pada Agustus, telah melalui 3 sesi demo teknis, kendala utama seputar keamanan data telah terselesaikan melalui addendum NDA..."
}`,
  },

  // DOMAIN 6: Revenue & CSM
  {
    key: "revenue_intelligence_analysis",
    title: "Revenue Intelligence & Deal Health",
    domain: "success",
    domainLabel: "6. Revenue & CSM",
    positioning: "Sales Management & Forecasting",
    trigger: "Dashboard Revenue Intelligence / Halaman Pipeline Deals",
    objective: "Mendiagnosis kesehatan pipeline, mendeteksi tanggal closing yang terus diundur (slipping deals), dan memprediksi akurasi proyeksi pendapatan.",
    inputDescription: "Data pipeline seluruh tim sales, tren pergerakan deal, dan riwayat revisi tanggal closing.",
    outputFormat: "Skor kesehatan deal, faktor risiko, dan kategori forecast.",
    schemaSnippet: `{
  "deal_health_score": 68,
  "risk_factors": ["Closing date diundur sebanyak 3 kali", "Belum ada interaksi dengan pihak pengambil keputusan ekonomi"],
  "momentum_indicators": "Slowing down",
  "closing_probability": 55,
  "forecast_category": "Upside (bukan Commit)"
}`,
  },
  {
    key: "customer_journey_story",
    title: "Customer Journey Story Generator",
    domain: "success",
    domainLabel: "6. Revenue & CSM",
    positioning: "Case Study & Win-Loss Analysis",
    trigger: "Setelah deal berstatus Won / Closed",
    objective: "Mengubah riwayat interaksi deal yang sukses menjadi studi kasus keberhasilan pelanggan yang siap dipublikasikan atau dijadikan materi sales enablement.",
    inputDescription: "Seluruh riwayat perjalanan prospek dari hari pertama hingga tanda tangan kontrak.",
    outputFormat: "Dokumen naratif kisah sukses pelanggan.",
    schemaSnippet: `{
  "title": "Bagaimana PT Tri Distribusi Memangkas Waktu Rekonsiliasi PO Sebesar 40%",
  "the_challenge": "Tantangan operasional manual dan tingginya human-error...",
  "the_solution": "Penerapan otomatisasi Leadsy CRM dan WhatsApp Gateway...",
  "the_outcome": "Peningkatan SLA penagihan dari 14 hari menjadi 3 hari kerja."
}`,
  },
  {
    key: "cs_playbook_ai",
    title: "Customer Success Tactical Playbook AI",
    domain: "success",
    domainLabel: "6. Revenue & CSM",
    positioning: "Post-Sales Onboarding & Churn Prevention",
    trigger: "Customer Success ➔ 'Generate Tactical Playbook'",
    objective: "Menghasilkan panduan aksi bertahap (24 jam, 72 jam, 7 hari) bagi tim Customer Success saat menghadapi risiko retensi atau peluang ekspansi akun.",
    inputDescription: "Skenario risiko klien (misal: adopsi pengguna turun, pergantian penanggung jawab proyek).",
    outputFormat: "Rencana aksi taktis, poin pembicaraan mitigasi, dan draf pesan penjangkauan.",
    schemaSnippet: `{
  "scenario_title": "Penurunan Aktivitas Login Klien Sebesar 35% Pasca-Implementasi",
  "immediate_actions": [
    "24 Jam: Hubungi Project Champion untuk menanyakan kendala lapangan",
    "72 Jam: Jadwalkan sesi pendampingan ulang gratis bagi 10 user operasional",
    "7 Hari: Review metrik log penggunaan dan serahkan laporan mingguan ke Direktur"
  ],
  "stakeholder_talking_points": ["Kami hadir untuk memastikan ROI investasi sistem Anda tercapai secara optimal..."],
  "outreach_message_draft": "Selamat pagi Pak Budi, tim CS kami melihat ada beberapa fitur automasi baru yang belum sempat dieksplor tim Anda..."
}`,
  },
  {
    key: "ai_account_review_generator",
    title: "Customer QBR / Executive Review Generator",
    domain: "success",
    domainLabel: "6. Revenue & CSM",
    positioning: "Quarterly Business Review & Account Expansion",
    trigger: "Customer Success ➔ 'Generate Account Review'",
    objective: "Menyusun dokumen presentasi tinjauan bisnis kuartalan (QBR) eksekutif berisi nilai tambah yang telah dicapai dan roadmap ekspansi 90 hari ke depan.",
    inputDescription: "Metrik penggunaan pelanggan, tiket kendala yang terselesaikan, dan target bisnis klien.",
    outputFormat: "Laporan tinjauan bisnis eksekutif dan rekomendasi upsell.",
    schemaSnippet: `{
  "executive_summary": "Selama Q3, sistem telah memproses 12.450 transaksi dengan rata-rata waktu respon 45 detik...",
  "value_delivered": ["Penghematan 180 jam kerja administrasi manual per bulan", "NPS kepuasan pelanggan naik 15 poin"],
  "forward_roadmap": ["Rollout integrasi ke cabang Medan dan Makassar pada Q4"],
  "expansion_recommendations": "Upgrade ke paket API Dedicated untuk volume transaksi di atas 50k per bulan"
}`,
  },
  {
    key: "dashboard_ai_insight",
    title: "Executive Dashboard AI Insights",
    domain: "success",
    domainLabel: "6. Revenue & CSM",
    positioning: "Executive Cockpit / C-Level Overview",
    trigger: "Halaman Utama Dashboard Leadsy",
    objective: "Menganalisis indikator kinerja utama CRM (jumlah lead baru, tingkat konversi, kecepatan siklus deal) dan merangkum wawasan strategis untuk Direksi.",
    inputDescription: "Agregasi metrik pipeline, performa per sales rep, dan deviasi target bulanan.",
    outputFormat: "Kartu analitik naratif pada header dashboard manajemen.",
    schemaSnippet: `{
  "key_insight": "Tingkat konversi dari tahap Discovery ke Demo meningkat 18% minggu ini berkat pemanfaatan Pre-Meeting Brief.",
  "warning_flag": "Segmen manufaktur mengalami perlambatan siklus closing rata-rata 8 hari dibanding kuartal lalu.",
  "strategic_recommendation": "Fokuskan tim presales senior untuk mendampingi demo pada 5 deal enterprise manufaktur prioritas."
}`,
  },
];

const LIFECYCLE_STEPS = [
  {
    step: "01",
    title: "Lead Capture & Ingestion",
    role: "Marketing & SDR",
    desc: "Menangkap prospek baru secara instan dari formulir web, WhatsApp, iklan digital, integrasi peta Google Maps, maupun import massal file Excel/CSV.",
    aiTouchpoints: ["lead_enrichment", "lead_industry_classification", "lead_business_category_classification"],
  },
  {
    step: "02",
    title: "Autonomous Web Profiling",
    role: "AI Agent & SDR",
    desc: "Sistem secara otomatis mengaktifkan web research engine untuk memindai website resmi, berita, dan model bisnis perusahaan prospek tanpa perlu input manual.",
    aiTouchpoints: ["lead_ai_profiling", "lead_company_size_classification", "lead_contact_google_search_keyword"],
  },
  {
    step: "03",
    title: "Qualification & BANTC Scoring",
    role: "SDR & Sales Manager",
    desc: "Menghitung skor kelayakan prospek (Skor 0-100, Grade A/B/C/D) serta mengevaluasi variabel kesiapan anggaran (Budget), pengambil keputusan (Authority), urgensi (Need), waktu (Timeline), dan pesaing (Competitor).",
    aiTouchpoints: ["lead_scoring", "qualification_analysis", "lead_icp_matching", "geo_product_fit_analysis"],
  },
  {
    step: "04",
    title: "Presales & Solution Formulating",
    role: "Account Executive & Solution Architect",
    desc: "Memilih produk CRM yang paling tepat dari katalog internal, menyiapkan sudut penawaran bernilai tinggi, dan memandu AE dengan daftar pertanyaan discovery yang tajam.",
    aiTouchpoints: ["product_matching", "product_question_generation", "product_specification_comparison"],
  },
  {
    step: "05",
    title: "Meeting Preparation & Execution",
    role: "Account Executive",
    desc: "Sebelum meeting, AE menerima 1-Page Pre-Meeting Brief. Usai meeting, transkrip rekaman atau notulen langsung diubah menjadi rangkuman terstruktur sesuai tipe pertemuan, lengkap dengan evaluasi sentimen.",
    aiTouchpoints: ["pre_meeting_brief_generation", "meeting_summary", "activity_transcript_analysis", "meeting_evaluation", "whatsapp_analysis"],
  },
  {
    step: "06",
    title: "Deal Acceleration & PS Estimation",
    role: "AE & Professional Services Manager",
    desc: "Menghadapi komparasi kompetitor dengan Battle Card instan. Untuk kebutuhan kustomisasi teknis, AI memecah WBS proyek menjadi rincian tugas, alokasi peran spesialis, dan estimasi mandays.",
    aiTouchpoints: ["competitive_battle_card", "ps_task_breakdown_generation", "next_action_recommendation"],
  },
  {
    step: "07",
    title: "Customer Success & Account Growth",
    role: "CSM & Account Manager",
    desc: "Setelah deal berhasil ditutup (Won), sistem menyusun kisah sukses pelanggan, menyediakan playbook taktis pemulihan akun jika terjadi penurunan adopsi, serta menyusun materi presentasi QBR otomatis.",
    aiTouchpoints: ["customer_journey_story", "cs_playbook_ai", "ai_account_review_generator", "revenue_intelligence_analysis", "dashboard_ai_insight"],
  },
];

export default function SystemPlaybookPage() {
  const [activeTab, setActiveTab] = React.useState<"lifecycle" | "catalog" | "governance">("lifecycle");
  const [selectedDomain, setSelectedDomain] = React.useState<DomainKey>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [expandedKeys, setExpandedKeys] = React.useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredFeatures = React.useMemo(() => {
    return AI_FEATURES_CATALOG.filter((item) => {
      const matchDomain = selectedDomain === "all" || item.domain === selectedDomain;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q) ||
        item.objective.toLowerCase().includes(q) ||
        item.positioning.toLowerCase().includes(q);
      return matchDomain && matchQuery;
    });
  }, [selectedDomain, searchQuery]);

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <BackToSettings />
            <Badge variant="brand" className="font-mono text-xs">
              Platform & AI Directory
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Leadsy System & AI Intelligence Playbook</h1>
          <p className="text-sm text-muted-foreground">
            Panduan operasional alur kerja CRM, direktori resmi 33 fungsi AI terstandarisasi, dan spesifikasi output.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/settings/ai-defaults">
            <Button variant="outline" size="sm" className="gap-2">
              <Bot className="h-4 w-4" />
              Kelola AI Defaults & Routing
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        items={[
          { key: "lifecycle", label: "Cara Penggunaan Leadsy (7 Tahap)", icon: Workflow },
          { key: "catalog", label: `Katalog Fitur AI (${filteredFeatures.length})`, icon: Bot },
          { key: "governance", label: "Tata Kelola & Output Kontrak", icon: ShieldCheck },
        ]}
      />

      {/* TAB 1: CARA PENGGUNAAN LEADSY */}
      {activeTab === "lifecycle" && (
        <div className="space-y-6">
          <Card className="border-border/80 bg-gradient-to-br from-card to-[color:var(--surface-subtle)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Alur Kerja Penjualan B2B End-to-End</CardTitle>
                  <CardDescription>
                    Bagaimana seluruh modul di Leadsy terintegrasi dari penangkapan prospek hingga retensi pelanggan.
                  </CardDescription>
                </div>
                <Badge variant="brand" className="hidden sm:inline-flex">
                  Standard Operating Procedure
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Leadsy mengadopsi prinsip <strong>Human-in-the-Loop CRM</strong>, di mana AI bekerja otonom sebagai asisten
                intelijen untuk mengumpulkan data, menghitung skor kualifikasi, dan menyusun draf dokumen, sementara kendali
                keputusan strategis tetap berada di tangan tim Sales dan Manajemen.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {LIFECYCLE_STEPS.map((step) => (
              <Card key={step.step} className="hover:border-border transition-all">
                <div className="p-5 flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex items-center gap-3 md:w-48 shrink-0">
                    <span className="text-2xl font-black text-[color:var(--brand)] font-mono">
                      {step.step}
                    </span>
                    <div>
                      <h2 className="font-semibold text-sm leading-tight">{step.title}</h2>
                      <span className="text-xs text-muted-foreground">{step.role}</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-foreground/90 leading-relaxed">{step.desc}</p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-[color:var(--brand)]" />
                        AI Terkait:
                      </span>
                      {step.aiTouchpoints.map((aiKey) => (
                        <button
                          key={aiKey}
                          onClick={() => {
                            setActiveTab("catalog");
                            setSearchQuery(aiKey);
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-[color:var(--surface-subtle)] hover:bg-muted px-2 py-0.5 text-xs font-mono font-medium text-foreground transition-colors border border-border/60"
                        >
                          {aiKey}
                          <ArrowRight className="h-2.5 w-2.5 opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: KATALOG LENGKAP 33 FITUR AI */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari fitur AI berdasarkan nama, key, atau tujuan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {DOMAINS.map((domain) => {
                const Icon = domain.icon;
                const active = selectedDomain === domain.key;
                return (
                  <button
                    key={domain.key}
                    onClick={() => setSelectedDomain(domain.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground hover:text-foreground border-border"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {domain.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid gap-4">
            {filteredFeatures.map((item) => {
              const isExpanded = !!expandedKeys[item.key];
              return (
                <Card key={item.key} className="overflow-hidden transition-all hover:border-border">
                  <div className="p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[color:var(--brand)]/10 text-[color:var(--brand)] border border-[color:var(--brand)]/20">
                            {item.key}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {item.domainLabel}
                          </Badge>
                        </div>
                        <h2 className="text-base font-bold tracking-tight text-foreground">{item.title}</h2>
                      </div>

                      <div className="text-xs text-muted-foreground sm:text-right shrink-0">
                        <span className="block font-medium text-foreground/80">Positioning:</span>
                        <span>{item.positioning}</span>
                      </div>
                    </div>

                    <p className="text-sm text-foreground/90 leading-relaxed">{item.objective}</p>

                    <div className="grid sm:grid-cols-2 gap-3 text-xs bg-[color:var(--surface-subtle)] p-3 rounded-xl border border-border/50">
                      <div>
                        <span className="font-semibold text-muted-foreground block mb-0.5">Pemicu Operasional (Trigger):</span>
                        <span className="text-foreground">{item.trigger}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-muted-foreground block mb-0.5">Data Input yang Digunakan:</span>
                        <span className="text-foreground">{item.inputDescription}</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        <span>Format Output: <strong className="text-foreground">{item.outputFormat}</strong></span>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(item.key)}
                        className="text-xs gap-1.5 h-7 px-2.5"
                      >
                        {isExpanded ? "Sembunyikan Kontrak Output" : "Lihat Kontrak JSON Output"}
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                        <span className="text-xs font-semibold text-muted-foreground block">
                          Contoh Skema JSON yang Dihasilkan:
                        </span>
                        <pre className="p-3 rounded-xl bg-muted/70 font-mono text-xs overflow-x-auto text-foreground/90 border border-border/80 leading-relaxed">
                          {item.schemaSnippet}
                        </pre>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}

            {filteredFeatures.length === 0 && (
              <div className="text-center py-12 rounded-2xl border border-dashed border-border p-6 space-y-2">
                <Bot className="h-8 w-8 text-muted-foreground mx-auto" />
                <h2 className="text-base font-semibold">Tidak ada fitur AI yang cocok</h2>
                <p className="text-xs text-muted-foreground">
                  Coba ubah kata kunci pencarian atau pilih domain yang lain.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedDomain("all");
                  }}
                >
                  Reset Filter
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TATA KELOLA & OUTPUT */}
      {activeTab === "governance" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-[color:var(--brand)]">
                  <Bot className="h-5 w-5" />
                  <CardTitle className="text-lg">Dynamic Routing & Fallback System</CardTitle>
                </div>
                <CardDescription>
                  Arsitektur toleransi kegagalan dan pemilihan model LLM per fitur.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Setiap fitur AI di Leadsy tidak di-hardcode ke satu provider model tertentu. Melalui menu{" "}
                  <strong className="text-foreground">Settings ➔ AI Defaults</strong>, Admin dapat:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-foreground/90 text-xs">
                  <li>
                    <strong>Menentukan Provider per Fitur</strong>: Model ringan seperti <em>Gemini 2.5 Flash</em> untuk WhatsApp analysis,
                    dan model penalaran tinggi seperti <em>Claude 3.5 Sonnet / Gemini Pro</em> untuk estimasi mandays PS & battle card.
                  </li>
                  <li>
                    <strong>Fallback Chain Otomatis</strong>: Jika API kuota Google Gemini habis atau mengalami timeout, request langsung
                    dialihkan ke OpenAI atau provider cadangan berikutnya tanpa error di layar pengguna.
                  </li>
                  <li>
                    <strong>Penyesuaian Timeout & Retry</strong>: Batas waktu tunggu eksekusi dan jumlah percobaan ulang dapat disetel per fungsi.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-[color:var(--status-success)]">
                  <DollarSign className="h-5 w-5" />
                  <CardTitle className="text-lg">Transparansi Biaya & Token (IDR)</CardTitle>
                </div>
                <CardDescription>
                  Audit riil pemakaian token dan konversi otomatis ke Rupiah.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Setiap kali fungsi AI dijalankan, sistem secara presisi mencatat metadata audit:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-foreground/90 text-xs">
                  <li>
                    <strong>Input & Output Token</strong>: Dihitung langsung dari respon provider (bukan estimasi kasar).
                  </li>
                  <li>
                    <strong>Kurs Valuta Harian</strong>: Biaya USD dikonversikan ke IDR menggunakan kurs acuan Bank Indonesia / API aktif pada hari pemanggilan.
                  </li>
                  <li>
                    <strong>Audit Trail Governance</strong>: Riwayat pemanggilan, latensi, dan prompt yang digunakan dapat dipantau di{" "}
                    <em>Settings ➔ AI Defaults (Tab Usage & Audit)</em>.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pengeditan Prompt Mandiri (Tanpa Coding / Deploy)</CardTitle>
              <CardDescription>
                Standarisasi prompt system-managed yang dapat disesuaikan kebutuhan bisnis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Seluruh 33 fitur AI menggunakan template prompt terpusat di database. Admin perusahaan dapat mengubah persona AI,
                instruksi nada bahasa, atau format output khusus industri melalui menu{" "}
                <strong className="text-foreground">Settings ➔ AI Defaults ➔ Prompt Templates</strong>.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/settings/ai-defaults?tab=prompts">
                  <Button size="sm" className="gap-2">
                    Buka Editor Prompt Templates
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Link href="/settings/ai-defaults?tab=routes">
                  <Button variant="outline" size="sm" className="gap-2">
                    Buka AI Feature Routes
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
