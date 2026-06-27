'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, Loader2, Trash2, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type RoleAssignment = {
  id: number;
  lead_id: number;
  user_id: number;
  role_type: string;
  commission_split_percent: number;
  assigned_at: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
};

type AssignableUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
};

const ROLE_TYPES = [
  { value: 'sales', label: 'Sales Rep' },
  { value: 'presales', label: 'Presales Engineer' },
  { value: 'account_manager', label: 'Account Manager' },
  { value: 'csm', label: 'Customer Success Manager' },
  { value: 'sdr', label: 'Sales Development Rep' },
  { value: 'partner', label: 'Partner/Channel' },
];

export function CommercialTeam({ leadId }: { leadId: string | number }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ user_id: '', role_type: 'sales', commission_split_percent: 100 });
  const [assigning, setAssigning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch current assignments
  const { data, isLoading } = useQuery({
    queryKey: ['lead-role-assignments', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/role-assignments`).then(r => r.json()),
  });

  // Fetch assignable users
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => apiFetch('/leads/assignable-users').then(r => r.json()),
  });

  const assignments: RoleAssignment[] = data?.data || [];
  const users: AssignableUser[] = usersData?.data || [];

  const addAssignment = async () => {
    if (!form.user_id) {
      setErrorMsg('Please select a user.');
      return;
    }
    setAssigning(true);
    setErrorMsg('');
    try {
      const res = await apiFetch(`/leads/${leadId}/role-assignments`, {
        method: 'POST',
        body: JSON.stringify(form)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to assign role.');
      
      qc.invalidateQueries({ queryKey: ['lead-role-assignments', leadId] });
      setForm({ user_id: '', role_type: 'sales', commission_split_percent: 100 });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const removeAssignment = async (id: number) => {
    if (!confirm('Remove this role assignment?')) return;
    try {
      await apiFetch(`/leads/${leadId}/role-assignments/${id}`, { method: 'DELETE' });
      qc.invalidateQueries({ queryKey: ['lead-role-assignments', leadId] });
    } catch (err) {
      alert('Failed to remove assignment.');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--brand)]" />
            <div>
              <CardTitle>Commercial Team</CardTitle>
              <CardDescription>Assign team members and allocate commission splits.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* List of current assignments */}
            <div className="md:col-span-2 space-y-4">
              <h4 className="text-sm font-semibold">Active Assignments</h4>
              
              {isLoading ? (
                <div className="flex h-32 items-center justify-center border border-dashed rounded-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : assignments.length === 0 ? (
                <div className="flex h-32 items-center justify-center border border-dashed rounded-lg text-sm text-muted-foreground bg-muted/20">
                  No roles assigned yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-sm hover:border-[var(--brand)]/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-[color-mix(in_oklch,var(--brand)_10%,transparent)] text-[var(--brand)] flex items-center justify-center font-bold text-sm">
                          {a.user.first_name[0]}{a.user.last_name ? a.user.last_name[0] : ''}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{a.user.first_name} {a.user.last_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] bg-background">
                              {ROLE_TYPES.find(r => r.value === a.role_type)?.label || a.role_type}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Split</p>
                          <p className="text-sm font-bold">{a.commission_split_percent}%</p>
                        </div>
                        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10" onClick={() => removeAssignment(a.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add new assignment form */}
            <div className="p-4 rounded-xl border border-[var(--brand)]/20 bg-gradient-to-br from-[color-mix(in_oklch,var(--brand)_5%,transparent)] to-card space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-[var(--brand)]" />
                Assign New Role
              </h4>
              
              {errorMsg && (
                <div className="text-[10px] p-2 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Team Member</label>
                  <Select 
                    value={form.user_id} 
                    onChange={e => setForm({...form, user_id: e.target.value})}
                    disabled={loadingUsers}
                    className="w-full text-sm"
                  >
                    <option value="">Select User...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
                  <Select 
                    value={form.role_type} 
                    onChange={e => setForm({...form, role_type: e.target.value})}
                    className="w-full text-sm"
                  >
                    {ROLE_TYPES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Commission Split (%)</label>
                  <Input 
                    type="number" 
                    min="0" max="100" 
                    value={form.commission_split_percent}
                    onChange={e => setForm({...form, commission_split_percent: Number(e.target.value)})}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Total split across all reps usually adds up to 100%.</p>
                </div>

                <Button 
                  onClick={addAssignment} 
                  disabled={assigning || !form.user_id}
                  className="w-full mt-2 bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
                >
                  {assigning && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Assign Member
                </Button>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
