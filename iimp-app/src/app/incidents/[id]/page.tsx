"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import {
  Incident,
  AnalysisResult,
  SimilarIncident,
  RCAResult,
  ReportResult,
} from "@/types/incident";
import {
  analyzeIncident,
  generateReport,
  getIncidentById,
  getSimilarIncidents,
  runRCA,
  updateIncidentStatus,
} from "@/services/incidentsService";

import { useIncidents } from "@/context/IncidentsContext";

import SeverityBadge from "@/components/SeverityBadge";
import StatusBadge from "@/components/StatusBadge";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 90
      ? "bg-emerald-500"
      : pct >= 70
      ? "bg-indigo-500"
      : pct >= 50
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-slate-700 tabular-nums w-10 text-right">
        {pct}%
      </span>
    </div>
  );
}

// Spinner used inline in buttons
function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// Error banner
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

// Loading skeleton (pulse bars)
function PulseSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 bg-slate-100 rounded-full ${i === 0 ? "w-full" : i === 1 ? "w-5/6" : "w-4/6"}`} />
      ))}
    </div>
  );
}

// Section card wrapper
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline stepper — shows which of the 3 steps is active / done
// ---------------------------------------------------------------------------
type StepState = "idle" | "active" | "done" | "error";

function PipelineStepper({
  step,        // 0 = not started, 1 = analyze, 2 = rca, 3 = report, 4 = done
  hasError,
}: {
  step: number;
  hasError: boolean;
}) {
  const steps = [
    { label: "Analyze Logs", agent: "Agent 1" },
    { label: "Root Cause Analysis", agent: "Agents 2 & 3" },
    { label: "Generate Report", agent: "Agent 4" },
  ];

  function getState(i: number): StepState {
    const idx = i + 1; // 1-based
    if (hasError && step === idx) return "error";
    if (step > idx) return "done";
    if (step === idx) return "active";
    return "idle";
  }

  return (
    <div className="flex items-center gap-0 w-full max-w-md">
      {steps.map((s, i) => {
        const state = getState(i);
        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            {/* Node */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${state === "done"   ? "bg-violet-600 text-white" :
                  state === "active" ? "bg-violet-100 border-2 border-violet-500 text-violet-700" :
                  state === "error"  ? "bg-red-100 border-2 border-red-400 text-red-600" :
                                       "bg-slate-100 text-slate-400"}`}
              >
                {state === "done" ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : state === "active" ? (
                  <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <p className={`text-xs mt-1 font-medium whitespace-nowrap
                ${state === "done" ? "text-violet-600" :
                  state === "active" ? "text-violet-700" :
                  state === "error" ? "text-red-500" : "text-slate-400"}`}>
                {s.label}
              </p>
              <p className="text-xs text-slate-300">{s.agent}</p>
            </div>
            {/* Connector line — not after last */}
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-7 rounded-full transition-all
                ${step > i + 1 ? "bg-violet-400" : "bg-slate-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status toggle — OPEN → IN_PROGRESS → RESOLVED inline on the hero card
// ---------------------------------------------------------------------------
const STATUS_FLOW: Array<{ value: string; label: string; next: string; color: string }> = [
  { value: "OPEN",        label: "Open",        next: "IN_PROGRESS", color: "bg-blue-600 hover:bg-blue-700" },
  { value: "IN_PROGRESS", label: "In Progress", next: "RESOLVED",    color: "bg-violet-600 hover:bg-violet-700" },
  { value: "RESOLVED",    label: "Resolved",    next: "OPEN",        color: "bg-emerald-600 hover:bg-emerald-700" },
];

function StatusToggle({
  currentStatus,
  onUpdate,
}: {
  currentStatus: string;
  onUpdate: (next: string) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);
  const cfg = STATUS_FLOW.find((s) => s.value === currentStatus) ?? STATUS_FLOW[0];

  async function handleClick() {
    if (updating) return;
    setUpdating(true);
    try { await onUpdate(cfg.next); }
    finally { setUpdating(false); }
  }

  return (
    <button
      onClick={handleClick}
      disabled={updating}
      title={`Mark as ${cfg.next.replace("_", " ")}`}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${cfg.color}`}
    >
      {updating ? (
        <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      )}
      {updating ? "Updating…" : `Mark ${cfg.next.replace("_", " ")}`}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { updateIncident } = useIncidents();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loadingIncident, setLoadingIncident] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [similarIncidents, setSimilarIncidents] = useState<SimilarIncident[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  const [rcaResult, setRcaResult] = useState<RCAResult | null>(null);
  const [runningRca, setRunningRca] = useState(false);
  const [rcaError, setRcaError] = useState<string | null>(null);

  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Pipeline state — chains analyze → rca → report
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<number>(0); // 0=idle,1=analyze,2=rca,3=report
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Load incident
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!incidentId) return;
    setLoadingIncident(true);
    setNotFound(false);

    getIncidentById(incidentId)
      .then((inc) => {
        if (!inc) { setNotFound(true); setIncident(null); return; }
        setIncident(inc);
        setAnalysis(inc.ai_summary ?? null);
        setRcaResult(inc.rca_result ?? null);
        setReportResult(inc.report_result ?? null);
      })
      .catch(() => { setNotFound(true); setIncident(null); })
      .finally(() => setLoadingIncident(false));
  }, [incidentId]);

  // -------------------------------------------------------------------------
  // Update status
  // -------------------------------------------------------------------------

  async function handleStatusUpdate(newStatus: string) {
    if (!incidentId) return;
    const updated = await updateIncidentStatus(incidentId, newStatus as import("@/types/incident").Status);
    setIncident((prev) => prev ? { ...prev, status: updated.status } : prev);
    updateIncident({ ...updated, id: updated.id } as Incident);
  }

  // -------------------------------------------------------------------------
  // Run AI analysis
  // -------------------------------------------------------------------------

  async function handleAnalyze() {
    if (!incidentId || analyzing) return;
    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      const result = await analyzeIncident(incidentId);
      setAnalysis(result);
      setIncident((prev) => prev ? { ...prev, ai_summary: result } : prev);

      setLoadingSimilar(true);
      try {
        const res = await getSimilarIncidents(incidentId);
        setSimilarIncidents(res.similar);
      } catch { /* non-fatal */ }
      finally { setLoadingSimilar(false); }
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  // -------------------------------------------------------------------------
  // Run RCA
  // -------------------------------------------------------------------------

  async function handleRunRca() {
    if (!incidentId || runningRca) return;
    setRunningRca(true);
    setRcaError(null);

    try {
      const result = await runRCA(incidentId);
      setRcaResult(result);
      setIncident((prev) => prev ? { ...prev, rca_result: result } : prev);
    } catch (err) {
      setRcaError(err instanceof Error ? err.message : "RCA pipeline failed.");
    } finally {
      setRunningRca(false);
    }
  }

  // -------------------------------------------------------------------------
  // Generate report
  // -------------------------------------------------------------------------

  async function handleGenerateReport() {
    if (!incidentId || generatingReport) return;
    setGeneratingReport(true);
    setReportError(null);

    try {
      // If RCA hasn't been run yet, run it automatically before generating
      // the report — the backend requires rca_result to exist first.
      if (!rcaResult) {
        // Also run analysis first if that is missing too
        if (!analysis) {
          const analysisRes = await analyzeIncident(incidentId);
          setAnalysis(analysisRes);
          setIncident((prev) => prev ? { ...prev, ai_summary: analysisRes } : prev);
          // Brief pause so the free-tier Gemini quota isn't hit immediately
          await new Promise<void>((r) => setTimeout(r, 3000));
        }

        const rcaRes = await runRCA(incidentId);
        setRcaResult(rcaRes);
        setIncident((prev) => prev ? { ...prev, rca_result: rcaRes } : prev);
        // Brief pause before the next Gemini call
        await new Promise<void>((r) => setTimeout(r, 3000));
      }

      const result = await generateReport(incidentId);
      setReportResult(result);
      setIncident((prev) => prev ? { ...prev, report_result: result } : prev);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Report generation failed.");
    } finally {
      setGeneratingReport(false);
    }
  }

  // -------------------------------------------------------------------------
  // Run full pipeline: analyze → rca → report
  // -------------------------------------------------------------------------

  async function handleRunFullPipeline() {
    if (!incidentId || runningPipeline) return;
    setRunningPipeline(true);
    setPipelineError(null);

    // Small helper — pause between steps so the free-tier Gemini quota
    // isn't hit with 4 rapid-fire calls, which causes 503 UNAVAILABLE.
    const pause = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    try {
      // Step 1: Analyze
      setPipelineStep(1);
      const analysisResult = await analyzeIncident(incidentId);
      setAnalysis(analysisResult);
      setIncident((prev) => prev ? { ...prev, ai_summary: analysisResult } : prev);

      // Fetch similar incidents in background (non-blocking)
      getSimilarIncidents(incidentId)
        .then((res) => setSimilarIncidents(res.similar))
        .catch(() => {/* non-fatal */});

      // Wait 4s before next Gemini call
      await pause(4000);

      // Step 2: RCA
      setPipelineStep(2);
      const rcaRes = await runRCA(incidentId);
      setRcaResult(rcaRes);
      setIncident((prev) => prev ? { ...prev, rca_result: rcaRes } : prev);

      // Wait 4s before next Gemini call
      await pause(4000);

      // Step 3: Report
      setPipelineStep(3);
      const reportRes = await generateReport(incidentId);
      setReportResult(reportRes);
      setIncident((prev) => prev ? { ...prev, report_result: reportRes } : prev);

      setPipelineStep(0);
    } catch (err) {
      setPipelineError(err instanceof Error ? err.message : "Pipeline failed.");
      setPipelineStep(0);
    } finally {
      setRunningPipeline(false);
    }
  }

  // -------------------------------------------------------------------------
  // Loading / Not found
  // -------------------------------------------------------------------------

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
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-slate-500 text-sm">
            Incident <span className="font-mono font-medium">{incidentId}</span> was not found.
          </p>
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Detail view
  // -------------------------------------------------------------------------

  const pipelineComplete = !!analysis && !!rcaResult && !!reportResult;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">

          <div className="flex items-center gap-4">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Dashboard
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-mono text-sm font-semibold text-slate-700">{incident.incident_id}</span>
          </div>

          {/* Run Full Pipeline button */}
          <button
            onClick={handleRunFullPipeline}
            disabled={runningPipeline}
            title="Runs Analyze → RCA → Report in sequence"
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {runningPipeline ? (
              <>
                <Spinner />
                <span className="text-sm">Running pipeline…</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                </svg>
                {pipelineComplete ? "Re-run Full Pipeline" : "Run Full Pipeline"}
              </>
            )}
          </button>

        </div>

        {/* Pipeline progress bar */}
        {runningPipeline && (
          <div className="h-0.5 bg-slate-100">
            <div className="h-0.5 bg-violet-500 animate-pulse w-full" />
          </div>
        )}

        {/* Pipeline stepper — visible while running */}
        {runningPipeline && (
          <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-3">
            <div className="max-w-5xl mx-auto">
              <PipelineStepper step={pipelineStep} hasError={false} />
            </div>
          </div>
        )}

        {/* Pipeline error banner under header */}
        {pipelineError && (
          <div className="bg-red-50 border-b border-red-100 px-6 py-2">
            <div className="max-w-5xl mx-auto">
              <p className="text-xs text-red-700">
                <span className="font-semibold">Pipeline error:</span> {pipelineError}
              </p>
            </div>
          </div>
        )}

      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ---------------------------------------------------------------- */}
        {/* Hero card                                                        */}
        {/* ---------------------------------------------------------------- */}
        <SectionCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs font-medium text-slate-400 mb-1">{incident.incident_id}</p>
              <h1 className="text-xl font-semibold text-slate-900 leading-snug">{incident.title}</h1>
              <p className="mt-1 text-sm text-slate-500">{incident.service}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <SeverityBadge severity={incident.severity} size="md" />
              <StatusBadge status={incident.status} size="md" />
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Created</p>
              <p className="text-slate-700">{formatDate(incident.created_at)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Service</p>
              <p className="text-slate-700">{incident.service}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Incident ID</p>
              <p className="font-mono text-slate-700">{incident.incident_id}</p>
            </div>
          </div>

          {/* Status update */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">Update status</p>
            <StatusToggle
              currentStatus={incident.status}
              onUpdate={handleStatusUpdate}
            />
          </div>
        </SectionCard>

        {/* ---------------------------------------------------------------- */}
        {/* Description                                                      */}
        {/* ---------------------------------------------------------------- */}
        <SectionCard>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Description</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{incident.description}</p>
        </SectionCard>

        {/* ---------------------------------------------------------------- */}
        {/* Logs                                                             */}
        {/* ---------------------------------------------------------------- */}
        <SectionCard>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Logs</h2>
            {incident.logs && (
              <span className="text-xs text-slate-400">{incident.logs.split("\n").length} lines</span>
            )}
          </div>
          {incident.logs ? (
            <div className="rounded-lg bg-slate-950 overflow-auto max-h-96 ring-1 ring-slate-800">
              <pre className="p-4 text-xs leading-relaxed text-slate-200 font-mono whitespace-pre">{incident.logs}</pre>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No logs attached to this incident.</p>
          )}
        </SectionCard>

        {/* ---------------------------------------------------------------- */}
        {/* AI Analysis                                                      */}
        {/* ---------------------------------------------------------------- */}
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
              {analyzing ? <><Spinner /> Analyzing…</> : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L9 5.25a4.5 4.5 0 00.813 2.846 4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Analyze Incident
                </>
              )}
            </button>
          </div>

          {analyzeError && <ErrorBanner message={analyzeError} />}
          {analyzing && <PulseSkeleton lines={3} />}

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
                  {(analysis?.key_error_patterns ?? []).map((pattern, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      </span>
                      <span className="text-sm font-mono text-slate-600">{pattern}</span>
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
              <svg className="mx-auto mb-2 h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09z" />
              </svg>
              <p className="text-sm text-slate-400">
                Click <span className="font-medium">Analyze Incident</span> to run AI-powered log analysis.
              </p>
            </div>
          )}
        </SectionCard>

        {/* ---------------------------------------------------------------- */}
        {/* Similar Incidents                                                */}
        {/* ---------------------------------------------------------------- */}
        {(loadingSimilar || similarIncidents.length > 0) && (
          <SectionCard>
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Similar Past Incidents</h2>
              <p className="text-xs text-slate-400 mt-0.5">Ranked by semantic similarity (pgvector cosine)</p>
            </div>

            {loadingSimilar && (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-slate-100" />)}
              </div>
            )}

            {!loadingSimilar && (
              <ul className="space-y-3">
                {similarIncidents.map((sim) => (
                  <li key={sim.incident_id}>
                    <a
                      href={`/incidents/${sim.incident_id}`}
                      className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs font-medium text-slate-400">{sim.incident_id}</span>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-500">{sim.service}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-700 truncate group-hover:text-indigo-700">{sim.title}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${Math.round(sim.similarity * 100)}%` }} />
                          </div>
                          <span className="text-xs font-semibold tabular-nums text-slate-600 w-9 text-right">
                            {Math.round(sim.similarity * 100)}%
                          </span>
                        </div>
                        <svg className="h-4 w-4 text-slate-300 group-hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Multi-Agent RCA                                                  */}
        {/* ---------------------------------------------------------------- */}
        <SectionCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Root Cause Analysis</h2>
              <p className="text-xs text-slate-400 mt-0.5">Agents 2 & 3 — RCA + Resolution</p>
            </div>
            <button
              onClick={handleRunRca}
              disabled={runningRca || runningPipeline}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {runningRca ? <><Spinner /> Running RCA…</> : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Run RCA
                </>
              )}
            </button>
          </div>

          {rcaError && <ErrorBanner message={rcaError} />}
          {runningRca && <PulseSkeleton lines={4} />}

          {rcaResult && !runningRca && (
            <div className="space-y-6">
              {/* Agent 2: Root Cause */}
              <div className="rounded-lg bg-rose-50 border border-rose-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-rose-600 text-white text-xs font-bold">2</span>
                  <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Root Cause</p>
                  <span className="ml-auto text-xs text-rose-400">
                    Confidence: {Math.round(rcaResult.rca.confidence * 100)}%
                  </span>
                </div>
                <p className="text-sm text-rose-900 font-medium leading-relaxed">{rcaResult.rca.root_cause}</p>
                {rcaResult.rca.contributing_factors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-rose-600 mb-1.5">Contributing Factors</p>
                    <ul className="space-y-1">
                      {rcaResult.rca.contributing_factors.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-rose-800">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Agent 3: Resolution */}
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-600 text-white text-xs font-bold">3</span>
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Recommended Resolution</p>
                  <span className="ml-auto text-xs text-emerald-500 font-medium">ETA: {rcaResult.resolution.estimated_resolution_time}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 mb-2">Immediate Actions</p>
                    <ol className="space-y-1.5">
                      {rcaResult.resolution.immediate_actions.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                          <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full bg-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                          {a}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 mb-2">Long-Term Prevention</p>
                    <ol className="space-y-1.5">
                      {rcaResult.resolution.long_term_actions.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                          <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                          {a}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>

              <p className="text-right text-xs text-slate-300">Pipeline {rcaResult.pipeline_version}</p>
            </div>
          )}

          {!rcaResult && !runningRca && !rcaError && (
            <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center">
              <svg className="mx-auto mb-2 h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p className="text-sm text-slate-400">
                Click <span className="font-medium">Run RCA</span> to identify root cause and get resolution steps.
              </p>
            </div>
          )}
        </SectionCard>

        {/* ---------------------------------------------------------------- */}
        {/* Incident Report (Agent 4)                                        */}
        {/* ---------------------------------------------------------------- */}
        <SectionCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Incident Report</h2>
              <p className="text-xs text-slate-400 mt-0.5">Agent 4 — post-mortem report generation</p>
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport || runningPipeline}
              title="Generate post-mortem report (runs RCA automatically if needed)"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generatingReport ? <><Spinner /> {!rcaResult ? "Running prerequisites…" : "Generating…"}</> : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  {reportResult ? "Regenerate Report" : "Generate Report"}
                </>
              )}
            </button>
          </div>

          {/* Prereq hint */}
          {!rcaResult && !generatingReport && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 mb-4">
              <svg className="h-4 w-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-amber-700">
                Run <span className="font-semibold">Analyze</span> and <span className="font-semibold">RCA</span> first — the report is generated from their combined output.
              </p>
            </div>
          )}

          {reportError && <ErrorBanner message={reportError} />}
          {generatingReport && <PulseSkeleton lines={5} />}

          {reportResult && !generatingReport && (
            <div className="space-y-6">

              {/* Executive Summary */}
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Executive Summary</p>
                <p className="text-sm text-slate-700 leading-relaxed">{reportResult.executive_summary}</p>
              </div>

              {/* Two-column: What Happened + Impact */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">What Happened</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{reportResult.what_happened}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Estimated Impact</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{reportResult.estimated_impact}</p>
                </div>
              </div>

              {/* Root Cause + Severity */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Confirmed Root Cause</p>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">{reportResult.root_cause}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Severity Assessment</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{reportResult.severity_assessment}</p>
                </div>
              </div>

              {/* Evidence */}
              {reportResult.evidence.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Evidence from Logs</p>
                  <ul className="space-y-1.5">
                    {reportResult.evidence.map((e, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded bg-slate-200 text-slate-500 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="text-xs font-mono text-slate-600">{e}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Resolution steps + prevention — two columns */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Resolution Steps Taken</p>
                  <ol className="space-y-1.5">
                    {reportResult.resolution_steps_taken.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Prevention Recommendations</p>
                  <ol className="space-y-1.5">
                    {reportResult.prevention_recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        {r}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Similar incidents referenced */}
              {reportResult.similar_incidents_referenced.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Similar Incidents Referenced</p>
                  <ul className="space-y-1">
                    {reportResult.similar_incidents_referenced.map((ref, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                        {ref}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-right text-xs text-slate-300">
                Generated by Report Agent · IIMP v1
              </p>
            </div>
          )}

          {!reportResult && !generatingReport && !reportError && rcaResult && (
            <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center">
              <svg className="mx-auto mb-2 h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-sm text-slate-400">
                Click <span className="font-medium">Generate Report</span> to produce a post-mortem document.
              </p>
            </div>
          )}

        </SectionCard>

      </main>
    </div>
  );
}
