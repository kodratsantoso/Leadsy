<?php

namespace App\Services\Integrations;

use App\Models\IntegrationConfig;
use App\Models\Lead;
use App\Models\WhatsappContact;
use App\Models\WhatsappConversation;
use App\Models\WhatsappMessage;
use Illuminate\Support\Facades\Log;

class EmailSyncService
{
    protected ?int $tenantId;

    public function __construct(?int $tenantId = null)
    {
        $this->tenantId = $tenantId;
    }

    public function sync(int $limit = 20): array
    {
        $configs = IntegrationConfig::query()
            ->where('category', 'email')
            ->where(function ($q) {
                $q->whereNull('tenant_id');
                if ($this->tenantId !== null) {
                    $q->orWhere('tenant_id', $this->tenantId);
                }
            })
            ->get()
            ->keyBy('key');

        $imapEnabled = ($configs['imap_enabled']->value ?? 'true') === 'true' || ($configs['imap_enabled']->value ?? '') === '1';
        $host = $configs['imap_host']->value ?? 'imap.larksuite.com';
        $port = (int) ($configs['imap_port']->value ?? 993);
        $username = $configs['imap_username']->value ?? '';
        $password = $configs['imap_password']->value ?? '';
        $encryption = $configs['imap_encryption']->value ?? 'ssl';

        if (empty($host) || empty($username) || empty($password)) {
            return [
                'success' => false,
                'message' => 'Konfigurasi IMAP belum lengkap. Pastikan Host, Username, dan Password / App Password telah disimpan di Pengaturan Email.',
                'synced_count' => 0,
            ];
        }

        // Connect via OpenSSL subprocess for resilient SSL/TLS handshake across environments
        $timeout = 15;
        $cmd = "openssl s_client -connect " . escapeshellarg("{$host}:{$port}") . " -crlf -quiet 2>/dev/null";

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open($cmd, $descriptors, $pipes);

        if (!is_resource($process)) {
            return [
                'success' => false,
                'message' => "Gagal membuka koneksi socket SSL ke {$host}:{$port}.",
                'synced_count' => 0,
            ];
        }

        stream_set_timeout($pipes[1], $timeout);
        stream_set_blocking($pipes[1], true);

        // Read server greeting
        $greeting = fgets($pipes[1], 1024);
        if (!$greeting || !str_contains($greeting, '* OK')) {
            fclose($pipes[0]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            proc_close($process);

            return [
                'success' => false,
                'message' => "Server {$host} tidak merespons dengan salam protokol IMAP yang valid: " . trim($greeting ?: 'Timeout'),
                'synced_count' => 0,
            ];
        }

        $sendCommand = function (string $tag, string $command) use ($pipes): string {
            fwrite($pipes[0], "{$tag} {$command}\r\n");
            $response = '';
            while ($line = fgets($pipes[1], 4096)) {
                $response .= $line;
                if (str_starts_with($line, "{$tag} OK") || str_starts_with($line, "{$tag} NO") || str_starts_with($line, "{$tag} BAD")) {
                    break;
                }
            }
            return $response;
        };

        // 1. Authenticate (LOGIN)
        $loginRes = $sendCommand('A001', 'LOGIN ' . escapeshellarg($username) . ' ' . escapeshellarg($password));
        if (!str_contains($loginRes, 'A001 OK')) {
            $sendCommand('A999', 'LOGOUT');
            fclose($pipes[0]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            proc_close($process);

            $cleanRes = trim(preg_replace('/\s+/', ' ', $loginRes));
            $isLark = str_contains(strtolower($host), 'lark');
            $hint = $isLark
                ? ' Untuk akun Lark Suite, pastikan mengaktifkan opsi "Third-party email client" di pengaturan Lark dan gunakan App Password/Client Authorization Code khusus (bukan password login SSO utama).'
                : ' Pastikan username dan App Password email Anda sudah sesuai.';

            return [
                'success' => false,
                'message' => "Otentikasi IMAP gagal: {$cleanRes}.{$hint}",
                'synced_count' => 0,
            ];
        }

        // 2. Select INBOX
        $selectRes = $sendCommand('A002', 'SELECT "INBOX"');
        if (!str_contains($selectRes, 'A002 OK')) {
            $sendCommand('A999', 'LOGOUT');
            fclose($pipes[0]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            proc_close($process);

            return [
                'success' => false,
                'message' => 'Gagal membuka folder INBOX: ' . trim($selectRes),
                'synced_count' => 0,
            ];
        }

        // 3. Search messages (Try UNSEEN first, fallback to ALL latest)
        $searchRes = $sendCommand('A003', 'SEARCH UNSEEN');
        $msgIds = [];
        if (preg_match('/\* SEARCH (.*)/', $searchRes, $matches)) {
            $msgIds = array_filter(explode(' ', trim($matches[1])));
        }

        if (empty($msgIds)) {
            $searchAll = $sendCommand('A004', 'SEARCH ALL');
            if (preg_match('/\* SEARCH (.*)/', $searchAll, $matches)) {
                $allIds = array_filter(explode(' ', trim($matches[1])));
                // Take latest $limit messages
                $msgIds = array_slice($allIds, -$limit);
            }
        } else {
            $msgIds = array_slice($msgIds, -$limit);
        }

        $syncedCount = 0;
        $details = [];

        // 4. Fetch headers and bodies for messages
        foreach ($msgIds as $id) {
            $id = trim($id);
            if (!is_numeric($id)) continue;

            $fetchRes = $sendCommand("F{$id}", "FETCH {$id} (BODY[HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)] BODY[TEXT])");

            // Extract From
            $fromName = '';
            $fromEmail = '';
            if (preg_match('/^From:\s*(.*)$/mi', $fetchRes, $fromMatches)) {
                $rawFrom = trim($fromMatches[1]);
                if (preg_match('/(.*)<([^>]+)>/', $rawFrom, $parts)) {
                    $fromName = trim(trim($parts[1]), '"\'');
                    $fromEmail = strtolower(trim($parts[2]));
                } else {
                    $fromEmail = strtolower(trim($rawFrom));
                    $fromName = $fromEmail;
                }
            }

            // Extract Subject
            $subject = 'Pesan Email Inbound';
            if (preg_match('/^Subject:\s*(.*)$/mi', $fetchRes, $subMatches)) {
                $subject = trim($subMatches[1]);
                if (str_starts_with($subject, '=?')) {
                    $subject = mb_decode_mimeheader($subject);
                }
            }

            // Extract Message-ID
            $msgUid = uniqid("imap_msg_{$id}_");
            if (preg_match('/^Message-ID:\s*(.*)$/mi', $fetchRes, $midMatches)) {
                $msgUid = trim($midMatches[1]);
            }

            // Extract Date
            $sentAt = now();
            if (preg_match('/^Date:\s*(.*)$/mi', $fetchRes, $dateMatches)) {
                try {
                    $sentAt = \Carbon\Carbon::parse(trim($dateMatches[1]));
                } catch (\Throwable) {
                    $sentAt = now();
                }
            }

            // Extract Body Text
            $body = '';
            if (preg_match('/BODY\[TEXT\]\s*\{[0-9]+\}\r?\n([\s\S]*?)\r?\nF' . $id . ' OK/i', $fetchRes, $bodyMatches)) {
                $body = trim(strip_tags($bodyMatches[1]));
            }
            if (empty($body)) {
                $body = "Subjek: {$subject}\n(Konten email diterima via IMAP dari {$fromEmail})";
            }

            if (!empty($fromEmail) && filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
                // Match with CRM Lead if exists
                $lead = Lead::where('email', $fromEmail)->first();

                $contact = WhatsappContact::firstOrCreate(
                    [
                        'phone_number' => $fromEmail,
                        'user_id' => 1,
                    ],
                    [
                        'name' => $lead?->company_name ?: ($fromName ?: $fromEmail),
                        'normalized_phone_number' => $fromEmail,
                        'lead_id' => $lead?->id,
                        'is_relevant' => true,
                        'relevance_reason' => 'email_inquiry',
                        'tenant_id' => $this->tenantId ?: $lead?->tenant_id,
                    ]
                );

                if ($lead && !$contact->lead_id) {
                    $contact->update(['lead_id' => $lead->id, 'name' => $lead->company_name]);
                }

                $conversation = WhatsappConversation::firstOrCreate(
                    [
                        'external_chat_id' => $fromEmail,
                        'platform' => 'email',
                    ],
                    [
                        'contact_id' => $contact->id,
                        'user_id' => 1,
                        'sync_status' => 'active',
                        'relevance_status' => 'high',
                        'approved_for_sync' => true,
                        'platform' => 'email',
                        'tenant_id' => $this->tenantId ?: $contact->tenant_id,
                        'last_message_at' => $sentAt,
                    ]
                );

                // Prevent duplicates using external_message_id
                $exists = WhatsappMessage::where('external_message_id', $msgUid)->exists();
                if (!$exists) {
                    WhatsappMessage::create([
                        'conversation_id' => $conversation->id,
                        'external_message_id' => $msgUid,
                        'direction' => 'inbound',
                        'message_type' => 'text',
                        'body' => $body,
                        'sent_at' => $sentAt,
                    ]);

                    $conversation->update(['last_message_at' => $sentAt]);
                    $syncedCount++;
                    $details[] = [
                        'from' => $fromEmail,
                        'subject' => $subject,
                        'date' => $sentAt->toIso8601String(),
                    ];
                }
            }
        }

        // 5. Logout & Close
        $sendCommand('A999', 'LOGOUT');
        fclose($pipes[0]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($process);

        // Update last sync timestamp
        IntegrationConfig::updateOrCreate(
            [
                'tenant_id' => $this->tenantId,
                'category' => 'email',
                'key' => 'last_sync_at',
            ],
            [
                'value' => now()->toIso8601String(),
                'is_secret' => false,
                'is_active' => true,
                'value_type' => 'string',
            ]
        );

        return [
            'success' => true,
            'message' => $syncedCount > 0
                ? "Berhasil mensinkronkan {$syncedCount} pesan email baru ke Omnichannel Inbox."
                : "Sinkronisasi selesai. Tidak ada email baru atau semua pesan terkini sudah tercatat.",
            'synced_count' => $syncedCount,
            'details' => $details,
            'last_sync_at' => now()->toIso8601String(),
        ];
    }
}
