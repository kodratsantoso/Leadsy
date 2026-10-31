<?php

namespace App\Services\Lead;

use App\Models\LeadQuotation;
use App\Models\LeadSalesOrder;
use App\Models\Tenant;
use App\Models\CompanyBankAccount;
use App\Models\Product;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Exception;

class CommercialDocumentPdfService
{
    /**
     * Generate PDF for a Quotation or Sales Order.
     *
     * @param string $documentType ('quotation'|'sales_order')
     * @param int $documentId
     * @return array
     * @throws Exception
     */
    public function generatePdf(string $documentType, int $documentId): array
    {
        $tenant = Tenant::first(); // Single tenant / main workspace
        if (!$tenant) {
            throw new Exception("Tenant workspace settings not found.");
        }

        $quotationRef = null;
        $contractPeriod = null;
        $customerPoNumber = null;
        $spkNumber = null;

        if ($documentType === 'quotation') {
            $doc = LeadQuotation::with(['lead.contacts', 'items.product'])->findOrFail($documentId);
            if ($doc->bank_account_id) {
                $doc->load('bankAccount');
            }
            if ($doc->sales_owner_id) {
                $doc->load('salesOwner');
            }
            $docNumber = $doc->quotation_number;
            $docDate = $doc->quotation_date ? $doc->quotation_date->format('d F Y') : '-';
            $validUntil = $doc->valid_until ? $doc->valid_until->format('d F Y') : '-';
            $soDate = null;
            $items = $doc->items;
            $termsConditions = $doc->terms_conditions;
        } elseif ($documentType === 'sales_order') {
            $doc = LeadSalesOrder::with(['lead.contacts', 'items.product'])->findOrFail($documentId);
            if ($doc->bank_account_id) {
                $doc->load('bankAccount');
            }
            if ($doc->sales_owner_id) {
                $doc->load('salesOwner');
            }
            if ($doc->quotation_id) {
                $doc->load('quotation');
                $quotationRef = $doc->quotation ? $doc->quotation->quotation_number : null;
            }
            $docNumber = $doc->sales_order_number;
            $docDate = $doc->order_date ? $doc->order_date->format('d F Y') : '-';
            $validUntil = $doc->contract_end_date ? $doc->contract_end_date->format('d F Y') : '-';
            $soDate = $doc->order_date ? $doc->order_date->format('d F Y') : '-';
            $items = $doc->items;
            $termsConditions = $doc->terms_conditions;
            $customerPoNumber = $doc->customer_po_number ?: null;
            $spkNumber = $doc->spk_number ?: null;

            // Resolve contract period
            $contractStart = $doc->contract_start_date ? $doc->contract_start_date->format('d F Y') : null;
            $contractEnd = $doc->contract_end_date ? $doc->contract_end_date->format('d F Y') : null;
            if (!$contractStart || !$contractEnd) {
                $firstWithDates = $items->first(function ($it) {
                    return ($it->service_start_date && $it->service_end_date) || ($it->start_date && $it->end_date);
                });
                if ($firstWithDates) {
                    $sDate = $firstWithDates->service_start_date ?: $firstWithDates->start_date;
                    $eDate = $firstWithDates->service_end_date ?: $firstWithDates->end_date;
                    if ($sDate && $eDate) {
                        $contractStart = $sDate->format('d F Y');
                        $contractEnd = $eDate->format('d F Y');
                    }
                }
            }
            if ($contractStart && $contractEnd) {
                $contractPeriod = "{$contractStart} – {$contractEnd}";
            }
        } else {
            throw new Exception("Invalid document type: {$documentType}");
        }

        // 1. Resolve Product Logo and Product Terms
        // Find if all items belong to the same product.
        $productIds = $items->pluck('product_id')->filter()->unique();
        $productLogoPath = null;
        $productTerms = null;

        if ($productIds->count() === 1) {
            $singleProduct = Product::find($productIds->first());
            if ($singleProduct) {
                $productLogoPath = $singleProduct->logo_path;
                if ($documentType === 'quotation') {
                    $productTerms = $singleProduct->quotation_terms_conditions ?: $singleProduct->default_terms_conditions;
                } else {
                    $productTerms = $singleProduct->sales_order_terms_conditions ?: $singleProduct->default_terms_conditions;
                }
            }
        }

        // 2. Resolve Bank Account
        $bankAccount = $doc->bankAccount;
        if (!$bankAccount) {
            $bankAccount = CompanyBankAccount::where('tenant_id', $tenant->id)
                ->where('is_default', true)
                ->where('is_active', true)
                ->first()
                ?? CompanyBankAccount::where('tenant_id', $tenant->id)
                ->where('is_active', true)
                ->first();
        }

        // 3. Resolve Customer PIC / Contact
        $customerPicName = 'Not specified';
        $customerPicPosition = '';
        if ($doc->contact_id) {
            $contact = $doc->lead->contacts->where('id', $doc->contact_id)->first();
            if ($contact) {
                $customerPicName = $contact->name;
                $customerPicPosition = $contact->title;
            }
        } else {
            $primaryContact = $doc->lead->contacts->where('is_primary', true)->first()
                ?? $doc->lead->contacts->first();
            if ($primaryContact) {
                $customerPicName = $primaryContact->name;
                $customerPicPosition = $primaryContact->title;
            }
        }

        // 4. Resolve Terms resolution logic
        // Use document-level override terms first, then fallback to product-specific terms, then tenant defaults if available
        $resolvedTerms = $termsConditions ?: $productTerms ?: '';

        if ($resolvedTerms) {
            // Resolve duration & dates from the first subscription line item
            $firstItem = $items->first(function ($item) {
                return $item->duration_value && $item->duration_value > 0;
            });
            $durationStr = '';
            if ($firstItem) {
                $unit = $firstItem->duration_value > 1 ? Str::plural($firstItem->duration_unit) : $firstItem->duration_unit;
                $durationStr = $firstItem->duration_value . ' ' . ucfirst($unit);
                $sDate = $firstItem->service_start_date ?: $firstItem->start_date;
                $eDate = $firstItem->service_end_date ?: $firstItem->end_date;
                if ($sDate && $eDate) {
                    $startDateFormatted = $sDate->format('d F Y');
                    $endDateFormatted = $eDate->format('d F Y');
                    $durationStr .= " ({$startDateFormatted} – {$endDateFormatted})";
                }
            }
            
            if ($durationStr) {
                // Replace any line containing "Length of subscriptions" with the dynamic duration
                $resolvedTerms = preg_replace(
                    '/Length of subscriptions:[^\r\n]*/i',
                    'Length of subscriptions: ' . $durationStr,
                    $resolvedTerms
                );
            }
            
            // Resolve Payment Terms
            $paymentTermsVal = $doc->payment_terms ?: 'Full Payment';
            if ($doc->billing_frequency && strtolower($doc->billing_frequency) !== 'one_time') {
                $paymentTermsVal .= ' (' . ucfirst($doc->billing_frequency) . ')';
            }
            // Replace any line containing "Payments will be made using the following methods" with the dynamic payment terms
            $resolvedTerms = preg_replace(
                '/Payments will be made using the following methods:[^\r\n]*/i',
                'Payments will be made using the following methods: ' . $paymentTermsVal,
                $resolvedTerms
            );
        }

        // 5. Resolve Logos & Signatures as base64 to avoid path/chroot issues in DomPDF
        // Check if GD extension is available for image processing in DomPDF
        $hasGd = extension_loaded('gd') && function_exists('imagecreatetruecolor');

        $issuerLogoData = $hasGd ? $this->imageToBase64($tenant->logo_path) : null;
        $productLogoData = $hasGd ? $this->imageToBase64($productLogoPath) : null;

        $signatoryImagePath = ($doc->salesOwner && $doc->salesOwner->signature_path)
            ? $doc->salesOwner->signature_path
            : ($tenant->signatory_image_path ?: null);
        $issuerSignatoryImageData = $hasGd ? $this->imageToBase64($signatoryImagePath) : null;

        $issuerSignatoryName = ($doc->salesOwner && $doc->salesOwner->name)
            ? $doc->salesOwner->name
            : ($tenant->signatory_name ?: 'Authorized Representative');

        $issuerSignatoryPosition = ($doc->salesOwner && $doc->salesOwner->title)
            ? $doc->salesOwner->title
            : ($tenant->signatory_position ?: 'Authorized Signatory');

        // 6. Structure data for PDF view
        $data = [
            'documentType' => $documentType,
            'documentTitle' => $documentType === 'quotation' ? 'QUOTATION' : 'SALES ORDER',
            'documentNumber' => $docNumber,
            'docDate' => $docDate,
            'soDate' => $soDate,
            'validUntil' => $validUntil,
            'quotationRef' => $quotationRef,
            'contractPeriod' => $contractPeriod,
            'customerPoNumber' => $customerPoNumber,
            'spkNumber' => $spkNumber,
            'tenant' => $tenant,
            'customerName' => $doc->customer_name ?: ($doc->lead ? $doc->lead->company_name : '-'),
            'customerAddress' => $doc->lead ? $doc->lead->address : '-',
            'customerPicName' => $customerPicName,
            'customerPicPosition' => $customerPicPosition,
            'items' => $items,
            'currency' => $doc->currency ?: 'IDR',
            'subtotal' => $doc->subtotal_amount,
            'tax' => $doc->tax_amount,
            'discount' => $doc->discount_amount,
            'headerDiscount' => $doc->header_discount_amount ?: 0,
            'lineDiscount' => $doc->total_line_discount ?: 0,
            'total' => $doc->total_amount,
            'wht' => $doc->total_withholding_tax,
            'productLogo' => $productLogoData,
            'issuerLogo' => $issuerLogoData,
            'issuerSignatoryImage' => $issuerSignatoryImageData,
            'issuerSignatoryName' => $issuerSignatoryName,
            'issuerSignatoryPosition' => $issuerSignatoryPosition,
            'bankAccount' => $bankAccount,
            'terms' => $resolvedTerms,
        ];

        // 7. Generate and save PDF
        $pdf = Pdf::loadView('pdf.commercial-document', $data);
        
        $safeCustomerName = Str::slug($data['customerName']);
        $safeFilename = ($documentType === 'quotation' ? 'Quotation' : 'SalesOrder') . "-{$docNumber}-{$safeCustomerName}.pdf";
        $path = 'commercial_documents/' . $doc->id . '/' . $safeFilename;
        
        Storage::disk('public')->put($path, $pdf->output());

        // Update document's pdf_url in DB with relative URL for robust domain/proxy handling
        $relativeUrl = '/storage/' . $path;
        $url = Storage::disk('public')->url($path);
        $doc->update(['pdf_url' => $relativeUrl]);

        return [
            'path' => $path,
            'url' => $url,
            'relative_url' => $relativeUrl,
            'filename' => $safeFilename,
        ];
    }

    /**
     * Convert relative storage file path to base64 Data URI for DomPDF
     */
    private function imageToBase64(?string $relativePath): ?string
    {
        if (!$relativePath || !Storage::disk('public')->exists($relativePath)) {
            return null;
        }

        try {
            $mime = Storage::disk('public')->mimeType($relativePath) ?: 'image/png';
            $data = Storage::disk('public')->get($relativePath);
            return 'data:' . $mime . ';base64,' . base64_encode($data);
        } catch (\Throwable $e) {
            return null;
        }
    }
}
