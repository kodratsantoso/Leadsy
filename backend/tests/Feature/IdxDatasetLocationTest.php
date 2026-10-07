<?php

namespace Tests\Feature;

use App\Services\Idx\IdxCompanyCacheService;
use Tests\TestCase;

/**
 * The IDX dataset has to live somewhere the running container can actually read.
 *
 * It shipped under storage/app/data/idx, and the production pod mounts a volume over
 * /var/www/html/storage while its init container creates only the four framework
 * directories. The file was in the image the whole time — .dockerignore never excluded
 * it — but the mount hid it, so refreshCacheFromLocal() found nothing, the cache stayed
 * empty, and the page reported a failure it could not explain.
 */
class IdxDatasetLocationTest extends TestCase
{
    public function test_the_shipped_dataset_is_found(): void
    {
        $path = app(IdxCompanyCacheService::class)->datasetPath();

        $this->assertNotNull($path, 'The IDX dataset ships with the app and must be readable.');
        $this->assertIsReadable($path);
    }

    public function test_the_dataset_does_not_live_under_the_mounted_storage_directory(): void
    {
        $path = app(IdxCompanyCacheService::class)->datasetPath();

        $this->assertStringNotContainsString(
            'storage/app/data/idx',
            $path,
            'storage/ is replaced by a volume in production, so a dataset kept there is invisible at runtime.'
        );
    }

    public function test_the_dataset_parses_and_carries_the_fields_the_importer_reads(): void
    {
        $path = app(IdxCompanyCacheService::class)->datasetPath();
        $json = json_decode((string) file_get_contents($path), true);

        $this->assertIsArray($json['data'] ?? null, 'The importer reads $json["data"].');
        $this->assertNotEmpty($json['data']);

        $first = $json['data'][0];
        foreach (['KodeEmiten', 'NamaEmiten'] as $key) {
            $this->assertArrayHasKey($key, $first);
        }
    }
}
