"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { ProcessedActivity } from "@/lib/fitProcessor";

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [labTestData, setLabTestData] = useState<LabTestPayload | null>(null);
  const [activityData, setActivityData] = useState<ProcessedActivity | null>(
    null,
  );

  return (
    <AppContext.Provider
      value={{
        labTestData,
        setLabTestData,
        activityData,
        setActivityData,
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
