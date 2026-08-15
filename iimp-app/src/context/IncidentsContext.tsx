"use client";

/**
 * IncidentsContext
 *
 * Provides the shared incidents list across the application.
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
  addIncident: (incident: Incident) => void;
}

const IncidentsContext =
  createContext<IncidentsContextValue | null>(null);

export function IncidentsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadIncidents() {
      try {
        const data = await getIncidents();

        if (mounted) {
          setIncidents(data);
        }
      } catch (error) {
        console.error(
          "Failed to load incidents:",
          error
        );

        if (mounted) {
          setIncidents([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadIncidents();

    return () => {
      mounted = false;
    };
  }, []);

  const addIncident = useCallback(
    (incident: Incident) => {
      setIncidents((prev) => [
        incident,
        ...prev,
      ]);
    },
    []
  );

  return (
    <IncidentsContext.Provider
      value={{
        incidents,
        loading,
        addIncident,
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