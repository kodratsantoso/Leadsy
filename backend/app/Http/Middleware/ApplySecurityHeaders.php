<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApplySecurityHeaders
{
    /**
     * Handle an incoming request and apply strict enterprise security headers.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        // Remove information disclosure tokens if headers haven't already been emitted
        if (! headers_sent() && function_exists('header_remove')) {
            header_remove('X-Powered-By');
            header_remove('Server');
        }

        $headers = [
            'Strict-Transport-Security' => 'max-age=63072000; includeSubDomains; preload',
            'X-Frame-Options' => 'SAMEORIGIN',
            'X-Content-Type-Options' => 'nosniff',
            'X-XSS-Protection' => '1; mode=block',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            'Permissions-Policy' => 'camera=(), microphone=(), geolocation=(self)',
            'Content-Security-Policy' => "default-src 'self'; frame-ancestors 'self'; object-src 'none';",
        ];

        foreach ($headers as $key => $value) {
            $response->headers->set($key, $value, false);
        }

        $response->headers->remove('X-Powered-By');
        $response->headers->remove('Server');

        return $response;
    }
}
