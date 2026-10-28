<?php

namespace App\Console\Commands;

use App\Models\LarkIntegration;
use App\Models\User;
use App\Services\Lark\LarkDriveService;
use Exception;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CreateLarkUatDocCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leadsy:create-lark-uat-doc {--folder=MeuKfHQUFlVsaMdOfMkldZc6gkh : Lark Drive folder token}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create the comprehensive Leadsy Enterprise UAT document in Lark Docs';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $folderToken = $this->option('folder') ?: 'MeuKfHQUFlVsaMdOfMkldZc6gkh';

        $this->info("Initializing Lark integration...");
        $integration = LarkIntegration::where('is_active', true)->first();

        if (!$integration) {
            $this->error("No active Lark integration found in the database.");
            return 1;
        }

        $driveService = new LarkDriveService($integration);

        $docTitle = 'Leadsy Enterprise - Dokumen UAT Menyeluruh v1.42.0';
        $this->info("Creating Lark Document: '{$docTitle}'...");

        $documentId = null;
        $inFolder = false;

        // 1. Try creating directly in the folder
        try {
            $createRes = $driveService->request('POST', '/docx/v1/documents', [
                'folder_token' => $folderToken,
                'title' => $docTitle,
            ]);
            $documentId = $createRes['document']['document_id'] ?? $createRes['data']['document']['document_id'] ?? null;
            if ($documentId) {
                $inFolder = true;
                $this->info("Successfully created directly inside target folder [{$folderToken}].");
            }
        } catch (Exception $e) {
            $this->warn("Could not create directly in folder [{$folderToken}]: " . $e->getMessage());
            $this->info("Creating in root drive and configuring permissions...");
        }

        // 2. Fallback to creating in root drive if folder creation was denied
        if (!$documentId) {
            try {
                $createRes = $driveService->request('POST', '/docx/v1/documents', [
                    'title' => $docTitle,
                ]);
                $documentId = $createRes['document']['document_id'] ?? $createRes['data']['document']['document_id'] ?? null;
            } catch (Exception $e) {
                $this->error("Failed to create Lark Doc: " . $e->getMessage());
                return 1;
            }
        }

        if (!$documentId) {
            $this->error("Failed to obtain document ID from Lark API response.");
            return 1;
        }

        $this->info("Document created with ID: {$documentId}");

        // 3. Grant Full Access to primary user and set tenant-wide link sharing
        try {
            $driveService->request('POST', "/drive/v1/permissions/{$documentId}/members?type=docx", [
                'member_type' => 'email',
                'member_id' => 'kodratsantoso@prasetia.co.id',
                'perm' => 'full_access'
            ]);
            $this->info("Granted full_access permission to kodratsantoso@prasetia.co.id.");
        } catch (Exception $e) {
            $this->warn("Permission assignment note: " . $e->getMessage());
        }

        try {
            $driveService->request('PATCH', "/drive/v1/permissions/{$documentId}/public?type=docx", [
                'link_share_entity' => 'tenant_editable'
            ]);
            $this->info("Enabled tenant-wide link edit permission (tenant_editable).");
        } catch (Exception $e) {
            $this->warn("Public link sharing note: " . $e->getMessage());
        }

        // 4. If not in folder, try moving it to target folder
        if (!$inFolder && $folderToken) {
            try {
                $driveService->request('POST', "/drive/v1/files/{$documentId}/move", [
                    'type' => 'docx',
                    'folder_token' => $folderToken
                ]);
                $inFolder = true;
                $this->info("Successfully moved document into target folder [{$folderToken}].");
            } catch (Exception $e) {
                $this->warn("Move to folder note (destination folder requires user share with bot): " . $e->getMessage());
            }
        }

        // 5. Populate Document Blocks
        $this->info("Writing full UAT content blocks into the document...");
        $this->populateDocContent($driveService, $documentId);

        $docUrl = "https://prasetia.sg.larksuite.com/docx/{$documentId}";
        $this->info("================================================================================");
        $this->info("Lark UAT Document successfully created!");
        $this->info("URL: {$docUrl}");
        $this->info("Folder: https://prasetia.sg.larksuite.com/drive/folder/{$folderToken}");
        $this->info("Status in Target Folder: " . ($inFolder ? "Inside Folder" : "Shared with Full Access to kodratsantoso@prasetia.co.id (Ready to Move)"));
        $this->info("================================================================================");

        return 0;
    }

    protected function populateDocContent(LarkDriveService $driveService, string $documentId): void
    {
        $docInfo = $driveService->request('GET', "/docx/v1/documents/{$documentId}");
        $rootBlockId = $docInfo['data']['document']['document_id'] ?? $documentId;

        $blocks = [];

        // Header Subtitle / Overview
        $blocks[] = [
            'block_type' => 15, // Quote block
            'quote' => [
                'elements' => [
                    [
                        'type' => 'text',
                        'text_run' => [
                            'content' => "DOKUMEN PENGUJIAN PENERIMAAN PENGGUNA (UAT)\n"
                                . "Leadsy Enterprise — RevOps-to-Cash-to-Value Operating System\n\n"
                                . "• Versi Rilis: v1.42.0\n"
                                . "• URL Pengujian (Produksi): https://leadsy.tech\n"
                                . "• Target Penguji: Product Owner, Solution Architect, Sales Lead, Project Manager, Finance Manager, Customer Success Lead\n"
                                . "• Tanggal Pembuatan: " . date('d F Y') . "\n"
                                . "• Status: Siap untuk UAT Sign-off",
                            'text_element_style' => ['bold' => true]
                        ]
                    ]
                ]
            ]
        ];

        $blocks[] = ['block_type' => 22, 'divider' => new \stdClass()];

        // Section 1: Prasyarat & Lingkungan Pengujian
        $blocks[] = [
            'block_type' => 3, // Heading 1
            'heading1' => [
                'elements' => [['type' => 'text', 'text_run' => ['content' => '1. Prasyarat & Lingkungan Pengujian', 'text_element_style' => ['bold' => true, 'text_color' => 4]]]]
            ]
        ];

        $prereqs = [
            "Menggunakan browser modern (Google Chrome, Mozilla Firefox, Safari, atau Microsoft Edge) versi terbaru.",
            "Membuka URL resmi produksi: https://leadsy.tech.",
            "Memastikan domain legacy https://leadsy.virtuenet.space mengembalikan redirect 301 ke https://leadsy.tech.",
            "Akun pengujian memiliki hak akses ke modul Leads, Presales, Professional Services, Revenue, Customer Success, dan Help Center & LMS.",
            "Pastikan koneksi internet stabil untuk pengujian streaming WebSockets and real-time interactive cards."
        ];

        foreach ($prereqs as $p) {
            $blocks[] = [
                'block_type' => 12, // Bullet
                'bullet' => [
                    'elements' => [['type' => 'text', 'text_run' => ['content' => $p]]]
                ]
            ];
        }

        $blocks[] = ['block_type' => 22, 'divider' => new \stdClass()];

        // Section 2: Matriks Kasus Uji
        $blocks[] = [
            'block_type' => 3, // Heading 1
            'heading1' => [
                'elements' => [['type' => 'text', 'text_run' => ['content' => '2. Matriks Kasus Uji (Test Cases Matrix)', 'text_element_style' => ['bold' => true, 'text_color' => 4]]]]
            ]
        ];

        $scenarios = [
            [
                'title' => 'Skenario 1: Sales / BDR — Prospeksi Geospasial & Autonomous AI Screening',
                'cases' => [
                    [
                        'id' => 'TC-001',
                        'name' => 'Landing Page & CTA Help Center',
                        'steps' => "1. Buka https://leadsy.tech\n2. Periksa navbar atas dan tombol CTA di hero.\n3. Klik tombol 'Pusat Bantuan & LMS'.",
                        'expected' => "Halaman berpindah mulus ke /help dengan animasi Motion UI tanpa error."
                    ],
                    [
                        'id' => 'TC-002',
                        'name' => 'Login & Autentikasi Sistem',
                        'steps' => "1. Klik tombol 'Masuk' / 'Portal Masuk Tim'.\n2. Masukkan email & password terdaftar.\n3. Klik Masuk.",
                        'expected' => "Berhasil login, token tersimpan di state sesi, dan diarahkan ke Dashboard utama."
                    ],
                    [
                        'id' => 'TC-003',
                        'name' => 'Radar Wilayah Google Maps',
                        'steps' => "1. Buka menu Map / Lead Generator.\n2. Tentukan radius dan target kategori industri.\n3. Klik Generate Leads.",
                        'expected' => "Titik koordinat entitas bisnis terpetakan di radar geospasial dengan detail alamat dan kontak."
                    ],
                    [
                        'id' => 'TC-004',
                        'name' => '8-Tahap AI Screening & Scoring',
                        'steps' => "1. Buka menu Leads.\n2. Klik tombol 'Screen with AI' pada salah satu prospek.\n3. Amati progress bar 8-tahap.",
                        'expected' => "Sistem mengevaluasi 8 pos validasi (Eligibility s/d BANTC) secara berurutan dan menghasilkan skor BANTC (Grade A/B/C/D)."
                    ],
                    [
                        'id' => 'TC-005',
                        'name' => 'Cadence & WhatsApp Outreach',
                        'steps' => "1. Buka tab Cadence pada detail prospek.\n2. Tinjau template pesan tindak lanjut.\n3. Klik kirim atau jadwalkan cadence.",
                        'expected' => "Pesan cadence tercatat di riwayat interaksi dan terhubung ke antrean pengiriman WhatsApp."
                    ],
                ]
            ],
            [
                'title' => 'Skenario 2: Solution Architect — Presales Sizing, Bundling Margin & SOW',
                'cases' => [
                    [
                        'id' => 'TC-006',
                        'name' => 'Role Perspective: Solution Architect',
                        'steps' => "1. Buka halaman detail Deal.\n2. Pada header atas, klik tab 'Solution Architect' di Role Switcher.",
                        'expected' => "Tampilan berpindah otomatis ke tab prioritas SA (Technical Discovery, Presales Sizing, SOW)."
                    ],
                    [
                        'id' => 'TC-007',
                        'name' => 'Presales Sizing Calculator',
                        'steps' => "1. Buka tab Presales Sizing.\n2. Tambahkan komponen deliverable teknis dan jumlah man-days.\n3. Ubah level engineer (Junior, Senior, Architect).",
                        'expected' => "Biaya internal dan harga jual komersial terhitung otomatis secara instan."
                    ],
                    [
                        'id' => 'TC-008',
                        'name' => 'Product Bundling Margin Calculation',
                        'steps' => "1. Buka modal Product Bundling.\n2. Pilih kombinasi produk software/hardware dan jasa profesional.\n3. Periksa margin kotor gabungan.",
                        'expected' => "Muncul indikator visual kesehatan margin (Hijau jika aman, Kuning/Merah jika di bawah threshold)."
                    ],
                    [
                        'id' => 'TC-009',
                        'name' => 'Statement of Work (SOW) Generation',
                        'steps' => "1. Klik tombol 'Generate SOW / BAST'.\n2. Pilih tipe 'Statement of Work'.\n3. Tentukan termin pembayaran (misal 50% DP, 50% Final).",
                        'expected' => "Dokumen SOW terbuat lengkap dengan penomoran standar dan tabel deliverables terstruktur."
                    ],
                    [
                        'id' => 'TC-010',
                        'name' => 'SOW Instant Preview & Print PDF',
                        'steps' => "1. Pada daftar dokumen, klik tombol Preview/Cetak.\n2. Tinjau tata letak dokumen di modal viewer.",
                        'expected' => "Dokumen tampil rapi sesuai layout standar corporate, siap diunduh dalam format PDF resmi."
                    ],
                ]
            ],
            [
                'title' => 'Skenario 3: Project Manager — SOW-to-Project Plan Converter & BAST',
                'cases' => [
                    [
                        'id' => 'TC-011',
                        'name' => 'Role Perspective: Project Manager',
                        'steps' => "1. Pada Deal Workspace, klik opsi 'Project Manager' di switcher.",
                        'expected' => "Antarmuka memfokuskan tab ke Professional Services, Project Plan, dan Tasks."
                    ],
                    [
                        'id' => 'TC-012',
                        'name' => '1-Click SOW to Project Plan Conversion',
                        'steps' => "1. Buka dokumen SOW yang berstatus Approved/Signed.\n2. Klik tombol 'Inisialisasi Project Plan'.\n3. Konfirmasi aksi.",
                        'expected' => "Sistem mengonversi seluruh deliverable SOW menjadi PsProjectPlan dan PsProjectTask otomatis."
                    ],
                    [
                        'id' => 'TC-013',
                        'name' => 'WBS & Timeline Project Plan Management',
                        'steps' => "1. Buka tab Project Plans.\n2. Periksa daftar tiket tugas dan timeline.\n3. Tetapkan PIC teknis dan tanggal target.",
                        'expected' => "Tiket tugas tersimpan dengan status dan assignee yang valid tanpa duplikasi data."
                    ],
                    [
                        'id' => 'TC-014',
                        'name' => 'Penerbitan BAST Milestone',
                        'steps' => "1. Buka modal dokumen, pilih tipe 'BAST'.\n2. Pilih milestone yang telah selesai (misal BAST Tahap 1).\n3. Buat dokumen serah terima.",
                        'expected' => "BAST terbit dengan nomor format resmi dan klausul serah terima pekerjaan lengkap."
                    ],
                    [
                        'id' => 'TC-015',
                        'name' => 'BAST Digital Sign & Notifikasi Otomatis',
                        'steps' => "1. Tandatangani BAST (status berubah menjadi Signed).\n2. Periksa trigger webhook ke Lark/Sistem.",
                        'expected' => "Sistem otomatis mengirimkan Interactive Card ke Finance via Lark untuk penagihan invoice."
                    ],
                ]
            ],
            [
                'title' => 'Skenario 4: Finance & Accounting — Automated Milestone Invoicing & Tax',
                'cases' => [
                    [
                        'id' => 'TC-016',
                        'name' => 'Role Perspective: Finance & Accounting',
                        'steps' => "1. Klik opsi 'Finance & Accounting' di Role Switcher.\n2. Amati tab yang diprioritaskan.",
                        'expected' => "Tab berpindah ke Revenue & Invoices, BAST Komersial, dan Ringkasan Margin Keuangan."
                    ],
                    [
                        'id' => 'TC-017',
                        'name' => 'Pembuatan Faktur dari Signed BAST',
                        'steps' => "1. Pada kartu BAST yang telah signed, klik tombol 'Buat Invoice'.\n2. Periksa isian nominal milestone pada modal.",
                        'expected' => "Nominal DPP milestone terisi otomatis dari nilai kontrak BAST tanpa input manual."
                    ],
                    [
                        'id' => 'TC-018',
                        'name' => 'Kalkulasi Pajak Indonesia (PPN 11% & PPh 23)',
                        'steps' => "1. Centang opsi PPN 11%.\n2. Centang opsi estimasi potongan PPh Pasal 23 (2%).\n3. Periksa total akhir tagihan.",
                        'expected' => "Total tagihan menghitung: DPP + PPN (11%) - Estimasi PPh 23 (2%) secara akurat."
                    ],
                    [
                        'id' => 'TC-019',
                        'name' => 'Cetak & Unduh Faktur Komersial PDF',
                        'steps' => "1. Klik tombol 'Cetak / Unduh Faktur' pada daftar invoice.\n2. Tinjau template HTML/PDF resmi.",
                        'expected' => "Faktur komersial tampil dengan format formal, kop surat perusahaan, nomor INV-YYYYMM-XXXX, dan rekening bank."
                    ],
                    [
                        'id' => 'TC-020',
                        'name' => 'Pencatatan Settlement Pembayaran',
                        'steps' => "1. Pada faktur berstatus Issued, klik 'Update Status'.\n2. Pilih status 'Lunas (Paid)' dan masukkan tanggal pelunasan.\n3. Simpan perubahan.",
                        'expected' => "Status berubah menjadi Paid, dan ringkasan Total Paid serta Outstanding AR ter-update live."
                    ],
                ]
            ],
            [
                'title' => 'Skenario 5: Customer Success — Handover, SLA Monitoring & Health Score',
                'cases' => [
                    [
                        'id' => 'TC-021',
                        'name' => 'Handover Otomatis Pasca-Delivery',
                        'steps' => "1. Selesaikan milestone final proyek.\n2. Buka menu Customer Success.",
                        'expected' => "Akun klien muncul di daftar antrean onboarding dengan alert handover baru."
                    ],
                    [
                        'id' => 'TC-022',
                        'name' => 'Account Health Radar & Scoring',
                        'steps' => "1. Buka kartu detail akun di Customer Success.\n2. Periksa matriks indikator kesehatan.",
                        'expected' => "Skor kesehatan akun (Health Score 0-100) terkalkulasi dengan badge warna (Sehat, Perhatian, Kritis)."
                    ],
                    [
                        'id' => 'TC-023',
                        'name' => 'Customer Journey Timeline Audit',
                        'steps' => "1. Buka tab Customer Journey.\n2. Tinjau histori peristiwa dari awal prospeksi hingga serah terima.",
                        'expected' => "Catatan meeting, delivery milestone, dan pembayaran tampil kronologis dari awal hingga akhir."
                    ],
                    [
                        'id' => 'TC-024',
                        'name' => 'SLA Breach Daemon Escalation',
                        'steps' => "1. Simulasikan tiket atau lead yang melewati batas SLA respons.\n2. Jalankan scheduler / periksa log.",
                        'expected' => "Sistem mencatat status SLA Breach dan menembakkan alert peringatan darurat ke Lark/WhatsApp."
                    ],
                ]
            ],
            [
                'title' => 'Skenario 6: Help Center & Learning Management System (LMS)',
                'cases' => [
                    [
                        'id' => 'TC-025',
                        'name' => 'Navigasi Jalur Pembelajaran (/help)',
                        'steps' => "1. Buka URL https://leadsy.tech/help.\n2. Klik berbagai kartu jalur pembelajaran (Sales, SA, PM, Finance, CS).",
                        'expected' => "Daftar modul berganti sesuai jalur yang dipilih dengan transisi mulus Motion UI."
                    ],
                    [
                        'id' => 'TC-026',
                        'name' => 'Pencarian Global Artikel Panduan',
                        'steps' => "1. Pada kotak pencarian di hero, ketik kata kunci 'PPN' atau 'BAST'.\n2. Periksa hasil pencarian.",
                        'expected' => "Sistem menampilkan seluruh artikel yang relevan secara real-time tanpa reload halaman."
                    ],
                    [
                        'id' => 'TC-027',
                        'name' => 'Pembaca Panduan Interaktif & FAQ',
                        'steps' => "1. Klik salah satu kartu panduan.\n2. Baca ikhtisar, instruksi bertahap, dan FAQ.\n3. Uji tombol 'Bagikan Tautan'.",
                        'expected' => "Modal panduan terbuka dengan konten terstruktur, tombol bagikan berhasil menyalin link artikel."
                    ],
                    [
                        'id' => 'TC-028',
                        'name' => 'LMS Progress Tracker (Sertifikasi Tim)',
                        'steps' => "1. Di dalam modal panduan, klik tombol 'Tandai Sudah Selesai'.\n2. Tutup modal dan amati bar progress kurikulum di atas.",
                        'expected' => "Persentase progres kurikulum bertambah, tersimpan permanen di local storage browser."
                    ],
                ]
            ],
            [
                'title' => 'Skenario 7: Keamanan, Multi-Tenancy & Infrastruktur K3s',
                'cases' => [
                    [
                        'id' => 'TC-029',
                        'name' => 'Isolasi Data Multi-Tenant (Tenant Scope)',
                        'steps' => "1. Akses data deal dari akun tenant A.\n2. Verifikasi kueri database.",
                        'expected' => "Tidak ada kebocoran data (data bleeding) ke tenant B; kueri terisolasi otomatis oleh tenant scope."
                    ],
                    [
                        'id' => 'TC-030',
                        'name' => 'Audit Log Trail Sistem',
                        'steps' => "1. Lakukan perubahan status deal atau invoice.\n2. Buka menu Audit Logs (sebagai Admin).",
                        'expected' => "Tercatat log mutasi data lengkap dengan user ID, IP address, timestamp, dan diff perubahan."
                    ],
                    [
                        'id' => 'TC-031',
                        'name' => 'Domain Redirect 301 (Legacy URL)',
                        'steps' => "1. Buka browser dan ketik https://leadsy.virtuenet.space/.\n2. Amati address bar browser.",
                        'expected' => "Browser otomatis dialihkan permanen (HTTP 301) ke domain resmi https://leadsy.tech/."
                    ],
                    [
                        'id' => 'TC-032',
                        'name' => 'Integritas Persistent Volume Database',
                        'steps' => "1. Periksa kueri data leads, invoice, dan user tim operasional.\n2. Pastikan tidak ada volume wipe atau table truncation.",
                        'expected' => "Seluruh 1.073+ rekaman riil tetap utuh, konsisten, dan terhubung ke volume PVC persisten."
                    ],
                ]
            ]
        ];

        foreach ($scenarios as $s) {
            $blocks[] = [
                'block_type' => 4, // Heading 2
                'heading2' => [
                    'elements' => [['type' => 'text', 'text_run' => ['content' => $s['title'], 'text_element_style' => ['bold' => true]]]]
                ]
            ];

            foreach ($s['cases'] as $tc) {
                // Card Header: TC ID and Name
                $blocks[] = [
                    'block_type' => 5, // Heading 3
                    'heading3' => [
                        'elements' => [
                            ['type' => 'text', 'text_run' => ['content' => "[ ] {$tc['id']}: {$tc['name']}", 'text_element_style' => ['bold' => true, 'text_color' => 5]]]
                        ]
                    ]
                ];

                // Steps
                $blocks[] = [
                    'block_type' => 2, // Text
                    'text' => [
                        'elements' => [
                            ['type' => 'text', 'text_run' => ['content' => "Langkah Pengujian:\n{$tc['steps']}", 'text_element_style' => ['italic' => false]]]
                        ]
                    ]
                ];

                // Expected Outcome
                $blocks[] = [
                    'block_type' => 15, // Quote
                    'quote' => [
                        'elements' => [
                            ['type' => 'text', 'text_run' => ['content' => "✅ Hasil yang Diharapkan: {$tc['expected']}"]]
                        ]
                    ]
                ];

                // Status & Notes Checklist
                $blocks[] = [
                    'block_type' => 2, // Text
                    'text' => [
                        'elements' => [
                            ['type' => 'text', 'text_run' => ['content' => "Status: [  ] LULUS (PASS)    [  ] GAGAL (FAIL)\nCatatan Penguji: __________________________________________________\n", 'text_element_style' => ['bold' => true]]]
                        ]
                    ]
                ];
            }

            $blocks[] = ['block_type' => 22, 'divider' => new \stdClass()];
        }

        // Section 3: Ringkasan Hasil Pengujian
        $blocks[] = [
            'block_type' => 3, // Heading 1
            'heading1' => [
                'elements' => [['type' => 'text', 'text_run' => ['content' => '3. Ringkasan Hasil Pengujian (Summary)', 'text_element_style' => ['bold' => true, 'text_color' => 4]]]]
            ]
        ];

        $summaryText = "• Total Kasus Uji: 32 Kasus Uji (TC-001 s/d TC-032)\n"
            . "• Total Lulus (Pass): _______ Kasus\n"
            . "• Total Gagal (Fail): _______ Kasus\n"
            . "• Tingkat Kelulusan: _______ %\n"
            . "• Catatan Evaluasi Akhir: __________________________________________________";

        $blocks[] = [
            'block_type' => 15, // Quote
            'quote' => [
                'elements' => [
                    ['type' => 'text', 'text_run' => ['content' => $summaryText, 'text_element_style' => ['bold' => true]]]
                ]
            ]
        ];

        $blocks[] = ['block_type' => 22, 'divider' => new \stdClass()];

        // Section 4: Lembar Persetujuan (Sign-off Acceptance)
        $blocks[] = [
            'block_type' => 3, // Heading 1
            'heading1' => [
                'elements' => [['type' => 'text', 'text_run' => ['content' => '4. Lembar Persetujuan (Sign-off Acceptance)', 'text_element_style' => ['bold' => true, 'text_color' => 4]]]]
            ]
        ];

        $blocks[] = [
            'block_type' => 2,
            'text' => [
                'elements' => [
                    [
                        'type' => 'text',
                        'text_run' => [
                            'content' => "Dengan menandatangani dokumen ini, seluruh pemangku kepentingan menyatakan bahwa sistem Leadsy Enterprise v1.42.0 telah diuji secara menyeluruh dan memenuhi kriteria penerimaan fungsional, arsitektural, dan operasional bisnis.\n",
                            'text_element_style' => ['italic' => true]
                        ]
                    ]
                ]
            ]
        ];

        $signoffs = [
            ['role' => 'Product Owner', 'title' => 'VP Product / Business Lead'],
            ['role' => 'Sales & Business Dev', 'title' => 'Head of Sales / BDR Lead'],
            ['role' => 'Solution Architect', 'title' => 'Lead Solution Architect'],
            ['role' => 'Project Delivery', 'title' => 'Head of Project Management'],
            ['role' => 'Finance & Accounting', 'title' => 'Finance & Accounting Lead'],
            ['role' => 'Customer Success', 'title' => 'Head of Customer Success']
        ];

        foreach ($signoffs as $s) {
            $blocks[] = [
                'block_type' => 15, // Quote / Card
                'quote' => [
                    'elements' => [
                        [
                            'type' => 'text',
                            'text_run' => [
                                'content' => "Departemen: {$s['role']}\n"
                                    . "Jabatan: {$s['title']}\n"
                                    . "Nama Peninjau: ____________________________________\n"
                                    . "Tanggal Persetujuan: ________________________________\n"
                                    . "Tanda Tangan Digital / Status: [   ] APPROVED  /  [   ] REVISE",
                                'text_element_style' => ['bold' => true]
                            ]
                        ]
                    ]
                ]
            ];
        }

        // Chunk write into batches of 40 (Lark API limit is 50 blocks per call)
        $chunks = array_chunk($blocks, 35);
        $totalChunks = count($chunks);
        $this->info("Submitting {$totalChunks} batches of blocks to Lark Docs...");

        foreach ($chunks as $index => $chunk) {
            $this->info("Sending batch " . ($index + 1) . " of {$totalChunks} (" . count($chunk) . " blocks)...");
            $driveService->request('POST', "/docx/v1/documents/{$documentId}/blocks/{$rootBlockId}/children", [
                'children' => $chunk,
                'index' => -1
            ]);
            usleep(250000); // 250ms rate limit buffer
        }
    }
}
