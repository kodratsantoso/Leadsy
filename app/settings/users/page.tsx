"use client";

import { useState } from "react";
import { Users, Plus, Shield, Pencil, Search, ToggleLeft, ToggleRight, Loader2, X, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import Link from "next/link";

export default function SettingsUsersPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRoleId, setFormRoleId] = useState<number | "">("");
  const [formPhone, setFormPhone] = useState("");

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => { const r = await apiFetch("/users"); return r.json(); },
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => { const r = await apiFetch("/roles"); return r.json(); },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editUser) {
        return apiFetch(`/users/${editUser.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      return apiFetch("/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); closeModal(); },
  });

  const openCreate = () => {
    setEditUser(null); setFormName(""); setFormEmail(""); setFormPassword(""); setFormRoleId(""); setFormPhone(""); setShowModal(true);
  };
  const openEdit = (user: any) => {
    setEditUser(user); setFormName(user.name); setFormEmail(user.email); setFormPassword(""); setFormRoleId(user.role_id || ""); setFormPhone(user.phone || ""); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditUser(null); };
  const handleSave = () => {
    const payload: any = { name: formName, email: formEmail, phone: formPhone };
    if (formRoleId) payload.role_id = formRoleId;
    if (formPassword) { payload.password = formPassword; payload.password_confirmation = formPassword; }
    saveMutation.mutate(payload);
  };

  const users = (usersData?.data || []).filter((u: any) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );
  const roles = rolesData?.data || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-sm text-muted-foreground">RBAC management — BRD §5.1</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-indigo-500/25">
          <Plus className="h-3.5 w-3.5" />
          {tab === "users" ? "Add User" : "Add Role"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-border">
        {(["users", "roles"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`border-b-2 px-1 pb-2.5 text-sm font-medium capitalize transition-colors ${tab === t ? "border-indigo-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "users" ? (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {usersLoading ? (
                  <tr><td colSpan={4} className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={4} className="py-16 text-center text-muted-foreground text-xs">No users found. Start the backend to load data.</td></tr>
                ) : users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-accent/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">{user.name?.charAt(0)}</div>
                        <div><p className="text-sm font-medium">{user.name}</p><p className="text-xs text-muted-foreground">{user.email}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-500">{user.role?.name ?? "—"}</span></td>
                    <td className="px-5 py-3">
                      {user.is_active ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-500"><ToggleRight className="h-4 w-4" /> Active</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-500"><ToggleLeft className="h-4 w-4" /> Inactive</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => openEdit(user)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rolesLoading ? (
            <div className="col-span-full py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (roles.length === 0 ? (
            <div className="col-span-full py-16 text-center text-muted-foreground text-xs">No roles found.</div>
          ) : roles.map((role: any) => (
            <div key={role.id || role.name} className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-600/10"><Shield className="h-4 w-4 text-indigo-500" /></div>
                <div>
                  <h3 className="text-lg font-semibold">{role.name}</h3>
                  <p className="text-xs text-muted-foreground">{role.permissions?.length ?? 0} permissions · {role.users_count ?? 0} users</p>
                </div>
              </div>
            </div>
          )))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editUser ? "Edit User" : "Create User"}</h2>
              <button onClick={closeModal} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground">Name</label><input value={formName} onChange={e => setFormName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Email</label><input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Password {editUser && "(leave blank to keep)"}</label><input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Phone</label><input value={formPhone} onChange={e => setFormPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <select value={formRoleId} onChange={e => setFormRoleId(e.target.value ? Number(e.target.value) : "")} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Select role...</option>
                  {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={closeModal} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={handleSave} disabled={saveMutation.isPending} className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-50">
                {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                {editUser ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
