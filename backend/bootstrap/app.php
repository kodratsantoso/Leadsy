<?php

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

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
        $renderApiError = function (Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            $status = 500;
            $code = 'SERVER_ERROR';
            $message = config('app.debug') ? $e->getMessage() : 'An unexpected server error occurred.';
            $details = null;

            if ($e instanceof ValidationException) {
                $status = 422;
                $code = 'VALIDATION_ERROR';
                $message = 'The given data was invalid.';
                $details = $e->errors();
            } elseif ($e instanceof AuthenticationException) {
                $status = 401;
                $code = 'UNAUTHENTICATED';
                $message = 'Unauthenticated';
            } elseif ($e instanceof AuthorizationException) {
                $status = 403;
                $code = 'FORBIDDEN';
                $message = $e->getMessage() ?: 'Forbidden';
            } elseif ($e instanceof ModelNotFoundException) {
                $status = 404;
                $code = 'NOT_FOUND';
                $message = 'Resource not found';
            } elseif ($e instanceof HttpExceptionInterface) {
                $status = $e->getStatusCode();
                $code = 'HTTP_ERROR';
                $message = $e->getMessage() ?: $message;
            }

            return response()->json([
                'success' => false,
                'data' => null,
                'meta' => [],
                'error' => array_filter([
                    'code' => $code,
                    'message' => $message,
                    'details' => $details,
                ], fn ($value) => $value !== null),
                'message' => $message,
            ], $status);
        };

        $exceptions->render($renderApiError);
    })->create();
