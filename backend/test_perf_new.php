<?php
$user = App\Models\User::first();
$request = Illuminate\Http\Request::create('/api/dashboard/team-performance', 'GET', ['period' => 'month']);
$request->setUserResolver(function () use ($user) { return $user; });
$svc = app(App\Services\Analytics\RoleKpiCalculationService::class);
$controller = new App\Http\Controllers\Api\TeamPerformanceDashboardController($svc);
echo json_encode($controller->index($request)->getData(), JSON_PRETTY_PRINT);
