<?php

namespace Database\Seeders;

use App\Models\SalesCadence;
use App\Models\SalesCadenceStep;
use App\Models\User;
use Illuminate\Database\Seeder;

class SalesCadenceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (SalesCadence::count() > 0) {
            $this->command->info('Sales cadences already exist, skipping seeder.');
            return;
        }

        $adminId = User::first()?->id ?? 1;

        // 1. Standard B2B Inbound Multi-Touch Sequence
        $cadence1 = SalesCadence::create([
            'name' => 'Standard B2B Inbound 7-Day Sequence',
            'description' => 'Alur outreach multi-touch 4-tahap (WhatsApp, Email, Telepon) untuk follow-up lead baru dalam 7 hari pertama.',
            'target_audience' => 'Inbound B2B Leads',
            'trigger_type' => 'manual',
            'created_by' => $adminId,
            'is_active' => true,
        ]);

        SalesCadenceStep::create([
            'sales_cadence_id' => $cadence1->id,
            'step_number' => 1,
            'channel' => 'whatsapp',
            'delay_days' => 0,
            'template_subject' => null,
            'template_body' => "Halo Bapak/Ibu {{lead.pic_name}} dari {{lead.company_name}}, salam hangat dari Leadsy. Terima kasih atas ketertarikan Anda pada platform kami. Apakah ada waktu luang 10 menit minggu ini untuk diskusi singkat kebutuhan otomasi sales & CRM tim Anda?",
            'ai_personalization' => true,
            'is_automated' => true,
        ]);

        SalesCadenceStep::create([
            'sales_cadence_id' => $cadence1->id,
            'step_number' => 2,
            'channel' => 'email',
            'delay_days' => 2,
            'template_subject' => 'Solusi Leadsy CRM & AI Pipeline untuk {{lead.company_name}}',
            'template_body' => "Yth. Bapak/Ibu {{lead.pic_name}},\n\nMelanjutkan perkenalan kami sebelumnya, berikut kami lampirkan ringkasan solusi Leadsy dalam mengotomasi pipeline B2B dan WhatsApp CRM. Kami siap menjadwalkan demo singkat disesuaikan dengan kebutuhan alur sales di {{lead.company_name}}.\n\nSalam hangat,\nTim Leadsy",
            'ai_personalization' => true,
            'is_automated' => false,
        ]);

        SalesCadenceStep::create([
            'sales_cadence_id' => $cadence1->id,
            'step_number' => 3,
            'channel' => 'call_reminder',
            'delay_days' => 2,
            'template_subject' => null,
            'template_body' => "Hubungi PIC {{lead.pic_name}} ({{lead.phone}}) untuk menanyakan penerimaan company deck dan konfirmasi jadwal product demo.",
            'ai_personalization' => false,
            'is_automated' => false,
        ]);

        SalesCadenceStep::create([
            'sales_cadence_id' => $cadence1->id,
            'step_number' => 4,
            'channel' => 'whatsapp',
            'delay_days' => 3,
            'template_subject' => null,
            'template_body' => "Halo Bapak/Ibu {{lead.pic_name}}, kami ingin memastikan apakah ada hal spesifik yang ingin didiskusikan terkait deck kami sebelumnya. Kami siap membantu jika tim Anda memerlukan presentasi langsung.",
            'ai_personalization' => true,
            'is_automated' => false,
        ]);

        // 2. Enterprise Outbound & ABM Sequence
        $cadence2 = SalesCadence::create([
            'name' => 'Enterprise Outbound & ABM Cadence',
            'description' => 'Sekuens outreach terstruktur untuk prospek enterprise bernilai tinggi dengan kombinasi riset akun, email eksekutif, dan touchpoint WhatsApp.',
            'target_audience' => 'Enterprise & High-Value Deals',
            'trigger_type' => 'manual',
            'created_by' => $adminId,
            'is_active' => true,
        ]);

        SalesCadenceStep::create([
            'sales_cadence_id' => $cadence2->id,
            'step_number' => 1,
            'channel' => 'email',
            'delay_days' => 0,
            'template_subject' => 'Peluang Optimasi Pipeline & Revenue Intelligence di {{lead.company_name}}',
            'template_body' => "Kepada Yth. Rekan Manajemen di {{lead.company_name}},\n\nKami mengamati pertumbuhan dan inisiatif digital tim Anda di industri saat ini. Leadsy membantu perusahaan enterprise mengoptimalkan konversi lead dan monitoring tim sales berbasis AI.\n\nApakah memungkinkan jika kita jadwalkan perkenalan singkat selama 15 menit minggu ini?\n\nSalam hangat,\nExecutive Team Leadsy",
            'ai_personalization' => true,
            'is_automated' => false,
        ]);

        SalesCadenceStep::create([
            'sales_cadence_id' => $cadence2->id,
            'step_number' => 2,
            'channel' => 'whatsapp',
            'delay_days' => 2,
            'template_subject' => null,
            'template_body' => "Selamat pagi Bapak/Ibu {{lead.pic_name}}, saya izin menindaklanjuti email pengantar yang kami kirimkan ke {{lead.email}}. Kami sangat antusias untuk mendiskusikan peluang kolaborasi bersama {{lead.company_name}}.",
            'ai_personalization' => true,
            'is_automated' => false,
        ]);

        SalesCadenceStep::create([
            'sales_cadence_id' => $cadence2->id,
            'step_number' => 3,
            'channel' => 'internal_task',
            'delay_days' => 3,
            'template_subject' => null,
            'template_body' => "Lakukan riset stakeholder kunci {{lead.company_name}} di LinkedIn dan siapkan case study industri sejenis untuk materi pertemuan.",
            'ai_personalization' => false,
            'is_automated' => false,
        ]);

        SalesCadenceStep::create([
            'sales_cadence_id' => $cadence2->id,
            'step_number' => 4,
            'channel' => 'call_reminder',
            'delay_days' => 2,
            'template_subject' => null,
            'template_body' => "Panggilan telepon eksekutif ke PIC {{lead.pic_name}} untuk menawarkan sesi briefing singkat dan pendalaman use-case.",
            'ai_personalization' => false,
            'is_automated' => false,
        ]);

        $this->command?->info("Successfully seeded 2 default Sales Cadences with steps.");
    }
}
