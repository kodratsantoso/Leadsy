'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Loader2, MapPin, Building2, X, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CreateNewModal } from '@/components/ui/CreateNewModal';
import { APIProvider, AdvancedMarker, Map } from '@vis.gl/react-google-maps';
import { useDebounce } from '@/hooks/useDebounce';

export function EditLeadModal({
  lead,
  open,
  onOpenChange,
  onSuccess
}: {
  lead: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const qc = useQueryClient();

  const [companyForm, setCompanyForm] = useState({
    company_name: '', brand: '', address: '', lat: '', lng: '',
    industry_id: '', sub_industry_id: '', phone: '', email: '', website: '',
    company_size_estimate: '', business_category_id: '', product_id: '',
    estimated_closing_amount: '', realized_closing_amount: '',
    source_type: '', channel_type_id: '', funnel_stage_id: '',
    qualification_status: '', parent_lead_id: '', meeting_link: '',
    owner_id: '', presales_owner_id: '', am_owner_id: '', csm_owner_id: ''
  });

  const [createNewModalConfig, setCreateNewModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    endpoint: string;
    additionalPayload?: Record<string, any>;
    onSuccess?: (newItem: any) => void;
  }>({ isOpen: false, title: '', endpoint: '' });

  // Map state
  const [locationSearch, setLocationSearch] = useState("");
  const [locationFeedback, setLocationFeedback] = useState("");
  const [locationCenter, setLocationCenter] = useState({ lat: -6.2088, lng: 106.8456 });

  // Parent lead search
  const [parentLeadSearch, setParentLeadSearch] = useState("");
  const debouncedParentSearch = useDebounce(parentLeadSearch, 300);

  useEffect(() => {
    if (open && lead) {
      setCompanyForm({
        company_name: lead.company_name || '',
        brand: lead.brand || '',
        address: lead.address || '',
        lat: lead.lat?.toString() || '',
        lng: lead.lng?.toString() || '',
        industry_id: lead.industry_id?.toString() || '',
        sub_industry_id: lead.sub_industry_id?.toString() || '',
        phone: lead.phone || '',
        email: lead.email || '',
        website: lead.website || '',
        company_size_estimate: lead.company_size_estimate || '',
        business_category_id: lead.business_category_id?.toString() || '',
        product_id: lead.product_id?.toString() || '',
        estimated_closing_amount: lead.estimated_closing_amount?.toString() || '',
        realized_closing_amount: lead.realized_closing_amount?.toString() || '',
        source_type: lead.sources?.[0]?.source_type || lead.source_type || '',
        channel_type_id: lead.sources?.[0]?.channel_type_id?.toString() || lead.channel_type_id?.toString() || '',
        funnel_stage_id: lead.funnel_stage_id?.toString() || '',
        qualification_status: lead.qualification_status || 'pending',
        parent_lead_id: lead.parent_lead_id?.toString() || '',
        meeting_link: lead.meeting_link || '',
        owner_id: lead.owner_id?.toString() || '',
        presales_owner_id: lead.presales_owner_id?.toString() || '',
        am_owner_id: lead.am_owner_id?.toString() || '',
        csm_owner_id: lead.csm_owner_id?.toString() || ''
      });
      setLocationSearch("");
      setLocationFeedback("");
      setParentLeadSearch("");
      if (lead.lat && lead.lng) {
        setLocationCenter({ lat: Number(lead.lat), lng: Number(lead.lng) });
      }
    }
  }, [open, lead]);

  // Queries
  const { data: publicSettingsData } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => apiFetch('/settings/public').then((r) => r.json()),
    enabled: open
  });
  const mapsApiKey = publicSettingsData?.data?.google_maps_api_key || "";
  const mapsEnabled = publicSettingsData?.data?.features?.google_maps_enabled ?? false;

  const { data: businessCategoriesData } = useQuery({
    queryKey: ['business-categories'],
    queryFn: () => apiFetch('/business-categories').then(res => res.json()),
    enabled: open
  });
  const { data: industriesData } = useQuery({
    queryKey: ['industries'],
    queryFn: () => apiFetch('/industries').then((r) => r.json()),
    enabled: open
  });
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch('/products').then((r) => r.json()),
    enabled: open
  });
  const { data: leadSourcesData } = useQuery({
    queryKey: ['lead-source-types'],
    queryFn: () => apiFetch('/settings/lead-sources').then((r) => r.json()),
    enabled: open
  });
  const { data: funnelStagesData } = useQuery({
    queryKey: ['funnel-stages'],
    queryFn: () => apiFetch('/funnel/stages').then((r) => r.json()),
    enabled: open
  });
  const { data: assignableUsersData } = useQuery({
    queryKey: ['lead-assignable-users'],
    queryFn: () => apiFetch('/leads/assignable-users').then((r) => r.json()),
    enabled: open
  });

  const { data: parentLeadSearchData, isFetching: parentLeadSearching } = useQuery({
    queryKey: ['leads-search', debouncedParentSearch],
    queryFn: () => apiFetch(`/leads?search=${encodeURIComponent(debouncedParentSearch)}&per_page=5`).then((r) => r.json()),
    enabled: open && debouncedParentSearch.length >= 2,
  });

  const allIndustries: any[] = industriesData?.data ?? [];
  const products: any[] = productsData?.data ?? [];
  const businessCategories: any[] = businessCategoriesData?.data ?? [];
  const leadSources: any[] = leadSourcesData?.data ?? [];
  const funnelStages: any[] = funnelStagesData?.data ?? [];
  const assignableUsers = assignableUsersData?.data || { sales: [], presales: [], am: [], csm: [] };
  const parentLeadResults = parentLeadSearchData?.data || [];
  
  const activeLeadSources = leadSources.filter((s: any) => s.is_active);
  const activeLeadChannels = activeLeadSources.flatMap((s: any) =>
    (s.channels ?? []).filter((c: any) => c.is_active).map((c: any) => ({ ...c, source_slug: s.slug }))
  );
  const selectedLeadChannels = activeLeadChannels.filter((c: any) =>
    !companyForm.source_type || c.source_slug === companyForm.source_type
  );
  const selectedIndustrySubIndustries: any[] =
    allIndustries.find((i: any) => String(i.id) === companyForm.industry_id)?.sub_industries ?? [];

  // Mutations
  const updateLeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiFetch(`/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Failed to update lead (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      onSuccess?.();
      onOpenChange(false);
    }
  });

  const submitCompanyInfo = () => {
    updateLeadMutation.mutate({
      company_name: companyForm.company_name.trim(),
      brand: companyForm.brand.trim() || null,
      address: companyForm.address.trim() || null,
      lat: companyForm.lat ? Number(companyForm.lat) : null,
      lng: companyForm.lng ? Number(companyForm.lng) : null,
      industry_id: companyForm.industry_id ? Number(companyForm.industry_id) : null,
      sub_industry_id: companyForm.sub_industry_id ? Number(companyForm.sub_industry_id) : null,
      phone: companyForm.phone.trim() || null,
      email: companyForm.email.trim() || null,
      website: companyForm.website.trim() || null,
      company_size_estimate: companyForm.company_size_estimate || null,
      business_category_id: companyForm.business_category_id || null,
      product_id: companyForm.product_id ? Number(companyForm.product_id) : null,
      estimated_closing_amount: companyForm.estimated_closing_amount ? Number(companyForm.estimated_closing_amount) : null,
      realized_closing_amount: companyForm.realized_closing_amount ? Number(companyForm.realized_closing_amount) : null,
      source_type: companyForm.source_type || null,
      channel_type_id: companyForm.channel_type_id ? Number(companyForm.channel_type_id) : null,
      funnel_stage_id: companyForm.funnel_stage_id ? Number(companyForm.funnel_stage_id) : null,
      qualification_status: companyForm.qualification_status || null,
      parent_lead_id: companyForm.parent_lead_id ? Number(companyForm.parent_lead_id) : null,
      meeting_link: companyForm.meeting_link.trim() || null,
      owner_id: companyForm.owner_id ? Number(companyForm.owner_id) : null,
      presales_owner_id: companyForm.presales_owner_id ? Number(companyForm.presales_owner_id) : null,
      am_owner_id: companyForm.am_owner_id ? Number(companyForm.am_owner_id) : null,
      csm_owner_id: companyForm.csm_owner_id ? Number(companyForm.csm_owner_id) : null,
    });
  };

  const handleLocationSearch = async () => {
    const query = locationSearch.trim() || companyForm.address.trim() || companyForm.company_name.trim();
    if (!query) {
      setLocationFeedback("Enter an address or company location to search.");
      return;
    }
    setLocationFeedback("Searching location...");
    try {
      const response = await apiFetch(`/maps/geocode?query=${encodeURIComponent(query)}`);
      const json = await response.json();
      if (!response.ok || !json?.data) {
        setLocationFeedback(json?.error || "Location not found.");
        return;
      }
      setCompanyForm((current) => ({
        ...current,
        lat: String(json.data.lat),
        lng: String(json.data.lng),
        address: current.address || json.data.formatted_address || ""
      }));
      setLocationCenter({ lat: json.data.lat, lng: json.data.lng });
      setLocationFeedback("Location selected.");
    } catch {
      setLocationFeedback("Error searching location.");
    }
  };

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="Edit Lead Information"
        description="Update all lead details — company info, sales data, and relationship."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitCompanyInfo}
              disabled={updateLeadMutation.isPending || !companyForm.company_name.trim()}
            >
              {updateLeadMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {updateLeadMutation.isError && (
            <Badge variant="danger" className="justify-start rounded-lg px-3 py-2 text-left">
              {updateLeadMutation.error?.message}
            </Badge>
          )}
          
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">1. Company & Attributes</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Company Name <span className="text-[var(--status-danger)]">*</span>
                </label>
                <Input
                  value={companyForm.company_name}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, company_name: e.target.value }))}
                  placeholder="e.g. PT. Asahimas Flat Glass"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Brand
                </label>
                <Input
                  value={companyForm.brand}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, brand: e.target.value }))}
                  placeholder="e.g. Asahimas"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Address</label>
                <textarea
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Full address"
                  rows={2}
                  className="min-h-[60px] w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-[var(--brand)] focus-visible:ring-3 focus-visible:ring-[color:var(--brand)]/15"
                />
              </div>

              <div className="sm:col-span-2 space-y-3 rounded-xl border border-border bg-[color:var(--surface-subtle)] p-3">
                <div className="flex flex-col gap-2 md:flex-row">
                  <Input
                    value={locationSearch}
                    onChange={(event) => setLocationSearch(event.target.value)}
                    placeholder="Search address, building, or area"
                  />
                  <Button type="button" onClick={handleLocationSearch}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Search Location
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {locationFeedback ? <Badge variant="info">{locationFeedback}</Badge> : null}
                  <span className="text-xs text-muted-foreground">
                    {companyForm.lat && companyForm.lng
                      ? `${companyForm.lat}, ${companyForm.lng}`
                      : "No coordinates selected"}
                  </span>
                </div>
                <div className="h-[180px] overflow-hidden rounded-xl border border-border bg-background">
                  {mapsEnabled && mapsApiKey ? (
                    <APIProvider apiKey={mapsApiKey}>
                      <Map
                        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"}
                        center={locationCenter}
                        defaultCenter={locationCenter}
                        defaultZoom={companyForm.lat && companyForm.lng ? 15 : 11}
                        gestureHandling="greedy"
                      >
                        {companyForm.lat && companyForm.lng ? (
                          <AdvancedMarker position={locationCenter}>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-[color:var(--brand)] text-white shadow-lg">
                              <MapPin className="h-4 w-4" />
                            </div>
                          </AdvancedMarker>
                        ) : null}
                      </Map>
                    </APIProvider>
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                      Maps unavailable. Configure Google Maps API Key in Public Settings.
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Industry</label>
                <Select
                  value={companyForm.industry_id}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setCreateNewModalConfig({
                        isOpen: true,
                        title: 'Create New Industry',
                        endpoint: '/industries',
                        onSuccess: (newItem) => {
                          qc.invalidateQueries({ queryKey: ['industries'] });
                          setCompanyForm((f) => ({ ...f, industry_id: String(newItem.id), sub_industry_id: '' }));
                        }
                      });
                    } else {
                      setCompanyForm((f) => ({ ...f, industry_id: e.target.value, sub_industry_id: '' }));
                    }
                  }}
                  placeholder="— Select industry —"
                >
                  {allIndustries.map((ind: any) => (
                    <option key={ind.id} value={String(ind.id)}>{ind.name}</option>
                  ))}
                  <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Sub-Industry</label>
                <Select
                  value={companyForm.sub_industry_id}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setCreateNewModalConfig({
                        isOpen: true,
                        title: 'Create New Sub-Industry',
                        endpoint: `/industries/${companyForm.industry_id}/sub-industries`,
                        onSuccess: (newItem) => {
                          qc.invalidateQueries({ queryKey: ['industries'] });
                          setCompanyForm((f) => ({ ...f, sub_industry_id: String(newItem.id) }));
                        }
                      });
                    } else {
                      setCompanyForm((f) => ({ ...f, sub_industry_id: e.target.value }));
                    }
                  }}
                  placeholder="— Select sub-industry —"
                  disabled={!companyForm.industry_id}
                >
                  {selectedIndustrySubIndustries.map((sub: any) => (
                    <option key={sub.id} value={String(sub.id)}>{sub.name}</option>
                  ))}
                  {companyForm.industry_id && (
                    <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
                  )}
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Company Size</label>
                <Select
                  value={companyForm.company_size_estimate}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, company_size_estimate: e.target.value }))}
                  placeholder="— Select size —"
                >
                  <option value="1-10">1–10 employees</option>
                  <option value="11-50">11–50 employees</option>
                  <option value="51-200">51–200 employees</option>
                  <option value="201-500">201–500 employees</option>
                  <option value="501-1000">501–1,000 employees</option>
                  <option value="1000+">1,000+ employees</option>
                </Select>
              </div>
              
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Business Category</label>
                <Select
                  value={companyForm.business_category_id}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setCreateNewModalConfig({
                        isOpen: true,
                        title: 'Create New Business Category',
                        endpoint: '/business-categories',
                        onSuccess: (newItem) => {
                          qc.invalidateQueries({ queryKey: ['business-categories'] });
                          setCompanyForm((f) => ({ ...f, business_category_id: String(newItem.id) }));
                        }
                      });
                    } else {
                      setCompanyForm((f) => ({ ...f, business_category_id: e.target.value }));
                    }
                  }}
                  placeholder="— Select category —"
                >
                  {businessCategories.map((cat: any) => (
                    <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                  ))}
                  <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">2. Contact Info</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone</label>
                <Input
                  type="tel"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+62 31 7882383"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="info@company.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Website</label>
                <Input
                  type="url"
                  value={companyForm.website}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://www.company.com"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">3. Sales & Status</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Initial Product</label>
                <Select
                  value={companyForm.product_id}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setCreateNewModalConfig({
                        isOpen: true,
                        title: 'Create New Product',
                        endpoint: '/products',
                        onSuccess: (newItem) => {
                          qc.invalidateQueries({ queryKey: ['products'] });
                          setCompanyForm((f) => ({ ...f, product_id: String(newItem.id) }));
                        }
                      });
                    } else {
                      setCompanyForm((f) => ({ ...f, product_id: e.target.value }));
                    }
                  }}
                  placeholder="— Select product —"
                >
                  {products.map((p: any) => (
                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                  ))}
                  <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Funnel Stage</label>
                <Select
                  value={companyForm.funnel_stage_id}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setCreateNewModalConfig({
                        isOpen: true,
                        title: 'Create New Funnel Stage',
                        endpoint: '/funnel/stages',
                        onSuccess: (newItem) => {
                          qc.invalidateQueries({ queryKey: ['funnel-stages'] });
                          setCompanyForm((f) => ({ ...f, funnel_stage_id: String(newItem.id) }));
                        }
                      });
                    } else {
                      setCompanyForm((f) => ({ ...f, funnel_stage_id: e.target.value }));
                    }
                  }}
                  placeholder="— Unassigned —"
                >
                  {funnelStages.map((stage: any) => (
                    <option key={stage.id} value={String(stage.id)}>{stage.name}</option>
                  ))}
                  <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
                </Select>
              </div>
              
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Qualification</label>
                <Select
                  value={companyForm.qualification_status}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, qualification_status: e.target.value }))}
                  placeholder="— Status —"
                >
                  <option value="pending">Pending</option>
                  <option value="eligible">Eligible</option>
                  <option value="potential">Potential</option>
                  <option value="not_eligible">Not Eligible</option>
                </Select>
              </div>
              
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Lead Source</label>
                <Select
                  value={companyForm.source_type}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setCreateNewModalConfig({
                        isOpen: true,
                        title: 'Create New Lead Source',
                        endpoint: '/settings/lead-sources',
                        onSuccess: (newItem) => {
                          qc.invalidateQueries({ queryKey: ['lead-source-types'] });
                          setCompanyForm((f) => ({ ...f, source_type: newItem.slug, channel_type_id: '' }));
                        }
                      });
                    } else {
                      setCompanyForm((f) => ({ ...f, source_type: e.target.value, channel_type_id: '' }));
                    }
                  }}
                  placeholder="— Select source —"
                >
                  {activeLeadSources.map((src: any) => (
                    <option key={src.id} value={src.slug}>{src.name}</option>
                  ))}
                  <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
                </Select>
              </div>
              
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Meeting Link (Lark)</label>
                <Input
                  value={companyForm.meeting_link}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, meeting_link: e.target.value }))}
                  placeholder="https://vc.larksuite.com/minutes/..."
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">4. Ownership Roles</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Sales Owner</label>
                <Select
                  value={companyForm.owner_id}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, owner_id: e.target.value }))}
                  placeholder="— Unassigned Sales (Lead Pool) —"
                >
                  {assignableUsers.sales?.map((u: any) => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                  {!assignableUsers.sales && <option value="" disabled>Loading users...</option>}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Presales Owner</label>
                <Select
                  value={companyForm.presales_owner_id}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, presales_owner_id: e.target.value }))}
                  placeholder="— Unassigned Presales —"
                >
                  {assignableUsers.presales?.map((u: any) => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Account Manager</label>
                <Select
                  value={companyForm.am_owner_id}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, am_owner_id: e.target.value }))}
                  placeholder="— Unassigned AM —"
                >
                  {assignableUsers.am?.map((u: any) => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">CSM Owner</label>
                <Select
                  value={companyForm.csm_owner_id}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, csm_owner_id: e.target.value }))}
                  placeholder="— Unassigned CSM —"
                >
                  {assignableUsers.csm?.map((u: any) => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">5. Group Company</p>
            <div className="grid gap-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Subsidiary of (Parent Company)</label>
              {companyForm.parent_lead_id ? (
                <div className="flex items-center gap-2 rounded-lg border border-[var(--brand)]/30 bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] px-3 py-2">
                  <Building2 className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <span className="flex-1 text-sm font-medium">
                    {parentLeadResults.find((r: any) => String(r.id) === companyForm.parent_lead_id)?.company_name
                      ?? lead?.parentLead?.company_name
                      ?? `Lead #${companyForm.parent_lead_id}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setCompanyForm(f => ({ ...f, parent_lead_id: '' })); setParentLeadSearch(''); }}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={parentLeadSearch}
                    onChange={(e) => setParentLeadSearch(e.target.value)}
                    placeholder="Search company name…"
                    className="pl-9"
                  />
                  {parentLeadSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {parentLeadResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                      {parentLeadResults
                        .filter((r: any) => String(r.id) !== String(lead?.id))
                        .map((r: any) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => { setCompanyForm(f => ({ ...f, parent_lead_id: String(r.id) })); setParentLeadSearch(''); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                          >
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {r.company_name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Tandai lead ini sebagai anak perusahaan (subsidiary) dari perusahaan lain.</p>
            </div>
          </div>
          
        </div>
      </Modal>

      <CreateNewModal
        isOpen={createNewModalConfig.isOpen}
        onClose={() => setCreateNewModalConfig(c => ({ ...c, isOpen: false }))}
        title={createNewModalConfig.title}
        endpoint={createNewModalConfig.endpoint}
        additionalPayload={createNewModalConfig.additionalPayload}
        onSuccess={createNewModalConfig.onSuccess || (() => {})}
      />
    </>
  );
}
