"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, FileText, ClipboardCheck, ArrowRight, MoreHorizontal, Copy, Pencil, Trash, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { getEstimationsByLead, PsEstimation } from "@/lib/api/professional-services";
import { useAuthStore } from "@/store/useAuthStore";
import { canAccessPath } from "@/lib/permissions";
import { apiFetch } from "@/lib/apiFetch";
export function ProfessionalServicesDashboard() {
  const [estimations, setEstimations] = useState<PsEstimation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    loadEstimations();
  }, []);

  const loadEstimations = async () => {
    try {
      setLoading(true);
      // Fetching all for the dashboard, could be paginated later
      const res = await apiFetch("/professional-services/estimations?per_page=50");
      const { data } = await res.json();
      setEstimations(data || []);
    } catch (error) {
      console.error("Failed to load estimations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEstimations = estimations.filter(est => 
    est.estimation_number.toLowerCase().includes(search.toLowerCase()) || 
    est.title.toLowerCase().includes(search.toLowerCase()) ||
    (est.lead?.company_name && est.lead.company_name.toLowerCase().includes(search.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "pm_reviewed": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "approved": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "converted_to_quotation": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "archived": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  // Summary Metrics
  const totalDraft = estimations.filter(e => e.status === 'draft').length;
  const totalReviewed = estimations.filter(e => e.status === 'pm_reviewed').length;
  const totalApproved = estimations.filter(e => e.status === 'approved' || e.status === 'converted_to_quotation').length;
  const totalManDays = estimations.reduce((sum, e) => sum + (e.total_final_mandays || 0), 0);
  const totalFee = estimations.reduce((sum, e) => sum + (e.total_estimated_fee || 0), 0);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Estimations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : estimations.length}</div>
            <p className="text-xs text-muted-foreground">All active records</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft & Reviewed</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : (totalDraft + totalReviewed)}</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : totalApproved}</div>
            <p className="text-xs text-muted-foreground">Ready for quotation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total ManDays</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : totalManDays.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Across all active estimations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline Fee</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{loading ? "..." : formatCurrency(totalFee, 'USD')}</div>
            <p className="text-xs text-muted-foreground">Across all active estimations</p>
          </CardContent>
        </Card>
      </div>

      {/* Estimations Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Estimations</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search estimations..."
                className="w-64 pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {canAccessPath('/professional-services/estimations/new', user) && (
              <Button onClick={() => window.location.href = "/professional-services/estimations/new"}>
                  <Plus className="mr-2 h-4 w-4" /> New Estimation
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Est. Number</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Title</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Lead / Customer</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Category</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">ManDays</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Fee</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {loading ? (
                    <tr><td colSpan={8} className="p-4 text-center"><span>...</span></td></tr>
                  ) : filteredEstimations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        No estimations found.
                      </td>
                    </tr>
                  ) : (
                    filteredEstimations.map((est) => (
                      <tr key={est.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4 align-middle font-medium">
                          <Link href={`/professional-services/estimations/${est.id}`} className="hover:underline text-[color:var(--brand)]">
                            {est.estimation_number}
                          </Link>
                        </td>
                        <td className="p-4 align-middle max-w-[200px] truncate" title={est.title}>{est.title}</td>
                        <td className="p-4 align-middle">{est.lead?.company_name || "-"}</td>
                        <td className="p-4 align-middle">{(est as any).category?.name || "-"}</td>
                        <td className="p-4 align-middle text-right">{est.total_final_mandays}</td>
                        <td className="p-4 align-middle text-right">{formatCurrency(est.total_estimated_fee, est.currency_code)}</td>
                        <td className="p-4 align-middle">
                          <Badge variant="neutral" className={getStatusColor(est.status)}>
                            {getStatusLabel(est.status)}
                          </Badge>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => window.location.href = `/professional-services/estimations/${est.id}`}>
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
