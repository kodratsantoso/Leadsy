'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { 
  Key, Shield, CheckCircle2, AlertCircle, RefreshCw, 
  ExternalLink, Copy, Check, Globe, Users, Plus, Trash2 
} from 'lucide-react';

interface EnterpriseSsoSettingsProps {
  tenantId?: number;
}

const PROVIDERS = [
  { id: 'azure_ad', name: 'Microsoft Entra ID (Azure AD)', icon: '🏢' },
  { id: 'okta', name: 'Okta Enterprise SSO', icon: '🔑' },
  { id: 'google_workspace', name: 'Google Workspace Enterprise', icon: '🌐' },
  { id: 'saml_generic', name: 'SAML 2.0 Generic Provider', icon: '🛡️' },
];

export function EnterpriseSsoSettings({ tenantId = 1 }: EnterpriseSsoSettingsProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [activeProvider, setActiveProvider] = useState<string>('azure_ad');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [issuerUrl, setIssuerUrl] = useState('');
  const [entityId, setEntityId] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [domains, setDomains] = useState<string[]>(['@perusahaan.co.id']);
  const [autoProvision, setAutoProvision] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  // Group-to-role mappings
  const [roleMappings, setRoleMappings] = useState<Array<{ group: string; role: string }>>([
    { group: 'IT-Enterprise-Admins', role: 'admin' },
    { group: 'Presales-Architects', role: 'presales' },
    { group: 'Commercial-Sales-Team', role: 'sales' },
  ]);
  const [newGroup, setNewGroup] = useState('');
  const [newRole, setNewRole] = useState('sales');

  // Fetch configs
  const { data: configsData, isLoading } = useQuery({
    queryKey: ['tenant-sso-config', tenantId],
    queryFn: async () => {
      const res = await apiFetch(`/api/tenants/${tenantId}/sso-config`);
      return res.json();
    },
  });

  useEffect(() => {
    if (configsData?.data) {
      const existing = configsData.data.find((c: any) => c.provider === activeProvider);
      if (existing) {
        setClientId(existing.client_id || '');
        setIssuerUrl(existing.issuer_url || '');
        setEntityId(existing.entity_id || '');
        setDomains(existing.domain_whitelist || []);
        setAutoProvision(existing.auto_provision_users ?? true);
        setIsActive(existing.is_active ?? true);

        if (existing.role_mapping_rules && typeof existing.role_mapping_rules === 'object') {
          const mapped = Object.entries(existing.role_mapping_rules).map(([group, role]) => ({
            group,
            role: String(role),
          }));
          if (mapped.length > 0) setRoleMappings(mapped);
        }
      } else {
        // Defaults for chosen provider
        if (activeProvider === 'azure_ad') {
          setIssuerUrl('https://login.microsoftonline.com/common/v2.0');
          setEntityId('common');
        } else if (activeProvider === 'okta') {
          setIssuerUrl('https://your-company.okta.com');
          setEntityId('');
        }
      }
    }
  }, [configsData, activeProvider]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const mappingObj: Record<string, string> = {};
      roleMappings.forEach((m) => {
        if (m.group.trim()) mappingObj[m.group.trim()] = m.role;
      });

      const payload = {
        provider: activeProvider,
        client_id: clientId,
        client_secret: clientSecret || undefined,
        issuer_url: issuerUrl,
        entity_id: entityId,
        domain_whitelist: domains,
        role_mapping_rules: mappingObj,
        auto_provision_users: autoProvision,
        is_active: isActive,
      };

      const res = await apiFetch(`/api/tenants/${tenantId}/sso-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: () => {
      toast.success(
        'Konfigurasi Disimpan',
        `Pengaturan Enterprise SSO untuk ${activeProvider.toUpperCase()} berhasil diperbarui.`
      );
      queryClient.invalidateQueries({ queryKey: ['tenant-sso-config', tenantId] });
    },
    onError: (err: any) => {
      toast.error('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem.');
    },
  });

  // Test Mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/tenants/${tenantId}/sso-config/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: activeProvider }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.status === 'success') {
        toast.success('Uji Koneksi Berhasil', data.message);
      } else {
        toast.info('Info Koneksi', data.message);
      }
    },
    onError: (err: any) => {
      toast.error('Uji Koneksi Gagal', err.message || 'Identity Provider tidak merespons.');
    },
  });

  const handleAddDomain = () => {
    if (!domainInput.trim()) return;
    const formatted = domainInput.startsWith('@') ? domainInput.trim() : `@${domainInput.trim()}`;
    if (!domains.includes(formatted)) {
      setDomains([...domains, formatted]);
    }
    setDomainInput('');
  };

  const handleRemoveDomain = (dom: string) => {
    setDomains(domains.filter((d) => d !== dom));
  };

  const handleAddRoleMapping = () => {
    if (!newGroup.trim()) return;
    setRoleMappings([...roleMappings, { group: newGroup.trim(), role: newRole }]);
    setNewGroup('');
  };

  const handleRemoveRoleMapping = (idx: number) => {
    setRoleMappings(roleMappings.filter((_, i) => i !== idx));
  };

  const redirectUri = `https://leadsy.tech/api/auth/sso/${activeProvider}/callback`;

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border bg-muted/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Enterprise SSO Federation (SAML 2.0 &amp; OIDC)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Izinkan karyawan korporat masuk secara aman menggunakan Microsoft Azure AD, Okta, atau Google Workspace.
              </p>
            </div>
          </div>

          <Badge variant="outline" className="text-xs font-semibold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
            SAML 2.0 / OIDC Compliant
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Provider Selector */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            PILIH IDENTITY PROVIDER (IDP)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {PROVIDERS.map((p) => {
              const isSelected = activeProvider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveProvider(p.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-brand bg-brand/5 shadow-xs ring-1 ring-brand/40 font-semibold'
                      : 'border-border bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="text-base mb-1">{p.icon}</div>
                  <div className="text-xs leading-snug">{p.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Callback URI Notice */}
        <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-brand" />
              Redirect URI (Daftarkan pada Portal IDP Anda):
            </span>
            <button
              onClick={copyRedirectUri}
              className="text-xs text-brand hover:underline flex items-center gap-1"
            >
              {copiedRedirect ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              {copiedRedirect ? 'Tersalin' : 'Salin URI'}
            </button>
          </div>
          <code className="text-xs bg-card px-2.5 py-1 rounded border border-border block text-foreground break-all">
            {redirectUri}
          </code>
        </div>

        {/* Credentials Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Client ID / Application ID *</label>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g. 00000000-0000-0000-0000-000000000000"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Client Secret (Biarkan kosong jika tidak diubah)</label>
            <Input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="••••••••••••••••••••"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Issuer / Metadata URL</label>
            <Input
              value={issuerUrl}
              onChange={(e) => setIssuerUrl(e.target.value)}
              placeholder="https://login.microsoftonline.com/tenant-id/v2.0"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Directory / Tenant Entity ID</label>
            <Input
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="e.g. common atau domain-organisasi"
              className="text-xs"
            />
          </div>
        </div>

        {/* Domain Whitelist */}
        <div className="space-y-2 pt-2 border-t border-border">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            EMAIL DOMAIN WHITELIST
          </label>
          <div className="flex gap-2">
            <Input
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDomain())}
              placeholder="Tambah domain, misal: @telkom.co.id"
              className="text-xs max-w-sm"
            />
            <Button variant="outline" size="sm" onClick={handleAddDomain} className="h-9 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {domains.map((dom) => (
              <span
                key={dom}
                className="text-xs px-2.5 py-1 rounded-md bg-muted text-foreground border border-border flex items-center gap-1.5"
              >
                {dom}
                <button
                  type="button"
                  onClick={() => handleRemoveDomain(dom)}
                  className="text-muted-foreground hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Group-to-Role Mapping Rules */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              IDP GROUP TO LEADSY ROLE MAPPING
            </label>
            <span className="text-xs text-muted-foreground">Otomatis sinkronisasi jabatan saat login</span>
          </div>

          <div className="space-y-2">
            {roleMappings.map((rm, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-muted/20 p-2 rounded-lg border border-border">
                <span className="text-xs font-mono text-foreground flex-1 truncate">{rm.group}</span>
                <span className="text-xs text-muted-foreground font-semibold">→ Role:</span>
                <Badge variant="outline" className="text-xs capitalize">{rm.role}</Badge>
                <button
                  type="button"
                  onClick={() => handleRemoveRoleMapping(idx)}
                  className="p-1 text-muted-foreground hover:text-red-500 ml-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            <div className="flex items-center gap-2 pt-1">
              <Input
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="Nama Grup IDP (e.g. Sales-Managers)"
                className="text-xs flex-1"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              >
                <option value="admin">Admin</option>
                <option value="presales">Presales Architect</option>
                <option value="sales">Sales Rep</option>
                <option value="viewer">Viewer</option>
              </select>
              <Button variant="outline" size="sm" onClick={handleAddRoleMapping} className="h-9 text-xs">
                Tambah Rule
              </Button>
            </div>
          </div>
        </div>

        {/* Auto-provision toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <div className="text-xs font-semibold text-foreground">Just-In-Time (JIT) Auto Provisioning</div>
            <div className="text-[11px] text-muted-foreground">
              Otomatis buat akun Leadsy baru saat karyawan pertama kali login via IDP korporat.
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoProvision}
            onChange={(e) => setAutoProvision(e.target.checked)}
            className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !clientId}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${testMutation.isPending ? 'animate-spin' : ''}`} />
            Uji Koneksi IDP
          </Button>

          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !clientId}
            className="bg-brand text-white hover:bg-brand/90 text-xs h-9 px-4 gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Simpan Konfigurasi SSO
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
