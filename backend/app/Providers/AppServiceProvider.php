<?php

namespace App\Providers;

use App\Http\Middleware\CheckPermission;
use App\Services\Enrichment\ContactEnrichmentOrchestrator;
use App\Services\Enrichment\Providers\LushaProvider;
use App\Models\Lead;
use App\Models\LeadFollowUp;
use App\Observers\LeadObserver;
use App\Observers\LeadFollowUpObserver;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ContactEnrichmentOrchestrator::class, function () {
            return new ContactEnrichmentOrchestrator([
                new LushaProvider,
            ]);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register RBAC middleware alias
        Route::aliasMiddleware('permission', CheckPermission::class);

        // Register model observers for Lark integration
        Lead::observe(LeadObserver::class);
        LeadFollowUp::observe(LeadFollowUpObserver::class);
    }
}
