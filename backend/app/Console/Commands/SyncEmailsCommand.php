<?php

namespace App\Console\Commands;

use App\Services\Integrations\EmailSyncService;
use Illuminate\Console\Command;

class SyncEmailsCommand extends Command
{
    protected $signature = 'email:sync {--tenant= : Optional tenant ID} {--limit=25 : Maximum emails to fetch}';
    protected $description = 'Sync inbound emails from configured IMAP mailbox into Omnichannel Inbox';

    public function handle(): int
    {
        $tenantId = $this->option('tenant') ? (int) $this->option('tenant') : null;
        $limit = (int) $this->option('limit');

        $this->info("Starting email sync for tenant: " . ($tenantId ?? 'All / Default'));

        $service = new EmailSyncService($tenantId);
        $result = $service->sync($limit);

        if ($result['success']) {
            $this->info($result['message']);
            return Command::SUCCESS;
        }

        $this->error($result['message']);
        return Command::FAILURE;
    }
}
