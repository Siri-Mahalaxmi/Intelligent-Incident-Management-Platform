"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { Incident, AnalysisResult } from "@/types/incident";import {
  analyzeIncident,
  getIncidentById,
} from "@/services/incidentsService";

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function IncidentDetailPage() {
  const params = useParams();

  const incidentId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [incident, setIncident] = useState<Incident | null>(null);

  const [loadingIncident, setLoadingIncident] =
    useState(true);

  const [notFound, setNotFound] = useState(false);

  const [analysis, setAnalysis] =
    useState<AnalysisResult | null>(null);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [analyzeError, setAnalyzeError] =
    useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Load incident
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!incidentId) return;

    setLoadingIncident(true);
    setNotFound(false);

    getIncidentById(incidentId)
      .then((inc) => {
        if (!inc) {
          setNotFound(true);
          setIncident(null);
          return;
        }

        setIncident(inc);

        // IMPORTANT:
        // Restore previously stored AI analysis from Supabase.
        setAnalysis(inc.ai_summary ?? null);
      })
      .catch(() => {
        setNotFound(true);
        setIncident(null);
      })
      .finally(() => {
        setLoadingIncident(false);
      });
  }, [incidentId]);

  // -------------------------------------------------------------------------
  // Run AI analysis
  // -------------------------------------------------------------------------

  async function handleAnalyze() {
    if (!incidentId || analyzing) return;

    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      const result = await analyzeIncident(incidentId);

      // Show the newly generated result immediately.
      setAnalysis(result);

      // Also update the local incident object.
      setIncident((previous) =>
        previous
          ? {
              ...previous,
              ai_summary: result,
            }
          : previous
      );
    } catch (err) {
      setAnalyzeError(
        err instanceof Error
          ? err.message
          : "Analysis failed. Please try again."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  if (loadingIncident) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />

          <p className="text-sm text-slate-400">
            Loading incident…
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Not found
  // -------------------------------------------------------------------------

  if (notFound || !incident) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>

              Back to Dashboard
            </Link>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-slate-500 text-sm">
            Incident{" "}
            <span className="font-mono font-medium">
              {incidentId}
            </span>{" "}
            was not found.
          </p>
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Detail view
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>

            Dashboard
          </Link>

          <span className="text-slate-300">
            /
          </span>

          {/* HUMAN-READABLE INCIDENT ID */}
          <span className="font-mono text-sm font-semibold text-slate-700">
            {incident.incident_id}
          </span>

        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ---------------------------------------------------------------- */}
        {/* Hero card                                                        */}
        {/* ---------------------------------------------------------------- */}

        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">

          <div className="flex flex-wrap items-start justify-between gap-4">

            <div className="flex-1 min-w-0">

              {/* HUMAN-READABLE ID */}
              <p className="font-mono text-xs font-medium text-slate-400 mb-1">
                {incident.incident_id}
              </p>

              <h1 className="text-xl font-semibold text-slate-900 leading-snug">
                {incident.title}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {incident.service}
              </p>

            </div>

            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <SeverityBadge
                severity={incident.severity}
                size="md"
              />

              <StatusBadge
                status={incident.status}
                size="md"
              />
            </div>

          </div>

          {/* Meta row */}
          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">

            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                Created
              </p>

              <p className="text-slate-700">
                {formatDate(incident.created_at)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                Service
              </p>

              <p className="text-slate-700">
                {incident.service}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                Incident ID
              </p>

              {/* HUMAN-READABLE ID */}
              <p className="font-mono text-slate-700">
                {incident.incident_id}
              </p>
            </div>

          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Description                                                      */}
        {/* ---------------------------------------------------------------- */}

        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">

          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Description
          </h2>

          <p className="text-sm text-slate-600 leading-relaxed">
            {incident.description}
          </p>

        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Logs                                                             */}
        {/* ---------------------------------------------------------------- */}

        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">

          <div className="flex items-center justify-between mb-3">

            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Logs
            </h2>

            {incident.logs && (
              <span className="text-xs text-slate-400">
                {incident.logs.split("\n").length} lines
              </span>
            )}

          </div>

          {incident.logs ? (
            <div className="rounded-lg bg-slate-950 overflow-auto max-h-96 ring-1 ring-slate-800">

              <pre className="p-4 text-xs leading-relaxed text-slate-200 font-mono whitespace-pre">
                {incident.logs}
              </pre>

            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">
              No logs attached to this incident.
            </p>
          )}

        </div>

        {/* ---------------------------------------------------------------- */}
        {/* AI Analysis                                                      */}
        {/* ---------------------------------------------------------------- */}

        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">

          <div className="flex items-center justify-between mb-4">

            <div>

              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                AI Analysis
              </h2>

              <p className="text-xs text-slate-400 mt-0.5">
                Powered by the incident analysis engine
              </p>

            </div>

            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >

              {analyzing ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />

                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>

                  Analyzing…
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L9 5.25a4.5 4.5 0 00.813 2.846 4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                    />
                  </svg>

                  Analyze Incident
                </>
              )}

            </button>

          </div>

          {/* -------------------------------------------------------------- */}
          {/* Analysis error                                                  */}
          {/* -------------------------------------------------------------- */}

          {analyzeError && (
            <div className="flex items-start gap-3 rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200 mb-4">

              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

              <p className="text-sm text-red-700">
                {analyzeError}
              </p>

            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Loading analysis                                                */}
          {/* -------------------------------------------------------------- */}

          {analyzing && (
            <div className="space-y-3 animate-pulse">

              <div className="h-3 bg-slate-100 rounded-full w-full" />
              <div className="h-3 bg-slate-100 rounded-full w-5/6" />
              <div className="h-3 bg-slate-100 rounded-full w-4/6" />

            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Analysis result                                                 */}
          {/* -------------------------------------------------------------- */}

          {analysis && !analyzing && (
            <div className="space-y-5">

              {/* Summary */}
              <div>

                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  Summary
                </p>

                <p className="text-sm text-slate-700 leading-relaxed">
                  {analysis.summary}
                </p>

              </div>

              {/* Probable severity */}
              <div>

                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  Probable Severity
                </p>

                <SeverityBadge
                  severity={analysis.probable_severity}
                  size="md"
                />

              </div>

              {/* Key error patterns */}
              <div>

                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Key Error Patterns
                </p>

                <ul className="space-y-2">

                 {(analysis?.key_error_patterns ?? []).map(
                    (pattern, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2.5"
                      >

                        <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full bg-indigo-100 flex items-center justify-center">

                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />

                        </span>

                        <span className="text-sm font-mono text-slate-600">
                          {pattern}
                        </span>

                      </li>
                    )
                  )}

                </ul>

              </div>

              {/* Confidence */}
              <div>

                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Confidence
                </p>

                <ConfidenceBar
                  value={analysis.confidence}
                />

              </div>

            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* No analysis yet                                                 */}
          {/* -------------------------------------------------------------- */}

          {!analysis &&
            !analyzing &&
            !analyzeError && (
              <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center">

                <svg
                  className="mx-auto mb-2 h-8 w-8 text-slate-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09z"
                  />
                </svg>

                <p className="text-sm text-slate-400">
                  Click{" "}
                  <span className="font-medium">
                    Analyze Incident
                  </span>{" "}
                  to run AI-powered root cause analysis.
                </p>

              </div>
            )}

        </div>

      </main>
    </div>
  );
}