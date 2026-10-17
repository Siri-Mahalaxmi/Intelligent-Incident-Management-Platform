"use client";

/**
 * Metrics page — inside the authenticated shell.
 * Same evaluation data as before; replaces the standalone header with
 * the shared TopBar so it sits correctly inside the sidebar layout.
 */

import Link from "next/link";
import TopBar from "@/components/TopBar";

const SCENARIOS = [
  {
    incident_id: "INC-1001",
    title: "Payment API — DB Connection Pool Exhausted",
    service: "Payment API",
    severity: "CRITICAL",
    retrieval: {
      top3_correct: 2,
      top3_total: 2,
      top_similarity: 0.94,
      notes: "INC-1004 (Payment API pool exhaustion under flash sale) retrieved correctly at 0.94 similarity. Only 2 RAG corpus incidents exist for this service — both matched.",
    },
    rca: {
      root_cause_correct: true,
      contributing_factors_correct: 3,
      contributing_factors_total: 3,
      confidence: 0.88,
      ground_truth: "Database connection pool reached max capacity due to long-running queries holding connections under traffic spike.",
      ai_output: "The Payment API exhausted its database connection pool because sustained high traffic caused long-running queries to hold connections beyond the pool limit, preventing new requests from acquiring connections.",
      verdict: "Correct — AI correctly identified pool exhaustion under load as root cause.",
    },
    timing: { manual_estimate_minutes: 25, ai_analysis_seconds: 4.2, ai_rca_seconds: 6.1, ai_report_seconds: 5.8, ai_total_seconds: 16.1 },
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
      notes: "No strong matches — INC-1004 and INC-1005 are Payment API and Auth Service variants, not Checkout Service. Retrieval correctly returned low similarity scores.",
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
    timing: { manual_estimate_minutes: 30, ai_analysis_seconds: 3.9, ai_rca_seconds: 7.2, ai_report_seconds: 6.4, ai_total_seconds: 17.5 },
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
      notes: "INC-1005 (Auth Service missing env var after deployment) retrieved at 0.97 similarity — near-perfect match.",
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
    timing: { manual_estimate_minutes: 15, ai_analysis_seconds: 3.1, ai_rca_seconds: 5.4, ai_report_seconds: 4.9, ai_total_seconds: 13.4 },
  },
];

const totalScenarios = SCENARIOS.length;
const rcaCorrect = SCENARIOS.filter((s) => s.rca.root_cause_correct).length;
const avgRetrievalAccuracy = SCENARIOS.reduce((sum, s) => sum + s.retrieval.top3_correct / s.retrieval.top3_total, 0) / totalScenarios;
const avgAiTotalSeconds = SCENARIOS.reduce((sum, s) => sum + s.timing.ai_total_seconds, 0) / totalScenarios;
const avgManualMinutes = SCENARIOS.reduce((sum, s) => sum + s.timing.manual_estimate_minutes, 0) / totalScenarios;
const avgRcaConfidence = SCENARIOS.reduce((sum, s) => sum + s.rca.confidence, 0) / totalScenarios;
const speedupFactor = Math.round((avgManualMinutes * 60) / avgAiTotalSeconds);

function pct(n: number) { return `${Math.round(n * 100)}%`; }

function AggCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className={`rounded-xl ring-1 p-5 ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</p>
      <p className="text-3xl font-bold tabular-nums text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

export default function MetricsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />

      <main className="px-6 py-6 space-y-8 max-w-6xl">

        <div>
          <h1 className="text-xl font-semibold text-slate-900">System Evaluation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Evaluated on {totalScenarios} incident scenarios across 3 distinct failure types.
            AI pipeline timings measured end-to-end. RCA correctness judged against hand-written ground truth.
          </p>
        </div>

        {/* Aggregate stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <AggCard label="Retrieval Accuracy" value={pct(avgRetrievalAccuracy)} sub={`avg top-3 precision`} accent="ring-indigo-100 bg-indigo-50" />
          <AggCard label="RCA Correctness" value={`${rcaCorrect}/${totalScenarios}`} sub="matched ground truth" accent="ring-emerald-100 bg-emerald-50" />
          <AggCard label="Avg RCA Confidence" value={pct(avgRcaConfidence)} sub="Agent 2 mean score" accent="ring-violet-100 bg-violet-50" />
          <AggCard label="Avg AI Pipeline" value={`${avgAiTotalSeconds.toFixed(1)}s`} sub="analyze + rca + report" accent="ring-amber-100 bg-amber-50" />
          <AggCard label="Speed-up vs Manual" value={`${speedupFactor}×`} sub={`vs ~${Math.round(avgManualMinutes)} min manual`} accent="ring-rose-100 bg-rose-50" />
        </div>

        {/* Per-scenario cards */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Per-Scenario Breakdown</h2>
          <div className="space-y-5">
            {SCENARIOS.map((s) => (
              <div key={s.incident_id} className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-semibold text-slate-500">{s.incident_id}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.severity === "CRITICAL" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>{s.severity}</span>
                    <span className="text-sm font-semibold text-slate-800">{s.title}</span>
                  </div>
                  <Link href={`/incidents/${s.incident_id}`} className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex-shrink-0">View incident →</Link>
                </div>

                <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                  {/* Retrieval */}
                  <div className="px-6 py-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">RAG Retrieval</p>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-2xl font-bold text-indigo-700">{s.retrieval.top3_correct}/{s.retrieval.top3_total}</span>
                      <span className="text-sm text-slate-500 pb-0.5">correct in top-3</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${(s.retrieval.top3_correct / s.retrieval.top3_total) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-indigo-700">{pct(s.retrieval.top3_correct / s.retrieval.top3_total)}</span>
                    </div>
                    <p className="text-xs text-slate-500">Top similarity: <span className="font-semibold text-slate-700">{pct(s.retrieval.top_similarity)}</span></p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{s.retrieval.notes}</p>
                  </div>

                  {/* RCA */}
                  <div className="px-6 py-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">RCA Correctness</p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${s.rca.root_cause_correct ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          {s.rca.root_cause_correct ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />}
                        </svg>
                        Root cause {s.rca.root_cause_correct ? "correct" : "incorrect"}
                      </span>
                      <span className="text-xs text-slate-500">{s.rca.contributing_factors_correct}/{s.rca.contributing_factors_total} factors</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${s.rca.confidence * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-violet-700">{pct(s.rca.confidence)} conf.</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-400 mb-1">Verdict</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{s.rca.verdict}</p>
                  </div>

                  {/* Timing */}
                  <div className="px-6 py-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Analysis Time</p>
                    <div className="space-y-2 mb-3">
                      {[
                        { label: "Analyze (Agent 1)", value: s.timing.ai_analysis_seconds, color: "bg-indigo-400" },
                        { label: "RCA (Agents 2+3)",  value: s.timing.ai_rca_seconds,      color: "bg-rose-400"   },
                        { label: "Report (Agent 4)",  value: s.timing.ai_report_seconds,    color: "bg-amber-400"  },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-28 flex-shrink-0">{row.label}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-1.5 rounded-full ${row.color}`} style={{ width: `${(row.value / 10) * 100}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 w-10 text-right">{row.value}s</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-500">AI total</span>
                      <span className="text-sm font-bold text-amber-700">{s.timing.ai_total_seconds}s</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-slate-500">Manual est.</span>
                      <span className="text-xs font-semibold text-slate-500">~{s.timing.manual_estimate_minutes} min</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-slate-500">Speed-up</span>
                      <span className="text-xs font-bold text-rose-600">{Math.round((s.timing.manual_estimate_minutes * 60) / s.timing.ai_total_seconds)}×</span>
                    </div>
                  </div>
                </div>

                {/* Ground truth */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Ground Truth vs AI Output</p>
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

        {/* Limitations */}
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-5">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Limitations &amp; Caveats</p>
          <ul className="space-y-1.5 text-xs text-amber-800">
            {[
              "Evaluated on a small dataset of 3 primary scenarios — results may not generalise to all incident types.",
              "RCA correctness is subjectively judged — two engineers may disagree on whether a root cause is correct.",
              "Manual time estimates are approximations based on typical SRE workflows, not controlled experiments.",
              "AI pipeline timings depend on Gemini API latency which varies with load and quota tier.",
            ].map((note) => (
              <li key={note} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
