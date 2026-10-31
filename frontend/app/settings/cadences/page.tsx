"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  GitBranch, Plus, Search, MessageSquare, Mail, Phone, Clock, 
  Sparkles, CheckCircle2, AlertCircle, Loader2, Pencil, Trash2, 
  Play, Eye, ArrowRight, CheckSquare, Layers, ShieldCheck, ChevronRight 
} from "lucide-react";
import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/apiFetch";

interface CadenceStep {
  id?: number;
  step_number?: number;
  channel: "whatsapp" | "email" | "call_reminder" | "internal_task";
  delay_days: number;
  template_subject?: string;
  template_body: string;
  is_automated: boolean;
}

interface Cadence {
  id: number;
  name: string;
  description?: string;
  target_audience: string;
  trigger_type: "manual" | "lead_created" | "stage_change";
  is_active: boolean;
  steps: CadenceStep[];
  enrollments_count?: number;
  created_at?: string;
}

const CHANNEL_CONFIG = {
  whatsapp: {
    label: "WhatsApp",
    icon: MessageSquare,
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  email: {
    label: "Email",
    icon: Mail,
    badgeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
  call_reminder: {
    label: "Telepon",
    icon: Phone,
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  internal_task: {
    label: "Tugas Internal",
    icon: Clock,
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
};

const PRESET_B2B_INBOUND: CadenceStep[] = [
  {
    channel: "whatsapp",
    delay_days: 0,
    template_subject: "",
    template_body: "Halo Bapak/Ibu {{lead.pic_name}} dari {{lead.company_name}}, salam hangat dari Leadsy. Terima kasih atas ketertarikan Anda pada platform kami. Apakah ada waktu luang 10 menit minggu ini untuk diskusi singkat kebutuhan otomasi sales & CRM tim Anda?",
    is_automated: true,
  },
  {
    channel: "email",
    delay_days: 2,
    template_subject: "Solusi Leadsy CRM & AI Pipeline untuk {{lead.company_name}}",
    template_body: "Yth. Bapak/Ibu {{lead.pic_name}},\n\nMelanjutkan perkenalan kami sebelumnya, berikut kami lampirkan ringkasan solusi Leadsy dalam mengotomasi pipeline B2B dan WhatsApp CRM. Kami siap menjadwalkan demo singkat disesuaikan dengan kebutuhan alur sales di {{lead.company_name}}.\n\nSalam hangat,\nTim Leadsy",
    is_automated: false,
  },
  {
    channel: "call_reminder",
    delay_days: 2,
    template_subject: "",
    template_body: "Hubungi PIC {{lead.pic_name}} ({{lead.phone}}) untuk menanyakan penerimaan company deck dan konfirmasi jadwal product demo.",
    is_automated: false,
  },
  {
    channel: "whatsapp",
    delay_days: 3,
    template_subject: "",
    template_body: "Halo Bapak/Ibu {{lead.pic_name}}, kami ingin memastikan apakah ada hal spesifik yang ingin didiskusikan terkait deck kami sebelumnya. Kami siap membantu jika tim Anda memerlukan presentasi langsung.",
    is_automated: false,
  },
];

const PRESET_ENTERPRISE_ABM: CadenceStep[] = [
  {
    channel: "email",
    delay_days: 0,
    template_subject: "Peluang Optimasi Pipeline & Revenue Intelligence di {{lead.company_name}}",
    template_body: "Kepada Yth. Rekan Manajemen di {{lead.company_name}},\n\nKami mengamati pertumbuhan dan inisiatif digital tim Anda di industri saat ini. Leadsy membantu perusahaan enterprise mengoptimalkan konversi lead dan monitoring tim sales berbasis AI.\n\nApakah memungkinkan jika kita jadwalkan perkenalan singkat selama 15 menit minggu ini?\n\nSalam hangat,\nExecutive Team Leadsy",
    is_automated: false,
  },
  {
    channel: "whatsapp",
    delay_days: 2,
    template_subject: "",
    template_body: "Selamat pagi Bapak/Ibu {{lead.pic_name}}, saya izin menindaklanjuti email pengantar yang kami kirimkan ke {{lead.email}}. Kami sangat antusias untuk mendiskusikan peluang kolaborasi bersama {{lead.company_name}}.",
    is_automated: false,
  },
  {
    channel: "internal_task",
    delay_days: 3,
    template_subject: "",
    template_body: "Lakukan riset stakeholder kunci {{lead.company_name}} di LinkedIn dan siapkan case study industri sejenis untuk materi pertemuan.",
    is_automated: false,
  },
  {
    channel: "call_reminder",
    delay_days: 2,
    template_subject: "",
    template_body: "Panggilan telepon eksekutif ke PIC {{lead.pic_name}} untuk menawarkan sesi briefing singkat dan pendalaman use-case.",
    is_automated: false,
  },
];

export default function SalesCadencesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [triggerFilter, setTriggerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCadence, setEditingCadence] = useState<Cadence | null>(null);
  const [previewCadence, setPreviewCadence] = useState<Cadence | null>(null);
  const [deleteCadence, setDeleteCadence] = useState<Cadence | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("General B2B");
  const [triggerType, setTriggerType] = useState<"manual" | "lead_created" | "stage_change">("manual");
  const [steps, setSteps] = useState<CadenceStep[]>(PRESET_B2B_INBOUND);

  // Query all cadences
  const { data, isLoading } = useQuery({
    queryKey: ["sales-cadences-settings"],
    queryFn: async () => {
      const res = await apiFetch("/api/sales-cadences?active_only=0");
      return res.json();
    },
  });

  const cadences: Cadence[] = data?.data || [];

  // Filtered list
  const filteredCadences = cadences.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(search.toLowerCase()) ||
      c.target_audience.toLowerCase().includes(search.toLowerCase());

    const matchesTrigger = triggerFilter === "all" || c.trigger_type === triggerFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && c.is_active) ||
      (statusFilter === "inactive" && !c.is_active);

    return matchesSearch && matchesTrigger && matchesStatus;
  });

  const openCreateModal = () => {
    setEditingCadence(null);
    setName("");
    setDescription("");
    setTargetAudience("Inbound B2B Leads");
    setTriggerType("manual");
    setSteps(PRESET_B2B_INBOUND);
    setIsFormOpen(true);
  };

  const openEditModal = (cadence: Cadence) => {
    setEditingCadence(cadence);
    setName(cadence.name);
    setDescription(cadence.description || "");
    setTargetAudience(cadence.target_audience || "General B2B");
    setTriggerType(cadence.trigger_type || "manual");
    setSteps(
      cadence.steps && cadence.steps.length > 0
        ? cadence.steps.map((st) => ({
            channel: st.channel,
            delay_days: st.delay_days ?? 0,
            template_subject: st.template_subject || "",
            template_body: st.template_body || "",
            is_automated: Boolean(st.is_automated),
          }))
        : PRESET_B2B_INBOUND
    );
    setIsFormOpen(true);
  };

  // Add step
  const addStep = () => {
    setSteps([
      ...steps,
      {
        channel: "whatsapp",
        delay_days: 2,
        template_subject: "",
        template_body: "Halo Bapak/Ibu {{lead.pic_name}}, kami ingin mengonfirmasi kelanjutan diskusi...",
        is_automated: false,
      },
    ]);
  };

  // Remove step
  const removeStep = (idx: number) => {
    if (steps.length <= 1) {
      toast.error("Minimal 1 Langkah", "Cadence harus memiliki setidaknya satu tahapan interaksi.");
      return;
    }
    setSteps(steps.filter((_, i) => i !== idx));
  };

  // Update step field
  const updateStep = (idx: number, field: keyof CadenceStep, value: any) => {
    const updated = [...steps];
    updated[idx] = { ...updated[idx], [field]: value };
    setSteps(updated);
  };

  // Save Mutation (Create or Update)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description,
        target_audience: targetAudience,
        trigger_type: triggerType,
        steps,
      };

      const url = editingCadence ? `/api/sales-cadences/${editingCadence.id}` : "/api/sales-cadences";
      const method = editingCadence ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Gagal menyimpan Sales Cadence.");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast.success(
        editingCadence ? "Cadence Diperbarui" : "Cadence Dibuat",
        data.message || "Sales Cadence berhasil disimpan."
      );
      queryClient.invalidateQueries({ queryKey: ["sales-cadences-settings"] });
      queryClient.invalidateQueries({ queryKey: ["sales-cadences"] });
      setIsFormOpen(false);
    },
    onError: (err: any) => {
      toast.error("Gagal Menyimpan", err.message || "Terjadi kesalahan sistem saat menyimpan cadence.");
    },
  });

  // Toggle Active Mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const res = await apiFetch(`/api/sales-cadences/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-cadences-settings"] });
      queryClient.invalidateQueries({ queryKey: ["sales-cadences"] });
      toast.success("Status Berubah", "Status aktifasi cadence berhasil diperbarui.");
    },
    onError: (err: any) => {
      toast.error("Gagal", err.message || "Tidak dapat mengubah status cadence.");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/sales-cadences/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      toast.success("Dihapus", "Sales Cadence berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["sales-cadences-settings"] });
      queryClient.invalidateQueries({ queryKey: ["sales-cadences"] });
      setDeleteCadence(null);
    },
    onError: (err: any) => {
      toast.error("Gagal Menghapus", err.message || "Tidak dapat menghapus sales cadence.");
    },
  });

  // Calculate summary metrics
  const activeCount = cadences.filter((c) => c.is_active).length;
  const totalSteps = cadences.reduce((acc, c) => acc + (c.steps?.length || 0), 0);
  const avgSteps = cadences.length > 0 ? (totalSteps / cadences.length).toFixed(1) : "0";
  const totalEnrollments = cadences.reduce((acc, c) => acc + (c.enrollments_count || 0), 0);

  return (
    <div className="space-y-6 p-6 w-full max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <BackToSettings />
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-brand" />
            Sales Cadences & Sequence Automation
          </h1>
          <p className="text-sm text-muted-foreground">
            Konfigurasi alur outreach sistematis multi-channel (WhatsApp, Email, Telepon, Tugas Internal) untuk mengonversi lead.
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-brand text-white hover:bg-brand/90 gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Buat Cadence Baru
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Sequence</p>
            <div className="text-2xl font-bold text-foreground">{cadences.length}</div>
            <p className="text-[11px] text-muted-foreground">Template alur outreach terdaftar</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sequence Aktif</p>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</div>
            <p className="text-[11px] text-muted-foreground">Siap didaftarkan oleh sales</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Rata-rata Langkah</p>
            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{avgSteps} Touchpoints</div>
            <p className="text-[11px] text-muted-foreground">Interaksi per alur sekuens</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Lead Terdaftar</p>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalEnrollments} Leads</div>
            <p className="text-[11px] text-muted-foreground">Prospek dalam proses sequence</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama cadence, audiens, atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={triggerFilter}
            onChange={(e) => setTriggerFilter(e.target.value)}
            className="h-9 text-xs w-44"
          >
            <option value="all">Semua Trigger</option>
            <option value="manual">Manual Enrollment</option>
            <option value="lead_created">Otomatis Saat Lead Dibuat</option>
            <option value="stage_change">Otomatis Perubahan Stage</option>
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-xs w-36"
          >
            <option value="all">Semua Status</option>
            <option value="active">Hanya Aktif</option>
            <option value="inactive">Nonaktif</option>
          </Select>
        </div>
      </div>

      {/* Cadence List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
          <span>Memuat data Sales Cadence...</span>
        </div>
      ) : filteredCadences.length === 0 ? (
        <div className="text-center rounded-xl border border-dashed border-border p-12 bg-card/40">
          <GitBranch className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground">Tidak Ada Sales Cadence</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {search || triggerFilter !== "all" || statusFilter !== "all"
              ? "Tidak ada cadence yang sesuai dengan filter pencarian Anda."
              : "Belum ada Sales Cadence yang dibuat. Buat cadence baru untuk memulai otomasi multi-touch outreach tim Anda."}
          </p>
          <Button onClick={openCreateModal} className="mt-4 bg-brand text-white hover:bg-brand/90 gap-2">
            <Plus className="h-4 w-4" />
            Buat Cadence Sekarang
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCadences.map((cadence) => (
            <Card key={cadence.id} className="border-border/70 hover:border-brand/40 transition-all shadow-xs overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-base font-semibold text-foreground">{cadence.name}</span>
                      <Badge
                        variant={cadence.is_active ? "success" : "neutral"}
                        className={
                          cadence.is_active
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]"
                            : "text-muted-foreground text-[10px]"
                        }
                      >
                        {cadence.is_active ? "● Aktif" : "○ Nonaktif"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {cadence.trigger_type.replace("_", " ")}
                      </Badge>
                      <Badge variant="neutral" className="text-[10px]">
                        Target: {cadence.target_audience}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {cadence.description || "Tidak ada deskripsi rinci untuk cadence ini."}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewCadence(cadence)}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(cadence)}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleMutation.mutate({
                          id: cadence.id,
                          is_active: !cadence.is_active,
                        })
                      }
                      disabled={toggleMutation.isPending}
                      className="h-8 text-xs"
                    >
                      {cadence.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteCadence(cadence)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Steps Visual Timeline */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span className="font-medium text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-brand" />
                      Alur Interaksi ({cadence.steps?.length || 0} Langkah)
                    </span>
                    <span className="text-[11px]">
                      {cadence.enrollments_count || 0} Lead Terdaftar
                    </span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {cadence.steps && cadence.steps.length > 0 ? (
                      cadence.steps.map((st, idx) => {
                        const channelCfg = CHANNEL_CONFIG[st.channel] || CHANNEL_CONFIG.whatsapp;
                        const ChannelIcon = channelCfg.icon;
                        const isLast = idx === cadence.steps.length - 1;

                        return (
                          <div key={idx} className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-2 bg-muted/40 border border-border/80 px-2.5 py-1.5 rounded-lg text-xs">
                              <span className="font-bold text-[10px] text-muted-foreground">
                                #{st.step_number || idx + 1}
                              </span>
                              <div className={`p-1 rounded-md border ${channelCfg.badgeColor}`}>
                                <ChannelIcon className="h-3 w-3" />
                              </div>
                              <span className="font-medium text-foreground">{channelCfg.label}</span>
                              <span className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/50">
                                {st.delay_days === 0 ? "Hari ke-0" : `+${st.delay_days}h`}
                              </span>
                              {st.is_automated && (
                                <span className="text-[9px] text-brand font-semibold uppercase bg-brand/10 px-1 rounded">
                                  Auto
                                </span>
                              )}
                            </div>
                            {!isLast && <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Belum ada langkah yang diatur.</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cadence Form Modal (Create / Edit) */}
      <Modal
        open={isFormOpen}
        onOpenChange={(open) => !open && setIsFormOpen(false)}
        title={editingCadence ? "Edit Sales Cadence" : "Buat Sales Cadence Baru"}
        description="Rancang alur komunikasi prospek bertahap dengan template pesan dan jeda waktu otomatis."
        size="xl"
      >
        <div className="space-y-5 py-2">
          {/* Quick Preset Buttons (if creating new) */}
          {!editingCadence && (
            <div className="flex items-center gap-2 bg-muted/40 p-2.5 rounded-xl border border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-brand" /> Preset:
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setName("Standard B2B Inbound 7-Day Sequence");
                  setDescription("Alur outreach multi-touch 4-tahap (WhatsApp, Email, Telepon) untuk follow-up lead baru dalam 7 hari pertama.");
                  setTargetAudience("Inbound B2B Leads");
                  setTriggerType("manual");
                  setSteps(PRESET_B2B_INBOUND);
                }}
                className="text-xs h-7 gap-1"
              >
                Standard B2B Inbound (4 Langkah)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setName("Enterprise Outbound & ABM Cadence");
                  setDescription("Sekuens outreach terstruktur untuk prospek enterprise bernilai tinggi dengan email eksekutif dan riset akun.");
                  setTargetAudience("Enterprise & High-Value Deals");
                  setTriggerType("manual");
                  setSteps(PRESET_ENTERPRISE_ABM);
                }}
                className="text-xs h-7 gap-1"
              >
                Enterprise ABM (4 Langkah)
              </Button>
            </div>
          )}

          {/* Basic Cadence Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nama Cadence Sequence *</label>
              <Input
                placeholder="misal: Inbound High-Touch Follow Up"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Audiens *</label>
              <Input
                placeholder="misal: Enterprise B2B, SME Retail, dsb."
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Trigger Aktivasi</label>
              <Select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value as any)}
                className="text-xs"
              >
                <option value="manual">Manual Enrollment (Dipilih oleh Sales)</option>
                <option value="lead_created">Otomatis Saat Lead Dibuat</option>
                <option value="stage_change">Otomatis Saat Perubahan Stage</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Deskripsi Strategis</label>
              <Input
                placeholder="Tujuan atau panduan sekuens ini..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Sequential Step Builder */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <GitBranch className="h-4 w-4 text-brand" />
                  Tahapan Alur Interaksi ({steps.length} Langkah)
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tiap langkah mewakili satu touchpoint. Anda dapat menggunakan variabel seperti{" "}
                  <code className="text-brand">{"{{lead.pic_name}}"}</code>, <code className="text-brand">{"{{lead.company_name}}"}</code>.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addStep}
                className="text-xs h-8 gap-1.5 border-dashed border-brand/50 text-brand hover:bg-brand/5"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Langkah
              </Button>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {steps.map((st, idx) => {
                const channelCfg = CHANNEL_CONFIG[st.channel] || CHANNEL_CONFIG.whatsapp;
                const ChannelIcon = channelCfg.icon;

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-border bg-card/60 space-y-3 hover:border-brand/30 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-md bg-muted flex items-center justify-center font-bold text-[11px] text-foreground">
                          #{idx + 1}
                        </span>
                        <div className={`p-1 rounded-md border ${channelCfg.badgeColor}`}>
                          <ChannelIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">
                          Langkah {idx + 1}: {channelCfg.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={st.is_automated}
                            onChange={(e) => updateStep(idx, "is_automated", e.target.checked)}
                            className="rounded border-border text-brand focus:ring-brand/20 h-3.5 w-3.5"
                          />
                          <span>Eksekusi Otomatis (AI/Bot)</span>
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStep(idx)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[11px] text-muted-foreground font-medium">Channel Komunikasi</label>
                        <Select
                          value={st.channel}
                          onChange={(e) => updateStep(idx, "channel", e.target.value)}
                          className="text-xs h-8 mt-1"
                        >
                          <option value="whatsapp">WhatsApp Outreach</option>
                          <option value="email">Email Outreach</option>
                          <option value="call_reminder">Telepon (Reminder)</option>
                          <option value="internal_task">Tugas Internal Tim</option>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[11px] text-muted-foreground font-medium">Jeda Waktu (Hari)</label>
                        <Input
                          type="number"
                          min={0}
                          value={st.delay_days}
                          onChange={(e) => updateStep(idx, "delay_days", parseInt(e.target.value) || 0)}
                          placeholder="0 = Segera"
                          className="text-xs h-8 mt-1"
                        />
                      </div>

                      {st.channel === "email" ? (
                        <div>
                          <label className="text-[11px] text-muted-foreground font-medium">Subject Email</label>
                          <Input
                            value={st.template_subject || ""}
                            onChange={(e) => updateStep(idx, "template_subject", e.target.value)}
                            placeholder="Judul subjek email..."
                            className="text-xs h-8 mt-1"
                          />
                        </div>
                      ) : (
                        <div className="flex items-end pb-1 text-[11px] text-muted-foreground">
                          <span>
                            {st.delay_days === 0
                              ? "Dijalankan segera setelah terdaftar"
                              : `Dijalankan +${st.delay_days} hari setelah tahap sebelumnya`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium flex items-center justify-between">
                        <span>Pesan Template / Panduan Tugas *</span>
                        <span className="text-[10px] text-muted-foreground">
                          Variabel: {"{{lead.pic_name}}"}, {"{{lead.company_name}}"}, {"{{lead.phone}}"}
                        </span>
                      </label>
                      <textarea
                        value={st.template_body}
                        onChange={(e) => updateStep(idx, "template_body", e.target.value)}
                        rows={2}
                        placeholder="Ketik teks pesan WhatsApp, badan email, atau instruksi tugas sales di sini..."
                        className="w-full text-xs mt-1 p-2.5 rounded-lg border border-input bg-background focus:ring-1 focus:ring-brand outline-none resize-y"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFormOpen(false)}
              disabled={saveMutation.isPending}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={!name.trim() || steps.length === 0 || saveMutation.isPending}
              className="bg-brand text-white hover:bg-brand/90 gap-1.5"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {editingCadence ? "Simpan Perubahan" : "Simpan & Buat Cadence"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cadence Preview Modal */}
      {previewCadence && (
        <Modal
          open={Boolean(previewCadence)}
          onOpenChange={(open) => !open && setPreviewCadence(null)}
          title={`Preview Alur: ${previewCadence.name}`}
          description={`Target: ${previewCadence.target_audience} • Trigger: ${previewCadence.trigger_type}`}
          size="lg"
        >
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">{previewCadence.description}</p>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {previewCadence.steps?.map((st, idx) => {
                const channelCfg = CHANNEL_CONFIG[st.channel] || CHANNEL_CONFIG.whatsapp;
                const ChannelIcon = channelCfg.icon;

                return (
                  <div key={idx} className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground bg-muted px-1.5 py-0.5 rounded text-[11px]">
                          Tahap #{st.step_number || idx + 1}
                        </span>
                        <div className={`p-1 rounded-md border ${channelCfg.badgeColor}`}>
                          <ChannelIcon className="h-3 w-3" />
                        </div>
                        <span className="font-semibold text-foreground">{channelCfg.label}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {st.delay_days === 0 ? "Hari ke-0 (Segera)" : `+${st.delay_days} hari`}
                      </Badge>
                    </div>

                    {st.template_subject && (
                      <p className="text-xs font-medium text-foreground bg-muted/40 p-1.5 rounded">
                        <span className="text-muted-foreground font-normal">Subjek: </span>
                        {st.template_subject}
                      </p>
                    )}

                    <div className="text-xs text-foreground bg-background p-2.5 rounded-lg border border-border/70 whitespace-pre-line leading-relaxed">
                      {st.template_body}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span>Eksekusi: {st.is_automated ? "🤖 Otomatis (Bot/AI)" : "👤 Manual oleh Sales"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end pt-3 border-t border-border">
              <Button size="sm" onClick={() => setPreviewCadence(null)}>
                Tutup Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteCadence && (
        <ConfirmDialog
          open={Boolean(deleteCadence)}
          onOpenChange={(open) => !open && setDeleteCadence(null)}
          title="Hapus Sales Cadence?"
          description={
            <div className="space-y-2 text-xs">
              <p>
                Anda akan menghapus sequence <strong>{deleteCadence.name}</strong> secara permanen.
              </p>
              <p className="text-muted-foreground">
                Tindakan ini tidak dapat dibatalkan. Riwayat interaksi sebelumnya tidak akan terhapus.
              </p>
            </div>
          }
          confirmLabel="Hapus Cadence"
          cancelLabel="Batal"
          variant="danger"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteCadence.id)}
        />
      )}
    </div>
  );
}
