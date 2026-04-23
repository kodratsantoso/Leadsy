<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_providers', function (Blueprint $table) {
            if (! Schema::hasColumn('ai_providers', 'provider_type')) {
                $table->string('provider_type')->default('custom')->after('slug');
            }
            if (! Schema::hasColumn('ai_providers', 'api_key_last4')) {
                $table->string('api_key_last4', 8)->nullable()->after('api_key_encrypted');
            }
            if (! Schema::hasColumn('ai_providers', 'project_id')) {
                $table->string('project_id')->nullable()->after('organization_id');
            }
            if (! Schema::hasColumn('ai_providers', 'default_model')) {
                $table->string('default_model')->nullable()->after('project_id');
            }
            if (! Schema::hasColumn('ai_providers', 'timeout_seconds')) {
                $table->unsignedSmallInteger('timeout_seconds')->default(30)->after('default_model');
            }
            if (! Schema::hasColumn('ai_providers', 'retry_limit')) {
                $table->unsignedSmallInteger('retry_limit')->default(1)->after('timeout_seconds');
            }
            if (! Schema::hasColumn('ai_providers', 'max_tokens_default')) {
                $table->unsignedInteger('max_tokens_default')->nullable()->after('retry_limit');
            }
            if (! Schema::hasColumn('ai_providers', 'cache_ttl_minutes')) {
                $table->unsignedInteger('cache_ttl_minutes')->nullable()->after('max_tokens_default');
            }
            if (! Schema::hasColumn('ai_providers', 'cost_sensitivity')) {
                $table->string('cost_sensitivity')->default('balanced')->after('cache_ttl_minutes');
            }
            if (! Schema::hasColumn('ai_providers', 'last_tested_at')) {
                $table->timestamp('last_tested_at')->nullable()->after('cost_sensitivity');
            }
            if (! Schema::hasColumn('ai_providers', 'last_test_status')) {
                $table->string('last_test_status')->nullable()->after('last_tested_at');
            }
            if (! Schema::hasColumn('ai_providers', 'last_test_message')) {
                $table->text('last_test_message')->nullable()->after('last_test_status');
            }
            if (! Schema::hasColumn('ai_providers', 'last_used_at')) {
                $table->timestamp('last_used_at')->nullable()->after('last_test_message');
            }
            if (! Schema::hasColumn('ai_providers', 'last_used_model')) {
                $table->string('last_used_model')->nullable()->after('last_used_at');
            }
        });

        Schema::table('ai_feature_routes', function (Blueprint $table) {
            if (! Schema::hasColumn('ai_feature_routes', 'cache_ttl_minutes')) {
                $table->unsignedInteger('cache_ttl_minutes')->nullable()->after('timeout_seconds');
            }
            if (! Schema::hasColumn('ai_feature_routes', 'max_tokens')) {
                $table->unsignedInteger('max_tokens')->nullable()->after('cache_ttl_minutes');
            }
            if (! Schema::hasColumn('ai_feature_routes', 'complexity_mode')) {
                $table->string('complexity_mode')->default('standard')->after('max_tokens');
            }
        });

        if (! Schema::hasTable('ai_connection_tests')) {
            Schema::create('ai_connection_tests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('ai_provider_id')->constrained('ai_providers')->cascadeOnDelete();
                $table->foreignId('tested_by')->nullable()->constrained('users')->nullOnDelete();
                $table->boolean('success')->default(false);
                $table->unsignedSmallInteger('http_status')->nullable();
                $table->unsignedInteger('latency_ms')->nullable();
                $table->text('message')->nullable();
                $table->json('response_metadata')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('ai_prompt_templates')) {
            Schema::create('ai_prompt_templates', function (Blueprint $table) {
                $table->id();
                $table->string('feature_name')->index();
                $table->string('template_name');
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->unsignedBigInteger('active_version_id')->nullable();
                $table->timestamps();
                $table->unique(['feature_name', 'template_name']);
            });
        }

        if (! Schema::hasTable('ai_prompt_template_versions')) {
            Schema::create('ai_prompt_template_versions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('ai_prompt_template_id')->constrained('ai_prompt_templates')->cascadeOnDelete();
                $table->unsignedInteger('version');
                $table->longText('content');
                $table->boolean('is_active')->default(false);
                $table->boolean('is_enabled')->default(true);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('activated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('activated_at')->nullable();
                $table->timestamps();
                $table->unique(['ai_prompt_template_id', 'version']);
            });
        }

        Schema::table('ai_prompt_templates', function (Blueprint $table) {
            if (Schema::hasTable('ai_prompt_template_versions')) {
                $table->foreign('active_version_id')->references('id')->on('ai_prompt_template_versions')->nullOnDelete();
            }
        });

        DB::table('ai_providers')
            ->orderBy('id')
            ->get()
            ->each(function ($provider): void {
                $rawKey = $provider->api_key_encrypted;
                try {
                    $rawKey = Crypt::decryptString($provider->api_key_encrypted);
                } catch (\Throwable) {
                    $rawKey = (string) $provider->api_key_encrypted;
                }

                $providerType = match ($provider->slug) {
                    'openai' => 'openai',
                    'anthropic' => 'anthropic',
                    'google', 'gemini' => 'gemini',
                    'openrouter' => 'openrouter',
                    default => 'custom',
                };

                $defaultModel = DB::table('ai_models')
                    ->where('ai_provider_id', $provider->id)
                    ->where('status', 'active')
                    ->orderBy('id')
                    ->value('name');

                DB::table('ai_providers')
                    ->where('id', $provider->id)
                    ->update([
                        'provider_type' => $providerType,
                        'api_key_last4' => $rawKey ? substr($rawKey, -4) : null,
                        'default_model' => $defaultModel,
                    ]);
            });

        if (Schema::hasTable('ai_model_routes')) {
            DB::table('ai_model_routes')
                ->orderBy('id')
                ->get()
                ->each(function ($route): void {
                    $existingPrimary = DB::table('ai_feature_routes')
                        ->where('feature_name', $route->function_name)
                        ->where('priority', 1)
                        ->exists();

                    if (! $existingPrimary) {
                        DB::table('ai_feature_routes')->insert([
                            'feature_name' => $route->function_name,
                            'ai_model_id' => $route->primary_model_id,
                            'priority' => 1,
                            'max_retries' => $route->retry_count ?? 1,
                            'timeout_seconds' => $route->timeout_seconds ?? 30,
                            'cost_sensitivity' => 'balanced',
                            'is_active' => $route->is_active ?? true,
                            'complexity_mode' => 'standard',
                            'created_at' => $route->created_at ?? now(),
                            'updated_at' => $route->updated_at ?? now(),
                        ]);
                    }

                    if ($route->fallback_model_id) {
                        $existingFallback = DB::table('ai_feature_routes')
                            ->where('feature_name', $route->function_name)
                            ->where('priority', 2)
                            ->exists();

                        if (! $existingFallback) {
                            DB::table('ai_feature_routes')->insert([
                                'feature_name' => $route->function_name,
                                'ai_model_id' => $route->fallback_model_id,
                                'priority' => 2,
                                'max_retries' => $route->retry_count ?? 1,
                                'timeout_seconds' => $route->timeout_seconds ?? 30,
                                'cost_sensitivity' => 'balanced',
                                'is_active' => $route->is_active ?? true,
                                'complexity_mode' => 'standard',
                                'created_at' => $route->created_at ?? now(),
                                'updated_at' => $route->updated_at ?? now(),
                            ]);
                        }
                    }
                });
        }
    }

    public function down(): void
    {
        Schema::table('ai_prompt_templates', function (Blueprint $table) {
            if (Schema::hasColumn('ai_prompt_templates', 'active_version_id')) {
                $table->dropForeign(['active_version_id']);
            }
        });

        Schema::dropIfExists('ai_prompt_template_versions');
        Schema::dropIfExists('ai_prompt_templates');
        Schema::dropIfExists('ai_connection_tests');

        Schema::table('ai_feature_routes', function (Blueprint $table) {
            foreach (['cache_ttl_minutes', 'max_tokens', 'complexity_mode'] as $column) {
                if (Schema::hasColumn('ai_feature_routes', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('ai_providers', function (Blueprint $table) {
            foreach ([
                'provider_type',
                'api_key_last4',
                'project_id',
                'default_model',
                'timeout_seconds',
                'retry_limit',
                'max_tokens_default',
                'cache_ttl_minutes',
                'cost_sensitivity',
                'last_tested_at',
                'last_test_status',
                'last_test_message',
                'last_used_at',
                'last_used_model',
            ] as $column) {
                if (Schema::hasColumn('ai_providers', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
