<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Lead;
use App\Models\LeadContact;
use App\Models\LeadQuotation;
use App\Models\IcpProfile;
use App\Models\PsEstimation;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

class GlobalSearchController extends Controller
{
    public function search(Request $request)
    {
        $query = $request->input('query');

        if (empty($query) || strlen($query) < 2) {
            return response()->json([]);
        }

        $user = $request->user();
        $results = [];

        // Search Leads — scoped to what this user can see, same rule LeadController uses.
        if ($user?->hasPermission('leads.view')) {
            $leads = Lead::visibleTo($user)
                ->with('industry:id,name')
                ->where('company_name', 'ilike', '%' . $query . '%')
                ->select('id', 'company_name', 'industry_id')
                ->limit(5)
                ->get();

            if ($leads->isNotEmpty()) {
                $results[] = [
                    'group' => 'Leads',
                    'items' => $leads->map(fn ($lead) => [
                        'id' => 'lead-' . $lead->id,
                        'title' => $lead->company_name,
                        'subtitle' => $lead->industry?->name ?? 'Lead',
                        'url' => '/leads/' . $lead->id,
                    ]),
                ];
            }

            // Contacts and Quotations belong to a Lead — scope through the same
            // visibility rule rather than exposing every tenant's contact data.
            $contacts = LeadContact::whereHas('lead', fn ($q) => $q->visibleTo($user))
                ->where(fn ($q) => $q->where('name', 'ilike', '%' . $query . '%')
                    ->orWhere('email', 'ilike', '%' . $query . '%'))
                ->with('lead:id,company_name')
                ->select('id', 'lead_id', 'name', 'email')
                ->limit(5)
                ->get();

            if ($contacts->isNotEmpty()) {
                $results[] = [
                    'group' => 'Contacts',
                    'items' => $contacts->map(fn ($contact) => [
                        'id' => 'contact-' . $contact->id,
                        'title' => $contact->name ?: $contact->email,
                        'subtitle' => $contact->lead?->company_name ?? 'Contact',
                        'url' => '/leads/' . $contact->lead_id,
                    ]),
                ];
            }

            $quotations = LeadQuotation::whereHas('lead', fn ($q) => $q->visibleTo($user))
                ->where(fn ($q) => $q->where('quotation_number', 'ilike', '%' . $query . '%')
                    ->orWhere('customer_name', 'ilike', '%' . $query . '%'))
                ->with('lead:id,company_name')
                ->select('id', 'lead_id', 'quotation_number', 'customer_name')
                ->limit(5)
                ->get();

            if ($quotations->isNotEmpty()) {
                $results[] = [
                    'group' => 'Quotations',
                    'items' => $quotations->map(fn ($quotation) => [
                        'id' => 'quotation-' . $quotation->id,
                        'title' => $quotation->quotation_number,
                        'subtitle' => $quotation->customer_name ?? $quotation->lead?->company_name ?? 'Quotation',
                        'url' => '/leads/' . $quotation->lead_id,
                    ]),
                ];
            }

            $icpProfiles = IcpProfile::where('name', 'ilike', '%' . $query . '%')
                ->select('id', 'name')
                ->limit(5)
                ->get();

            if ($icpProfiles->isNotEmpty()) {
                $results[] = [
                    'group' => 'ICP Profiles',
                    'items' => $icpProfiles->map(fn ($profile) => [
                        'id' => 'icp-' . $profile->id,
                        'title' => $profile->name,
                        'subtitle' => 'ICP Profile',
                        'url' => '/settings/icp-profiles',
                    ]),
                ];
            }
        }

        // Professional Services estimations — separate permission, scoped through
        // the lead they belong to just like Contacts/Quotations above.
        if ($user?->hasPermission('professional_services.view')) {
            $estimations = PsEstimation::where(fn ($visibility) => $visibility
                    ->whereHas('lead', fn ($q) => $q->visibleTo($user))
                    ->orWhereNull('lead_id'))
                ->where(fn ($q) => $q->where('estimation_number', 'ilike', '%' . $query . '%')
                    ->orWhere('title', 'ilike', '%' . $query . '%'))
                ->with('lead:id,company_name')
                ->select('id', 'lead_id', 'estimation_number', 'title')
                ->limit(5)
                ->get();

            if ($estimations->isNotEmpty()) {
                $results[] = [
                    'group' => 'Professional Services',
                    'items' => $estimations->map(fn ($estimation) => [
                        'id' => 'ps-estimation-' . $estimation->id,
                        'title' => $estimation->title ?: $estimation->estimation_number,
                        'subtitle' => $estimation->lead?->company_name ?? 'Estimation',
                        'url' => '/professional-services/estimations/' . $estimation->id,
                    ]),
                ];
            }
        }

        // Search Products
        if ($user?->hasPermission('products.view') && class_exists(Product::class) && Schema::hasTable('products')) {
            $productsQuery = Product::where('name', 'ilike', '%' . $query . '%');
            if (Schema::hasColumn('products', 'sku')) {
                 $productsQuery->orWhere('sku', 'ilike', '%' . $query . '%');
            }
            $products = $productsQuery->select('id', 'name')->limit(5)->get();

            if ($products->isNotEmpty()) {
                $results[] = [
                    'group' => 'Products',
                    'items' => $products->map(fn ($product) => [
                        'id' => 'product-' . $product->id,
                        'title' => $product->name,
                        'subtitle' => 'Product',
                        'url' => '/products/' . $product->id,
                    ]),
                ];
            }
        }

        // Search Users — requires the same permission as the Users management page,
        // since every user's name/email was previously leaked to any authenticated
        // user regardless of role.
        if ($user?->hasPermission('users.manage')) {
            $users = User::where('name', 'ilike', '%' . $query . '%')
                ->orWhere('email', 'ilike', '%' . $query . '%')
                ->select('id', 'name', 'email')
                ->limit(5)
                ->get();

            if ($users->isNotEmpty()) {
                $results[] = [
                    'group' => 'Users',
                    'items' => $users->map(fn ($user) => [
                        'id' => 'user-' . $user->id,
                        'title' => $user->name,
                        'subtitle' => $user->email,
                        'url' => '/settings/users',
                    ]),
                ];
            }
        }

        return response()->json($results);
    }
}
