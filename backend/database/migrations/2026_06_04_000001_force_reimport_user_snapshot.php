<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const SNAPSHOT_FILE = 'leadsy_deploy_data_2026_05_30.sql';

    public function up(): void
    {
        // Import database snapshot if IMPORT_LEADSY_DB_SNAPSHOT is set to true in Coolify/environment variables
        if (! $this->enabled('IMPORT_LEADSY_DB_SNAPSHOT')) {
            return;
        }

        ini_set('memory_limit', '1024M');

        if (DB::getDriverName() !== 'pgsql') {
            throw new RuntimeException('The Leadsy database snapshot importer only supports PostgreSQL.');
        }

        $snapshotPath = database_path('snapshots/'.self::SNAPSHOT_FILE);
        if (! is_file($snapshotPath)) {
            throw new RuntimeException("Leadsy database snapshot not found at {$snapshotPath}.");
        }

        $sql = $this->readSnapshotSql($snapshotPath);
        $tables = $this->snapshotTables($sql);

        DB::transaction(function () use ($sql, $tables): void {
            if ($tables !== []) {
                DB::statement('TRUNCATE TABLE '.$this->qualifiedTableList($tables).' RESTART IDENTITY CASCADE');
            }

            DB::unprepared($sql);
            DB::statement('SET search_path TO public');
        });
    }

    public function down(): void
    {
    }

    private function readSnapshotSql(string $snapshotPath): string
    {
        $sql = file_get_contents($snapshotPath);

        if ($sql === false) {
            throw new RuntimeException("Unable to read Leadsy database snapshot at {$snapshotPath}.");
        }

        // pg_dump adds psql-only meta commands that PDO cannot execute.
        return (string) preg_replace('/^\\\\.*$/m', '', $sql);
    }

    private function snapshotTables(string $sql): array
    {
        preg_match_all('/ALTER TABLE public\\.([a-zA-Z0-9_]+) DISABLE TRIGGER ALL;/', $sql, $matches);

        return collect($matches[1] ?? [])
            ->unique()
            ->values()
            ->all();
    }

    private function qualifiedTableList(array $tables): string
    {
        return collect($tables)
            ->map(fn (string $table): string => '"public"."'.str_replace('"', '""', $table).'"')
            ->implode(', ');
    }

    private function enabled(string $key): bool
    {
        return filter_var(env($key, false), FILTER_VALIDATE_BOOLEAN);
    }
};
