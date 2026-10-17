"use client";

/**
 * IncidentsContext
 *
 * Provides the shared incidents list across the application.
 * Only fetches after a Supabase session is established so the
 * apiClient has a token to inject into the Authorization header.
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
import { useAuth } from "@/context/AuthContext";

interface IncidentsContextValue {
  incidents: Incident[];
  loading: boolean;
  addIncident: (incident: Incident) => void;
  updateIncident: (incident: Incident) => void;
  refetch: () => void;
}

const IncidentsContext = createContext<IncidentsContextValue | null>(null);

export function IncidentsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getIncidents();
      setIncidents(data);
    } catch (error) {
      console.error("Failed to load incidents:", error);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only fetch once a valid session exists.
  // Re-fetch if the session changes (e.g. user logs in after a timeout).
  useEffect(() => {
    if (!session) {
      // No session yet — reset to empty loading state; proxy will redirect.
      setIncidents([]);
      setLoading(true);
      return;
    }
    loadIncidents();
  }, [session, loadIncidents]);

  const addIncident = useCallback(
    (incident: Incident) => {
      setIncidents((prev) => [incident, ...prev]);
    },
    []
  );

  const updateIncident = useCallback(
    (incident: Incident) => {
      setIncidents((prev) =>
        prev.map((i) =>
          (i.incident_id ?? i.id) === (incident.incident_id ?? incident.id)
            ? { ...i, ...incident }
            : i
        )
      );
    },
    []
  );

  return (
    <IncidentsContext.Provider
      value={{
        incidents,
        loading,
        addIncident,
        updateIncident,
        refetch: loadIncidents,
      }}
    >
      {children}
    </IncidentsContext.Provider>
  );
}

export function useIncidents(): IncidentsContextValue {
  const ctx = useContext(IncidentsContext);

  if (!ctx) {
    throw new Error(
      "useIncidents must be used inside <IncidentsProvider>"
    );
  }

  return ctx;
}
