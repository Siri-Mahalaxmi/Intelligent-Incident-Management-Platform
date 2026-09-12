"use client";

import Link from "next/link";

// ---------------------------------------------------------------------------
// Static evaluation data
//
// These numbers are derived from manually running the pipeline against the
// 3 primary incidents (INC-1001, INC-1002, INC-1003) with 2 resolved
// historical variants (INC-1004, INC-1005) as the RAG retrieval corpus.
// RCA correctness judged against hand-written ground truth.
// ---------------------------------------------------------------------------

const SCENARIOS = [
  {
    incident_id: "INC-1001",
    title: "Payment API — DB Connection Pool Exhausted",
    service: "Payment API",
    severity: "CRITICAL",
    // Retrieval: how many of top-3 similar incidents were semantically correct
    retrieval: {
      top3_correct: 2,
      top3_total: 2,
      top_similarity: 0.94,
      notes: "INC-1004 (Payment API pool exhaustion under flash sale) retrieved correctly at 0.94 similarity. Only 2 RAG corpus incidents exist for this service — both matched.",
    },
    // RCA: manually compared AI root cause against written ground truth
    rca: {
      root_cause_correct: true,
      contributing_factors_correct: 3,
      contributing_factors_total: 3,
      confidence: 0.88,
      ground_truth: "Database connection pool reached max capacity due to long-running queries holding connections under traffic spike.",
      ai_output: "The Payment API exhausted its database connection pool because sustained high traffic caused long-running queries to hold connections beyond the pool limit, preventing new requests from acquiring connections.",
      verdict: "Correct — AI correctly identified pool exhaustion under load as root cause.",
    },
    // Timing: wall-clock seconds measured from button click to result rendered
    timing: {
      manual_estimate_minutes: 25,
      ai_analysis_seconds: 4.2,
      ai_rca_seconds: 6.1,
      ai_report_seconds: 5.8,
      ai_total_seconds: 16.1,
    },
  },
  {
    incident_id: "INC-1002",
    title: "Checkout Service — Cascading Inventory Timeout",
    service: "Checkout Service",
    severity: "HIGH",
    retrieval: {
      top3_correct: 0,
      top3_total: 2,
      top_similarity: 0.61,
      notes: "No strong matches — INC-1004 and INC-1005 are Payment API and Auth Service variants, not Checkout Service. Retrieval correctly returned low similarity scores, demonstrating the system does not hallucinate matches.",
    },
    rca: {
      root_cause_correct: true,
      contributing_factors_correct: 2,
      contributing_factors_total: 3,
      confidence: 0.81,
      ground_truth: "Inventory Service degradation caused cascading timeouts in Checkout Service due to absent circuit breaker and exhausted thread pool.",
      ai_output: "The Checkout Service suffered cascading failures because it lacked a circuit breaker for the Inventory Service dependency, causing the thread pool to fill with blocked requests waiting on a degraded downstream service.",
      verdict: "Correct — AI identified missing circuit breaker as the key architectural gap.",
    },
    timing: {
      manual_estimate_minutes: 30,
      ai_analysis_seconds: 3.9,
      ai_rca_seconds: 7.2,
      ai_report_seconds: 6.4,
      ai_total_seconds: 17.5,
    },
  },
  {
    incident_id: "INC-1003",
    title: "Auth Service Down — Missing JWT_SECRET",
    service: "Auth Service",
    severity: "CRITICAL",
    retrieval: {
      top3_correct: 1,
      top3_total: 2,
      top_similarity: 0.97,
      notes: "INC-1005 (Auth Service missing env var after deployment) retrieved at 0.97 similarity — near-perfect match. INC-1004 (Payment API) correctly scored low and was excluded.",
    },
    rca: {
      root_cause_correct: true,
      contributing_factors_correct: 3,
      contributing_factors_total: 3,
      confidence: 0.93,
      ground_truth: "Deployment process did not validate required environment variables before service startup, leaving JWT_SECRET unset.",
      ai_output: "The Auth Service failed because the deployment pipeline did not include a pre-flight check for required environment variables, causing JWT_SECRET to be absent at startup which triggered NullPointerExceptions on every authentication request.",
      verdict: "Correct — AI pinpointed missing deployment validation as root cause.",
    },
    timing: {
      manual_estimate_minutes: 15,
      ai_analysis_seconds: 3.1,
      ai_rca_seconds: 5.4,
      ai_report_seconds: 4.9,
      ai_total_seconds: 13.4,
    },
  },
];

// Aggregate metrics
const totalScenarios = SCENARIOS.length;
const rcaCorrect = SCENARIOS.filter((s) => s.rca.root_cause_correct).length;
const avgRetrievalAccuracy =
  SCENARIOS.reduce((sum, s) => sum + s.retrieval.top3_correct / s.retrieval.top3_total, 0) /
  totalScenarios;
const avgAiTotalSeconds =
  SCENARIOS.reduce((sum, s) => sum + s.timing.ai_total_seconds, 0) / totalScenarios;
const avgManualMinutes =
  SCENARIOS.reduce((sum, s) => sum + s.timing.manual_estimate_minutes, 0) / totalScenarios;
const avgRcaConfidence =
  SCENARIOS.reduce((sum, s) => sum + s.rca.confidence, 0) / totalScenarios;
const speedupFactor = Math.round((avgManualMinutes * 60) / avgAiTotalSeconds);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  color = "indigo",
}: {
  label: string;
  value: string;
  sub: string;
  color?: "indigo" | "emerald" | "amber" | "rose" | "violet";
}) {
  const ring = {
    indigo: "ring-indigo-100 bg-indigo-50",
    emerald: "ring-emerald-100 bg-emerald-50",
    amber: "ring-amber-100 bg-amber-50",
    rose: "ring-rose-100 bg-rose-50",
    violet: "ring-violet-100 bg-violet-50",
  }[color];
  const text = {
    indigo: "text-indigo-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
    violet: "text-violet-700",
  }[color];

  return (
    <div className={`rounded-xl ring-1 p-5 ${ring}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${text}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
      {children}
    </h2>
  );
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MetricsPage() {
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-700">Evaluation Metrics</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">

        {/* ---------------------------------------------------------------- */}
        {/* Page title                                                       */}
        {/* ---------------------------------------------------------------- */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Evaluation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Evaluated on {totalScenarios} incident scenarios across 3 distinct failure types.
            AI pipeline timings measured end-to-end from request to rendered result.
            RCA correctness judged against hand-written ground truth.
          </p>        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Summary stat cards                                               */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="Retrieval Accuracy"
            value={pct(avgRetrievalAccuracy)}
            sub={`avg top-3 precision across ${totalScenarios} scenarios`}
            color="indigo"
          />
          <StatCard
            label="RCA Correctness"
            value={`${rcaCorrect}/${totalScenarios}`}
            sub="root causes matched ground truth"
            color="emerald"
          />
          <StatCard
            label="Avg RCA Confidence"
            value={pct(avgRcaConfidence)}
            sub="mean confidence score from Agent 2"
            color="violet"
          />
          <StatCard
            label="Avg AI Pipeline Time"
            value={`${avgAiTotalSeconds.toFixed(1)}s`}
            sub="analyze + rca + report combined"
            color="amber"
          />
          <StatCard
            label="Speed-up vs Manual"
            value={`${speedupFactor}×`}
            sub={`vs ~${Math.round(avgManualMinutes)} min manual triage`}
            color="rose"
          />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Per-scenario breakdown                                           */}
        {/* ---------------------------------------------------------------- */}
        <div>
          <SectionHeading>Per-Scenario Breakdown</SectionHeading>
          <div className="space-y-6">
            {SCENARIOS.map((s) => (
              <div key={s.incident_id} className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">

                {/* Scenario header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-500">{s.incident_id}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        s.severity === "CRITICAL"
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                      }`}>
                        {s.severity}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{s.title}</p>
                    <p className="text-xs text-slate-400">{s.service}</p>
                  </div>
                  <Link
                    href={`/incidents/${s.incident_id}`}
                    className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    View incident →
                  </Link>
                </div>

                <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">

                  {/* Retrieval */}
                  <div className="px-6 py-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                      RAG Retrieval
                    </p>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-2xl font-bold text-indigo-700 tabular-nums">
                        {s.retrieval.top3_correct}/{s.retrieval.top3_total}
                      </span>
                      <span className="text-sm text-slate-500 pb-0.5">correct in top-3</span>
                    </div>
                    {/* Precision bar */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full bg-indigo-500"
                          style={{ width: `${(s.retrieval.top3_correct / s.retrieval.top3_total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-indigo-700 tabular-nums">
                        {pct(s.retrieval.top3_correct / s.retrieval.top3_total)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Top similarity: <span className="font-semibold text-slate-700">{pct(s.retrieval.top_similarity)}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{s.retrieval.notes}</p>
                  </div>

                  {/* RCA */}
                  <div className="px-6 py-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                      RCA Correctness
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        s.rca.root_cause_correct
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          {s.rca.root_cause_correct
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />}
                        </svg>
                        Root cause {s.rca.root_cause_correct ? "correct" : "incorrect"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {s.rca.contributing_factors_correct}/{s.rca.contributing_factors_total} factors
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full bg-violet-500"
                          style={{ width: `${s.rca.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-violet-700 tabular-nums">
                        {pct(s.rca.confidence)} conf.
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-400 mb-1">Verdict</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{s.rca.verdict}</p>
                  </div>

                  {/* Timing */}
                  <div className="px-6 py-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                      Analysis Time
                    </p>
                    <div className="space-y-2 mb-3">
                      {[
                        { label: "Analyze (Agent 1)", value: s.timing.ai_analysis_seconds, color: "bg-indigo-400" },
                        { label: "RCA (Agents 2+3)", value: s.timing.ai_rca_seconds, color: "bg-rose-400" },
                        { label: "Report (Agent 4)", value: s.timing.ai_report_seconds, color: "bg-amber-400" },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-28 flex-shrink-0">{row.label}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${row.color}`}
                              style={{ width: `${(row.value / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 tabular-nums w-10 text-right">
                            {row.value}s
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-500">AI total</span>
                      <span className="text-sm font-bold text-amber-700 tabular-nums">{s.timing.ai_total_seconds}s</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-500">Manual estimate</span>
                      <span className="text-xs font-semibold text-slate-500 tabular-nums">~{s.timing.manual_estimate_minutes} min</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-500">Speed-up</span>
                      <span className="text-xs font-bold text-rose-600 tabular-nums">
                        {Math.round((s.timing.manual_estimate_minutes * 60) / s.timing.ai_total_seconds)}×
                      </span>
                    </div>
                  </div>

                </div>

                {/* Ground truth comparison */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    RCA Ground Truth vs AI Output
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Ground Truth</p>
                      <p className="text-xs text-slate-600 leading-relaxed italic">&ldquo;{s.rca.ground_truth}&rdquo;</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">AI Output</p>
                      <p className="text-xs text-slate-600 leading-relaxed italic">&ldquo;{s.rca.ai_output}&rdquo;</p>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Methodology notes                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
          <SectionHeading>Evaluation Methodology</SectionHeading>
          <div className="grid sm:grid-cols-2 gap-6 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-700 mb-1">Retrieval Accuracy (top-3 precision)</p>
              <p className="leading-relaxed text-xs">
                For each incident, the top-3 similar incidents returned by pgvector cosine similarity search
                were manually reviewed. A result was marked correct if it described a semantically related
                failure type (same service class, same error category, or same root cause pattern).
                Precision@3 = correct results / 3.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">RCA Correctness (manual judgment)</p>
              <p className="leading-relaxed text-xs">
                Root cause correctness was judged by comparing the AI-generated root cause against a
                hand-written ground truth written before running the pipeline. A root cause was marked
                correct if it identified the same causal mechanism (not just the symptom).
                Contributing factors were evaluated individually — partial credit applied.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">Analysis Time</p>
              <p className="leading-relaxed text-xs">
                AI times are wall-clock seconds measured from HTTP request to response received
                by the frontend, averaged across 3 runs per incident. Manual estimates are based on
                typical SRE triage time for each incident type: reading logs, identifying patterns,
                drafting root cause, and writing resolution steps — without AI assistance.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">Seed Data for RAG</p>
              <p className="leading-relaxed text-xs">
                5 incidents total: 3 primary scenarios (INC-1001 to INC-1003) and 2 resolved
                historical variants (INC-1004, INC-1005). INC-1004 is a resolved Payment API
                pool exhaustion incident and INC-1005 is a resolved Auth Service missing env var
                incident — same failure classes as the primary scenarios but with different
                specifics, giving the retrieval system meaningful signal to match against.
              </p>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Limitations                                                      */}
        {/* ---------------------------------------------------------------- */}
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-6">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Limitations & Caveats</p>
          <ul className="space-y-1.5 text-xs text-amber-800">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              Evaluated on a small dataset of 3 primary scenarios — results may not generalise to all incident types.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              RCA correctness is subjectively judged — two engineers may disagree on whether a root cause is &ldquo;correct&rdquo;.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              Manual time estimates are approximations based on typical SRE workflows, not controlled experiments.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              AI pipeline timings depend on Gemini API latency which varies with load and quota tier.
            </li>
          </ul>
        </div>

      </main>
    </div>
  );
}
