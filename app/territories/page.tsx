"use client";

import { useState } from "react";
import { MapPin, Plus, Search, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { TableWrapper, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/table";

export default function TerritoriesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [error, setError] = useState("");

  const [formName, setFormName] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [formRadius, setFormRadius] = useState("5000");

  const { data, isLoading } = useQuery({
    queryKey: ["territories"],
    queryFn: async () => { const r = await apiFetch("/territories"); return r.json(); },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editItem ? `/territories/${editItem.id}` : "/territories";
      const method = editItem ? "PUT" : "POST";
      const r = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { const err = await r.json(); throw new Error(err.message || "Save failed"); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["territories"] }); closeModal(); },
    onError: (e: any) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiFetch(`/territories/${id}`, { method: "DELETE" });
      if (!r.ok) { const err = await r.json(); throw new Error(err.message || "Delete failed"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["territories"] }); setDeleteConfirm(null); },
    onError: (e: any) => setError(e.message),
  });

  const openCreate = () => {
    setEditItem(null); setFormName(""); setFormLat(""); setFormLng(""); setFormRadius("5000");
    setError(""); setShowModal(true);
  };
  const openEdit = (t: any) => {
    setEditItem(t); setFormName(t.name || ""); setFormLat(String(t.center_lat || ""));
    setFormLng(String(t.center_lng || "")); setFormRadius(String(t.radius_meters || "5000"));
    setError(""); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditItem(null); setError(""); };

  const handleSave = () => {
    if (!formName.trim()) { setError("Name is required"); return; }
    if (!formLat || !formLng) { setError("Latitude and longitude are required"); return; }
    saveMutation.mutate({
      name: formName.trim(),
      center_lat: parseFloat(formLat),
      center_lng: parseFloat(formLng),
      radius_meters: parseInt(formRadius, 10),
    });
  };

  const territories: any[] = (data?.data || []).filter((t: any) =>
    t.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Territories</h1>
          <p className="text-sm text-muted-foreground">Geographic coverage zones for lead assignment</p>
        </div>
        <Button variant="brand" size="compact" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add Territory
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search territories…" className="pl-9" />
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--status-danger)]/30 bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] px-4 py-2 text-xs text-[var(--status-danger)]">
          {error}
          <button onClick={() => setError("")} className="ml-2 opacity-70 hover:opacity-100"><X className="inline h-3 w-3" /></button>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : territories.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-16 text-center text-xs text-muted-foreground">
          No territories yet. Create one to assign leads to geographic zones.
        </div>
      ) : (
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Center (Lat, Lng)</TableHeaderCell>
                <TableHeaderCell>Radius</TableHeaderCell>
                <TableHeaderCell>Created</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {territories.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)]/10">
                        <MapPin className="h-4 w-4 text-[var(--brand)]" />
                      </div>
                      <span className="font-medium">{t.name}</span>
                    </div>
                  </TableCell>
                  <TableCell muted><span className="font-mono">{t.center_lat?.toFixed(4)}, {t.center_lng?.toFixed(4)}</span></TableCell>
                  <TableCell>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                      {((t.radius_meters || 0) / 1000).toFixed(1)} km
                    </span>
                  </TableCell>
                  <TableCell muted>{t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(t)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(t)} className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--status-danger)]/10 hover:text-[var(--status-danger)]" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrapper>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editItem ? "Edit Territory" : "Create Territory"}
        size="md"
        footer={
          <>
            <Button variant="soft" size="compact" onClick={closeModal}>Cancel</Button>
            <Button variant="brand" size="compact" disabled={saveMutation.isPending} onClick={handleSave}>
              {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              {editItem ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        {error && <p className="rounded-lg bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] px-3 py-2 text-xs text-[var(--status-danger)]">{error}</p>}
        <div>
          <Label>Name *</Label>
          <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Jakarta Selatan" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Latitude *</Label>
            <Input type="number" step="any" value={formLat} onChange={e => setFormLat(e.target.value)} placeholder="-6.2146" />
          </div>
          <div>
            <Label>Longitude *</Label>
            <Input type="number" step="any" value={formLng} onChange={e => setFormLng(e.target.value)} placeholder="106.8451" />
          </div>
        </div>
        <div>
          <Label>Radius (meters)</Label>
          <Input type="number" min="100" max="50000" value={formRadius} onChange={e => setFormRadius(e.target.value)} />
          <p className="mt-0.5 text-[10px] text-muted-foreground">{(parseInt(formRadius || "0") / 1000).toFixed(1)} km · min 100m · max 50km</p>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => { setDeleteConfirm(null); setError(""); }}
        title="Delete Territory"
        size="sm"
        footer={
          <>
            <Button variant="soft" size="compact" onClick={() => { setDeleteConfirm(null); setError(""); }}>Cancel</Button>
            <Button variant="danger" size="compact" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteConfirm.id)}>
              {deleteMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <span className="font-semibold text-foreground">{deleteConfirm?.name}</span>?
        </p>
        <p className="text-xs text-muted-foreground">Leads assigned to this territory will lose their territory assignment.</p>
        {error && <p className="text-xs text-[var(--status-danger)]">{error}</p>}
      </Modal>
    </div>
  );
}
