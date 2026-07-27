"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Search, Layers } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/professional-services/templates");
      const { data } = await res.json();
      setTemplates(data || []);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estimation Templates</h1>
          <p className="text-muted-foreground text-sm">Manage standardized project scope templates.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">Loading...</div>
        ) : templates.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg bg-muted/10">
            No templates found. Create one to standardise estimation scopes.
          </div>
        ) : (
          templates.map(t => (
            <Card key={t.id} className="hover:border-primary/50 transition-colors flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <div className="mt-1">
                  <Badge variant="outline">{t.service_category?.name || "General"}</Badge>
                  {!t.is_active && <Badge variant="neutral" className="ml-2">Inactive</Badge>}
                </div>
              </CardHeader>
              <CardContent className="pb-4 flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">{t.description}</p>
                <div className="mt-4 flex items-center text-xs text-muted-foreground">
                  <Layers className="h-3.5 w-3.5 mr-1" />
                  {t.components?.length || 0} components
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
