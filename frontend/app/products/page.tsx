"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Package,
  Loader2,
  Pencil,
  Trash2,
  Layers,
  Globe,
  Tag,
  Building2,
  CheckCircle2,
  X,
  List,
  LayoutGrid,
  ExternalLink,
  DollarSign,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FilterBarSearch } from "@/components/ui/filter-bar";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import {
  TableShell,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/table";
import { ProductLogoUploader } from "@/components/products/ProductLogoUploader";
import { apiFetch } from "@/lib/apiFetch";

type ProductRecord = {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  status?: string | null;
  website_url?: string | null;
  logo_path?: string | null;
  logo_url?: string | null;
  target_industry?: string | null;
  target_buyer_persona?: string | null;
  starting_price?: number | null;
  tiers_count?: number;
  tiers?: any[];
};

function ProductCardLogo({
  productId,
  logoUrl,
  logoPath,
  name,
}: {
  productId: number;
  logoUrl?: string | null;
  logoPath?: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  const src =
    logoUrl ||
    (logoPath ? `/api/products/${productId}/logo?v=${encodeURIComponent(logoPath)}` : null);

  if (!src || failed) {
    return <Package className="h-5 w-5 text-primary" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className="h-full w-full object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formWebsiteUrl, setFormWebsiteUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<ProductRecord | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await apiFetch("/products");
      return response.json();
    },
  });

  const rawProducts: ProductRecord[] = data?.data ?? [];
  const categoriesList: string[] = data?.categories ?? [];

  // Unique categories derived from list or data
  const categories = Array.from(
    new Set(
      categoriesList.length > 0
        ? categoriesList
        : (rawProducts.map((p) => p.category?.trim()).filter(Boolean) as string[])
    )
  );

  const createMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      category?: string;
      website_url?: string;
      description?: string;
      logoFile?: File | null;
    }) => {
      const { logoFile, ...productPayload } = payload;
      const res = await apiFetch("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productPayload),
      });
      const data = await res.json();
      const newId = data?.data?.id;

      // If a brand logo was selected in the create modal, upload it right away
      if (newId && logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        await apiFetch(`/products/${newId}/logo`, {
          method: "POST",
          body: formData,
        });
      }

      return data;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setShowCreateModal(false);
      setPendingLogoFile(null);
      if (res.data?.id) {
        router.push(`/products/${res.data.id}`);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setDeleteProduct(null);
    },
  });

  // Filter products by search, category, status
  const filteredProducts = rawProducts.filter((product) => {
    const term = search.toLowerCase();
    const matchSearch =
      !search ||
      product.name?.toLowerCase().includes(term) ||
      product.description?.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term);

    const matchCategory =
      selectedCategory === "all" ||
      product.category?.toLowerCase() === selectedCategory.toLowerCase();

    const matchStatus =
      selectedStatus === "all" ||
      (product.status || "active").toLowerCase() === selectedStatus.toLowerCase();

    return matchSearch && matchCategory && matchStatus;
  });

  const activeProductsCount = rawProducts.filter((p) => (p.status || "active") === "active").length;
  const totalTiersCount = rawProducts.reduce((sum, p) => {
    const count = p.tiers_count ?? (p.tiers ? p.tiers.length : 0);
    return sum + count;
  }, 0);

  const handleCreate = () => {
    if (!formName.trim()) return;
    createMutation.mutate({
      name: formName.trim(),
      category: formCategory.trim() || undefined,
      website_url: formWebsiteUrl.trim() || undefined,
      description: formDescription.trim() || undefined,
      logoFile: pendingLogoFile,
    });
  };

  const formatPrice = (price?: number | null) => {
    if (price === undefined || price === null) return null;
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products & Solutions</h1>
          <p className="text-sm text-muted-foreground">
            Manage your solution catalog, brand logos, pricing tiers, and commercial document settings.
          </p>
        </div>
        <Button
          onClick={() => {
            setFormName("");
            setFormCategory("");
            setFormWebsiteUrl("");
            setFormDescription("");
            setPendingLogoFile(null);
            setShowCreateModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Products
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
              {rawProducts.length}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Catalog master list</div>
          </div>
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active in CRM
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-0.5">
              {activeProductsCount}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {rawProducts.length > 0
                ? `${Math.round((activeProductsCount / rawProducts.length) * 100)}% available`
                : "No active products"}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Categories
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
              {categories.length}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Solution clusters</div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted text-muted-foreground">
            <Tag className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pricing Packages
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
              {totalTiersCount}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Active tier offerings</div>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar & View Switcher */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex-1">
            <FilterBarSearch
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products by name, description, or category..."
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories ({rawProducts.length})</option>
              {categories.map((cat) => {
                const count = rawProducts.filter((p) => p.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                );
              })}
            </Select>
          </div>
          <div className="w-full sm:w-40">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </Select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 border border-border rounded-xl p-1 bg-card shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
              title="Tampilkan List View (Tabel)"
            >
              <List className="h-4 w-4" />
              <span className="hidden md:inline">List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
              title="Tampilkan Grid View (Cards)"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden md:inline">Grid</span>
            </button>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(selectedCategory !== "all" || selectedStatus !== "all" || search.trim()) && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
            <span>Active filters:</span>
            {selectedCategory !== "all" && (
              <Badge variant="neutral" className="gap-1 pl-2 pr-1.5 py-0.5">
                <span className="max-w-[220px] truncate">{selectedCategory}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className="rounded-full hover:bg-muted p-0.5 text-muted-foreground hover:text-foreground"
                  title="Remove category filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedStatus !== "all" && (
              <Badge variant="neutral" className="gap-1 pl-2 pr-1.5 py-0.5">
                <span>{selectedStatus === "active" ? "Active Only" : "Inactive Only"}</span>
                <button
                  type="button"
                  onClick={() => setSelectedStatus("all")}
                  className="rounded-full hover:bg-muted p-0.5 text-muted-foreground hover:text-foreground"
                  title="Remove status filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {search.trim() && (
              <Badge variant="neutral" className="gap-1 pl-2 pr-1.5 py-0.5">
                <span className="max-w-[150px] truncate">"{search}"</span>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded-full hover:bg-muted p-0.5 text-muted-foreground hover:text-foreground"
                  title="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                setSelectedStatus("all");
                setSearch("");
              }}
              className="text-xs text-primary hover:underline ml-1 font-medium"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* Main Content: List or Grid */}
      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">Loading products...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-16 text-center space-y-3">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <div className="font-semibold text-base text-foreground">No products found</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search || selectedCategory !== "all" || selectedStatus !== "all"
                ? "No products match the selected filters. Try resetting the search or category."
                : "Your catalog is empty. Add your first product to configure pricing tiers and AI matching."}
            </p>
            {(search || selectedCategory !== "all" || selectedStatus !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("all");
                  setSelectedStatus("all");
                }}
              >
                Reset Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        /* ================= LIST VIEW (TABLE) ================= */
        <TableShell>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell className="w-[38%]">Produk & Brand</TableHeaderCell>
                <TableHeaderCell className="w-[20%]">Kategori & Industri</TableHeaderCell>
                <TableHeaderCell className="w-[18%]">Paket & Harga</TableHeaderCell>
                <TableHeaderCell className="w-[10%]">Status</TableHeaderCell>
                <TableHeaderCell className="w-[14%] text-right">Aksi</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map((product) => {
                const tiersCount = product.tiers_count ?? (product.tiers ? product.tiers.length : 0);
                const startingPrice =
                  product.starting_price ??
                  (product.tiers && product.tiers.length > 0
                    ? Math.min(...product.tiers.map((t: any) => t.price || 0))
                    : null);

                return (
                  <TableRow key={product.id} className="group hover:bg-muted/40 transition-colors">
                    {/* Produk & Logo */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 border border-border/80 overflow-hidden p-1 shadow-2xs">
                          <ProductCardLogo
                            productId={product.id}
                            logoUrl={product.logo_url}
                            logoPath={product.logo_path}
                            name={product.name}
                          />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/products/${product.id}`}
                            className="font-semibold text-foreground hover:text-primary transition-colors block truncate hover:underline"
                            title={product.name}
                          >
                            {product.name}
                          </Link>
                          {product.description ? (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {product.description}
                            </p>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60 italic">
                              Tidak ada deskripsi
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Kategori & Industri */}
                    <TableCell>
                      <div className="space-y-1">
                        {product.category ? (
                          <Badge variant="neutral" className="text-[11px] font-medium">
                            {product.category}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                        {product.target_industry && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{product.target_industry}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Paket & Harga */}
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{tiersCount > 0 ? `${tiersCount} Packages` : "No tiers"}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {startingPrice !== null ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Mulai {formatPrice(startingPrice)}/bln
                            </span>
                          ) : (
                            <span className="text-muted-foreground/70">Harga belum diatur</span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant={(product.status || "active") === "active" ? "success" : "neutral"}
                        className="uppercase text-[10px] px-2 py-0.5"
                      >
                        {product.status || "Active"}
                      </Badge>
                    </TableCell>

                    {/* Aksi */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-medium"
                          onClick={() => router.push(`/products/${product.id}`)}
                          title="Buka detail product"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Detail
                        </Button>

                        <a
                          href={`/products/${product.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Buka di Tab Baru"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 border-border/70"
                          onClick={() => setDeleteProduct(product)}
                          title="Hapus Produk"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableShell>
      ) : (
        /* ================= GRID VIEW (CARDS) ================= */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const tiersCount = product.tiers_count ?? (product.tiers ? product.tiers.length : 0);
            const startingPrice =
              product.starting_price ??
              (product.tiers && product.tiers.length > 0
                ? Math.min(...product.tiers.map((t: any) => t.price || 0))
                : null);

            return (
              <Card
                key={product.id}
                className="flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-border/70 group"
              >
                <div className="flex flex-1 flex-col p-5 space-y-4">
                  {/* Top Bar: Logo / Avatar & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/60 border border-border/60 overflow-hidden p-1 shadow-2xs">
                        <ProductCardLogo
                          productId={product.id}
                          logoUrl={product.logo_url}
                          logoPath={product.logo_path}
                          name={product.name}
                        />
                      </div>
                      <div>
                        {product.category && (
                          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                            {product.category}
                          </span>
                        )}
                        <Link
                          href={`/products/${product.id}`}
                          className="font-bold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors hover:underline"
                        >
                          {product.name}
                        </Link>
                      </div>
                    </div>
                    <Badge
                      variant={(product.status || "active") === "active" ? "success" : "neutral"}
                      className="shrink-0 uppercase text-[10px] px-2 py-0.5"
                    >
                      {product.status || "Active"}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[34px]">
                    {product.description || "No product description provided."}
                  </p>

                  {/* Pricing & Tiers Info */}
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      <span>{tiersCount > 0 ? `${tiersCount} Packages` : "No tiers"}</span>
                    </div>
                    {startingPrice !== null ? (
                      <span className="font-semibold text-foreground">
                        From {formatPrice(startingPrice)}/mo
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">Pricing unconfigured</span>
                    )}
                  </div>

                  {/* Meta Tags (Website / Industry) */}
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                    {product.website_url && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Globe className="h-3 w-3 shrink-0" />
                        <span className="truncate">{product.website_url.replace(/^https?:\/\//, "")}</span>
                      </span>
                    )}
                    {product.target_industry && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{product.target_industry}</span>
                      </span>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-border flex items-center gap-2 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 font-medium text-xs"
                      onClick={() => router.push(`/products/${product.id}`)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Manage Details
                    </Button>

                    <a
                      href={`/products/${product.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="Buka di Tab Baru"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 border-border/50 shrink-0 h-8 w-8 p-0"
                      onClick={() => setDeleteProduct(product)}
                      title="Delete Product"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteProduct}
        onOpenChange={(isOpen) => !isOpen && setDeleteProduct(null)}
        title="Delete Product"
        description="Are you sure you want to delete this product? All configured tiers and sales guidelines will be permanently removed."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteProduct(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteProduct && deleteMutation.mutate(deleteProduct.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm font-semibold p-4 bg-muted/50 rounded-lg border border-border">
          {deleteProduct?.name}
        </p>
      </Modal>

      {/* Enhanced Create Modal */}
      <Modal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        title="Add New Product"
        description="Configure your solution details and brand logo. You can set up AI reference materials and pricing tiers in the next step."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !formName.trim()}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create & Proceed
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Logo Staging Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Product Logo (Opsional)</label>
            <ProductLogoUploader
              productName={formName || "Product Baru"}
              onPendingFileChange={setPendingLogoFile}
              compact
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Product Name *</label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Lark Suite, Sales CRM Pro, AWS Cloud"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Category</label>
              <Input
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="e.g. Collaboration, ERP, AI"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Website URL (Optional)</label>
              <Input
                value={formWebsiteUrl}
                onChange={(e) => setFormWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                type="url"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Short Description</label>
            <Textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief description of what this product solves..."
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
