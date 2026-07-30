<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PsRole;
use App\Models\PsRateCard;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class PsRoleController extends Controller
{
    public function index()
    {
        return response()->json(PsRole::with('rateCards')->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:ps_roles',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'rate_per_manday' => 'nullable|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $role = PsRole::create([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            if (isset($validated['rate_per_manday'])) {
                $role->rateCards()->create([
                    'rate_per_manday' => $validated['rate_per_manday'],
                    'effective_from' => now()->startOfDay(),
                    'is_active' => true,
                ]);
            }
            DB::commit();
            return response()->json($role->load('rateCards'), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function show($id)
    {
        return response()->json(PsRole::with('rateCards')->findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $role = PsRole::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('ps_roles')->ignore($role->id)],
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $role->update($validated);

        return response()->json($role->load('rateCards'));
    }

    public function destroy($id)
    {
        $role = PsRole::findOrFail($id);
        
        // Deactivate instead of hard delete
        $role->update(['is_active' => false]);
        
        return response()->json(['message' => 'Role deactivated.'], 200);
    }

    // Rate Card Management
    public function storeRateCard(Request $request, $id)
    {
        $role = PsRole::findOrFail($id);

        $validated = $request->validate([
            'rate_per_manday' => 'required|numeric|min:0',
            'effective_from' => 'required|date',
            'effective_to' => 'nullable|date|after_or_equal:effective_from',
            'is_active' => 'boolean',
        ]);

        $rateCard = $role->rateCards()->create($validated);

        return response()->json($rateCard, 201);
    }

    public function updateRateCard(Request $request, $id, $rateCardId)
    {
        $role = PsRole::findOrFail($id);
        $rateCard = $role->rateCards()->findOrFail($rateCardId);

        $validated = $request->validate([
            'rate_per_manday' => 'required|numeric|min:0',
            'effective_from' => 'required|date',
            'effective_to' => 'nullable|date|after_or_equal:effective_from',
            'is_active' => 'boolean',
        ]);

        $rateCard->update($validated);

        return response()->json($rateCard);
    }
}
