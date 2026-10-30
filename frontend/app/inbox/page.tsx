'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { 
  Inbox, MessageSquare, Mail, Phone, Send, Search, Filter, 
  Sparkles, CheckCheck, Clock, Building2, User, ExternalLink, 
  ChevronRight, Bot, Zap, ArrowRight, ShieldCheck, RefreshCw, 
  Plus, MoreVertical, Calendar, DollarSign, CheckCircle2,
  Tag, UserCheck, Check, RotateCcw, FileText, Layers, X,
  PenSquare, CornerUpLeft, Paperclip, ChevronDown, CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { fetchAssignableUsers, type AssignableUser } from '@/lib/api/leads';
import { cn } from '@/lib/utils';

interface UnifiedThread {
  id: string;
  leadId: number;
  companyName: string;
  contactName: string;
  contactRole: string;
  channel: 'whatsapp' | 'email';
  phone?: string;
  rawPlatform: 'whatsapp' | 'mekari_qontak' | 'email';
  subject?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  stage: string;
  score: number;
  dealValue: string;
  isAiAutonomous: boolean;
  assigneeId?: number | null;
  isResolved?: boolean;
  tags?: string[];
  aiAnalysis?: any;
  messages: Array<{
    id: string;
    sender: 'lead' | 'sales' | 'ai_sdr';
    content: string;
    subject?: string;
    time: string;
    status?: 'sent' | 'delivered' | 'read';
    rawDate?: string;
    fromEmail?: string;
    toEmail?: string;
  }>;
}

export default function OmnichannelInboxPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  // ── Primary View States ──
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'whatsapp' | 'email'>('all');
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Channel Sub-Filters ──
  const [waEngineFilter, setWaEngineFilter] = useState<'all' | 'whatsapp' | 'mekari_qontak'>('all');
  const [waStatusFilter, setWaStatusFilter] = useState<'all' | 'unassigned' | 'resolved'>('all');
  const [emailFolderFilter, setEmailFolderFilter] = useState<'all' | 'inbox' | 'sent' | 'unread'>('all');

  // ── Interaction & Composer States ──
  const [replyText, setReplyText] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSyncingEmail, setIsSyncingEmail] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ── Reference Data ──
  const [stages, setStages] = useState<{ id: number; name: string }[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);

  // ── Modals ──
  const [isComposeEmailOpen, setIsComposeEmailOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isSendingCompose, setIsSendingCompose] = useState(false);

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertCompanyName, setConvertCompanyName] = useState('');
  const [convertStageId, setConvertStageId] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);

  // Load stages & assignable users
  useEffect(() => {
    apiFetch('/funnel/stages')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data) setStages(json.data);
      })
      .catch((err) => console.warn('Failed to load funnel stages', err));

    fetchAssignableUsers()
      .then(setAssignableUsers)
      .catch((err) => console.warn('Failed to load assignable users', err));
  }, []);

  // ── Query Conversations ──
  const { data: convData, isLoading: loadingConvs, refetch: refetchConvs } = useQuery({
    queryKey: ['inbox-real-conversations', selectedChannel],
    queryFn: async () => {
      try {
        let platformParam = 'all';
        if (selectedChannel === 'whatsapp') platformParam = 'whatsapp_all';
        if (selectedChannel === 'email') platformParam = 'email';

        const res = await apiFetch(`/whatsapp/conversations?platform=${platformParam}`);
        if (!res.ok) return [];
        const json = await res.json();
        return json.data || [];
      } catch (err) {
        console.error('Failed to load conversations', err);
        return [];
      }
    },
    refetchInterval: 10000,
  });

  // Map backend conversations to unified thread structure
  const threads: UnifiedThread[] = useMemo(() => {
    if (convData && Array.isArray(convData) && convData.length > 0) {
      return convData.map((c: any) => {
        const isEmail = c.platform === 'email';
        const rawPlatform: 'whatsapp' | 'mekari_qontak' | 'email' = 
          c.platform === 'email' ? 'email' : (c.platform === 'mekari_qontak' ? 'mekari_qontak' : 'whatsapp');

        // Extract subject if email
        let inferredSubject = 'Inbound Communication';
        if (isEmail) {
          const firstMsg = c.messages?.[0];
          inferredSubject = firstMsg?.provider_payload_json?.subject 
            || (firstMsg?.body?.startsWith('Subjek: ') ? firstMsg.body.split('\n')[0].replace('Subjek: ', '') : '')
            || `Email dari ${c.contact?.name || c.external_chat_id}`;
        }

        return {
          id: String(c.id),
          leadId: c.contact?.linked_lead_id ?? c.lead_id ?? 0,
          companyName: c.contact?.lead?.company_name || c.contact?.name || (isEmail ? c.external_chat_id : `Chat ${c.external_chat_id}`),
          contactName: c.contact?.name || c.external_chat_id || 'Unknown Contact',
          contactRole: c.contact?.role || (isEmail ? 'Email Inbound' : (c.platform === 'mekari_qontak' ? 'Mekari Qontak Client' : 'WhatsApp Client')),
          channel: isEmail ? 'email' : 'whatsapp',
          phone: c.contact?.phone_number || c.external_chat_id || '',
          rawPlatform,
          subject: inferredSubject,
          lastMessage: c.last_message_preview || c.messages?.[0]?.body || 'Percakapan aktif',
          timestamp: c.last_message_at
            ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Active',
          unreadCount: c.unread_count || 0,
          stage: c.contact?.lead?.funnel_stage?.name || 'Inbound Pipeline',
          score: c.contact?.lead?.health_score || 85,
          dealValue: c.contact?.lead?.estimated_value ? `Rp ${new Intl.NumberFormat('id-ID').format(c.contact.lead.estimated_value)}` : '-',
          isAiAutonomous: !!c.ai_analysis,
          assigneeId: c.assignee_id ?? null,
          isResolved: !!c.is_resolved,
          tags: Array.isArray(c.tags) ? c.tags : [],
          aiAnalysis: c.ai_analysis,
          messages: Array.isArray(c.messages) && c.messages.length > 0
            ? c.messages.map((m: any) => ({
                id: String(m.id),
                sender: (m.direction === 'inbound' ? 'lead' : (m.direction === 'ai_sdr' ? 'ai_sdr' : 'sales')) as 'lead' | 'sales' | 'ai_sdr',
                content: m.body || '',
                subject: m.provider_payload_json?.subject,
                time: m.sent_at ? new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                status: (m.delivery_status || 'delivered') as 'sent' | 'delivered' | 'read',
                rawDate: m.sent_at,
                fromEmail: m.provider_payload_json?.from_email,
                toEmail: m.provider_payload_json?.to_email,
              }))
            : [],
        };
      });
    }
    return [];
  }, [convData]);

  // Active thread selection
  const activeThread = useMemo(() => {
    return threads.find((t) => t.id === activeThreadId) || threads[0] || null;
  }, [threads, activeThreadId]);

  // ── Messages Query for Active Thread ──
  const { data: threadMessages, isLoading: loadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['inbox-thread-messages', activeThread?.id],
    queryFn: async () => {
      if (!activeThread?.id) return [];
      const res = await apiFetch(`/whatsapp/conversations/${activeThread.id}/messages`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!activeThread?.id,
    refetchInterval: 6000,
  });

  const messagesToDisplay = useMemo(() => {
    if (threadMessages && Array.isArray(threadMessages) && threadMessages.length > 0) {
      return threadMessages.map((m: any) => ({
        id: String(m.id),
        sender: (m.direction === 'inbound' ? 'lead' : (m.direction === 'ai_sdr' ? 'ai_sdr' : 'sales')) as 'lead' | 'sales' | 'ai_sdr',
        content: m.body || '',
        subject: m.provider_payload_json?.subject,
        time: m.sent_at ? new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        status: (m.delivery_status || 'delivered') as 'sent' | 'delivered' | 'read',
        rawDate: m.sent_at,
        fromEmail: m.provider_payload_json?.from_email,
        toEmail: m.provider_payload_json?.to_email,
      }));
    }
    return activeThread?.messages || [];
  }, [threadMessages, activeThread]);

  // Filtered threads list
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      // 1. Primary Channel Filter
      if (selectedChannel === 'whatsapp' && t.channel !== 'whatsapp') return false;
      if (selectedChannel === 'email' && t.channel !== 'email') return false;

      // 2. WhatsApp Sub-filters
      if (selectedChannel === 'whatsapp' || t.channel === 'whatsapp') {
        if (waEngineFilter !== 'all' && t.rawPlatform !== waEngineFilter) return false;
        if (waStatusFilter === 'unassigned' && t.assigneeId) return false;
        if (waStatusFilter === 'resolved' && !t.isResolved) return false;
      }

      // 3. Email Sub-filters
      if (selectedChannel === 'email' || t.channel === 'email') {
        if (emailFolderFilter === 'unread' && t.unreadCount === 0) return false;
      }

      // 4. Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const match =
          t.companyName.toLowerCase().includes(query) ||
          t.contactName.toLowerCase().includes(query) ||
          (t.subject && t.subject.toLowerCase().includes(query)) ||
          t.lastMessage.toLowerCase().includes(query);
        if (!match) return false;
      }

      return true;
    });
  }, [threads, selectedChannel, waEngineFilter, waStatusFilter, emailFolderFilter, searchQuery]);

  // Set default subject when selecting email thread
  useEffect(() => {
    if (activeThread && activeThread.channel === 'email') {
      const subj = activeThread.subject || 'Pesan Mengenai Solusi Leadsy';
      setReplySubject(subj.startsWith('Re: ') ? subj : `Re: ${subj}`);
    } else {
      setReplySubject('');
    }
  }, [activeThread]);

  // ── Actions ──

  // 1. Send Message / Email
  const handleSendMessage = async () => {
    if (!replyText.trim() || !activeThread) return;

    setIsSending(true);
    try {
      const payload: any = {
        conversation_id: Number(activeThread.id),
        phone: activeThread.phone || activeThread.contactName,
        text: replyText.trim(),
        platform: activeThread.rawPlatform,
      };

      if (activeThread.channel === 'email') {
        payload.subject = replySubject.trim() || `Re: ${activeThread.subject || 'Solusi Leadsy'}`;
      }

      const res = await apiFetch('/whatsapp/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(
          'Gagal Mengirim',
          json.error || json.message || `Gagal mengirim pesan via ${activeThread.channel.toUpperCase()}.`
        );
      } else {
        if (json.warning) {
          toast.info('Pesan Dicatat', json.warning);
        } else {
          toast.success(
            'Pesan Terkirim',
            json.message || `Pesan berhasil dikirim via ${activeThread.channel.toUpperCase()} ke ${activeThread.contactName}.`
          );
        }
      }

      setReplyText('');
      refetchConvs();
      refetchMessages();
    } catch (err) {
      console.error(err);
      toast.fromError(err, 'Gagal mengirim pesan.');
    } finally {
      setIsSending(false);
    }
  };

  // 2. Sync IMAP Emails
  const handleSyncEmails = async () => {
    setIsSyncingEmail(true);
    try {
      const res = await apiFetch('/settings/email/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error('Sinkronisasi Gagal', json.message || 'Gagal terhubung ke mailbox IMAP.');
      } else {
        toast.success('Sinkronisasi Selesai', json.message || 'Kotak masuk email telah diperbarui.');
        refetchConvs();
        refetchMessages();
      }
    } catch (err: any) {
      toast.error('Sinkronisasi Gagal', err.message || 'Terjadi kesalahan saat sinkronisasi email.');
    } finally {
      setIsSyncingEmail(false);
    }
  };

  // 3. Compose New Email Outbound
  const handleSendComposeEmail = async () => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      toast.error('Form Tidak Lengkap', 'Penerima, subjek, dan isi email wajib diisi.');
      return;
    }

    setIsSendingCompose(true);
    try {
      const res = await apiFetch('/whatsapp/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: composeTo.trim(),
          subject: composeSubject.trim(),
          text: composeBody.trim(),
          platform: 'email',
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error('Gagal Mengirim Email', json.error || json.message || 'Periksa konfigurasi SMTP.');
      } else {
        toast.success('Email Berhasil Dikirim', json.message || `Email telah dikirim ke ${composeTo}.`);
        setIsComposeEmailOpen(false);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        refetchConvs();
      }
    } catch (err) {
      toast.fromError(err, 'Gagal mengirim email.');
    } finally {
      setIsSendingCompose(false);
    }
  };

  // 4. Trigger AI Conversation Analysis
  const handleAnalyzeConversation = async () => {
    if (!activeThread) return;
    setIsAnalyzing(true);
    try {
      const res = await apiFetch(`/whatsapp/conversations/${activeThread.id}/analyze`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error('Analisis Gagal', json.error || 'Gagal menganalisis percakapan.');
      } else {
        toast.success('AI SDR Insights Siap', 'Percakapan berhasil dianalisis untuk intent dan estimasi deal.');
        refetchConvs();
      }
    } catch (err) {
      toast.fromError(err, 'Gagal memproses analisis AI.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 5. Convert Conversation to Lead
  const handleOpenConvertModal = () => {
    if (!activeThread) return;
    setConvertCompanyName(activeThread.companyName || activeThread.contactName);
    setConvertStageId(stages[0]?.id ? String(stages[0].id) : '');
    setIsConvertModalOpen(true);
  };

  const handleExecuteConvert = async () => {
    if (!activeThread || !convertCompanyName.trim()) return;
    setIsConverting(true);
    try {
      const res = await apiFetch(`/whatsapp/conversations/${activeThread.id}/convert-to-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: convertCompanyName.trim(),
          funnel_stage_id: convertStageId ? Number(convertStageId) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error('Konversi Gagal', json.error || 'Gagal membuat Lead baru di CRM.');
      } else {
        toast.success('Berhasil Dikonversi!', `Percakapan berhasil terhubung ke Lead: ${convertCompanyName}`);
        setIsConvertModalOpen(false);
        refetchConvs();
      }
    } catch (err) {
      toast.fromError(err, 'Terjadi kesalahan saat konversi lead.');
    } finally {
      setIsConverting(false);
    }
  };

  // 6. Update Assignee & Resolution
  const handleUpdateAssignee = async (userId: number | null) => {
    if (!activeThread) return;
    try {
      await apiFetch(`/whatsapp/conversations/${activeThread.id}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee_id: userId }),
      });
      toast.success('Sales Rep Diperbarui', 'Penugasan percakapan berhasil diperbarui.');
      refetchConvs();
    } catch {
      toast.error('Gagal Memperbarui', 'Tidak dapat mengubah assignee.');
    }
  };

  const handleToggleResolved = async () => {
    if (!activeThread) return;
    const nextState = !activeThread.isResolved;
    try {
      await apiFetch(`/whatsapp/conversations/${activeThread.id}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_resolved: nextState }),
      });
      toast.success(
        nextState ? 'Percakapan Selesai' : 'Percakapan Dibuka Kembali',
        `Status percakapan berhasil diubah ke ${nextState ? 'Resolved' : 'Active'}.`
      );
      refetchConvs();
    } catch {
      toast.error('Gagal Memperbarui', 'Tidak dapat mengubah status resolved.');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* ── Top Header Bar ── */}
      <div className="h-14 border-b border-border bg-card px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold">
            <Inbox className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground">Omnichannel Inbox & Mail Suite</h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium text-muted-foreground border border-border">
                Adaptive Communication
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              WhatsApp (Mekari Qontak + Local Baileys) & Lark-Style Enterprise Mailbox
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Action: Tulis Email Baru */}
          <Button
            size="sm"
            onClick={() => setIsComposeEmailOpen(true)}
            className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
          >
            <PenSquare className="h-3.5 w-3.5" />
            <span>Tulis Email Baru</span>
          </Button>

          {/* Quick Action: Sync Email IMAP */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncEmails}
            disabled={isSyncingEmail}
            className="h-8 text-xs gap-1.5 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
            title="Tarik email terbaru dari server IMAP Lark Suite"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isSyncingEmail && "animate-spin")} />
            <span>{isSyncingEmail ? "Menyinkronkan..." : "Tarik Email IMAP"}</span>
          </Button>

          {/* Link to WhatsApp Connection */}
          <Link href="/whatsapp">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Status WhatsApp</span>
            </Button>
          </Link>

          <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1.5 py-1 hidden sm:flex">
            <Bot className="h-3.5 w-3.5" /> AI SDR Routing Active
          </Badge>
        </div>
      </div>

      {/* ── 3-Column Container ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Column 1: Threads Sidebar ── */}
        <div className="w-80 md:w-96 border-r border-border bg-card/40 flex flex-col shrink-0">
          {/* Primary Channel Filter Tabs */}
          <div className="p-3 border-b border-border space-y-2.5">
            <div className="flex rounded-lg bg-muted p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setSelectedChannel('all')}
                className={`flex-1 py-1.5 rounded-md text-center transition-all ${
                  selectedChannel === 'all' ? 'bg-card text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Semua ({threads.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedChannel('whatsapp')}
                className={`flex-1 py-1.5 rounded-md text-center transition-all flex items-center justify-center gap-1 ${
                  selectedChannel === 'whatsapp' ? 'bg-card text-emerald-600 shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className="h-3 w-3" /> WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setSelectedChannel('email')}
                className={`flex-1 py-1.5 rounded-md text-center transition-all flex items-center justify-center gap-1 ${
                  selectedChannel === 'email' ? 'bg-card text-blue-600 shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Mail className="h-3 w-3" /> Lark Mail
              </button>
            </div>

            {/* Sub-Filters: WhatsApp Specific */}
            {selectedChannel === 'whatsapp' && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <select
                  value={waEngineFilter}
                  onChange={(e) => setWaEngineFilter(e.target.value as any)}
                  className="flex-1 bg-background text-[11px] font-medium border border-border rounded-md px-2 py-1 text-foreground focus:outline-hidden"
                >
                  <option value="all">Semua Engine WA</option>
                  <option value="mekari_qontak">Mekari Qontak API</option>
                  <option value="whatsapp">Local WhatsApp (Baileys)</option>
                </select>

                <select
                  value={waStatusFilter}
                  onChange={(e) => setWaStatusFilter(e.target.value as any)}
                  className="bg-background text-[11px] font-medium border border-border rounded-md px-2 py-1 text-foreground focus:outline-hidden"
                >
                  <option value="all">Semua Status</option>
                  <option value="unassigned">Unassigned</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            )}

            {/* Sub-Filters: Email Specific */}
            {selectedChannel === 'email' && (
              <div className="flex items-center gap-1 text-[11px] font-medium">
                {(['all', 'inbox', 'unread'] as const).map((folder) => (
                  <button
                    key={folder}
                    type="button"
                    onClick={() => setEmailFolderFilter(folder)}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all capitalize",
                      emailFolderFilter === folder
                        ? "bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {folder === 'all' ? 'Semua Email' : folder === 'inbox' ? 'Kotak Masuk' : 'Belum Dibaca'}
                  </button>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari prospek, email, atau subjek..."
                className="w-full bg-background rounded-lg border border-border pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-brand"
              />
            </div>
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
                {selectedChannel === 'email' ? (
                  <>
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Mail className="h-6 w-6 stroke-1.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Belum ada email masuk</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[240px] mx-auto leading-relaxed">
                        Tarik email terbaru dari server Lark Suite via IMAP atau tulis email baru via SMTP.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="xs" onClick={handleSyncEmails} disabled={isSyncingEmail} className="text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                        <RefreshCw className={cn("h-3 w-3", isSyncingEmail && "animate-spin")} /> Tarik IMAP
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => setIsComposeEmailOpen(true)} className="text-xs gap-1.5">
                        <PenSquare className="h-3 w-3" /> Tulis Email
                      </Button>
                    </div>
                  </>
                ) : selectedChannel === 'whatsapp' ? (
                  <>
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <MessageSquare className="h-6 w-6 stroke-1.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Belum ada percakapan WhatsApp</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[240px] mx-auto leading-relaxed">
                        Hubungkan perangkat WhatsApp (Baileys) atau Mekari Qontak untuk memulai percakapan masuk secara real-time.
                      </p>
                    </div>
                    <Link href="/whatsapp">
                      <Button size="xs" variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" /> Hubungkan WhatsApp
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                      <Inbox className="h-6 w-6 stroke-1.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Belum ada percakapan aktif</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[240px] mx-auto leading-relaxed">
                        Mulai komunikasi dengan menghubungkan WhatsApp atau menarik email via IMAP.
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.id === activeThread?.id;
                const isEmail = thread.channel === 'email';

                if (isEmail) {
                  // ── Lark Mail Style List Row ──
                  return (
                    <div
                      key={thread.id}
                      onClick={() => setActiveThreadId(thread.id)}
                      className={cn(
                        "p-3.5 cursor-pointer transition-all hover:bg-muted/40 relative",
                        isSelected && "bg-blue-500/5 border-l-4 border-l-blue-600"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-foreground truncate">
                              {thread.contactName}
                            </span>
                            <span className="text-[10px] text-blue-600 font-semibold px-1.5 py-0.2 rounded bg-blue-500/10 shrink-0">
                              Lark Mail
                            </span>
                          </div>

                          {/* Email Subject Line (Bold, like Lark/Outlook) */}
                          <p className="text-xs font-semibold text-foreground truncate mt-1">
                            {thread.subject || 'Tanpa Subjek'}
                          </p>

                          {/* Email Snippet */}
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 leading-relaxed">
                            {thread.lastMessage.replace(/^Subjek:.*?\n/i, '')}
                          </p>
                        </div>

                        <span className="text-[10px] text-muted-foreground shrink-0">{thread.timestamp}</span>
                      </div>

                      <div className="flex items-center justify-between pt-2 text-[10px]">
                        <span className="text-muted-foreground truncate max-w-[160px]">
                          {thread.companyName}
                        </span>
                        {thread.unreadCount > 0 && (
                          <span className="h-2 w-2 rounded-full bg-blue-600" title="Belum dibaca" />
                        )}
                      </div>
                    </div>
                  );
                }

                // ── WhatsApp Style List Row ──
                return (
                  <div
                    key={thread.id}
                    onClick={() => setActiveThreadId(thread.id)}
                    className={cn(
                      "p-3.5 cursor-pointer transition-all hover:bg-muted/40 relative",
                      isSelected && "bg-emerald-500/5 border-l-4 border-l-emerald-600"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground truncate">
                            {thread.companyName}
                          </span>
                          {thread.isAiAutonomous && (
                            <span title="Autonomous AI SDR" className="shrink-0 p-0.5 rounded bg-purple-500/10 text-purple-600 text-[10px]">
                              <Sparkles className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {thread.contactName} • <span className="italic">{thread.contactRole}</span>
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{thread.timestamp}</span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1.5">
                      {thread.lastMessage}
                    </p>

                    <div className="flex items-center justify-between pt-2 text-[10px]">
                      <span className="flex items-center gap-1 font-medium">
                        {thread.rawPlatform === 'mekari_qontak' ? (
                          <span className="text-purple-600 flex items-center gap-1 font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-600" /> Qontak API
                          </span>
                        ) : (
                          <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> WA Baileys
                          </span>
                        )}
                      </span>

                      {thread.unreadCount > 0 && (
                        <span className="h-4 min-w-4 px-1 rounded-full bg-brand text-white font-bold text-[9px] flex items-center justify-center">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Column 2: Adaptive Message Stream & Reader ── */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden">
          {!activeThread ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-muted/60 border border-border flex items-center justify-center">
                <Inbox className="h-8 w-8 text-muted-foreground/60 stroke-1" />
              </div>
              <div className="max-w-sm space-y-1">
                <h3 className="font-bold text-sm text-foreground">Pilih Percakapan atau Email</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pilih thread dari daftar di sebelah kiri untuk membaca pesan, mengirim balasan langsung, atau menyinkronkan data CRM.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setIsComposeEmailOpen(true)} className="text-xs gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                  <PenSquare className="h-3.5 w-3.5" /> Tulis Email
                </Button>
                <Link href="/whatsapp">
                  <Button size="sm" variant="outline" className="text-xs gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> Perangkat WhatsApp
                  </Button>
                </Link>
              </div>
            </div>
          ) : activeThread.channel === 'email' ? (
            /* ───────────────────────────────────────────────────────────
             *  LARK MAIL STYLE EMAIL CLIENT INTERFACE
             * ─────────────────────────────────────────────────────────── */
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Email Subject Header Banner */}
              <div className="px-6 py-4 border-b border-border bg-card/60 flex items-start justify-between gap-4 shrink-0">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                      Lark Suite IMAP • SSL
                    </span>
                    {activeThread.isResolved && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Resolved
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-foreground leading-snug">
                    {activeThread.subject || 'Percakapan Email Prospek'}
                  </h2>
                </div>

                {/* Email Action Toolbar */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {!activeThread.leadId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenConvertModal}
                      className="h-8 text-xs gap-1.5 border-brand/40 text-brand hover:bg-brand hover:text-white cursor-pointer"
                    >
                      <Building2 className="h-3.5 w-3.5" /> Convert to Lead
                    </Button>
                  ) : (
                    <Link href={`/leads/${activeThread.leadId}`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground">
                        Buka Lead <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleResolved}
                    className="h-8 text-xs gap-1"
                    title={activeThread.isResolved ? 'Buka kembali thread' : 'Tandai selesai'}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>{activeThread.isResolved ? 'Buka Kembali' : 'Selesaikan'}</span>
                  </Button>
                </div>
              </div>

              {/* Scrollable Email Reader Container */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Sender & Recipient Metadata Card */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {activeThread.contactName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{activeThread.contactName}</span>
                          <span className="text-xs text-muted-foreground font-mono">&lt;{activeThread.phone || 'email@client.com'}&gt;</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Kepada: <span className="font-medium text-foreground">Sales & Account Team &lt;noreply@leadsy.tech&gt;</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{activeThread.timestamp}</span>
                  </div>

                  {/* Clean Formatted Email Content */}
                  <div className="pt-3 border-t border-border/60 text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                    {messagesToDisplay.length > 0 ? (
                      messagesToDisplay[0].content.replace(/^Subjek:.*?\n/i, '')
                    ) : (
                      activeThread.lastMessage
                    )}
                  </div>
                </div>

                {/* Email Thread Exchanges (if multiple replies exist) */}
                {messagesToDisplay.length > 1 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="h-px bg-border flex-1" />
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Riwayat Balasan ({messagesToDisplay.length - 1})
                      </span>
                      <div className="h-px bg-border flex-1" />
                    </div>

                    {messagesToDisplay.slice(1).map((msg) => {
                      const isOutbound = msg.sender === 'sales' || msg.sender === 'ai_sdr';
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "rounded-xl border p-4 space-y-2 text-xs",
                            isOutbound ? "bg-muted/30 border-border" : "bg-card border-border"
                          )}
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">
                                {isOutbound ? 'Tim Leadsy (Sales)' : activeThread.contactName}
                              </span>
                              <Badge variant="outline" className="text-[9px] py-0">
                                {isOutbound ? 'Outbound SMTP' : 'Inbound IMAP'}
                              </Badge>
                            </div>
                            <span className="text-muted-foreground font-mono">{msg.time}</span>
                          </div>

                          <div className="whitespace-pre-wrap leading-relaxed text-foreground">
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Lark Mail Reply Composer (Inline at bottom of thread) */}
                <div className="rounded-xl border border-blue-500/30 bg-card p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <CornerUpLeft className="h-3.5 w-3.5 text-blue-600" />
                      <span>Balas Email via SMTP ke {activeThread.phone || activeThread.contactName}</span>
                    </div>

                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setReplyText(`Halo Bapak/Ibu ${activeThread.contactName},\n\nTerima kasih telah menghubungi kami melalui email.\n\nMenindaklanjuti kebutuhan solusi yang Anda sampaikan, kami siap menjadwalkan sesi konsultasi singkat 15 menit bersama tim spesialis kami.\n\nKapan waktu yang paling fleksibel bagi Anda minggu ini?\n\nSalam hangat,\nTim Leadsy Enterprise`)}
                      className="text-[11px] h-6 text-blue-600 border-blue-500/30 hover:bg-blue-500/10 gap-1"
                    >
                      <Sparkles className="h-3 w-3" /> Draft AI SDR
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-16 text-muted-foreground font-medium shrink-0">Subjek:</span>
                      <Input
                        value={replySubject}
                        onChange={(e) => setReplySubject(e.target.value)}
                        placeholder="Subjek email balasan..."
                        className="h-8 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Ketik isi surat/email balasan Anda di sini secara formal..."
                        rows={4}
                        className="text-xs bg-background resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-500" /> Terkirim via SMTP Lark Suite resmi
                    </span>

                    <Button
                      onClick={handleSendMessage}
                      disabled={isSending || !replyText.trim()}
                      className="h-8 px-4 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs cursor-pointer"
                    >
                      {isSending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      <span>Kirim Balasan Email</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ───────────────────────────────────────────────────────────
             *  WHATSAPP CONSOLE INTERFACE (Mekari Qontak / Local Baileys)
             * ─────────────────────────────────────────────────────────── */
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* WhatsApp Thread Header */}
              <div className="p-4 border-b border-border bg-card/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-600/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center font-bold text-sm">
                    {activeThread.contactName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-sm text-foreground">{activeThread.contactName}</h2>
                      <Badge variant="outline" className="text-[10px] py-0">
                        {activeThread.stage}
                      </Badge>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                        activeThread.rawPlatform === 'mekari_qontak'
                          ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                          : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      )}>
                        {activeThread.rawPlatform === 'mekari_qontak' ? 'Mekari Qontak' : 'Local Baileys'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activeThread.phone} • <span className="font-medium text-foreground">{activeThread.companyName}</span>
                    </p>
                  </div>
                </div>

                {/* WhatsApp Action Controls */}
                <div className="flex items-center gap-1.5">
                  {!activeThread.leadId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenConvertModal}
                      className="h-8 text-xs gap-1.5 border-brand/40 text-brand hover:bg-brand hover:text-white"
                    >
                      <Building2 className="h-3.5 w-3.5" /> Convert to Lead
                    </Button>
                  ) : (
                    <Link href={`/leads/${activeThread.leadId}`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                        Buka Lead <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAnalyzeConversation}
                    disabled={isAnalyzing}
                    className="h-8 text-xs gap-1 text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
                    title="Jalankan analisis AI SDR untuk mendeteksi intent & rekomendasi deal"
                  >
                    <Sparkles className={cn("h-3.5 w-3.5", isAnalyzing && "animate-spin")} />
                    <span>{isAnalyzing ? "Menganalisis..." : "AI SDR Intel"}</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleResolved}
                    className="h-8 text-xs gap-1"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>{activeThread.isResolved ? 'Buka Kembali' : 'Selesaikan'}</span>
                  </Button>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesToDisplay.map((m) => {
                  const isLead = m.sender === 'lead';
                  const isAi = m.sender === 'ai_sdr';

                  return (
                    <div
                      key={m.id}
                      className={`flex gap-3 ${isLead ? 'justify-start' : 'justify-end'}`}
                    >
                      {isLead && (
                        <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-semibold shrink-0 mt-1">
                          {activeThread.contactName.slice(0, 1)}
                        </div>
                      )}

                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2.5 text-xs shadow-2xs space-y-1.5",
                          isLead
                            ? "bg-card border border-border text-foreground rounded-tl-xs"
                            : isAi
                            ? "bg-purple-950/20 border border-purple-500/30 text-foreground rounded-tr-xs"
                            : "bg-emerald-600 text-white rounded-tr-xs"
                        )}
                      >
                        {isAi && (
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-400 pb-1 border-b border-purple-500/20">
                            <Bot className="h-3 w-3" /> Autonomous AI SDR Agent
                          </div>
                        )}

                        <div className="whitespace-pre-line leading-relaxed">
                          {m.content}
                        </div>

                        <div
                          className={cn(
                            "flex items-center justify-end gap-1.5 text-[10px]",
                            isLead ? "text-muted-foreground" : isAi ? "text-purple-300" : "text-white/80"
                          )}
                        >
                          <span>{m.time}</span>
                          {!isLead && m.status === 'read' && <CheckCheck className="h-3 w-3 text-cyan-300" />}
                          {!isLead && m.status === 'delivered' && <CheckCheck className="h-3 w-3 opacity-60" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI Copilot Suggestion Pill */}
              <div className="p-3 bg-muted/30 border-t border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                  <Sparkles className="h-4 w-4 text-brand shrink-0 animate-pulse" />
                  <span className="font-semibold text-foreground shrink-0">Saran AI:</span>
                  <span className="truncate italic">
                    &ldquo;Siap {activeThread.contactName}, penawaran dan informasi layanan sudah kami siapkan. Kapan waktu terbaik untuk review singkat?&rdquo;
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReplyText(`Siap ${activeThread.contactName}, penawaran dan informasi layanan sudah kami siapkan. Kapan waktu terbaik untuk review singkat bersama tim Anda?`)}
                  className="h-7 text-xs shrink-0 text-brand border-brand/30 hover:bg-brand hover:text-white"
                >
                  Gunakan Saran
                </Button>
              </div>

              {/* Message Composer */}
              <div className="p-3 border-t border-border bg-card">
                <div className="flex items-end gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Ketik pesan balasan via ${activeThread.rawPlatform === 'mekari_qontak' ? 'Mekari Qontak' : 'Local WhatsApp'} ke ${activeThread.contactName}...`}
                    rows={2}
                    className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-500"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || !replyText.trim() || !activeThread}
                    className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs cursor-pointer"
                  >
                    {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Kirim WA
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Column 3: Customer 360 & Deal Context ── */}
        <div className="w-72 border-l border-border bg-card/30 p-4 space-y-4 overflow-y-auto hidden lg:block">
          <div className="space-y-1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
              Customer 360 & Deal Intel
            </h3>
            <p className="text-xs text-foreground font-semibold">{activeThread?.companyName || '-'}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Channel Asal</span>
              <Badge variant="outline" className={cn(
                "font-bold text-[10px]",
                activeThread?.channel === 'email' ? "text-blue-600 border-blue-500/30" : "text-emerald-600 border-emerald-500/30"
              )}>
                {activeThread?.rawPlatform === 'email' ? 'Lark Suite Mail' : (activeThread?.rawPlatform === 'mekari_qontak' ? 'Mekari Qontak' : 'Local WhatsApp')}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Deal Size</span>
              <span className="font-bold text-brand">{activeThread?.dealValue || '-'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Lead Score</span>
              <Badge variant="outline" className="font-bold text-emerald-600 border-emerald-500/30">
                {activeThread?.score || 0}/100 • Grade A
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Funnel Stage</span>
              <Badge variant="outline" className="text-[10px]">
                {activeThread?.stage || '-'}
              </Badge>
            </div>
          </div>

          {/* Assignee Sales Rep Selection */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <UserCheck className="h-3 w-3 text-brand" /> ASSIGNEE (SALES REP)
            </span>
            <select
              value={activeThread?.assigneeId ?? ''}
              onChange={(e) => handleUpdateAssignee(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-background text-xs border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-hidden"
            >
              <option value="">Belum Ditugaskan (Unassigned)</option>
              {assignableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
              QUICK ACTIONS
            </span>
            <div className="space-y-1.5">
              <Link href={activeThread?.leadId ? `/leads/${activeThread.leadId}?tab=revenue` : '/leads'}>
                <Button variant="outline" size="sm" className="w-full justify-between text-xs h-8">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-brand" />
                    Deal Win Probability
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </Button>
              </Link>

              <Link href={activeThread?.leadId ? `/leads/${activeThread.leadId}?tab=meetings` : '/leads'}>
                <Button variant="outline" size="sm" className="w-full justify-between text-xs h-8">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-brand" />
                    Jadwalkan Meeting
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </Button>
              </Link>
            </div>
          </div>

          {/* BANTC Checklist */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
              BANTC QUALIFICATION
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Budget: Terkonfirmasi
              </div>
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Authority: VP Level
              </div>
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Need: Lead Gen Automation
              </div>
              <div className="flex items-center gap-2 text-amber-500">
                <Clock className="h-3.5 w-3.5" /> Timeline: Q4 2026 Target
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal 1: Compose New Email (Lark Mail Style) ── */}
      <Modal
        open={isComposeEmailOpen}
        onOpenChange={setIsComposeEmailOpen}
        title="Tulis Email Baru"
        description="Kirim email resmi melalui koneksi SMTP server perusahaan (Lark Suite / Custom Mail)."
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Pengiriman aman via SMTP
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsComposeEmailOpen(false)} disabled={isSendingCompose}>
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSendComposeEmail}
                disabled={isSendingCompose || !composeTo.trim() || !composeSubject.trim() || !composeBody.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 cursor-pointer"
              >
                {isSendingCompose ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Kirim Email</span>
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3.5 py-1">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Kepada (Email Tujuan):</label>
            <Input
              type="email"
              value={composeTo}
              onChange={(e) => setComposeTo(e.target.value)}
              placeholder="contoh: direksi@perusahaan.co.id"
              className="text-xs bg-background"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Subjek Email:</label>
            <Input
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              placeholder="contoh: Penawaran Solusi Enterprise Leadsy - Q4"
              className="text-xs bg-background font-medium"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Isi Surat / Pesan Email:</label>
              <button
                type="button"
                onClick={() => setComposeBody(`Yth. Bapak/Ibu Pimpinan,\n\nSalam dari Leadsy.\n\nKami mengamati potensi ekspansi bisnis perusahaan Anda di tahun ini. Leadsy menyediakan platform Lead Intelligence and Automated Sales Acquisition yang telah membantu berbagai korporasi meningkatkan konversi deal hingga 3.4x lipat.\n\nApakah kami dapat mengirimkan ringkasan solusi singkat atau menjadwalkan demo 15 menit minggu ini?\n\nTerima kasih atas perhatian Anda.\n\nSalam hormat,\nTim Bisnis Leadsy`)}
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="h-3 w-3" /> Masukkan Template B2B
              </button>
            </div>
            <Textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              placeholder="Tuliskan isi email Anda..."
              rows={8}
              className="text-xs bg-background leading-relaxed resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* ── Modal 2: Convert to Lead ── */}
      <Modal
        open={isConvertModalOpen}
        onOpenChange={setIsConvertModalOpen}
        title="Konversi Percakapan Menjadi Lead CRM"
        description="Buat record Lead baru di pipeline CRM dari kontak dan riwayat percakapan ini."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setIsConvertModalOpen(false)} disabled={isConverting}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteConvert}
              disabled={isConverting || !convertCompanyName.trim()}
              className="bg-brand text-white hover:bg-brand/90 gap-1.5"
            >
              {isConverting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Building2 className="h-3.5 w-3.5" />}
              <span>Simpan Lead Baru</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5 py-1">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Nama Perusahaan / Akun:</label>
            <Input
              value={convertCompanyName}
              onChange={(e) => setConvertCompanyName(e.target.value)}
              placeholder="Nama PT atau Brand prospek..."
              className="text-xs bg-background"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Tahapan Pipeline (Funnel Stage):</label>
            <select
              value={convertStageId}
              onChange={(e) => setConvertStageId(e.target.value)}
              className="w-full bg-background text-xs border border-border rounded-lg px-3 py-2 text-foreground focus:outline-hidden"
            >
              <option value="">Pilih Tahapan Pipeline...</option>
              {stages.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
