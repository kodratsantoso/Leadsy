<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Lead;
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

        $results = [];

        // Search Leads
        $leads = Lead::with('industry:id,name')
            ->where('company_name', 'ilike', '%' . $query . '%')
            ->select('id', 'company_name', 'industry_id')
            ->limit(5)
            ->get();
            
        if ($leads->isNotEmpty()) {
            $items = $leads->map(function($lead) {
                return [
                    'id' => 'lead-' . $lead->id,
                    'title' => $lead->company_name,
                    'subtitle' => $lead->industry ? $lead->industry->name : 'Lead',
                    'url' => '/leads/' . $lead->id
                ];
            });
            $results[] = [
                'group' => 'Leads',
                'items' => $items
            ];
        }

        // Search Products
        if (class_exists(Product::class) && Schema::hasTable('products')) {
            $productsQuery = Product::where('name', 'ilike', '%' . $query . '%');
            if (Schema::hasColumn('products', 'sku')) {
                 $productsQuery->orWhere('sku', 'ilike', '%' . $query . '%');
            }
            $products = $productsQuery->select('id', 'name')->limit(5)->get();
                
            if ($products->isNotEmpty()) {
                $items = $products->map(function($product) {
                    return [
                        'id' => 'product-' . $product->id,
                        'title' => $product->name,
                        'subtitle' => 'Product',
                        'url' => '/products/' . $product->id
                    ];
                });
                $results[] = [
                    'group' => 'Products',
                    'items' => $items
                ];
            }
        }

        // Search Users
        $users = User::where('name', 'ilike', '%' . $query . '%')
            ->orWhere('email', 'ilike', '%' . $query . '%')
            ->select('id', 'name', 'email')
            ->limit(5)
            ->get();
            
        if ($users->isNotEmpty()) {
            $items = $users->map(function($user) {
                return [
                    'id' => 'user-' . $user->id,
                    'title' => $user->name,
                    'subtitle' => $user->email,
                    'url' => '/settings/users'
                ];
            });
            $results[] = [
                'group' => 'Users',
                'items' => $items
            ];
        }

        return response()->json($results);
    }
}
