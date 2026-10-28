<?php

namespace App\Services\Notification;

use App\Models\CommercialInvoice;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\PsDocument;
use App\Models\PsProjectPlan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CrossDepartmentNotificationService
{
    /**
     * Notify Finance & Account Executive when an invoice is generated from BAST.
     */
    public function notifyInvoiceGenerated(CommercialInvoice $invoice): void
    {
        $message = "💰 [FINANCE ALERT] Faktur Penagihan #{$invoice->invoice_number} telah diterbitkan untuk Lead '{$invoice->lead?->company_name}' senilai Rp " . number_format($invoice->total_amount, 0, ',', '.') . " (Ref BAST #{$invoice->psDocument?->document_number}). Segera verifikasi untuk pengiriman ke klien.";

        $this->dispatchExternalAlerts('finance', 'Faktur Penagihan Diterbitkan', $message, [
            'invoice_id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'lead_id' => $invoice->lead_id,
            'amount' => $invoice->total_amount,
            'due_date' => $invoice->due_date?->format('d M Y'),
        ]);
    }

    /**
     * Notify Finance & Delivery when BAST is signed by client.
     */
    public function notifyBastSigned(PsDocument $bast): void
    {
        $message = "📝 [DELIVERY & FINANCE ALERT] Berita Acara Serah Terima (BAST) #{$bast->document_number} telah DITANDATANGANI oleh klien. Tim Finance dipersilakan menerbitkan faktur tagihan termin.";

        LeadActivity::create([
            'lead_id' => $bast->lead_id,
            'user_id' => auth()->id(),
            'activity_type' => 'bast_signed_alert',
            'notes' => "[HANDOVER ALERT] {$message}",
            'tenant_id' => $bast->lead?->tenant_id,
        ]);

        $this->dispatchExternalAlerts('finance', 'BAST Telah Disetujui Klien', $message, [
            'bast_id' => $bast->id,
            'lead_id' => $bast->lead_id,
            'document_number' => $bast->document_number,
        ]);
    }

    /**
     * Notify Project Manager when SOW is signed.
     */
    public function notifySowSigned(PsDocument $sow): void
    {
        $message = "🚀 [PROJECT DELIVERY ALERT] Dokumen SOW #{$sow->document_number} telah DITANDATANGANI secara sah via PSrE. Tim Project Manager dipersilakan menginisialisasi Rencana Kerja & Alokasi Resource.";

        LeadActivity::create([
            'lead_id' => $sow->lead_id,
            'user_id' => auth()->id(),
            'activity_type' => 'sow_signed_alert',
            'notes' => "[HANDOVER ALERT] {$message}",
            'tenant_id' => $sow->lead?->tenant_id,
        ]);

        $this->dispatchExternalAlerts('delivery', 'SOW Resmi Disepakati', $message, [
            'sow_id' => $sow->id,
            'lead_id' => $sow->lead_id,
            'document_number' => $sow->document_number,
        ]);
    }

    /**
     * Notify Sales Management on SLA breach.
     */
    public function notifySlaBreach(Lead $lead, string $reason): void
    {
        $message = "⚠️ [SLA ESCALATION] Kesepakatan dengan '{$lead->company_name}' melanggar SLA: {$reason}. Memerlukan perhatian segera dari Sales Manager / Pimpinan.";

        $this->dispatchExternalAlerts('sales_management', 'Eskalasi Pelanggaran SLA', $message, [
            'lead_id' => $lead->id,
            'company_name' => $lead->company_name,
            'reason' => $reason,
        ]);
    }

    /**
     * Notify Customer Success Management on Project Plan completion.
     */
    public function notifyDeliveryComplete(PsProjectPlan $projectPlan): void
    {
        $message = "🤝 [CUSTOMER SUCCESS ALERT] Proyek Delivery '{$projectPlan->project_name}' untuk klien '{$projectPlan->customer_name_snapshot}' telah SELESAI 100%. Tim CSM dipersilakan memulai alur onboarding & pemantauan skor kepuasan.";

        LeadActivity::create([
            'lead_id' => $projectPlan->lead_id,
            'user_id' => auth()->id(),
            'activity_type' => 'delivery_completed_handover',
            'notes' => "[CS HANDOVER] {$message}",
            'tenant_id' => $projectPlan->lead?->tenant_id,
        ]);

        $this->dispatchExternalAlerts('customer_success', 'Serah Terima Akun ke CS', $message, [
            'project_plan_id' => $projectPlan->id,
            'lead_id' => $projectPlan->lead_id,
            'project_name' => $projectPlan->project_name,
        ]);
    }

    /**
     * Dispatch notification payload to Lark Webhook and WhatsApp Sidecar if available.
     */
    protected function dispatchExternalAlerts(string $channel, string $title, string $text, array $payload = []): void
    {
        Log::info("CrossDepartmentNotification [{$channel}]: {$title} - {$text}", $payload);

        // 1. Dispatch to Lark Webhook if configured
        $larkWebhook = config('services.lark.webhook_url') ?? env('LARK_WEBHOOK_URL');
        if ($larkWebhook) {
            try {
                Http::timeout(5)->post($larkWebhook, [
                    'msg_type' => 'interactive',
                    'card' => [
                        'header' => [
                            'title' => [
                                'tag' => 'plain_text',
                                'content' => "Leadsy Enterprise: {$title}",
                            ],
                            'template' => $channel === 'sales_management' ? 'red' : 'blue',
                        ],
                        'elements' => [
                            [
                                'tag' => 'div',
                                'text' => [
                                    'tag' => 'lark_md',
                                    'content' => $text,
                                ],
                            ],
                        ],
                    ],
                ]);
            } catch (\Throwable $e) {
                Log::warning("Gagal mengirim Lark webhook: " . $e->getMessage());
            }
        }

        // 2. Dispatch to WhatsApp Sidecar if configured
        $whatsappSidecar = config('services.whatsapp.sidecar_url') ?? env('WHATSAPP_SIDECAR_URL');
        $targetPhone = env('SALES_ALERT_PHONE');
        if ($whatsappSidecar && $targetPhone) {
            try {
                Http::timeout(5)->post("{$whatsappSidecar}/send-message", [
                    'phone' => $targetPhone,
                    'message' => "*Leadsy Enterprise Alert*\n\n{$title}\n\n{$text}",
                ]);
            } catch (\Throwable $e) {
                Log::warning("Gagal mengirim WhatsApp alert: " . $e->getMessage());
            }
        }
    }
}
