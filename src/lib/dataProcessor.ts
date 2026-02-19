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
    return h * 3600 + m * 60 + s;
  }

  if (typeof val === "number") {
    // Excel time is fraction of day. Convert to seconds.
    // However, some files might have seconds directly.
    // If it's a small number (< 1), it's likely Excel time.
    if (val < 1) {
      return val * 86400;
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
        return h * 3600 + m * 60 + sec;
      }
    } else if (parts.length === 2) {
      const m = parseInt(parts[0]);
      const sec = parseFloat(parts[1]);
      if (!isNaN(m) && !isNaN(sec)) {
        return m * 60 + sec;
      }
    }
  }

  const res = parseFloat(s);
  return isNaN(res) ? null : res;
}

function parseThresholdTime(val: any): number | null {
  const seconds = parseTimeValue(val);
  return seconds !== null ? seconds / 60 : null;
}

export function processLabTestExcel(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  // Thresholds from Wyniki
  let at_min = 8.0;
  let rc_min = 13.67;
  let max_min = 18.0;
  const wynikiSheet = workbook.Sheets["Wyniki"];
  if (wynikiSheet) {
    const wynikiData = XLSX.utils.sheet_to_json(wynikiSheet, { header: 1 }) as any[][];
    const tRow = wynikiData.find((row) => row && String(row[0]).trim() === "t");
    if (tRow) {
      at_min = parseThresholdTime(tRow[5]) || at_min;
      rc_min = parseThresholdTime(tRow[6]) || rc_min;
      max_min = parseThresholdTime(tRow[7]) || max_min;
    }
  }

  // Data from Dane
  const daneSheet = workbook.Sheets["Dane"];
  if (!daneSheet) throw new Error("Sheet 'Dane' not found");
  const daneData = XLSX.utils.sheet_to_json(daneSheet, { header: 1, raw: false }) as any[][];

  if (daneData.length < 1) throw new Error("Sheet 'Dane' is empty");

  const headers = (daneData[0] as string[]).slice(9);
  const rows = daneData.slice(3);

  let processedData = rows
    .map((row) => {
      const obj: any = {};
      headers.forEach((h, i) => {
        const val = row[i + 9];
        obj[h] = val;
      });
      return obj;
    })
    .filter((row) => row[headers[0]] !== undefined && row[headers[0]] !== null && row[headers[0]] !== "");

  // Process Time and Numeric conversion
  processedData.forEach((row) => {
    const seconds = parseTimeValue(row[TIME]);
    row[TIME] = seconds;
    row[TIME_MINUTES] = seconds !== null ? seconds / 60 : null;

    COLUMNS.forEach((col) => {
      if (col in row && col !== TIME) {
        const val = parseFloat(row[col]);
        row[col] = isNaN(val) ? null : val;
      }
    });
  });

  // Smoothing
  const windowSize = 4;
  const smoothCols = COLUMNS.filter((c) => c !== SPEED && c !== GRADE && c !== TIME && c !== TIME_MINUTES);

  smoothCols.forEach((col) => {
    if (!(col in processedData[0])) return;

    const values = processedData.map((d) => d[col]);
    const smoothed = values.map((_, i) => {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
        const v = values[j];
        if (v !== null && v !== undefined && !isNaN(v)) {
          sum += v;
          count++;
        }
      }
      return count > 0 ? sum / count : null;
    });

    processedData.forEach((row, i) => {
      row[col] = smoothed[i];
    });
  });

  // FAT/CHO Normalization
  let avgFat = 0;
  let fatCount = 0;
  processedData.forEach((row) => {
    if (row[FAT] !== null) {
      avgFat += row[FAT];
      fatCount++;
    }
  });
  if (fatCount > 0 && avgFat / fatCount > 100) {
    processedData.forEach((row) => {
      if (row[FAT] !== null) row[FAT] /= 1440;
      if (row[CHO] !== null) row[CHO] /= 1440;
    });
  }

  // Calculate FAT% and CHO%
  processedData.forEach((row) => {
    const total = (row[FAT] || 0) + (row[CHO] || 0);
    if (total > 0) {
      row[FAT_PC] = (row[FAT] / total) * 100;
      row[CHO_PC] = (row[CHO] / total) * 100;
    } else {
      row[FAT_PC] = 0;
      row[CHO_PC] = 0;
    }
  });

  // Find actual peak VO2 time from smoothed data to ensure "Max" effort
  // matches the highest VO2 point on the charts.
  let peak_vo2_min = max_min;
  let max_vo2 = -1;
  processedData.forEach((row) => {
    if (row[VO2] !== null && row[VO2] > max_vo2) {
      max_vo2 = row[VO2];
      peak_vo2_min = row[TIME_MINUTES];
    }
  });

  return {
    data: processedData,
    thresholds: {
      at: at_min,
      rc: rc_min,
      max: peak_vo2_min,
    },
  };
}
