<?php

namespace App\Services\Revenue;

use App\Models\Lead;
use App\Models\LeadBantcQuestionGuide;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class LeadNextBestActionService
{
    /**
     * Generate prioritized Next Best Action recommendations for a given lead.
     *
     * @param Lead $lead
     * @return array
     */
    public function generateRecommendations(Lead $lead): array
    {
        $actions = [];

        // 1. Evaluate BANTC Qualification Gaps
        $bantcActions = $this->evaluateBantcGaps($lead);
        $actions = array_merge($actions, $bantcActions);

        // 2. Evaluate Deal Stalling & Follow-up Slippage
        $slippageActions = $this->evaluateSlippageRisk($lead);
        $actions = array_merge($actions, $slippageActions);

        // 3. Evaluate Presales & Strategic Intelligence Readiness
        $intelligenceActions = $this->evaluateIntelligenceReadiness($lead);
        $actions = array_merge($actions, $intelligenceActions);

        // 4. Evaluate Contact Enrichment & Reachability
        $contactActions = $this->evaluateContactGaps($lead);
        $actions = array_merge($actions, $contactActions);

        // 5. Evaluate Sales Cadence Automation
        $cadenceActions = $this->evaluateCadenceStatus($lead);
        $actions = array_merge($actions, $cadenceActions);

        // Sort actions by priority weight descending
        usort($actions, function ($a, $b) {
            $priorityWeights = [
                'urgent' => 4,
                'high' => 3,
                'medium' => 2,
                'low' => 1,
            ];

            $weightA = $priorityWeights[$a['priority']] ?? 0;
            $weightB = $priorityWeights[$b['priority']] ?? 0;

            if ($weightA === $weightB) {
                return ($b['impact_score'] ?? 0) <=> ($a['impact_score'] ?? 0);
            }

            return $weightB <=> $weightA;
        });

        return [
            'lead_id' => $lead->id,
            'company_name' => $lead->company_name,
            'total_recommendations' => count($actions),
            'generated_at' => now()->toISOString(),
            'actions' => $actions,
        ];
    }

    /**
     * Check BANTC questions and qualification notes.
     */
    protected function evaluateBantcGaps(Lead $lead): array
    {
        $actions = [];

        // Check if BANTC guide exists for this lead
        $guides = LeadBantcQuestionGuide::where('lead_id', $lead->id)->get();
        $answeredCategories = $guides->filter(function ($g) {
            return !empty($g->sales_rep_answer) || !empty($g->ai_suggested_answer);
        })->pluck('category')->unique()->toArray();

        $allCategories = ['Budget', 'Authority', 'Need', 'Timeline', 'Competition'];
        $missingCategories = array_diff($allCategories, $answeredCategories);

        if (in_array('Authority', $missingCategories)) {
            $actions[] = [
                'id' => 'nba_bantc_authority',
                'title' => 'Identifikasi Pengambil Keputusan (Authority)',
                'priority' => 'high',
                'category' => 'qualification',
                'reasoning' => 'Lead belum memiliki identifikasi Economic Buyer atau Decision Maker yang terverifikasi dalam BANTC. Risiko deal macet di tingkat evaluasi teknis.',
                'impact_score' => 88,
                'action_type' => 'navigate_tab',
                'action_payload' => ['tab' => 'bantc'],
                'action_label' => 'Lengkapi BANTC Guide',
            ];
        }

        if (in_array('Budget', $missingCategories) && in_array($lead->qualification_status, ['qualified', 'meeting_scheduled', 'proposal_sent'])) {
            $actions[] = [
                'id' => 'nba_bantc_budget',
                'title' => 'Validasi Estimasi Alokasi Anggaran (Budget)',
                'priority' => 'high',
                'category' => 'qualification',
                'reasoning' => 'Lead telah masuk fase aktif namun alokasi budget belum terkonfirmasi. Segera validasi rentang anggaran sebelum finalisasi penawaran.',
                'impact_score' => 82,
                'action_type' => 'navigate_tab',
                'action_payload' => ['tab' => 'bantc'],
                'action_label' => 'Buka Kualifikasi Budget',
            ];
        }

        if (in_array('Timeline', $missingCategories) && $lead->lead_score >= 50) {
            $actions[] = [
                'id' => 'nba_bantc_timeline',
                'title' => 'Tentukan Target Waktu Implementasi (Timeline)',
                'priority' => 'medium',
                'category' => 'qualification',
                'reasoning' => 'Lead memiliki skor engagement tinggi namun tanggal target go-live belum dipetakan. Menetapkan milestone mempercepat konversi.',
                'impact_score' => 74,
                'action_type' => 'navigate_tab',
                'action_payload' => ['tab' => 'bantc'],
                'action_label' => 'Petakan Timeline',
            ];
        }

        return $actions;
    }

    /**
     * Check deal stall and inactivity risks.
     */
    protected function evaluateSlippageRisk(Lead $lead): array
    {
        $actions = [];

        // Check last activity timestamp
        $lastActivity = $lead->activities()->latest('created_at')->first();
        $daysInactive = $lastActivity ? Carbon::parse($lastActivity->created_at)->diffInDays(now()) : 999;

        // Check if there is an overdue follow-up
        $overdueFollowUp = $lead->activities()
            ->whereNotNull('next_follow_up_date')
            ->where('next_follow_up_date', '<', now())
            ->where('status', '!=', 'completed')
            ->latest('next_follow_up_date')
            ->first();

        if ($overdueFollowUp) {
            $actions[] = [
                'id' => 'nba_overdue_followup',
                'title' => 'Jadwal Follow-up Sudah Terlewat (Overdue)',
                'priority' => 'urgent',
                'category' => 'risk_mitigation',
                'reasoning' => 'Terdapat agenda follow-up bertanggal ' . Carbon::parse($overdueFollowUp->next_follow_up_date)->format('d M Y') . ' yang belum diselesaikan. Hubungi prospek segera untuk menjaga momentum.',
                'impact_score' => 95,
                'action_type' => 'navigate_tab',
                'action_payload' => ['tab' => 'activities'],
                'action_label' => 'Lihat Follow-up Overdue',
            ];
        } elseif ($daysInactive >= 7 && !in_array($lead->qualification_status, ['disqualified', 'not_eligible', 'won', 'lost'])) {
            $actions[] = [
                'id' => 'nba_stalled_deal',
                'title' => 'Prospek Tidak Aktif selama ' . ($daysInactive === 999 ? '>14' : $daysInactive) . ' Hari',
                'priority' => 'high',
                'category' => 'deal_velocity',
                'reasoning' => 'Tidak ada interaksi tercatat dalam 7 hari terakhir. Peluang deal dingin meningkat drastis jika jeda melebihi 10 hari.',
                'impact_score' => 85,
                'action_type' => 'navigate_tab',
                'action_payload' => ['tab' => 'activities'],
                'action_label' => 'Catat Aktivitas Baru',
            ];
        }

        return $actions;
    }

    /**
     * Check readiness of AI Pre-Meeting Brief, Battle Cards, and Presales.
     */
    protected function evaluateIntelligenceReadiness(Lead $lead): array
    {
        $actions = [];

        // If lead score >= 60 and no pre-meeting brief exists or generated
        if ($lead->lead_score >= 60) {
            $hasBrief = !empty($lead->ai_pre_meeting_brief) || !empty($lead->pre_meeting_brief);

            if (!$hasBrief) {
                $actions[] = [
                    'id' => 'nba_generate_brief',
                    'title' => 'Generate AI Pre-Meeting Strategic Brief',
                    'priority' => 'medium',
                    'category' => 'strategy',
                    'reasoning' => 'Lead berbobot tinggi (' . $lead->lead_score . ' pts) belum memiliki brief persiapan meeting. Brief AI meringkas pain point, profil eksekutif, dan taktik pitching.',
                    'impact_score' => 78,
                    'action_type' => 'navigate_tab',
                    'action_payload' => ['tab' => 'brief'],
                    'action_label' => 'Buat Pre-Meeting Brief',
                ];
            }
        }

        // If revenue intelligence hasn't been run or needs update
        if (empty($lead->icp_fit_score) && !empty($lead->company_name)) {
            $actions[] = [
                'id' => 'nba_run_intelligence',
                'title' => 'Jalankan Analisis Revenue Intelligence',
                'priority' => 'medium',
                'category' => 'strategy',
                'reasoning' => 'Skor kecocokan ICP dan prediksi nilai konversi belum dihitung secara komprehensif oleh intelligence engine.',
                'impact_score' => 72,
                'action_type' => 'navigate_tab',
                'action_payload' => ['tab' => 'revenue'],
                'action_label' => 'Buka Revenue Tab',
            ];
        }

        return $actions;
    }

    /**
     * Check contact richness and communication channels.
     */
    protected function evaluateContactGaps(Lead $lead): array
    {
        $actions = [];
        $contactsCount = $lead->contacts()->count();
        $hasPhone = !empty($lead->phone) || $lead->contacts()->whereNotNull('phone')->exists();
        $hasEmail = !empty($lead->email) || $lead->contacts()->whereNotNull('email')->exists();

        if ($contactsCount === 0) {
            $actions[] = [
                'id' => 'nba_enrich_contacts',
                'title' => 'Tambahkan Kontak Person Kunci',
                'priority' => 'high',
                'category' => 'enrichment',
                'reasoning' => 'Lead ini belum memiliki kontak person spesifik. Gunakan fitur Tambah Kontak atau sinkronisasi Lusha/LinkedIn.',
                'impact_score' => 90,
                'action_type' => 'navigate_tab',
                'action_payload' => ['tab' => 'contacts'],
                'action_label' => 'Tambah Kontak Person',
            ];
        } elseif (!$hasPhone && !$hasEmail) {
            $actions[] = [
                'id' => 'nba_missing_direct_channel',
                'title' => 'Lengkapi Nomor Telepon atau Email Langsung',
                'priority' => 'medium',
                'category' => 'enrichment',
                'reasoning' => 'Tidak ditemukan saluran komunikasi langsung yang valid pada kontak tersimpan. Hubungi tim data enrichment.',
                'impact_score' => 75,
                'action_type' => 'navigate_tab',
                'action_payload' => ['tab' => 'contacts'],
                'action_label' => 'Perbarui Kontak',
            ];
        }

        return $actions;
    }

    /**
     * Check enrollment in automated cadence sequences.
     */
    protected function evaluateCadenceStatus(Lead $lead): array
    {
        $actions = [];

        // Check if sales cadence enrollments exist
        $isEnrolled = false;
        try {
            if (class_exists(\App\Models\SalesCadenceEnrollment::class)) {
                $isEnrolled = \App\Models\SalesCadenceEnrollment::where('lead_id', $lead->id)
                    ->whereIn('status', ['active', 'in_progress'])
                    ->exists();
            }
        } catch (\Throwable $e) {
            $isEnrolled = false;
        }

        if (!$isEnrolled && in_array($lead->qualification_status, ['unassessed', 'qualified', 'under_review'])) {
            $actions[] = [
                'id' => 'nba_enroll_cadence',
                'title' => 'Daftarkan ke Automated Sales Cadence',
                'priority' => 'medium',
                'category' => 'deal_velocity',
                'reasoning' => 'Lead belum masuk dalam sequence cadence multi-touch otomatis untuk mengoptimalkan frekuensi kontak dan respon prospek.',
                'impact_score' => 70,
                'action_type' => 'open_modal',
                'action_payload' => ['modal' => 'cadence'],
                'action_label' => 'Daftarkan Cadence',
            ];
        }

        return $actions;
    }
}
