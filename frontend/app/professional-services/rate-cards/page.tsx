"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Coins } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

export default function RateCardsPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/professional-services/config");
      const { data } = await res.json();
      setRoles(data.roles || []);
    } catch (error) {
      console.error("Failed to load roles and rate cards:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rate Cards & Roles</h1>
          <p className="text-muted-foreground text-sm">Manage roles and their daily billing rates.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Role / Rate
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">Loading...</div>
        ) : roles.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg bg-muted/10">
            No roles found.
          </div>
        ) : (
          roles.map(role => (
            <Card key={role.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{role.name}</CardTitle>
                  <Badge variant={role.is_active ? "brand" : "neutral"}>{role.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{role.description || "No description"}</p>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5" /> Rate Cards
                </h4>
                {role.rate_cards?.length > 0 ? (
                  role.rate_cards.map((rate: any) => (
                    <div key={rate.id} className="flex justify-between items-center bg-muted/30 rounded p-2 text-sm">
                      <span className="font-medium text-[color:var(--brand)]">{formatCurrency(rate.daily_rate, rate.currency_code)}</span>
                      <Badge variant="outline" className="text-[10px]">/ day</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">No rate cards defined.</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
