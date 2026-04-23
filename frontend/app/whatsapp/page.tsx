"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, QrCode, Wifi, WifiOff, Send, Loader2,
  Radio, Users, Shield, RefreshCw, Phone, ChevronRight,
  Sparkles, CheckCircle2, XCircle, AlertCircle, Plus, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  useWhatsApp,
  type WaSessionState, type WaConversation, type WaMessage,
  type WaCampaign, type WaSyncRule
} from "@/lib/hooks/use-whatsapp";

type Tab = "session" | "direct" | "broadcast" | "conversations" | "settings";

export default function WhatsAppPage() {
  const wa = useWhatsApp();
  const [tab, setTab] = useState<Tab>("session");

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

  // ── Sync Rules State ──
  const [syncRules, setSyncRules] = useState<WaSyncRule[]>([]);
  const [rulesSaved, setRulesSaved] = useState(false);

  // ── Poll session status ──
  const pollStatus = useCallback(async () => {
    const s = await wa.getStatus();
    setSession(s);
  }, [wa]);

  useEffect(() => {
    pollStatus();
    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [pollStatus]);

  // ── Tab data loaders ──
  useEffect(() => {
    if (tab === "conversations" && session.status === "connected") {
      wa.getConversations().then(setConversations);
    }
    if (tab === "broadcast") {
      wa.getCampaigns().then(setCampaigns);
    }
    if (tab === "settings") {
      wa.getSyncRules().then(setSyncRules);
    }
  }, [tab, session.status, wa]);

  // ── Handlers ──
  const handleConnect = async () => {
    await wa.initSession();
    setTimeout(pollStatus, 1500);
  };

  const handleDisconnect = async () => {
    await wa.disconnect();
    setSession({ status: "disconnected", number: null, qr_payload: null, connected_at: null });
  };

  const handleRefreshQr = async () => {
    await wa.refreshQr();
    setTimeout(pollStatus, 2000);
  };

  const handleSendDm = async () => {
    if (!dmPhone || !dmText) return;
    const result = await wa.sendMessage(dmPhone, dmText);
    if (result) {
      setDmSent(true);
      setDmText("");
      setTimeout(() => setDmSent(false), 3000);
    }
  };

  const handleCreateCampaign = async () => {
    if (!bcName || !bcMessage || !bcLeadIds) return;
    const ids = bcLeadIds.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    const result = await wa.createCampaign(bcName, bcMessage, ids);
    if (result) {
      setBcName(""); setBcMessage(""); setBcLeadIds("");
      wa.getCampaigns().then(setCampaigns);
    }
  };

  const handleExecuteCampaign = async (id: number) => {
    await wa.executeCampaign(id);
    wa.getCampaigns().then(setCampaigns);
  };

  const handleViewConv = async (conv: WaConversation) => {
    setActiveConv(conv);
    const msgs = await wa.getMessages(conv.id);
    setActiveMessages(msgs);
  };

  const handleAnalyze = async (convId: number) => {
    await wa.analyzeConversation(convId);
    setTimeout(() => wa.getConversations().then(setConversations), 2000);
  };

  const handleSaveRules = async () => {
    const ok = await wa.updateSyncRules(syncRules);
    if (ok) { setRulesSaved(true); setTimeout(() => setRulesSaved(false), 3000); }
  };

  const addRule = () => {
    setSyncRules([...syncRules, { rule_type: "include_keyword", rule_key: "message", rule_value: "", enabled: true }]);
  };

  const removeRule = (i: number) => {
    setSyncRules(syncRules.filter((_, idx) => idx !== i));
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "session", label: "Session & QR", icon: QrCode },
    { id: "direct", label: "Direct Message", icon: Send },
    { id: "broadcast", label: "Broadcast", icon: Radio },
    { id: "conversations", label: "Conversations", icon: MessageSquare },
    { id: "settings", label: "Privacy & Rules", icon: Shield },
  ];

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp Integration</h1>
        <p className="text-sm text-muted-foreground">
          Real-time session, direct & broadcast messaging, privacy-aware conversation sync — BRD §3.9
        </p>
      </div>

      {/* Error Banner */}
      {wa.error && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--status-danger)]/20 bg-[color-mix(in_oklch,var(--status-danger)_5%,transparent)] px-4 py-2 text-sm text-[var(--status-danger)]">
          <AlertCircle className="h-4 w-4" /> {wa.error}
          <button onClick={wa.clearError} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Connection Status Bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg",
              session.status === "connected" ? "bg-[var(--status-success)]/10" : "bg-[var(--status-danger)]/10")}>
              {session.status === "connected" ? <Wifi className="h-5 w-5 text-[var(--status-success)]" /> : <WifiOff className="h-5 w-5 text-[var(--status-danger)]" />}
            </div>
            <div>
              <p className="text-sm font-semibold capitalize">{session.status === "qr_ready" ? "Awaiting QR Scan" : session.status}</p>
              <p className="text-xs text-muted-foreground">
                {session.status === "connected" && session.number ? `Connected as ${session.number}` : "WhatsApp Baileys Engine (Real Session)"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {session.status === "connected" && (
              <button onClick={handleDisconnect} disabled={wa.loading}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--status-danger)]/20 px-3 py-1.5 text-xs font-medium text-[var(--status-danger)] hover:bg-[var(--status-danger)]/10 disabled:opacity-50">
                Disconnect
              </button>
            )}
            {session.status === "disconnected" && (
              <Button variant="default" size="sm" disabled={wa.loading} onClick={handleConnect}>
                {wa.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                Connect
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-xs font-medium transition-colors",
              tab === t.id ? "border-[var(--brand)] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══════ TAB 1: SESSION & QR ═══════ */}
      {tab === "session" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">QR Code Scanner</h2>
            {session.status === "disconnected" && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30">
                  <QrCode className="h-16 w-16 text-muted-foreground/30" />
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Click &quot;Connect&quot; to generate a real QR code. Scan it with WhatsApp Mobile → Linked Devices.
                </p>
              </div>
            )}
            {session.status === "qr_ready" && session.qr_payload && (
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-52 w-52 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background p-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(session.qr_payload)}`}
                    alt="WhatsApp QR Code"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex items-center gap-2 text-[var(--brand)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-xs font-medium">Waiting for scan on mobile device...</p>
                </div>
                <button onClick={handleRefreshQr} disabled={wa.loading}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <RefreshCw className="h-3 w-3" /> Refresh QR
                </button>
              </div>
            )}
            {session.status === "connected" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--status-success)]/10">
                  <MessageSquare className="h-10 w-10 text-[var(--status-success)]" />
                </div>
                <p className="text-sm font-medium text-[var(--status-success)]">Session Active</p>
                <p className="text-xs text-muted-foreground text-center">
                  {session.number && <>Connected as {session.number}<br /></>}
                  {session.connected_at ? `Since ${new Date(session.connected_at).toLocaleString()}` : "Session established"}
                </p>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Connection Instructions</h2>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-xs font-bold text-[var(--brand)]">1</span> Click &quot;Connect&quot; to start a real Baileys session</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-xs font-bold text-[var(--brand)]">2</span> Open WhatsApp on your phone</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-xs font-bold text-[var(--brand)]">3</span> Go to Settings → Linked Devices → Link a Device</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-xs font-bold text-[var(--brand)]">4</span> Scan the QR code displayed here</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--status-success)]/10 text-xs font-bold text-[var(--status-success)]">5</span> Status will change to &quot;Connected&quot; automatically</li>
            </ol>
            <div className="mt-6 rounded-lg border border-[var(--status-warning)]/20 bg-[color-mix(in_oklch,var(--status-warning)_5%,transparent)] p-3">
              <p className="text-xs text-[var(--status-warning)]">
                <strong>Privacy Note:</strong> Only conversations matching your sync rules will be stored. Personal chats are never ingested.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ TAB 2: DIRECT MESSAGE ═══════ */}
      {tab === "direct" && (
        <div className="max-w-lg">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2"><Send className="h-5 w-5 text-[var(--status-success)]" /> Send Direct Message</h2>
            {session.status !== "connected" ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <WifiOff className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                Connect your WhatsApp session first.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Recipient Phone Number</label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={dmPhone} onChange={e => setDmPhone(e.target.value)} placeholder="e.g. 6281234567890" className="pl-9 font-mono" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Message</label>
                  <Textarea value={dmText} onChange={e => setDmText(e.target.value)} placeholder="Type your message..." rows={4} className="mt-1" />
                </div>
                <Button variant="default" className="w-full" disabled={wa.loading || !dmPhone || !dmText} onClick={handleSendDm}>
                  {wa.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send Message
                </Button>
                {dmSent && (
                  <p className="flex items-center gap-1 text-xs text-[var(--status-success)] font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Message sent successfully!</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ TAB 3: BROADCAST ═══════ */}
      {tab === "broadcast" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2"><Radio className="h-5 w-5 text-[var(--brand)]" /> Create Broadcast Campaign</h2>
            {session.status !== "connected" ? (
              <p className="text-sm text-muted-foreground py-4">Connect your WhatsApp session first.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Campaign Name</label>
                    <Input value={bcName} onChange={e => setBcName(e.target.value)} placeholder="Q2 Outreach" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Lead IDs (comma-separated)</label>
                    <Input value={bcLeadIds} onChange={e => setBcLeadIds(e.target.value)} placeholder="1, 2, 3" className="mt-1 font-mono" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Message Template</label>
                  <Textarea value={bcMessage} onChange={e => setBcMessage(e.target.value)} placeholder="Hello! We'd like to introduce..." rows={3} className="mt-1" />
                </div>
                <Button variant="default" size="sm" disabled={wa.loading || !bcName || !bcMessage || !bcLeadIds} onClick={handleCreateCampaign}>
                  {wa.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Campaign
                </Button>
              </div>
            )}
          </div>

          {/* Campaign List */}
          {campaigns.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Campaign History</h3>
              <div className="space-y-3">
                {campaigns.map(c => (
                  <div key={c.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{c.campaign_name}</h4>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        c.status === "sent" ? "bg-[var(--status-success)]/10 text-[var(--status-success)]" :
                        c.status === "sending" ? "bg-[var(--status-warning)]/10 text-[var(--status-warning)]" :
                        "bg-muted text-muted-foreground")}>{c.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{c.message_template}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{c.total_targets} recipients</span>
                      {c.status === "draft" && (
                        <button onClick={() => handleExecuteCampaign(c.id)} disabled={wa.loading || session.status !== "connected"}
                          className="flex items-center gap-1 rounded bg-[var(--status-success)] px-2.5 py-1 text-[10px] font-medium text-white hover:opacity-80 disabled:opacity-50">
                          <Send className="h-3 w-3" /> Execute
                        </button>
                      )}
                      {c.status === "sent" && c.recipients && (
                        <div className="flex gap-2 text-[10px]">
                          <span className="text-[var(--status-success)]">{c.recipients.filter(r => r.send_status === "sent").length} sent</span>
                          <span className="text-[var(--status-danger)]">{c.recipients.filter(r => r.send_status === "failed").length} failed</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ TAB 4: CONVERSATIONS ═══════ */}
      {tab === "conversations" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">Relevant Conversations</h3>
              <p className="text-[10px] text-muted-foreground">Only privacy-filtered conversations shown</p>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="p-6 text-center text-xs text-muted-foreground">No relevant conversations yet.</p>
              ) : conversations.map(conv => (
                <button key={conv.id}
                  onClick={() => handleViewConv(conv)}
                  className={cn("w-full text-left border-b border-border/50 p-3 hover:bg-accent/30 transition-colors",
                    activeConv?.id === conv.id && "bg-accent/20")}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate max-w-[180px]">{conv.contact?.name || conv.external_chat_id}</span>
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
                      conv.relevance_status === "high" ? "bg-[var(--status-success)]/10 text-[var(--status-success)]" :
                      conv.relevance_status === "medium" ? "bg-[var(--status-warning)]/10 text-[var(--status-warning)]" :
                      "bg-muted text-muted-foreground")}>{conv.relevance_status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{conv.contact?.phone_number}</span>
                    {conv.ai_analysis && (
                      <span className="flex items-center gap-0.5 text-[9px] text-[var(--brand)]">
                        <Sparkles className="h-2.5 w-2.5" /> {conv.ai_analysis.analysis_result}
                      </span>
                    )}
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Conversation Detail */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {activeConv ? (
              <>
                <div className="border-b border-border px-4 py-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{activeConv.contact?.name || "Unknown"}</h3>
                    <p className="text-[10px] text-muted-foreground">{activeConv.contact?.phone_number}</p>
                  </div>
                  <button onClick={() => handleAnalyze(activeConv.id)}
                    className="flex items-center gap-1 rounded-md bg-[var(--brand)]/10 px-2 py-1 text-[10px] font-medium text-[var(--brand)] hover:bg-[var(--brand)]/20">
                    <Sparkles className="h-3 w-3" /> Analyze
                  </button>
                </div>

                {/* AI Analysis Card */}
                {activeConv.ai_analysis && (
                  <div className="mx-3 mt-3 rounded-lg border border-[var(--brand)]/20 bg-[color-mix(in_oklch,var(--brand)_5%,transparent)] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-3.5 w-3.5 text-[var(--brand)]" />
                      <span className="text-xs font-semibold text-[var(--brand)]">AI Analysis</span>
                      <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                        activeConv.ai_analysis.analysis_result === "yes" ? "bg-[var(--status-success)]/10 text-[var(--status-success)]" :
                        activeConv.ai_analysis.analysis_result === "maybe" ? "bg-[var(--status-warning)]/10 text-[var(--status-warning)]" :
                        "bg-[var(--status-danger)]/10 text-[var(--status-danger)]")}>
                        {activeConv.ai_analysis.analysis_result === "yes" ? "Lead Potential" :
                         activeConv.ai_analysis.analysis_result === "maybe" ? "Maybe" : "No Lead"}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{activeConv.ai_analysis.reasoning_summary}</p>
                    <div className="mt-1 flex items-center gap-2 text-[9px] text-muted-foreground">
                      <span>Confidence: {Math.round(activeConv.ai_analysis.confidence_score * 100)}%</span>
                      <span>• {activeConv.ai_analysis.provider}</span>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="p-3 max-h-[350px] overflow-y-auto space-y-2">
                  {activeMessages.map(msg => (
                    <div key={msg.id} className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[85%] rounded-lg px-3 py-2 text-xs",
                        msg.direction === "outbound" ? "bg-[var(--status-success)]/10 text-foreground" : "bg-muted text-foreground")}>
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                        <p className="text-[9px] opacity-50 mt-1 text-right">{new Date(msg.sent_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-xs">Select a conversation to view messages</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ TAB 5: PRIVACY SETTINGS ═══════ */}
      {tab === "settings" && (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold flex items-center gap-2"><Shield className="h-5 w-5 text-[var(--brand)]" /> Privacy & Sync Rules</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Configure which WhatsApp conversations are allowed for sync. Only matching conversations will be stored and analyzed.
            </p>

            <div className="space-y-3">
              {syncRules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border/50 p-3 bg-muted/10">
                  <Select value={rule.rule_type}
                    onChange={(e) => { const n = [...syncRules]; n[i] = {...n[i], rule_type: e.target.value}; setSyncRules(n); }}
                    className="w-auto">
                    <option value="include_keyword">Include Keyword</option>
                    <option value="exclude_keyword">Exclude Keyword</option>
                    <option value="strict_allowlist">Strict Allowlist</option>
                  </Select>
                  <Input value={rule.rule_value || ""}
                    onChange={e => { const n = [...syncRules]; n[i] = {...n[i], rule_value: e.target.value}; setSyncRules(n); }}
                    placeholder="Keyword or value..."
                    className="flex-1" />
                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={rule.enabled}
                      onChange={e => { const n = [...syncRules]; n[i] = {...n[i], enabled: e.target.checked}; setSyncRules(n); }}
                      className="h-3.5 w-3.5 accent-[var(--brand)]" />
                    On
                  </label>
                  <button onClick={() => removeRule(i)} className="text-[var(--status-danger)]/60 hover:text-[var(--status-danger)]"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}

              {syncRules.length === 0 && (
                <div className="rounded-lg border border-dashed border-border py-6 text-center">
                  <p className="text-xs text-muted-foreground mb-2">No sync rules configured. All conversations from known leads will be synced by default.</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button variant="secondary" size="sm" onClick={addRule}>
                  <Plus className="h-3 w-3" /> Add Rule
                </Button>
                <Button variant="default" size="sm" disabled={wa.loading} onClick={handleSaveRules}>
                  {wa.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Save Rules
                </Button>
                {rulesSaved && <span className="text-xs text-[var(--status-success)] font-medium">Saved!</span>}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--status-warning)]/20 bg-[color-mix(in_oklch,var(--status-warning)_5%,transparent)] p-4">
            <h3 className="text-sm font-semibold text-[var(--status-warning)] mb-2">How Privacy Filtering Works</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--status-success)]" /> Messages from phone numbers matching existing leads are <strong>always</strong> synced</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--status-success)]" /> <strong>Include keywords</strong> in sender name or message body trigger sync</li>
              <li className="flex items-start gap-2"><XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--status-danger)]" /> <strong>Exclude keywords</strong> always block sync (takes priority over includes)</li>
              <li className="flex items-start gap-2"><Shield className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--brand)]" /> <strong>Strict Allowlist</strong> mode: ONLY explicitly matched contacts are synced</li>
              <li className="flex items-start gap-2"><XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--status-danger)]" /> Personal/irrelevant chats are <strong>never</strong> stored or sent to AI</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
