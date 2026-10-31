<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentTerm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentTermController extends Controller
{
    /**
     * List all active payment terms presets.
     */
    public function index(Request $request): JsonResponse
    {
        $query = PaymentTerm::query();

        if ($request->has('term_type')) {
            $query->where('term_type', $request->query('term_type'));
        }

        if ($request->has('active_only')) {
            $query->where('is_active', true);
        }

        $terms = $query->orderBy('term_type')->orderBy('days_due')->get();

        return response()->json([
            'status' => 'success',
            'data' => $terms,
        ]);
    }

    /**
     * Store a new custom payment term preset.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:50|unique:payment_terms,code',
            'term_type' => 'required|in:calendar,milestone',
            'days_due' => 'required|integer|min:0',
            'frequency' => 'nullable|string',
            'description' => 'nullable|string',
            'installments_config' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $term = PaymentTerm::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Setup Payment Term berhasil disimpan.',
            'data' => $term,
        ], 201);
    }

    /**
     * Update an existing payment term preset.
     */
    public function update(Request $request, PaymentTerm $paymentTerm): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'code' => 'sometimes|required|string|max:50|unique:payment_terms,code,' . $paymentTerm->id,
            'term_type' => 'sometimes|required|in:calendar,milestone',
            'days_due' => 'sometimes|required|integer|min:0',
            'frequency' => 'nullable|string',
            'description' => 'nullable|string',
            'installments_config' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $paymentTerm->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Setup Payment Term berhasil diperbarui.',
            'data' => $paymentTerm,
        ]);
    }
}
