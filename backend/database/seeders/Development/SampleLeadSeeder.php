<?php

namespace Database\Seeders\Development;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Fills all 59 existing leads with realistic sample data for management demo.
 * Idempotent — uses updateOrCreate / insertOrIgnore throughout.
 */
class SampleLeadSeeder extends Seeder
{
    const S_NEW = 1;

    const S_ENRICH = 2;

    const S_QUAL = 3;

    const S_CONTACT = 4;

    const S_FOLLOWUP = 5;

    const S_MEETING = 6;

    const S_OPP = 7;

    const S_PROPOSAL = 8;

    const S_WON = 9;

    const S_LOST = 10;

    const I_MFG = 3;

    const I_RETAIL = 4;

    const I_TECH = 5;

    const I_FIN = 6;

    const I_PROP = 7;

    const I_LOG = 9;

    const I_FNB = 11;

    const I_ENRG = 12;

    const P_NETSUIT = 10;

    const P_TALENTA = 9;

    const P_QONTAK = 15;

    const P_SIGN = 8;

    const P_JEDOX = 7;

    const P_OCEAN = 4;

    const P_QISCUS = 5;

    const P_SEAL = 6;

    const P_LARK = 11;

    const P_GWORKSP = 24;

    const U_SALES = 3;

    const U_MANAGER = 4;

    const U_GM = 5;

    const U_DIR = 6;

    const CH_MAPS = 1;

    const CH_LINKEDIN = 12;

    const CH_SALES = 4;

    const CH_REFERRAL = 15;

    const CH_WEBSITE = 10;

    public function run(): void
    {
        $now = Carbon::now();
        foreach ($this->leadProfiles() as $id => $d) {
            DB::table('leads')->where('id', $id)->update([
                'industry_id' => $d['industry'], 'sub_industry_id' => $d['sub_industry'],
                'company_size_estimate' => $d['size'], 'email' => $d['email'],
                'lead_score' => $d['score'], 'qualification_status' => $d['qual'],
                'funnel_stage_id' => $d['stage'], 'owner_id' => $d['owner'],
                'product_id' => $d['product'],
                'estimated_closing_amount' => $d['est'], 'realized_closing_amount' => $d['real'] ?? null,
                'updated_at' => $now,
            ]);
            DB::table('lead_sources')->where('lead_id', $id)->update(['channel_type_id' => $d['channel'], 'updated_at' => $now]);
            foreach ($d['contacts'] as $idx => $c) {
                DB::table('lead_contacts')->updateOrInsert(
                    ['lead_id' => $id, 'email' => $c['email']],
                    ['name' => $c['name'], 'title' => $c['title'], 'phone' => $c['phone'],
                        'is_primary' => $idx === 0, 'source' => 'manual', 'confidence' => 'high',
                        'confidence_score' => $idx === 0 ? 90 : 75, 'created_at' => $now, 'updated_at' => $now]
                );
            }
            $grade = $d['score'] >= 72 ? 'Hot' : ($d['score'] >= 45 ? 'Warm' : 'Cold');
            DB::table('lead_scores')->updateOrInsert(['lead_id' => $id], [
                'score' => $d['score'], 'grade' => $grade, 'last_scored_at' => $now, 'calculated_at' => $now,
                'score_breakdown' => json_encode(['company_size' => (int) ($d['score'] * 0.25), 'industry_fit' => (int) ($d['score'] * 0.20), 'engagement' => (int) ($d['score'] * 0.20), 'contact_info' => (int) ($d['score'] * 0.20), 'funnel_progress' => (int) ($d['score'] * 0.15)]),
                'created_at' => $now, 'updated_at' => $now,
            ]);
            $qualified = in_array($d['qual'], ['eligible']) ? 'yes' : (in_array($d['qual'], ['potential']) ? 'maybe' : 'no');
            DB::table('lead_qualifications')->updateOrInsert(['lead_id' => $id], [
                'qualified' => $qualified, 'classification' => $d['qual'] === 'eligible' ? 'Qualified' : ($d['qual'] === 'potential' ? 'Potential' : 'Unqualified'),
                'score' => $d['score'], 'business_type' => 'B2B', 'company_size_band' => $this->sizeBand($d['size']),
                'qualification_reason' => $this->qualReason($d['qual']), 'last_qualified_at' => $now,
                'created_at' => $now, 'updated_at' => $now,
            ]);
            DB::table('lead_product_matches')->updateOrInsert(['lead_id' => $id, 'product_id' => $d['product']], [
                'match_score' => min(95, $d['score'] + 5), 'match_reason' => $this->matchReason($d['product']),
                'is_recommended' => true, 'last_matched_at' => $now, 'created_at' => $now, 'updated_at' => $now,
            ]);
            $this->seedActivities($id, $d, $now);
            $this->seedFunnelHistory($id, $d['stage'], $d['owner'], $now);
            if ($d['stage'] === self::S_WON) {
                DB::table('lead_outcomes')->updateOrInsert(['lead_id' => $id], [
                    'product_id' => $d['product'], 'outcome' => 'won', 'sale_type' => 'new_sales', 'deal_size' => $d['real'],
                    'feedback_notes' => 'Kontrak ditandatangani. Implementasi dijadwalkan Q2-Q3 2026.',
                    'closed_by' => $d['owner'], 'closed_at' => $now->copy()->subDays(rand(10, 25)),
                    'created_at' => $now, 'updated_at' => $now,
                ]);
            } elseif ($d['stage'] === self::S_LOST) {
                DB::table('lead_outcomes')->updateOrInsert(['lead_id' => $id], [
                    'product_id' => $d['product'], 'outcome' => 'lost', 'sale_type' => 'new_sales', 'deal_size' => null,
                    'loss_reason' => $d['loss_reason'] ?? 'Budget tidak mencukupi',
                    'loss_category' => $d['loss_cat'] ?? 'price',
                    'feedback_notes' => $d['loss_note'] ?? 'Prospect memutuskan menunda investasi IT.',
                    'closed_by' => $d['owner'], 'closed_at' => $now->copy()->subDays(rand(25, 45)),
                    'created_at' => $now, 'updated_at' => $now,
                ]);
            }
            if ($d['stage'] >= self::S_MEETING && $d['stage'] !== self::S_LOST) {
                $this->seedMeeting($id, $d, $now);
            }
        }
        $this->command?->info('SampleLeadSeeder: '.count($this->leadProfiles()).' leads enriched.');
    }

    private function seedActivities(int $leadId, array $d, Carbon $now): void
    {
        $base = $now->copy()->subDays($this->ageDays($d['stage']));
        $acts = [];
        $c = $d['contacts'][0];
        $acts[] = ['activity_type' => 'Note', 'description' => 'Lead ditemukan dari pencarian Google Maps wilayah Jawa Timur. Data awal diverifikasi.', 'outcome' => 'Lead terdaftar di pipeline.', 'activity_date' => $base->copy(), 'user_id' => $d['owner']];
        if ($d['stage'] >= self::S_ENRICH) {
            $acts[] = ['activity_type' => 'Note', 'description' => 'Enrichment: profil perusahaan, ukuran bisnis, dan kontak dilengkapi dari sumber publik.', 'outcome' => 'Profil siap kualifikasi.', 'activity_date' => $base->copy()->addDays(3), 'user_id' => $d['owner']];
        }
        if ($d['stage'] >= self::S_QUAL) {
            $acts[] = ['activity_type' => 'Call', 'description' => 'Cold call ke '.$c['name'].' ('.$c['title'].'). Memperkenalkan solusi, menggali kebutuhan awal.', 'outcome' => 'Prospect tertarik. Diminta kirim company profile via email.', 'activity_date' => $base->copy()->addDays(5), 'user_id' => $d['owner']];
        }
        if ($d['stage'] >= self::S_CONTACT) {
            $acts[] = ['activity_type' => 'Email', 'description' => 'Mengirimkan company profile, product deck, dan customer case study ke '.$c['email'].'.', 'outcome' => 'Email terkirim. Follow-up 3 hari kemudian.', 'activity_date' => $base->copy()->addDays(7), 'user_id' => $d['owner']];
            $acts[] = ['activity_type' => 'WhatsApp', 'description' => 'Follow-up WA: konfirmasi penerimaan materi presentasi.', 'outcome' => 'Dikonfirmasi diterima dan sedang direview tim internal.', 'activity_date' => $base->copy()->addDays(10), 'user_id' => $d['owner']];
        }
        if ($d['stage'] >= self::S_FOLLOWUP) {
            $acts[] = ['activity_type' => 'Call', 'description' => 'Follow-up call: diskusi hasil review materi, menjawab pertanyaan teknis.', 'outcome' => 'Prospect tertarik, minta demo produk dalam 2 minggu.', 'activity_date' => $base->copy()->addDays(14), 'user_id' => $d['owner']];
            $acts[] = ['activity_type' => 'Internal Review', 'description' => 'Review internal tim sales: strategi demo dan pain point focus '.$this->painPoint($d['product']).'.', 'outcome' => 'Strategi demo disepakati.', 'activity_date' => $base->copy()->addDays(16), 'user_id' => self::U_MANAGER];
        }
        if ($d['stage'] >= self::S_MEETING) {
            $acts[] = ['activity_type' => 'Meeting', 'description' => 'Product demo & discovery session bersama '.$c['name'].' dan tim terkait.', 'outcome' => 'Demo sukses. Prospect sangat tertarik fitur '.$this->keyFeature($d['product']).'. Diminta proposal teknis dan komersial.', 'activity_date' => $base->copy()->addDays(21), 'user_id' => $d['owner']];
        }
        if ($d['stage'] >= self::S_OPP) {
            $acts[] = ['activity_type' => 'Call', 'description' => 'Diskusi kebutuhan teknis lanjutan. Mapping requirement ke fitur produk.', 'outcome' => 'Requirement terdokumentasi. Tim teknis siapkan proposal implementasi.', 'activity_date' => $base->copy()->addDays(25), 'user_id' => $d['owner']];
            $acts[] = ['activity_type' => 'Email', 'description' => 'Mengirimkan technical requirement document dan draft timeline implementasi.', 'outcome' => 'Dokumen diterima. Feedback dalam 5 hari kerja.', 'activity_date' => $base->copy()->addDays(28), 'user_id' => $d['owner']];
        }
        if ($d['stage'] >= self::S_PROPOSAL) {
            $acts[] = ['activity_type' => 'Meeting', 'description' => 'Presentasi proposal komersial dan teknis kepada decision maker.', 'outcome' => 'Proposal diterima baik. Ada klarifikasi SLA dan timeline.', 'activity_date' => $base->copy()->addDays(33), 'user_id' => $d['owner']];
            $acts[] = ['activity_type' => 'Email', 'description' => 'Revisi proposal final + addendum SLA sesuai feedback.', 'outcome' => 'Proposal final dikirimkan. Menunggu keputusan manajemen.', 'activity_date' => $base->copy()->addDays(37), 'user_id' => $d['owner']];
        }
        if ($d['stage'] === self::S_WON) {
            $acts[] = ['activity_type' => 'Call', 'description' => 'Negosiasi final harga dan terms kontrak.', 'outcome' => 'Kesepakatan tercapai. Kontrak siap tanda tangan.', 'activity_date' => $base->copy()->addDays(42), 'user_id' => $d['owner']];
            $rp = number_format($d['real'], 0, ',', '.');
            $acts[] = ['activity_type' => 'Note', 'description' => 'Kontrak ditandatangani secara resmi. DEAL CLOSED WON senilai Rp '.$rp.'.', 'outcome' => 'Deal won. Handover ke tim implementasi minggu depan.', 'activity_date' => $base->copy()->addDays(45), 'user_id' => $d['owner']];
        }
        if ($d['stage'] === self::S_LOST) {
            $acts[] = ['activity_type' => 'Call', 'description' => 'Follow-up final. Prospect menyampaikan keputusan.', 'outcome' => $d['loss_reason'] ?? 'Prospect tidak melanjutkan karena kendala anggaran.', 'activity_date' => $base->copy()->addDays(35), 'user_id' => $d['owner']];
            $acts[] = ['activity_type' => 'Note', 'description' => 'CLOSED LOST. '.($d['loss_reason'] ?? 'Budget constraint').'. Masuk nurture list Q berikutnya.', 'outcome' => 'Lead ditutup sebagai Lost.', 'activity_date' => $base->copy()->addDays(36), 'user_id' => $d['owner']];
        }
        foreach ($acts as $a) {
            DB::table('lead_activities')->insertOrIgnore([
                'lead_id' => $leadId, 'activity_type' => $a['activity_type'], 'description' => $a['description'],
                'outcome' => $a['outcome'], 'activity_date' => $a['activity_date']->toDateTimeString(),
                'user_id' => $a['user_id'], 'created_at' => $a['activity_date'], 'updated_at' => $a['activity_date'],
            ]);
        }
    }

    private function seedMeeting(int $leadId, array $d, Carbon $now): void
    {
        $mDate = $now->copy()->subDays($this->ageDays($d['stage']))->addDays(21);
        DB::table('lead_meetings')->updateOrInsert(
            ['lead_id' => $leadId, 'meeting_date' => $mDate->toDateTimeString()],
            ['meeting_type' => rand(0, 1) ? 'Virtual' : 'In-Person',
                'participants' => json_encode([$d['contacts'][0]['name'].' ('.$d['contacts'][0]['title'].')', isset($d['contacts'][1]) ? $d['contacts'][1]['name'].' ('.$d['contacts'][1]['title'].')' : null, 'Sales Team Prasetia']),
                'summary' => 'Sesi demonstrasi produk dan discovery kebutuhan bisnis. Prospect menunjukkan ketertarikan tinggi terhadap solusi yang ditawarkan.',
                'key_points' => json_encode(['Sistem existing sudah tidak memadai: '.$this->currentSystem($d['product']), 'Pain point: '.$this->painPoint($d['product']), 'Target go-live Q3 2026', 'Budget sudah dialokasikan dalam RKAT']),
                'objections' => json_encode(['Concern timeline migrasi data dari sistem lama', 'Perlu approval CFO untuk anggaran >Rp 500 juta']),
                'next_steps' => json_encode(['Kirim proposal teknis & komersial dalam 5 hari kerja', 'Schedule meeting dengan CFO dan IT Director', 'Siapkan referensi customer industri yang sama']),
                'follow_up_date' => $mDate->copy()->addDays(7)->toDateString(),
                'created_by' => $d['owner'], 'created_at' => $mDate, 'updated_at' => $mDate]
        );
    }

    private function seedFunnelHistory(int $leadId, int $targetStage, int $userId, Carbon $now): void
    {
        $base = $now->copy()->subDays($this->ageDays($targetStage));
        for ($i = 1; $i < $targetStage; $i++) {
            DB::table('lead_funnel_history')->insertOrIgnore([
                'lead_id' => $leadId, 'from_stage_id' => $i, 'to_stage_id' => $i + 1, 'moved_by' => $userId,
                'notes' => $this->stageNote($i + 1), 'created_at' => $base->copy()->addDays($i * 5), 'updated_at' => $base->copy()->addDays($i * 5),
            ]);
        }
    }

    private function ageDays(int $s): int
    {
        return match ($s) {
            self::S_WON => 60,self::S_LOST => 55,self::S_PROPOSAL => 48,self::S_OPP => 38,self::S_MEETING => 30,self::S_FOLLOWUP => 22,self::S_CONTACT => 15,self::S_QUAL => 10,self::S_ENRICH => 6,default => 2
        };
    }

    private function sizeBand(string $s): string
    {
        return match ($s) {
            'enterprise' => 'enterprise','large' => 'medium','medium' => 'small',default => 'micro'
        };
    }

    private function qualReason(string $q): string
    {
        return match ($q) {
            'eligible' => 'Memenuhi semua kriteria: ukuran perusahaan, budget, kebutuhan, dan authority.','potential' => 'Memenuhi sebagian kriteria. Perlu validasi authority dan timeline.','not_eligible' => 'Tidak memenuhi kriteria minimum: kendala budget atau kebutuhan tidak relevan.',default => 'Belum melalui proses kualifikasi formal.'
        };
    }

    private function stageNote(int $s): string
    {
        return match ($s) {
            self::S_ENRICH => 'Data dilengkapi. Siap kualifikasi.',self::S_QUAL => 'Kualifikasi passed. Kontak aktif.',self::S_CONTACT => 'Kontak pertama berhasil.',self::S_FOLLOWUP => 'Prospect merespons positif.',self::S_MEETING => 'Demo dijadwalkan.',self::S_OPP => 'Demo sukses. Negosiasi teknis.',self::S_PROPOSAL => 'Proposal komersial terkirim.',self::S_WON => 'Kontrak ditandatangani. DEAL WON!',self::S_LOST => 'Prospect tidak melanjutkan.',default => 'Stage diperbarui.'
        };
    }

    private function painPoint(int $p): string
    {
        return match ($p) {
            self::P_NETSUIT => 'proses tutup buku bulanan >5 hari',self::P_TALENTA => 'pengelolaan payroll manual rawan error',self::P_QONTAK => 'tidak ada visibilitas pipeline real-time',self::P_SIGN => 'approval kontrak fisik >2 minggu',self::P_JEDOX => 'budgeting Excel tidak terkonsolidasi',self::P_OCEAN => 'performa DB tidak mampu handle peak traffic',self::P_QISCUS => 'customer service tersebar tanpa unified view',self::P_SEAL => 'tidak ada monitoring keamanan IT terintegrasi',self::P_LARK => 'komunikasi tim pakai berbagai tools berbeda',self::P_GWORKSP => 'email on-premise biaya maintenance tinggi',default => 'inefisiensi operasional'
        };
    }

    private function keyFeature(int $p): string
    {
        return match ($p) {
            self::P_NETSUIT => 'real-time financial reporting & multi-entity consolidation',self::P_TALENTA => 'automated payroll & self-service portal',self::P_QONTAK => 'pipeline automation & WhatsApp Business integration',self::P_SIGN => 'e-signature legal & audit trail lengkap',self::P_JEDOX => 'driver-based planning & what-if scenario',self::P_OCEAN => 'distributed architecture HTAP',self::P_QISCUS => 'unified inbox semua channel',self::P_SEAL => 'threat detection & compliance reporting',self::P_LARK => 'superapp chat+video+project management',self::P_GWORKSP => 'real-time collaboration & unlimited storage',default => 'fitur utama relevan'
        };
    }

    private function currentSystem(int $p): string
    {
        return match ($p) {
            self::P_NETSUIT => 'SAP B1 versi lama',self::P_TALENTA => 'Excel & payroll in-house',self::P_QONTAK => 'spreadsheet manual',self::P_SIGN => 'dokumen fisik bermaterai',self::P_JEDOX => 'Excel multi-file',self::P_OCEAN => 'MySQL dengan sharding manual',self::P_QISCUS => 'WhatsApp personal',self::P_SEAL => 'antivirus tanpa monitoring',self::P_LARK => 'kombinasi WA dan email',self::P_GWORKSP => 'email on-premise',default => 'sistem legacy'
        };
    }

    private function matchReason(int $p): string
    {
        return match ($p) {
            self::P_NETSUIT => 'Kebutuhan ERP terintegrasi untuk manajemen keuangan, supply chain, dan operasional kompleks.',self::P_TALENTA => 'Kebutuhan HRIS terpusat untuk manajemen karyawan, payroll, dan kehadiran.',self::P_QONTAK => 'Kebutuhan CRM omnichannel untuk customer engagement dan tracking pipeline sales.',self::P_SIGN => 'Kebutuhan tanda tangan digital legally binding untuk mempercepat proses kontrak.',self::P_JEDOX => 'Kebutuhan platform FP&A untuk perencanaan finansial berbasis data.',self::P_OCEAN => 'Kebutuhan database terdistribusi high-performance untuk workload enterprise.',self::P_QISCUS => 'Kebutuhan omnichannel communication platform untuk efisiensi layanan pelanggan.',self::P_SEAL => 'Kebutuhan solusi keamanan IT komprehensif untuk proteksi aset digital dan compliance.',self::P_LARK => 'Kebutuhan platform kolaborasi terintegrasi untuk tim yang tersebar.',self::P_GWORKSP => 'Kebutuhan productivity suite cloud yang scalable untuk seluruh organisasi.',default => 'Produk relevan dengan kebutuhan operasional.'
        };
    }

    private function leadProfiles(): array
    {
        return [
            // WON (4)
            24 => ['industry' => self::I_MFG, 'sub_industry' => 6, 'size' => 'enterprise', 'email' => 'procurement@unilever.co.id', 'score' => 92, 'qual' => 'eligible', 'stage' => self::S_WON, 'owner' => self::U_DIR, 'est' => 850000000, 'real' => 850000000, 'channel' => self::CH_LINKEDIN, 'product' => self::P_NETSUIT, 'contacts' => [['name' => 'Budi Hermawan', 'title' => 'IT Director', 'email' => 'b.hermawan@unilever.co.id', 'phone' => '+62 31 8431000'], ['name' => 'Rina Kusuma', 'title' => 'CFO', 'email' => 'r.kusuma@unilever.co.id', 'phone' => '+62 31 8431001']]],
            11 => ['industry' => self::I_MFG, 'sub_industry' => 1, 'size' => 'enterprise', 'email' => 'hr@sampoerna.com', 'score' => 88, 'qual' => 'eligible', 'stage' => self::S_WON, 'owner' => self::U_DIR, 'est' => 650000000, 'real' => 650000000, 'channel' => self::CH_LINKEDIN, 'product' => self::P_TALENTA, 'contacts' => [['name' => 'Agus Santoso', 'title' => 'HR Director', 'email' => 'a.santoso@sampoerna.com', 'phone' => '+62 31 8431699'], ['name' => 'Dewi Rahayu', 'title' => 'Head of HR Operations', 'email' => 'd.rahayu@sampoerna.com', 'phone' => '+62 31 8431700']]],
            29 => ['industry' => self::I_RETAIL, 'sub_industry' => 6, 'size' => 'enterprise', 'email' => 'it@alfamartku.com', 'score' => 85, 'qual' => 'eligible', 'stage' => self::S_WON, 'owner' => self::U_GM, 'est' => 480000000, 'real' => 480000000, 'channel' => self::CH_REFERRAL, 'product' => self::P_QONTAK, 'contacts' => [['name' => 'Hendra Wijaya', 'title' => 'CRM Manager', 'email' => 'h.wijaya@alfamartku.com', 'phone' => '+62 21 5990000'], ['name' => 'Siti Nurhaliza', 'title' => 'IT Manager', 'email' => 's.nurhaliza@alfamartku.com', 'phone' => '+62 21 5990001']]],
            40 => ['industry' => self::I_FNB, 'sub_industry' => 36, 'size' => 'large', 'email' => 'finance@campina.co.id', 'score' => 82, 'qual' => 'eligible', 'stage' => self::S_WON, 'owner' => self::U_GM, 'est' => 320000000, 'real' => 320000000, 'channel' => self::CH_MAPS, 'product' => self::P_JEDOX, 'contacts' => [['name' => 'Wahyu Pratama', 'title' => 'Finance Director', 'email' => 'w.pratama@campina.co.id', 'phone' => '+62 31 8976543'], ['name' => 'Eko Handoyo', 'title' => 'FP&A Manager', 'email' => 'e.handoyo@campina.co.id', 'phone' => '+62 31 8976544']]],
            // LOST (2)
            14 => ['industry' => self::I_FNB, 'sub_industry' => 36, 'size' => 'medium', 'email' => 'admin@parcolaut.co.id', 'score' => 38, 'qual' => 'not_eligible', 'stage' => self::S_LOST, 'owner' => self::U_SALES, 'est' => 120000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_TALENTA, 'loss_reason' => 'Budget tidak mencukupi. RKAT sudah habis.', 'loss_cat' => 'price', 'loss_note' => 'Tertarik secara teknis namun anggaran tidak tersedia tahun ini.', 'contacts' => [['name' => 'Rudi Salim', 'title' => 'General Manager', 'email' => 'r.salim@parcolaut.co.id', 'phone' => '+62 343 123456']]],
            26 => ['industry' => self::I_RETAIL, 'sub_industry' => 7, 'size' => 'medium', 'email' => 'info@ubs-surabaya.co.id', 'score' => 42, 'qual' => 'not_eligible', 'stage' => self::S_LOST, 'owner' => self::U_SALES, 'est' => 95000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_SIGN, 'loss_reason' => 'Memilih kompetitor dengan harga ~40% lebih rendah.', 'loss_cat' => 'competition', 'loss_note' => 'Kalah bersaing vendor lokal yang menawarkan harga lebih kompetitif.', 'contacts' => [['name' => 'Bambang Sudirman', 'title' => 'Owner', 'email' => 'bambang@ubs-surabaya.co.id', 'phone' => '+62 31 5671234']]],
            // PROPOSAL (4)
            21 => ['industry' => self::I_LOG, 'sub_industry' => 27, 'size' => 'enterprise', 'email' => 'procurement@pelindo.co.id', 'score' => 80, 'qual' => 'eligible', 'stage' => self::S_PROPOSAL, 'owner' => self::U_DIR, 'est' => 1200000000, 'real' => null, 'channel' => self::CH_LINKEDIN, 'product' => self::P_NETSUIT, 'contacts' => [['name' => 'Teguh Wibowo', 'title' => 'VP Information Technology', 'email' => 't.wibowo@pelindo.co.id', 'phone' => '+62 31 3298765'], ['name' => 'Fajar Nugroho', 'title' => 'IT Project Manager', 'email' => 'f.nugroho@pelindo.co.id', 'phone' => '+62 31 3298766']]],
            57 => ['industry' => self::I_ENRG, 'sub_industry' => 39, 'size' => 'enterprise', 'email' => 'it.security@pgn.co.id', 'score' => 78, 'qual' => 'eligible', 'stage' => self::S_PROPOSAL, 'owner' => self::U_DIR, 'est' => 760000000, 'real' => null, 'channel' => self::CH_LINKEDIN, 'product' => self::P_SEAL, 'contacts' => [['name' => 'Irfan Hakim', 'title' => 'CISO', 'email' => 'i.hakim@pgn.co.id', 'phone' => '+62 21 6334700'], ['name' => 'Putri Anggraini', 'title' => 'IT Security Manager', 'email' => 'p.anggraini@pgn.co.id', 'phone' => '+62 21 6334701']]],
            15 => ['industry' => self::I_FNB, 'sub_industry' => 36, 'size' => 'enterprise', 'email' => 'hr.operations@nestle.co.id', 'score' => 79, 'qual' => 'eligible', 'stage' => self::S_PROPOSAL, 'owner' => self::U_GM, 'est' => 890000000, 'real' => null, 'channel' => self::CH_LINKEDIN, 'product' => self::P_TALENTA, 'contacts' => [['name' => 'Sri Wahyuni', 'title' => 'HR Director', 'email' => 's.wahyuni@nestle.co.id', 'phone' => '+62 343 851000'], ['name' => 'Doni Kusuma', 'title' => 'HRIS Manager', 'email' => 'd.kusuma@nestle.co.id', 'phone' => '+62 343 851001']]],
            28 => ['industry' => self::I_MFG, 'sub_industry' => 3, 'size' => 'large', 'email' => 'finance@suparma.com', 'score' => 74, 'qual' => 'eligible', 'stage' => self::S_PROPOSAL, 'owner' => self::U_GM, 'est' => 420000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_JEDOX, 'contacts' => [['name' => 'Andi Kusumah', 'title' => 'CFO', 'email' => 'a.kusumah@suparma.com', 'phone' => '+62 31 8292888'], ['name' => 'Nurul Hidayah', 'title' => 'Finance Manager', 'email' => 'n.hidayah@suparma.com', 'phone' => '+62 31 8292889']]],
            // OPPORTUNITY (5)
            16 => ['industry' => self::I_MFG, 'sub_industry' => 1, 'size' => 'enterprise', 'email' => 'hr@cp.co.id', 'score' => 76, 'qual' => 'eligible', 'stage' => self::S_OPP, 'owner' => self::U_GM, 'est' => 680000000, 'real' => null, 'channel' => self::CH_LINKEDIN, 'product' => self::P_TALENTA, 'contacts' => [['name' => 'Rahmat Setiawan', 'title' => 'HR Director', 'email' => 'r.setiawan@cp.co.id', 'phone' => '+62 31 8431500'], ['name' => 'Ayu Lestari', 'title' => 'Payroll Manager', 'email' => 'a.lestari@cp.co.id', 'phone' => '+62 31 8431501']]],
            42 => ['industry' => self::I_LOG, 'sub_industry' => 29, 'size' => 'large', 'email' => 'it@silog.co.id', 'score' => 74, 'qual' => 'eligible', 'stage' => self::S_OPP, 'owner' => self::U_GM, 'est' => 950000000, 'real' => null, 'channel' => self::CH_REFERRAL, 'product' => self::P_NETSUIT, 'contacts' => [['name' => 'Desi Pertiwi', 'title' => 'IT Director', 'email' => 'd.pertiwi@silog.co.id', 'phone' => '+62 31 5611234'], ['name' => 'Fitri Ningsih', 'title' => 'ERP Project Lead', 'email' => 'f.ningsih@silog.co.id', 'phone' => '+62 31 5611235']]],
            49 => ['industry' => self::I_MFG, 'sub_industry' => 1, 'size' => 'enterprise', 'email' => 'crm@wingscorp.com', 'score' => 72, 'qual' => 'eligible', 'stage' => self::S_OPP, 'owner' => self::U_MANAGER, 'est' => 440000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_QONTAK, 'contacts' => [['name' => 'Wulan Sari', 'title' => 'Sales Operations Manager', 'email' => 'w.sari@wingscorp.com', 'phone' => '+62 31 7507777'], ['name' => 'Indah Permata', 'title' => 'IT Manager', 'email' => 'i.permata@wingscorp.com', 'phone' => '+62 31 7507778']]],
            32 => ['industry' => self::I_ENRG, 'sub_industry' => 42, 'size' => 'large', 'email' => 'it@veolia.co.id', 'score' => 70, 'qual' => 'eligible', 'stage' => self::S_OPP, 'owner' => self::U_MANAGER, 'est' => 380000000, 'real' => null, 'channel' => self::CH_LINKEDIN, 'product' => self::P_SEAL, 'contacts' => [['name' => 'Ahmad Fauzi', 'title' => 'IT Manager', 'email' => 'a.fauzi@veolia.co.id', 'phone' => '+62 31 8674321']]],
            25 => ['industry' => self::I_FIN, 'sub_industry' => 17, 'size' => 'large', 'email' => 'it@taspen.co.id', 'score' => 68, 'qual' => 'eligible', 'stage' => self::S_OPP, 'owner' => self::U_MANAGER, 'est' => 280000000, 'real' => null, 'channel' => self::CH_REFERRAL, 'product' => self::P_GWORKSP, 'contacts' => [['name' => 'Teguh Prasetyo', 'title' => 'Kepala Divisi IT', 'email' => 't.prasetyo@taspen.co.id', 'phone' => '+62 31 5345678'], ['name' => 'Ratna Dewi', 'title' => 'IT Support Manager', 'email' => 'r.dewi@taspen.co.id', 'phone' => '+62 31 5345679']]],
            // MEETING SCHEDULED (6)
            10 => ['industry' => self::I_MFG, 'sub_industry' => 4, 'size' => 'enterprise', 'email' => 'erp@amfg.co.id', 'score' => 72, 'qual' => 'eligible', 'stage' => self::S_MEETING, 'owner' => self::U_GM, 'est' => 780000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_NETSUIT, 'contacts' => [['name' => 'Slamet Riyadi', 'title' => 'IT Director', 'email' => 's.riyadi@amfg.co.id', 'phone' => '+62 31 7882383'], ['name' => 'Rina Puspita', 'title' => 'ERP Manager', 'email' => 'r.puspita@amfg.co.id', 'phone' => '+62 31 7882384']]],
            20 => ['industry' => self::I_FNB, 'sub_industry' => 36, 'size' => 'large', 'email' => 'hr@yakult.co.id', 'score' => 66, 'qual' => 'eligible', 'stage' => self::S_MEETING, 'owner' => self::U_MANAGER, 'est' => 320000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_TALENTA, 'contacts' => [['name' => 'Heri Santoso', 'title' => 'HR Manager', 'email' => 'h.santoso@yakult.co.id', 'phone' => '+62 321 381000']]],
            36 => ['industry' => self::I_LOG, 'sub_industry' => 27, 'size' => 'medium', 'email' => 'ops@pancaran.co.id', 'score' => 62, 'qual' => 'eligible', 'stage' => self::S_MEETING, 'owner' => self::U_MANAGER, 'est' => 290000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_QISCUS, 'contacts' => [['name' => 'Doni Hartono', 'title' => 'Operations Manager', 'email' => 'd.hartono@pancaran.co.id', 'phone' => '+62 31 8290123']]],
            48 => ['industry' => self::I_LOG, 'sub_industry' => 27, 'size' => 'large', 'email' => 'it@pelindodays.co.id', 'score' => 65, 'qual' => 'eligible', 'stage' => self::S_MEETING, 'owner' => self::U_MANAGER, 'est' => 240000000, 'real' => null, 'channel' => self::CH_REFERRAL, 'product' => self::P_GWORKSP, 'contacts' => [['name' => 'Fajar Susanto', 'title' => 'IT Manager', 'email' => 'f.susanto@pelindodays.co.id', 'phone' => '+62 31 3293456'], ['name' => 'Ani Budiarti', 'title' => 'Procurement Manager', 'email' => 'a.budiarti@pelindodays.co.id', 'phone' => '+62 31 3293457']]],
            53 => ['industry' => self::I_MFG, 'sub_industry' => 5, 'size' => 'large', 'email' => 'finance@indospring.co.id', 'score' => 64, 'qual' => 'eligible', 'stage' => self::S_MEETING, 'owner' => self::U_MANAGER, 'est' => 380000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_JEDOX, 'contacts' => [['name' => 'Yuli Setiawan', 'title' => 'Finance Director', 'email' => 'y.setiawan@indospring.co.id', 'phone' => '+62 31 8911234']]],
            58 => ['industry' => self::I_TECH, 'sub_industry' => 11, 'size' => 'medium', 'email' => 'security@asg.co.id', 'score' => 60, 'qual' => 'eligible', 'stage' => self::S_MEETING, 'owner' => self::U_SALES, 'est' => 195000000, 'real' => null, 'channel' => self::CH_LINKEDIN, 'product' => self::P_SEAL, 'contacts' => [['name' => 'Nova Pratama', 'title' => 'CTO', 'email' => 'n.pratama@asg.co.id', 'phone' => '+62 31 2980012']]],
            // FOLLOW UP (7)
            12 => ['industry' => self::I_FNB, 'sub_industry' => 36, 'size' => 'large', 'email' => 'crm@siantartop.co.id', 'score' => 60, 'qual' => 'eligible', 'stage' => self::S_FOLLOWUP, 'owner' => self::U_MANAGER, 'est' => 240000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_QONTAK, 'contacts' => [['name' => 'Budiman Hartono', 'title' => 'Marketing Director', 'email' => 'b.hartono@siantartop.co.id', 'phone' => '+62 31 8667382']]],
            22 => ['industry' => self::I_MFG, 'sub_industry' => 3, 'size' => 'large', 'email' => 'legal@apluspacific.co.id', 'score' => 55, 'qual' => 'eligible', 'stage' => self::S_FOLLOWUP, 'owner' => self::U_SALES, 'est' => 85000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_SIGN, 'contacts' => [['name' => 'Tri Wahyudi', 'title' => 'Legal Manager', 'email' => 't.wahyudi@apluspacific.co.id', 'phone' => '+62 31 8674000']]],
            31 => ['industry' => self::I_FNB, 'sub_industry' => 36, 'size' => 'large', 'email' => 'hr@anekatuna.co.id', 'score' => 58, 'qual' => 'eligible', 'stage' => self::S_FOLLOWUP, 'owner' => self::U_MANAGER, 'est' => 280000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_TALENTA, 'contacts' => [['name' => 'Widi Pramono', 'title' => 'HR Manager', 'email' => 'w.pramono@anekatuna.co.id', 'phone' => '+62 343 631000']]],
            34 => ['industry' => self::I_MFG, 'sub_industry' => 1, 'size' => 'large', 'email' => 'it@cp-prima.co.id', 'score' => 57, 'qual' => 'eligible', 'stage' => self::S_FOLLOWUP, 'owner' => self::U_MANAGER, 'est' => 560000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_NETSUIT, 'contacts' => [['name' => 'Sulis Prasetyo', 'title' => 'IT Director', 'email' => 's.prasetyo@cp-prima.co.id', 'phone' => '+62 31 8910234'], ['name' => 'Mega Wati', 'title' => 'IT Project Manager', 'email' => 'm.wati@cp-prima.co.id', 'phone' => '+62 31 8910235']]],
            43 => ['industry' => self::I_MFG, 'sub_industry' => 3, 'size' => 'medium', 'email' => 'finance@rucika.co.id', 'score' => 54, 'qual' => 'potential', 'stage' => self::S_FOLLOWUP, 'owner' => self::U_SALES, 'est' => 220000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_JEDOX, 'contacts' => [['name' => 'Sari Putri', 'title' => 'Finance Manager', 'email' => 's.putri@rucika.co.id', 'phone' => '+62 321 456789']]],
            50 => ['industry' => self::I_MFG, 'sub_industry' => 1, 'size' => 'medium', 'email' => 'sales@haida-agri.co.id', 'score' => 52, 'qual' => 'potential', 'stage' => self::S_FOLLOWUP, 'owner' => self::U_SALES, 'est' => 180000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_QONTAK, 'contacts' => [['name' => 'Andy Sulistyo', 'title' => 'Sales Director', 'email' => 'a.sulistyo@haida-agri.co.id', 'phone' => '+62 31 8954321']]],
            59 => ['industry' => self::I_TECH, 'sub_industry' => 10, 'size' => 'medium', 'email' => 'ops@novadigital.co.id', 'score' => 55, 'qual' => 'potential', 'stage' => self::S_FOLLOWUP, 'owner' => self::U_SALES, 'est' => 145000000, 'real' => null, 'channel' => self::CH_LINKEDIN, 'product' => self::P_GWORKSP, 'contacts' => [['name' => 'Rizky Firmansyah', 'title' => 'CEO', 'email' => 'r.firmansyah@novadigital.co.id', 'phone' => '+62 31 2980567']]],
            // CONTACTED (8)
            13 => ['industry' => self::I_MFG, 'sub_industry' => 3, 'size' => 'large', 'email' => 'hr@unichem.co.id', 'score' => 50, 'qual' => 'potential', 'stage' => self::S_CONTACT, 'owner' => self::U_SALES, 'est' => 190000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_TALENTA, 'contacts' => [['name' => 'Dian Kusumawati', 'title' => 'HR Manager', 'email' => 'd.kusumawati@unichem.co.id', 'phone' => '+62 31 3964321']]],
            18 => ['industry' => self::I_MFG, 'sub_industry' => 3, 'size' => 'medium', 'email' => 'legal@binakarya.co.id', 'score' => 48, 'qual' => 'potential', 'stage' => self::S_CONTACT, 'owner' => self::U_SALES, 'est' => 75000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_SIGN, 'contacts' => [['name' => 'Yanto Prakoso', 'title' => 'Legal Officer', 'email' => 'y.prakoso@binakarya.co.id', 'phone' => '+62 31 8771234']]],
            33 => ['industry' => self::I_LOG, 'sub_industry' => 30, 'size' => 'medium', 'email' => 'ops@atl-surabaya.co.id', 'score' => 47, 'qual' => 'potential', 'stage' => self::S_CONTACT, 'owner' => self::U_SALES, 'est' => 160000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_QISCUS, 'contacts' => [['name' => 'Heru Purnama', 'title' => 'Operations Director', 'email' => 'h.purnama@atl-surabaya.co.id', 'phone' => '+62 31 5614567']]],
            37 => ['industry' => self::I_FNB, 'sub_industry' => 36, 'size' => 'medium', 'email' => 'sales@megamarine.co.id', 'score' => 46, 'qual' => 'potential', 'stage' => self::S_CONTACT, 'owner' => self::U_SALES, 'est' => 140000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_QONTAK, 'contacts' => [['name' => 'Mariana Suhardi', 'title' => 'Sales Manager', 'email' => 'm.suhardi@megamarine.co.id', 'phone' => '+62 343 345678']]],
            38 => ['industry' => self::I_MFG, 'sub_industry' => 4, 'size' => 'medium', 'email' => 'it@dayasa.co.id', 'score' => 50, 'qual' => 'potential', 'stage' => self::S_CONTACT, 'owner' => self::U_SALES, 'est' => 350000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_OCEAN, 'contacts' => [['name' => 'Arif Budiman', 'title' => 'IT Manager', 'email' => 'a.budiman@dayasa.co.id', 'phone' => '+62 31 8912345']]],
            44 => ['industry' => self::I_RETAIL, 'sub_industry' => 7, 'size' => 'medium', 'email' => 'ops@scm-rso.co.id', 'score' => 45, 'qual' => 'potential', 'stage' => self::S_CONTACT, 'owner' => self::U_SALES, 'est' => 120000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_LARK, 'contacts' => [['name' => 'Endah Puspita', 'title' => 'Operations Manager', 'email' => 'e.puspita@scm-rso.co.id', 'phone' => '+62 31 8234567']]],
            47 => ['industry' => self::I_MFG, 'sub_industry' => 3, 'size' => 'small', 'email' => 'admin@setiakarya.co.id', 'score' => 42, 'qual' => 'potential', 'stage' => self::S_CONTACT, 'owner' => self::U_SALES, 'est' => 65000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_SIGN, 'contacts' => [['name' => 'Setia Karya', 'title' => 'Director', 'email' => 'setia@setiakarya.co.id', 'phone' => '+62 31 7654321']]],
            60 => ['industry' => self::I_PROP, 'sub_industry' => 21, 'size' => 'large', 'email' => 'it@citramarga.co.id', 'score' => 52, 'qual' => 'potential', 'stage' => self::S_CONTACT, 'owner' => self::U_MANAGER, 'est' => 480000000, 'real' => null, 'channel' => self::CH_LINKEDIN, 'product' => self::P_NETSUIT, 'contacts' => [['name' => 'Gunawan Susilo', 'title' => 'IT Manager', 'email' => 'g.susilo@citramarga.co.id', 'phone' => '+62 21 7654321'], ['name' => 'Diana Puspita', 'title' => 'Finance Controller', 'email' => 'd.puspita@citramarga.co.id', 'phone' => '+62 21 7654322']]],
            // QUALIFIED (8)
            9 => ['industry' => self::I_FNB, 'sub_industry' => 38, 'size' => 'medium', 'email' => 'crm@primaboga.co.id', 'score' => 50, 'qual' => 'potential', 'stage' => self::S_QUAL, 'owner' => self::U_SALES, 'est' => 165000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_QONTAK, 'contacts' => [['name' => 'Prima Nusantara', 'title' => 'Marketing Manager', 'email' => 'prima@primaboga.co.id', 'phone' => '+62 31 8910000']]],
            19 => ['industry' => self::I_MFG, 'sub_industry' => 3, 'size' => 'large', 'email' => 'hr@yanaprima.co.id', 'score' => 48, 'qual' => 'potential', 'stage' => self::S_QUAL, 'owner' => self::U_SALES, 'est' => 185000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_TALENTA, 'contacts' => [['name' => 'Yanto Harsono', 'title' => 'HR Manager', 'email' => 'y.harsono@yanaprima.co.id', 'phone' => '+62 31 8678901']]],
            23 => ['industry' => self::I_FNB, 'sub_industry' => 36, 'size' => 'large', 'email' => 'sales@phillipsseafoods.co.id', 'score' => 46, 'qual' => 'potential', 'stage' => self::S_QUAL, 'owner' => self::U_SALES, 'est' => 135000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_QONTAK, 'contacts' => [['name' => 'Philip Andersen', 'title' => 'Country Manager', 'email' => 'p.andersen@phillipsseafoods.co.id', 'phone' => '+62 343 851234']]],
            30 => ['industry' => self::I_FNB, 'sub_industry' => 36, 'size' => 'medium', 'email' => 'hr@motasa.co.id', 'score' => 45, 'qual' => 'potential', 'stage' => self::S_QUAL, 'owner' => self::U_SALES, 'est' => 145000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_TALENTA, 'contacts' => [['name' => 'Moto Sari', 'title' => 'HR & GA Manager', 'email' => 'm.sari@motasa.co.id', 'phone' => '+62 31 8923456']]],
            35 => ['industry' => self::I_MFG, 'sub_industry' => 3, 'size' => 'medium', 'email' => 'finance@hokkan.co.id', 'score' => 47, 'qual' => 'potential', 'stage' => self::S_QUAL, 'owner' => self::U_SALES, 'est' => 195000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_JEDOX, 'contacts' => [['name' => 'Hok Andi', 'title' => 'Finance Manager', 'email' => 'h.andi@hokkan.co.id', 'phone' => '+62 31 7656789']]],
            41 => ['industry' => self::I_LOG, 'sub_industry' => 27, 'size' => 'large', 'email' => 'cs@lincgroup.co.id', 'score' => 46, 'qual' => 'potential', 'stage' => self::S_QUAL, 'owner' => self::U_SALES, 'est' => 175000000, 'real' => null, 'channel' => self::CH_REFERRAL, 'product' => self::P_QISCUS, 'contacts' => [['name' => 'Linc Cipta', 'title' => 'CS Manager', 'email' => 'l.cipta@lincgroup.co.id', 'phone' => '+62 31 7654000']]],
            45 => ['industry' => self::I_MFG, 'sub_industry' => 3, 'size' => 'large', 'email' => 'legal@sorinitowa.co.id', 'score' => 44, 'qual' => 'potential', 'stage' => self::S_QUAL, 'owner' => self::U_SALES, 'est' => 95000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_SIGN, 'contacts' => [['name' => 'Berlian Sorini', 'title' => 'Legal Counsel', 'email' => 'b.sorini@sorinitowa.co.id', 'phone' => '+62 31 8912000']]],
            55 => ['industry' => self::I_FNB, 'sub_industry' => 36, 'size' => 'medium', 'email' => 'sales@madusarimas.co.id', 'score' => 43, 'qual' => 'potential', 'stage' => self::S_QUAL, 'owner' => self::U_SALES, 'est' => 120000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_QONTAK, 'contacts' => [['name' => 'Mas Sari', 'title' => 'Sales Director', 'email' => 'm.sari@madusarimas.co.id', 'phone' => '+62 31 8967890']]],
            // ENRICHED (7)
            8 => ['industry' => self::I_MFG, 'sub_industry' => 3, 'size' => 'large', 'email' => 'finance@pkisurabaya.co.id', 'score' => 42, 'qual' => 'potential', 'stage' => self::S_ENRICH, 'owner' => self::U_SALES, 'est' => 230000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_JEDOX, 'contacts' => [['name' => 'Kertas Budi', 'title' => 'Finance Director', 'email' => 'k.budi@pkisurabaya.co.id', 'phone' => '+62 31 3716173']]],
            17 => ['industry' => self::I_LOG, 'sub_industry' => 28, 'size' => 'medium', 'email' => 'cs@prasurabaya.co.id', 'score' => 38, 'qual' => 'pending', 'stage' => self::S_ENRICH, 'owner' => self::U_SALES, 'est' => 145000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_QISCUS, 'contacts' => [['name' => 'Restu Putra', 'title' => 'General Manager', 'email' => 'r.putra@prasurabaya.co.id', 'phone' => '+62 31 8901234']]],
            27 => ['industry' => self::I_MFG, 'sub_industry' => 3, 'size' => 'medium', 'email' => 'hrd@gamaprima.co.id', 'score' => 35, 'qual' => 'pending', 'stage' => self::S_ENRICH, 'owner' => self::U_SALES, 'est' => 85000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_SIGN, 'contacts' => [['name' => 'Gama Prima', 'title' => 'HRD Manager', 'email' => 'g.prima@gamaprima.co.id', 'phone' => '+62 31 5671234']]],
            39 => ['industry' => self::I_MFG, 'sub_industry' => 3, 'size' => 'medium', 'email' => 'hr@patna-lestari.co.id', 'score' => 37, 'qual' => 'pending', 'stage' => self::S_ENRICH, 'owner' => self::U_SALES, 'est' => 165000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_TALENTA, 'contacts' => [['name' => 'Lestari Patna', 'title' => 'HR Admin', 'email' => 'l.patna@patna-lestari.co.id', 'phone' => '+62 31 5612345']]],
            46 => ['industry' => self::I_LOG, 'sub_industry' => 29, 'size' => 'medium', 'email' => 'admin@firm-surabaya.co.id', 'score' => 36, 'qual' => 'pending', 'stage' => self::S_ENRICH, 'owner' => self::U_SALES, 'est' => 110000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_LARK, 'contacts' => [['name' => 'Firm Surabaya', 'title' => 'Manager', 'email' => 'firm@firm-surabaya.co.id', 'phone' => '+62 31 8234000']]],
            51 => ['industry' => self::I_FNB, 'sub_industry' => 36, 'size' => 'large', 'email' => 'marketing@bmif.co.id', 'score' => 40, 'qual' => 'pending', 'stage' => self::S_ENRICH, 'owner' => self::U_SALES, 'est' => 155000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_QONTAK, 'contacts' => [['name' => 'Menara Bumi', 'title' => 'Marketing Manager', 'email' => 'm.bumi@bmif.co.id', 'phone' => '+62 31 8965432']]],
            56 => ['industry' => self::I_FNB, 'sub_industry' => 36, 'size' => 'large', 'email' => 'finance@sekarlaut.co.id', 'score' => 41, 'qual' => 'pending', 'stage' => self::S_ENRICH, 'owner' => self::U_SALES, 'est' => 180000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_JEDOX, 'contacts' => [['name' => 'Sekar Wulandari', 'title' => 'Finance Manager', 'email' => 's.wulandari@sekarlaut.co.id', 'phone' => '+62 31 8967000']]],
            // NEW LEAD (8)
            3 => ['industry' => self::I_RETAIL, 'sub_industry' => 7, 'size' => 'small', 'email' => 'info@anugrah-lestari.co.id', 'score' => 28, 'qual' => 'pending', 'stage' => self::S_NEW, 'owner' => self::U_SALES, 'est' => 75000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_SIGN, 'contacts' => [['name' => 'Anugrah Anto', 'title' => 'Owner', 'email' => 'anugrah@anugrah-lestari.co.id', 'phone' => '+62 31 5612000']]],
            4 => ['industry' => self::I_RETAIL, 'sub_industry' => 9, 'size' => 'small', 'email' => 'info@hikmahputra.co.id', 'score' => 25, 'qual' => 'pending', 'stage' => self::S_NEW, 'owner' => self::U_SALES, 'est' => 55000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_SIGN, 'contacts' => [['name' => 'Hikmah Putra', 'title' => 'Owner', 'email' => 'hikmah@hikmahputra.co.id', 'phone' => '+62 31 5671890']]],
            5 => ['industry' => self::I_RETAIL, 'sub_industry' => 9, 'size' => 'small', 'email' => 'info@karunia-office.co.id', 'score' => 22, 'qual' => 'pending', 'stage' => self::S_NEW, 'owner' => self::U_SALES, 'est' => 45000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_GWORKSP, 'contacts' => [['name' => 'Karunia Santoso', 'title' => 'Pemilik', 'email' => 'karunia@karunia-office.co.id', 'phone' => '+62 851 0762 0000']]],
            6 => ['industry' => self::I_RETAIL, 'sub_industry' => 9, 'size' => 'small', 'email' => 'info@urbanoffice.co.id', 'score' => 30, 'qual' => 'pending', 'stage' => self::S_NEW, 'owner' => self::U_SALES, 'est' => 65000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_GWORKSP, 'contacts' => [['name' => 'Urban Manager', 'title' => 'Manager', 'email' => 'manager@urbanoffice.co.id', 'phone' => '+62 851 0762 0100']]],
            7 => ['industry' => self::I_RETAIL, 'sub_industry' => 9, 'size' => 'small', 'email' => 'info@tongtji.co.id', 'score' => 24, 'qual' => 'pending', 'stage' => self::S_NEW, 'owner' => self::U_SALES, 'est' => 50000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_GWORKSP, 'contacts' => [['name' => 'Tong Tji', 'title' => 'Owner', 'email' => 'tong@tongtji.co.id', 'phone' => '+62 31 8765432']]],
            52 => ['industry' => self::I_FIN, 'sub_industry' => 15, 'size' => 'small', 'email' => 'info@gsa-ptki.co.id', 'score' => 26, 'qual' => 'pending', 'stage' => self::S_NEW, 'owner' => self::U_SALES, 'est' => 80000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_LARK, 'contacts' => [['name' => 'Gunawan Sukses', 'title' => 'Direktur', 'email' => 'gunawan@gsa-ptki.co.id', 'phone' => '+62 31 5645678']]],
            54 => ['industry' => self::I_MFG, 'sub_industry' => 1, 'size' => 'large', 'email' => 'branch@cp-prima.co.id', 'score' => 30, 'qual' => 'pending', 'stage' => self::S_NEW, 'owner' => self::U_SALES, 'est' => null, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_NETSUIT, 'contacts' => [['name' => 'Proteina Central', 'title' => 'IT Coordinator', 'email' => 'proteina@cp-prima.co.id', 'phone' => '+62 31 8910456']]],
            61 => ['industry' => self::I_FNB, 'sub_industry' => 35, 'size' => 'small', 'email' => 'info@kembangloyang.co.id', 'score' => 27, 'qual' => 'pending', 'stage' => self::S_NEW, 'owner' => self::U_SALES, 'est' => 60000000, 'real' => null, 'channel' => self::CH_MAPS, 'product' => self::P_QONTAK, 'contacts' => [['name' => 'Loyang Kembang', 'title' => 'Manajer', 'email' => 'loyang@kembangloyang.co.id', 'phone' => '+62 31 7891234']]],
        ];
    }
}
