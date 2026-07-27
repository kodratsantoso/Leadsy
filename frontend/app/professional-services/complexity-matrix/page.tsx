"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Save, X } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

export default function ComplexityMatrixPage() {
  const [complexities, setComplexities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", multiplier: "1.0", description: "", is_active: true });

  useEffect(() => {
    loadComplexities();
  }, []);

  const loadComplexities = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/professional-services/complexities");
      const { data } = await res.json();
      setComplexities(data || []);
    } catch (error) {
      console.error("Failed to load complexities:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = complexities.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setEditForm({ name: c.name, multiplier: String(c.multiplier), description: c.description || "", is_active: c.is_active });
  };

  const saveEdit = async () => {
    try {
      if (editingId) {
        await apiFetch(`/professional-services/complexities/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        });
      } else {
        await apiFetch(`/professional-services/complexities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        });
      }
      setEditingId(null);
      loadComplexities();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Complexity Matrix</h1>
          <p className="text-muted-foreground text-sm">Manage effort multipliers for project complexity levels.</p>
        </div>
        <Button onClick={() => { setEditingId(0); setEditForm({ name: "", multiplier: "1.0", description: "", is_active: true }); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Complexity
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <CardTitle className="text-base font-semibold">Complexity Levels</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : (
            <div className="space-y-4">
              {editingId === 0 && (
                <div className="flex gap-2 items-center p-3 border rounded-lg bg-muted/20">
                  <Input placeholder="Name (e.g. Medium)" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-1/4" />
                  <Input type="number" step="0.1" placeholder="Multiplier (e.g. 1.2)" value={editForm.multiplier} onChange={e => setEditForm({...editForm, multiplier: e.target.value})} className="w-24" />
                  <Input placeholder="Description" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="flex-1" />
                  <Button size="sm" onClick={saveEdit}><Save className="h-4 w-4 mr-1" /> Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                </div>
              )}
              {filtered.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/30 transition-colors">
                  {editingId === c.id ? (
                    <div className="flex gap-2 items-center w-full">
                      <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-1/4" />
                      <Input type="number" step="0.1" value={editForm.multiplier} onChange={e => setEditForm({...editForm, multiplier: e.target.value})} className="w-24" />
                      <Input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="flex-1" />
                      <Button size="sm" onClick={saveEdit}><Save className="h-4 w-4 mr-1" /> Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{c.name}</span>
                          <Badge variant="outline" className="font-mono bg-[color:var(--brand)]/10 text-[color:var(--brand)] border-[color:var(--brand)]/30">x{c.multiplier}</Badge>
                          <Badge variant={c.is_active ? "brand" : "neutral"}>{c.is_active ? "Active" : "Inactive"}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{c.description || "No description provided."}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(c)}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {filtered.length === 0 && !loading && <p className="text-center text-muted-foreground py-8">No complexity levels found.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
