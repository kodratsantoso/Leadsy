"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageSquare, QrCode, Wifi, WifiOff, Send, Loader2,
  Radio, Shield, RefreshCw, Phone, ChevronRight,
  Sparkles, CheckCircle2, XCircle, AlertCircle, Plus, Trash2,
  Search, MoreVertical, Paperclip, Smile, Info, Check,
  User, ExternalLink, Tag, UserCheck, CheckCheck, SendHorizontal,
  Filter, Settings, MessageCircle, MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";
import {
  useWhatsApp,
  type WaSessionState, type WaConversation, type WaMessage,
  type WaCampaign, type WaSyncRule
} from "@/lib/hooks/use-whatsapp";

type Tab = "session" | "direct" | "broadcast" | "conversations" | "settings";
type FolderFilter = "all" | "my" | "unassigned" | "assigned" | "resolved";

export default function LocalWhatsAppPage() {
  const {
    loading,
    error,
    clearError,
    getStatus,
    initSession,
    refreshQr,
    disconnect,
    sendMessage,
    getConversations,
    getMessages,
    analyzeConversation,
    convertToLead,
    getCampaigns,
    createCampaign,
    executeCampaign,
    getSyncRules,
    updateSyncRules
  } = useWhatsApp();

  const platform = "whatsapp";
  const [tab, setTab] = useState<Tab>("conversations");
  const [stages, setStages] = useState<{ id: number; name: string }[]>([]);
  
  // ── UI States ──
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState<FolderFilter>("all");
  const [showDetails, setShowDetails] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  // ── Session State ──
  const [session, setSession] = useState<WaSessionState>({
    status: "disconnected", number: null, qr_payload: null, connected_at: null,
  });

  // ── Direct Message State ──
  const [dmPhone, setDmPhone] = useState("");
  const [dmText, setDmText] = useState("");
  const [dmSent, setDmSent] = useState(false);

  // ── Broadcast State ──
  const [campaigns, setCampaigns] = useState<WaCampaign[]>([]);
  const [bcName, setBcName] = useState("");
  const [bcMessage, setBcMessage] = useState("");
  const [bcLeadIds, setBcLeadIds] = useState("");

  // ── Conversations State ──
  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [activeConv, setActiveConv] = useState<WaConversation | null>(null);
  const [activeMessages, setActiveMessages] = useState<WaMessage[]>([]);
  
  // Local Rooms Metadata (Mock sync from Qontak pattern)
  const [localRoomsMeta, setLocalRoomsMeta] = useState<Record<string, { assignee: string; resolved: boolean; notes: string; tags: string[] }>>({});

  // ── Sync Rules State ──
  const [syncRules, setSyncRules] = useState<WaSyncRule[]>([]);
  const [rulesSaved, setRulesSaved] = useState(false);

  // ── Convert Modal State ──
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertCompanyName, setConvertCompanyName] = useState("");
  const [convertStageId, setConvertStageId] = useState("");
  const [convertError, setConvertError] = useState("");
  const [converting, setConverting] = useState(false);

  const messageEndRef = useRef<HTMLDivElement>(null);

  // Load static stages data
  useEffect(() => {
    apiFetch("/funnel/stages")
      .then(res => res.json())
      .then(json => {
        if (json?.data) {
          setStages(json.data);
        }
      })
      .catch(err => console.warn("Failed to load stages:", err));
  }, []);

  const handleOpenConvertModal = (conv: WaConversation) => {
    setActiveConv(conv);
    setConvertCompanyName(conv.contact?.name || "");
    if (stages.length > 0) {
      setConvertStageId(String(stages[0].id));
    } else {
      setConvertStageId("");
    }
    setConvertError("");
    setConvertModalOpen(true);
  };

  const handleConvertSubmit = async () => {
    if (!activeConv) return;
    if (!convertCompanyName.trim()) {
      setConvertError("Company name is required");
      return;
    }
    setConverting(true);
    setConvertError("");
    try {
      const res = await convertToLead(
        activeConv.id,
        convertCompanyName,
        convertStageId ? Number(convertStageId) : undefined
      );
      if (res && res.success) {
        setConvertModalOpen(false);
        // Refresh conversations list to update linked_lead_id
        getConversations("whatsapp").then(res => {
          setConversations(res);
          const updated = res.find(c => c.id === activeConv.id);
          if (updated) {
            setActiveConv(updated);
          }
        });
      } else {
        setConvertError("Conversion failed");
      }
    } catch (err: any) {
      setConvertError(err?.message || "Conversion failed");
    } finally {
      setConverting(false);
    }
  };

  // Poll session status
  const pollStatus = useCallback(async () => {
    const s = await getStatus();
    setSession(s);
  }, [getStatus]);

  useEffect(() => {
    pollStatus();
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [pollStatus]);

  // Tab data loaders
  const loadConversations = useCallback((forceSync: boolean = false) => {
    getConversations("whatsapp", forceSync).then(res => {
      setConversations(res);
      // Auto-assign random metadata to mock rooms if not present
      setLocalRoomsMeta(prev => {
        const next = { ...prev };
        res.forEach((c, index) => {
          if (!next[c.id]) {
            const mockAssignee = index % 3 === 0 ? "" : (index % 3 === 1 ? "Prasetia Sales" : "Sales Team B");
            next[c.id] = {
              assignee: mockAssignee,
              resolved: index % 6 === 0,
              notes: "",
              tags: index % 2 === 0 ? ["Hot Lead", "Q2 Outreach"] : ["Follow up"]
            };
          }
        });
        return next;
      });
    });
  }, [getConversations]);

  useEffect(() => {
    if (tab === "conversations" && session.status === "connected") {
      loadConversations();
    }
    if (tab === "broadcast") {
      getCampaigns().then(setCampaigns);
    }
    if (tab === "settings") {
      getSyncRules().then(setSyncRules);
    }
  }, [tab, session.status, loadConversations, getCampaigns, getSyncRules]);

  // Scroll messages to bottom on new messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  // Connection Handlers
  const handleConnect = async () => {
    await initSession();
    setTimeout(pollStatus, 1500);
  };

  const handleDisconnect = async () => {
    await disconnect();
    setSession({ status: "disconnected", number: null, qr_payload: null, connected_at: null });
  };

  const handleRefreshQr = async () => {
    await refreshQr();
    setTimeout(pollStatus, 2000);
  };

  // Chat message composer send handler
  const handleSendReply = async () => {
    if (!activeConv || !replyText.trim() || !activeConv.contact?.phone_number) return;
    setSendingReply(true);
    try {
      const result = await sendMessage(activeConv.contact.phone_number, replyText.trim());
      if (result) {
        const newMsg: WaMessage = {
          id: Date.now(),
          direction: "outbound",
          message_type: "text",
          body: replyText.trim(),
          sent_at: new Date().toISOString(),
          received_at: null,
        };
        setActiveMessages(prev => [...prev, newMsg]);
        setReplyText("");
        
        // Update last message in local list preview
        setConversations(prev => prev.map(c => {
          if (c.id === activeConv.id) {
            return {
              ...c,
              last_message_at: newMsg.sent_at
            };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleSendDm = async () => {
    if (!dmPhone || !dmText) return;
    const result = await sendMessage(dmPhone, dmText);
    if (result) {
      setDmSent(true);
      setDmText("");
      setTimeout(() => setDmSent(false), 3000);
    }
  };

  const handleCreateCampaign = async () => {
    if (!bcName || !bcMessage || !bcLeadIds) return;
    const ids = bcLeadIds.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    const result = await createCampaign(bcName, bcMessage, ids);
    if (result) {
      setBcName(""); setBcMessage(""); setBcLeadIds("");
      getCampaigns().then(setCampaigns);
    }
  };

  const handleExecuteCampaign = async (id: number) => {
    await executeCampaign(id);
    getCampaigns().then(setCampaigns);
  };

  const handleViewConv = async (conv: WaConversation) => {
    setActiveConv(conv);
    const msgs = await getMessages(conv.id);
    setActiveMessages(msgs);
  };

  const handleAnalyze = async (convId: number) => {
    await analyzeConversation(convId);
    setTimeout(() => {
      getConversations(platform).then(res => {
        setConversations(res);
        const updated = res.find(c => c.id === convId);
        if (updated) {
          setActiveConv(updated);
        }
      });
    }, 2000);
  };

  // Local metadata managers
  const handleSaveNotes = (convId: number, notesText: string) => {
    setLocalRoomsMeta(prev => ({
      ...prev,
      [convId]: { ...prev[convId], notes: notesText }
    }));
  };

  const handleSaveAssignee = (convId: number, assigneeName: string) => {
    setLocalRoomsMeta(prev => ({
      ...prev,
      [convId]: { ...prev[convId], assignee: assigneeName }
    }));
  };

  const handleToggleResolved = (convId: number) => {
    setLocalRoomsMeta(prev => ({
      ...prev,
      [convId]: { ...prev[convId], resolved: !prev[convId]?.resolved }
    }));
  };

  const handleAddTag = (convId: number) => {
    if (!newTagInput.trim()) return;
    setLocalRoomsMeta(prev => {
      const current = prev[convId]?.tags || [];
      if (current.includes(newTagInput.trim())) return prev;
      return {
        ...prev,
        [convId]: {
          ...prev[convId],
          tags: [...current, newTagInput.trim()]
        }
      };
    });
    setNewTagInput("");
  };

  const handleRemoveTag = (convId: number, tag: string) => {
    setLocalRoomsMeta(prev => {
      const current = prev[convId]?.tags || [];
      return {
        ...prev,
        [convId]: {
          ...prev[convId],
          tags: current.filter(t => t !== tag)
        }
      };
    });
  };

  const handleSaveRules = async () => {
    const ok = await updateSyncRules(syncRules);
    if (ok) { setRulesSaved(true); setTimeout(() => setRulesSaved(false), 3000); }
  };

  const addRule = () => {
    setSyncRules([...syncRules, { rule_type: "include_keyword", rule_key: "message", rule_value: "", enabled: true }]);
  };

  const removeRule = (i: number) => {
    setSyncRules(syncRules.filter((_, idx) => idx !== i));
  };

  // Folder filtering logic for chat list
  const filteredConversations = conversations.filter(c => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (c.contact?.name || "").toLowerCase().includes(query) ||
      (c.contact?.phone_number || "").includes(query) ||
      (c.external_chat_id || "").includes(query);

    if (!matchesSearch) return false;

    const meta = localRoomsMeta[c.id];
    const assignee = meta?.assignee || "";
    const resolved = meta?.resolved || false;

    switch (activeFolder) {
      case "my":
        return assignee === "Prasetia Sales" && !resolved;
      case "unassigned":
        return !assignee && !resolved;
      case "assigned":
        return !!assignee && !resolved;
      case "resolved":
        return resolved;
      case "all":
      default:
        return !resolved;
    }
  });

  const sidebarTabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "conversations", label: "Chats", icon: MessageSquare },
    { id: "session", label: "Connection Status", icon: QrCode },
    { id: "direct", label: "Direct Message", icon: Send },
    { id: "broadcast", label: "Broadcast", icon: Radio },
    { id: "settings", label: "Privacy Rules", icon: Shield },
  ];

  return (
    <div className="flex w-full h-[calc(100vh-56px)] overflow-hidden bg-background">
      {/* 1. Far-Left Vertical Icon Sidebar (WhatsApp Web Style Sidebar Navigation) */}
      <div className="w-[60px] h-full shrink-0 flex flex-col items-center justify-between py-4 border-r border-border bg-zinc-100 dark:bg-zinc-900/40">
        <div className="flex flex-col items-center gap-6 w-full">
          {/* User Profile Avatar */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--brand)] text-[11px] font-extrabold text-[color:var(--brand-foreground)]">
            WA
          </div>

          {/* Navigation Icon Tabs */}
          <div className="flex flex-col items-center gap-3 w-full">
            {sidebarTabs.map(t => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  title={t.label}
                  className={cn(
                    "relative flex h-11 w-11 items-center justify-center rounded-xl transition-all",
                    isActive 
                      ? "bg-[color:var(--brand)]/10 text-[color:var(--brand)] font-bold shadow-xs" 
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {isActive && (
                    <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-[color:var(--brand)] rounded-r-md" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Connection Status Indicator */}
        <div className="flex flex-col items-center gap-4">
          <div 
            title={session.status === "connected" ? `Connected: ${session.number}` : "Engine Disconnected"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 cursor-pointer"
            onClick={() => setTab("session")}
          >
            {session.status === "connected" ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--success)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[color:var(--success)]"></span>
              </span>
            ) : (
              <span className="relative flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[color:var(--danger)]"></span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Viewport Area */}
      <div className="flex-1 h-full flex overflow-hidden">
        {tab === "conversations" && (
          <>
            {/* Middle Column: Chat List */}
            <div className="w-[350px] shrink-0 border-r border-border flex flex-col bg-background h-full">
              {/* Header */}
              <div className="h-[56px] shrink-0 border-b border-border px-4 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10">
                <h2 className="text-base font-bold tracking-tight">Chats</h2>
                <div className="flex gap-1">
                  <button 
                    onClick={() => loadConversations(true)} 
                    title="Refresh List & Sync"
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setTab("session")}
                    title="Connection Settings" 
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Search Bar & Filter */}
              <div className="p-2 border-b border-border flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search phone or name..."
                    className="h-8 pl-8 text-xs bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-[color:var(--brand)] rounded-lg"
                  />
                </div>
                <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-lg">
                  <Filter className="h-4 w-4" />
                </button>
              </div>

              {/* Folders Navigation Row (WhatsApp Filters Style) */}
              <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-border scrollbar-none">
                {(["all", "my", "unassigned", "assigned", "resolved"] as FolderFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFolder(f)}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-semibold rounded-full shrink-0 transition-colors uppercase tracking-wider select-none",
                      activeFolder === f 
                        ? "bg-[color:var(--brand)]/10 text-[color:var(--brand)] font-extrabold"
                        : "bg-muted/50 text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                    )}
                  >
                    {f === "my" ? "My Chats" : f}
                  </button>
                ))}
              </div>

              {/* Chats List Area */}
              <div className="flex-1 overflow-y-auto divide-y divide-border/30">
                {session.status !== "connected" && (
                  <div className="p-6 text-center">
                    <WifiOff className="mx-auto mb-2 h-7 w-7 text-muted-foreground/45" />
                    <p className="text-xs text-muted-foreground mb-3">Baileys session disconnected.</p>
                    <Button size="xs" variant="outline" className="text-[10px] w-full" onClick={() => setTab("session")}>
                      Link Device
                    </Button>
                  </div>
                )}

                {session.status === "connected" && filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No active chats found.
                  </div>
                ) : (
                  session.status === "connected" && filteredConversations.map(conv => {
                    const isSelected = activeConv?.id === conv.id;
                    const meta = localRoomsMeta[conv.id];
                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleViewConv(conv)}
                        className={cn(
                          "w-full text-left p-3.5 flex gap-3 hover:bg-accent/30 dark:hover:bg-accent/10 transition-colors border-b border-border/20",
                          isSelected && "bg-accent/30 dark:bg-accent/15"
                        )}
                      >
                        {/* Avatar */}
                        <div className="h-10 w-10 shrink-0 rounded-full bg-stone-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-600 dark:text-neutral-300">
                          {conv.contact?.name?.slice(0, 2).toUpperCase() || "WA"}
                        </div>

                        {/* Middle metadata fields */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-foreground truncate max-w-[140px]">
                              {conv.contact?.name || conv.contact?.phone_number || conv.external_chat_id}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                            </span>
                          </div>

                          <div className="text-[11px] text-muted-foreground line-clamp-1 truncate pr-4 mb-2">
                            {conv.contact?.phone_number || "No phone registered"}
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cn(
                              "rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase",
                              conv.relevance_status === "high" ? "bg-[color:var(--success)]/10 text-[color:var(--success)]" :
                              conv.relevance_status === "medium" ? "bg-[color:var(--warning)]/10 text-[color:var(--warning)]" :
                              "bg-muted text-muted-foreground"
                            )}>
                              {conv.relevance_status}
                            </span>

                            {meta?.assignee && (
                              <span className="rounded-full px-1.5 py-0.5 text-[8px] font-semibold bg-blue-500/10 text-blue-500 max-w-[80px] truncate">
                                {meta.assignee}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Chat Feed Workspace */}
            <div className="flex-1 flex flex-col bg-stone-100/50 dark:bg-zinc-950/20 h-full relative">
              {activeConv ? (
                <>
                  {/* Chat Header */}
                  <div className="h-[56px] shrink-0 border-b border-border px-4 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/30">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-stone-300 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs">
                        {activeConv.contact?.name?.slice(0, 2).toUpperCase() || "WA"}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold">{activeConv.contact?.name || "Active Session Contact"}</h3>
                        <p className="text-[10px] text-muted-foreground font-mono">{activeConv.contact?.phone_number}</p>
                      </div>
                    </div>

                    {/* Chat Feed Header Actions */}
                    <div className="flex items-center gap-2">
                      {activeConv.contact && !activeConv.contact.linked_lead_id && (
                        <button
                          onClick={() => handleOpenConvertModal(activeConv)}
                          className="flex items-center gap-1.5 rounded-lg bg-[color:var(--success)]/10 px-2.5 py-1.5 text-[10px] font-bold text-[color:var(--success)] hover:bg-[color:var(--success)]/20"
                          id="convert-to-lead-btn"
                        >
                          <Plus className="h-3.5 w-3.5" /> Convert Lead
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleAnalyze(activeConv.id)}
                        title="AI Lead Evaluation"
                        className="flex items-center gap-1 rounded-lg bg-[color:var(--brand)]/10 px-2.5 py-1.5 text-[10px] font-bold text-[color:var(--brand)] hover:bg-[color:var(--brand)]/20"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Evaluate
                      </button>

                      <button 
                        onClick={() => setShowDetails(!showDetails)}
                        title="Contact Information Drawer"
                        className={cn(
                          "p-2 rounded-lg text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                          showDetails && "bg-accent/30 text-foreground"
                        )}
                      >
                        <Info className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>

                  {/* Messages Feed Viewport */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-200/40 dark:bg-zinc-950/50">
                    {activeMessages.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-8">No message logs logged yet.</p>
                    ) : (
                      activeMessages.map((msg, index) => {
                        const isOutbound = msg.direction === "outbound";
                        return (
                          <div 
                            key={msg.id || index} 
                            className={cn("flex w-full", isOutbound ? "justify-end" : "justify-start")}
                          >
                            <div className={cn(
                              "max-w-[70%] rounded-xl px-3 py-2 text-xs shadow-xs relative border border-border/10",
                              isOutbound 
                                ? "bg-emerald-100/95 dark:bg-emerald-950/40 text-neutral-800 dark:text-neutral-100 rounded-tr-none" 
                                : "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 rounded-tl-none"
                            )}>
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                              
                              <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-55 text-[9px] text-right font-mono">
                                <span>
                                  {msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                </span>
                                {isOutbound && (
                                  <CheckCheck className="h-3.5 w-3.5 text-sky-500 font-bold" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messageEndRef} />
                  </div>

                  {/* Message Composer Footer Panel */}
                  <div className="p-3 bg-zinc-50/90 dark:bg-zinc-900/50 border-t border-border flex flex-col gap-2 shrink-0">
                    {/* Quick Replies templates */}
                    <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none border-b border-border/10">
                      {[
                        "Halo! Kami melihat inquiry Anda. Ada yang bisa kami bantu?",
                        "Terima kasih atas ketertarikan Anda. Kami telah mendaftarkan detail Anda di CRM.",
                        "Bisa infokan nama perusahaan Anda beserta target budget scope nya?",
                        "Agent sales kami akan segera menghubungi Anda untuk menjadwalkan demo trial."
                      ].map((tpl, i) => (
                        <button
                          key={i}
                          onClick={() => setReplyText(tpl)}
                          className="px-2.5 py-1 bg-background border border-border rounded-lg text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/40 shrink-0 max-w-[200px] truncate"
                          title={tpl}
                        >
                          {tpl}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-lg shrink-0">
                        <Paperclip className="h-4.5 w-4.5" />
                      </button>
                      <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-lg shrink-0">
                        <Smile className="h-4.5 w-4.5" />
                      </button>
                      
                      <Input
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                        placeholder="Type a message (Press Enter to send)..."
                        className="flex-1 h-9 bg-background text-xs border-border"
                      />

                      <Button 
                        size="icon" 
                        variant="default"
                        className="h-9 w-9 shrink-0"
                        disabled={sendingReply || !replyText.trim()}
                        onClick={handleSendReply}
                      >
                        {sendingReply ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <SendHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                /* Empty Chat Stream Placeholder (WhatsApp Web Welcome Layout) */
                <div className="flex-1 flex flex-col items-center justify-center bg-stone-50/50 dark:bg-zinc-950/35 p-12 text-center h-full">
                  <div className="h-24 w-24 rounded-full bg-[color:var(--brand)]/10 flex items-center justify-center mb-6">
                    <MessageSquare className="h-12 w-12 text-[color:var(--brand)]" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight mb-2">Leadsy WhatsApp Web</h2>
                  <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
                    Send and receive messages directly integrated with local Baileys engine. All conversations are mapped with CRM lead records in real-time.
                  </p>
                  <div className="text-[10px] text-muted-foreground border-t border-border/30 pt-4 w-64 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--success)]" />
                    <span>Baileys local session: {session.status === "connected" ? "ACTIVE" : "INACTIVE"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Collapsible CRM detail drawer (Right Panel) */}
            {activeConv && showDetails && (
              <div className="w-[320px] shrink-0 border-l border-border bg-background h-full flex flex-col overflow-y-auto">
                <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-zinc-50/40 dark:bg-zinc-900/10">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact Info</h4>
                  <button onClick={() => setShowDetails(false)} className="text-muted-foreground hover:text-foreground">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4 space-y-6">
                  {/* Avatar Profile header */}
                  <div className="flex flex-col items-center text-center gap-3 pb-4 border-b border-border/40">
                    <div className="h-16 w-16 rounded-full bg-[color:var(--brand)]/10 text-xl font-bold text-[color:var(--brand)] flex items-center justify-center">
                      {activeConv.contact?.name?.slice(0, 2).toUpperCase() || "WA"}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{activeConv.contact?.name || "Active Session"}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{activeConv.contact?.phone_number}</p>
                    </div>
                  </div>

                  {/* CRM Linkage Card */}
                  <div className="rounded-xl border border-border p-4 bg-muted/10">
                    <h5 className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider mb-2">CRM Status</h5>
                    {activeConv.contact?.linked_lead_id ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs text-[color:var(--success)] font-bold">
                          <CheckCircle2 className="h-4 w-4" /> Synced with CRM Lead
                        </div>
                        <a 
                          href={`/leads/${activeConv.contact.linked_lead_id}`}
                          className="flex items-center gap-1 text-[11px] text-[color:var(--brand)] hover:underline"
                        >
                          View Lead Profile <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[11px] text-muted-foreground leading-normal">
                          This contact is not registered as a CRM lead yet. You can qualify them and convert them immediately.
                        </p>
                        <Button 
                          size="sm" 
                          variant="default"
                          className="w-full text-xs"
                          onClick={() => handleOpenConvertModal(activeConv)}
                        >
                          <Plus className="h-3.5 w-3.5" /> Convert to Lead
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* AI Qualification Panel */}
                  {activeConv.ai_analysis && (
                    <div className="rounded-xl border border-[color:var(--brand)]/20 bg-[color-mix(in_oklch,var(--brand)_4%,transparent)] p-4">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <Sparkles className="h-4 w-4 text-[color:var(--brand)] animate-pulse" />
                        <span className="text-[10px] font-extrabold uppercase text-[color:var(--brand)] tracking-wider">AI Lead Qualification</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">Match Score</span>
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                            activeConv.ai_analysis.analysis_result === "yes" ? "bg-[color:var(--success)]/10 text-[color:var(--success)]" :
                            activeConv.ai_analysis.analysis_result === "maybe" ? "bg-[color:var(--warning)]/10 text-[color:var(--warning)]" :
                            "bg-[color:var(--danger)]/10 text-[color:var(--danger)]"
                          )}>
                            {Math.round(activeConv.ai_analysis.confidence_score * 100)}%
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {activeConv.ai_analysis.reasoning_summary}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Assignee Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider select-none">Assign Agent</label>
                    <Select
                      value={localRoomsMeta[activeConv.id]?.assignee || ""}
                      onChange={e => handleSaveAssignee(activeConv.id, e.target.value)}
                      className="h-8.5 text-xs bg-background border-border"
                    >
                      <option value="">Unassigned</option>
                      <option value="Prasetia Sales">Prasetia Sales</option>
                      <option value="Sales Team B">Sales Team B</option>
                      <option value="Customer Care">Customer Care</option>
                    </Select>
                  </div>

                  {/* Resolve status toggle */}
                  <div className="flex items-center justify-between py-2 border-t border-b border-border/40 select-none">
                    <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Mark Resolved</span>
                    <button
                      onClick={() => handleToggleResolved(activeConv.id)}
                      className={cn(
                        "relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        localRoomsMeta[activeConv.id]?.resolved ? "bg-[color:var(--success)]" : "bg-muted"
                      )}
                    >
                      <span className={cn(
                        "pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
                        localRoomsMeta[activeConv.id]?.resolved ? "translate-x-4.5" : "translate-x-0"
                      )} />
                    </button>
                  </div>

                  {/* Notes Panel */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider select-none">Quick Notes</label>
                    <Textarea
                      defaultValue={localRoomsMeta[activeConv.id]?.notes || ""}
                      onBlur={e => handleSaveNotes(activeConv.id, e.target.value)}
                      placeholder="Write notes here (saved on blur)..."
                      rows={3}
                      className="text-xs bg-background border-border"
                    />
                  </div>

                  {/* Tag Manager */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider select-none">Tags</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {(localRoomsMeta[activeConv.id]?.tags || []).map(t => (
                        <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent text-[10px] font-medium text-foreground">
                          {t}
                          <button onClick={() => handleRemoveTag(activeConv.id, t)} className="text-[10px] hover:text-[color:var(--danger)]">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newTagInput}
                        onChange={e => setNewTagInput(e.target.value)}
                        placeholder="Add tag..."
                        className="h-8 text-xs flex-1 bg-background"
                      />
                      <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => handleAddTag(activeConv.id)}>
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tab 2: Connection Status (Device Linking Portal) */}
        {tab === "session" && (
          <div className="flex-1 overflow-y-auto p-8 bg-zinc-50 dark:bg-zinc-950/20">
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">WhatsApp Web Device Link</h1>
                <p className="text-xs text-muted-foreground">Authenticate your local session engine using the standard scan process.</p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-[var(--status-danger)]/20 bg-[color-mix(in_oklch,var(--status-danger)_5%,transparent)] px-4 py-2 text-sm text-[var(--status-danger)]">
                  <AlertCircle className="h-4 w-4" /> {error}
                  <button onClick={clearError} className="ml-auto text-xs underline">Dismiss</button>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                {/* QR Section */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col items-center">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Device Portal</h2>
                  
                  {session.status === "disconnected" && (
                    <div className="flex flex-col items-center gap-4 py-6">
                      <div className="flex h-44 w-44 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30">
                        <QrCode className="h-14 w-14 text-muted-foreground/30" />
                      </div>
                      <p className="text-xs text-muted-foreground text-center max-w-xs leading-normal">
                        Baileys engine is inactive. Click connect to bootstrap session and yield QR.
                      </p>
                      <Button variant="default" className="w-full" disabled={loading} onClick={handleConnect}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />} Initialize Connection
                      </Button>
                    </div>
                  )}

                  {session.status === "qr_ready" && session.qr_payload && (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-48 w-48 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background p-2">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(session.qr_payload)}`}
                          alt="WhatsApp QR Code"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-[color:var(--brand)]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <p className="text-xs font-semibold">Device listening... Scan QR code</p>
                      </div>
                      <button onClick={handleRefreshQr} disabled={loading}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                        <RefreshCw className="h-3 w-3" /> Refresh QR Code
                      </button>
                    </div>
                  )}

                  {session.status === "connected" && (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--success)]/10">
                        <Wifi className="h-8 w-8 text-[color:var(--success)]" />
                      </div>
                      <p className="text-sm font-bold text-[color:var(--success)]">Device Linked Successfully</p>
                      <p className="text-xs text-muted-foreground text-center leading-normal">
                        {session.number && <>Active Number: {session.number}<br /></>}
                        {session.connected_at ? `Connected on: ${new Date(session.connected_at).toLocaleString()}` : "Active sync pipeline."}
                      </p>
                      <Button variant="outline" className="w-full text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10" disabled={loading} onClick={handleDisconnect}>
                        Disconnect Session
                      </Button>
                    </div>
                  )}
                </div>

                {/* Info Instructions Section */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Instructions</h2>
                    <ol className="space-y-4 text-xs text-muted-foreground leading-normal">
                      <li className="flex gap-3"><span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand)]/10 text-xs font-bold text-[color:var(--brand)]">1</span> Boot the Baileys server engine using connect.</li>
                      <li className="flex gap-3"><span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand)]/10 text-xs font-bold text-[color:var(--brand)]">2</span> Open WhatsApp application on your primary device.</li>
                      <li className="flex gap-3"><span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand)]/10 text-xs font-bold text-[color:var(--brand)]">3</span> Go to Linked Devices &rarr; Link a Device.</li>
                      <li className="flex gap-3"><span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand)]/10 text-xs font-bold text-[color:var(--brand)]">4</span> Focus mobile camera on the generated QR Code.</li>
                    </ol>
                  </div>

                  <div className="mt-6 rounded-xl border border-[color:var(--warning)]/20 bg-[color-mix(in_oklch,var(--warning)_4%,transparent)] p-4">
                    <p className="text-[11px] text-[color:var(--warning)] leading-relaxed">
                      <strong>Privacy Enforcement Notice:</strong> Only conversations matching sync keywords or current leads will trigger database sync. Personal dialogs are ignored.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Direct Message Form */}
        {tab === "direct" && (
          <div className="flex-1 overflow-y-auto p-8 bg-zinc-50 dark:bg-zinc-950/20">
            <div className="max-w-lg mx-auto">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                  <Send className="h-4 w-4 text-[color:var(--success)]" /> Send Direct Message
                </h2>
                
                {session.status !== "connected" ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    <WifiOff className="mx-auto mb-2 h-7 w-7 opacity-35" />
                    Authentication required. Scan QR first.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Recipient Phone Number</label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input value={dmPhone} onChange={e => setDmPhone(e.target.value)} placeholder="e.g. 6281234567890" className="pl-9 font-mono text-xs" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Message Body</label>
                      <Textarea value={dmText} onChange={e => setDmText(e.target.value)} placeholder="Type message body here..." rows={4} className="mt-1 text-xs" />
                    </div>
                    <Button variant="default" className="w-full text-xs h-9" disabled={loading || !dmPhone || !dmText} onClick={handleSendDm}>
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Dispatch Message
                    </Button>
                    {dmSent && (
                      <p className="flex items-center gap-1.5 text-xs text-[color:var(--success)] font-bold"><CheckCircle2 className="h-4 w-4" /> Message sent successfully!</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Broadcast Campaigns */}
        {tab === "broadcast" && (
          <div className="flex-1 overflow-y-auto p-8 bg-zinc-50 dark:bg-zinc-950/20">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                  <Radio className="h-4 w-4 text-[color:var(--brand)]" /> Dispatch Broadcast Campaign
                </h2>
                
                {session.status !== "connected" ? (
                  <p className="text-xs text-muted-foreground py-4">Linked session device is required to dispatch broadcasts.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Campaign Tag</label>
                        <Input value={bcName} onChange={e => setBcName(e.target.value)} placeholder="Q2 Outreach" className="mt-1 text-xs" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Lead IDs (comma-separated)</label>
                        <Input value={bcLeadIds} onChange={e => setBcLeadIds(e.target.value)} placeholder="1, 2, 3" className="mt-1 font-mono text-xs" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Broadcast Message Template</label>
                      <Textarea value={bcMessage} onChange={e => setBcMessage(e.target.value)} placeholder="Hello! We'd like to introduce..." rows={3} className="mt-1 text-xs" />
                    </div>
                    <Button variant="default" size="sm" disabled={loading || !bcName || !bcMessage || !bcLeadIds} onClick={handleCreateCampaign}>
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Save Campaign Draft
                    </Button>
                  </div>
                )}
              </div>

              {campaigns.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Broadcast History</h3>
                  <div className="space-y-3">
                    {campaigns.map(c => (
                      <div key={c.id} className="rounded-xl border border-border/60 p-4 bg-muted/5">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-xs">{c.campaign_name}</h4>
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                            c.status === "sent" ? "bg-[color:var(--success)]/10 text-[color:var(--success)]" :
                            c.status === "sending" ? "bg-[color:var(--warning)]/10 text-[color:var(--warning)]" :
                            "bg-muted text-muted-foreground"
                          )}>{c.status}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{c.message_template}</p>
                        <div className="flex items-center justify-between pt-1 border-t border-border/20">
                          <span className="text-[11px] text-muted-foreground font-semibold">{c.total_targets} Recipients</span>
                          {c.status === "draft" && (
                            <button 
                              onClick={() => handleExecuteCampaign(c.id)} 
                              disabled={loading || session.status !== "connected"}
                              className="flex items-center gap-1.5 rounded-lg bg-[color:var(--success)] px-3 py-1.5 text-[10px] font-bold text-white hover:opacity-90 disabled:opacity-50"
                            >
                              <Send className="h-3 w-3" /> Execute Send
                            </button>
                          )}
                          {c.status === "sent" && c.recipients && (
                            <div className="flex gap-3 text-[10px] font-semibold">
                              <span className="text-[color:var(--success)]">{c.recipients.filter(r => r.send_status === "sent").length} Sent</span>
                              <span className="text-[color:var(--danger)]">{c.recipients.filter(r => r.send_status === "failed").length} Failed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Settings / Privacy Rules */}
        {tab === "settings" && (
          <div className="flex-1 overflow-y-auto p-8 bg-zinc-50 dark:bg-zinc-950/20">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[color:var(--brand)]" /> Privacy & Sync Rules
                </h2>
                <p className="text-xs text-muted-foreground mb-6">
                  Configure filtering patterns to manage sync restrictions. Personal contacts will be hidden.
                </p>

                <div className="space-y-3">
                  {syncRules.map((rule, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-xl border border-border/60 p-3 bg-muted/10">
                      <Select 
                        value={rule.rule_type}
                        onChange={(e) => { 
                          const n = [...syncRules]; 
                          n[i] = {...n[i], rule_type: e.target.value}; 
                          setSyncRules(n); 
                        }}
                        className="w-auto h-8 text-xs bg-background"
                      >
                        <option value="include_keyword">Include Keyword</option>
                        <option value="exclude_keyword">Exclude Keyword</option>
                        <option value="strict_allowlist">Strict Allowlist</option>
                      </Select>
                      
                      <Input 
                        value={rule.rule_value || ""}
                        onChange={e => { 
                          const n = [...syncRules]; 
                          n[i] = {...n[i], rule_value: e.target.value}; 
                          setSyncRules(n); 
                        }}
                        placeholder="Keyword pattern..."
                        className="flex-1 h-8 text-xs bg-background" 
                      />
                      
                      <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={rule.enabled}
                          onChange={e => { 
                            const n = [...syncRules]; 
                            n[i] = {...n[i], enabled: e.target.checked}; 
                            setSyncRules(n); 
                          }}
                          className="h-3.5 w-3.5 accent-[color:var(--brand)]" 
                        />
                        ON
                      </label>
                      
                      <button 
                        onClick={() => removeRule(i)} 
                        className="text-[color:var(--danger)]/60 hover:text-[color:var(--danger)] p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {syncRules.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border py-8 text-center bg-muted/5">
                      <p className="text-xs text-muted-foreground mb-1 leading-normal">No custom sync rules active.</p>
                      <p className="text-[10px] text-muted-foreground/70">Matching numbers from CRM leads will sync automatically.</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-3">
                    <Button variant="outline" size="sm" className="text-xs" onClick={addRule}>
                      <Plus className="h-3.5 w-3.5" /> Add New Filter Rule
                    </Button>
                    <Button variant="default" size="sm" className="text-xs" disabled={loading} onClick={handleSaveRules}>
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Save Synced Config
                    </Button>
                    {rulesSaved && <span className="text-xs text-[color:var(--success)] font-bold">Rules Updated!</span>}
                  </div>
                </div>
              </div>

              {/* Description Card */}
              <div className="rounded-xl border border-[color:var(--warning)]/20 bg-[color-mix(in_oklch,var(--warning)_4%,transparent)] p-4">
                <h3 className="text-xs font-bold text-[color:var(--warning)] uppercase tracking-wider mb-2">Privacy Filtering Blueprint</h3>
                <ul className="space-y-2 text-xs text-muted-foreground/90 leading-normal">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[color:var(--success)]" /> 
                    <span>Contacts mapped as existing CRM leads are <strong>permanently allowlisted</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[color:var(--success)]" /> 
                    <span><strong>Include Filters</strong> match message content to sync novel leads automatically.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[color:var(--danger)]" /> 
                    <span><strong>Exclude Filters</strong> block synchronization (veto priority override).</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Convert to Lead Modal */}
      <Modal
        open={convertModalOpen}
        onOpenChange={setConvertModalOpen}
        title="Convert WhatsApp Contact to Lead"
        description="Create a new CRM Lead record linked to this WhatsApp room."
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setConvertModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConvertSubmit} disabled={converting}>
              {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm Conversion
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 py-2">
          {convertError ? <Badge variant="danger">{convertError}</Badge> : null}
          <div className="grid gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Company Name</label>
            <Input
              value={convertCompanyName}
              onChange={(e) => setConvertCompanyName(e.target.value)}
              placeholder="e.g. PT Acme Indonesia"
              id="convert-company-name-input"
              className="text-xs"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Funnel Stage</label>
            <Select
              value={convertStageId}
              onChange={(e) => setConvertStageId(e.target.value)}
              id="convert-funnel-stage-select"
              className="text-xs bg-background"
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
