/**
 * pdfReport.ts — generates a downloadable PDF from a ReportResult + Incident.
 *
 * Uses jsPDF (client-side only — must be called from a "use client" component
 * or browser event handler, never from a Server Component).
 */

import type { ReportResult } from "@/types/incident";

export interface ReportMeta {
  incidentId: string;
  title: string;
  service: string;
  severity: string;
  status: string;
  createdAt: string;
  organizationName?: string;
}

export async function downloadReportAsPDF(
  report: ReportResult,
  meta: ReportMeta
): Promise<void> {
  // Dynamic import keeps jsPDF out of the server bundle
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  // ── Colours ──────────────────────────────────────────────────────────────
  const navy  = [30, 41, 59]  as [number, number, number];  // slate-800
  const indigo = [79, 70, 229] as [number, number, number]; // indigo-600
  const slate  = [100, 116, 139] as [number, number, number];
  const white  = [255, 255, 255] as [number, number, number];

  // ── Header bar ───────────────────────────────────────────────────────────
  doc.setFillColor(...navy);
  doc.rect(0, 0, pageW, 22, "F");

  doc.setTextColor(...white);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("IIMP — Incident Post-Mortem Report", margin, 14);

  if (meta.organizationName) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(meta.organizationName, pageW - margin, 14, { align: "right" });
  }

  y = 30;

  // ── Incident ID + title ───────────────────────────────────────────────────
  doc.setTextColor(...indigo);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(meta.incidentId, margin, y);

  y += 6;
  doc.setTextColor(...navy);
  doc.setFontSize(14);
  doc.text(meta.title, margin, y, { maxWidth: contentW });

  y += 10;

  // ── Metadata grid ─────────────────────────────────────────────────────────
  const metaItems = [
    ["Service",  meta.service],
    ["Severity", meta.severity],
    ["Status",   meta.status],
    ["Created",  new Date(meta.createdAt).toLocaleString()],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [],
    body: metaItems,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: slate, cellWidth: 28 },
      1: { textColor: navy },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Section helper ────────────────────────────────────────────────────────
  function addSection(title: string, content: string | string[]) {
    // Page break if needed
    if (y > 260) { doc.addPage(); y = margin; }

    doc.setFillColor(...indigo);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setTextColor(...white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), margin + 3, y + 5);
    y += 10;

    doc.setTextColor(...navy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    if (Array.isArray(content)) {
      content.forEach((item) => {
        if (y > 270) { doc.addPage(); y = margin; }
        const lines = doc.splitTextToSize(`• ${item}`, contentW - 4);
        doc.text(lines, margin + 3, y);
        y += lines.length * 5 + 1;
      });
    } else {
      const lines = doc.splitTextToSize(content, contentW - 4);
      doc.text(lines, margin + 3, y);
      y += lines.length * 5;
    }
    y += 6;
  }

  // ── Report sections ───────────────────────────────────────────────────────
  addSection("Executive Summary",   report.executive_summary);
  addSection("What Happened",       report.what_happened);
  addSection("Root Cause",          report.root_cause);
  addSection("Severity Assessment", report.severity_assessment);
  addSection("Estimated Impact",    report.estimated_impact);
  addSection("Evidence",            report.evidence);
  addSection("Resolution Steps",    report.resolution_steps_taken);
  addSection("Prevention Recommendations", report.prevention_recommendations);

  if (report.similar_incidents_referenced?.length) {
    addSection("Similar Incidents Referenced", report.similar_incidents_referenced);
  }

  // ── Footer on every page ─────────────────────────────────────────────────
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(0, 287, pageW, 10, "F");
    doc.setTextColor(...slate);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(
      `IIMP Confidential — ${meta.incidentId} — Generated ${new Date().toLocaleString()}`,
      margin,
      293
    );
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, 293, { align: "right" });
  }

  // ── Download ──────────────────────────────────────────────────────────────
  doc.save(`${meta.incidentId}-report.pdf`);
}
