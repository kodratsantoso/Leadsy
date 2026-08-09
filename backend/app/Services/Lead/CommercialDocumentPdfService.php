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

        if ($documentType === 'quotation') {
            $doc = LeadQuotation::with(['lead.contacts', 'items.product', 'bankAccount', 'createdBy', 'approvedBy'])->findOrFail($documentId);
            $docNumber = $doc->quotation_number;
            $docDate = $doc->quotation_date ? $doc->quotation_date->format('d F Y') : '-';
            $validUntil = $doc->valid_until ? $doc->valid_until->format('d F Y') : '-';
            $soDate = null;
            $items = $doc->items;
            $termsConditions = $doc->terms_conditions;
        } elseif ($documentType === 'sales_order') {
            $doc = LeadSalesOrder::with(['lead.contacts', 'items.product', 'bankAccount', 'createdBy', 'confirmedBy'])->findOrFail($documentId);
            $docNumber = $doc->sales_order_number;
            $docDate = $doc->order_date ? $doc->order_date->format('d F Y') : '-';
            $validUntil = $doc->contract_end_date ? $doc->contract_end_date->format('d F Y') : '-';
            $soDate = $doc->order_date ? $doc->order_date->format('d F Y') : '-';
            $items = $doc->items;
            $termsConditions = $doc->terms_conditions;
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

        // 5. Structure data for PDF view
        $data = [
            'documentType' => $documentType,
            'documentTitle' => $documentType === 'quotation' ? 'QUOTATION' : 'SALES ORDER',
            'documentNumber' => $docNumber,
            'docDate' => $docDate,
            'soDate' => $soDate,
            'validUntil' => $validUntil,
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
            'total' => $doc->total_amount,
            'wht' => $doc->total_withholding_tax,
            'productLogo' => $productLogoPath ? Storage::disk('public')->path($productLogoPath) : null,
            'issuerLogo' => $tenant->logo_path ? Storage::disk('public')->path($tenant->logo_path) : null,
            'issuerSignatoryImage' => $tenant->signatory_image_path ? Storage::disk('public')->path($tenant->signatory_image_path) : null,
            'bankAccount' => $bankAccount,
            'terms' => $resolvedTerms,
        ];

        // 6. Generate and save PDF
        $pdf = Pdf::loadView('pdf.commercial-document', $data);
        
        $safeCustomerName = Str::slug($data['customerName']);
        $safeFilename = ($documentType === 'quotation' ? 'Quotation' : 'SalesOrder') . "-{$docNumber}-{$safeCustomerName}.pdf";
        $path = 'commercial_documents/' . $doc->id . '/' . $safeFilename;
        
        Storage::disk('public')->put($path, $pdf->output());

        // Update document's pdf_url in DB
        $url = Storage::disk('public')->url($path);
        $doc->update(['pdf_url' => $url]);

        return [
            'path' => $path,
            'url' => $url,
            'filename' => $safeFilename,
        ];
    }
}
