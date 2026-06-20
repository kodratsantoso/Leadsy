"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  MessageSquare, Loader2, RefreshCw, ChevronRight, Sparkles, AlertCircle, Plus,
  Search, User, Check, CheckCheck, Send, Paperclip, Smile,
  Server, Hash, CheckCircle2, X, MoreVertical,
  Calendar, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { apiFetch } from "@/lib/apiFetch";
import {
  useWhatsApp,
  type WaConversation, type WaMessage
} from "@/lib/hooks/use-whatsapp";
import { ProgressiveFluxLoader } from "@/components/ui/progressive-flux-loader";

type Folder = "all" | "my" | "unassigned" | "assigned" | "resolved";
type SortOption = "newest" | "oldest" | "relevance";

export default function MekariQontakPage() {
  const {
    getConversations,
    getMessages,
    analyzeConversation,
    convertToLead,
    sendMessage,
    error,
    clearError,
    loading
  } = useWhatsApp();
  const platform = "mekari_qontak";

  // ── States ──
  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [activeConv, setActiveConv] = useState<WaConversation | null>(null);
  const [activeMessages, setActiveMessages] = useState<WaMessage[]>([]);
  const [stages, setStages] = useState<{ id: number; name: string }[]>([]);

  // ── Search & Filter State ──
  const [activeFolder, setActiveFolder] = useState<Folder>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // ── Composer & Conversation Interactive State ──
  const [replyText, setReplyText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [isSendingLocal, setIsSendingLocal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // ── Mock states for conversation assignment & resolution ──
  const [localRoomsMeta, setLocalRoomsMeta] = useState<Record<string, { assignee: string; resolved: boolean; notes: string; tags: string[] }>>({});

  // ── Tag Input State ──
  const [newTagText, setNewTagText] = useState("");



  // ── Convert Modal State ──
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertCompanyName, setConvertCompanyName] = useState("");
  const [convertStageId, setConvertStageId] = useState("");
  const [convertError, setConvertError] = useState("");
  const [converting, setConverting] = useState(false);

  // Ref for messages auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch funnel stages
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



  // ── Load rooms ──
  const loadConversations = async (forceSync: boolean = false) => {
    try {
      const res = await getConversations("mekari_qontak", forceSync);
      setConversations(res);
      // Auto-assign random metadata to mock rooms if not present
      setLocalRoomsMeta(prev => {
        const next = { ...prev };
        res.forEach((c, index) => {
          if (!next[c.id]) {
            // Mock assignment logic: some are unassigned, some assigned to sales agent
            const mockAssignee = index % 3 === 0 ? "" : (index % 3 === 1 ? "Prasetia Sales" : "Sales Team B");
            next[c.id] = {
              assignee: mockAssignee,
              resolved: index % 5 === 0, // Mock resolve status
              notes: "",
              tags: index % 2 === 0 ? ["Hot Lead", "Q2 Outreach"] : ["Follow up"]
            };
          }
        });
        return next;
      });
    } catch (err) {
      console.warn("Failed to load conversations:", err);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await loadConversations(true);
    setIsSyncing(false);
  };

  useEffect(() => {
    loadConversations();
  }, [getConversations]);

  // ── Auto Refresh every 30 seconds ──
  useEffect(() => {
    const interval = setInterval(() => {
      getConversations("mekari_qontak").then(setConversations);
    }, 30000);

    return () => clearInterval(interval);
  }, [getConversations]);

  // Scroll to bottom of chat history when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

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
        getConversations("mekari_qontak").then(res => {
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



  // Send message locally and optionally via API
  const handleSendMessage = async () => {
    if (!activeConv || !replyText.trim()) return;
    const phone = activeConv.contact?.phone_number || activeConv.external_chat_id;
    const body = replyText;
    setReplyText("");
    setIsSendingLocal(true);

    // Dynamic local append for instant reactivity
    const tempId = Date.now();
    const tempMsg: WaMessage = {
      id: tempId,
      direction: "outbound",
      body: body,
      message_type: "text",
      sent_at: new Date().toISOString(),
      received_at: null
    };

    setActiveMessages(prev => [...prev, tempMsg]);

    try {
      const res = await sendMessage(phone, body, "mekari_qontak");
      if (!res || !res.success) {
        console.warn("Message sent locally; direct delivery skipped or failed.");
      }
    } catch (err) {
      console.warn("API messaging error:", err);
    } finally {
      setIsSendingLocal(false);
    }
  };

  // Assign chat room to active user
  const handleAssignToMe = () => {
    if (!activeConv) return;
    setLocalRoomsMeta(prev => ({
      ...prev,
      [activeConv.id]: {
        ...prev[activeConv.id],
        assignee: "Prasetia Sales"
      }
    }));
  };

  // Toggle Resolution of room
  const handleToggleResolve = () => {
    if (!activeConv) return;
    setLocalRoomsMeta(prev => ({
      ...prev,
      [activeConv.id]: {
        ...prev[activeConv.id],
        resolved: !prev[activeConv.id]?.resolved
      }
    }));
  };

  // Add notes locally
  const handleSaveNotes = (notesText: string) => {
    if (!activeConv) return;
    setLocalRoomsMeta(prev => ({
      ...prev,
      [activeConv.id]: {
        ...prev[activeConv.id],
        notes: notesText
      }
    }));
  };

  // Add a custom tag
  const handleAddTag = () => {
    if (!activeConv || !newTagText.trim()) return;
    const currentTags = localRoomsMeta[activeConv.id]?.tags || [];
    if (!currentTags.includes(newTagText.trim())) {
      setLocalRoomsMeta(prev => ({
        ...prev,
        [activeConv.id]: {
          ...prev[activeConv.id],
          tags: [...currentTags, newTagText.trim()]
        }
      }));
    }
    setNewTagText("");
  };

  // Remove a custom tag
  const handleRemoveTag = (tagToRemove: string) => {
    if (!activeConv) return;
    const currentTags = localRoomsMeta[activeConv.id]?.tags || [];
    setLocalRoomsMeta(prev => ({
      ...prev,
      [activeConv.id]: {
        ...prev[activeConv.id],
        tags: currentTags.filter(t => t !== tagToRemove)
      }
    }));
  };

  // Select Quickreply template
  const handleUseTemplate = (templateBody: string) => {
    setReplyText(templateBody);
  };

  // Derived filtered conversations list
  const filteredConversations = useMemo(() => {
    return conversations
      .filter(c => {
        // Folder selection
        const meta = localRoomsMeta[c.id];
        if (activeFolder === "my") return meta?.assignee === "Prasetia Sales";
        if (activeFolder === "unassigned") return !meta?.assignee;
        if (activeFolder === "assigned") return !!meta?.assignee;
        if (activeFolder === "resolved") return meta?.resolved;
        return true;
      })
      .filter(c => {
        // Search query
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const contactName = c.contact?.name?.toLowerCase() || "";
        const phone = c.contact?.phone_number || "";
        const externalId = c.external_chat_id || "";
        return contactName.includes(query) || phone.includes(query) || externalId.includes(query);
      })
      .sort((a, b) => {
        // Sorting criteria
        if (sortBy === "oldest") {
          const tA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const tB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return tA - tB;
        }
        if (sortBy === "relevance") {
          const relScore = (rel: string) => (rel === "high" ? 3 : (rel === "medium" ? 2 : 1));
          return relScore(b.relevance_status) - relScore(a.relevance_status);
        }
        // default "newest"
        const tA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const tB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return tB - tA;
      });
  }, [conversations, activeFolder, searchQuery, sortBy, localRoomsMeta]);

  // Dynamic calculations for Inbox Navigation Sidebar folder badges
  const folderCounts = useMemo(() => {
    const counts = { all: 0, my: 0, unassigned: 0, assigned: 0, resolved: 0 };
    conversations.forEach(c => {
      counts.all++;
      const meta = localRoomsMeta[c.id];
      if (meta?.assignee === "Prasetia Sales") counts.my++;
      if (!meta?.assignee) counts.unassigned++;
      if (meta?.assignee) counts.assigned++;
      if (meta?.resolved) counts.resolved++;
    });
    return counts;
  }, [conversations, localRoomsMeta]);



  const activeMeta = activeConv ? localRoomsMeta[activeConv.id] : null;

  return (
    <div className="flex h-[calc(100vh-56px)] w-full overflow-hidden bg-background text-foreground">
      {/* ── COLUMN 1: LEFT FOLDERS MENU (200px) ── */}
      <aside className="w-52 shrink-0 border-r border-border bg-muted/15 flex flex-col justify-between py-4 select-none">
        <div className="space-y-4">
          <div className="px-4">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inbox Folders</h2>
          </div>
          <nav className="space-y-0.5 px-2">
            {[
              { id: "all", label: "All chats", count: folderCounts.all, icon: MessageSquare },
              { id: "my", label: "My chats", count: folderCounts.my, icon: User },
              { id: "unassigned", label: "Unassigned", count: folderCounts.unassigned, icon: AlertCircle },
              { id: "assigned", label: "Assigned", count: folderCounts.assigned, icon: CheckCircle2 },
              { id: "resolved", label: "Resolved", count: folderCounts.resolved, icon: Check },
            ].map(folder => {
              const Icon = folder.icon;
              return (
                <button
                  key={folder.id}
                  onClick={() => { setActiveFolder(folder.id as Folder); }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-accent/40",
                    activeFolder === folder.id
                      ? "bg-accent/75 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{folder.label}</span>
                  </div>
                  {folder.count > 0 && (
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.2 rounded-full",
                      folder.id === "unassigned" ? "bg-[var(--status-danger)]/15 text-[var(--status-danger)]" : "bg-muted text-muted-foreground"
                    )}>
                      {folder.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 px-2">


          <div className="rounded-lg border border-border bg-card/60 p-3 shadow-xs">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>Mekari Qontak Hub</strong> integrates messaging threads with Leadsy scoring models.
            </p>
          </div>
        </div>
      </aside>

      {/* ── COLUMN 2: CONVERSATIONS LIST (340px) ── */}
      <section className="w-80 shrink-0 border-r border-border bg-card/30 flex flex-col overflow-hidden">
        {/* Search & Sorting headers */}
        <div className="p-3 border-b border-border/60 bg-muted/10 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="pl-8 text-xs h-8 bg-background"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground">
              {filteredConversations.length} {filteredConversations.length === 1 ? "chat" : "chats"} found
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                title="Sync conversations"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
              </button>
              <div className="h-3 w-[1px] bg-border/60" />
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-muted-foreground">Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                  className="text-[10px] font-bold bg-transparent border-none outline-hidden cursor-pointer text-foreground focus:ring-0 p-0"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="relevance">Relevance score</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Chats list view */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/30">
          {filteredConversations.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/30" />
              <p className="text-xs font-semibold text-muted-foreground">No conversations found</p>
              <p className="text-[10px] text-muted-foreground/80 leading-normal">
                No active Qontak rooms match this folder or search criteria.
              </p>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const meta = localRoomsMeta[conv.id];
              const isSelected = activeConv?.id === conv.id;
              const hasLinkedLead = !!conv.contact?.linked_lead_id;

              // Extract initials for avatar
              const name = conv.contact?.name || conv.external_chat_id || "Customer";
              const initials = name.slice(0, 2).toUpperCase();

              // Setup background classes for initials avatar
              const avatarBgClass = conv.relevance_status === "high"
                ? "bg-[var(--status-success)]/10 text-[var(--status-success)]"
                : conv.relevance_status === "medium"
                  ? "bg-[var(--status-warning)]/10 text-[var(--status-warning)]"
                  : "bg-muted text-muted-foreground";

              return (
                <button
                  key={conv.id}
                  onClick={() => handleViewConv(conv)}
                  className={cn(
                    "w-full text-left p-3.5 transition-all flex flex-col gap-2 relative border-l-2 border-transparent",
                    isSelected
                      ? "bg-accent/30 border-l-[var(--brand)] shadow-xs"
                      : "hover:bg-accent/15"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar with dynamic lead relevance */}
                      <div className={cn("h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-extrabold shadow-2xs border border-border/20", avatarBgClass)}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                            {name}
                          </span>
                          {hasLinkedLead && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" title="Linked to CRM Lead" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate font-mono">
                          {conv.contact?.phone_number || "No Phone"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span className="text-[9px] text-muted-foreground font-semibold">
                        {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                      </span>
                      {/* Relevance Badge */}
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide",
                        conv.relevance_status === "high" ? "bg-[var(--status-success)]/10 text-[var(--status-success)]" :
                        conv.relevance_status === "medium" ? "bg-[var(--status-warning)]/10 text-[var(--status-warning)]" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {conv.relevance_status}
                      </span>
                    </div>
                  </div>

                  {/* Room status and assignee indicators */}
                  <div className="flex items-center justify-between text-[10px] border-t border-border/15 pt-2 mt-1">
                    <div className="flex items-center gap-1">
                      {meta?.assignee ? (
                        <div className="flex items-center gap-1 text-[var(--brand)] font-bold">
                          <User className="h-2.5 w-2.5" />
                          <span>{meta.assignee === "Prasetia Sales" ? "Me" : meta.assignee}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 italic font-semibold">Unassigned</span>
                      )}
                    </div>

                    {meta?.resolved ? (
                      <span className="text-[var(--status-success)] font-extrabold flex items-center gap-0.5 uppercase text-[8px]">
                        <Check className="h-2.5 w-2.5" /> Resolved
                      </span>
                    ) : (
                      <span className="text-[var(--status-warning)] font-extrabold uppercase text-[8px]">
                        Open
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* ── COLUMN 3: MAIN ACTIVE CONVERSATION/CHECKLIST AREA ── */}
      <main className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {activeConv ? (
          /* active chat workspace */
          <div className="flex-1 flex flex-col overflow-hidden h-full">
            {/* Header info */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-border/80 bg-muted/10 select-none">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--status-success)] shrink-0 animate-pulse" />
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-foreground truncate">
                    {activeConv.contact?.name || activeConv.external_chat_id || "Customer"}
                  </h3>
                  <p className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1 font-mono truncate">
                    <span>external_id:</span>
                    <span className="font-bold text-foreground/80">{activeConv.external_chat_id}</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {activeConv.contact && !activeConv.contact.linked_lead_id && (
                  <Button
                    onClick={() => handleOpenConvertModal(activeConv)}
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-bold text-[var(--status-success)] border-[var(--status-success)]/30 hover:bg-[var(--status-success)]/10"
                    id="qontak-convert-to-lead-btn"
                  >
                    <Plus className="h-3 w-3" /> Convert Lead
                  </Button>
                )}

                {activeMeta?.assignee !== "Prasetia Sales" && (
                  <Button
                    onClick={handleAssignToMe}
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-bold"
                  >
                    <User className="h-3 w-3" /> Assign to Me
                  </Button>
                )}

                <Button
                  onClick={handleToggleResolve}
                  variant={activeMeta?.resolved ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 text-[10px] font-bold",
                    activeMeta?.resolved ? "bg-[var(--status-success)] hover:bg-[var(--status-success)]/90 text-white" : ""
                  )}
                >
                  <Check className="h-3 w-3" /> {activeMeta?.resolved ? "Resolved" : "Resolve Chat"}
                </Button>
              </div>
            </div>

            {/* Error banner inside active screen */}
            {error && (
              <div className="flex items-center gap-2 border-b border-[var(--status-danger)]/20 bg-[var(--status-danger)]/5 px-4 py-2 text-xs text-[var(--status-danger)] select-none">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="font-semibold">{error}</span>
                <button onClick={clearError} className="ml-auto underline font-bold text-[10px]">Dismiss</button>
              </div>
            )}

            {/* Message feed stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
              {activeMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground select-none">
                  <Loader2 className="h-8 w-8 animate-spin mb-3 opacity-30 text-[var(--brand)]" />
                  <p className="text-xs font-semibold">Loading chat records...</p>
                  <p className="text-[10px] text-muted-foreground/80 mt-1">Retrieving omnichannel logs from Qontak server.</p>
                </div>
              ) : (
                (() => {
                  let lastDateHeader = "";
                  return activeMessages.map((msg, index) => {
                    const msgDate = new Date(msg.sent_at).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    const showDateHeader = msgDate !== lastDateHeader;
                    if (showDateHeader) lastDateHeader = msgDate;

                    const isOutbound = msg.direction === "outbound";

                    return (
                      <div key={msg.id} className="space-y-3">
                        {showDateHeader && (
                          <div className="flex items-center justify-center my-4 select-none">
                            <span className="rounded-full bg-muted/60 border border-border px-3 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground shadow-2xs">
                              {msgDate}
                            </span>
                          </div>
                        )}

                        {index === activeMessages.length - 1 && index > 1 && !isOutbound && (
                          /* Unread indicator mockup */
                          <div className="flex items-center justify-center my-2 select-none w-full">
                            <div className="h-px bg-[var(--brand)]/20 flex-1" />
                            <span className="text-[9px] font-bold text-[var(--brand)] bg-[var(--brand)]/15 px-2 py-0.2 rounded-full mx-2">
                              New messages
                            </span>
                            <div className="h-px bg-[var(--brand)]/20 flex-1" />
                          </div>
                        )}

                        <div className={cn("flex flex-col", isOutbound ? "items-end" : "items-start")}>
                          <div className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2.5 text-xs shadow-xs transition-all relative border border-border/10",
                            isOutbound
                              ? "bg-[color-mix(in_oklch,var(--brand)_90%,white)] text-white rounded-tr-none"
                              : "bg-card text-foreground rounded-tl-none border-border/30"
                          )}>
                            {/* Inbound sender header */}
                            {!isOutbound && (
                              <p className="text-[9px] font-bold text-[var(--brand)] mb-1 uppercase tracking-wide select-none">
                                {activeConv.contact?.name || "Customer"}
                              </p>
                            )}

                            <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>

                            <div className="flex items-center justify-end gap-1 mt-1.5 opacity-70 select-none">
                              <span className="text-[8px] font-bold block text-right font-mono">
                                {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isOutbound && (
                                <CheckCheck className="h-3 w-3 text-white" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies & quick reply templates panel */}
            <div className="px-4 py-2 border-t border-border/60 bg-muted/10 select-none flex items-center gap-2 overflow-x-auto">
              <span className="text-[9px] font-bold text-muted-foreground shrink-0 uppercase tracking-wide">Templates:</span>
              {[
                { label: "Greeting", text: "Selamat pagi! Terima kasih telah menghubungi kami. Mohon maaf atas keterlambatan respon kami. Ada yang bisa kami bantu?" },
                { label: "Product Info", text: "Tentu! Kami menawarkan platform integrasi otomasi sales Leadsy. Anda dapat mendaftar uji coba gratis di website kami." },
                { label: "Follow Up", text: "Halo, kami ingin menindaklanjuti percakapan kemarin mengenai integrasi CRM Anda. Apakah ada waktu luang hari ini?" },
              ].map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => handleUseTemplate(tmpl.text)}
                  className="rounded-full bg-card hover:bg-accent/40 border border-border/60 text-[9px] font-bold text-muted-foreground hover:text-foreground px-2.5 py-0.5 transition-colors shrink-0"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>

            {/* Message composer input bar */}
            <div className="p-3 border-t border-border bg-card flex items-end gap-2.5">
              <div className="flex items-center gap-1.5 pb-1">
                <button className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors" title="Attach media">
                  <Paperclip className="h-4 w-4" />
                </button>
                <button className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors" title="Emojis">
                  <Smile className="h-4 w-4" />
                </button>
              </div>

              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your response or select a template..."
                rows={1}
                className="flex-1 rounded-lg border border-input bg-background/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring resize-none max-h-24 h-9 overflow-y-auto leading-normal"
              />

              <button
                onClick={handleSendMessage}
                disabled={!replyText.trim() || isSendingLocal}
                className="rounded-lg bg-[var(--brand)] text-white hover:opacity-90 p-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-xs"
              >
                {isSendingLocal ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        ) : (
          /* select chat initial state */
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground select-none space-y-4">
            <div className="h-16 w-16 rounded-full bg-muted/40 border border-border/50 flex items-center justify-center shadow-inner">
              <MessageSquare className="h-7 w-7 text-muted-foreground/45" />
            </div>
            <div className="text-center max-w-sm space-y-1">
              <p className="text-sm font-bold text-foreground">No Chat Selected</p>
              <p className="text-xs text-muted-foreground/80 leading-normal">
                Choose a customer room from the left room list view.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ── COLUMN 4: RIGHT DETAIL SIDEBAR (300px) ── */}
      {activeConv && (
        <aside className="w-72 shrink-0 border-l border-border bg-muted/5 flex flex-col overflow-y-auto divide-y divide-border/60">
          {/* Main User badge info */}
          <div className="p-4 text-center space-y-2.5 select-none bg-card/10">
            <div className="h-14 w-14 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] font-extrabold mx-auto flex items-center justify-center text-lg border border-[var(--brand)]/20 shadow-xs">
              {(activeConv.contact?.name || "Customer").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">
                {activeConv.contact?.name || "Customer Room"}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                {activeConv.contact?.phone_number || "No phone number available"}
              </p>
            </div>
          </div>

          {/* AI Eligibility Advisory Section */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-1.5 select-none text-[var(--brand)] font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider">AI Lead Qualification</span>
            </div>

            <div className="rounded-xl border border-[var(--brand)]/20 bg-card/80 p-3.5 shadow-2xs space-y-3 leading-relaxed">
              <div className="flex items-center justify-between select-none">
                <span className="text-[9px] font-extrabold text-muted-foreground uppercase">Status:</span>
                {activeConv.ai_analysis ? (
                  <span className={cn(
                    "rounded-full px-2 py-0.2 text-[8px] font-extrabold uppercase",
                    activeConv.ai_analysis.analysis_result === "yes" ? "bg-[var(--status-success)]/10 text-[var(--status-success)]" :
                    activeConv.ai_analysis.analysis_result === "maybe" ? "bg-[var(--status-warning)]/10 text-[var(--status-warning)]" :
                    "bg-[var(--status-danger)]/10 text-[var(--status-danger)]"
                  )}>
                    {activeConv.ai_analysis.analysis_result === "yes" ? "Eligible" :
                     activeConv.ai_analysis.analysis_result === "maybe" ? "Potential" : "Not Eligible"}
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.2 text-[8px] font-bold text-muted-foreground">Unanalyzed</span>
                )}
              </div>

              {activeConv.ai_analysis ? (
                <div className="space-y-2.5">
                  <p className="text-[10px] text-foreground/95 leading-normal">
                    {activeConv.ai_analysis.reasoning_summary}
                  </p>

                  <div className="border-t border-border/20 pt-2 space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                      <span>Confidence score:</span>
                      <span className="font-bold text-foreground">{Math.round(activeConv.ai_analysis.confidence_score * 100)}%</span>
                    </div>
                    {/* Visual progress bar */}
                    <ProgressiveFluxLoader
                      value={activeConv.ai_analysis.confidence_score * 100}
                      showLabel={false}
                      barClassName="h-1.5"
                      gradient={activeConv.ai_analysis.analysis_result === "yes" ? "var(--status-success)" : activeConv.ai_analysis.analysis_result === "maybe" ? "var(--status-warning)" : "var(--status-danger)"}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground/90 text-center leading-normal py-2">
                  No automated assessment yet. Click analyze to trigger Gemini model review of this room feed.
                </p>
              )}

              <button
                onClick={() => handleAnalyze(activeConv.id)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-1 py-1 px-2 text-[10px] font-bold text-white bg-[var(--brand)] rounded-lg hover:opacity-90 transition-opacity shadow-xs disabled:opacity-50 select-none"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                <span>Analyze opportunity</span>
              </button>
            </div>
          </div>

          {/* CRM Lead profile mapping */}
          <div className="p-4 space-y-2 leading-relaxed">
            <h4 className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider select-none">CRM Linkage</h4>
            {activeConv.contact?.linked_lead_id ? (
              <div className="rounded-lg border border-border bg-card p-3 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold text-muted-foreground">Linked Lead:</span>
                  <a
                    href={`/leads?id=${activeConv.contact.linked_lead_id}`}
                    className="text-[9px] font-extrabold text-[var(--brand)] hover:underline flex items-center gap-0.5"
                  >
                    <span>View Lead</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
                <p className="text-xs font-bold text-foreground">
                  {activeConv.contact.name || "Mapped Lead"}
                </p>
                <div className="flex items-center gap-1.5 mt-2 select-none">
                  <span className="rounded-full bg-[var(--status-success)]/10 text-[var(--status-success)] text-[8px] font-extrabold px-2 py-0.2">
                    Synced Account
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-3 text-center space-y-2 bg-card/25 select-none">
                <p className="text-[10px] text-muted-foreground leading-normal">
                  This contact has not been linked to a Lead in the CRM yet.
                </p>
                <button
                  onClick={() => handleOpenConvertModal(activeConv)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-[var(--status-success)]/10 text-[var(--status-success)] border border-[var(--status-success)]/20 rounded-md hover:bg-[var(--status-success)]/20 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span>Convert to Lead</span>
                </button>
              </div>
            )}
          </div>

          {/* Conversation metadata details */}
          <div className="p-4 space-y-2">
            <h4 className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider select-none">Details</h4>
            <div className="space-y-1.5 text-[10px] font-semibold">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source Channel:</span>
                <span className="text-foreground">Mekari Qontak API</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">External Chat ID:</span>
                <span className="text-foreground font-mono">{activeConv.external_chat_id}</span>
              </div>
              {activeConv.last_message_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Activity:</span>
                  <span className="text-foreground">{new Date(activeConv.last_message_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Notes Section */}
          <div className="p-4 space-y-2 flex flex-col">
            <h4 className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider select-none">Quick Notes</h4>
            <textarea
              defaultValue={activeMeta?.notes || ""}
              onBlur={e => handleSaveNotes(e.target.value)}
              placeholder="Write inline notes (persists when typing)..."
              rows={2}
              className="w-full rounded-lg border border-input bg-background/50 px-2.5 py-2 text-[10px] focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-normal placeholder:text-muted-foreground/60"
            />
            <span className="text-[8px] text-muted-foreground/60 select-none text-right font-medium italic mt-1">
              Saves automatically on blur
            </span>
          </div>

          {/* Tags section */}
          <div className="p-4 space-y-2">
            <h4 className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider select-none">Tags</h4>
            <div className="flex flex-wrap gap-1 mb-2">
              {(activeMeta?.tags || []).map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] text-[8px] font-extrabold px-2 py-0.5"
                >
                  <span>{tag}</span>
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500 font-bold ml-0.5" title="Remove tag">
                    <X className="h-2 w-2" />
                  </button>
                </span>
              ))}
              {(activeMeta?.tags || []).length === 0 && (
                <span className="text-[9px] text-muted-foreground/60 italic">No tags applied yet.</span>
              )}
            </div>
            <div className="flex gap-1.5 select-none">
              <Input
                value={newTagText}
                onChange={e => setNewTagText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddTag(); }}
                placeholder="New tag..."
                className="text-[9px] h-6 px-2 flex-1"
              />
              <Button
                onClick={handleAddTag}
                variant="outline"
                className="h-6 text-[9px] px-2 font-bold"
              >
                Add
              </Button>
            </div>
          </div>

          {/* Assignee section */}
          <div className="p-4 space-y-2">
            <h4 className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider select-none">Assignee</h4>
            <select
              value={activeMeta?.assignee || ""}
              onChange={e => {
                setLocalRoomsMeta(prev => ({
                  ...prev,
                  [activeConv.id]: {
                    ...prev[activeConv.id],
                    assignee: e.target.value
                  }
                }));
              }}
              className="w-full text-[10px] h-8 rounded-lg border border-input bg-background px-2 font-bold text-foreground focus:ring-1 focus:ring-ring select-none"
            >
              <option value="">-- Select Assignee --</option>
              <option value="Prasetia Sales">Prasetia Sales (Me)</option>
              <option value="Sales Team B">Sales Team B</option>
              <option value="Customer Support A">Customer Support A</option>
            </select>
          </div>
        </aside>
      )}

      {/* ── CRM CONVERSION MODAL ── */}
      <Modal
        open={convertModalOpen}
        onOpenChange={setConvertModalOpen}
        title="Convert Qontak Contact to Lead"
        description="Create a new Lead with this contact as primary."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConvertModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConvertSubmit} disabled={converting}>
              {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Convert
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          {convertError ? <Badge variant="danger">{convertError}</Badge> : null}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Company Name</label>
            <Input
              value={convertCompanyName}
              onChange={(e) => setConvertCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp"
              id="qontak-convert-company-name-input"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Funnel Stage</label>
            <Select
              value={convertStageId}
              onChange={(e) => setConvertStageId(e.target.value)}
              placeholder="Select initial funnel stage"
              id="qontak-convert-funnel-stage-select"
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
