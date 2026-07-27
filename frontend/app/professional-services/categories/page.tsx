"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash, Save, X } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", is_active: true });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/professional-services/categories");
      const { data } = await res.json();
      setCategories(data || []);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const startEdit = (cat: any) => {
    setEditingId(cat.id);
    setEditForm({ name: cat.name, description: cat.description || "", is_active: cat.is_active });
  };

  const saveEdit = async () => {
    try {
      if (editingId) {
        await apiFetch(`/professional-services/categories/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        });
      } else {
        await apiFetch(`/professional-services/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        });
      }
      setEditingId(null);
      loadCategories();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Categories</h1>
          <p className="text-muted-foreground text-sm">Manage professional service categories.</p>
        </div>
        <Button onClick={() => { setEditingId(0); setEditForm({ name: "", description: "", is_active: true }); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <CardTitle className="text-base font-semibold">Categories</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search categories..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : (
            <div className="space-y-4">
              {editingId === 0 && (
                <div className="flex gap-2 items-center p-3 border rounded-lg bg-muted/20">
                  <Input placeholder="Name" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-1/3" />
                  <Input placeholder="Description" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="flex-1" />
                  <Button size="sm" onClick={saveEdit}><Save className="h-4 w-4 mr-1" /> Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                </div>
              )}
              {filtered.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/30 transition-colors">
                  {editingId === cat.id ? (
                    <div className="flex gap-2 items-center w-full">
                      <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-1/3" />
                      <Input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="flex-1" />
                      <Button size="sm" onClick={saveEdit}><Save className="h-4 w-4 mr-1" /> Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{cat.name}</span>
                          <Badge variant={cat.is_active ? "brand" : "neutral"}>{cat.is_active ? "Active" : "Inactive"}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{cat.description || "No description provided."}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(cat)}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {filtered.length === 0 && !loading && <p className="text-center text-muted-foreground py-8">No categories found.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
