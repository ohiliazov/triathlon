export type HRZoneMethod = "LAB_TEST" | "LTHR" | "HRR" | "%MAX" | "AGE";

export interface HRZoneRange {
  name: "Z1" | "Z2" | "Z3" | "Z4" | "Z5";
  low: number; // inclusive, bpm
  high: number; // inclusive, bpm
}

export interface HRThresholdMarkers {
  fatMax?: number | null; // bpm at maximal fat oxidation (FatMax)
  lt1?: number | null; // Lactate Threshold 1 (AT)
  lt2?: number | null; // Lactate Threshold 2 (RCP)
}

export interface LabTestConfig extends HRThresholdMarkers {
  z1End: number;
  lt1: number;
  lt2: number;
  maxHr: number;
}

export interface LTHRConfig {
  lthr: number; // bpm
}

export interface HRRConfig {
  maxHr: number; // bpm
  restingHr: number; // bpm
}

export interface MaxHrConfig {
  maxHr: number; // bpm
}

export interface AgeBasedConfig {
  dobISO?: string; // YYYY-MM-DD
}

export type HRZonesInput =
  | { method: "LAB_TEST"; payload: LabTestConfig }
  | { method: "LTHR"; payload: LTHRConfig }
  | { method: "HRR"; payload: HRRConfig }
  | { method: "%MAX"; payload: MaxHrConfig }
  | { method: "AGE"; payload: AgeBasedConfig };

export interface ComputedHRZones {
  method: HRZoneMethod;
  zones: HRZoneRange[]; // computed or manual
  thresholds?: HRThresholdMarkers; // present when available
  meta?: {
    base?: number; // LTHR / Max / derived Max from age depending on method
  };
}

export interface UserHRSettings {
  input: HRZonesInput;
  computed?: ComputedHRZones;
}
