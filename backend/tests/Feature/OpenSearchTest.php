<?php

namespace Tests\Feature;

use App\Models\IntegrationConfig;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OpenSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_400_when_q_parameter_is_missing()
    {
        $response = $this->getJson('/api/opensearch/contacts');

        $response->assertStatus(400);
        $response->assertJson([
            'error' => 'Search terms ("q") are required.'
        ]);
    }

    public function test_it_returns_503_when_api_key_or_search_engine_id_is_missing()
    {
        $response = $this->getJson('/api/opensearch/contacts?q=test');

        $response->assertStatus(503);
        $response->assertJson([
            'error' => 'Google Custom Search API Key or Search Engine ID is not configured.'
        ]);
    }

    public function test_it_correctly_identifies_xml_accept_headers_for_rss()
    {
        $response = $this->get('/api/opensearch/contacts?q=test', [
            'Accept' => 'application/rss+xml',
        ]);

        // Should return RSS error because API key is not configured, but formatted as RSS XML
        $response->assertStatus(503);
        $response->assertHeader('Content-Type', 'application/rss+xml; charset=UTF-8');
        $this->assertStringContainsString('<error>', $response->getContent());
        $this->assertStringContainsString('<code>503</code>', $response->getContent());
    }

    public function test_it_correctly_identifies_xml_accept_headers_for_atom()
    {
        $response = $this->get('/api/opensearch/contacts?q=test', [
            'Accept' => 'application/atom+xml',
        ]);

        // Should return Atom error because API key is not configured, but formatted as Atom XML
        $response->assertStatus(503);
        $response->assertHeader('Content-Type', 'application/atom+xml; charset=UTF-8');
        $this->assertStringContainsString('<error>', $response->getContent());
        $this->assertStringContainsString('<code>503</code>', $response->getContent());
    }
}
