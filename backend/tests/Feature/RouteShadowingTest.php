<?php

namespace Tests\Feature;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Laravel matches routes in registration order, so a literal path registered after a
 * wildcard of the same shape is unreachable.
 *
 * This is not hypothetical. `leads/{lead}/progress` is registered ~40 lines before
 * `leads/ai-screening/progress`, so every request to the AI Screening Monitor's progress
 * endpoint was handled by the activity controller with {lead} = "ai-screening". Route
 * model binding then asked PostgreSQL for that id, which fails with SQLSTATE 22P02, and
 * the Monitor page answered 500 on every single load.
 */
class RouteShadowingTest extends TestCase
{
    private function resolve(string $uri, string $method = 'GET'): string
    {
        return Route::getRoutes()->match(Request::create($uri, $method))->uri();
    }

    public function test_the_ai_screening_monitor_endpoints_are_reachable(): void
    {
        $this->assertSame(
            'api/leads/ai-screening/progress',
            $this->resolve('/api/leads/ai-screening/progress'),
            'leads/{lead}/progress is swallowing the monitor endpoint again.'
        );

        $this->assertSame('api/leads/ai-screening/recent-runs', $this->resolve('/api/leads/ai-screening/recent-runs'));
        $this->assertSame('api/leads/ai-screening/scheduler-heartbeat', $this->resolve('/api/leads/ai-screening/scheduler-heartbeat'));
        $this->assertSame('api/leads/ai-screening/unassessed-count', $this->resolve('/api/leads/ai-screening/unassessed-count'));
    }

    public function test_a_numeric_lead_still_reaches_the_wildcard_route(): void
    {
        // The constraint must not cost us the route it shares a shape with.
        $this->assertSame('api/leads/{lead}/progress', $this->resolve('/api/leads/512/progress'));
        $this->assertSame('api/leads/{lead}/intelligence', $this->resolve('/api/leads/512/intelligence'));
        $this->assertSame('api/leads/{lead}/activities/{activity}', $this->resolve('/api/leads/512/activities/7', 'PUT'));
    }

    /**
     * The general rule, checked across the whole table so the next collision fails here
     * rather than in production.
     */
    public function test_no_literal_route_is_shadowed_by_an_earlier_wildcard(): void
    {
        $routes = Route::getRoutes();
        $shadowed = [];

        foreach ($routes as $route) {
            $uri = $route->uri();

            if (str_contains($uri, '{') || $uri === '' || $uri === '/') {
                continue;
            }

            foreach ($route->methods() as $method) {
                if ($method === 'HEAD') {
                    continue;
                }

                try {
                    $matched = $routes->match(Request::create('/'.ltrim($uri, '/'), $method));
                } catch (\Throwable) {
                    continue; // no match at all is a different problem, not shadowing
                }

                if ($matched->uri() !== $uri) {
                    $shadowed[] = "{$method} /{$uri} is handled by {$matched->uri()}";
                }
            }
        }

        $this->assertSame([], array_values(array_unique($shadowed)));
    }
}
