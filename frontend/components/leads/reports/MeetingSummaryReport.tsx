"use client";

import React, { useMemo, useRef, useState } from 'react';
import { 
  Building2, Calendar, Clock, Users, Target, MessageSquare, 
  Briefcase, FileText, CheckCircle2, Download, Loader2,
  Presentation, Layers, AlertTriangle, Activity, Hexagon, ThumbsUp, LayoutList, PieChart
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { toPng } from 'html-to-image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export function MeetingSummaryReport({ transcript, lead }: { transcript: any, lead: any }) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Parse type
  const meetingTypeStr = (transcript.summary_type || transcript.meeting_type || 'Discovery').toLowerCase();
  
  let typeKey = 'discovery';
  if (meetingTypeStr.includes('demo')) typeKey = 'demo';
  else if (meetingTypeStr.includes('follow-up') || meetingTypeStr.includes('follow up')) typeKey = 'follow_up';
  else if (meetingTypeStr.includes('proposal')) typeKey = 'proposal_discussion';
  else if (meetingTypeStr.includes('closing')) typeKey = 'closing_discussion';
  else if (meetingTypeStr.includes('handover')) typeKey = 'handover_to_csm';

  // Safe extraction of all fields
  const general = transcript.general_sections_json || {};
  const detailed = transcript.detailed_insights_json || {};
  const conclusion = transcript.conclusion_section_json || {};
  const meetingSpecific = transcript.meeting_type_sections_json || {};
  
  const sentiment = general.overall_sentiment || general.sentiment_analysis || { positive: 0, neutral: 0, negative: 0 };

  // --- Dynamic configurations based on typeKey ---

  // 1. Four Cards Config
  let fourCardsConfig = [];
  if (typeKey === 'demo') {
    fourCardsConfig = [
      { title: 'FEATURES DEMONSTRATED', icon: <Layers className="w-4 h-4 text-blue-500" />, data: meetingSpecific.features_demonstrated || [], color: 'bg-blue-400' },
      { title: 'CUSTOMER REACTIONS', icon: <MessageSquare className="w-4 h-4 text-emerald-500" />, data: meetingSpecific.customer_reactions || [], color: 'bg-emerald-400' },
      { title: 'QUESTIONS & OBJECTIONS', icon: <AlertTriangle className="w-4 h-4 text-orange-500" />, data: meetingSpecific.questions_objections || [], color: 'bg-orange-400' },
      { title: 'KEY TAKEAWAYS', icon: <ThumbsUp className="w-4 h-4 text-purple-500" />, data: meetingSpecific.key_takeaways || [], color: 'bg-purple-400' }
    ];
  } else if (typeKey === 'follow_up') {
    fourCardsConfig = [
      { title: 'PREVIOUS COMMITMENTS', icon: <FileText className="w-4 h-4 text-slate-500" />, data: meetingSpecific.previous_commitments || [], color: 'bg-slate-400' },
      { title: 'COMPLETED ITEMS', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, data: meetingSpecific.completed_items || [], color: 'bg-emerald-400' },
      { title: 'PENDING ISSUES', icon: <AlertTriangle className="w-4 h-4 text-orange-500" />, data: meetingSpecific.pending_issues || [], color: 'bg-orange-400' },
      { title: 'UPDATED DECISIONS', icon: <ThumbsUp className="w-4 h-4 text-blue-500" />, data: meetingSpecific.updated_decisions || [], color: 'bg-blue-400' }
    ];
  } else if (typeKey === 'proposal_discussion') {
    fourCardsConfig = [
      { title: 'SCOPE DISCUSSION', icon: <Target className="w-4 h-4 text-blue-500" />, data: meetingSpecific.scope_discussion || [], color: 'bg-blue-400' },
      { title: 'COMMERCIAL FEEDBACK', icon: <Briefcase className="w-4 h-4 text-emerald-500" />, data: meetingSpecific.commercial_feedback || [], color: 'bg-emerald-400' },
      { title: 'NEGOTIATION POINTS', icon: <MessageSquare className="w-4 h-4 text-orange-500" />, data: meetingSpecific.negotiation_points || [], color: 'bg-orange-400' },
      { title: 'AGREEMENTS & PENDING', icon: <CheckCircle2 className="w-4 h-4 text-purple-500" />, data: meetingSpecific.agreements_pending || [], color: 'bg-purple-400' }
    ];
  } else if (typeKey === 'closing_discussion') {
    fourCardsConfig = [
      { title: 'FINAL OBJECTIONS', icon: <AlertTriangle className="w-4 h-4 text-red-500" />, data: meetingSpecific.final_objections || [], color: 'bg-red-400' },
      { title: 'DECISION STATUS', icon: <Activity className="w-4 h-4 text-blue-500" />, data: meetingSpecific.decision_status || [], color: 'bg-blue-400' },
      { title: 'COMMERCIAL READINESS', icon: <Briefcase className="w-4 h-4 text-emerald-500" />, data: meetingSpecific.commercial_readiness || [], color: 'bg-emerald-400' },
      { title: 'CLOSING AGREEMENTS', icon: <CheckCircle2 className="w-4 h-4 text-purple-500" />, data: meetingSpecific.closing_agreements || [], color: 'bg-purple-400' }
    ];
  } else if (typeKey === 'handover_to_csm') {
    fourCardsConfig = [
      { title: 'CUSTOMER PROFILE', icon: <Users className="w-4 h-4 text-blue-500" />, data: meetingSpecific.customer_profile || [], color: 'bg-blue-400' },
      { title: 'PURCHASED SCOPE', icon: <Layers className="w-4 h-4 text-emerald-500" />, data: meetingSpecific.purchased_scope || [], color: 'bg-emerald-400' },
      { title: 'KEY STAKEHOLDERS', icon: <Users className="w-4 h-4 text-purple-500" />, data: meetingSpecific.key_stakeholders || [], color: 'bg-purple-400' },
      { title: 'RISKS & OPEN ITEMS', icon: <AlertTriangle className="w-4 h-4 text-orange-500" />, data: meetingSpecific.risks_open_items || [], color: 'bg-orange-400' }
    ];
  } else {
    fourCardsConfig = [
      { title: 'KEY PAIN POINTS', icon: <AlertTriangle className="w-4 h-4 text-red-500" />, data: general.key_pain_points || [], color: 'bg-red-400' },
      { title: 'CUSTOMER NEEDS', icon: <Target className="w-4 h-4 text-blue-500" />, data: general.customer_needs || [], color: 'bg-blue-400' },
      { title: 'KEY DISCUSSIONS', icon: <MessageSquare className="w-4 h-4 text-emerald-500" />, data: general.key_discussions || [], color: 'bg-emerald-400' },
      { title: 'DECISIONS & AGREEMENTS', icon: <ThumbsUp className="w-4 h-4 text-orange-500" />, data: general.decisions_agreements || general.decisions || [], color: 'bg-orange-400' }
    ];
  }

  // 2. Table Config
  let tableConfig = { title: 'TOPICS DISCUSSED', headers: ['Topik', 'Ringkasan', 'Relevansi'], data: detailed.topics_discussed || [], keys: ['topik', 'ringkasan', 'relevansi'] };
  if (typeKey === 'demo') {
    tableConfig = { title: 'DEMO HIGHLIGHTS', headers: ['Feature', 'Summary', 'Interest Level'], data: detailed.demo_highlights || [], keys: ['feature', 'summary', 'interest_level'] };
  } else if (typeKey === 'follow_up') {
    tableConfig = { title: 'PROGRESS REVIEW', headers: ['Topic', 'Current Update', 'Progress'], data: detailed.progress_review || [], keys: ['topic', 'current_update', 'progress'] };
  } else if (typeKey === 'proposal_discussion') {
    tableConfig = { title: 'PROPOSAL REVIEW', headers: ['Topic', 'Summary', 'Alignment'], data: detailed.proposal_review || [], keys: ['topic', 'summary', 'alignment'] };
  } else if (typeKey === 'closing_discussion') {
    tableConfig = { title: 'CLOSING REVIEW', headers: ['Topic', 'Summary', 'Readiness'], data: detailed.closing_review || [], keys: ['topic', 'summary', 'readiness'] };
  } else if (typeKey === 'handover_to_csm') {
    tableConfig = { title: 'HANDOVER CHECKLIST', headers: ['Topic', 'Summary', 'Completeness'], data: detailed.handover_checklist || [], keys: ['topic', 'summary', 'completeness'] };
  }

  // 3. Chart Config (Radar or Donut for Follow Up)
  let chartConfig: any = { type: 'radar', title: 'BUYING SIGNALS RADAR', categories: [], data: [] };
  
  if (typeKey === 'demo') {
    const r = detailed.feature_interest_radar || {};
    chartConfig = {
      type: 'radar', title: 'FEATURE INTEREST RADAR',
      categories: ['Workflow', 'Kolaboratif', 'Lark Base', 'Integrasi', 'Dashboard', 'Keamanan'],
      data: [r.workflow_approval||0, r.dokumen_kolaboratif||0, r.lark_base||0, r.messenger_integrasi||0, r.dashboard_laporan||0, r.keamanan_akses||0]
    };
  } else if (typeKey === 'follow_up') {
    const c = detailed.open_vs_completed || { total: 0, completed: 0, pending: 0, on_track: 0 };
    chartConfig = {
      type: 'donut', title: 'OPEN VS COMPLETED FOLLOW-UPS',
      labels: ['Completed', 'On Track', 'Pending'],
      data: [c.completed||0, c.on_track||0, c.pending||0]
    };
  } else if (typeKey === 'proposal_discussion') {
    const r = detailed.proposal_alignment_radar || {};
    chartConfig = {
      type: 'radar', title: 'PROPOSAL ALIGNMENT RADAR',
      categories: ['Scope Fit', 'Price', 'Timeline', 'Tech Fit', 'Readiness'],
      data: [(r.scope_fit||0)/20, (r.price_acceptance||0)/20, (r.timeline_alignment||0)/20, (r.technical_fit||0)/20, (r.decision_readiness||0)/20] // scaling 0-100 to 0-5
    };
  } else if (typeKey === 'closing_discussion') {
    const r = detailed.deal_readiness_radar || {};
    chartConfig = {
      type: 'radar', title: 'DEAL READINESS RADAR',
      categories: ['Objection', 'Budget', 'Contract', 'Timeline', 'Competitive', 'DM Support'],
      data: [r.objection_status||0, r.budget_approval||0, r.contract_readiness||0, r.timeline_commitment||0, r.competitive_position||0, r.decision_maker_support||0]
    };
  } else if (typeKey === 'handover_to_csm') {
    const r = detailed.onboarding_readiness_radar || {};
    chartConfig = {
      type: 'radar', title: 'ONBOARDING READINESS',
      categories: ['Contract', 'Scope', 'Stakeholder', 'Success Crit', 'Risk Info', 'Milestone'],
      data: [r.contract_info||0, r.scope_clarity||0, r.stakeholder_mapping||0, r.success_criteria||0, r.risk_information||0, r.next_milestone||0]
    };
  } else {
    // Default Discovery
    const r = detailed.buying_signals_radar || {};
    chartConfig = {
      type: 'radar', title: 'BUYING SIGNALS RADAR',
      categories: ['Kebutuhan', 'Urgensi', 'Budget', 'Support', 'Solusi Fit', 'Niat'],
      data: [r.kebutuhan||0, r.urgensi||0, r.budget_kesiapan||0, r.decision_support||0, r.solusi_fit||0, r.niat_implementasi||0]
    };
  }

  // 4. Conclusion Config
  let conclusionFields = [];
  if (typeKey === 'demo') {
    conclusionFields = [
      { label: 'Next Step', val: conclusion.next_step, icon: <Activity className="w-4 h-4" /> },
      { label: 'Trial / POC Potensial', val: conclusion.trial_poc_potensial, icon: <Layers className="w-4 h-4" /> },
      { label: 'Decision Timeline', val: conclusion.decision_timeline, icon: <Calendar className="w-5 h-5" /> }
    ];
  } else if (typeKey === 'follow_up') {
    conclusionFields = [
      { label: 'Next Step', val: conclusion.next_step, icon: <Activity className="w-4 h-4" /> },
      { label: 'Blockers', val: conclusion.blockers, icon: <AlertTriangle className="w-4 h-4" /> },
      { label: 'Revised Timeline', val: conclusion.revised_timeline, icon: <Calendar className="w-5 h-5" /> }
    ];
  } else if (typeKey === 'proposal_discussion') {
    conclusionFields = [
      { label: 'Next Step', val: conclusion.next_step, icon: <Activity className="w-4 h-4" /> },
      { label: 'Expected Revision', val: conclusion.expected_revision, icon: <FileText className="w-4 h-4" /> },
      { label: 'Approval Path', val: conclusion.approval_path, icon: <Hexagon className="w-4 h-4" /> }
    ];
  } else if (typeKey === 'closing_discussion') {
    conclusionFields = [
      { label: 'Next Step', val: conclusion.next_step, icon: <Activity className="w-4 h-4" /> },
      { label: 'Target Close Date', val: conclusion.target_close_date, icon: <Calendar className="w-5 h-5" /> },
      { label: 'Key Risk', val: conclusion.key_risk, icon: <AlertTriangle className="w-4 h-4" /> }
    ];
  } else if (typeKey === 'handover_to_csm') {
    conclusionFields = [
      { label: 'Next Step', val: conclusion.next_step, icon: <Activity className="w-4 h-4" /> },
      { label: 'Success Goal', val: conclusion.customer_success_goal, icon: <Target className="w-4 h-4" /> },
      { label: 'First Milestone', val: conclusion.first_milestone, icon: <Calendar className="w-5 h-5" /> }
    ];
  } else {
    // Default Discovery
    conclusionFields = [
      { label: 'Next Step', val: conclusion.next_step, icon: <Activity className="w-4 h-4" /> },
      { label: 'Expected Outcome', val: conclusion.expected_outcome, icon: <Hexagon className="w-4 h-4" /> },
      { label: 'Target Implementation', val: conclusion.target_implementation, icon: <Calendar className="w-5 h-5" /> }
    ];
  }

  // --- Chart Setup ---
  const donutOptions = {
    chart: { type: 'donut', background: 'transparent' },
    colors: ['#10B981', '#F59E0B', '#EF4444'],
    labels: ['Positive', 'Neutral', 'Negative'],
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: { show: false },
            value: {
              show: true,
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#10B981',
              formatter: () => `${sentiment.positive}%`
            }
          }
        }
      }
    },
    stroke: { width: 0 },
    legend: { show: false },
  };
  const donutSeries = [sentiment.positive, sentiment.neutral, sentiment.negative];

  const radarOptions = {
    chart: { type: 'radar', toolbar: { show: false }, background: 'transparent' },
    xaxis: {
      categories: chartConfig.categories,
      labels: { style: { colors: ['#475569', '#475569', '#475569', '#475569', '#475569', '#475569'], fontSize: '11px', fontWeight: 600 } }
    },
    yaxis: { show: false, min: 0, max: 5 },
    plotOptions: { radar: { polygons: { strokeColors: '#e2e8f0', connectorColors: '#e2e8f0' } } },
    stroke: { width: 2, colors: ['#3b82f6'] },
    fill: { opacity: 0.2, colors: ['#3b82f6'] },
    markers: { size: 4, colors: ['#3b82f6'], strokeColors: '#fff', strokeWidth: 2 }
  };

  const followUpDonutOptions = {
    chart: { type: 'donut', background: 'transparent' },
    colors: ['#10B981', '#3b82f6', '#F59E0B'],
    labels: chartConfig.labels || [],
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true, name: { show: false },
            value: { show: true, fontSize: '24px', fontWeight: 'bold', color: '#10B981' }
          }
        }
      }
    },
    stroke: { width: 0 },
    legend: { show: false },
  };

  const handleExport = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const node = reportRef.current;
      const dataUrl = await toPng(node, { 
        pixelRatio: 2,
        width: node.offsetWidth,
        height: node.offsetHeight,
        style: {
          margin: '0',
          transform: 'scale(1)'
        }
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Meeting_Summary_${lead?.company_name?.replace(/\s+/g, '_') || 'Report'}.png`;
      a.click();
    } catch (e) {
      console.error('Failed to export image', e);
    } finally {
      setIsExporting(false);
    }
  };

  const getBadgeColor = (val: string) => {
    const v = (val || '').toLowerCase();
    if (v === 'high' || v === 'tinggi' || v === 'selaras' || v === 'done' || v === 'completed') return 'border-green-500 text-green-600 bg-green-50';
    if (v === 'medium' || v === 'sedang' || v === 'cukup selaras' || v === 'in progress' || v === 'on track') return 'border-amber-500 text-amber-600 bg-amber-50';
    if (v === 'low' || v === 'rendah' || v === 'kurang selaras' || v === 'open' || v === 'tertunda') return 'border-red-400 text-red-500 bg-red-50';
    if (v === 'negosiasi') return 'border-purple-400 text-purple-600 bg-purple-50';
    return 'border-slate-200 text-slate-500 bg-white';
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-50 p-6 min-h-screen">
      {/* Action Bar */}
      <div className="flex justify-end mb-4 max-w-[1200px] mx-auto">
        <button 
          onClick={handleExport} 
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg shadow transition-colors"
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isExporting ? 'Exporting...' : 'Export to Image'}
        </button>
      </div>

      {/* Main Report Container */}
      <div ref={reportRef} className="bg-white dark:bg-white text-slate-800 dark:text-slate-800 text-sm rounded-2xl shadow-xl overflow-hidden border max-w-[1200px] mx-auto pb-0">
        
        {/* Header */}
        <div className="px-10 py-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sparkles className="h-10 w-10 text-indigo-500" />
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight uppercase">MEETING SUMMARY</h1>
              <p className="text-slate-500 font-medium text-sm mt-0.5">AI-Powered Summary by Leadsy</p>
            </div>
          </div>
          <Badge variant="brand" className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-1.5 rounded-lg shadow-sm text-sm font-bold border-0 uppercase">
            <Sparkles className="w-4 h-4 mr-2" /> AI SUMMARY: {meetingTypeStr}
          </Badge>
        </div>

        {/* Metadata Row */}
        <div className="px-10 py-6 grid grid-cols-6 gap-6 bg-slate-50 border-y border-slate-100">
          <div className="flex items-start gap-3">
            <Presentation className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Meeting Type</p>
              <p className="font-semibold text-slate-900 capitalize">{meetingTypeStr}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Layers className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Product</p>
              <p className="font-semibold text-slate-900">{lead?.product_name || 'LarkSuite'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Building2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Company</p>
              <p className="font-semibold text-slate-900">{lead?.company_name || 'Unknown'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-6 h-6 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Date & Time</p>
              <p className="font-semibold text-slate-900">{transcript.recorded_at ? new Date(transcript.recorded_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'}) : '-'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Duration</p>
              <p className="font-semibold text-slate-900">1 Jam</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Users className="w-6 h-6 text-purple-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Participants</p>
              <p className="font-semibold text-slate-900 leading-tight">
                {lead?.contacts?.[0]?.name || 'Unknown'}<br/>
                <span className="text-[10px] font-normal text-slate-500">({lead?.contacts?.[0]?.job_title || 'Client'})</span>
              </p>
            </div>
          </div>
        </div>

        <div className="p-10 space-y-10">
          
          {/* Section 1: Exec Summary & Sentiment */}
          <div className="grid grid-cols-3 gap-8">
            <Card className="col-span-2 shadow-none border border-slate-200 bg-white rounded-xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-slate-800 tracking-tight uppercase text-sm">EXECUTIVE SUMMARY</h3>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {general.executive_summary || 'No summary available.'}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-none border border-slate-200 bg-white rounded-xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-blue-100 p-1 rounded-full"><Activity className="w-3.5 h-3.5 text-blue-600" /></div>
                  <h3 className="font-bold text-slate-800 tracking-tight uppercase text-sm">OVERALL SENTIMENT</h3>
                </div>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="w-28 h-28 relative flex items-center justify-center -ml-3">
                    <Chart options={donutOptions as any} series={donutSeries} type="donut" height={120} width={120} />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-bold text-emerald-500 text-center">Positive</div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Positive
                      </div>
                      <span className="font-bold text-slate-800">{sentiment.positive}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div> Neutral
                      </div>
                      <span className="font-bold text-slate-800">{sentiment.neutral}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div> Negative
                      </div>
                      <span className="font-bold text-slate-800">{sentiment.negative}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 2: 4 Grid */}
          <div className="grid grid-cols-4 gap-6">
            {fourCardsConfig.map((card, idx) => (
              <Card key={idx} className="shadow-none border border-slate-200 bg-white rounded-xl overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    {card.icon}
                    <h3 className="font-bold text-slate-800 uppercase tracking-tight text-xs">{card.title}</h3>
                  </div>
                  <ul className="space-y-3">
                    {(card.data || []).map((pt: any, i: number) => {
                      let textToShow = '';
                      if (pt && typeof pt === 'object') {
                        if (pt.use_case) {
                          textToShow = `${pt.use_case} (${pt.priority || 'Medium'}): ${pt.description || ''}`;
                        } else {
                          textToShow = JSON.stringify(pt);
                        }
                      } else {
                        textToShow = String(pt || '');
                      }
                      return (
                        <li key={i} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${card.color}`}></span>
                          {textToShow}
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Section Divider */}
          <div className="flex items-center gap-4 bg-slate-50 -mx-10 px-10 py-4 border-y border-slate-100">
            <Badge className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-3 font-bold text-xs border-0">PAGE 2</Badge>
            <h2 className="font-extrabold text-slate-800 tracking-wide text-sm uppercase">DETAILED INSIGHTS & ACTION PLAN</h2>
          </div>

          {/* Section 3: Tables & Chart */}
          <div className="grid grid-cols-2 gap-8">
            <Card className="shadow-none border border-slate-200 bg-white rounded-xl overflow-hidden">
              <CardContent className="p-0">
                <div className="p-5 flex items-center gap-2 border-b">
                  <LayoutList className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-800 tracking-tight uppercase text-sm">{tableConfig.title}</h3>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50/50">
                      <th className="py-3 px-5 text-[10px] font-bold text-slate-800 uppercase tracking-wider w-[28%]">{tableConfig.headers[0]}</th>
                      <th className="py-3 px-5 text-[10px] font-bold text-slate-800 uppercase tracking-wider">{tableConfig.headers[1]}</th>
                      <th className="py-3 px-5 text-[10px] font-bold text-slate-800 uppercase tracking-wider text-center w-[20%]">{tableConfig.headers[2]}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableConfig.data.map((t: any, i: number) => {
                      const val3 = t[tableConfig.keys[2]]?.toString();
                      return (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-4 px-5 text-xs font-semibold text-slate-700 align-top">
                            <div className="flex gap-2.5 items-start">
                               <div className="bg-blue-50 p-1.5 rounded text-blue-500 shrink-0"><FileText className="w-3.5 h-3.5" /></div>
                               <span className="mt-0.5">{t[tableConfig.keys[0]]}</span>
                            </div>
                          </td>
                          <td className="py-4 px-5 text-xs text-slate-600 align-top leading-relaxed">{t[tableConfig.keys[1]]}</td>
                          <td className="py-4 px-5 text-xs align-top text-center">
                            {val3 && (
                               <Badge variant="outline" className={`px-3 py-1 font-bold ${getBadgeColor(val3)}`}>
                                 {val3}
                               </Badge>
                            )}
                            {typeKey === 'follow_up' && !val3 && (
                               <Badge variant="outline" className="px-3 py-1 font-bold border-blue-500 text-blue-600">{t.progress || 0}%</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="shadow-none border border-slate-200 bg-white rounded-xl overflow-hidden">
              <CardContent className="p-0 flex flex-col h-full">
                <div className="p-5 flex items-center gap-2 border-b">
                  {chartConfig.type === 'radar' ? <Target className="w-5 h-5 text-blue-600" /> : <PieChart className="w-5 h-5 text-blue-600" />}
                  <h3 className="font-bold text-slate-800 tracking-tight uppercase text-sm">{chartConfig.title}</h3>
                </div>
                <div className="flex-1 flex items-center justify-between px-8 relative py-8">
                  <div className="w-full flex-1 relative flex justify-center">
                    {chartConfig.type === 'radar' ? (
                      <Chart options={radarOptions as any} series={[{ name: 'Score', data: chartConfig.data }]} type="radar" height={320} />
                    ) : (
                      <Chart options={followUpDonutOptions as any} series={chartConfig.data} type="donut" height={260} />
                    )}
                  </div>
                  {chartConfig.type === 'radar' && (
                    <div className="w-40 text-xs pl-4 border-l border-slate-100">
                       <p className="font-bold text-slate-800 mb-2">Skala (0-5)</p>
                       <ul className="space-y-1.5 text-slate-600">
                         <li>5 = Sangat Tinggi</li>
                         <li>4 = Tinggi</li>
                         <li>3 = Sedang</li>
                         <li>2 = Rendah</li>
                         <li>1 = Sangat Rendah</li>
                       </ul>
                    </div>
                  )}
                  {chartConfig.type === 'donut' && (
                    <div className="w-40 text-xs pl-4 border-l border-slate-100 space-y-4">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-slate-600 font-semibold"><div className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></div> Completed</div>
                         <span className="font-bold">{chartConfig.data[0]}</span>
                       </div>
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-slate-600 font-semibold"><div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></div> On Track</div>
                         <span className="font-bold">{chartConfig.data[1]}</span>
                       </div>
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-slate-600 font-semibold"><div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></div> Pending</div>
                         <span className="font-bold">{chartConfig.data[2]}</span>
                       </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 4: Action Items & Conclusion */}
          <div className="grid grid-cols-2 gap-8 pb-4">
            <Card className="shadow-none border border-slate-200 bg-white rounded-xl overflow-hidden">
              <CardContent className="p-0">
                <div className="p-5 flex items-center gap-2 border-b">
                  <div className="bg-purple-100 p-1 rounded-sm"><CheckSquare className="w-4 h-4 text-purple-600" /></div>
                  <h3 className="font-bold text-slate-800 tracking-tight uppercase text-sm">ACTION ITEMS</h3>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50/50">
                      <th className="py-3 px-5 text-[10px] font-bold text-slate-800 uppercase tracking-wider w-10">No</th>
                      <th className="py-3 px-5 text-[10px] font-bold text-slate-800 uppercase tracking-wider">Action Item</th>
                      <th className="py-3 px-5 text-[10px] font-bold text-slate-800 uppercase tracking-wider">PIC</th>
                      <th className="py-3 px-5 text-[10px] font-bold text-slate-800 uppercase tracking-wider">Due Date</th>
                      <th className="py-3 px-5 text-[10px] font-bold text-slate-800 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(detailed.action_items || []).map((t: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-3 px-5 text-xs font-semibold text-slate-500">{t.no || i + 1}</td>
                        <td className="py-3 px-5 text-xs text-slate-700">{t.item}</td>
                        <td className="py-3 px-5 text-xs text-slate-600">{t.pic}</td>
                        <td className="py-3 px-5 text-xs text-slate-600">{t.due_date}</td>
                        <td className="py-3 px-5 text-xs">
                          <Badge className={`shadow-none font-bold px-3 py-1 ${getBadgeColor(t.status)}`}>
                            {t.status || 'Open'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="shadow-none border border-emerald-200 bg-white rounded-xl overflow-hidden flex flex-col h-full">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-emerald-500 text-white p-1 rounded-full shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 tracking-tight uppercase text-sm">CONCLUSION</h3>
                </div>
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-slate-600 leading-relaxed text-xs font-medium mb-6">
                  {conclusion.conclusion || 'No conclusion available.'}
                </div>
                
                <div className="mt-auto grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  {conclusionFields.map((cf, idx) => (
                    <div key={idx} className={`flex flex-col gap-2 ${idx > 0 ? 'border-l border-slate-100 pl-4' : ''}`}>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{cf.label}</span>
                      <div className="flex gap-2 items-start text-slate-800 font-bold text-xs">
                        <div className="bg-blue-600 text-white p-1 rounded shrink-0 mt-0.5">{cf.icon}</div>
                        <span>{cf.val || '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
        </div>

        {/* Footer */}
        <div className="px-10 py-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-indigo-600">
            <Sparkles className="w-4 h-4" /> Leadsy 
            <span className="text-slate-400 font-normal ml-2">AI-Powered Sales & CRM</span>
          </div>
          <div className="text-slate-400 font-medium">
            Generated by Leadsy AI &bull; {transcript.recorded_at ? new Date(transcript.recorded_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'}) : '-'}
          </div>
        </div>

      </div>
    </div>
  );
}

function CheckSquare(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
