"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Shield, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar, FilterBarSearch } from "@/components/ui/filter-bar";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
} from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/apiFetch";
import { useNumberFormat } from "@/lib/hooks/use-number-format";
import { cn } from "@/lib/utils";

type RolePermission = {
  id: number;
  name: string;
  display_name: string;
  module: string;
};

type AppRole = {
  id: number;
  name: string;
  display_name: string;
  description?: string | null;
  permissions?: RolePermission[];
  users_count?: number;
};

type AppUser = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  direct_manager_id?: number | null;
  direct_manager?: Pick<AppUser, "id" | "name" | "email"> | null;
  target_period?: "weekly" | "monthly" | "quarterly" | "yearly" | null;
  target_revenue?: string | number | null;
  is_active: boolean;
  role?: AppRole | null;
  role_id?: number | null;
  tier_level?: string | null;
};

type UserFormState = {
  name: string;
  email: string;
  password: string;
  phone: string;
  role_id: string;
  direct_manager_id: string;
  target_period: string;
  target_revenue: string;
  tier_level: string;
};

type RoleFormState = {
  name: string;
  display_name: string;
  description: string;
  permissions: number[];
};

const userFormDefaults: UserFormState = {
  name: "",
  email: "",
  password: "",
  phone: "",
  role_id: "",
  direct_manager_id: "",
  target_period: "monthly",
  target_revenue: "",
  tier_level: "",
};

const roleFormDefaults: RoleFormState = {
  name: "",
  display_name: "",
  description: "",
  permissions: [],
};

const tabItems = [
  { key: "users", label: "Users" },
  { key: "roles", label: "Roles" },
] as const;

export default function SettingsUsersPage() {
  const queryClient = useQueryClient();
  const { formatCurrency, formatAmountInput, normalizeAmountInput } = useNumberFormat();
  const [tab, setTab] = useState<(typeof tabItems)[number]["key"]>("users");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState("");

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(userFormDefaults);
  const [userError, setUserError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [transferUserId, setTransferUserId] = useState("");

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [deleteRole, setDeleteRole] = useState<AppRole | null>(null);
  const [roleForm, setRoleForm] = useState<RoleFormState>(roleFormDefaults);
  const [roleError, setRoleError] = useState("");

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await apiFetch("/users");
      return response.json();
    },
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await apiFetch("/roles");
      return response.json();
    },
  });

  const { data: permissionsData } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const response = await apiFetch("/permissions");
      return response.json();
    },
  });

  const users: AppUser[] = (usersData?.data ?? []).filter((user: AppUser) => {
    const term = search.toLowerCase();
    return (
      user.name?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term)
    );
  });
  const roles: AppRole[] = rolesData?.data ?? [];
  const permissions: RolePermission[] = permissionsData?.data ?? [];

  const permissionsByModule = useMemo(
    () =>
      permissions.reduce((groups: Record<string, RolePermission[]>, permission) => {
        const key = permission.module || "system";
        if (!groups[key]) groups[key] = [];
        groups[key].push(permission);
        return groups;
      }, {}),
    [permissions]
  );

  const saveUserMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const url = editingUser ? `/users/${editingUser.id}` : "/users";
      const method = editingUser ? "PUT" : "POST";
      const response = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Unable to save user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setUserModalOpen(false);
      setEditingUser(null);
      setUserForm(userFormDefaults);
      setUserError("");
      setFeedback(editingUser ? "User updated successfully." : "User created successfully.");
    },
    onError: (error: Error) => setUserError(error.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async ({ id, transferToUserId }: { id: number; transferToUserId?: number }) => {
      const response = await apiFetch(`/users/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transfer_to_user_id: transferToUserId || null }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Unable to deactivate user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteUser(null);
      setTransferUserId("");
      setDeleteError("");
      setFeedback("User deactivated successfully.");
    },
    onError: (err: Error) => {
      setDeleteError(err.message);
    },
  });

  const saveRoleMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const url = editingRole ? `/roles/${editingRole.id}` : "/roles";
      const method = editingRole ? "PUT" : "POST";
      const response = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Unable to save role");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
      setRoleModalOpen(false);
      setEditingRole(null);
      setRoleForm(roleFormDefaults);
      setRoleError("");
      setFeedback(editingRole ? "Role updated successfully." : "Role created successfully.");
    },
    onError: (error: Error) => setRoleError(error.message),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/roles/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Unable to delete role");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setDeleteRole(null);
      setRoleError("");
      setFeedback("Role deleted successfully.");
    },
    onError: (error: Error) => setRoleError(error.message),
  });

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm(userFormDefaults);
    setUserError("");
    setUserModalOpen(true);
  };

  const openEditUser = (user: AppUser) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      phone: user.phone || "",
      role_id: user.role?.id ? String(user.role.id) : "",
      direct_manager_id: user.direct_manager_id ? String(user.direct_manager_id) : "",
      target_period: user.target_period || "monthly",
      target_revenue: user.target_revenue != null ? String(user.target_revenue) : "",
      tier_level: user.tier_level || "",
    });
    setUserError("");
    setUserModalOpen(true);
  };

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm(roleFormDefaults);
    setRoleError("");
    setRoleModalOpen(true);
  };

  const openEditRole = (role: AppRole) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name || "",
      display_name: role.display_name || "",
      description: role.description || "",
      permissions: (role.permissions || []).map((permission) => permission.id),
    });
    setRoleError("");
    setRoleModalOpen(true);
  };

  const submitUser = () => {
    const payload: Record<string, unknown> = {
      name: userForm.name,
      email: userForm.email,
      phone: userForm.phone,
      direct_manager_id: userForm.direct_manager_id ? Number(userForm.direct_manager_id) : null,
      target_period: userForm.target_period,
      target_revenue: userForm.target_revenue ? Number(userForm.target_revenue) : null,
    };
    if (userForm.role_id) payload.role_id = Number(userForm.role_id);
    if (userForm.tier_level) payload.tier_level = userForm.tier_level;
    if (userForm.password) {
      payload.password = userForm.password;
      payload.password_confirmation = userForm.password;
    }
    saveUserMutation.mutate(payload);
  };

  const submitRole = () => {
    if (!roleForm.display_name.trim()) {
      setRoleError("Display name is required.");
      return;
    }

    const payload: Record<string, unknown> = {
      display_name: roleForm.display_name,
      description: roleForm.description,
      permissions: roleForm.permissions,
    };

    if (!editingRole) payload.name = roleForm.name;

    saveRoleMutation.mutate(payload);
  };

  const toggleRolePermission = (permissionId: number) => {
    setRoleForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permissionId)
        ? current.permissions.filter((id) => id !== permissionId)
        : [...current.permissions, permissionId],
    }));
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="space-y-1">
            <BackToSettings />
            <CardTitle>Users & Roles</CardTitle>
            <CardDescription>Unified RBAC management using the shared admin table, tabs, and modal system.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={tab} onValueChange={setTab} items={tabItems.map((item) => ({ ...item }))} />
            <Button onClick={tab === "users" ? openCreateUser : openCreateRole}>
              <Plus className="h-4 w-4" />
              {tab === "users" ? "Add User" : "Add Role"}
            </Button>
          </div>
        </CardHeader>
        {feedback ? (
          <div className="px-5 pb-5">
            <Badge variant="info">{feedback}</Badge>
          </div>
        ) : null}
      </Card>

      <FilterBar>
        <FilterBarSearch
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={tab === "users" ? "Search users" : "Search roles"}
        />
      </FilterBar>

      {tab === "users" ? (
        <TableShell>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>User</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Level</TableHeaderCell>
                <TableHeaderCell>Manager</TableHeaderCell>
                <TableHeaderCell>Target</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {usersLoading ? (
                <TableEmpty colSpan={6}>
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Loading users...
                </TableEmpty>
              ) : users.length === 0 ? (
                <TableEmpty colSpan={6}>No users found.</TableEmpty>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">
                        {user.role?.display_name || user.role?.name || "Unassigned"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.tier_level ? (
                        <Badge variant="outline">{user.tier_level.replace(/_/g, ' ')}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p>{user.direct_manager?.name ?? "—"}</p>
                        {user.direct_manager?.email ? (
                          <p className="text-xs text-muted-foreground">{user.direct_manager.email}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">{formatCurrency(user.target_revenue)}</p>
                        <p className="text-xs capitalize text-muted-foreground">{user.target_period ?? "monthly"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "success" : "danger"}>
                        {user.is_active ? (
                          <>
                            <ToggleRight className="h-3.5 w-3.5" />
                            Active
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-3.5 w-3.5" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditUser(user)}
                          tooltip="Edit user"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setDeleteUser(user);
                            setTransferUserId("");
                            setDeleteError("");
                          }}
                          tooltip="Deactivate user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableShell>
      ) : (
        <TableShell>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Permissions</TableHeaderCell>
                <TableHeaderCell>Description</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {rolesLoading ? (
                <TableEmpty colSpan={4}>
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Loading roles...
                </TableEmpty>
              ) : roles.length === 0 ? (
                <TableEmpty colSpan={4}>No roles found.</TableEmpty>
              ) : (
                roles
                  .filter((role) => {
                    const term = search.toLowerCase();
                    return (
                      role.display_name?.toLowerCase().includes(term) ||
                      role.name?.toLowerCase().includes(term)
                    );
                  })
                  .map((role) => (
                    <TableRow key={role.id || role.name}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--surface-subtle)]">
                            <Shield className="h-4 w-4 text-[color:var(--brand)]" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium">{role.display_name || role.name}</p>
                            <p className="text-xs text-muted-foreground">{role.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(role.permissions || []).slice(0, 6).map((permission) => (
                            <Badge key={permission.id} variant="neutral">
                              {permission.display_name || permission.name}
                            </Badge>
                          ))}
                          {(role.permissions || []).length > 6 ? (
                            <Badge variant="outline">+{(role.permissions || []).length - 6} more</Badge>
                          ) : null}
                          {(role.permissions || []).length === 0 ? (
                            <Badge variant="outline">No permissions</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {role.description || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEditRole(role)}
                            tooltip="Edit role"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteRole(role)}
                            tooltip="Delete role"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableShell>
      )}

      <Modal
        open={userModalOpen}
        onOpenChange={(open) => {
          setUserModalOpen(open);
          if (!open) {
            setEditingUser(null);
            setUserForm(userFormDefaults);
            setUserError("");
          }
        }}
        title={editingUser ? "Edit User" : "Create User"}
        description="This user form now uses the same shared modal and input system as the rest of admin."
        footer={
          <>
            <Button variant="outline" onClick={() => setUserModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitUser} disabled={saveUserMutation.isPending}>
              {saveUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingUser ? "Save User" : "Create User"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          {userError ? <Badge variant="danger">{userError}</Badge> : null}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={userForm.name}
              onChange={(event) =>
                setUserForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={userForm.email}
              onChange={(event) =>
                setUserForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Password {editingUser ? "(leave blank to keep current password)" : ""}
            </label>
            <Input
              type="password"
              value={userForm.password}
              onChange={(event) =>
                setUserForm((current) => ({ ...current, password: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={userForm.phone}
              onChange={(event) =>
                setUserForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={userForm.role_id}
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, role_id: event.target.value }))
                }
                placeholder="Select role"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.display_name || role.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Level</label>
              <Select
                value={userForm.tier_level}
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, tier_level: event.target.value }))
                }
                placeholder="Select level"
              >
                <option value="Staff">Staff</option>
                <option value="Senior Staff">Senior Staff</option>
                <option value="Assistant Supervisor">Assistant Supervisor</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Senior Supervisor">Senior Supervisor</option>
                <option value="Manager">Manager</option>
                <option value="Senior Manager">Senior Manager</option>
                <option value="General Manager">General Manager</option>
                <option value="Director">Director</option>
                <option value="VP">VP</option>
                <option value="C-Level">C-Level</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Direct Manager</label>
            <Select
              value={userForm.direct_manager_id}
              onChange={(event) =>
                setUserForm((current) => ({ ...current, direct_manager_id: event.target.value }))
              }
              placeholder="No direct manager"
            >
              {(usersData?.data ?? [])
                .filter((user: AppUser) => user.id !== editingUser?.id)
                .map((user: AppUser) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Target Period</label>
              <Select
                value={userForm.target_period}
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, target_period: event.target.value }))
                }
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Target Revenue</label>
              <Input
                inputMode="decimal"
                value={formatAmountInput(userForm.target_revenue)}
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, target_revenue: normalizeAmountInput(event.target.value) }))
                }
                placeholder="e.g. 100,000,000"
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={roleModalOpen}
        onOpenChange={(open) => {
          setRoleModalOpen(open);
          if (!open) {
            setEditingRole(null);
            setRoleForm(roleFormDefaults);
            setRoleError("");
          }
        }}
        title={editingRole ? "Edit Role" : "Create Role"}
        description="Role CRUD and permission assignment now use the same standardized admin components."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitRole} disabled={saveRoleMutation.isPending}>
              {saveRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingRole ? "Save Role" : "Create Role"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          {roleError ? <Badge variant="danger">{roleError}</Badge> : null}
          {!editingRole ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Role Slug</label>
              <Input
                value={roleForm.name}
                onChange={(event) =>
                  setRoleForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
          ) : null}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Display Name</label>
            <Input
              value={roleForm.display_name}
              onChange={(event) =>
                setRoleForm((current) => ({ ...current, display_name: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={roleForm.description}
              onChange={(event) =>
                setRoleForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-3 rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4">
            {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
              <div key={module} className="grid gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {module}
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {modulePermissions.map((permission) => {
                    const checked = roleForm.permissions.includes(permission.id);
                    return (
                      <label
                        key={permission.id}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
                          checked
                            ? "border-[color:var(--brand)] bg-card"
                            : "border-border bg-background"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRolePermission(permission.id)}
                          className="mt-1"
                        />
                        <span className="space-y-1">
                          <span className="block text-sm font-medium">{permission.display_name}</span>
                          <span className="block text-xs text-muted-foreground">{permission.name}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteUser)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteUser(null);
            setTransferUserId("");
            setDeleteError("");
          }
        }}
        title="Deactivate User"
        description="Deactivation uses the shared confirmation modal instead of custom dialog markup."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteUser && deleteUserMutation.mutate({ id: deleteUser.id, transferToUserId: transferUserId ? Number(transferUserId) : undefined })}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Deactivate User
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Deactivate <span className="font-medium text-foreground">{deleteUser?.name}</span>? Their
            record stays intact but access will be revoked.
          </p>

          {deleteError ? (
            <Badge variant="danger" className="w-full justify-start py-2">
              {deleteError}
            </Badge>
          ) : null}

          <div className="grid gap-2">
            <label className="text-sm font-medium">Transfer Owned Resources To:</label>
            <Select
              value={transferUserId}
              onChange={(event) => setTransferUserId(event.target.value)}
              placeholder="Select recipient user"
            >
              {(usersData?.data ?? [])
                .filter((u: AppUser) => u.id !== deleteUser?.id)
                .map((u: AppUser) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              Transfer all active leads and subordinate team members to another user before deactivation.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteRole)}
        onOpenChange={(open) => {
          if (!open) setDeleteRole(null);
        }}
        title="Delete Role"
        description="Role deletion now uses the same shared confirmation pattern as other admin actions."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteRole(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteRole && deleteRoleMutation.mutate(deleteRole.id)}
              disabled={deleteRoleMutation.isPending}
            >
              {deleteRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete Role
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Delete{" "}
            <span className="font-medium text-foreground">
              {deleteRole?.display_name || deleteRole?.name}
            </span>
            ?
          </p>
          <p>Roles with assigned users cannot be deleted.</p>
          {roleError ? <Badge variant="danger">{roleError}</Badge> : null}
        </div>
      </Modal>
    </div>
  );
}
