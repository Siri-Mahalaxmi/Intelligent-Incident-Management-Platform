"use client";

import TopBar from "@/components/TopBar";
import Link from "next/link";

export default function AdminMetricsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />
      <main className="px-6 py-6">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Metrics</h1>
        <p className="text-sm text-slate-500 mb-6">Platform-wide performance and evaluation metrics.</p>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-8 text-center">
          <p className="text-sm text-slate-500 mb-3">Evaluation metrics are available in the organization metrics view.</p>
          <Link href="/metrics" className="text-sm text-indigo-600 hover:underline">View Evaluation Metrics →</Link>
        </div>
      </main>
    </div>
  );
}
