<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductLogoUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed', ['--class' => 'ProductionSeeder']);
    }

    public function test_can_upload_and_delete_product_logo(): void
    {
        Storage::fake('public');

        $user = $this->makeUser('super_admin');

        $product = Product::create([
            'name' => 'Enterprise Suite',
            'status' => 'active',
        ]);

        $file = UploadedFile::fake()->image('product-logo.png', 200, 200);

        $response = $this->actingAs($user)->postJson("/api/products/{$product->id}/logo", [
            'logo' => $file,
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'logo_url',
            'data',
            'message',
        ]);

        $product->refresh();
        $this->assertNotNull($product->logo_path);
        Storage::disk('public')->assertExists($product->logo_path);

        // Test delete logo
        $deleteResponse = $this->actingAs($user)->deleteJson("/api/products/{$product->id}/logo");
        $deleteResponse->assertStatus(200);

        $product->refresh();
        $this->assertNull($product->logo_path);
    }

    private function makeUser(string $roleName): User
    {
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'test-workspace'],
            ['name' => 'Test Workspace', 'status' => 'active']
        );

        $role = Role::firstOrCreate(
            ['name' => $roleName],
            ['display_name' => ucfirst(str_replace('_', ' ', $roleName))]
        );

        return User::create([
            'name' => ucfirst($roleName),
            'email' => $roleName.'-'.uniqid().'@example.com',
            'password' => 'password123',
            'role_id' => $role->id,
            'tenant_id' => $tenant->id,
            'is_active' => true,
        ]);
    }
}
