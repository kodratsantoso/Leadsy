'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { 
  Inbox, MessageSquare, Mail, Phone, Send, Search, Filter, 
  Sparkles, CheckCheck, Clock, Building2, User, ExternalLink, 
  ChevronRight, Bot, Zap, ArrowRight, ShieldCheck, RefreshCw, 
  Plus, MoreVertical, Calendar, DollarSign, CheckCircle2,
  Tag, UserCheck, Check, RotateCcw, FileText, Layers, X,
  PenSquare, CornerUpLeft, Paperclip, ChevronDown, CheckSquare,
  QrCode, Wifi, WifiOff, Radio, RadioTower, AlertCircle, Copy,
  Smile, ShieldAlert, SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { fetchAssignableUsers, type AssignableUser } from '@/lib/api/leads';
import { useWhatsApp, type WaSessionState } from '@/lib/hooks/use-whatsapp';
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

const CANNED_REPLIES = [
  {
    title: 'Salam Perkenalan B2B',
    text: 'Halo Bapak/Ibu, terima kasih telah menghubungi Leadsy. Ada yang bisa kami bantu terkait optimasi proses penjualan dan otomasi lead intelligence bisnis Anda hari ini?',
  },
  {
    title: 'Kirim Profil & Solusi',
    text: 'Baik Bapak/Ibu, berikut ringkasan informasi solusi enterprise Leadsy. Kami juga dapat mengatur sesi demo singkat 15 menit via Google Meet/Zoom jika berkenan.',
  },
  {
    title: 'Follow-up Penawaran',
    text: 'Selamat pagi Bapak/Ibu, kami ingin menanyakan kelanjutan proposal penawaran yang telah kami kirimkan sebelumnya. Apakah ada bagian atau penyesuaian yang perlu kami diskusikan lebih lanjut?',
  },
  {
    title: 'Konfirmasi Jadwal Meeting',
    text: 'Terima kasih atas konfirmasinya. Undangan kalender meeting telah kami jadwalkan bersama tim spesialis kami. Sampai jumpa di sesi pertemuan nanti.',
  },
];

function OmnichannelInboxContent() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // ── URL Query Sync ──
  const initialChannelParam = searchParams.get('channel') as 'whatsapp' | 'email' | null;
  const initialEngineParam = searchParams.get('engine') as 'local' | 'qontak' | null;
  const initialActionParam = searchParams.get('action');

  // ── Primary View States ──
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'whatsapp' | 'email'>(
    initialChannelParam === 'whatsapp' ? 'whatsapp' : initialChannelParam === 'email' ? 'email' : 'all'
  );
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Channel Sub-Filters ──
  const [waEngineFilter, setWaEngineFilter] = useState<'all' | 'whatsapp' | 'mekari_qontak'>(
    initialEngineParam === 'local' ? 'whatsapp' : initialEngineParam === 'qontak' ? 'mekari_qontak' : 'all'
  );
  const [waStatusFilter, setWaStatusFilter] = useState<'all' | 'unassigned' | 'resolved'>('all');
  const [emailFolderFilter, setEmailFolderFilter] = useState<'all' | 'inbox' | 'sent' | 'unread'>('all');

  // ── Interaction & Composer States ──
  const [replyText, setReplyText] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSyncingEmail, setIsSyncingEmail] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // ── Reference Data ──
  const [stages, setStages] = useState<{ id: number; name: string }[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);

  // ── WhatsApp Session & Engine Hook ──
  const {
    getStatus: getWaStatus,
    initSession: initWaSession,
    refreshQr: refreshWaQr,
    disconnect: disconnectWaSession,
    loading: waLoading,
  } = useWhatsApp();

  const [waSession, setWaSession] = useState<WaSessionState>({
    status: 'disconnected',
    number: null,
    qr_payload: null,
    connected_at: null,
  });

  const fetchWaStatus = useCallback(async () => {
    try {
      const st = await getWaStatus();
      setWaSession(st);
    } catch {
      // ignore background polling error
    }
  }, [getWaStatus]);

  useEffect(() => {
    fetchWaStatus();
    const interval = setInterval(fetchWaStatus, 7000);
    return () => clearInterval(interval);
  }, [fetchWaStatus]);

  // ── Modals State ──
  const [isWaDeviceModalOpen, setIsWaDeviceModalOpen] = useState(initialActionParam === 'connect');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isComposeEmailOpen, setIsComposeEmailOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  // New Chat Form State
  const [newChatChannel, setNewChatChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [newChatEngine, setNewChatEngine] = useState<'whatsapp' | 'mekari_qontak'>('whatsapp');
  const [newChatRecipient, setNewChatRecipient] = useState('');
  const [newChatSubject, setNewChatSubject] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [isSendingNewChat, setIsSendingNewChat] = useState(false);

  // Email Compose Form State
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isSendingCompose, setIsSendingCompose] = useState(false);

  // Broadcast Form State
  const [broadcastName, setBroadcastName] = useState('');
  const [broadcastEngine, setBroadcastEngine] = useState<'whatsapp' | 'mekari_qontak'>('whatsapp');
  const [broadcastRecipients, setBroadcastRecipients] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Convert to Lead Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertCompanyName, setConvertCompanyName] = useState('');
  const [convertStageId, setConvertStageId] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);

  // Load stages, assignable users, and leads for recipient picker
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

  // Fetch leads for autocomplete in New Chat
  const { data: leadsList } = useQuery({
    queryKey: ['inbox-leads-picker'],
    queryFn: async () => {
      try {
        const res = await apiFetch('/leads?per_page=50');
        if (!res.ok) return [];
        const json = await res.json();
        return json.data?.data || json.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });

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
          t.lastMessage.toLowerCase().includes(query) ||
          (t.phone && t.phone.toLowerCase().includes(query));
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

  // 1. Send Message / Email in Active Thread
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
      toast.error('Form Belum Lengkap', 'Penerima, subjek, dan isi email wajib diisi.');
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

  // 4. Start New Chat / Message (WhatsApp or Email)
  const handleSendNewChat = async () => {
    if (!newChatRecipient.trim() || !newChatMessage.trim()) {
      toast.error('Form Belum Lengkap', 'Nomor/Email tujuan dan isi pesan wajib diisi.');
      return;
    }

    setIsSendingNewChat(true);
    try {
      const payload: any = {
        phone: newChatRecipient.trim(),
        text: newChatMessage.trim(),
        platform: newChatChannel === 'email' ? 'email' : newChatEngine,
      };

      if (newChatChannel === 'email') {
        payload.subject = newChatSubject.trim() || 'Pesan dari Tim Bisnis Leadsy';
      }

      const res = await apiFetch('/whatsapp/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error('Gagal Mengirim Pesan', json.error || json.message || 'Periksa koneksi perangkat WhatsApp / Email.');
      } else {
        toast.success('Pesan Terkirim', json.message || `Pesan berhasil dikirim ke ${newChatRecipient}.`);
        setIsNewChatModalOpen(false);
        setNewChatRecipient('');
        setNewChatSubject('');
        setNewChatMessage('');
        setSelectedLeadId('');
        refetchConvs();
      }
    } catch (err) {
      toast.fromError(err, 'Gagal mengirim pesan baru.');
    } finally {
      setIsSendingNewChat(false);
    }
  };

  // Handle lead selection for New Chat recipient
  const handleSelectLeadRecipient = (leadIdStr: string) => {
    setSelectedLeadId(leadIdStr);
    if (!leadIdStr) return;

    const foundLead = leadsList?.find((l: any) => String(l.id) === leadIdStr);
    if (foundLead) {
      if (newChatChannel === 'email') {
        setNewChatRecipient(foundLead.email || foundLead.contact_email || '');
      } else {
        setNewChatRecipient(foundLead.phone || foundLead.phone_number || foundLead.mobile || '');
      }
      setNewChatSubject(`Penawaran Solusi Leadsy untuk ${foundLead.company_name || foundLead.name}`);
    }
  };

  // 5. Send Broadcast Campaign
  const handleSendBroadcast = async () => {
    if (!broadcastName.trim() || !broadcastRecipients.trim() || !broadcastMessage.trim()) {
      toast.error('Form Belum Lengkap', 'Nama kampanye, daftar penerima, dan pesan wajib diisi.');
      return;
    }

    setIsSendingBroadcast(true);
    try {
      // Split recipients by newline, comma, or semicolon
      const rawList = broadcastRecipients
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await apiFetch('/whatsapp/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_name: broadcastName.trim(),
          platform: broadcastEngine,
          message_template: broadcastMessage.trim(),
          phone_numbers: rawList,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error('Broadcast Gagal', json.error || json.message || 'Tidak dapat memproses kampanye broadcast.');
      } else {
        toast.success('Broadcast Dijadwalkan', `Kampanye "${broadcastName}" dengan ${rawList.length} penerima berhasil dikirim.`);
        setIsBroadcastModalOpen(false);
        setBroadcastName('');
        setBroadcastRecipients('');
        setBroadcastMessage('');
        refetchConvs();
      }
    } catch (err) {
      toast.fromError(err, 'Gagal memproses broadcast.');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // 6. Trigger AI Conversation Analysis
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

  // 7. Convert Conversation to Lead
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

  // 8. Update Assignee & Resolution
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

  // 9. Add and Remove Tags
  const handleAddTag = async () => {
    if (!activeThread || !newTagInput.trim()) return;
    const newTag = newTagInput.trim();
    const currentTags = activeThread.tags || [];
    if (currentTags.includes(newTag)) {
      setNewTagInput('');
      return;
    }
    const updatedTags = [...currentTags, newTag];
    try {
      await apiFetch(`/whatsapp/conversations/${activeThread.id}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
      });
      setNewTagInput('');
      refetchConvs();
    } catch {
      toast.error('Gagal Menambah Tag', 'Tidak dapat menyimpan tag baru.');
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!activeThread) return;
    const updatedTags = (activeThread.tags || []).filter((t) => t !== tagToRemove);
    try {
      await apiFetch(`/whatsapp/conversations/${activeThread.id}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
      });
      refetchConvs();
    } catch {
      toast.error('Gagal Menghapus Tag', 'Tidak dapat memperbarui daftar tag.');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* ── Top Header Bar ── */}
      <div className="h-14 border-b border-border bg-card px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
            <Inbox className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground">Omnichannel Inbox & Communications Suite</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground border border-border">
                Unified Channel Hub
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              WhatsApp (Local Baileys & Mekari Qontak Official) & Lark-Style Enterprise Mailbox
            </p>
          </div>
        </div>

        {/* Header Right Action Group */}
        <div className="flex items-center gap-2">
          {/* Quick Action: Chat Baru */}
          <Button
            size="sm"
            onClick={() => setIsNewChatModalOpen(true)}
            className="h-8 text-xs gap-1.5 bg-brand hover:bg-brand/90 text-white shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Pesan Baru</span>
          </Button>

          {/* Quick Action: Tulis Email Baru */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsComposeEmailOpen(true)}
            className="h-8 text-xs gap-1.5 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
          >
            <PenSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tulis Email</span>
          </Button>

          {/* Quick Action: Sync Email IMAP */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncEmails}
            disabled={isSyncingEmail}
            className="h-8 text-xs gap-1.5 border-border hover:bg-muted/40 cursor-pointer hidden md:flex"
            title="Tarik email terbaru dari server IMAP Lark Suite"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isSyncingEmail && "animate-spin")} />
            <span>{isSyncingEmail ? "Menyinkronkan..." : "Tarik Email"}</span>
          </Button>

          {/* Quick Action: Broadcast WA */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBroadcastModalOpen(true)}
            className="h-8 text-xs gap-1.5 border-border hover:bg-muted/40 cursor-pointer hidden lg:flex"
            title="Kirim pesan massal / broadcast WhatsApp"
          >
            <Radio className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            <span>Broadcast WA</span>
          </Button>

          {/* WhatsApp Device Connection Status Button & Live Dot */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsWaDeviceModalOpen(true)}
            className={cn(
              "h-8 text-xs gap-1.5 cursor-pointer transition-all",
              waSession.status === 'connected'
                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                : waSession.status === 'qr_ready' || waSession.status === 'connecting'
                ? "border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                : "border-border text-muted-foreground hover:bg-muted/40"
            )}
            title="Kelola pairing perangkat WhatsApp dan status engine"
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                waSession.status === 'connected'
                  ? "bg-emerald-500 animate-pulse"
                  : waSession.status === 'qr_ready' || waSession.status === 'connecting'
                  ? "bg-amber-500 animate-pulse"
                  : "bg-muted-foreground"
              )}
            />
            <MessageSquare className="h-3.5 w-3.5" />
            <span>
              {waSession.status === 'connected'
                ? `WA: ${waSession.number || 'Terhubung'}`
                : waSession.status === 'qr_ready'
                ? 'Scan QR WA'
                : 'Status WhatsApp'}
            </span>
          </Button>
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
                  <option value="whatsapp">Local WhatsApp (Baileys)</option>
                  <option value="mekari_qontak">Mekari Qontak API</option>
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
                      "flex-1 py-1 rounded-md text-center transition-all capitalize",
                      emailFolderFilter === folder
                        ? "bg-blue-600 text-white font-semibold"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {folder === 'all' ? 'Semua Email' : folder}
                  </button>
                ))}
              </div>
            )}

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari kontak, nomor, atau isi pesan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
          </div>

          {/* Threads Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/50">
            {loadingConvs ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto text-brand" />
                <p>Memuat percakapan masuk...</p>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                {selectedChannel === 'email' ? (
                  <>
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mx-auto">
                      <Mail className="h-6 w-6 stroke-1.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Belum ada email masuk</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[240px] mx-auto leading-relaxed">
                        Tarik email terbaru dari server IMAP Lark Suite atau kirim penawaran baru.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={handleSyncEmails} className="text-xs h-7 gap-1">
                        <RefreshCw className="h-3 w-3" /> Tarik Email
                      </Button>
                      <Button size="sm" onClick={() => setIsComposeEmailOpen(true)} className="text-xs h-7 gap-1 bg-blue-600 text-white hover:bg-blue-700">
                        <PenSquare className="h-3 w-3" /> Tulis Email
                      </Button>
                    </div>
                  </>
                ) : selectedChannel === 'whatsapp' ? (
                  <>
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto">
                      <MessageSquare className="h-6 w-6 stroke-1.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Belum ada percakapan WhatsApp</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[240px] mx-auto leading-relaxed">
                        Hubungkan perangkat WhatsApp (Baileys) atau Mekari Qontak untuk memulai percakapan masuk secara real-time.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsWaDeviceModalOpen(true)}
                        className="text-xs h-7 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 gap-1.5"
                      >
                        <QrCode className="h-3.5 w-3.5" /> Hubungkan WhatsApp
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setIsNewChatModalOpen(true)}
                        className="text-xs h-7 bg-brand text-white hover:bg-brand/90 gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" /> Chat Baru
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center text-brand mx-auto">
                      <Inbox className="h-6 w-6 stroke-1.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Belum ada percakapan aktif</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[240px] mx-auto leading-relaxed">
                        Mulai komunikasi dengan menghubungkan WhatsApp atau membuat pesan baru.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <Button size="sm" onClick={() => setIsNewChatModalOpen(true)} className="text-xs h-7 bg-brand text-white hover:bg-brand/90 gap-1">
                        <Plus className="h-3 w-3" /> Mulai Pesan
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsWaDeviceModalOpen(true)} className="text-xs h-7 gap-1">
                        <QrCode className="h-3 w-3" /> Perangkat WA
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.id === activeThread?.id;
                const isEmail = thread.channel === 'email';

                if (isEmail) {
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
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold px-1.5 py-0.2 rounded bg-blue-500/10 shrink-0">
                              Lark Mail
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-foreground truncate mt-1">
                            {thread.subject || 'Tanpa Subjek'}
                          </p>

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
                          <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1 font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-600" /> Qontak API
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
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
                <Button size="sm" onClick={() => setIsNewChatModalOpen(true)} className="text-xs gap-1.5 bg-brand text-white hover:bg-brand/90">
                  <Plus className="h-3.5 w-3.5" /> Pesan Baru
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsWaDeviceModalOpen(true)} className="text-xs gap-1.5">
                  <QrCode className="h-3.5 w-3.5" /> Perangkat WhatsApp
                </Button>
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
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Lark Suite IMAP • SSL
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">{activeThread.phone}</span>
                  </div>
                  <h2 className="text-base font-bold text-foreground leading-snug">
                    {activeThread.subject || 'Percakapan Email Tanpa Subjek'}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                    <span>Dari: <strong className="text-foreground">{activeThread.contactName}</strong></span>
                    <span>•</span>
                    <span>Perusahaan: <strong className="text-foreground">{activeThread.companyName}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleResolved}
                    className={cn(
                      "h-8 text-xs gap-1.5",
                      activeThread.isResolved && "text-emerald-600 border-emerald-500/30"
                    )}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>{activeThread.isResolved ? 'Resolved' : 'Tandai Selesai'}</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleOpenConvertModal}
                    className="h-8 text-xs gap-1.5 bg-brand text-white hover:bg-brand/90"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Konversi Lead</span>
                  </Button>
                </div>
              </div>

              {/* Email Thread Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messagesToDisplay.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Tidak ada pesan email untuk ditampilkan.
                  </div>
                ) : (
                  messagesToDisplay.map((msg) => (
                    <div
                      key={msg.id}
                      className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between border-b border-border/60 pb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs",
                            msg.sender === 'sales'
                              ? "bg-blue-600 text-white"
                              : "bg-muted text-foreground"
                          )}>
                            {msg.sender === 'sales' ? 'ME' : msg.fromEmail?.[0]?.toUpperCase() || 'L'}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              {msg.sender === 'sales' ? 'Anda (Sales Team)' : msg.fromEmail || activeThread.contactName}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Kepada: {msg.toEmail || activeThread.phone}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{msg.time}</span>
                      </div>

                      <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {msg.content.replace(/^Subjek:.*?\n/i, '')}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Email Quick Reply Composer */}
              <div className="p-4 border-t border-border bg-card/60 space-y-3 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-xs font-medium text-muted-foreground shrink-0">Subjek:</span>
                    <Input
                      type="text"
                      value={replySubject}
                      onChange={(e) => setReplySubject(e.target.value)}
                      placeholder="Subjek balasan..."
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  {/* Canned Reply Dropdown */}
                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        if (!isNaN(idx) && CANNED_REPLIES[idx]) {
                          setReplyText(CANNED_REPLIES[idx].text);
                        }
                      }}
                      className="h-8 text-[11px] bg-background border border-border rounded-lg px-2 text-foreground focus:outline-hidden"
                      defaultValue=""
                    >
                      <option value="" disabled>Template Balasan...</option>
                      {CANNED_REPLIES.map((cr, idx) => (
                        <option key={idx} value={idx}>{cr.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Tulis balasan email ke ${activeThread.contactName}...`}
                    rows={3}
                    className="text-xs bg-background leading-relaxed pr-24 resize-none"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={isSending || !replyText.trim()}
                    className="absolute right-2.5 bottom-2.5 h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    {isSending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    <span>Kirim</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ───────────────────────────────────────────────────────────
             *  WHATSAPP CONSOLE INTERFACE (Mekari Qontak / Local Baileys)
             * ─────────────────────────────────────────────────────────── */
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* WhatsApp Thread Header */}
              <div className="px-5 py-3 border-b border-border bg-card/60 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                    {activeThread.contactName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-foreground">{activeThread.companyName}</h2>
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.2 rounded-full",
                        activeThread.rawPlatform === 'mekari_qontak'
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      )}>
                        {activeThread.rawPlatform === 'mekari_qontak' ? 'Mekari Qontak Official' : 'Local Baileys Sidecar'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activeThread.contactName} • <span className="font-mono">{activeThread.phone}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAnalyzeConversation}
                    disabled={isAnalyzing}
                    className="h-8 text-xs gap-1.5 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                    title="Analisis AI untuk mendeteksi intent deal"
                  >
                    <Sparkles className={cn("h-3.5 w-3.5", isAnalyzing && "animate-spin")} />
                    <span>AI Insights</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleResolved}
                    className={cn(
                      "h-8 text-xs gap-1.5",
                      activeThread.isResolved && "text-emerald-600 border-emerald-500/30"
                    )}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>{activeThread.isResolved ? 'Resolved' : 'Selesai'}</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleOpenConvertModal}
                    className="h-8 text-xs gap-1.5 bg-brand text-white hover:bg-brand/90"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Konversi Lead</span>
                  </Button>
                </div>
              </div>

              {/* Chat Stream Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-muted/20">
                {messagesToDisplay.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Belum ada riwayat pesan percakapan ini.
                  </div>
                ) : (
                  messagesToDisplay.map((msg) => {
                    const isOutbound = msg.sender === 'sales' || msg.sender === 'ai_sdr';

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col max-w-[75%]",
                          isOutbound ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed",
                            isOutbound
                              ? "bg-brand text-white rounded-br-xs"
                              : "bg-card border border-border text-foreground rounded-bl-xs"
                          )}
                        >
                          {msg.sender === 'ai_sdr' && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-200 font-bold mb-1">
                              <Sparkles className="h-3 w-3" /> Autonomous AI SDR
                            </div>
                          )}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div
                            className={cn(
                              "flex items-center justify-end gap-1 text-[10px] mt-1",
                              isOutbound ? "text-white/80" : "text-muted-foreground"
                            )}
                          >
                            <span>{msg.time}</span>
                            {isOutbound && (
                              <CheckCheck className="h-3 w-3 text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Composer */}
              <div className="p-4 border-t border-border bg-card/60 space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Mengirim via: <strong>{activeThread.rawPlatform === 'mekari_qontak' ? 'Mekari Qontak API' : 'Local Baileys'}</strong></span>
                  </div>

                  {/* Template Picker */}
                  <select
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      if (!isNaN(idx) && CANNED_REPLIES[idx]) {
                        setReplyText(CANNED_REPLIES[idx].text);
                      }
                    }}
                    className="h-7 text-[11px] bg-background border border-border rounded-lg px-2 text-foreground focus:outline-hidden"
                    defaultValue=""
                  >
                    <option value="" disabled>Template Cepat...</option>
                    {CANNED_REPLIES.map((cr, idx) => (
                      <option key={idx} value={idx}>{cr.title}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Ketik pesan balasan WhatsApp ke ${activeThread.contactName}...`}
                    rows={2}
                    className="text-xs bg-background leading-relaxed pr-24 resize-none"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={isSending || !replyText.trim()}
                    className="absolute right-2.5 bottom-2.5 h-8 text-xs gap-1.5 bg-brand hover:bg-brand/90 text-white cursor-pointer"
                  >
                    {isSending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    <span>Kirim</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Column 3: CRM Context & Intelligence Drawer ── */}
        <div className="w-80 border-l border-border bg-card/20 p-4 overflow-y-auto space-y-4 shrink-0 hidden xl:block">
          <div className="space-y-1 pb-3 border-b border-border">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              CRM Intelligence & Context
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Data terintegrasi ke Leadsy Pipeline & Scoring Model
            </p>
          </div>

          {/* Contact Details Card */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                PROFILE KONTAK
              </span>
              <Badge variant="outline" className="text-[10px]">
                {activeThread?.channel === 'email' ? 'Email Contact' : 'WhatsApp Client'}
              </Badge>
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-foreground">{activeThread?.contactName || '-'}</p>
              <p className="text-muted-foreground">{activeThread?.contactRole || '-'}</p>
              <p className="text-muted-foreground font-mono">{activeThread?.phone || '-'}</p>
            </div>
          </div>

          {/* Deal & Pipeline Card */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                DEAL PIPELINE
              </span>
              <Badge variant="outline" className="text-[10px]">
                {activeThread?.stage || 'Pipeline'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Estimasi Nilai</span>
              <span className="font-bold text-brand">{activeThread?.dealValue || '-'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Health Score</span>
              <Badge variant="outline" className="font-bold text-emerald-600 border-emerald-500/30">
                {activeThread?.score || 0}/100
              </Badge>
            </div>
          </div>

          {/* Tags Management Card */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Tag className="h-3 w-3 text-brand" /> TAGS PERCAKAPAN
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(activeThread?.tags || []).map((t, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-muted text-foreground border border-border"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="text-muted-foreground hover:text-destructive cursor-pointer font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <Input
                type="text"
                placeholder="Tambah tag baru..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                className="h-7 text-xs bg-background"
              />
              <Button size="xs" variant="outline" onClick={handleAddTag} className="h-7 px-2 text-xs shrink-0">
                + Tambah
              </Button>
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
        </div>
      </div>

      {/* ── Modal 1: WhatsApp Device & Engine Manager ── */}
      <Modal
        open={isWaDeviceModalOpen}
        onOpenChange={setIsWaDeviceModalOpen}
        title="Pengaturan Perangkat & Engine WhatsApp"
        description="Kelola pairing QR code Local WhatsApp Baileys dan koneksi Mekari Qontak Official BSP."
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Link href="/settings/integrations?tab=whatsapp" className="text-xs text-brand hover:underline flex items-center gap-1">
              Buka Integrasi WhatsApp Lengkap <ChevronRight className="h-3 w-3" />
            </Link>
            <Button variant="outline" size="sm" onClick={() => setIsWaDeviceModalOpen(false)}>
              Tutup
            </Button>
          </div>
        }
      >
        <div className="space-y-6 py-2">
          {/* Section: Local Baileys WhatsApp Engine */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Local Baileys WhatsApp Engine</h4>
                  <p className="text-[11px] text-muted-foreground">Koneksi sidecar peer-to-peer tanpa biaya API per pesan.</p>
                </div>
              </div>

              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] capitalize font-medium",
                  waSession.status === 'connected'
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : waSession.status === 'qr_ready' || waSession.status === 'connecting'
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-border text-muted-foreground"
                )}
              >
                {waSession.status}
              </Badge>
            </div>

            {/* Baileys State 1: Disconnected */}
            {waSession.status === 'disconnected' && (
              <div className="flex flex-col items-center gap-3 py-6 rounded-xl border border-dashed border-border bg-muted/20">
                <WifiOff className="h-10 w-10 text-muted-foreground/60" />
                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold text-foreground">Sesi WhatsApp Belum Aktif</p>
                  <p className="text-[11px] text-muted-foreground max-w-sm">
                    Inisialisasi koneksi untuk men-generate QR Code pairing dengan smartphone Anda.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    await initWaSession();
                    fetchWaStatus();
                  }}
                  disabled={waLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer"
                >
                  {waLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                  <span>Inisialisasi Koneksi (Generate QR)</span>
                </Button>
              </div>
            )}

            {/* Baileys State 2: Connecting */}
            {waSession.status === 'connecting' && (
              <div className="flex flex-col items-center gap-3 py-6 rounded-xl border border-dashed border-border bg-muted/20">
                <RefreshCw className="h-8 w-8 text-brand animate-spin" />
                <p className="text-xs font-semibold text-foreground">Menghubungkan ke Baileys Server...</p>
                <p className="text-[11px] text-muted-foreground">Menunggu payload QR Code dari engine WhatsApp.</p>
              </div>
            )}

            {/* Baileys State 3: QR Code Ready */}
            {waSession.status === 'qr_ready' && waSession.qr_payload && (
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl border border-border bg-muted/20">
                <div className="flex h-44 w-44 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white p-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(waSession.qr_payload)}`}
                    alt="WhatsApp QR Code"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="space-y-3 flex-1">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 text-emerald-500 animate-spin" />
                      Pindai QR Code di Smartphone Anda
                    </p>
                    <ol className="list-decimal list-inside text-[11px] text-muted-foreground space-y-1">
                      <li>Buka aplikasi WhatsApp di smartphone Anda.</li>
                      <li>Pilih menu <strong>Perangkat Tertaut (Linked Devices)</strong>.</li>
                      <li>Ketuk <strong>Tautkan Perangkat (Link a Device)</strong>.</li>
                      <li>Arahkan kamera ke QR Code di samping.</li>
                    </ol>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await refreshWaQr();
                      fetchWaStatus();
                    }}
                    disabled={waLoading}
                    className="h-7 text-[11px] gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Refresh QR Code
                  </Button>
                </div>
              </div>
            )}

            {/* Baileys State 4: Connected */}
            {waSession.status === 'connected' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Wifi className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Perangkat WhatsApp Terhubung</p>
                    <p className="text-[11px] text-muted-foreground">
                      Nomor: <strong className="text-foreground font-mono">{waSession.number || '-'}</strong>
                    </p>
                    {waSession.connected_at && (
                      <p className="text-[10px] text-muted-foreground">
                        Terhubung sejak: {new Date(waSession.connected_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await disconnectWaSession();
                    fetchWaStatus();
                  }}
                  disabled={waLoading}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs h-8 shrink-0"
                >
                  Putuskan Sesi
                </Button>
              </div>
            )}
          </div>

          {/* Section: Mekari Qontak Official BSP */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <RadioTower className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Mekari Qontak Official BSP</h4>
                  <p className="text-[11px] text-muted-foreground">WhatsApp Business API resmi via Meta Cloud API / Mekari Qontak.</p>
                </div>
              </div>

              <Link href="/settings/integrations?tab=whatsapp">
                <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1">
                  <ExternalLink className="h-3 w-3" /> Konfigurasi Token
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mekari Qontak menggunakan kredensial API Token resmi. Pesan outbound disalurkan secara stabil dengan SLA enterprise dan verifikasi Centang Hijau (*Official Green Tick*).
            </p>
          </div>
        </div>
      </Modal>

      {/* ── Modal 2: Pesan Baru / Chat Baru (WhatsApp or Email) ── */}
      <Modal
        open={isNewChatModalOpen}
        onOpenChange={setIsNewChatModalOpen}
        title="Mulai Percakapan / Kirim Pesan Baru"
        description="Kirim pesan langsung ke nomor WhatsApp atau alamat email prospek."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setIsNewChatModalOpen(false)} disabled={isSendingNewChat}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSendNewChat}
              disabled={isSendingNewChat || !newChatRecipient.trim() || !newChatMessage.trim()}
              className="bg-brand text-white hover:bg-brand/90 gap-1.5"
            >
              {isSendingNewChat ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span>Kirim Pesan Pertama</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          {/* Channel Choice */}
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => setNewChatChannel('whatsapp')}
              className={cn(
                "p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5",
                newChatChannel === 'whatsapp'
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "border-border bg-card hover:bg-muted/30 text-muted-foreground"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              <div className="text-xs">
                <p className="font-bold">WhatsApp</p>
                <p className="text-[10px] font-normal opacity-80">Baileys / Mekari Qontak</p>
              </div>
            </div>

            <div
              onClick={() => setNewChatChannel('email')}
              className={cn(
                "p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5",
                newChatChannel === 'email'
                  ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                  : "border-border bg-card hover:bg-muted/30 text-muted-foreground"
              )}
            >
              <Mail className="h-4 w-4" />
              <div className="text-xs">
                <p className="font-bold">Email Outbound</p>
                <p className="text-[10px] font-normal opacity-80">Lark Mail / SMTP</p>
              </div>
            </div>
          </div>

          {/* Engine Selector if WhatsApp */}
          {newChatChannel === 'whatsapp' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Engine Pengiriman:</label>
              <select
                value={newChatEngine}
                onChange={(e) => setNewChatEngine(e.target.value as any)}
                className="w-full bg-background text-xs border border-border rounded-lg px-3 py-2 text-foreground focus:outline-hidden"
              >
                <option value="whatsapp">Local WhatsApp (Baileys Sidecar)</option>
                <option value="mekari_qontak">Mekari Qontak Official API</option>
              </select>
            </div>
          )}

          {/* Lead Picker Autocomplete */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Pilih Dari Database Lead (Opsional):</label>
            <select
              value={selectedLeadId}
              onChange={(e) => handleSelectLeadRecipient(e.target.value)}
              className="w-full bg-background text-xs border border-border rounded-lg px-3 py-2 text-foreground focus:outline-hidden"
            >
              <option value="">Ketik manual atau pilih kontak lead...</option>
              {leadsList?.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.company_name || l.name} — {newChatChannel === 'email' ? l.email || l.contact_email : l.phone || l.phone_number}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              {newChatChannel === 'email' ? 'Email Tujuan:' : 'Nomor Handphone / WhatsApp Tujuan:'}
            </label>
            <Input
              type={newChatChannel === 'email' ? 'email' : 'text'}
              value={newChatRecipient}
              onChange={(e) => setNewChatRecipient(e.target.value)}
              placeholder={newChatChannel === 'email' ? 'contoh: nama@perusahaan.com' : 'contoh: 08123456789 atau 628123456789'}
              className="text-xs bg-background font-mono"
            />
          </div>

          {/* Email Subject if Email */}
          {newChatChannel === 'email' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Subjek Email:</label>
              <Input
                value={newChatSubject}
                onChange={(e) => setNewChatSubject(e.target.value)}
                placeholder="Subjek penawaran atau follow-up..."
                className="text-xs bg-background"
              />
            </div>
          )}

          {/* Message Textarea */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Isi Pesan:</label>
              <select
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  if (!isNaN(idx) && CANNED_REPLIES[idx]) {
                    setNewChatMessage(CANNED_REPLIES[idx].text);
                  }
                }}
                className="text-[11px] bg-background border border-border rounded-md px-2 py-0.5 text-foreground focus:outline-hidden"
                defaultValue=""
              >
                <option value="" disabled>Gunakan Template Cepat...</option>
                {CANNED_REPLIES.map((cr, idx) => (
                  <option key={idx} value={idx}>{cr.title}</option>
                ))}
              </select>
            </div>
            <Textarea
              value={newChatMessage}
              onChange={(e) => setNewChatMessage(e.target.value)}
              placeholder="Tulis pesan yang ingin disampaikan..."
              rows={4}
              className="text-xs bg-background leading-relaxed resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* ── Modal 3: Broadcast Pesan WhatsApp ── */}
      <Modal
        open={isBroadcastModalOpen}
        onOpenChange={setIsBroadcastModalOpen}
        title="Broadcast Pesan WhatsApp"
        description="Kirim pesan kampanye massal ke daftar nomor prospek atau pelanggan."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setIsBroadcastModalOpen(false)} disabled={isSendingBroadcast}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSendBroadcast}
              disabled={isSendingBroadcast || !broadcastName.trim() || !broadcastRecipients.trim() || !broadcastMessage.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
            >
              {isSendingBroadcast ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />}
              <span>Jadwalkan & Kirim Broadcast</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Nama Kampanye Broadcast:</label>
            <Input
              value={broadcastName}
              onChange={(e) => setBroadcastName(e.target.value)}
              placeholder="contoh: Broadcast Promo Q4 Enterprise Leadsy"
              className="text-xs bg-background"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Engine Pengiriman:</label>
            <select
              value={broadcastEngine}
              onChange={(e) => setBroadcastEngine(e.target.value as any)}
              className="w-full bg-background text-xs border border-border rounded-lg px-3 py-2 text-foreground focus:outline-hidden"
            >
              <option value="whatsapp">Local WhatsApp (Baileys Sidecar)</option>
              <option value="mekari_qontak">Mekari Qontak Official API</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Daftar Nomor Penerima:</label>
              <span className="text-[10px] text-muted-foreground">Pisahkan dengan baris baru atau koma</span>
            </div>
            <Textarea
              value={broadcastRecipients}
              onChange={(e) => setBroadcastRecipients(e.target.value)}
              placeholder="081234567890&#10;082198765432&#10;628112233445"
              rows={4}
              className="text-xs bg-background font-mono resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Template Pesan Broadcast:</label>
            <Textarea
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Halo, kami dari Leadsy ingin menginformasikan promo eksklusif..."
              rows={4}
              className="text-xs bg-background leading-relaxed resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* ── Modal 4: Tulis Email Baru (Lark Mail Style) ── */}
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

      {/* ── Modal 5: Convert to Lead ── */}
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

export default function OmnichannelInboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin text-brand" />
            <span>Memuat Omnichannel Inbox...</span>
          </div>
        </div>
      }
    >
      <OmnichannelInboxContent />
    </Suspense>
  );
}
