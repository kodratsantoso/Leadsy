<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('plans')) {
            Schema::create('plans', function (Blueprint $table) {
                $table->id();
                $table->string('code')->unique();
                $table->string('name');
                $table->text('description')->nullable();
                $table->decimal('price_monthly', 10, 2)->default(0);
                $table->decimal('price_annual', 10, 2)->default(0);
                $table->string('currency', 10)->default('USD');
                $table->unsignedInteger('seats_limit')->default(5);
                $table->decimal('price_per_additional_seat', 10, 2)->default(10.00);
                $table->unsignedInteger('leads_limit')->default(1000);
                $table->unsignedInteger('disk_limit_gb')->default(10);
                $table->decimal('ai_budget_cap_usd', 10, 2)->default(50.00);
                $table->unsignedInteger('whatsapp_channels_limit')->default(1);
                $table->json('features')->nullable();
                $table->json('modules')->nullable();
                $table->boolean('is_popular')->default(false);
                $table->boolean('is_public')->default(true);
                $table->string('status', 30)->default('active');
                $table->timestamps();
            });
        }

        if (Schema::hasTable('tenants')) {
            Schema::table('tenants', function (Blueprint $table) {
                if (!Schema::hasColumn('tenants', 'plan_id')) {
                    $table->foreignId('plan_id')->nullable()->constrained('plans')->nullOnDelete();
                }
                if (!Schema::hasColumn('tenants', 'trial_ends_at')) {
                    $table->timestamp('trial_ends_at')->nullable();
                }
                if (!Schema::hasColumn('tenants', 'subscription_ends_at')) {
                    $table->timestamp('subscription_ends_at')->nullable();
                }
                if (!Schema::hasColumn('tenants', 'billing_cycle')) {
                    $table->string('billing_cycle', 20)->default('monthly');
                }
            });
        }

        // Seed default plans if empty
        if (DB::table('plans')->count() === 0) {
            $now = now();
            $plans = [
                [
                    'code' => 'starter',
                    'name' => 'Starter Tier',
                    'description' => 'Essential CRM and qualification tools for emerging sales teams.',
                    'price_monthly' => 49.00,
                    'price_annual' => 470.00,
                    'currency' => 'USD',
                    'seats_limit' => 5,
                    'price_per_additional_seat' => 12.00,
                    'leads_limit' => 1000,
                    'disk_limit_gb' => 10,
                    'ai_budget_cap_usd' => 50.00,
                    'whatsapp_channels_limit' => 1,
                    'features' => json_encode(['Lead Management', 'Basic AI Qualification', 'Local WhatsApp Gateway', 'Community Support']),
                    'modules' => json_encode([
                        'lead_management' => true,
                        'activity_tracking' => true,
                        'whatsapp_local_gateway' => true,
                        'ai_qualification_scoring' => true,
                        'whatsapp_qontak_cloud' => false,
                        'lark_bitable_sync' => false,
                        'ads_webhook_ingestion' => false,
                        'ai_pre_meeting_brief' => false,
                        'ai_meeting_summary' => false,
                        'order_to_cash' => false,
                        'dedicated_queue' => false,
                        'custom_domain_ssl' => false,
                        'immutable_audit_logs' => false,
                    ]),
                    'is_popular' => false,
                    'is_public' => true,
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'code' => 'pro',
                    'name' => 'Professional Growth',
                    'description' => 'Advanced AI intelligence, Lark 2-way sync, and Qontak Cloud API for scaling businesses.',
                    'price_monthly' => 149.00,
                    'price_annual' => 1430.00,
                    'currency' => 'USD',
                    'seats_limit' => 25,
                    'price_per_additional_seat' => 10.00,
                    'leads_limit' => 10000,
                    'disk_limit_gb' => 25,
                    'ai_budget_cap_usd' => 150.00,
                    'whatsapp_channels_limit' => 3,
                    'features' => json_encode(['Everything in Starter', 'Lark Bitable 2-Way Sync', 'AI DeepSearch & Enrichment', 'Qontak WhatsApp Cloud API', 'Priority Support']),
                    'modules' => json_encode([
                        'lead_management' => true,
                        'activity_tracking' => true,
                        'whatsapp_local_gateway' => true,
                        'ai_qualification_scoring' => true,
                        'whatsapp_qontak_cloud' => true,
                        'lark_bitable_sync' => true,
                        'ads_webhook_ingestion' => true,
                        'ai_pre_meeting_brief' => true,
                        'ai_meeting_summary' => true,
                        'order_to_cash' => false,
                        'dedicated_queue' => false,
                        'custom_domain_ssl' => false,
                        'immutable_audit_logs' => false,
                    ]),
                    'is_popular' => true,
                    'is_public' => true,
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'code' => 'enterprise',
                    'name' => 'Enterprise Custom',
                    'description' => 'Full control plane isolation, Order-to-Cash invoicing, custom domain branding, and SLA guarantee.',
                    'price_monthly' => 499.00,
                    'price_annual' => 4790.00,
                    'currency' => 'USD',
                    'seats_limit' => 100,
                    'price_per_additional_seat' => 8.00,
                    'leads_limit' => 100000,
                    'disk_limit_gb' => 100,
                    'ai_budget_cap_usd' => 500.00,
                    'whatsapp_channels_limit' => 10,
                    'features' => json_encode(['Everything in Pro', 'Order-to-Cash & Invoicing', 'Dedicated Redis Queue Isolation', 'Custom Domain Branding', 'SLA 99.9% & 24/7 Support']),
                    'modules' => json_encode([
                        'lead_management' => true,
                        'activity_tracking' => true,
                        'whatsapp_local_gateway' => true,
                        'ai_qualification_scoring' => true,
                        'whatsapp_qontak_cloud' => true,
                        'lark_bitable_sync' => true,
                        'ads_webhook_ingestion' => true,
                        'ai_pre_meeting_brief' => true,
                        'ai_meeting_summary' => true,
                        'order_to_cash' => true,
                        'dedicated_queue' => true,
                        'custom_domain_ssl' => true,
                        'immutable_audit_logs' => true,
                    ]),
                    'is_popular' => false,
                    'is_public' => true,
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'code' => 'trial',
                    'name' => '14-Day Free Evaluation',
                    'description' => 'Full access trial for evaluating Leadsy sales capabilities.',
                    'price_monthly' => 0.00,
                    'price_annual' => 0.00,
                    'currency' => 'USD',
                    'seats_limit' => 5,
                    'price_per_additional_seat' => 0.00,
                    'leads_limit' => 500,
                    'disk_limit_gb' => 5,
                    'ai_budget_cap_usd' => 10.00,
                    'whatsapp_channels_limit' => 1,
                    'features' => json_encode(['14-Day Full Access', 'Lead Scoring Preview', 'Lark Sync Preview']),
                    'modules' => json_encode([
                        'lead_management' => true,
                        'activity_tracking' => true,
                        'whatsapp_local_gateway' => true,
                        'ai_qualification_scoring' => true,
                        'whatsapp_qontak_cloud' => false,
                        'lark_bitable_sync' => true,
                        'ads_webhook_ingestion' => false,
                        'ai_pre_meeting_brief' => true,
                        'ai_meeting_summary' => false,
                        'order_to_cash' => false,
                        'dedicated_queue' => false,
                        'custom_domain_ssl' => false,
                        'immutable_audit_logs' => false,
                    ]),
                    'is_popular' => false,
                    'is_public' => false,
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ];

            DB::table('plans')->insert($plans);

            // Associate default workspace (#1) with Enterprise plan
            $enterprisePlan = DB::table('plans')->where('code', 'enterprise')->first();
            if ($enterprisePlan) {
                DB::table('tenants')->where('id', 1)->update([
                    'plan_id' => $enterprisePlan->id,
                    'billing_cycle' => 'annual',
                    'subscription_ends_at' => now()->addYear(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('tenants')) {
            Schema::table('tenants', function (Blueprint $table) {
                if (Schema::hasColumn('tenants', 'plan_id')) {
                    $table->dropForeign(['plan_id']);
                    $table->dropColumn(['plan_id', 'trial_ends_at', 'subscription_ends_at', 'billing_cycle']);
                }
            });
        }

        Schema::dropIfExists('plans');
    }
};
