"use client";

/**
 * /incidents — full incident list page (organization-scoped).
 * Reuses the same data from IncidentsContext.
 */

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function IncidentsPage() {
  const router = useRouter();
  // Redirect to the dashboard which has the full incident table
  useEffect(() => { router.replace("/"); }, [router]);
  return null;
}
