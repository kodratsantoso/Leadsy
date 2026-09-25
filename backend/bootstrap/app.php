<?php

use App\Support\ApiErrorTranslator;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        //
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            // A controller that already built its own response — `abort(response()->json(...))`,
            // which is how the revenue gate reports why a lead cannot move stage — arrives here
            // as HttpResponseException. Laravel unwraps it, but only *after* render callbacks
            // run, so a catch-all callback that does not check for it first turns every one of
            // those deliberate, explanatory 422s into a blank 500.
            if ($e instanceof HttpResponseException) {
                return $e->getResponse();
            }

            return ApiErrorTranslator::make()->toResponse($e, $request);
        });
    })->create();
