"use client";

import React, { useRef, useState } from "react";
import { 
  CheckCircle, AlertCircle, Info, Sparkles, Printer, Download,
  Activity, Target, Clock, MessageSquare, ShieldCheck, Flag, CheckSquare
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { safeJsonArray, safeRender } from "@/lib/utils";
import html2canvas from "html2canvas";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function MeetingSummaryReport({ transcript, evaluation, onGeneratePdf }: { transcript: any, evaluation: any, onGeneratePdf?: () => void }) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!evaluation) return null;

  // 1. Defensive Adapter & Normalizer
  const parseJsonStr = (val: any) => {
    if (!val) return null;
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        return parsed;
      } catch (e) {
        return val;
      }
    }
    return val;
  };

  const getStr = (val: any) => {
    if (!val) return null;
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  const getArr = (val: any) => {
    return safeJsonArray(val);
  };

  const extractBantc = () => {
    const b = parseJsonStr(evaluation.bantc_extracted);
    if (!b || typeof b !== "object") return [];
    
    return ['budget', 'authority', 'needs', 'timeline', 'competitor'].map(key => {
      const raw = b[key];
      if (!raw) return null;
      if (typeof raw === "object") {
        return { key, value: raw.Value || raw.value, evidence: raw.Evidence || raw.evidence };
      }
      return { key, value: raw };
    }).filter(Boolean);
  };

  // Extract relevant arrays for cross-referencing priority
  const actionItems = getArr(evaluation.action_items);
  const risks = getArr(evaluation.risks);
  const buyingSignals = getArr(evaluation.buying_signals);
  const objections = getArr(evaluation.objections_detected);
  
  // 2. Deterministic Topic Relevance Scoring
  const getTopicRelevance = (topicName: string, desc: string) => {
    const textToMatch = `${topicName} ${desc}`.toLowerCase();
    
    // High: linked to action item, risk, objection, or buying signal
    const isHigh = 
      actionItems.some(a => getStr(a)?.toLowerCase().includes(topicName.toLowerCase())) ||
      risks.some(r => getStr(r)?.toLowerCase().includes(topicName.toLowerCase())) ||
      objections.some(o => getStr(o)?.toLowerCase().includes(topicName.toLowerCase())) ||
      buyingSignals.some(b => getStr(b)?.toLowerCase().includes(topicName.toLowerCase()));

    if (isHigh) return "High";

    // Medium if not linked to explicit items
    return "Medium";
  };

  // Compile Topics
  const getTopics = () => {
    const gen = parseJsonStr(transcript.general_sections_json) || {};
    const meet = parseJsonStr(transcript.meeting_type_sections_json) || {};
    
    const combined = { ...gen, ...meet };
    
    const topics: { topic: string, desc: string, relevance: string }[] = [];
    Object.entries(combined).forEach(([k, v]) => {
      if (k.toLowerCase() === 'bantc') return;
      if (!v || v === "Not available" || (Array.isArray(v) && v.length === 0)) return;
      
      const desc = Array.isArray(v) ? v.join(", ") : String(v);
      topics.push({
        topic: k.replace(/_/g, ' '),
        desc,
        relevance: getTopicRelevance(k, desc)
      });
    });
    
    // Sort High first
    return topics.sort((a, b) => (a.relevance === "High" ? -1 : 1));
  };

  const topics = getTopics();
  const bantc = extractBantc();

  const handleExportImage = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Meeting_Summary_${transcript.id}.png`;
      a.click();
    } catch (e) {
      console.error(e);
      alert("Failed to export image");
    } finally {
      setIsExporting(false);
    }
  };

  // Chart configuration for Indicator
  const intentLevel = String(evaluation.intent_level || "Unknown").toLowerCase();
  const getIndicatorColor = () => {
    if (intentLevel.includes("high")) return "#10b981"; // green
    if (intentLevel.includes("medium")) return "#f59e0b"; // yellow
    if (intentLevel.includes("low")) return "#ef4444"; // red
    return "#9ca3af"; // gray
  };

  const indicatorOptions: any = {
    chart: { type: 'radialBar', sparkline: { enabled: true } },
    colors: [getIndicatorColor()],
    plotOptions: {
      radialBar: {
        hollow: { size: '60%' },
        dataLabels: {
          name: { show: false },
          value: { offsetY: 5, fontSize: '14px', fontWeight: 'bold' }
        }
      }
    },
    labels: ['Intent']
  };

  const indicatorSeries = [
    intentLevel.includes("high") ? 85 : 
    intentLevel.includes("medium") ? 50 : 
    intentLevel.includes("low") ? 20 : 0
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Action Bar */}
      <div className="flex justify-end gap-2 print:hidden mb-2">
        <Button variant="outline" size="sm" onClick={handleExportImage} disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export Image"}
        </Button>
        {onGeneratePdf && (
          <Button variant="outline" size="sm" onClick={onGeneratePdf}>
            <Printer className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        )}
      </div>

      {/* Printable Report Container */}
      <div 
        ref={reportRef} 
        className="bg-white text-slate-900 border border-border rounded-xl shadow-sm p-6 sm:p-10 mx-auto w-full max-w-5xl"
        style={{ color: '#0f172a' }} // Force dark text for print
      >
        {/* --- PAGE 1: EXECUTIVE SUMMARY --- */}
        <div className="print:break-after-auto">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Meeting Summary</h1>
                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none">AI Summary</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <span className="flex items-center gap-1"><Target className="h-3 w-3"/> Type: <strong className="capitalize">{transcript.meeting_type || "General"}</strong></span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3"/> Date: <strong>{new Date(transcript.recorded_at || transcript.created_at).toLocaleDateString()}</strong></span>
              </div>
            </div>
            
            {/* Primary Indicator */}
            {intentLevel !== "unknown" && (
              <div className="flex flex-col items-center justify-center shrink-0 w-24">
                <Chart options={indicatorOptions} series={indicatorSeries} type="radialBar" height="100" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 capitalize">{intentLevel} Intent</span>
              </div>
            )}
          </div>

          {/* Executive Summary */}
          {evaluation.summary && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">Executive Summary</h2>
              <p className="text-base text-slate-800 leading-relaxed">
                {getStr(evaluation.summary)}
              </p>
            </div>
          )}

          {/* 4 Insight Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* 1. Key Pain Points / Challenges */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-3 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5"/> Key Pain Points</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                {getStr(evaluation.challenge) ? (
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"/>{getStr(evaluation.challenge)}</li>
                ) : null}
                {getStr(evaluation.legacy_tools) ? (
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"/>Legacy Tools: {getStr(evaluation.legacy_tools)}</li>
                ) : null}
                {bantc.map((b: any, i) => b.key === 'competitor' ? (
                  <li key={i} className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"/>Competitor: {String(b.value)}</li>
                ) : null)}
              </ul>
            </div>

            {/* 2. Customer Needs (BANTC subset) */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-3 flex items-center gap-1.5"><Target className="h-3.5 w-3.5"/> Customer Needs & Scope</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                {bantc.map((b: any, i) => ['needs', 'budget', 'timeline'].includes(b.key) ? (
                  <li key={i} className="flex flex-col gap-0.5">
                    <span className="font-medium capitalize text-slate-900">{b.key}: {String(b.value)}</span>
                    {b.evidence && <span className="text-xs text-slate-500 line-clamp-2">{b.evidence}</span>}
                  </li>
                ) : null)}
              </ul>
            </div>

            {/* 3. Key Discussions (Buying Signals & Objections) */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-3 flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5"/> Key Discussions</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                {buyingSignals.slice(0, 3).map((s: any, i: number) => (
                  <li key={`bs-${i}`} className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0"/>{getStr(s)}</li>
                ))}
                {objections.slice(0, 2).map((o: any, i: number) => (
                  <li key={`ob-${i}`} className="flex items-start gap-2"><Flag className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0"/>{getStr(o)}</li>
                ))}
                {buyingSignals.length === 0 && objections.length === 0 && <span className="text-slate-400 italic">No specific signals detected.</span>}
              </ul>
            </div>

            {/* 4. Missing Information / Risks */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-orange-600 mb-3 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5"/> Risks & Missing Info</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                {risks.slice(0, 3).map((r: any, i: number) => (
                  <li key={`r-${i}`} className="flex items-start gap-2"><AlertCircle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0"/>{getStr(r)}</li>
                ))}
                {getArr(evaluation.missing_information).slice(0, 2).map((m: any, i: number) => (
                  <li key={`m-${i}`} className="flex items-start gap-2"><Info className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0"/>{getStr(m)}</li>
                ))}
                {risks.length === 0 && getArr(evaluation.missing_information).length === 0 && <span className="text-slate-400 italic">No major risks detected.</span>}
              </ul>
            </div>
          </div>
        </div>

        {/* --- PAGE 2 (if printed) --- */}
        <div className="print:break-before-auto">
          {/* Topics Table */}
          {topics.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Topics Discussed</h2>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 font-medium">Topic</th>
                      <th className="px-4 py-2 font-medium">Discussion Summary</th>
                      <th className="px-4 py-2 font-medium w-28">Relevance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topics.slice(0, 6).map((t, idx) => (
                      <tr key={idx} className="bg-white">
                        <td className="px-4 py-3 font-medium text-slate-900 align-top capitalize">{t.topic}</td>
                        <td className="px-4 py-3 text-slate-600 align-top">{t.desc}</td>
                        <td className="px-4 py-3 align-top">
                          {t.relevance === "High" ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shadow-none text-[10px]">HIGH</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none shadow-none text-[10px]">MEDIUM</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Items */}
          {actionItems.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Action Items</h2>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 font-medium w-10">No</th>
                      <th className="px-4 py-2 font-medium">Action Item</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {actionItems.slice(0, 8).map((a: any, idx: number) => (
                      <tr key={idx} className="bg-white">
                        <td className="px-4 py-3 text-slate-500 align-top">{idx + 1}</td>
                        <td className="px-4 py-3 text-slate-800 align-top flex items-start gap-2">
                          <CheckSquare className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                          {getStr(a)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Conclusion */}
          <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100 mb-6 print:break-inside-avoid">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-700 mb-2">Conclusion & Assessment</h2>
            <p className="text-sm text-slate-800 leading-relaxed">
              {getStr(evaluation.presales_analysis) || getStr(evaluation.presales_recommendation) || "Meeting concluded successfully. See summary for details."}
            </p>
          </div>

          {/* Next Steps Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:break-inside-avoid">
            <div className="border-l-4 border-emerald-500 bg-white rounded-r-lg p-4 shadow-sm border-y border-r border-slate-100">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Recommended Next Action</p>
              <p className="text-sm font-semibold text-slate-800">{getStr(evaluation.next_best_action) || "TBD"}</p>
            </div>
            
            <div className="border-l-4 border-blue-500 bg-white rounded-r-lg p-4 shadow-sm border-y border-r border-slate-100">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Estimated Closing</p>
              <p className="text-sm font-semibold text-slate-800">{getStr(evaluation.estimated_closing_date) || "Not specified"}</p>
            </div>

            <div className="border-l-4 border-indigo-500 bg-white rounded-r-lg p-4 shadow-sm border-y border-r border-slate-100">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Interest Level</p>
              <p className="text-sm font-semibold text-slate-800 capitalize">{getStr(evaluation.interest_level) || "Unknown"}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
