"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import {
  Incident, AnalysisResult, SimilarIncident, RCAResult, ReportResult,
} from "@/types/incident";
import {
  analyzeIncident, generateReport, getIncidentById,
  getSimilarIncidents, runRCA, updateIncidentStatus,
} from "@/services/incidentsService";
import { useIncidents } from "@/context/IncidentsContext";
import { useAuth } from "@/context/AuthContext";
import SeverityBadge from "@/components/SeverityBadge";
import StatusBadge from "@/components/StatusBadge";
import TopBar from "@/components/TopBar";
import { downloadReportAsPDF } from "@/lib/pdfReport";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-indigo-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-slate-700 tabular-nums w-10 text-right">{pct}%</span>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200 mb-4">
      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}

function PulseSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 bg-slate-100 rounded-full ${i === 0 ? "w-full" : i === 1 ? "w-5/6" : "w-4/6"}`} />
      ))}
    </div>
  );
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-white border border-slate-200 shadow-sm p-6 ${className}`}>
      {children}
    </div>
  );
}

// ── Pipeline stepper ──────────────────────────────────────────────────────────
type StepState = "idle" | "active" | "done" | "error";

function PipelineStepper({ step, hasError }: { step: number; hasError: boolean }) {
  const steps = [
    { label: "Log Analysis",       sub: "Agent 1",     icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" },
    { label: "Similar Incidents",  sub: "pgvector",    icon: "M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
    { label: "Root Cause Analysis",sub: "Agents 2 & 3", icon: "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" },
    { label: "Resolution",         sub: "Agent 3",     icon: "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" },
    { label: "Post-Mortem Report", sub: "Agent 4",     icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
  ];

  function getState(i: number): StepState {
    const idx = i + 1;
    if (hasError && step === idx) return "error";
    if (step > idx) return "done";
    if (step === idx) return "active";
    return "idle";
  }

  return (
    <div className="flex items-start gap-0 w-full">
      {steps.map((s, i) => {
        const state = getState(i);
        return (
          <div key={i} className="flex items-start flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                state === "done"   ? "bg-indigo-600 border-indigo-600 text-white" :
                state === "active" ? "bg-indigo-50 border-indigo-500 text-indigo-700" :
                state === "error"  ? "bg-red-50 border-red-400 text-red-600" :
                                     "bg-slate-100 border-slate-200 text-slate-400"
              }`}>
                {state === "done" ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : state === "active" ? (
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                  </svg>
                )}
              </div>
              <p className={`text-xs mt-1.5 font-medium text-center leading-tight max-w-[72px] ${
                state === "done" ? "text-indigo-600" :
                state === "active" ? "text-indigo-700" :
                state === "error" ? "text-red-500" : "text-slate-400"
              }`}>{s.label}</p>
              <p className="text-xs text-slate-400 text-center">{s.sub}</p>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mt-4 rounded-full transition-all ${
                step > i + 1 ? "bg-indigo-400" : "bg-slate-200"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Status toggle ─────────────────────────────────────────────────────────────
const STATUS_FLOW = [
  { value: "OPEN",        next: "IN_PROGRESS", color: "bg-blue-600 hover:bg-blue-700" },
  { value: "IN_PROGRESS", next: "RESOLVED",    color: "bg-violet-600 hover:bg-violet-700" },
  { value: "RESOLVED",    next: "OPEN",        color: "bg-emerald-600 hover:bg-emerald-700" },
];

function StatusToggle({ currentStatus, onUpdate }: { currentStatus: string; onUpdate: (s: string) => Promise<void> }) {
  const [updating, setUpdating] = useState(false);
  const cfg = STATUS_FLOW.find((s) => s.value === currentStatus) ?? STATUS_FLOW[0];

  return (
    <button
      onClick={async () => { if (updating) return; setUpdating(true); try { await onUpdate(cfg.next); } finally { setUpdating(false); } }}
      disabled={updating}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-60 ${cfg.color}`}
    >
      {updating ? <Spinner /> : null}
      {updating ? "Updating…" : `Mark ${cfg.next.replace("_", " ")}`}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { updateIncident } = useIncidents();
  const { profile } = useAuth();

  const [incident, setIncident]             = useState<Incident | null>(null);
  const [loadingIncident, setLoadingIncident] = useState(true);
  const [notFound, setNotFound]             = useState(false);

  const [analysis, setAnalysis]             = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing]           = useState(false);
  const [analyzeError, setAnalyzeError]     = useState<string | null>(null);

  const [similarIncidents, setSimilarIncidents] = useState<SimilarIncident[]>([]);
  const [loadingSimilar, setLoadingSimilar]     = useState(false);

  const [rcaResult, setRcaResult]           = useState<RCAResult | null>(null);
  const [runningRca, setRunningRca]         = useState(false);
  const [rcaError, setRcaError]             = useState<string | null>(null);

  const [reportResult, setReportResult]     = useState<ReportResult | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError]       = useState<string | null>(null);

  const [runningPipeline, setRunningPipeline] = useState(false);
  const [pipelineStep, setPipelineStep]       = useState<number>(0);
  const [pipelineError, setPipelineError]     = useState<string | null>(null);

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Load incident
  useEffect(() => {
    if (!incidentId) return;
    setLoadingIncident(true);
    getIncidentById(incidentId)
      .then((inc) => {
        if (!inc) { setNotFound(true); return; }
        setIncident(inc);
        setAnalysis(inc.ai_summary ?? null);
        setRcaResult(inc.rca_result ?? null);
        setReportResult(inc.report_result ?? null);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingIncident(false));
  }, [incidentId]);

  async function handleStatusUpdate(newStatus: string) {
    if (!incidentId) return;
    const updated = await updateIncidentStatus(incidentId, newStatus as import("@/types/incident").Status);
    setIncident((prev) => prev ? { ...prev, status: updated.status } : prev);
    updateIncident({ ...updated } as Incident);
  }

  async function handleAnalyze() {
    if (!incidentId || analyzing) return;
    setAnalyzing(true); setAnalyzeError(null);
    try {
      const result = await analyzeIncident(incidentId);
      setAnalysis(result);
      setIncident((prev) => prev ? { ...prev, ai_summary: result } : prev);
      setLoadingSimilar(true);
      try { const res = await getSimilarIncidents(incidentId); setSimilarIncidents(res.similar); } catch { /**/ }
      finally { setLoadingSimilar(false); }
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis failed.");
    } finally { setAnalyzing(false); }
  }

  async function handleRunRca() {
    if (!incidentId || runningRca) return;
    setRunningRca(true); setRcaError(null);
    try {
      const result = await runRCA(incidentId);
      setRcaResult(result);
      setIncident((prev) => prev ? { ...prev, rca_result: result } : prev);
    } catch (err) {
      setRcaError(err instanceof Error ? err.message : "RCA pipeline failed.");
    } finally { setRunningRca(false); }
  }

  async function handleGenerateReport() {
    if (!incidentId || generatingReport) return;
    setGeneratingReport(true); setReportError(null);
    const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    try {
      if (!analysis) { const r = await analyzeIncident(incidentId); setAnalysis(r); setIncident((p) => p ? { ...p, ai_summary: r } : p); await pause(3000); }
      if (!rcaResult) { const r = await runRCA(incidentId); setRcaResult(r); setIncident((p) => p ? { ...p, rca_result: r } : p); await pause(3000); }
      const result = await generateReport(incidentId);
      setReportResult(result);
      setIncident((prev) => prev ? { ...prev, report_result: result } : prev);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Report generation failed.");
    } finally { setGeneratingReport(false); }
  }

  async function handleRunFullPipeline() {
    if (!incidentId || runningPipeline) return;
    setRunningPipeline(true); setPipelineError(null);
    const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    try {
      setPipelineStep(1);
      const a = await analyzeIncident(incidentId);
      setAnalysis(a); setIncident((p) => p ? { ...p, ai_summary: a } : p);
      setPipelineStep(2);
      getSimilarIncidents(incidentId).then((r) => setSimilarIncidents(r.similar)).catch(() => {/**/});
      await pause(4000);
      setPipelineStep(3);
      const r = await runRCA(incidentId);
      setRcaResult(r); setIncident((p) => p ? { ...p, rca_result: r } : p);
      await pause(4000);
      setPipelineStep(4);
      const rep = await generateReport(incidentId);
      setReportResult(rep); setIncident((p) => p ? { ...p, report_result: rep } : p);
      setPipelineStep(5);
      await pause(500);
      setPipelineStep(0);
    } catch (err) {
      setPipelineError(err instanceof Error ? err.message : "Pipeline failed.");
      setPipelineStep(0);
    } finally { setRunningPipeline(false); }
  }

  async function handleDownloadPdf() {
    if (!incident || !reportResult || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await downloadReportAsPDF(reportResult, {
        incidentId: incident.incident_id ?? incident.id,
        title: incident.title,
        service: incident.service,
        severity: incident.severity,
        status: incident.status,
        createdAt: incident.created_at,
        organizationName: profile?.organization?.name,
      });
    } finally {
      setDownloadingPdf(false);
    }
  }

  // ── Loading / not found ────────────────────────────────────────────────────
  if (loadingIncident) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-slate-400">Loading incident…</p>
        </div>
      </div>
    );
  }

  if (notFound || !incident) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopBar />
        <main className="max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-slate-500 text-sm">
            Incident <span className="font-mono font-medium">{incidentId}</span> was not found.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
            Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  const pipelineComplete = !!analysis && !!rcaResult && !!reportResult;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar
        actions={
          <button
            onClick={handleRunFullPipeline}
            disabled={runningPipeline}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {runningPipeline ? <><Spinner /><span>Running pipeline…</span></> : (
              <>{pipelineComplete ? "Re-run Full Pipeline" : "Run Full Pipeline"}</>
            )}
          </button>
        }
      />

      {/* Pipeline progress under top bar */}
      {runningPipeline && (
        <div className="bg-white border-b border-slate-100 px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <PipelineStepper step={pipelineStep} hasError={false} />
          </div>
        </div>
      )}

      {pipelineError && (
        <div className="bg-red-50 border-b border-red-100 px-6 py-2">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs text-red-700"><span className="font-semibold">Pipeline error:</span> {pipelineError}</p>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
          <span className="text-slate-300">/</span>
          <span className="font-mono font-medium text-slate-700">{incident.incident_id}</span>
        </div>

        {/* Hero card */}
        <SectionCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs font-medium text-indigo-400 mb-1">{incident.incident_id}</p>
              <h1 className="text-xl font-semibold text-slate-900 leading-snug">{incident.title}</h1>
              <p className="mt-1 text-sm text-slate-500">{incident.service}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <SeverityBadge severity={incident.severity} size="md" />
              <StatusBadge status={incident.status} size="md" />
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Incident ID</p>
              <p className="font-mono text-slate-700">{incident.incident_id}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Service</p>
              <p className="text-slate-700">{incident.service}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Organization</p>
              <p className="text-slate-700">{profile?.organization?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Created</p>
              <p className="text-slate-700">{formatDate(incident.created_at)}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">Update status</p>
            <StatusToggle currentStatus={incident.status} onUpdate={handleStatusUpdate} />
          </div>
        </SectionCard>

        {/* Incident overview */}
        <SectionCard>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Incident Overview</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{incident.description}</p>
        </SectionCard>

        {/* Raw logs */}
        <SectionCard>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Raw Logs</h2>
            {incident.logs && (
              <span className="text-xs text-slate-400">{incident.logs.split("\n").length} lines</span>
            )}
          </div>
          {incident.logs ? (
            <div className="rounded-lg bg-slate-950 overflow-auto max-h-64 ring-1 ring-slate-800">
              <pre className="p-4 text-xs leading-relaxed text-slate-200 font-mono whitespace-pre">{incident.logs}</pre>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No logs attached.</p>
          )}
        </SectionCard>

        {/* AI Analysis */}
        <SectionCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">AI Analysis</h2>
              <p className="text-xs text-slate-400 mt-0.5">Agent 1 — log pattern extraction</p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || runningPipeline}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {analyzing ? <><Spinner /> Analyzing…</> : "Analyze Incident"}
            </button>
          </div>
          {analyzeError && <ErrorBanner message={analyzeError} />}
          {analyzing && <PulseSkeleton />}
          {analysis && !analyzing && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Summary</p>
                <p className="text-sm text-slate-700 leading-relaxed">{analysis.summary}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Probable Severity</p>
                <SeverityBadge severity={analysis.probable_severity} size="md" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Key Error Patterns</p>
                <ul className="space-y-2">
                  {(analysis.key_error_patterns ?? []).map((p, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-0.5 h-4 w-4 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      </span>
                      <span className="text-sm font-mono text-slate-600">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Confidence</p>
                <ConfidenceBar value={analysis.confidence} />
              </div>
            </div>
          )}
          {!analysis && !analyzing && !analyzeError && (
            <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center">
              <p className="text-sm text-slate-400">Click <span className="font-medium">Analyze Incident</span> to run AI-powered log analysis.</p>
            </div>
          )}
        </SectionCard>

        {/* Similar incidents */}
        {(loadingSimilar || similarIncidents.length > 0) && (
          <SectionCard>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Similar Incidents</h2>
            <p className="text-xs text-slate-400 mb-4">Ranked by semantic similarity (pgvector cosine search)</p>
            {loadingSimilar && <PulseSkeleton />}
            {!loadingSimilar && similarIncidents.map((s) => (
              <div key={s.incident_id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <Link href={`/incidents/${s.incident_id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline">
                    {s.incident_id}
                  </Link>
                  <p className="text-xs text-slate-500 truncate">{s.title}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <SeverityBadge severity={s.severity} />
                  <div className="text-right">
                    <p className="text-xs font-semibold text-indigo-600">{Math.round(s.similarity * 100)}%</p>
                    <p className="text-xs text-slate-400">match</p>
                  </div>
                </div>
              </div>
            ))}
          </SectionCard>
        )}

        {/* Root Cause Analysis */}
        <SectionCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Root Cause Analysis</h2>
              <p className="text-xs text-slate-400 mt-0.5">Agents 2 &amp; 3 — root cause + resolution</p>
            </div>
            <button
              onClick={handleRunRca}
              disabled={runningRca || runningPipeline}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {runningRca ? <><Spinner /> Running RCA…</> : "Run RCA"}
            </button>
          </div>
          {rcaError && <ErrorBanner message={rcaError} />}
          {runningRca && <PulseSkeleton />}
          {rcaResult && !runningRca && (
            <div className="space-y-4">
              <div className="rounded-lg bg-rose-50 ring-1 ring-rose-100 p-4">
                <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide mb-1.5">Root Cause</p>
                <p className="text-sm text-slate-700 leading-relaxed">{rcaResult.rca.root_cause}</p>
                {rcaResult.rca.contributing_factors.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {rcaResult.rca.contributing_factors.map((f, i) => (
                      <li key={i} className="text-xs text-rose-700 flex items-start gap-2">
                        <span className="mt-0.5 h-3.5 w-3.5 rounded-full bg-rose-200 flex items-center justify-center flex-shrink-0">
                          <span className="h-1 w-1 rounded-full bg-rose-600" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-lg bg-emerald-50 ring-1 ring-emerald-100 p-4">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">Resolution</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Immediate Actions</p>
                    <ul className="space-y-1.5">
                      {rcaResult.resolution.immediate_actions.map((a, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                          <span className="mt-0.5 text-emerald-500 font-bold">{i + 1}.</span>{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Long-Term Actions</p>
                    <ul className="space-y-1.5">
                      {rcaResult.resolution.long_term_actions.map((a, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                          <span className="mt-0.5 text-blue-500 font-bold">{i + 1}.</span>{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  <span className="font-medium">Estimated resolution time:</span> {rcaResult.resolution.estimated_resolution_time}
                </p>
              </div>
            </div>
          )}
          {!rcaResult && !runningRca && !rcaError && (
            <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center">
              <p className="text-sm text-slate-400">Run RCA to identify root cause and resolution steps.</p>
            </div>
          )}
        </SectionCard>

        {/* Post-Mortem Report */}
        <SectionCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Post-Mortem Report</h2>
              <p className="text-xs text-slate-400 mt-0.5">Agent 4 — AI-generated post-mortem</p>
            </div>
            <div className="flex items-center gap-2">
              {reportResult && (
                <>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all disabled:opacity-60"
                  >
                    {downloadingPdf ? <><Spinner />Generating PDF…</> : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Download PDF
                      </>
                    )}
                  </button>
                </>
              )}
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport || runningPipeline}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {generatingReport ? <><Spinner /> Generating…</> : (reportResult ? "Re-generate" : "Generate Report")}
              </button>
            </div>
          </div>
          {reportError && <ErrorBanner message={reportError} />}
          {generatingReport && <PulseSkeleton lines={4} />}
          {reportResult && !generatingReport && (
            <div className="space-y-5">
              {[
                { label: "Executive Summary",       text: reportResult.executive_summary },
                { label: "What Happened",           text: reportResult.what_happened },
                { label: "Root Cause",              text: reportResult.root_cause },
                { label: "Severity Assessment",     text: reportResult.severity_assessment },
                { label: "Estimated Impact",        text: reportResult.estimated_impact },
              ].map(({ label, text }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
                </div>
              ))}
              {[
                { label: "Evidence",                 items: reportResult.evidence },
                { label: "Resolution Steps",         items: reportResult.resolution_steps_taken },
                { label: "Prevention Recommendations", items: reportResult.prevention_recommendations },
                { label: "Similar Incidents Referenced", items: reportResult.similar_incidents_referenced },
              ].filter(({ items }) => items?.length).map(({ label, items }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
                  <ul className="space-y-1.5">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-0.5 h-4 w-4 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                        </span>
                        <span className="text-sm text-slate-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {!reportResult && !generatingReport && !reportError && (
            <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center">
              <p className="text-sm text-slate-400">Generate Report to create the AI post-mortem.</p>
              <p className="text-xs text-slate-400 mt-1">Requires AI Analysis and RCA to be run first.</p>
            </div>
          )}
        </SectionCard>
      </main>
    </div>
  );
}
