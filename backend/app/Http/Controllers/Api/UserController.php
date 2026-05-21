<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\User;
use App\Models\Role;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            'name'      => 'required|string|max:255',
            'email'     => 'required|email|unique:users',
            'password'  => 'required|string|min:8',
            'role_id'   => 'nullable|exists:roles,id',
            'direct_manager_id' => 'nullable|exists:users,id',
            'phone'     => 'nullable|string|max:30',
            'target_period' => 'nullable|in:weekly,monthly,quarterly,yearly',
            'target_revenue' => 'nullable|numeric|min:0',
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
            'name'      => 'sometimes|string|max:255',
            'email'     => 'sometimes|email|unique:users,email,' . $user->id,
            'password'  => 'nullable|string|min:8',
            'role_id'   => 'nullable|exists:roles,id',
            'direct_manager_id' => 'nullable|exists:users,id',
            'phone'     => 'nullable|string|max:30',
            'target_period' => 'nullable|in:weekly,monthly,quarterly,yearly',
            'target_revenue' => 'nullable|numeric|min:0',
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

    public function destroy(User $user): JsonResponse
    {
        AuditService::logDeleted('users', $user);
        $user->update(['is_active' => false]);
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
            'name'          => 'required|string|max:100|unique:roles',
            'display_name'  => 'required|string|max:255',
            'description'   => 'nullable|string',
            'permissions'   => 'nullable|array',
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
            'display_name'  => 'sometimes|string|max:255',
            'description'   => 'nullable|string',
            'is_active'     => 'nullable|boolean',
            'permissions'   => 'nullable|array',
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
