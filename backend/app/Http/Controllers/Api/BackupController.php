<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BackupController extends Controller
{
    private function getPgDumpPath(): string
    {
        if (File::exists('/opt/homebrew/bin/pg_dump')) {
            return '/opt/homebrew/bin/pg_dump';
        }
        return 'pg_dump';
    }

    public function index(): JsonResponse
    {
        $backupDir = base_path('backups');
        if (!File::exists($backupDir)) {
            File::makeDirectory($backupDir, 0755, true);
        }

        $files = File::files($backupDir);
        $backups = [];

        foreach ($files as $file) {
            if ($file->getExtension() === 'sql' || $file->getExtension() === 'gz') {
                $backups[] = [
                    'filename' => $file->getFilename(),
                    'size' => $this->formatBytes($file->getSize()),
                    'raw_size' => $file->getSize(),
                    'created_at' => date('c', $file->getMTime()),
                ];
            }
        }

        // Sort backups by modified time desc
        usort($backups, function ($a, $b) {
            return strcmp($b['created_at'], $a['created_at']);
        });

        return response()->json([
            'status' => 'success',
            'data' => $backups
        ]);
    }

    public function backup(Request $request): JsonResponse
    {
        $host = config('database.connections.pgsql.host', '127.0.0.1');
        $port = config('database.connections.pgsql.port', '5432');
        $database = config('database.connections.pgsql.database', 'leads');
        $username = config('database.connections.pgsql.username', 'leads');
        $password = config('database.connections.pgsql.password', 'leads');

        $timestamp = now()->format('Y-m-d_H-i-s');
        $filename = "backup_leadsy_{$timestamp}.sql";
        $backupDir = base_path('backups');
        
        if (!File::exists($backupDir)) {
            File::makeDirectory($backupDir, 0755, true);
        }

        $filePath = $backupDir . '/' . $filename;
        $pgDump = $this->getPgDumpPath();

        $excludedTables = [
            'public.cache',
            'public.cache_locks',
            'public.failed_jobs',
            'public.job_batches',
            'public.jobs',
            'public.sessions',
            'public.password_reset_tokens',
            'public.personal_access_tokens',
            'public.email_verification_otps',
            'public.ai_connection_tests',
            'public.ai_requests',
            'public.integration_configs',
            'public.migrations'
        ];

        $excludeArgs = '';
        foreach ($excludedTables as $table) {
            $excludeArgs .= ' --exclude-table-data=' . escapeshellarg($table);
        }

        $cmd = sprintf(
            '%s --host=%s --port=%s --username=%s --dbname=%s --data-only --column-inserts --on-conflict-do-nothing --no-owner --no-privileges --file=%s%s',
            $pgDump,
            escapeshellarg($host),
            escapeshellarg($port),
            escapeshellarg($username),
            escapeshellarg($database),
            escapeshellarg($filePath),
            $excludeArgs
        );

        $result = Process::withEnvironment(['PGPASSWORD' => $password])
            ->run($cmd);

        if (!$result->successful()) {
            // Cleanup incomplete file if created
            if (File::exists($filePath)) {
                File::delete($filePath);
            }
            return response()->json([
                'status' => 'error',
                'message' => 'Backup failed: ' . $result->errorOutput()
            ], 500);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Backup created successfully',
            'data' => [
                'filename' => $filename,
                'size' => $this->formatBytes(filesize($filePath)),
                'created_at' => date('c', filemtime($filePath))
            ]
        ]);
    }

    public function download(string $filename): BinaryFileResponse|JsonResponse
    {
        $filename = basename($filename);
        $backupDir = base_path('backups');
        $filePath = realpath($backupDir . '/' . $filename);

        if (!$filePath || !str_starts_with($filePath, realpath($backupDir)) || !File::exists($filePath)) {
            return response()->json([
                'status' => 'error',
                'message' => 'File not found or access denied.'
            ], 404);
        }

        return response()->download($filePath);
    }

    public function destroy(string $filename): JsonResponse
    {
        $filename = basename($filename);
        $backupDir = base_path('backups');
        $filePath = realpath($backupDir . '/' . $filename);

        if (!$filePath || !str_starts_with($filePath, realpath($backupDir)) || !File::exists($filePath)) {
            return response()->json([
                'status' => 'error',
                'message' => 'File not found or access denied.'
            ], 404);
        }

        File::delete($filePath);

        return response()->json([
            'status' => 'success',
            'message' => 'Backup deleted successfully'
        ]);
    }

    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);

        return round($bytes, $precision) . ' ' . $units[$pow];
    }
}
