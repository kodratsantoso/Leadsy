"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Shield, ToggleLeft, ToggleRight, Trash2, Upload, KeyRound, ShieldAlert, Layers, Package, Users as UsersIcon, Briefcase, MessageSquare, Bot, Sliders, History, MapPin, ChevronDown, ChevronRight, SlidersHorizontal, CheckCircle2, ShieldCheck, Target, Coins, Building2, Tags, Receipt } from "lucide-react";

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
  is_locked?: boolean;
  lockout_reason?: string | null;
  role?: AppRole | null;
  role_id?: number | null;
  tier_level?: string | null;
  title?: string | null;
  signature_path?: string | null;
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
  title: string;
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
  title: "",
};

const roleFormDefaults: RoleFormState = {
  name: "",
  display_name: "",
  description: "",
  permissions: [],
};

const MODULE_METADATA: Record<string, { label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  leads: {
    label: "Leads & Sales Pipeline",
    description: "Prospek B2B, kualifikasi otomatis, profiling AI, import/export, dan deduplikasi",
    icon: Layers,
  },
  products: {
    label: "Product Catalog",
    description: "Katalog produk dan solusi bisnis, spesifikasi teknis, dan perbandingan",
    icon: Package,
  },
  users: {
    label: "Users & Roles RBAC",
    description: "Manajemen akun pengguna, struktur hierarki tim, dan penetapan role",
    icon: UsersIcon,
  },
  professional_services: {
    label: "Professional Services (PSA)",
    description: "Estimasi biaya proyek, rate card, persetujuan bertingkat, dan actual tracking",
    icon: Briefcase,
  },
  whatsapp: {
    label: "WhatsApp Communication",
    description: "Interaksi chat pelanggan via WhatsApp Web personal dan Mekari Qontak API",
    icon: MessageSquare,
  },
  ai: {
    label: "AI Intelligence & Copilot",
    description: "Konfigurasi engine LLM, prompt templates, testing console, dan monitoring",
    icon: Bot,
  },
  integrations: {
    label: "Integrations & System Settings",
    description: "Koneksi sistem eksternal (Lark, Mekari Sign, Webhooks, Search Engine)",
    icon: Sliders,
  },
  audit: {
    label: "Audit Logs & Governance",
    description: "Pelacakan riwayat aktivitas pengguna, perubahan data, dan log keamanan",
    icon: History,
  },
  maps: {
    label: "Maps & Territory",
    description: "Visualisasi spasial sebaran lead, radius kantor, dan pemetaan teritori",
    icon: MapPin,
  },
  targets: {
    label: "Target Revenue & KPI",
    description: "Target pendapatan sales, alokasi kuota, metrik KPI per role, dan monitoring capaian",
    icon: Target,
  },
  incentives: {
    label: "Collaborative Incentives",
    description: "Kebijakan insentif kolaboratif departemen (Sales, SA, CSM, PSC) dan approval pool",
    icon: Coins,
  },
  company: {
    label: "Company & Document Settings",
    description: "Informasi entitas legal, rekening bank, format penomoran seri dokumen (QT, SO, INV, BAST)",
    icon: Building2,
  },
  taxonomy: {
    label: "CRM Taxonomy & Pipelines",
    description: "Pengaturan master sumber prospek (lead sources), channel type, dan tahapan sales stage",
    icon: Tags,
  },
  finance: {
    label: "Finance & Tax Codes (O2C)",
    description: "Pengaturan mata uang default tenant, kode pajak PPN, withholding tax PPh, dan aturan item",
    icon: Receipt,
  },
};

const MODULE_TIER_PRESETS: Record<string, { view: string[]; edit: string[]; manage: string[] }> = {
  leads: {
    view: ["leads.view"],
    edit: ["leads.view", "leads.create", "leads.edit"],
    manage: ["leads.view", "leads.create", "leads.edit", "leads.delete", "leads.export", "leads.merge", "leads.ai_profiling"],
  },
  products: {
    view: ["products.view"],
    edit: ["products.view", "products.edit"],
    manage: ["products.view", "products.edit"],
  },
  users: {
    view: ["users.view"],
    edit: ["users.view"],
    manage: ["users.view", "users.manage"],
  },
  targets: {
    view: ["targets.view"],
    edit: ["targets.view", "targets.edit"],
    manage: ["targets.view", "targets.edit", "targets.manage"],
  },
  incentives: {
    view: [],
    edit: ["incentives.manage"],
    manage: ["incentives.manage"],
  },
  company: {
    view: [],
    edit: ["company.manage"],
    manage: ["company.manage"],
  },
  taxonomy: {
    view: [],
    edit: ["taxonomy.manage"],
    manage: ["taxonomy.manage"],
  },
  finance: {
    view: [],
    edit: ["finance.manage"],
    manage: ["finance.manage"],
  },
  professional_services: {
    view: ["professional_services.view"],
    edit: ["professional_services.view", "professional_services.create", "professional_services.edit"],
    manage: [
      "professional_services.view",
      "professional_services.create",
      "professional_services.edit",
      "professional_services.delete",
      "professional_services.review",
      "professional_services.approve",
      "professional_services.manage_templates",
      "professional_services.manage_rates",
      "professional_services.manage_complexity",
    ],
  },
  whatsapp: {
    view: ["whatsapp.personal"],
    edit: ["whatsapp.personal", "whatsapp.qontak"],
    manage: ["whatsapp.personal", "whatsapp.qontak", "whatsapp.manage"],
  },
  ai: {
    view: [],
    edit: ["ai.manage"],
    manage: ["ai.manage", "ai_testing.manage"],
  },
  integrations: {
    view: [],
    edit: ["integrations.manage"],
    manage: ["integrations.manage"],
  },
  audit: {
    view: ["audit.view"],
    edit: ["audit.view"],
    manage: ["audit.view"],
  },
  maps: {
    view: ["maps.view"],
    edit: ["maps.view"],
    manage: ["maps.view"],
  },
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

  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  const getStorageUrl = (path?: string | null) => {
    if (!path) return "";
    return `/storage/${path}`;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    isDrawing.current = true;
    const rect = canvas.getBoundingClientRect();
    
    let x, y;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a"; // Slate 900
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [deleteRole, setDeleteRole] = useState<AppRole | null>(null);
  const [roleForm, setRoleForm] = useState<RoleFormState>(roleFormDefaults);
  const [roleError, setRoleError] = useState("");
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const toggleExpandModule = (moduleKey: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleKey]: !prev[moduleKey],
    }));
  };

  const getModuleTier = (
    moduleKey: string,
    modulePerms: RolePermission[],
    selectedIds: number[]
  ): "none" | "view" | "edit" | "manage" | "custom" => {
    const activePermIds = modulePerms.map((p) => p.id).filter((id) => selectedIds.includes(id));
    if (activePermIds.length === 0) return "none";
    if (activePermIds.length === modulePerms.length) return "manage";

    const presets = MODULE_TIER_PRESETS[moduleKey];
    if (!presets) return "custom";

    const activeNames = new Set(
      modulePerms.filter((p) => selectedIds.includes(p.id)).map((p) => p.name)
    );

    const matchSet = (arr: string[]) => {
      if (arr.length === 0) return activeNames.size === 0;
      return arr.length === activeNames.size && arr.every((name) => activeNames.has(name));
    };

    if (matchSet(presets.manage)) return "manage";
    if (matchSet(presets.edit)) return "edit";
    if (matchSet(presets.view)) return "view";

    return "custom";
  };

  const setModuleTier = (
    moduleKey: string,
    tier: "none" | "view" | "edit" | "manage",
    modulePerms: RolePermission[]
  ) => {
    const modulePermIds = modulePerms.map((p) => p.id);
    const presets = MODULE_TIER_PRESETS[moduleKey];

    let targetNames: string[] = [];
    if (tier === "manage") {
      targetNames = modulePerms.map((p) => p.name);
    } else if (tier === "edit") {
      targetNames = presets?.edit || modulePerms.map((p) => p.name);
    } else if (tier === "view") {
      targetNames = presets?.view || (modulePerms[0] ? [modulePerms[0].name] : []);
    } else {
      targetNames = [];
    }

    const targetIds = modulePerms.filter((p) => targetNames.includes(p.name)).map((p) => p.id);

    setRoleForm((current) => {
      const remainingIds = current.permissions.filter((id) => !modulePermIds.includes(id));
      return {
        ...current,
        permissions: Array.from(new Set([...remainingIds, ...targetIds])),
      };
    });
  };

  const setAllModulesTier = (tier: "none" | "view" | "manage") => {
    if (tier === "none") {
      setRoleForm((current) => ({ ...current, permissions: [] }));
      return;
    }
    if (tier === "manage") {
      setRoleForm((current) => ({
        ...current,
        permissions: permissions.map((p) => p.id),
      }));
      return;
    }
    if (tier === "view") {
      const viewIds: number[] = [];
      Object.entries(permissionsByModule).forEach(([modKey, modPerms]) => {
        const presets = MODULE_TIER_PRESETS[modKey];
        const viewNames = presets?.view || (modPerms[0] ? [modPerms[0].name] : []);
        modPerms.forEach((p) => {
          if (viewNames.includes(p.name)) viewIds.push(p.id);
        });
      });
      setRoleForm((current) => ({ ...current, permissions: viewIds }));
    }
  };

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

  const unlockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiFetch(`/users/${userId}/unlock`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Gagal membuka kunci akun");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setFeedback(data.message || "Akses akun berhasil dipulihkan (unlocked).");
    },
    onError: (err: Error) => {
      setFeedback(`Gagal unlock: ${err.message}`);
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
      title: user.title || "",
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
      title: userForm.title || null,
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.name}</p>
                          {user.title && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">{user.title}</span>}
                        </div>
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
                      {user.is_locked ? (
                        <Badge variant="warning" className="gap-1">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Terkunci (Lockout)
                        </Badge>
                      ) : (
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
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(user.is_locked || !user.is_active) && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => unlockUserMutation.mutate(user.id)}
                            disabled={unlockUserMutation.isPending}
                            tooltip="Buka Kunci Akun (1-Click)"
                            className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                          >
                            {unlockUserMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <KeyRound className="h-4 w-4" />
                            )}
                          </Button>
                        )}
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
            setIsDrawingMode(false);
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
            <label className="text-sm font-medium">Job Title (Signatory Designation)</label>
            <Input
              value={userForm.title}
              onChange={(event) =>
                setUserForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Account Manager, Sales Director"
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

          {editingUser && (
            <div className="grid gap-2 border-t pt-4">
              <label className="text-sm font-medium">Authorized Signature</label>
              
              {!isDrawingMode ? (
                <>
                  <div className="h-20 w-full border border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-slate-50 relative p-2">
                    {editingUser.signature_path ? (
                      <img src={getStorageUrl(editingUser.signature_path)} className="max-h-full max-w-full object-contain" alt="Signature Preview" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">No Signature Uploaded</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <label className="flex-1">
                      <span className="w-full inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/95 h-9 rounded-md text-sm font-medium cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" /> Upload Signature
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/png, image/jpeg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && editingUser) {
                            const fd = new FormData();
                            fd.append("signature", file);
                            apiFetch(`/users/${editingUser.id}/signature`, {
                              method: "POST",
                              body: fd,
                            }).then(async (r) => {
                              if (r.ok) {
                                queryClient.invalidateQueries({ queryKey: ["users"] });
                                const updatedUser = (await r.json()).data;
                                setEditingUser(updatedUser);
                              }
                            });
                          }
                        }}
                      />
                    </label>
                    <Button variant="outline" className="flex-1 h-9 rounded-md text-sm font-medium" onClick={() => setIsDrawingMode(true)}>
                      Draw Signature
                    </Button>
                    {editingUser.signature_path && (
                      <Button
                        variant="outline"
                        className="h-9 w-9 p-0 flex items-center justify-center rounded-md"
                        onClick={() => {
                          apiFetch(`/users/${editingUser.id}/signature`, { method: "DELETE" }).then((r) => {
                            if (r.ok) {
                              queryClient.invalidateQueries({ queryKey: ["users"] });
                              setEditingUser(curr => curr ? { ...curr, signature_path: null } : null);
                            }
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="bg-white border rounded-lg h-40 w-full cursor-crosshair touch-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="xs"
                      className="flex-1 text-xs"
                      onClick={() => {
                        const canvas = canvasRef.current;
                        if (canvas) {
                          canvas.toBlob((blob) => {
                            if (blob && editingUser) {
                              const file = new File([blob], "signature.png", { type: "image/png" });
                              const fd = new FormData();
                              fd.append("signature", file);
                              apiFetch(`/users/${editingUser.id}/signature`, {
                                method: "POST",
                                body: fd,
                              }).then(async (r) => {
                                if (r.ok) {
                                  queryClient.invalidateQueries({ queryKey: ["users"] });
                                  const updatedUser = (await r.json()).data;
                                  setEditingUser(updatedUser);
                                  setIsDrawingMode(false);
                                }
                              });
                            }
                          }, "image/png");
                        }
                      }}
                    >
                      Save Signature
                    </Button>
                    <Button variant="outline" size="xs" className="text-xs" onClick={clearCanvas}>
                      Clear
                    </Button>
                    <Button variant="ghost" size="xs" className="text-xs" onClick={() => setIsDrawingMode(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
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
            setExpandedModules({});
          }
        }}
        title={editingRole ? `Edit Role: ${editingRole.display_name}` : "Create New Role"}
        description="Kelola informasi role dan konfigurasi hak akses granular berdasarkan modul sistem Leadsy."
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setRoleModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={submitRole} disabled={saveRoleMutation.isPending}>
              {saveRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingRole ? "Simpan Perubahan Role" : "Buat Role Baru"}
            </Button>
          </>
        }
      >
        <div className="grid gap-6">
          {roleError ? <Badge variant="danger">{roleError}</Badge> : null}

          {/* Role Basic Info */}
          <div className="grid gap-4 rounded-xl border border-border bg-[color:var(--surface-subtle)] p-4">
            <div className="grid gap-4 md:grid-cols-2">
              {!editingRole ? (
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Role Slug (ID Sistem)
                  </label>
                  <Input
                    placeholder="misal: sales_specialist"
                    value={roleForm.name}
                    onChange={(event) =>
                      setRoleForm((current) => ({
                        ...current,
                        name: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                      }))
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">Identifier unik internal role (lowercase, tanpa spasi).</p>
                </div>
              ) : null}

              <div className={cn("grid gap-1.5", editingRole && "md:col-span-2")}>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nama Tampilan Role (Display Name)
                </label>
                <Input
                  placeholder="misal: Solution Architect Manager"
                  value={roleForm.display_name}
                  onChange={(event) =>
                    setRoleForm((current) => ({ ...current, display_name: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Deskripsi Tanggung Jawab & Lingkup Role
              </label>
              <Textarea
                rows={2}
                placeholder="Jelaskan peran tugas dan kewenangan operasional dari role ini..."
                value={roleForm.description}
                onChange={(event) =>
                  setRoleForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
          </div>

          {/* Grouped Access Control Section */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Hak Akses Berdasarkan Modul (Access Control Matrix)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Tentukan level kewenangan akses per modul menggunakan dropdown, atau klik Detail untuk konfigurasi granular.
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground mr-1">Terapkan Cepat:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="text-[11px] h-7 px-2"
                  onClick={() => setAllModulesTier("none")}
                >
                  Semua: None
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="text-[11px] h-7 px-2"
                  onClick={() => setAllModulesTier("view")}
                >
                  Semua: View
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="text-[11px] h-7 px-2"
                  onClick={() => setAllModulesTier("manage")}
                >
                  Semua: Manage
                </Button>
              </div>
            </div>

            {/* Modules Table / Rows */}
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {Object.entries(permissionsByModule).map(([moduleKey, modulePerms]) => {
                const meta = MODULE_METADATA[moduleKey] || {
                  label: moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1),
                  description: `Hak akses untuk modul ${moduleKey}`,
                  icon: Sliders,
                };
                const IconComponent = meta.icon;
                const currentTier = getModuleTier(moduleKey, modulePerms, roleForm.permissions);
                const activeCount = modulePerms.filter((p) => roleForm.permissions.includes(p.id)).length;
                const isExpanded = Boolean(expandedModules[moduleKey]);

                return (
                  <div key={moduleKey} className="transition-colors hover:bg-muted/30">
                    <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                      {/* Left info */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--brand-subtle)] text-[color:var(--brand)]">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground truncate">
                              {meta.label}
                            </span>
                            {currentTier === "none" && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground border-border px-1.5 py-0">
                                None
                              </Badge>
                            )}
                            {currentTier === "view" && (
                              <Badge variant="info" className="text-[10px] px-1.5 py-0">
                                View Only
                              </Badge>
                            )}
                            {currentTier === "edit" && (
                              <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                View & Edit
                              </Badge>
                            )}
                            {currentTier === "manage" && (
                              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                                Full Manage
                              </Badge>
                            )}
                            {currentTier === "custom" && (
                              <Badge variant="neutral" className="text-[10px] px-1.5 py-0">
                                Kustom ({activeCount}/{modulePerms.length})
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {meta.description}
                          </p>
                        </div>
                      </div>

                      {/* Right actions: Dropdown + Expand button */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <div className="w-48">
                          <Select
                            size="sm"
                            value={currentTier}
                            onChange={(e) => {
                              const val = e.target.value as "none" | "view" | "edit" | "manage";
                              setModuleTier(moduleKey, val, modulePerms);
                            }}
                          >
                            <option value="none">None (Tidak Ada Akses)</option>
                            <option value="view">View (Hanya Lihat)</option>
                            <option value="edit">Edit (Lihat & Edit)</option>
                            <option value="manage">Manage (Kelola Penuh)</option>
                            {currentTier === "custom" && (
                              <option value="custom" disabled>
                                Kustom ({activeCount} aktif)
                              </option>
                            )}
                          </Select>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => toggleExpandModule(moduleKey)}
                        >
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )}
                          />
                          <span>{isExpanded ? "Tutup" : "Detail"}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Granular Checkboxes Drawer */}
                    {isExpanded && (
                      <div className="border-t border-border/60 bg-[color:var(--surface-subtle)]/70 p-3.5">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            Izin granular modul {meta.label} ({activeCount} dari {modulePerms.length} aktif):
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="text-[11px] text-[color:var(--brand)] hover:underline"
                              onClick={() => setModuleTier(moduleKey, "manage", modulePerms)}
                            >
                              Pilih Semua
                            </button>
                            <span className="text-[11px] text-muted-foreground">•</span>
                            <button
                              type="button"
                              className="text-[11px] text-muted-foreground hover:underline"
                              onClick={() => setModuleTier(moduleKey, "none", modulePerms)}
                            >
                              Kosongkan
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                          {modulePerms.map((permission) => {
                            const isChecked = roleForm.permissions.includes(permission.id);
                            return (
                              <label
                                key={permission.id}
                                className={cn(
                                  "flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors cursor-pointer select-none",
                                  isChecked
                                    ? "border-[color:var(--brand)] bg-card shadow-xs"
                                    : "border-border/70 bg-background/80 hover:border-border"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleRolePermission(permission.id)}
                                  className="mt-0.5 rounded border-gray-300 text-[color:var(--brand)] focus:ring-[color:var(--brand)]"
                                />
                                <div className="min-w-0 space-y-0.5">
                                  <span className="block text-xs font-medium text-foreground truncate">
                                    {permission.display_name}
                                  </span>
                                  <span className="block text-[10px] text-muted-foreground font-mono truncate">
                                    {permission.name}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
