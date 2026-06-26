<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiGeneratedOutput;
use App\Models\AiOutputVersion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AiOutputController extends Controller
{
    /**
     * Get the history of an AI Output
     */
    public function history($id)
    {
        $output = AiGeneratedOutput::with('versions.changedBy', 'generatedBy', 'lastEditedBy', 'reviewedBy')
            ->findOrFail($id);

        return response()->json($output);
    }

    /**
     * Update the AI output manually (edit)
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'edited_output_json' => 'required|array',
            'change_summary' => 'nullable|string',
        ]);

        $output = AiGeneratedOutput::findOrFail($id);

        // Save current state as a version before updating
        $versionNumber = $output->versions()->count() + 1;
        AiOutputVersion::create([
            'ai_output_id' => $output->id,
            'version_number' => $versionNumber,
            'output_json' => $output->current_output_json,
            'change_summary' => $request->input('change_summary', 'Manual edit'),
            'changed_by' => Auth::id(),
            'change_type' => 'edited',
        ]);

        $output->update([
            'edited_output_json' => $request->input('edited_output_json'),
            'current_output_json' => $request->input('edited_output_json'),
            'status' => 'reviewed',
            'last_edited_by' => Auth::id(),
        ]);

        return response()->json($output);
    }

    /**
     * Approve the AI output
     */
    public function approve($id)
    {
        $output = AiGeneratedOutput::findOrFail($id);

        $versionNumber = $output->versions()->count() + 1;
        AiOutputVersion::create([
            'ai_output_id' => $output->id,
            'version_number' => $versionNumber,
            'output_json' => $output->current_output_json,
            'change_summary' => 'Approved output',
            'changed_by' => Auth::id(),
            'change_type' => 'approved',
        ]);

        $output->update([
            'status' => 'approved',
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
        ]);

        return response()->json($output);
    }
}
