<?php

namespace App\Providers;

use App\Http\Middleware\CheckPermission;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register RBAC middleware alias
        Route::aliasMiddleware('permission', CheckPermission::class);
    }
}
