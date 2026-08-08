<?php

namespace App\Services\Lark;

use App\Models\LarkIntegration;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LarkDriveService extends LarkService
{
    /**
     * Look up Lark User ID by Email using batch_get_id endpoint
     */
    public function getLarkUserIdByEmail(string $email): ?string
    {
        try {
            $response = $this->request('POST', '/contact/v3/users/batch_get_id', [
                'emails' => [$email]
            ]);

            $userList = $response['data']['user_list'] ?? [];
            foreach ($userList as $u) {
                if (($u['email'] ?? null) === $email && !empty($u['user_id'])) {
                    return $u['user_id'];
                }
            }
        } catch (Exception $e) {
            Log::warning('Lark user ID lookup failed', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
        }

        return null;
    }

    /**
     * Get or create folder for a Lead inside the parent Shared Folder
     */
    public function getOrCreateLeadFolder(string $parentFolderToken, string $leadFolderName): string
    {
        // 1. List files in parent folder to check if it already exists
        try {
            $listResponse = $this->request('GET', "/drive/v1/files", [], [
                'folder_token' => $parentFolderToken,
                'page_size' => 100
            ]);

            $files = $listResponse['data']['files'] ?? [];
            foreach ($files as $file) {
                if ($file['name'] === $leadFolderName && $file['type'] === 'folder') {
                    return $file['token'];
                }
            }
        } catch (Exception $e) {
            Log::warning('Failed to list files in Lark parent folder, attempting creation directly', [
                'parent_token' => $parentFolderToken,
                'error' => $e->getMessage()
            ]);
        }

        // 2. Create the folder if not found
        $createResponse = $this->request('POST', "/drive/v1/files/create_folder", [
            'name' => $leadFolderName,
            'folder_token' => $parentFolderToken
        ]);

        $token = $createResponse['token'] ?? $createResponse['data']['token'] ?? null;
        if (empty($token)) {
            throw new Exception('Failed to create Lark Drive folder for lead: ' . json_encode($createResponse));
        }

        return $token;
    }

    /**
     * Create a native Lark Doc inside a specific folder
     */
    public function createDoc(string $folderToken, string $title): array
    {
        $response = $this->request('POST', '/docx/v1/documents', [
            'folder_token' => $folderToken,
            'title' => $title
        ]);

        $docId = $response['document']['document_id'] ?? $response['data']['document']['document_id'] ?? null;
        if (empty($docId)) {
            throw new Exception('Failed to create Lark Doc: ' . json_encode($response));
        }
        
        // Build web link
        // Lark Docs URLs usually follow: https://domain.larksuite.com/docx/{document_id}
        // We can extract base domain or use default
        $baseUrl = parse_url($this->baseUrl, PHP_URL_HOST);
        $domain = str_replace('open.', '', $baseUrl); // e.g. open.larksuite.com -> larksuite.com
        $docUrl = "https://{$domain}/docx/{$docId}";

        return [
            'document_id' => $docId,
            'url' => $docUrl
        ];
    }

    /**
     * Add blocks of content into the native Lark Doc
     */
    public function writeDocContent(string $documentId, array $sections): void
    {
        // Fetch document's root block ID first (to append content to it)
        $docInfo = $this->request('GET', "/docx/v1/documents/{$documentId}");
        $rootBlockId = $docInfo['data']['document']['document_id'] ?? $documentId;

        $children = [];

        foreach ($sections as $section) {
            if (empty($section['title']) && empty($section['content'])) {
                continue;
            }

            $isExecSummary = (stripos($section['title'], 'Executive Summary') !== false);

            if (!empty($section['title'])) {
                $children[] = [
                    'block_type' => 3, // Heading 1
                    'heading1' => [
                        'style' => [
                            'align' => 1
                        ],
                        'elements' => [
                            [
                                'type' => 'text',
                                'text_run' => [
                                    'content' => $section['title'],
                                    'text_element_style' => [
                                        'bold' => true,
                                        'text_color' => 4 // Dark blue/indigo header color in Lark
                                    ]
                                ]
                            ]
                        ]
                    ]
                ];
            }

            if (!empty($section['content'])) {
                $contentLines = explode("\n", $section['content']);
                foreach ($contentLines as $line) {
                    $trimmed = trim($line);
                    if ($trimmed === '') {
                        continue;
                    }

                    if ($isExecSummary) {
                        // Highlight Executive Summary inside a styled Quote block (type 17)
                        $children[] = [
                            'block_type' => 17, // Quote
                            'quote' => [
                                'elements' => [
                                    [
                                        'type' => 'text',
                                        'text_run' => [
                                            'content' => $trimmed,
                                            'text_element_style' => [
                                                'italic' => true
                                            ]
                                        ]
                                    ]
                                ]
                            ]
                        ];
                    } else if (str_starts_with($trimmed, '-') || str_starts_with($trimmed, '*')) {
                        // Check if it looks like a list item
                        $children[] = [
                            'block_type' => 12, // Bullet list
                            'bullet' => [
                                'elements' => [
                                    [
                                        'type' => 'text',
                                        'text_run' => [
                                            'content' => ltrim(substr($trimmed, 1))
                                        ]
                                    ]
                                ]
                            ]
                        ];
                    } else {
                        $children[] = [
                            'block_type' => 2, // Text paragraph
                            'text' => [
                                'style' => [
                                    'align' => 1
                                ],
                                'elements' => [
                                    [
                                        'type' => 'text',
                                        'text_run' => [
                                            'content' => $trimmed
                                        ]
                                    ]
                                ]
                            ]
                        ];
                    }
                }
            }

            // Divider block for visual polish
            $children[] = [
                'block_type' => 22, // Divider
                'divider' => new \stdClass()
            ];
        }

        if (empty($children)) {
            return;
        }

        // Chunk children blocks into batches of max 50 to satisfy Lark API constraints
        $chunks = array_chunk($children, 50);
        foreach ($chunks as $chunk) {
            $this->request('POST', "/docx/v1/documents/{$documentId}/blocks/{$rootBlockId}/children", [
                'children' => $chunk,
                'index' => -1
            ]);
        }
    }
}
