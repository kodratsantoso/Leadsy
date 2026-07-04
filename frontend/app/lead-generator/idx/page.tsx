"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { ArrowLeft, Search, Loader2, Plus, CheckCircle, SearchCode, DatabaseBackup } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  TableShell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableEmpty,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export default function IdxGeneratorPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeSearch, setActiveSearch] = useState("");
  
  const [industry, setIndustry] = useState("");
  const [subIndustry, setSubIndustry] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch filters
  const { data: filters } = useQuery({
    queryKey: ["idx-filters"],
    queryFn: async () => {
      const res = await apiFetch(`/lead-generator/idx-companies/filters`);
      if (!res.ok) throw new Error("Failed to fetch filters");
      return res.json();
    },
  });

  // Fetch companies
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["idx-companies", activeSearch, industry, subIndustry, page],
    queryFn: async () => {
      let url = `/lead-generator/idx-companies?page=${page}&per_page=50`;
      if (activeSearch) url += `&keyword=${encodeURIComponent(activeSearch)}`;
      if (industry) url += `&industry=${encodeURIComponent(industry)}`;
      if (subIndustry) url += `&sub_industry=${encodeURIComponent(subIndustry)}`;
      
      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Failed to fetch IDX companies");
      return res.json();
    },
  });

  const importMutation = useMutation({
    mutationFn: async (companiesToImport: any[]) => {
      const res = await apiFetch(`/lead-generator/idx-companies/import`, {
        method: "POST",
        body: JSON.stringify({ companies: companiesToImport }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to import companies");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["idx-companies"] });
      setSelectedIds([]);
      alert(`Import complete: ${data.results.imported} imported, ${data.results.skipped} skipped.`);
    },
    onError: (err) => {
      alert(err.message);
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(search);
  };

  const handleRefreshCache = async () => {
    setIsRefreshing(true);
    try {
      await apiFetch(`/lead-generator/idx-companies?refresh=true`);
      queryClient.invalidateQueries({ queryKey: ["idx-companies"] });
      queryClient.invalidateQueries({ queryKey: ["idx-filters"] });
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const companies = data?.data || [];
  const meta = data?.meta;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const importable = companies.filter((c: any) => !c.is_duplicate).map((c: any) => c.idx_code);
      setSelectedIds(importable);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (idxCode: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, idxCode]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== idxCode));
    }
  };

  const handleBulkImport = () => {
    const selectedCompanies = companies.filter((c: any) => selectedIds.includes(c.idx_code));
    if (selectedCompanies.length > 0) {
      importMutation.mutate(selectedCompanies);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/lead-generator">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">IDX Public Companies</h1>
            <p className="text-sm text-muted-foreground">
              Search and import companies from Bursa Efek Indonesia as Leads.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleRefreshCache} disabled={isRefreshing}>
          <DatabaseBackup className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh Cache
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by Keyword, Ticker, or Company Name..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchCode className="mr-2 h-4 w-4" />}
              Search
            </Button>
          </form>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Industry</label>
              <Select 
                value={industry} 
                onChange={(e) => { setIndustry(e.target.value); setPage(1); }}
                placeholder="All Industries"
              >
                {filters?.industries?.map((ind: string) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Sub Industry</label>
              <Select 
                value={subIndustry} 
                onChange={(e) => { setSubIndustry(e.target.value); setPage(1); }}
                placeholder="All Sub Industries"
              >
                {filters?.sub_industries?.map((sind: string) => (
                  <option key={sind} value={sind}>{sind}</option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <div>
          {selectedIds.length > 0 && (
            <span className="text-sm text-muted-foreground font-medium">
              {selectedIds.length} selected
            </span>
          )}
        </div>
        <Button 
          onClick={handleBulkImport} 
          disabled={selectedIds.length === 0 || importMutation.isPending}
        >
          {importMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Add Selected to Leads
        </Button>
      </div>

      <TableShell>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell className="w-12">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 w-4 h-4"
                  onChange={handleSelectAll}
                  checked={companies.length > 0 && selectedIds.length === companies.filter((c:any)=>!c.is_duplicate).length && selectedIds.length > 0}
                />
              </TableHeaderCell>
              <TableHeaderCell>Ticker</TableHeaderCell>
              <TableHeaderCell>Company</TableHeaderCell>
              <TableHeaderCell>Sector / Board</TableHeaderCell>
              <TableHeaderCell>Industry</TableHeaderCell>
              <TableHeaderCell className="text-right">Action</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && companies.length === 0 ? (
              <TableEmpty colSpan={6}>
                <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                Loading...
              </TableEmpty>
            ) : isError ? (
              <TableEmpty colSpan={6}>
                <span className="text-destructive">Failed to load data. Ensure IDX dataset is cached.</span>
              </TableEmpty>
            ) : companies.length === 0 ? (
              <TableEmpty colSpan={6}>
                <div className="text-muted-foreground">No companies found matching your criteria.</div>
              </TableEmpty>
            ) : (
              companies.map((company: any) => (
                <TableRow key={company.idx_code}>
                  <TableCell>
                    <input 
                      type="checkbox"
                      className="rounded border-gray-300 w-4 h-4 disabled:opacity-50"
                      disabled={company.is_duplicate}
                      checked={selectedIds.includes(company.idx_code)}
                      onChange={(e) => handleSelect(company.idx_code, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Badge variant="outline">{company.idx_code}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">{company.company_name}</span>
                      {company.website && (
                        <a href={company.website} target="_blank" rel="noreferrer" className="text-xs text-[color:var(--brand)] hover:underline">
                          {company.website}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">{company.sector || '-'}</span>
                      <span className="text-xs text-muted-foreground">{company.listing_board}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">{company.industry || '-'}</span>
                      <span className="text-xs text-muted-foreground">{company.sub_industry}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {company.is_duplicate ? (
                      <Badge variant="success" className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                        In Leads
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => importMutation.mutate([company])}
                        disabled={importMutation.isPending}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableShell>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing page {meta.current_page} of {meta.last_page} ({meta.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= meta.last_page || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
