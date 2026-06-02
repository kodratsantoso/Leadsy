"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare, Loader2, RefreshCw, ChevronRight, Sparkles, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useWhatsApp,
  type WaConversation, type WaMessage
} from "@/lib/hooks/use-whatsapp";

export default function MekariQontakPage() {
  const wa = useWhatsApp();
  const platform = "mekari_qontak";

  // ── Conversations State ──
  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [activeConv, setActiveConv] = useState<WaConversation | null>(null);
  const [activeMessages, setActiveMessages] = useState<WaMessage[]>([]);

  // ── Reset conversation selections when loading ──
  useEffect(() => {
    setActiveConv(null);
    setActiveMessages([]);
    setConversations([]);
    // Load rooms
    wa.getConversations("mekari_qontak").then(setConversations);
  }, [wa]);

  const handleViewConv = async (conv: WaConversation) => {
    setActiveConv(conv);
    const msgs = await wa.getMessages(conv.id);
    setActiveMessages(msgs);
  };

  const handleAnalyze = async (convId: number) => {
    await wa.analyzeConversation(convId);
    setTimeout(() => {
      wa.getConversations(platform).then(res => {
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
      {wa.error && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--status-danger)]/20 bg-[color-mix(in_oklch,var(--status-danger)_5%,transparent)] px-4 py-2 text-sm text-[var(--status-danger)]">
          <AlertCircle className="h-4 w-4" /> {wa.error}
          <button onClick={wa.clearError} className="ml-auto text-xs underline">Dismiss</button>
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
              onClick={() => wa.getConversations("mekari_qontak").then(setConversations)}
              className="flex items-center gap-1 rounded-md border border-border bg-card hover:bg-accent/30 p-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
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
                <button
                  onClick={() => handleAnalyze(activeConv.id)}
                  className="flex items-center gap-1.5 rounded-md bg-[var(--brand)] px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90 shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Analyze Lead
                </button>
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
    </div>
  );
}
