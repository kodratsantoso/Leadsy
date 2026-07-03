"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { ArrowLeft, Building2, Search, Loader2, Plus, CheckCircle, SearchCode } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  const { data, isLoading, isError } = useQuery({
    queryKey: ["idx-companies", activeSearch, page],
    queryFn: async () => {
      const res = await apiFetch(`/lead-generator/idx-companies?search=${activeSearch}&page=${page}&per_page=50`);
      if (!res.ok) throw new Error("Failed to fetch IDX companies");
      return res.json();
    },
  });

  const importMutation = useMutation({
    mutationFn: async (company: any) => {
      const res = await apiFetch(`/lead-generator/idx-companies/import`, {
        method: "POST",
        body: JSON.stringify(company),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to import company");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["idx-companies"] });
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

  const companies = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 p-6">
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

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by Kode Emiten or Company Name..."
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
        </CardContent>
      </Card>

      <TableShell>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Ticker</TableHeaderCell>
              <TableHeaderCell>Company</TableHeaderCell>
              <TableHeaderCell>Sector</TableHeaderCell>
              <TableHeaderCell>Industry</TableHeaderCell>
              <TableHeaderCell className="text-right">Action</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && companies.length === 0 ? (
              <TableEmpty colSpan={5}>
                <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                Loading...
              </TableEmpty>
            ) : isError ? (
              <TableEmpty colSpan={5}>
                <span className="text-red-500">Failed to load data. Ensure IDX dataset is seeded.</span>
              </TableEmpty>
            ) : companies.length === 0 ? (
              <TableEmpty colSpan={5}>
                No companies found.
              </TableEmpty>
            ) : (
              companies.map((company: any) => (
                <TableRow key={company.KodeEmiten}>
                  <TableCell className="font-medium">
                    <Badge variant="outline">{company.KodeEmiten}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">{company.NamaEmiten}</span>
                      {company.Website && (
                        <span className="text-xs text-muted-foreground">{company.Website}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{company.Sektor}</TableCell>
                  <TableCell>{company.Industri}</TableCell>
                  <TableCell className="text-right">
                    {company.is_imported ? (
                      <Badge variant="success" className="px-3 py-1">
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                        Imported
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => importMutation.mutate(company)}
                        disabled={importMutation.isPending && importMutation.variables?.KodeEmiten === company.KodeEmiten}
                      >
                        {importMutation.isPending && importMutation.variables?.KodeEmiten === company.KodeEmiten ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Import Lead
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
