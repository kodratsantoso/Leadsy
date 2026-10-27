'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/apiFetch';
import { 
  Sparkles, X, Send, Bot, User, Copy, Check, ShieldCheck, 
  Lightbulb, RefreshCw, MessageSquare, Zap, Target, ArrowRight 
} from 'lucide-react';

interface CopilotMessage {
  id: string;
  sender: 'user' | 'copilot';
  content: string;
  timestamp: string;
  model?: string;
}

interface InContextSalesCopilotDrawerProps {
  leadId: number;
  leadName: string;
  isOpen: boolean;
  onClose: () => void;
  onInsertWhatsAppDraft?: (text: string) => void;
}

const QUICK_PROMPTS = [
  {
    icon: Zap,
    label: "Counter Objection (Budget Freeze / Mahal)",
    prompt: "Berikan strategi counter-objection dan talking points jika prospek mengatakan budget freeze atau biaya solusi kita terlalu mahal dibandingkan kompetitor.",
  },
  {
    icon: Target,
    label: "C-Level Meeting Prep & Hook",
    prompt: "Siapkan 3 bullet point value proposition dan executive hook untuk meeting dengan C-Level/Direktur di industri lead ini.",
  },
  {
    icon: MessageSquare,
    label: "Draft Follow-Up WhatsApp Formal",
    prompt: "Buatkan draft pesan follow-up WhatsApp singkat, ramah, dan persuasif yang menyinggung kebutuhan efisiensi operasional mereka.",
  },
  {
    icon: Lightbulb,
    label: "Analisis Urgensi & BANTC Gaps",
    prompt: "Analisis informasi lead saat ini: apa celah BANTC yang masih kurang dan pertanyaan apa yang harus saya tanyakan di interaksi berikutnya?",
  },
];

export function InContextSalesCopilotDrawer({
  leadId,
  leadName,
  isOpen,
  onClose,
  onInsertWhatsAppDraft,
}: InContextSalesCopilotDrawerProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'copilot',
      content: `Halo! Saya adalah AI Sales Copilot Anda untuk **${leadName}**.\n\nSaya telah membaca profil perusahaan, riwayat aktivitas, skor kualifikasi, dan konteks BANTC lead ini. Pilih salah satu quick prompt di bawah atau ajukan pertanyaan spesifik terkait strategi closing Anda.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: 'Leadsy AI Orchestrator',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsgId = 'user-' + Date.now();
    const newUserMsg: CopilotMessage = {
      id: userMsgId,
      sender: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await apiFetch(`/api/leads/${leadId}/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend.trim() }),
      });
      const resData = await res.json();

      const copilotResponseText = resData?.data?.content || resData?.content || "Tidak ada respon dari model AI.";
      const modelUsed = resData?.data?.model || resData?.model || 'Leadsy AI';

      const copilotMsg: CopilotMessage = {
        id: 'copilot-' + Date.now(),
        sender: 'copilot',
        content: copilotResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: modelUsed,
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err: any) {
      const errorMsg: CopilotMessage = {
        id: 'copilot-err-' + Date.now(),
        sender: 'copilot',
        content: `Maaf, terjadi kendala saat menghubungi AI Copilot: ${err.message || 'Koneksi terputus'}. Silakan coba lagi.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-background border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-label="Leadsy In-Context Sales Copilot"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-border bg-card/60 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-md flex items-center justify-center text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-sm tracking-tight">Sales Copilot</h3>
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-3 w-3" /> UU PDP Masked
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                Deal Strategist • <span className="font-medium text-foreground">{leadName}</span>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Quick Prompts Bar */}
        <div className="p-3 bg-muted/30 border-b border-border overflow-x-auto scrollbar-none flex gap-2">
          {QUICK_PROMPTS.map((qp, idx) => {
            const Icon = qp.icon;
            return (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleSendMessage(qp.prompt)}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-brand/40 text-xs text-muted-foreground hover:text-foreground transition-all shadow-2xs group text-left"
              >
                <Icon className="h-3.5 w-3.5 text-brand group-hover:scale-110 transition-transform" />
                <span className="truncate max-w-[170px]">{qp.label}</span>
              </button>
            );
          })}
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'copilot' && (
                <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed space-y-2 shadow-2xs ${
                  msg.sender === 'user'
                    ? 'bg-brand text-white rounded-br-xs'
                    : 'bg-card border border-border text-foreground rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-line font-sans">
                  {msg.content}
                </div>

                <div className="flex items-center justify-between pt-1 gap-4 border-t border-border/40 text-[10px] text-muted-foreground">
                  <span>{msg.timestamp} {msg.model ? `• ${msg.model}` : ''}</span>
                  {msg.sender === 'copilot' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-foreground transition-colors p-1"
                        title="Salin ke clipboard"
                      >
                        {copiedId === msg.id ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                      {onInsertWhatsAppDraft && (
                        <button
                          onClick={() => onInsertWhatsAppDraft(msg.content)}
                          className="hover:text-brand transition-colors p-1 ml-1"
                          title="Gunakan sebagai draft WhatsApp"
                        >
                          <Send className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="h-7 w-7 rounded-lg bg-brand/10 text-brand border border-brand/20 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-xs px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand" />
                <span>Copilot sedang menganalisis pipeline & merumuskan rekomendasi...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-border bg-card/60 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Tanyakan strategi closing untuk ${leadName}...`}
              rows={2}
              className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="h-10 w-10 p-0 rounded-xl bg-brand text-white hover:bg-brand/90 shrink-0 shadow-sm"
              aria-label="Kirim ke Copilot"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-2 text-[10px] text-center text-muted-foreground">
            Tekan <kbd className="font-mono bg-muted px-1 rounded-sm text-[9px]">Enter</kbd> untuk kirim, <kbd className="font-mono bg-muted px-1 rounded-sm text-[9px]">Shift+Enter</kbd> untuk baris baru.
          </p>
        </div>
      </div>
    </div>
  );
}
