"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare, Loader2, RefreshCw, ChevronRight, Sparkles, AlertCircle, Plus
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

export default function MekariQontakPage() {
  const {
    getConversations,
    getMessages,
    analyzeConversation,
    convertToLead,
    error,
    clearError,
    loading
  } = useWhatsApp();
  const platform = "mekari_qontak";

  // ── Conversations State ──
  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [activeConv, setActiveConv] = useState<WaConversation | null>(null);
  const [activeMessages, setActiveMessages] = useState<WaMessage[]>([]);
  const [stages, setStages] = useState<{ id: number; name: string }[]>([]);

  // ── Convert Modal State ──
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertCompanyName, setConvertCompanyName] = useState("");
  const [convertStageId, setConvertStageId] = useState("");
  const [convertError, setConvertError] = useState("");
  const [converting, setConverting] = useState(false);

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

  // ── Reset conversation selections when loading ──
  useEffect(() => {
    setActiveConv(null);
    setActiveMessages([]);
    setConversations([]);
    // Load rooms
    getConversations("mekari_qontak").then(setConversations);
  }, [getConversations]);

  // ── Auto Refresh every 30 seconds ──
  useEffect(() => {
    const interval = setInterval(() => {
      getConversations("mekari_qontak").then(setConversations);
    }, 30000);

    return () => clearInterval(interval);
  }, [getConversations]);

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

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mekari Qontak</h1>
        <p className="text-sm text-muted-foreground">
          Analyze and sync conversation feeds and run AI lead eligibility analysis using the Mekari Omnichannel Hub.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--status-danger)]/20 bg-[color-mix(in_oklch,var(--status-danger)_5%,transparent)] px-4 py-2 text-sm text-[var(--status-danger)]">
          <AlertCircle className="h-4 w-4" /> {error}
          <button onClick={clearError} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Pane: Conversations List */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-border px-4 py-3 bg-muted/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Qontak Conversations</h3>
              <p className="text-[10px] text-muted-foreground">Live rooms synced from Mekari Omnichannel Hub</p>
            </div>
             <button
              onClick={() => getConversations("mekari_qontak").then(setConversations)}
              disabled={loading}
              className="flex items-center gap-1 rounded-md border border-border bg-card hover:bg-accent/30 p-1.5 text-xs disabled:opacity-55"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
          </div>
          <div className="max-h-[550px] overflow-y-auto divide-y divide-border/30">
            {conversations.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
                <MessageSquare className="h-8 w-8 mx-auto opacity-30" />
                <p>No conversations found.</p>
                <p className="text-[10px]">Verify your credentials are enabled in Settings.</p>
              </div>
            ) : conversations.map(conv => (
              <button key={conv.id}
                onClick={() => handleViewConv(conv)}
                className={cn("w-full text-left p-4 hover:bg-accent/25 transition-all flex flex-col gap-1.5",
                  activeConv?.id === conv.id && "bg-accent/20 border-l-2 border-[var(--brand)]")}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                    {conv.contact?.name || conv.external_chat_id}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                    conv.relevance_status === "high" ? "bg-[var(--status-success)]/10 text-[var(--status-success)]" :
                    conv.relevance_status === "medium" ? "bg-[var(--status-warning)]/10 text-[var(--status-warning)]" :
                    "bg-muted text-muted-foreground")}>
                    {conv.relevance_status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{conv.contact?.phone_number || "No Phone"}</span>
                  {conv.last_message_at && (
                    <span>{new Date(conv.last_message_at).toLocaleDateString()}</span>
                  )}
                </div>
                {conv.ai_analysis && (
                  <div className="mt-1 flex items-center gap-1 text-[9px] font-medium text-[var(--brand)] bg-[var(--brand)]/5 rounded px-1.5 py-0.5 w-fit">
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>AI Status: {
                      conv.ai_analysis.analysis_result === "yes" ? "Eligible Lead" :
                      conv.ai_analysis.analysis_result === "maybe" ? "Potential Lead" : "Not Eligible"
                    }</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Pane: Thread History & AI Intelligence */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
          {activeConv ? (
            <div className="flex flex-col h-full divide-y divide-border">
              {/* Header info */}
              <div className="px-4 py-3 flex items-center justify-between bg-muted/10">
                <div>
                  <h3 className="text-sm font-semibold">{activeConv.contact?.name || "Customer Room"}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    ID: <span className="font-mono">{activeConv.external_chat_id}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  {activeConv.contact && !activeConv.contact.linked_lead_id && (
                    <Button
                      onClick={() => handleOpenConvertModal(activeConv)}
                      className="flex items-center gap-1 rounded-md bg-[var(--status-success)]/10 px-2.5 py-1.5 text-xs font-semibold text-[var(--status-success)] hover:bg-[var(--status-success)]/20 shadow-sm"
                      id="qontak-convert-to-lead-btn"
                    >
                      <Plus className="h-3.5 w-3.5" /> Convert to Lead
                    </Button>
                  )}
                  <button
                    onClick={() => handleAnalyze(activeConv.id)}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-md bg-[var(--brand)] px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90 shadow-sm disabled:opacity-55"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Analyze Lead
                  </button>
                </div>
              </div>

              {/* AI Eligibility Advisory Card */}
              <div className="p-4 bg-accent/5">
                <div className="rounded-xl border border-[var(--brand)]/15 bg-card/60 backdrop-blur-md p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[var(--brand)]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand)]">Lead Eligibility Check</span>
                    </div>
                    {activeConv.ai_analysis ? (
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                        activeConv.ai_analysis.analysis_result === "yes" ? "bg-[var(--status-success)]/10 text-[var(--status-success)]" :
                        activeConv.ai_analysis.analysis_result === "maybe" ? "bg-[var(--status-warning)]/10 text-[var(--status-warning)]" :
                        "bg-[var(--status-danger)]/10 text-[var(--status-danger)]")}>
                        {activeConv.ai_analysis.analysis_result === "yes" ? "Eligible" :
                         activeConv.ai_analysis.analysis_result === "maybe" ? "Potential" : "Not Eligible"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">UNANALYZED</span>
                    )}
                  </div>

                  {activeConv.ai_analysis ? (
                    <div className="space-y-2">
                      <p className="text-xs text-foreground leading-relaxed">
                        {activeConv.ai_analysis.reasoning_summary}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/20 pt-2">
                        <div className="flex items-center gap-1">
                          <span>Confidence:</span>
                          <span className="font-semibold text-foreground">{Math.round(activeConv.ai_analysis.confidence_score * 100)}%</span>
                        </div>
                        <span>Engine: {activeConv.ai_analysis.provider}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-xs text-muted-foreground">
                        Run the AI evaluation to verify if this conversation indicates a qualified business opportunity.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages Timeline */}
              <div className="p-4 flex-1 overflow-y-auto max-h-[380px] min-h-[250px] space-y-3 bg-card/30">
                {activeMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mb-2 opacity-30" />
                    <p className="text-xs">Loading chat history...</p>
                  </div>
                ) : activeMessages.map(msg => (
                  <div key={msg.id} className={cn("flex flex-col", msg.direction === "outbound" ? "items-end" : "items-start")}>
                    <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-sm",
                      msg.direction === "outbound" 
                        ? "bg-[var(--brand)] text-white rounded-tr-none" 
                        : "bg-muted text-foreground rounded-tl-none")}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                      <span className="text-[8px] opacity-60 block text-right mt-1.5">
                        {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-24 text-muted-foreground space-y-3">
              <MessageSquare className="h-12 w-12 opacity-15" />
              <div className="text-center">
                <p className="text-sm font-semibold">No Conversation Selected</p>
                <p className="text-xs text-muted-foreground">Select a chat from the rooms panel to load active messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
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
