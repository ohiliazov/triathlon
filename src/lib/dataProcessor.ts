import * as XLSX from "xlsx";

export const VO2 = "VO2";
export const VE_VO2 = "VE/VO2";
export const VE_VCO2 = "VE/VCO2";
export const TIME = "t";
export const TIME_MINUTES = "minutes";
export const VO2_HR = "VO2/HR";
export const VE = "VE_ergo";
export const VCO2 = "VCO2";
export const HR = "HR";
export const SPEED = "Speed";
export const POWER = "Power";
export const VT = "VT";
export const PET_O2 = "PetO2";
export const PET_CO2 = "PetCO2";
export const SP_CO2 = "SpO2";
export const RQ = "RQ";
export const GRADE = "Grade";
export const FAT = "FAT";
export const CHO = "CHO";
export const FAT_PC = "FAT%";
export const CHO_PC = "CHO%";
export const VO2_KG = "VO2/kg";
export const CO = "CO";
export const SV = "SV";
export const EEM = "EEm";
export const TI = "Ti";
export const TE = "Te";
export const RF = "Rf";
export const BR = "BR";
export const VD_VT = "VD/VT e";
export const TTOT = "Ttot";
export const TI_TTOT = "Ti/Ttot";
export const VT_TI = "VT/Ti";
export const HRR = "HRR";

// --- Physiological & Mathematical Constants ---
const SECONDS_IN_MINUTE = 60;
const SECONDS_IN_HOUR = 3600;
const SECONDS_IN_DAY = 86400;
const ML_TO_L_CONVERSION = 1000;
const PERCENT_CONVERSION = 100;

// Frayn Equation (1983) coefficients for substrate oxidation (g/min)
const FRAYN_VO2_COEFF = 1.67;
const FRAYN_VCO2_COEFF = 1.67;
const FRAYN_CHO_VCO2_COEFF = 4.55;
const FRAYN_CHO_VO2_COEFF = 3.21;

// Energy density constants (kcal/g)
const KCAL_PER_GRAM_FAT = 9.0;
const KCAL_PER_GRAM_CHO = 4.0;

// Savitzky-Golay 5-point quadratic filter divisor
const SAVITZKY_GOLAY_DIVISOR = 35;

// Threshold Detection Heuristics
const ROBUST_VERIFICATION_WINDOW_MINUTES = 1.5; // 90 seconds
const ROBUST_NADIR_PEAK_RATIO = 0.8; // 80% of points must follow the trend
const MIN_SEARCH_POINTS_LINEAR_REGRESSION = 20;
const MIN_REQUIRED_POINTS_TREND = 3;
const PEAK_VO2_SEARCH_MARGIN_MINUTES = 1.0;

const VSLOPE_WARMUP_MINUTES = 3.0;
const RC_WARMUP_RQ_THRESHOLD = 0.98;
const RC_WARMUP_DEFAULT_OFFSET_MINUTES = 3.0;
const RC_MAX_SPREAD_MINUTES = 1.5;

// Excel Parsing Constants
const EXCEL_DANE_DATA_START_ROW = 3;
const EXCEL_DANE_HEADER_START_COL = 9;
const EXCEL_WYNIKI_T_ROW_LABEL = "t";
const EXCEL_WYNIKI_AT_COL_INDEX = 5;
const EXCEL_WYNIKI_RC_COL_INDEX = 6;
const EXCEL_WYNIKI_MAX_COL_INDEX = 7;

const FREQUENCY_DETECTION_MAX_SAMPLES = 50;
const MIN_TIME_WARMUP_DEFAULT = 4;
const AT_DETECTION_WARMUP_MIN = 5;

// FatMax Constants
const FATMAX_WARMUP_MINUTES = 2.0;
const FATMAX_WINDOW_SECONDS = 60;
const FATMAX_WINDOW_MAX_POINTS = 40;
const FATMAX_ZONE_THRESHOLD_90 = 0.90;
const FATMAX_ZONE_THRESHOLD_95 = 0.95;
const RQ_AEROBIC_LIMIT = 1.0;
const EXCEL_TIME_THRESHOLD = 1.0;
const GENERAL_SMOOTHING_WINDOW_SECONDS = 40;
const PEAK_VO2_SMOOTHING_WINDOW_SECONDS = 30;
const STEADY_STATE_WINDOW_SECONDS = 30;
const SPEED_CHANGE_THRESHOLD = 0.1;

export const COLUMNS = [
  VO2,
  VE_VO2,
  VE_VCO2,
  VO2_HR,
  VE,
  VCO2,
  HR,
  VT,
  PET_O2,
  PET_CO2,
  SP_CO2,
  RQ,
  SPEED,
  POWER,
  GRADE,
  FAT,
  CHO,
  FAT_PC,
  CHO_PC,
  VO2_KG,
  CO,
  SV,
  EEM,
  TI,
  TE,
  RF,
  BR,
  VD_VT,
  TTOT,
  TI_TTOT,
  VT_TI,
  HRR,
];

function parseTimeValue(val: any): number | null {
  if (val === undefined || val === null) return null;

  if (val instanceof Date) {
    // If it's a Date object, try to extract the duration from it.
    // Excel durations often show up as dates relative to 1899-12-30
    const h = val.getHours();
    const m = val.getMinutes();
    const s = val.getSeconds();
    return h * SECONDS_IN_HOUR + m * SECONDS_IN_MINUTE + s;
  }

  if (typeof val === "number") {
    // Excel time is fraction of day. Convert to seconds.
    // However, some files might have seconds directly.
    // If it's a small number (< 1), it's likely Excel time.
    if (val < EXCEL_TIME_THRESHOLD) {
      return val * SECONDS_IN_DAY;
    }
    return val;
  }

  const s = String(val).trim();
  if (!s) return null;

  if (s.includes(":")) {
    const parts = s.split(":");
    if (parts.length === 3) {
      const h = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      const sec = parseFloat(parts[2]);
      if (!isNaN(h) && !isNaN(m) && !isNaN(sec)) {
        return h * SECONDS_IN_HOUR + m * SECONDS_IN_MINUTE + sec;
      }
    } else if (parts.length === 2) {
      const m = parseInt(parts[0]);
      const sec = parseFloat(parts[1]);
      if (!isNaN(m) && !isNaN(sec)) {
        return m * SECONDS_IN_MINUTE + sec;
      }
    }
  }

  const res = parseFloat(s);
  return isNaN(res) ? null : res;
}

function parseThresholdTime(val: any): number | null {
  const seconds = parseTimeValue(val);
  return seconds !== null ? seconds / SECONDS_IN_MINUTE : null;
}

/**
 * Calculates a centered moving average for a window in seconds.
 */
function centeredMovingAverage(values: (number | null)[], timeDeltas: number, windowSeconds: number): number[] {
  const n = values.length;
  const windowSize = Math.max(1, Math.round(windowSeconds / timeDeltas));
  const halfWindow = Math.floor(windowSize / 2);
  const result = new Array(n);
  const v = values.map(x => x === null ? 0 : x);

  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - halfWindow); j <= Math.min(n - 1, i + halfWindow); j++) {
      sum += v[j];
      count++;
    }
    result[i] = count > 0 ? sum / count : 0;
  }
  return result;
}

/**
 * Calculates a simple linear regression: y = mx + b
 * Returns the slope (m), intercept (b), and sum of squared residuals (ssr).
 */
function linearRegression(x: number[], y: number[]) {
  const n = x.length;
  if (n < 2) return { m: 0, b: 0, ssr: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumXX += x[i] * x[i];
  }

  const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const b = (sumY - m * sumX) / n;

  let ssr = 0;
  for (let i = 0; i < n; i++) {
    const error = y[i] - (m * x[i] + b);
    ssr += error * error;
  }

  return { m, b, ssr };
}

/**
 * 5-point quadratic Savitzky-Golay filter coefficients
 * y[i] = (-3y[i-2] + 12y[i-1] + 17y[i] + 12y[i+1] - 3y[i+2]) / 35
 */
function savitzkyGolay(values: (number | null)[]): number[] {
  const n = values.length;
  const result: number[] = new Array(n).fill(0);
  const v = values.map(val => val || 0);

  for (let i = 0; i < n; i++) {
    if (i < 2 || i > n - 3) {
      // Simple fallback at boundaries
      result[i] = v[i];
      continue;
    }
    result[i] = (-3 * v[i - 2] + 12 * v[i - 1] + 17 * v[i] + 12 * v[i + 1] - 3 * v[i + 2]) / SAVITZKY_GOLAY_DIVISOR;
  }
  return result;
}

export function processLabTestExcel(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  // Thresholds from Wyniki (Official lab data)
  let official_at_min: number | null = null;
  let official_rc_min: number | null = null;
  let official_max_min: number | null = null;
  let official_max_vo2: number | null = null;

  const wynikiSheet = workbook.Sheets["Wyniki"];
  if (wynikiSheet) {
    const wynikiData = XLSX.utils.sheet_to_json(wynikiSheet, { header: 1 }) as any[][];
    const tRow = wynikiData.find((row) => row && String(row[0]).trim() === EXCEL_WYNIKI_T_ROW_LABEL);
    if (tRow) {
      official_at_min = parseThresholdTime(tRow[EXCEL_WYNIKI_AT_COL_INDEX]);
      official_rc_min = parseThresholdTime(tRow[EXCEL_WYNIKI_RC_COL_INDEX]);
      official_max_min = parseThresholdTime(tRow[EXCEL_WYNIKI_MAX_COL_INDEX]);
    }

    const vo2Row = wynikiData.find((row) => row && String(row[0]).trim().toUpperCase() === VO2.toUpperCase());
    if (vo2Row) {
      official_max_vo2 = parseFloat(vo2Row[EXCEL_WYNIKI_MAX_COL_INDEX]);
    }
  }

  // Data from Dane
  const daneSheet = workbook.Sheets["Dane"];
  if (!daneSheet) throw new Error("Sheet 'Dane' not found");
  const daneData = XLSX.utils.sheet_to_json(daneSheet, { header: 1, raw: false }) as any[][];

  if (daneData.length < 1) throw new Error("Sheet 'Dane' is empty");

  const headers = (daneData[0] as string[]).slice(EXCEL_DANE_HEADER_START_COL);
  const rows = daneData.slice(EXCEL_DANE_DATA_START_ROW);

  let processedData = rows
    .map((row) => {
      const obj: any = {};
      headers.forEach((h, i) => {
        const val = row[i + EXCEL_DANE_HEADER_START_COL];
        obj[h] = val;
      });
      return obj;
    })
    .filter((row) => row[headers[0]] !== undefined && row[headers[0]] !== null && row[headers[0]] !== "");

  // Process Time and Numeric conversion
  processedData.forEach((row) => {
    const seconds = parseTimeValue(row[TIME]);
    row[TIME] = seconds;
    row[TIME_MINUTES] = seconds !== null ? seconds / SECONDS_IN_MINUTE : null;

    COLUMNS.forEach((col) => {
      if (col in row && col !== TIME) {
        const val = parseFloat(row[col]);
        row[col] = isNaN(val) ? null : val;
      }
    });
  });

  // Smoothing with Savitzky-Golay filter for clinical signal preservation
  const smoothCols = COLUMNS.filter((c) => c !== SPEED && c !== POWER && c !== GRADE && c !== TIME && c !== TIME_MINUTES);

  // Dynamic frequency detection
  let avgTimeDelta = 1;
  if (processedData.length > 1) {
    const deltas = [];
    for (let i = 1; i < Math.min(processedData.length, FREQUENCY_DETECTION_MAX_SAMPLES); i++) {
      const d = (processedData[i][TIME] || 0) - (processedData[i-1][TIME] || 0);
      if (d > 0) deltas.push(d);
    }
    if (deltas.length > 0) {
      avgTimeDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    }
  }

  smoothCols.forEach((col) => {
    if (!(col in processedData[0])) return;
    const values = processedData.map((d) => d[col]);
    const smoothed = centeredMovingAverage(values, avgTimeDelta, GENERAL_SMOOTHING_WINDOW_SECONDS);
    processedData.forEach((row, i) => {
      row[col] = smoothed[i];
    });
  });

  // Frayn Equation (1983) for Fat and CHO oxidation
  // Recalculating FAT/CHO from VO2 and VCO2 for scientific consistency
  processedData.forEach((row) => {
    const vo2L = (row[VO2] || 0) / ML_TO_L_CONVERSION;
    const vco2L = (row[VCO2] || 0) / ML_TO_L_CONVERSION;

    // Frayn stoichiometry: Fat (g/min) = 1.67*VO2 - 1.67*VCO2, CHO (g/min) = 4.55*VCO2 - 3.21*VO2
    let fatG = FRAYN_VO2_COEFF * vo2L - FRAYN_VCO2_COEFF * vco2L;
    let choG = FRAYN_CHO_VCO2_COEFF * vco2L - FRAYN_CHO_VO2_COEFF * vo2L;

    // Avoid physiologically impossible negative values
    if (fatG < 0) fatG = 0;
    if (choG < 0) choG = 0;

    // Convert to kcal/min (Fat: 9.0 kcal/g, CHO: 4.0 kcal/g)
    row[FAT] = fatG * KCAL_PER_GRAM_FAT;
    row[CHO] = choG * KCAL_PER_GRAM_CHO;
  });

  // Calculate FAT% and CHO%
  processedData.forEach((row) => {
    const total = (row[FAT] || 0) + (row[CHO] || 0);
    if (total > 0) {
      row[FAT_PC] = (row[FAT] / total) * PERCENT_CONVERSION;
      row[CHO_PC] = (row[CHO] / total) * PERCENT_CONVERSION;
    } else {
      row[FAT_PC] = 0;
      row[CHO_PC] = 0;
    }
  });

  // --- Steady State Extraction (Last 30s of each step) ---
  const stepData: any[][] = [];
  if (processedData.length > 0) {
    // Detect whether we are using Speed or Power for step detection
    const hasSpeed = processedData.some(d => (d[SPEED] ?? 0) > 0);
    const hasPower = processedData.some(d => (d[POWER] ?? 0) > 0);
    const stepKey = hasPower && !hasSpeed ? POWER : SPEED;

    let currentStep: any[] = [processedData[0]];
    for (let i = 1; i < processedData.length; i++) {
      const prevVal = processedData[i - 1][stepKey] || 0;
      const currentVal = processedData[i][stepKey] || 0;
      // For Power, we use a slightly larger threshold (e.g. 5W) than Speed (0.1 km/h)
      const threshold = stepKey === POWER ? 5 : SPEED_CHANGE_THRESHOLD;
      if (Math.abs(currentVal - prevVal) > threshold) {
        stepData.push(currentStep);
        currentStep = [];
      }
      currentStep.push(processedData[i]);
    }
    stepData.push(currentStep);
  }

  const steadyStateData = stepData
    .map((step) => {
      if (step.length === 0) return null;
      const lastPoint = step[step.length - 1];
      const startTime = (lastPoint[TIME] || 0) - STEADY_STATE_WINDOW_SECONDS;
      const windowPoints = step.filter((p) => (p[TIME] || 0) >= startTime);
      if (windowPoints.length === 0) return null;

      const averagedPoint: any = { ...windowPoints[windowPoints.length - 1] };
      COLUMNS.forEach((col) => {
        // Don't average time, speed, power, grade
        if (col === TIME || col === TIME_MINUTES || col === SPEED || col === POWER || col === GRADE) return;
        const values = windowPoints.map((p) => p[col]).filter((v) => v !== null && v !== undefined);
        if (values.length > 0) {
          averagedPoint[col] = values.reduce((a, b) => a + b, 0) / values.length;
        }
      });
      return averagedPoint;
    })
    .filter((p) => p !== null);

  // --- Advanced Physiological Threshold Detection (Gold Standard Heuristics) ---

  // VO2 series after global smoothing (40s centered) for robust peak/official mapping
  const vo2Series: number[] = processedData.map(d => (d[VO2] ?? 0));

  // 1) Calculated peak VO2 time (ignore first warmup minutes)
  let calculated_peak_vo2_min = 0;
  let max_vo2_found = -Infinity;
  for (let i = 0; i < vo2Series.length; i++) {
    const tMin = processedData[i][TIME_MINUTES];
    const v = vo2Series[i];
    if (tMin <= MIN_TIME_WARMUP_DEFAULT) continue;
    if (v > max_vo2_found) {
      max_vo2_found = v;
      calculated_peak_vo2_min = tMin;
    }
  }

  // 2) If the official VO2max value is present (e.g., 4133 ml/min),
  //    find the time where smoothed VO2 is closest to that value.
  let official_vo2_matched_time: number | null = null;
  if (official_max_vo2 && !isNaN(official_max_vo2)) {
    let minDiff = Infinity;
    for (let i = 0; i < vo2Series.length; i++) {
      const tMin = processedData[i][TIME_MINUTES];
      if (tMin <= MIN_TIME_WARMUP_DEFAULT) continue;
      const diff = Math.abs(vo2Series[i] - official_max_vo2);
      if (diff < minDiff) {
        minDiff = diff;
        official_vo2_matched_time = tMin;
      }
    }
  }

  // Precedence for final Max time:
  // - If official VO2 value exists, use the matched time from VO2 series
  // - else if official Max time exists in Wyniki, use it
  // - else fall back to calculated peak time
  const final_max = (official_vo2_matched_time ?? official_max_min ?? calculated_peak_vo2_min) as number;

  /**
   * Helper: Find a nadir with sustained rise (at least 60-90s)
   */
  const findRobustNadir = (key: string, warmupMin: number = MIN_TIME_WARMUP_DEFAULT) => {
    let minVal = Infinity;
    let bestNadirTime = null;
    const requiredPoints = Math.max(MIN_REQUIRED_POINTS_TREND, Math.floor(SECONDS_IN_MINUTE / avgTimeDelta));

    for (let i = 0; i < processedData.length; i++) {
      if (processedData[i][TIME_MINUTES] < warmupMin) continue;
      if (processedData[i][TIME_MINUTES] > final_max - PEAK_VO2_SEARCH_MARGIN_MINUTES) break;
      const val = processedData[i][key];
      if (val !== null && val < minVal) {
        // Check if it's a true nadir: next 90s should be consistently higher
        let higherCount = 0;
        let totalCount = 0;
        for (let j = i + 1; j < processedData.length; j++) {
          if (processedData[j][TIME_MINUTES] > processedData[i][TIME_MINUTES] + ROBUST_VERIFICATION_WINDOW_MINUTES) break;
          totalCount++;
          if (processedData[j][key] >= val) higherCount++;
        }

        if (totalCount >= requiredPoints && higherCount / totalCount > ROBUST_NADIR_PEAK_RATIO) {
          minVal = val;
          bestNadirTime = processedData[i][TIME_MINUTES];
        }
      }
    }
    return bestNadirTime;
  };

  /**
   * Helper: Find a peak with sustained fall (at least 60-90s)
   */
  const findRobustPeak = (key: string, warmupMin: number = MIN_TIME_WARMUP_DEFAULT) => {
    let maxVal = -Infinity;
    let bestPeakTime = null;
    const requiredPoints = Math.max(MIN_REQUIRED_POINTS_TREND, Math.floor(SECONDS_IN_MINUTE / avgTimeDelta));

    for (let i = 0; i < processedData.length; i++) {
      if (processedData[i][TIME_MINUTES] < warmupMin) continue;
      if (processedData[i][TIME_MINUTES] > final_max - PEAK_VO2_SEARCH_MARGIN_MINUTES) break;
      const val = processedData[i][key];
      if (val !== null && val > maxVal) {
        // Check if it's a true peak: next 90s should be consistently lower
        let lowerCount = 0;
        let totalCount = 0;
        for (let j = i + 1; j < processedData.length; j++) {
          if (processedData[j][TIME_MINUTES] > processedData[i][TIME_MINUTES] + ROBUST_VERIFICATION_WINDOW_MINUTES) break;
          totalCount++;
          if (processedData[j][key] <= val) lowerCount++;
        }

        if (totalCount >= requiredPoints && lowerCount / totalCount > ROBUST_NADIR_PEAK_RATIO) {
          maxVal = val;
          bestPeakTime = processedData[i][TIME_MINUTES];
        }
      }
    }
    return bestPeakTime;
  };

  // 1. Aerobic Threshold (AT / VT1) - Consensus Approach

  // A. True V-Slope Method (Piecewise Linear Regression of VCO2 vs VO2)
  let vslope_at_min = null;
  const atSearchData = processedData.filter(d => d[TIME_MINUTES] >= VSLOPE_WARMUP_MINUTES && d[TIME_MINUTES] <= final_max);
  if (atSearchData.length > MIN_SEARCH_POINTS_LINEAR_REGRESSION) {
    const x = atSearchData.map(d => d[VO2] || 0);
    const y = atSearchData.map(d => d[VCO2] || 0);
    let minError = Infinity;
    let bestIdx = -1;

    // Search middle 80% for the break point
    const startIdx = Math.floor(atSearchData.length * 0.1);
    const endIdx = Math.floor(atSearchData.length * 0.9);

    for (let i = startIdx; i < endIdx; i++) {
      const left = linearRegression(x.slice(0, i + 1), y.slice(0, i + 1));
      const right = linearRegression(x.slice(i), y.slice(i));

      // Second slope must be steeper (VCO2 increases faster than VO2)
      // For AT, the slope transitions from roughly 0.8-0.9 to > 1.0
      if (right.m > left.m) {
        const totalError = left.ssr + right.ssr;
        if (totalError < minError) {
          minError = totalError;
          bestIdx = i;
        }
      }
    }
    if (bestIdx !== -1) vslope_at_min = atSearchData[bestIdx][TIME_MINUTES];
  }

  // B. Ventilatory Equivalent Method (Nadir of VE/VO2)
  const ve_vo2_nadir = findRobustNadir(VE_VO2, AT_DETECTION_WARMUP_MIN);

  // Consensus AT: Average available markers
  let calculated_at_min = null;
  const atMarkers = [vslope_at_min, ve_vo2_nadir].filter(m => m !== null) as number[];
  console.log(`AT Markers: vslope_at_min=${vslope_at_min}, ve_vo2_nadir=${ve_vo2_nadir}`);
  if (atMarkers.length > 0) {
    calculated_at_min = atMarkers.reduce((a, b) => a + b, 0) / atMarkers.length;
  }

  // 2. Respiratory Compensation Point (RC / VT2) - Multi-Factor Consensus

  // RC markers typically occur at higher intensity (RQ >= 0.98 or well after AT)
  const rcWarmup = processedData.find(d => d[RQ] !== null && d[RQ] >= RC_WARMUP_RQ_THRESHOLD)?.[TIME_MINUTES] || ((calculated_at_min || 0) + RC_WARMUP_DEFAULT_OFFSET_MINUTES);
  console.log(`rcWarmup: ${rcWarmup}`);

  // A. Ventilatory Equivalent Nadir (VE/VCO2)
  const ve_vco2_nadir = findRobustNadir(VE_VCO2, rcWarmup);

  // B. End-Tidal CO2 Peak (PetCO2)
  const petco2_peak_min = findRobustPeak(PET_CO2, rcWarmup);

  // C. VE vs VCO2 Linearity Loss
  let ve_vco2_break_min = null;
  const rcSearchData = processedData.filter(d => d[TIME_MINUTES] >= rcWarmup && d[TIME_MINUTES] <= final_max);
  if (rcSearchData.length > MIN_SEARCH_POINTS_LINEAR_REGRESSION) {
    const x = rcSearchData.map(d => d[VCO2] || 0);
    const y = rcSearchData.map(d => d[VE] || 0);
    let minError = Infinity;
    let bestIdx = -1;
    for (let i = Math.floor(rcSearchData.length * 0.1); i < Math.floor(rcSearchData.length * 0.9); i++) {
      const left = linearRegression(x.slice(0, i + 1), y.slice(0, i + 1));
      const right = linearRegression(x.slice(i), y.slice(i));
      if (right.m > left.m) {
        const totalError = left.ssr + right.ssr;
        if (totalError < minError) {
          minError = totalError;
          bestIdx = i;
        }
      }
    }
    if (bestIdx !== -1) ve_vco2_break_min = rcSearchData[bestIdx][TIME_MINUTES];
  }

  // Consensus RC: Average available markers
  let calculated_rc_min = null;
  const rcMarkers = [ve_vco2_nadir, petco2_peak_min, ve_vco2_break_min].filter(m => m !== null) as number[];

  console.log(`RC Markers: ve_vco2_nadir=${ve_vco2_nadir}, petco2_peak_min=${petco2_peak_min}, ve_vco2_break_min=${ve_vco2_break_min}`);

  if (rcMarkers.length > 0) {
    const avgRc = rcMarkers.reduce((a, b) => a + b, 0) / rcMarkers.length;
    const spread = Math.max(...rcMarkers) - Math.min(...rcMarkers);
    if (spread < RC_MAX_SPREAD_MINUTES) { // Within spread limit
      calculated_rc_min = avgRc;
    } else {
      // High spread: choose the marker closest to the time where RQ ≈ 1.0 (physiological RC vicinity)
      let rqTargetMin = rcWarmup;
      let bestDiff = Infinity;
      for (let i = 0; i < processedData.length; i++) {
        const tMin = processedData[i][TIME_MINUTES];
        if (tMin < rcWarmup || tMin > final_max) continue;
        const rqVal = processedData[i][RQ];
        if (rqVal == null) continue;
        const diff = Math.abs(rqVal - 1.0);
        if (diff < bestDiff) {
          bestDiff = diff;
          rqTargetMin = tMin;
        }
      }
      // pick rc marker with minimal time distance to rqTargetMin
      let bestMarker = rcMarkers[0];
      let bestTimeDiff = Math.abs(rcMarkers[0] - rqTargetMin);
      for (let i = 1; i < rcMarkers.length; i++) {
        const d = Math.abs(rcMarkers[i] - rqTargetMin);
        if (d < bestTimeDiff) {
          bestTimeDiff = d;
          bestMarker = rcMarkers[i];
        }
      }
      calculated_rc_min = bestMarker;
    }
  }

  // 3. Fatmax Detection
  // We look for the peak fat oxidation, but only while RQ < 1.0
  let fatmax_absolute_peak = 0;
  let fatmax_min = 0;
  let fatmax_hr = 0;

  // Create a highly smoothed version of the FAT array specifically for curve detection
  // We use a larger window (e.g., 60-90 seconds) to simulate a polynomial curve fit
  const fatWindowSize = Math.max(5, Math.min(Math.round(FATMAX_WINDOW_SECONDS / avgTimeDelta), FATMAX_WINDOW_MAX_POINTS));
  const rawFat = processedData.map(d => d[FAT] || 0);

  const heavilySmoothedFat = rawFat.map((_, i) => {
    let sum = 0;
    let count = 0;
    const half = Math.floor(fatWindowSize / 2);
    for (let j = Math.max(0, i - half); j <= Math.min(rawFat.length - 1, i + half); j++) {
      // Only include points where RQ is strictly in the aerobic zone (< 1.0)
      if (processedData[j][RQ] !== null && processedData[j][RQ] < RQ_AEROBIC_LIMIT) {
          sum += rawFat[j];
          count++;
      }
    }
    return count > 0 ? sum / count : 0;
  });

  // Find the absolute apex of this smoothed curve
  heavilySmoothedFat.forEach((fatValue, i) => {
    // Ignore the first minutes (warmup noise)
    if (processedData[i][TIME_MINUTES] > FATMAX_WARMUP_MINUTES && fatValue > fatmax_absolute_peak) {
      fatmax_absolute_peak = fatValue;
      fatmax_min = processedData[i][TIME_MINUTES];
      fatmax_hr = processedData[i][HR];
    }
  });

  // Find the Fatmax Zone (Heart rate range where fat oxidation is >= 90% and >= 95% of absolute peak)
  const threshold90 = fatmax_absolute_peak * FATMAX_ZONE_THRESHOLD_90;
  const threshold95 = fatmax_absolute_peak * FATMAX_ZONE_THRESHOLD_95;
  let fatMaxZoneStartHr = null as number | null;
  let fatMaxZoneEndHr = null as number | null;
  let fatMaxZone95StartHr = null as number | null;
  let fatMaxZone95EndHr = null as number | null;

  heavilySmoothedFat.forEach((fatValue, i) => {
    if (processedData[i][TIME_MINUTES] <= FATMAX_WARMUP_MINUTES) return;
    const hrVal = processedData[i][HR];
    if (fatValue >= threshold90) {
      if (fatMaxZoneStartHr === null) fatMaxZoneStartHr = hrVal;
      fatMaxZoneEndHr = hrVal; // Continually updates until it drops below 90%
    }
    if (fatValue >= threshold95) {
      if (fatMaxZone95StartHr === null) fatMaxZone95StartHr = hrVal;
      fatMaxZone95EndHr = hrVal; // Continually updates until it drops below 95%
    }
  });

  // --- Final Threshold Consensus & Fallback logic ---
  // If official data is missing, use calculated data as official.
  const final_at = official_at_min !== null ? official_at_min : calculated_at_min;
  const final_rc = official_rc_min !== null ? official_rc_min : calculated_rc_min;

  return {
    data: processedData,
    steadyStateData: steadyStateData,
    thresholds: {
      at: final_at,
      rc: final_rc,
      max: final_max,
      calculatedAt: (calculated_at_min !== null && final_at !== null && Math.abs(calculated_at_min - final_at) > 0.01) ? calculated_at_min : null,
      calculatedRc: (calculated_rc_min !== null && final_rc !== null && Math.abs(calculated_rc_min - final_rc) > 0.01) ? calculated_rc_min : null,
      calculatedMax: (calculated_peak_vo2_min !== null && final_max !== null && Math.abs(calculated_peak_vo2_min - final_max) > 0.01) ? calculated_peak_vo2_min : null,
      fatMax: fatmax_min,
      fatMaxHr: fatmax_hr,
      fatMaxZoneStartHr,
      fatMaxZoneEndHr,
      fatMaxZone95StartHr,
      fatMaxZone95EndHr,
    },
  };
}
