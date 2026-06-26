<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\WhatsappSession;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => User::with(['role', 'directManager:id,name,email'])->orderBy('name')->get(),
        ]);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(['data' => $user->load(['role.permissions', 'directManager:id,name,email'])]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:8',
            'role_id' => 'nullable|exists:roles,id',
            'direct_manager_id' => 'nullable|exists:users,id',
            'phone' => 'nullable|string|max:30',
            'target_period' => 'nullable|in:weekly,monthly,quarterly,yearly',
            'target_revenue' => 'nullable|numeric|min:0',
            'tier_level' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        $user = User::create($data);
        AuditService::logCreated('users', $user);

        return response()->json(['data' => $user->load(['role', 'directManager:id,name,email'])], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $original = $user->getAttributes();

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,'.$user->id,
            'password' => 'nullable|string|min:8',
            'role_id' => 'nullable|exists:roles,id',
            'direct_manager_id' => 'nullable|exists:users,id',
            'phone' => 'nullable|string|max:30',
            'target_period' => 'nullable|in:weekly,monthly,quarterly,yearly',
            'target_revenue' => 'nullable|numeric|min:0',
            'tier_level' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($data['direct_manager_id']) && (int) $data['direct_manager_id'] === $user->id) {
            return response()->json(['message' => 'A user cannot be their own direct manager.'], 422);
        }

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);
        AuditService::logUpdated('users', $user, $original);

        return response()->json(['data' => $user->load(['role', 'directManager:id,name,email'])]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        // Check if there are resources to transfer
        $hasLeads = Lead::where('owner_id', $user->id)
            ->orWhere('presales_owner_id', $user->id)
            ->orWhere('am_owner_id', $user->id)
            ->orWhere('csm_owner_id', $user->id)
            ->exists();

        if ($hasLeads && ! $request->has('transfer_to_user_id')) {
            return response()->json([
                'message' => 'This user owns active leads. You must specify a recipient user to transfer these resources before deleting.',
                'requires_transfer' => true,
            ], 422);
        }

        $transferToUserId = $request->input('transfer_to_user_id');

        if ($transferToUserId) {
            $request->validate([
                'transfer_to_user_id' => 'required|exists:users,id|different:'.$user->id,
            ]);

            // Transfer Leads
            Lead::where('owner_id', $user->id)->update(['owner_id' => $transferToUserId]);
            Lead::where('presales_owner_id', $user->id)->update(['presales_owner_id' => $transferToUserId]);
            Lead::where('am_owner_id', $user->id)->update(['am_owner_id' => $transferToUserId]);
            Lead::where('csm_owner_id', $user->id)->update(['csm_owner_id' => $transferToUserId]);
            Lead::where('created_by', $user->id)->update(['created_by' => $transferToUserId]);

            // Transfer direct manager association
            User::where('direct_manager_id', $user->id)->update(['direct_manager_id' => $transferToUserId]);
        } else {
            // Set manager to null for users managed by deleted user
            User::where('direct_manager_id', $user->id)->update(['direct_manager_id' => null]);
        }

        // Clean up Local WhatsApp Session
        try {
            $sessionName = "user_session_{$user->id}";
            $sidecarUrl = env('WHATSAPP_SIDECAR_URL', 'http://127.0.0.1:3002');
            Http::timeout(5)->withHeaders(['X-Session-Id' => $sessionName])->post(rtrim($sidecarUrl, '/').'/api/session/disconnect');

            WhatsappSession::where('session_name', $sessionName)->delete();
        } catch (\Throwable $e) {
            // Ignore sidecar unreachable
        }

        AuditService::logDeleted('users', $user);
        $user->delete();

        return response()->json(null, 204);
    }

    /* ── Roles ── */

    public function roles(): JsonResponse
    {
        return response()->json([
            'data' => Role::with('permissions')->orderBy('name')->get(),
        ]);
    }

    public function permissions(): JsonResponse
    {
        return response()->json([
            'data' => Permission::orderBy('module')->orderBy('display_name')->get(),
        ]);
    }

    public function storeRole(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100|unique:roles',
            'display_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role = Role::create($data);

        if (! empty($data['permissions'])) {
            $role->permissions()->sync($data['permissions']);
        }

        AuditService::logCreated('roles', $role);

        return response()->json(['data' => $role->load('permissions')], 201);
    }

    public function updateRole(Request $request, Role $role): JsonResponse
    {
        $original = $role->getAttributes();

        $data = $request->validate([
            'display_name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role->update($data);

        if (isset($data['permissions'])) {
            $role->permissions()->sync($data['permissions']);
        }

        AuditService::logUpdated('roles', $role, $original);

        return response()->json(['data' => $role->load('permissions')]);
    }

    public function destroyRole(Role $role): JsonResponse
    {
        if ($role->users()->exists()) {
            return response()->json(['message' => 'Cannot delete role: users are assigned to it.'], 422);
        }

        AuditService::logDeleted('roles', $role);
        $role->delete();

        return response()->json(null, 204);
    }
}
