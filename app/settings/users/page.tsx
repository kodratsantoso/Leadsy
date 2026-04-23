"use client";

import { useState } from "react";
import { Users, Plus, Shield, Pencil, Search, ToggleLeft, ToggleRight, Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { TableWrapper, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/table";

export default function SettingsUsersPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [search, setSearch] = useState("");

  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRoleId, setFormRoleId] = useState<number | "">("");
  const [formPhone, setFormPhone] = useState("");

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editRole, setEditRole] = useState<any>(null);
  const [deleteRoleConfirm, setDeleteRoleConfirm] = useState<any>(null);
  const [roleError, setRoleError] = useState("");
  const [formRoleName, setFormRoleName] = useState("");
  const [formRoleDisplay, setFormRoleDisplay] = useState("");
  const [formRoleDesc, setFormRoleDesc] = useState("");
  const [formRolePermissions, setFormRolePermissions] = useState<number[]>([]);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => { const r = await apiFetch("/users"); return r.json(); },
  });
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => { const r = await apiFetch("/roles"); return r.json(); },
  });

  const saveUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editUser ? `/users/${editUser.id}` : "/users";
      const method = editUser ? "PUT" : "POST";
      return apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); closeUserModal(); },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setDeleteUserConfirm(null); },
  });

  const openCreateUser = () => {
    setEditUser(null); setFormName(""); setFormEmail(""); setFormPassword(""); setFormRoleId(""); setFormPhone(""); setShowUserModal(true);
  };
  const openEditUser = (u: any) => {
    setEditUser(u); setFormName(u.name); setFormEmail(u.email); setFormPassword(""); setFormRoleId(u.role_id || ""); setFormPhone(u.phone || ""); setShowUserModal(true);
  };
  const closeUserModal = () => { setShowUserModal(false); setEditUser(null); };
  const handleSaveUser = () => {
    const payload: any = { name: formName, email: formEmail, phone: formPhone };
    if (formRoleId) payload.role_id = formRoleId;
    if (formPassword) { payload.password = formPassword; payload.password_confirmation = formPassword; }
    saveUserMutation.mutate(payload);
  };

  const saveRoleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editRole ? `/roles/${editRole.id}` : "/roles";
      const method = editRole ? "PUT" : "POST";
      const r = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Save failed"); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); closeRoleModal(); },
    onError: (e: any) => setRoleError(e.message),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiFetch(`/roles/${id}`, { method: "DELETE" });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Delete failed"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); setDeleteRoleConfirm(null); },
    onError: (e: any) => setRoleError(e.message),
  });

  const openCreateRole = () => {
    setEditRole(null); setFormRoleName(""); setFormRoleDisplay(""); setFormRoleDesc(""); setFormRolePermissions([]); setRoleError(""); setShowRoleModal(true);
  };
  const openEditRole = (r: any) => {
    setEditRole(r); setFormRoleName(r.name || ""); setFormRoleDisplay(r.display_name || ""); setFormRoleDesc(r.description || "");
    setFormRolePermissions((r.permissions || []).map((p: any) => p.id)); setRoleError(""); setShowRoleModal(true);
  };
  const closeRoleModal = () => { setShowRoleModal(false); setEditRole(null); setRoleError(""); setFormRolePermissions([]); };
  const handleSaveRole = () => {
    if (!formRoleDisplay.trim()) { setRoleError("Display name is required"); return; }
    const payload: any = { display_name: formRoleDisplay, description: formRoleDesc, permissions: formRolePermissions };
    if (!editRole) payload.name = formRoleName;
    saveRoleMutation.mutate(payload);
  };

  const users = (usersData?.data || []).filter((u: any) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );
  const roles = rolesData?.data || [];
  const permissionCatalog = Array.from(
    new Map(
      roles.flatMap((role: any) => (role.permissions || []).map((permission: any) => [permission.id, permission]))
    ).values()
  ).sort((a: any, b: any) => (a.module || "").localeCompare(b.module || "") || (a.display_name || a.name).localeCompare(b.display_name || b.name));

  const permissionsByModule = permissionCatalog.reduce((acc: Record<string, any[]>, permission: any) => {
    const module = permission.module || "system";
    if (!acc[module]) acc[module] = [];
    acc[module].push(permission);
    return acc;
  }, {});

  const toggleRolePermission = (permissionId: number) => {
    setFormRolePermissions((current) =>
      current.includes(permissionId) ? current.filter((id) => id !== permissionId) : [...current, permissionId]
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-sm text-muted-foreground">RBAC management — BRD §5.1</p>
        </div>
        <Button variant="brand" size="compact" onClick={tab === "users" ? openCreateUser : openCreateRole}>
          <Plus className="h-3.5 w-3.5" />
          {tab === "users" ? "Add User" : "Add Role"}
        </Button>
      </div>

      <div className="flex items-center gap-4 border-b border-border">
        {(["users", "roles"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`border-b-2 px-1 pb-2.5 text-sm font-medium capitalize transition-colors ${tab === t ? "border-[var(--brand)] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" className="pl-9" />
          </div>

          <TableWrapper>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>User</TableHeaderCell>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {usersLoading ? (
                  <TableRow><TableCell colSpan={4} className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-16 text-center text-xs text-muted-foreground">No users found.</TableCell></TableRow>
                ) : users.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="avatar-brand flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white">{user.name?.charAt(0)}</div>
                        <div><p className="text-sm font-medium">{user.name}</p><p className="text-xs text-muted-foreground">{user.email}</p></div>
                      </div>
                    </TableCell>
                    <TableCell><span className="rounded-md bg-[var(--brand)]/10 px-2 py-0.5 text-xs font-medium text-[var(--brand)]">{user.role?.name ?? "—"}</span></TableCell>
                    <TableCell>
                      {user.is_active
                        ? <span className="flex items-center gap-1 text-xs text-[var(--status-success)]"><ToggleRight className="h-4 w-4" /> Active</span>
                        : <span className="flex items-center gap-1 text-xs text-[var(--status-danger)]"><ToggleLeft className="h-4 w-4" /> Inactive</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditUser(user)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteUserConfirm(user)} className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--status-danger)]/10 hover:text-[var(--status-danger)]" title="Deactivate"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        </>
      )}

      {tab === "roles" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Role CRUD</h2>
            <p className="mt-1 text-xs text-muted-foreground">Create, edit, and delete roles here. Actions are always visible, and permissions can be assigned inside the role form.</p>
          </div>

          <TableWrapper>
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
                  <TableRow><TableCell colSpan={4} className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : roles.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-16 text-center text-xs text-muted-foreground">No roles found.</TableCell></TableRow>
                ) : roles.map((role: any) => (
                  <TableRow key={role.id || role.name}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand)]/10"><Shield className="h-4 w-4 text-[var(--brand)]" /></div>
                        <div>
                          <h3 className="font-semibold text-sm">{role.display_name || role.name}</h3>
                          <p className="text-xs text-muted-foreground font-mono">{role.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(role.permissions || []).slice(0, 6).map((p: any) => (
                          <span key={p.id || p.name} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">{p.display_name || p.name}</span>
                        ))}
                        {(role.permissions || []).length === 0 && <span className="text-xs text-muted-foreground">No permissions assigned</span>}
                        {(role.permissions || []).length > 6 && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">+{role.permissions.length - 6} more</span>}
                      </div>
                    </TableCell>
                    <TableCell muted>{role.description || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditRole(role)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit role"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteRoleConfirm(role)} className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--status-danger)]/10 hover:text-[var(--status-danger)]" title="Delete role"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        </div>
      )}

      {/* User Create/Edit Modal */}
      <Modal
        open={showUserModal}
        onClose={closeUserModal}
        title={editUser ? "Edit User" : "Create User"}
        size="md"
        footer={
          <>
            <Button variant="soft" size="compact" onClick={closeUserModal}>Cancel</Button>
            <Button variant="brand" size="compact" disabled={saveUserMutation.isPending} onClick={handleSaveUser}>
              {saveUserMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              {editUser ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <div><label className="text-xs font-medium text-muted-foreground">Name</label><Input value={formName} onChange={e => setFormName(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Email</label><Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Password {editUser && "(leave blank to keep)"}</label><Input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Phone</label><Input value={formPhone} onChange={e => setFormPhone(e.target.value)} className="mt-1" /></div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Role</label>
          <Select value={formRoleId} onChange={e => setFormRoleId(e.target.value ? Number(e.target.value) : "")} className="mt-1">
            <option value="">Select role…</option>
            {roles.map((r: any) => <option key={r.id} value={r.id}>{r.display_name || r.name}</option>)}
          </Select>
        </div>
      </Modal>

      {/* Role Create/Edit Modal */}
      <Modal
        open={showRoleModal}
        onClose={closeRoleModal}
        title={editRole ? "Edit Role" : "Create Role"}
        size="md"
        scrollable
        footer={
          <>
            <Button variant="soft" size="compact" onClick={closeRoleModal}>Cancel</Button>
            <Button variant="brand" size="compact" disabled={saveRoleMutation.isPending} onClick={handleSaveRole}>
              {saveRoleMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              {editRole ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        {roleError && <p className="rounded-lg bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] px-3 py-2 text-xs text-[var(--status-danger)]">{roleError}</p>}
        {!editRole && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Role Name (slug) *</label>
            <Input value={formRoleName} onChange={e => setFormRoleName(e.target.value)} placeholder="e.g. sales_manager" className="mt-1" />
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Display Name *</label>
          <Input value={formRoleDisplay} onChange={e => setFormRoleDisplay(e.target.value)} placeholder="e.g. Sales Manager" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Textarea value={formRoleDesc} onChange={e => setFormRoleDesc(e.target.value)} rows={2} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Permissions</label>
          <div className="mt-2 max-h-64 space-y-3 overflow-auto rounded-xl border border-border bg-muted/20 p-3">
            {Object.keys(permissionsByModule).length === 0 ? (
              <p className="text-xs text-muted-foreground">No permissions available.</p>
            ) : Object.entries(permissionsByModule).map(([module, permissions]) => (
              <div key={module} className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{module}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {permissions.map((permission: any) => (
                    <label key={permission.id} className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs">
                      <input type="checkbox" checked={formRolePermissions.includes(permission.id)} onChange={() => toggleRolePermission(permission.id)} className="mt-0.5" />
                      <span>
                        <span className="block font-medium text-foreground">{permission.display_name || permission.name}</span>
                        <span className="block text-muted-foreground">{permission.name}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* User Deactivate Confirm */}
      <Modal
        open={!!deleteUserConfirm}
        onClose={() => setDeleteUserConfirm(null)}
        title="Deactivate User"
        size="sm"
        footer={
          <>
            <Button variant="soft" size="compact" onClick={() => setDeleteUserConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="compact" disabled={deleteUserMutation.isPending} onClick={() => deleteUserMutation.mutate(deleteUserConfirm.id)}>
              {deleteUserMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Deactivate
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Deactivate <span className="font-semibold text-foreground">{deleteUserConfirm?.name}</span>? They will lose access but their data is preserved.
        </p>
      </Modal>

      {/* Role Delete Confirm */}
      <Modal
        open={!!deleteRoleConfirm}
        onClose={() => { setDeleteRoleConfirm(null); setRoleError(""); }}
        title="Delete Role"
        size="sm"
        footer={
          <>
            <Button variant="soft" size="compact" onClick={() => { setDeleteRoleConfirm(null); setRoleError(""); }}>Cancel</Button>
            <Button variant="danger" size="compact" disabled={deleteRoleMutation.isPending} onClick={() => deleteRoleMutation.mutate(deleteRoleConfirm.id)}>
              {deleteRoleMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Delete <span className="font-semibold text-foreground">{deleteRoleConfirm?.display_name || deleteRoleConfirm?.name}</span>?
        </p>
        <p className="text-xs text-muted-foreground">Roles with assigned users cannot be deleted.</p>
        {roleError && <p className="text-xs text-[var(--status-danger)]">{roleError}</p>}
      </Modal>
    </div>
  );
}
