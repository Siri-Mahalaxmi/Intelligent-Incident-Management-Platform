"use client";

/**
 * IncidentsContext
 *
 * Provides a shared incidents list across the app so that a newly created
 * incident on the dashboard is immediately visible without a full page reload.
 *
 * When the real API is ready, replace the `getIncidents()` call here and the
 * `createIncident()` call in the form — the context shape stays the same.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Incident } from "@/types/incident";
import { getIncidents } from "@/services/incidentsService";

interface IncidentsContextValue {
  incidents: Incident[];
  loading: boolean;
  /** Call this after a successful createIncident() to prepend the new incident */
  addIncident: (incident: Incident) => void;
}

const IncidentsContext = createContext<IncidentsContextValue | null>(null);

export function IncidentsProvider({ children }: { children: React.ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIncidents().then((data) => {
      setIncidents(data);
      setLoading(false);
    });
  }, []);

  const addIncident = useCallback((incident: Incident) => {
    setIncidents((prev) => [incident, ...prev]);
  }, []);

  return (
    <IncidentsContext.Provider value={{ incidents, loading, addIncident }}>
      {children}
    </IncidentsContext.Provider>
  );
}

export function useIncidents(): IncidentsContextValue {
  const ctx = useContext(IncidentsContext);
  if (!ctx) throw new Error("useIncidents must be used inside <IncidentsProvider>");
  return ctx;
}
