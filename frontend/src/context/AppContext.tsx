"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { ProcessedActivity } from "@/lib/fitProcessor";
import type { UserHRSettings } from "@/types/hrZones";

export interface LabTestDataPoint {
  [key: string]: any;
}

export interface LabTestThresholds {
  at: number | null;
  rc: number | null;
  max: number | null;
  calculatedAt?: number | null;
  calculatedRc?: number | null;
  calculatedMax?: number | null;
  fatMax?: number;
  fatMaxHr?: number;
  fatMaxZoneStartHr?: number | null;
  fatMaxZoneEndHr?: number | null;
  fatMaxZone95StartHr?: number | null;
  fatMaxZone95EndHr?: number | null;
}

export interface LabTestPayload {
  data: LabTestDataPoint[];
  steadyStateData: LabTestDataPoint[];
  thresholds: LabTestThresholds;
}

interface AppContextType {
  labTestData: LabTestPayload | null;
  setLabTestData: (data: LabTestPayload | null) => void;
  activityData: ProcessedActivity | null;
  setActivityData: (data: ProcessedActivity | null) => void;
  userHRSettings: UserHRSettings | null;
  setUserHRSettings: (s: UserHRSettings | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LS_KEY = "vg_user_hr_settings_v1";

export function AppProvider({ children }: { children: ReactNode }) {
  const [labTestData, setLabTestData] = useState<LabTestPayload | null>(null);
  const [activityData, setActivityData] = useState<ProcessedActivity | null>(
    null,
  );
  const [userHRSettings, setUserHRSettings] = useState<UserHRSettings | null>(
    null,
  );

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UserHRSettings;
        setUserHRSettings(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist to localStorage when settings change
  useEffect(() => {
    try {
      if (userHRSettings) {
        localStorage.setItem(LS_KEY, JSON.stringify(userHRSettings));
      } else {
        localStorage.removeItem(LS_KEY);
      }
    } catch {
      // ignore
    }
  }, [userHRSettings]);

  return (
    <AppContext.Provider
      value={{
        labTestData,
        setLabTestData,
        activityData,
        setActivityData,
        userHRSettings,
        setUserHRSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
