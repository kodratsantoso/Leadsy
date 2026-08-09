<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompanyBankAccount;
use App\Models\Tenant;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CompanyBankAccountController extends Controller
{
    public function index(): JsonResponse
    {
        $tenant = Tenant::first();
        if (!$tenant) {
            return response()->json(['message' => 'Tenant settings not found.'], 404);
        }

        $accounts = CompanyBankAccount::where('tenant_id', $tenant->id)
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $accounts
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = Tenant::first();
        if (!$tenant) {
            return response()->json(['message' => 'Tenant settings not found.'], 404);
        }

        $validated = $request->validate([
            'bank_name' => 'required|string|max:255',
            'account_number' => 'required|string|max:100',
            'account_name' => 'required|string|max:255',
            'currency' => 'nullable|string|max:10',
            'is_default' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        $validated['tenant_id'] = $tenant->id;
        $validated['created_by'] = $request->user()?->id;

        $account = DB::transaction(function () use ($validated, $tenant) {
            if (!empty($validated['is_default'])) {
                CompanyBankAccount::where('tenant_id', $tenant->id)->update(['is_default' => false]);
            }
            return CompanyBankAccount::create($validated);
        });

        AuditService::logCreated('company_bank_account', $account);

        return response()->json([
            'success' => true,
            'data' => $account,
            'message' => 'Bank account added successfully.'
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $account = CompanyBankAccount::findOrFail($id);

        $validated = $request->validate([
            'bank_name' => 'sometimes|required|string|max:255',
            'account_number' => 'sometimes|required|string|max:100',
            'account_name' => 'sometimes|required|string|max:255',
            'currency' => 'nullable|string|max:10',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        $original = $account->toArray();

        DB::transaction(function () use ($account, $validated, $original) {
            if (!empty($validated['is_default'])) {
                CompanyBankAccount::where('tenant_id', $account->tenant_id)->update(['is_default' => false]);
            }
            $account->update($validated);
        });

        AuditService::logUpdated('company_bank_account', $account, $original);

        return response()->json([
            'success' => true,
            'data' => $account,
            'message' => 'Bank account updated successfully.'
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $account = CompanyBankAccount::findOrFail($id);

        // Check if referenced by LeadQuotation or LeadSalesOrder
        $hasQuotations = DB::table('lead_quotations')->where('bank_account_id', $id)->exists();
        $hasOrders = DB::table('lead_sales_orders')->where('bank_account_id', $id)->exists();

        $original = $account->toArray();

        if ($hasQuotations || $hasOrders) {
            // Safe deactivation instead of destructive deletion
            $account->update(['is_active' => false, 'is_default' => false]);
            AuditService::logUpdated('company_bank_account', $account, $original);
            $message = 'Bank account deactivated because it is referenced in historical documents.';
        } else {
            $account->delete();
            AuditService::logDeleted('company_bank_account', $account);
            $message = 'Bank account deleted successfully.';
        }

        return response()->json([
            'success' => true,
            'message' => $message
        ]);
    }

    public function setDefault(int $id): JsonResponse
    {
        $account = CompanyBankAccount::findOrFail($id);
        if (!$account->is_active) {
            return response()->json(['message' => 'Cannot set inactive bank account as default.'], 422);
        }

        $original = $account->toArray();

        DB::transaction(function () use ($account) {
            CompanyBankAccount::where('tenant_id', $account->tenant_id)->update(['is_default' => false]);
            $account->update(['is_default' => true]);
        });

        AuditService::logUpdated('company_bank_account', $account, $original);

        return response()->json([
            'success' => true,
            'data' => $account,
            'message' => 'Default bank account updated.'
        ]);
    }
}
