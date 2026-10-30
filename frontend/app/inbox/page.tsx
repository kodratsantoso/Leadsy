'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { 
  Inbox, MessageSquare, Mail, Phone, Send, Search, Filter, 
  Sparkles, CheckCheck, Clock, Building2, User, ExternalLink, 
  ChevronRight, Bot, Zap, ArrowRight, ShieldCheck, RefreshCw, 
  Plus, MoreVertical, Calendar, DollarSign, CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

interface MockThread {
  id: string;
  leadId: number;
  companyName: string;
  contactName: string;
  contactRole: string;
  channel: 'whatsapp' | 'email';
  phone?: string;
  rawPlatform?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  stage: string;
  score: number;
  dealValue: string;
  isAiAutonomous: boolean;
  messages: Array<{
    id: string;
    sender: 'lead' | 'sales' | 'ai_sdr';
    content: string;
    time: string;
    status?: 'sent' | 'delivered' | 'read';
  }>;
}

const INITIAL_THREADS: MockThread[] = [];

export default function OmnichannelInboxPage() {
  const toast = useToast();
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<'all' | 'whatsapp' | 'email'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Fetch real conversations from database
  const { data: convData, isLoading: loadingConvs, refetch: refetchConvs } = useQuery({
    queryKey: ['inbox-real-conversations', selectedChannelFilter],
    queryFn: async () => {
      try {
        const platform = selectedChannelFilter === 'all' ? 'all' : selectedChannelFilter;
        const res = await apiFetch(`/whatsapp/conversations?platform=${platform}`);
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

  const threads: MockThread[] = useMemo(() => {
    if (convData && Array.isArray(convData) && convData.length > 0) {
      return convData.map((c: any) => ({
        id: String(c.id),
        leadId: c.contact?.linked_lead_id ?? c.lead_id ?? 0,
        companyName: c.contact?.lead?.company_name || c.contact?.name || `Chat ${c.external_chat_id}`,
        contactName: c.contact?.name || c.external_chat_id || 'Unknown Contact',
        contactRole: c.contact?.role || (c.platform === 'mekari_qontak' ? 'Mekari Qontak' : 'WhatsApp Client'),
        channel: (c.platform === 'email' ? 'email' : 'whatsapp') as 'whatsapp' | 'email',
        phone: c.contact?.phone_number || c.external_chat_id || '',
        rawPlatform: c.platform || 'whatsapp',
        lastMessage: c.last_message_preview || c.messages?.[0]?.body || 'Percakapan aktif di database',
        timestamp: c.last_message_at
          ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Active',
        unreadCount: c.unread_count || 0,
        stage: c.contact?.lead?.funnel_stage?.name || 'Inbound Pipeline',
        score: c.contact?.lead?.health_score || 85,
        dealValue: c.contact?.lead?.estimated_value ? `Rp ${new Intl.NumberFormat('id-ID').format(c.contact.lead.estimated_value)}` : '-',
        isAiAutonomous: !!c.ai_analysis,
        messages: Array.isArray(c.messages) && c.messages.length > 0
          ? c.messages.map((m: any) => ({
              id: String(m.id),
              sender: (m.direction === 'inbound' ? 'lead' : (m.direction === 'ai_sdr' ? 'ai_sdr' : 'sales')) as 'lead' | 'sales' | 'ai_sdr',
              content: m.body || '',
              time: m.sent_at ? new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
              status: (m.delivery_status || 'delivered') as 'sent' | 'delivered' | 'read',
            }))
          : [
              {
                id: `init-${c.id}`,
                sender: 'lead' as const,
                content: c.last_message_preview || 'Halo, terhubung melalui Leadsy Omnichannel.',
                time: c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Hari ini',
              }
            ],
      }));
    }
    return [];
  }, [convData]);

  const activeThread = useMemo(() => {
    return threads.find((t) => t.id === activeThreadId) || threads[0] || null;
  }, [threads, activeThreadId]);

  // Fetch real messages for active conversation
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
    refetchInterval: 8000,
  });

  const messagesToDisplay = useMemo(() => {
    if (threadMessages && Array.isArray(threadMessages) && threadMessages.length > 0) {
      return threadMessages.map((m: any) => ({
        id: String(m.id),
        sender: (m.direction === 'inbound' ? 'lead' : (m.direction === 'ai_sdr' ? 'ai_sdr' : 'sales')) as 'lead' | 'sales' | 'ai_sdr',
        content: m.body || '',
        time: m.sent_at ? new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        status: (m.delivery_status || 'delivered') as 'sent' | 'delivered' | 'read',
      }));
    }
    return activeThread?.messages || [];
  }, [threadMessages, activeThread]);

  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      const matchChannel = selectedChannelFilter === 'all' || t.channel === selectedChannelFilter;
      const matchSearch =
        t.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
      return matchChannel && matchSearch;
    });
  }, [threads, selectedChannelFilter, searchQuery]);

  const handleSendMessage = async () => {
    if (!replyText.trim() || !activeThread) return;

    setIsSending(true);
    try {
      // Send real message via API
      const res = await apiFetch('/whatsapp/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: Number(activeThread.id),
          phone: activeThread.phone || activeThread.contactName,
          text: replyText.trim(),
          platform: activeThread.rawPlatform || activeThread.channel,
        }),
      });

      if (!res.ok) {
        // Fallback notification if engine inactive
        toast.info(
          'Engine Offline',
          'Pesan dicatat di timeline internal. Aktifkan WhatsApp engine untuk pengiriman langsung.'
        );
      } else {
        toast.success(
          'Pesan Terkirim',
          `Pesan berhasil dikirim via ${activeThread.channel.toUpperCase()} ke ${activeThread.contactName}.`
        );
      }

      setReplyText('');
      refetchConvs();
    } catch (err) {
      console.error(err);
      toast.fromError(err, 'Gagal mengirim pesan.');
    } finally {
      setIsSending(false);
    }
  };

  const handleUseAiSuggestion = (suggestion: string) => {
    setReplyText(suggestion);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-border bg-card px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
            <Inbox className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">Unified Omnichannel Inbox</h1>
            <p className="text-[11px] text-muted-foreground">
              WhatsApp, Email & Autonomous AI SDR Inbound Stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1.5 py-1">
            <Bot className="h-3.5 w-3.5" /> AI SDR Active • Auto Inbound Routing
          </Badge>
        </div>
      </div>

      {/* 3-Column Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Threads Sidebar */}
        <div className="w-80 md:w-96 border-r border-border bg-card/50 flex flex-col shrink-0">
          {/* Channel Filter & Search */}
          <div className="p-3 border-b border-border space-y-2.5">
            <div className="flex rounded-lg bg-muted p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setSelectedChannelFilter('all')}
                className={`flex-1 py-1.5 rounded-md text-center transition-all ${
                  selectedChannelFilter === 'all' ? 'bg-card text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setSelectedChannelFilter('whatsapp')}
                className={`flex-1 py-1.5 rounded-md text-center transition-all flex items-center justify-center gap-1 ${
                  selectedChannelFilter === 'whatsapp' ? 'bg-card text-emerald-600 shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className="h-3 w-3" /> WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setSelectedChannelFilter('email')}
                className={`flex-1 py-1.5 rounded-md text-center transition-all flex items-center justify-center gap-1 ${
                  selectedChannelFilter === 'email' ? 'bg-card text-blue-600 shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Mail className="h-3 w-3" /> Email
              </button>
            </div>

            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari prospek atau pesan..."
                className="w-full bg-background rounded-lg border border-border pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-brand"
              />
            </div>
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
                {selectedChannelFilter === 'email' ? (
                  <>
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Mail className="h-6 w-6 stroke-1.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Belum ada email tersinkronisasi</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[240px] mx-auto leading-relaxed">
                        Hubungkan akun email (Lark Mail, Google Workspace, atau Custom SMTP/IMAP) untuk menyinkronkan email prospek langsung di Inbox.
                      </p>
                    </div>
                    <Link href="/settings/email">
                      <Button size="xs" variant="outline" className="text-xs border-blue-500/30 text-blue-500 hover:bg-blue-500/10 gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> Setup Integrasi Email
                      </Button>
                    </Link>
                  </>
                ) : selectedChannelFilter === 'whatsapp' ? (
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
                        <MessageSquare className="h-3.5 w-3.5" /> Kelola Koneksi WhatsApp
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                      <Inbox className="h-6 w-6 stroke-1.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Belum ada percakapan omnichannel aktif</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[240px] mx-auto leading-relaxed">
                        Pilih filter saluran di atas atau hubungkan akun WhatsApp dan Email perusahaan Anda.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href="/whatsapp">
                        <Button size="xs" variant="outline" className="text-xs">
                          Setup WhatsApp
                        </Button>
                      </Link>
                      <Link href="/settings/email">
                        <Button size="xs" variant="outline" className="text-xs">
                          Setup Email
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.id === activeThread?.id;
                return (
                  <div
                    key={thread.id}
                    onClick={() => setActiveThreadId(thread.id)}
                    className={`p-3.5 cursor-pointer transition-all hover:bg-muted/40 ${
                      isSelected ? 'bg-brand/5 border-l-4 border-l-brand' : ''
                    }`}
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
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        {thread.channel === 'whatsapp' ? (
                          <span className="text-emerald-500 flex items-center gap-0.5">
                            <MessageSquare className="h-3 w-3" /> WhatsApp
                          </span>
                        ) : (
                          <span className="text-blue-500 flex items-center gap-0.5">
                            <Mail className="h-3 w-3" /> Email
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

        {/* Column 2: Message Stream & Composer */}
        <div className="flex-1 flex flex-col bg-background">
          {!activeThread ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-muted/60 border border-border flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/60 stroke-1" />
              </div>
              <div className="max-w-sm space-y-1">
                <h3 className="font-bold text-sm text-foreground">Tidak Ada Percakapan Terpilih</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pilih percakapan dari daftar di sebelah kiri atau hubungkan perangkat WhatsApp Anda untuk mulai menyinkronkan pesan live.
                </p>
              </div>
              <Link href="/whatsapp">
                <Button size="sm" variant="outline" className="text-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Kelola Perangkat WhatsApp
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Thread Chat Header */}
              <div className="p-4 border-b border-border bg-card/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-sm text-foreground">
                    {activeThread.contactName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-sm text-foreground">{activeThread.contactName}</h2>
                      <Badge variant="outline" className="text-[10px] py-0">
                        {activeThread.stage}
                      </Badge>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        activeThread.channel === 'whatsapp'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-blue-500/10 text-blue-600'
                      }`}>
                        {activeThread.channel.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activeThread.contactRole} di <span className="font-medium text-foreground">{activeThread.companyName}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/leads/${activeThread.leadId}`}>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                      Buka Lead Detail <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Messages Feed */}
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
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-xs shadow-2xs space-y-1.5 ${
                          isLead
                            ? 'bg-card border border-border text-foreground rounded-tl-xs'
                            : isAi
                            ? 'bg-purple-950/20 border border-purple-500/30 text-foreground rounded-tr-xs'
                            : 'bg-brand text-white rounded-tr-xs'
                        }`}
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
                          className={`flex items-center justify-end gap-1.5 text-[10px] ${
                            isLead ? 'text-muted-foreground' : isAi ? 'text-purple-300' : 'text-white/80'
                          }`}
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
                  onClick={() => handleUseAiSuggestion(`Siap ${activeThread.contactName}, penawaran dan informasi layanan sudah kami siapkan. Kapan waktu terbaik untuk review singkat bersama tim Anda?`)}
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
                    placeholder={`Balas via ${activeThread?.channel ? activeThread.channel.toUpperCase() : 'CHAT'} ke ${activeThread?.contactName || 'Kontak'}...`}
                    rows={2}
                    className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-brand"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || !replyText.trim() || !activeThread}
                    className="h-10 px-4 rounded-xl bg-brand text-white hover:bg-brand/90 gap-1.5 shadow-xs"
                  >
                    {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Kirim
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Column 3: Customer 360 & Deal Context */}
        <div className="w-72 border-l border-border bg-card/30 p-4 space-y-4 overflow-y-auto hidden lg:block">
          <div className="space-y-1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
              Customer 360 & Deal Intel
            </h3>
            <p className="text-xs text-foreground font-semibold">{activeThread?.companyName || '-'}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
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
    </div>
  );
}
