<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiAttentionHighlight;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AiHighlightController extends Controller
{
    /**
     * List highlights with optional filters
     */
    public function index(Request $request)
    {
        $query = AiAttentionHighlight::query();

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->has('entity_type') && $request->has('entity_id')) {
            $query->where('entity_type', $request->query('entity_type'))
                  ->where('entity_id', $request->query('entity_id'));
        }

        $query->orderBy('created_at', 'desc');

        return response()->json($query->paginate(20));
    }

    /**
     * Update status (e.g. mark as resolved)
     */
    public function resolve(Request $request, $id)
    {
        $highlight = AiAttentionHighlight::findOrFail($id);

        $highlight->update([
            'status' => 'resolved',
            'resolved_at' => now(),
        ]);

        return response()->json($highlight);
    }
}
