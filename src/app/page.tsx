"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import FileUploader from "@/components/FileUploader";
import { WassermanChart } from "@/components/WassermanChart";
import {
  Clock,
  Gauge,
  BarChart3,
  LayoutGrid,
  Info,
  Activity,
} from "lucide-react";

// --- Validation Thresholds ---
const TIME_DELTA_TOLERANCE_MINUTES = 0.5;
const HEART_RATE_DELTA_TOLERANCE_BPM = 5;
const VO2_DELTA_TOLERANCE_ML = 50; // Added as a likely standard
const TIME_DELTA_TOLERANCE_SECONDS = 30;

export default function Home() {
  const [data, setData] = useState<any[] | null>(null);
  const [steadyData, setSteadyData] = useState<any[] | null>(null);
  const [thresholds, setThresholds] = useState<{
    at: number;
    rc: number;
    max: number;
    calculatedAt?: number;
    calculatedRc?: number;
    calculatedMax?: number;
    fatMax?: number;
    fatMaxHr?: number;
    fatMaxZoneStartHr?: number | null;
    fatMaxZoneEndHr?: number | null;
  } | null>(null);
  const [xAxisMode, setXAxisMode] = useState<"minutes" | "Speed">("minutes");
  const [isSteadyMode, setIsSteadyMode] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "wasserman" | "supplementary" | "respiratory" | "analysis"
  >("wasserman");

  const handleDataLoaded = (payload: any) => {
    setData(payload.data);
    setSteadyData(payload.steadyStateData);
    setThresholds(payload.thresholds);
  };

  const displayData = useMemo(() => {
    return isSteadyMode && steadyData ? steadyData : data;
  }, [isSteadyMode, steadyData, data]);

  const currentLT1 = useMemo(() => {
    if (!data || !thresholds) return null;
    return data.find((d) => d.minutes >= thresholds.at) || data[0];
  }, [data, thresholds]);

  const calcLT1 = useMemo(() => {
    const t = thresholds?.calculatedAt;
    if (!data || t === undefined) return null;
    return data.find((d) => d.minutes >= t) || data[0];
  }, [data, thresholds]);

  const currentLT2 = useMemo(() => {
    if (!data || !thresholds) return null;
    return (
      data.find((d) => d.minutes >= thresholds.rc) || data[data.length - 1]
    );
  }, [data, thresholds]);

  const calcLT2 = useMemo(() => {
    const rc = thresholds?.calculatedRc;
    if (!data || rc === undefined) return null;
    return data.find((d) => d.minutes >= rc) || data[data.length - 1];
  }, [data, thresholds]);

  const currentMax = useMemo(() => {
    if (!data || !thresholds) return null;
    return (
      data.find((d) => d.minutes >= thresholds.max) || data[data.length - 1]
    );
  }, [data, thresholds]);

  const calcMax = useMemo(() => {
    const mx = thresholds?.calculatedMax;
    if (!data || mx === undefined) return null;
    return data.find((d) => d.minutes >= mx) || data[data.length - 1];
  }, [data, thresholds]);

  const wassermanPanels = useMemo(() => {
    if (!data) return [];

    const xLabel = xAxisMode === "minutes" ? "Time (min)" : "Speed (km/h)";

    return [
      {
        id: 1,
        title: "1. Ventilation vs. Time",
        description:
          "Minute Ventilation (VE) represents the total volume of air breathed per minute. The inflection point (VT1/AT) indicates where the body begins to increase breathing more rapidly to clear excess CO2 from buffering lactic acid.",
        config: {
          id: 1,
          traces: [
            {
              xKey: xAxisMode,
              yKey: "VE_ergo",
              name: "VE",
              marker: { color: "#003300", symbol: "circle" },
            },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: { title: "VE (L/min)" },
          },
        },
      },
      {
        id: 2,
        title: "2. Cardiovascular Response",
        description:
          "Heart Rate (HR) and Oxygen Pulse (VO2/HR) track cardiovascular efficiency. VO2/HR reflects stroke volume and oxygen extraction; a plateau or drop at high intensity can signal a stroke volume limitation (O2 pulse failure).",
        config: {
          id: 2,
          traces: [
            {
              xKey: xAxisMode,
              yKey: "HR",
              name: "HR",
              marker: { color: "#800000", symbol: "cross" },
              yaxis: "y",
            },
            {
              xKey: xAxisMode,
              yKey: "VO2/HR",
              name: "VO2/HR",
              marker: { color: "#0053a4", symbol: "circle-open" },
              yaxis: "y2",
            },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: {
              title: "HR (bpm)",
              titlefont: { color: "#800000" },
              tickfont: { color: "#800000" },
            },
            yaxis2: {
              title: "O2 Pulse (mL/beat)",
              titlefont: { color: "#0053a4" },
              tickfont: { color: "#0053a4" },
              overlaying: "y",
              side: "right",
              showgrid: false,
            },
          },
        },
      },
      {
        id: 3,
        title: "3. Metabolic Gas Exchange",
        description:
          "VO2 (Oxygen uptake) and VCO2 (Carbon dioxide output) are the core metabolic markers. The ratio of VCO2 to VO2 (RER) helps determine the primary fuel source and identify the metabolic crossover from fat to carbohydrate dominance.",
        config: {
          id: 3,
          traces: [
            {
              xKey: xAxisMode,
              yKey: "VO2",
              name: "VO2",
              marker: { color: "#0053a4", symbol: "circle-open" },
            },
            {
              xKey: xAxisMode,
              yKey: "VCO2",
              name: "VCO2",
              marker: { color: "#c00000", symbol: "triangle-up" },
            },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: { title: "VO2, VCO2 (mL/min)" },
            legend: { x: 0.05, y: 1, xanchor: "left", yanchor: "top" },
          },
        },
      },
      {
        id: 4,
        title: "4. Ventilatory Efficiency",
        description:
          "The VE/VCO2 slope measures ventilatory efficiency—how much ventilation is required to eliminate a given amount of CO2. Higher slopes (>34) can indicate inefficient gas exchange, often due to increased physiological dead space or pulmonary issues.",
        config: {
          id: 4,
          traces: [
            {
              xKey: "VCO2",
              yKey: "VE_ergo",
              name: "VE vs VCO2",
              marker: { color: "#003300", symbol: "circle" },
              mode: "markers",
            },
          ],
          layout: {
            xaxis: { title: "VCO2 (mL/min)" },
            yaxis: { title: "VE (L/min)" },
          },
        },
      },
      {
        id: 5,
        title: "5. V-Slope & HR vs VO2",
        description:
          "The V-Slope method identifies the Aerobic Threshold (AT) by detecting the 'breakpoint' where VCO2 production begins to accelerate relative to VO2 consumption due to the onset of anaerobic buffering.",
        config: {
          id: 5,
          traces: [
            {
              xKey: "VO2",
              yKey: "VCO2",
              name: "VCO2",
              marker: { color: "#0053a4", symbol: "circle" },
              mode: "markers",
              yaxis: "y",
            },
            {
              xKey: "VO2",
              yKey: "HR",
              name: "HR",
              marker: { color: "#800000", symbol: "cross" },
              mode: "markers",
              yaxis: "y2",
            },
          ],
          layout: {
            xaxis: { title: "VO2 (mL/min)" },
            yaxis: {
              title: "VCO2 (mL/min)",
              titlefont: { color: "#0053a4" },
              tickfont: { color: "#0053a4" },
            },
            yaxis2: {
              title: "HR (bpm)",
              titlefont: { color: "#800000" },
              tickfont: { color: "#800000" },
              overlaying: "y",
              side: "right",
              showgrid: false,
            },
          },
        },
      },
      {
        id: 6,
        title: "6. Ventilatory Equivalents",
        description:
          "Ventilatory Equivalents (VE/VO2 and VE/VCO2) are gold-standard markers for threshold detection. AT (VT1) is marked by the first rise in VE/VO2 without a rise in VE/VCO2. RC (VT2) is where both increase, indicating a total loss of metabolic compensation.",
        config: {
          id: 6,
          traces: [
            {
              xKey: xAxisMode,
              yKey: "VE/VO2",
              name: "VE/VO2",
              marker: { color: "#0053a4", symbol: "circle" },
            },
            {
              xKey: xAxisMode,
              yKey: "VE/VCO2",
              name: "VE/VCO2",
              marker: { color: "#c00000", symbol: "circle" },
            },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: { title: "VE/VO2, VE/VCO2", autorange: true },
          },
        },
      },
      {
        id: 7,
        title: "7. Breathing Pattern",
        description:
          "Tidal Volume (VT) and Respiratory Frequency (Rf) describe the breathing strategy. Efficient athletes maximize VT before increasing Rf. A premature shift to rapid, shallow breathing (high Rf, low VT) can limit performance and cause respiratory muscle fatigue.",
        config: {
          id: 7,
          traces: [
            {
              xKey: "VE_ergo",
              yKey: "VT",
              name: "VT (Tidal Vol)",
              marker: { color: "#00008b", symbol: "circle" },
              mode: "markers",
              yaxis: "y",
            },
            {
              xKey: "VE_ergo",
              yKey: "Rf",
              name: "Rf (Resp Rate)",
              marker: { color: "#800000", symbol: "triangle-up" },
              mode: "markers",
              yaxis: "y2",
            },
          ],
          layout: {
            xaxis: { title: "VE (L/min)" },
            yaxis: {
              title: "VT (L)",
              titlefont: { color: "#00008b" },
              tickfont: { color: "#00008b" },
            },
            yaxis2: {
              title: "Rf (breaths/min)",
              titlefont: { color: "#800000" },
              tickfont: { color: "#800000" },
              overlaying: "y",
              side: "right",
              showgrid: false,
            },
          },
        },
      },
      {
        id: 8,
        title: "8. Respiratory Exchange Ratio",
        description:
          "The Respiratory Quotient (RQ or RER) reflects the metabolic fuel mix. RQ = 0.70 is pure fat, 1.00 is pure CHO, and values > 1.10 are typically used to confirm that a true maximal effort (VO2max) was reached.",
        config: {
          id: 8,
          traces: [
            {
              xKey: xAxisMode,
              yKey: "RQ",
              name: "RQ (RER)",
              marker: { color: "#000000", symbol: "circle" },
            },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: { title: "RQ" },
          },
        },
      },
      {
        id: 9,
        title: "9. End-Tidal Gases",
        description:
          "End-tidal gases (PetO2 and PetCO2) track alveolar gas exchange. A precipitous drop in PetCO2 after it peaks is a powerful marker for the Respiratory Compensation Point (RC/VT2), reflecting the drive to clear CO2 during severe acidosis.",
        config: {
          id: 9,
          traces: [
            {
              xKey: xAxisMode,
              yKey: "PetO2",
              name: "PetO2",
              marker: { color: "#0053a4", symbol: "circle-open" },
            },
            {
              xKey: xAxisMode,
              yKey: "PetCO2",
              name: "PetCO2",
              marker: { color: "#c00000", symbol: "circle" },
            },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: { title: "PetO2, PetCO2 (mmHg)" },
          },
        },
      },
    ];
  }, [data, xAxisMode]);

  const supplementaryPanels = useMemo(() => {
    if (!data || !thresholds) return [];

    const xLabel = xAxisMode === "minutes" ? "Time (min)" : "Speed (km/h)";

    // Find FatMax from thresholds
    const getXFromTime = (time: number | undefined | null) => {
      if (!time || !data) return 0;
      if (xAxisMode === "minutes") return time;
      const row = data.reduce((prev, curr) =>
        Math.abs(curr.minutes - time) < Math.abs(prev.minutes - time)
          ? curr
          : prev,
      );
      return row[xAxisMode] || 0;
    };

    const fatMaxX = getXFromTime(thresholds.fatMax);
    const fatMaxHR = thresholds.fatMaxHr || 0;
    let fatMaxXStart = 0;
    let fatMaxXEnd = 0;
    let hasFatMaxZone = false;

    if (
      thresholds.fatMaxZoneStartHr !== undefined &&
      thresholds.fatMaxZoneEndHr !== undefined
    ) {
      const startRow =
        data.find((d) => d.HR >= thresholds.fatMaxZoneStartHr!) || data[0];
      const endRow =
        data.findLast((d) => d.HR <= thresholds.fatMaxZoneEndHr!) ||
        data[data.length - 1];
      fatMaxXStart = startRow[xAxisMode];
      fatMaxXEnd = endRow[xAxisMode];
      hasFatMaxZone = true;
    }

    return [
      {
        id: "S1",
        title: "S1. Substrate Utilization & HR",
        description:
          "Metabolic Crossover analysis determines the 'FatMax'—the intensity where fat oxidation is highest. Identifying the Crossover Point (where CHO becomes the dominant fuel) is essential for developing precise Ironman or marathon fueling strategies.",
        config: {
          id: "S1",
          traces: [
            {
              xKey: xAxisMode,
              yKey: "FAT%",
              name: "FAT%",
              marker: { color: "#10b981", symbol: "circle" },
              mode: "markers",
              yaxis: "y",
            },
            {
              xKey: xAxisMode,
              yKey: "CHO%",
              name: "CHO%",
              marker: { color: "#f97316", symbol: "circle" },
              mode: "markers",
              yaxis: "y",
            },
            {
              xKey: xAxisMode,
              yKey: "HR",
              name: "HR",
              line: { color: "#800000", dash: "dash" },
              mode: "lines",
              yaxis: "y2",
            },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: {
              title: "FAT%, CHO% (%)",
              range: [0, 100],
              tickmode: "array",
              tickvals: [10, 20, 30, 40, 50, 60, 70, 80, 90],
              ticksuffix: "%",
              tickformat: ".2f",
            },
            yaxis2: {
              title: "HR (bpm)",
              titlefont: { color: "#800000" },
              tickfont: { color: "#800000" },
              overlaying: "y",
              side: "right",
              showgrid: false,
            },
            shapes: [
              ...(hasFatMaxZone
                ? [
                    {
                      type: "rect" as const,
                      x0: fatMaxXStart,
                      x1: fatMaxXEnd,
                      y0: 0,
                      y1: 1,
                      yref: "paper" as const,
                      fillcolor: "rgba(59, 130, 246, 0.15)",
                      line: { width: 0 },
                      layer: "below" as const,
                    },
                  ]
                : []),
            ],
          },
        },
      },
      {
        id: "S1_raw",
        title: "S1b. Substrate Oxidation (Raw)",
        description:
          "Raw fat and carbohydrate oxidation rates (kcal/min) re-calculated using the Frayn equation. Provides absolute values for total energy expenditure and fuel contribution.",
        config: {
          id: "S1_raw",
          traces: [
            {
              xKey: xAxisMode,
              yKey: "FAT",
              name: "FAT (kcal/min)",
              marker: { color: "#10b981", symbol: "circle" },
              mode: "markers",
              yaxis: "y",
            },
            {
              xKey: xAxisMode,
              yKey: "CHO",
              name: "CHO (kcal/min)",
              marker: { color: "#f97316", symbol: "circle" },
              mode: "markers",
              yaxis: "y",
            },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: { title: "FAT, CHO (kcal/min)" },
            shapes: [
              ...(hasFatMaxZone
                ? [
                    {
                      type: "rect" as const,
                      x0: fatMaxXStart,
                      x1: fatMaxXEnd,
                      y0: 0,
                      y1: 1,
                      yref: "paper" as const,
                      fillcolor: "rgba(59, 130, 246, 0.15)",
                      line: { width: 0 },
                      layer: "below" as const,
                    },
                  ]
                : []),
            ],
          },
        },
      },
      {
        id: "S2",
        title: "S2. Running Economy & Cardiac Load",
        description:
          "Running Economy (RE) measures the energy cost of running. A lower VO2 for the same speed indicates better economy. Improvements in RE allow an athlete to sustain higher speeds with lower cardiovascular and metabolic strain.",
        config: {
          id: "S2",
          traces: [
            {
              xKey: xAxisMode,
              yKey: "VO2/kg",
              name: "VO2/kg",
              marker: { color: "#0053a4", symbol: "circle" },
              yaxis: "y",
            },
            {
              xKey: xAxisMode,
              yKey: "HR",
              name: "HR",
              line: { color: "#800000", dash: "dash" },
              mode: "lines",
              yaxis: "y2",
            },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: { title: "VO2/kg (mL/min/kg)" },
            yaxis2: {
              title: "HR (bpm)",
              titlefont: { color: "#800000" },
              tickfont: { color: "#800000" },
              overlaying: "y",
              side: "right",
              showgrid: false,
            },
          },
        },
      },
      {
        id: "S3",
        title: "S3. Total Energy Expenditure vs HR",
        description:
          "Energy Expenditure (EEm) calculates the total caloric demand per minute. This data is the foundation for creating an accurate hydration and nutrition plan, preventing 'bonking' by matching intake to the athlete's specific burn rate.",
        config: {
          id: "S3",
          traces: [
            {
              xKey: xAxisMode,
              yKey: "EEm",
              name: "EEm",
              marker: { color: "#8b5cf6", symbol: "circle" },
              yaxis: "y",
            },
            {
              xKey: xAxisMode,
              yKey: "HR",
              name: "HR",
              line: { color: "#800000", dash: "dash" },
              mode: "lines",
              yaxis: "y2",
            },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: { title: "EEm (kcal/min)" },
            yaxis2: {
              title: "HR (bpm)",
              titlefont: { color: "#800000" },
              tickfont: { color: "#800000" },
              overlaying: "y",
              side: "right",
              showgrid: false,
            },
          },
        },
      },
      {
        id: "S4",
        title: "S4. Advanced Cardiac Output & HR",
        description:
          "Cardiac Output (CO) and Stroke Volume (SV) reveal the heart's pumping capacity. Elite athletes often maintain a rising SV to higher intensities, whereas a premature SV plateau may indicate a need for more aerobic base training.",
        config: {
          id: "S4",
          traces: [
            {
              xKey: xAxisMode,
              yKey: "CO",
              name: "CO",
              line: { color: "#0053a4", width: 2 },
              mode: "lines",
              yaxis: "y",
            },
            {
              xKey: xAxisMode,
              yKey: "SV",
              name: "SV",
              marker: { color: "#10b981", symbol: "circle" },
              yaxis: "y",
            },
            {
              xKey: xAxisMode,
              yKey: "HR",
              name: "HR",
              line: { color: "#800000", dash: "dash" },
              mode: "lines",
              yaxis: "y2",
            },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: { title: "CO (L/min) / SV (mL)" },
            yaxis2: {
              title: "HR (bpm)",
              titlefont: { color: "#800000" },
              tickfont: { color: "#800000" },
              overlaying: "y",
              side: "right",
              showgrid: false,
            },
          },
        },
      },
    ];
  }, [data, xAxisMode, currentLT1]);

  const respiratoryPanels = useMemo(() => {
    if (!data) return [];

    const xLabel = xAxisMode === "minutes" ? "Time (min)" : "Speed (km/h)";

    return [
      {
        id: "R1",
        title: "R1. Breathing Reserve & Ventilatory Demand",
        description:
          "Breathing Reserve (BR) represents the unused ventilatory capacity. Healthy individuals typically have a reserve of >15% at peak exercise. A lower reserve indicates that the lungs, rather than the heart or muscles, may be the primary factor limiting performance.",
        config: {
          id: "R1",
          traces: [
            {
              xKey: xAxisMode,
              yKey: "BR",
              name: "BR (L/min)",
              marker: { color: "#0053a4", symbol: "circle" },
              mode: "markers",
            },
            {
              xKey: xAxisMode,
              yKey: "VE_ergo",
              name: "VE (L/min)",
              line: { color: "#800000", dash: "dash" },
              mode: "lines",
            },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: { title: "L/min" },
          },
        },
      },
      {
        id: "R2",
        title: "R2. Ventilatory Timing (Ti/Ttot)",
        description:
          "Ti/Ttot (Duty Cycle) measures the fraction of the breath cycle spent inhaling. Values above 0.45-0.50 indicate high work of breathing and increase the risk of respiratory muscle fatigue and 'blood stealing' from locomotive muscles.",
        config: {
          id: "R2",
          traces: [
            {
              xKey: xAxisMode,
              yKey: "Ti/Ttot",
              name: "Ti/Ttot",
              marker: { color: "#10b981", symbol: "diamond" },
              mode: "markers",
            },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: { title: "Inspiratory Duty Cycle (Ti/Ttot)", range: [0, 1] },
          },
        },
      },
      {
        id: "R3",
        title: "R3. Dead Space Ventilation (VD/VT)",
        description:
          "VD/VT (Dead Space Ratio) reflects gas exchange efficiency. It should drop to <0.20 during exercise. A failure to decrease suggests 'wasted' ventilation, common in pulmonary vascular disease or high-intensity hyperpnea.",
        config: {
          id: "R3",
          traces: [
            {
              xKey: xAxisMode,
              yKey: "VD/VT e",
              name: "VD/VT (est)",
              marker: { color: "#f97316", symbol: "circle-open" },
              mode: "markers",
            },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: { title: "Dead Space Ratio (VD/VT)", rangemode: "tozero" },
          },
        },
      },
      {
        id: "R4",
        title: "R4. Ventilatory Drive (VT/Ti)",
        description:
          "VT/Ti (Mean Inspiratory Flow) is a measure of the central respiratory drive or 'hunger for air.' It tracks the intensity of the neural signal to breathe and increases linearly with both metabolic demand and perceived exertion.",
        config: {
          id: "R4",
          traces: [
            {
              xKey: xAxisMode,
              yKey: "VT/Ti",
              name: "VT/Ti (L/s)",
              marker: { color: "#8b5cf6", symbol: "square" },
              mode: "markers",
            },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: { title: "VT/Ti (L/s)" },
          },
        },
      },
    ];
  }, [data, xAxisMode]);

  const activePanels = useMemo(() => {
    if (activeTab === "wasserman") return wassermanPanels;
    if (activeTab === "supplementary") return supplementaryPanels;
    if (activeTab === "respiratory") return respiratoryPanels;
    return [];
  }, [activeTab, wassermanPanels, supplementaryPanels, respiratoryPanels]);

  const renderThresholdAnalysis = () => {
    if (
      !data ||
      !thresholds ||
      !currentLT1 ||
      !calcLT1 ||
      !currentLT2 ||
      !calcLT2
    )
      return null;

    const formatDelta = (val: number, unit: string, precision: number = 0) => {
      const prefix = val > 0 ? "+" : "";
      const tolerance =
        unit === "min"
          ? TIME_DELTA_TOLERANCE_MINUTES
          : unit === "bpm"
            ? HEART_RATE_DELTA_TOLERANCE_BPM
            : VO2_DELTA_TOLERANCE_ML;
      const color =
        Math.abs(val) < tolerance ? "text-green-600" : "text-orange-600";
      return (
        <span className={color}>
          {prefix}
          {val.toFixed(precision)} {unit}
        </span>
      );
    };

    const formatTimeDelta = (min1: number, min2: number) => {
      const diffSec = (min1 - min2) * 60;
      const prefix = diffSec > 0 ? "+" : "";
      const absSec = Math.abs(diffSec);
      const m = Math.floor(absSec / 60);
      const s = Math.round(absSec % 60);
      const color =
        absSec < TIME_DELTA_TOLERANCE_SECONDS
          ? "text-green-600"
          : "text-orange-600";
      return (
        <span className={color}>
          {prefix}
          {m}:{s.toString().padStart(2, "0")}
        </span>
      );
    };

    const atDelta = {
      time: thresholds.at - (thresholds.calculatedAt || 0),
      hr: (currentLT1.HR || 0) - (calcLT1.HR || 0),
      vo2: (currentLT1.VO2 || 0) - (calcLT1.VO2 || 0),
    };

    const rcDelta = {
      time: thresholds.rc - (thresholds.calculatedRc || 0),
      hr: (currentLT2.HR || 0) - (calcLT2.HR || 0),
      vo2: (currentLT2.VO2 || 0) - (calcLT2.VO2 || 0),
    };

    const maxDelta = {
      time: thresholds.max - (thresholds.calculatedMax || thresholds.max),
      hr: (currentMax.HR || 0) - (calcMax?.HR || currentMax.HR || 0),
      vo2: (currentMax.VO2 || 0) - (calcMax?.VO2 || currentMax.VO2 || 0),
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 border-b pb-4 mb-6">
            <div className="p-2 bg-purple-50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Clinical vs. Algorithmic Consensus
              </h2>
              <p className="text-xs text-gray-500">
                Quantitative comparison of laboratory data against VeloGraph
                physiological models
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* AT Comparison */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-green-700 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                Aerobic Threshold (AT/VT1) Validation
              </h3>
              <div className="overflow-hidden border border-gray-100 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-2">Metric</th>
                      <th className="px-4 py-2 text-right">Official</th>
                      <th className="px-4 py-2 text-right">Calculated</th>
                      <th className="px-4 py-2 text-right">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr>
                      <td className="px-4 py-3 font-medium">Time</td>
                      <td className="px-4 py-3 text-right">
                        {Math.floor(thresholds.at)}:
                        {((thresholds.at % 1) * 60).toFixed(0).padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {Math.floor(thresholds.calculatedAt || thresholds.at)}:
                        {(((thresholds.calculatedAt || thresholds.at) % 1) * 60)
                          .toFixed(0)
                          .padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatTimeDelta(
                          thresholds.at,
                          thresholds.calculatedAt || thresholds.at,
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">Heart Rate</td>
                      <td className="px-4 py-3 text-right">
                        {currentLT1.HR?.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(calcLT1 || currentLT1).HR?.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatDelta(atDelta.hr, "bpm")}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">VO2 (ml/min)</td>
                      <td className="px-4 py-3 text-right">
                        {currentLT1.VO2?.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(calcLT1 || currentLT1).VO2?.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatDelta(atDelta.vo2, "ml")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* RC Comparison */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-orange-700 flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
                Respiratory Compensation (RC/VT2) Validation
              </h3>
              <div className="overflow-hidden border border-gray-100 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-2">Metric</th>
                      <th className="px-4 py-2 text-right">Official</th>
                      <th className="px-4 py-2 text-right">Calculated</th>
                      <th className="px-4 py-2 text-right">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr>
                      <td className="px-4 py-3 font-medium">Time</td>
                      <td className="px-4 py-3 text-right">
                        {Math.floor(thresholds.rc)}:
                        {((thresholds.rc % 1) * 60).toFixed(0).padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {Math.floor(thresholds.calculatedRc || thresholds.rc)}:
                        {(((thresholds.calculatedRc || thresholds.rc) % 1) * 60)
                          .toFixed(0)
                          .padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatTimeDelta(
                          thresholds.rc,
                          thresholds.calculatedRc || thresholds.rc,
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">Heart Rate</td>
                      <td className="px-4 py-3 text-right">
                        {currentLT2.HR?.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(calcLT2 || currentLT2).HR?.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatDelta(rcDelta.hr, "bpm")}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">VO2 (ml/min)</td>
                      <td className="px-4 py-3 text-right">
                        {currentLT2.VO2?.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(calcLT2 || currentLT2).VO2?.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatDelta(rcDelta.vo2, "ml")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-xs font-bold text-gray-700 uppercase mb-2 flex items-center">
              <Info className="w-3 h-3 mr-1 text-blue-500" />
              Physiological Interpretation & Technical Insights
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-600 leading-relaxed">
              <div>
                <p className="font-bold text-green-700 mb-1">AT Analysis:</p>
                {Math.abs(atDelta.time * 60) < 30
                  ? "The VeloGraph algorithm (using the V-Slope and VE/VO2 nadir consensus) aligns perfectly with the lab's manual assessment. This indicates a high-confidence Aerobic Threshold, representing the point where the athlete begins to utilize anaerobic buffering to manage rising blood lactate."
                  : atDelta.time > 0
                    ? "The lab identifies AT later than the algorithmic consensus. This often happens if the physician prioritized the VO2/VCO2 crossover point over the earliest inflection in ventilatory equivalents. The algorithm might be detecting a subtle earlier metabolic shift."
                    : "The algorithm identifies AT later than the lab. This suggests the athlete may have had an early, non-metabolic rise in ventilation (e.g., due to anxiety or hyperpnea) that the algorithm filtered out but the lab technician included in their manual review."}
              </div>
              <div>
                <p className="font-bold text-orange-700 mb-1">RC Analysis:</p>
                {Math.abs(rcDelta.time * 60) < 30
                  ? "Excellent consensus on the Respiratory Compensation Point. Both the algorithmic PetCO2 peak-drop method and the lab's assessment agree on the exact moment the athlete entered severe metabolic acidosis and lost respiratory compensation."
                  : rcDelta.time > 0
                    ? "The lab identifies RC later than the algorithm. Algorithmic detection triggers immediately at the peak of PetCO2, whereas clinical practice sometimes waits for a more pronounced 'secondary' rise in VE/VCO2 to confirm the state of hyperpnea."
                    : "The algorithm triggers RC later than the lab. This discrepancy can occur if the athlete has exceptional CO2 buffering capacity, leading to a prolonged plateau in end-tidal CO2 before the eventual precipitous drop."}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderThresholdMethodology = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <div className="flex items-center space-x-2 border-b pb-4">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Info className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Expert Detection Methodology
          </h2>
          <p className="text-xs text-gray-500">
            How physiological thresholds (LT1/LT2) are calculated from CPET data
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 rounded-full font-bold text-xs border border-green-200">
              LT1
            </span>
            <h3 className="font-bold text-green-700">
              Aerobic Threshold (AT / VT1)
            </h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            The point where metabolic demand exceeds the body&apos;s ability to
            maintain resting lactate levels. Usually occurs at 50-60% of VO2max.
          </p>
          {currentLT1 && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-green-50 rounded-lg border border-green-100 text-[11px] font-medium text-green-800">
              <div className="flex items-center space-x-2">
                <Clock className="w-3 h-3 text-green-600" />
                <span>
                  <b>Time:</b> {Math.floor(thresholds?.at || 0)}:
                  {(((thresholds?.at || 0) % 1) * 60)
                    .toFixed(0)
                    .padStart(2, "0")}{" "}
                  (Calc: {Math.floor(thresholds?.calculatedAt || 0)}:
                  {(((thresholds?.calculatedAt || 0) % 1) * 60)
                    .toFixed(0)
                    .padStart(2, "0")}
                  )
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Gauge className="w-3 h-3 text-green-600" />
                <span>
                  <b>Speed:</b> {currentLT1.Speed?.toFixed(1)} km/h
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-green-600 rounded-full" />
                <span>
                  <b>HR:</b> {currentLT1.HR?.toFixed(0)} bpm
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-blue-600 rounded-full" />
                <span>
                  <b>VO2:</b> {currentLT1.VO2?.toFixed(0)} ml/min
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-black rounded-full" />
                <span>
                  <b>RER:</b> {currentLT1.RQ?.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-green-800 rounded-full" />
                <span>
                  <b>VE:</b> {currentLT1.VE_ergo?.toFixed(0)} L/min
                </span>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Detection Methods:
            </h4>
            <ul className="text-xs text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">●</span>
                <span>
                  <b>V-Slope:</b> The earliest increase in VCO2 relative to VO2
                  (linear slope breaks &gt; 1.0).
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">●</span>
                <span>
                  <b>Ventilatory Equivalents:</b> The nadir (lowest point) of{" "}
                  <b>VE/VO2</b> before it starts rising, while <b>VE/VCO2</b>{" "}
                  remains stable.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">●</span>
                <span>
                  <b>End-Tidal Gases:</b> The point of the first rise in{" "}
                  <b>PetO2</b> without a corresponding fall in PetCO2.
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-orange-100 text-orange-700 rounded-full font-bold text-xs border border-orange-200">
              LT2
            </span>
            <h3 className="font-bold text-orange-700">
              Respiratory Compensation (RC / VT2)
            </h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            The point of critical metabolic acidosis where the respiratory
            system can no longer fully buffer CO2. Corresponds to maximal
            lactate steady state.
          </p>
          {currentLT2 && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100 text-[11px] font-medium text-orange-800">
              <div className="flex items-center space-x-2">
                <Clock className="w-3 h-3 text-orange-600" />
                <span>
                  <b>Time:</b> {Math.floor(thresholds?.rc || 0)}:
                  {(((thresholds?.rc || 0) % 1) * 60)
                    .toFixed(0)
                    .padStart(2, "0")}{" "}
                  (Calc: {Math.floor(thresholds?.calculatedRc || 0)}:
                  {(((thresholds?.calculatedRc || 0) % 1) * 60)
                    .toFixed(0)
                    .padStart(2, "0")}
                  )
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Gauge className="w-3 h-3 text-orange-600" />
                <span>
                  <b>Speed:</b> {currentLT2.Speed?.toFixed(1)} km/h
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-orange-600 rounded-full" />
                <span>
                  <b>HR:</b> {currentLT2.HR?.toFixed(0)} bpm
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-blue-600 rounded-full" />
                <span>
                  <b>VO2:</b> {currentLT2.VO2?.toFixed(0)} ml/min
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-black rounded-full" />
                <span>
                  <b>RER:</b> {currentLT2.RQ?.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-orange-800 rounded-full" />
                <span>
                  <b>VE:</b> {currentLT2.VE_ergo?.toFixed(0)} L/min
                </span>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Detection Methods:
            </h4>
            <ul className="text-xs text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">●</span>
                <span>
                  <b>Ventilatory Equivalents:</b> Rapid and simultaneous
                  increase in both <b>VE/VO2</b> and <b>VE/VCO2</b>.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">●</span>
                <span>
                  <b>End-Tidal Gases:</b> The point where <b>PetCO2</b> begins
                  its final, precipitous decline after peaking.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">●</span>
                <span>
                  <b>VE vs VCO2:</b> The secondary deflection point (increased
                  slope) in the linear relationship of ventilation to CO2
                  output.
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-red-100 text-red-700 rounded-full font-bold text-xs border border-red-200">
              MAX
            </span>
            <h3 className="font-bold text-red-700">
              Peak Performance (Max Effort)
            </h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            The absolute maximal values achieved during the test. VO2max is the
            gold standard for aerobic capacity and cardiovascular fitness.
          </p>
          {currentMax && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-red-50 rounded-lg border border-red-100 text-[11px] font-medium text-red-800">
              <div className="flex items-center space-x-2">
                <Clock className="w-3 h-3 text-red-600" />
                <span>
                  <b>Time:</b> {Math.floor(thresholds?.max || 0)}:
                  {(((thresholds?.max || 0) % 1) * 60)
                    .toFixed(0)
                    .padStart(2, "0")}
                  {thresholds?.calculatedMax &&
                    thresholds.calculatedMax !== thresholds.max && (
                      <span className="ml-1 text-[9px] text-red-400 font-normal italic">
                        (Peak: {Math.floor(thresholds.calculatedMax)}:
                        {((thresholds.calculatedMax % 1) * 60)
                          .toFixed(0)
                          .padStart(2, "0")}
                        )
                      </span>
                    )}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Gauge className="w-3 h-3 text-red-600" />
                <span>
                  <b>Speed:</b> {currentMax.Speed?.toFixed(1)} km/h
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-red-600 rounded-full" />
                <span>
                  <b>HR:</b> {currentMax.HR?.toFixed(0)} bpm
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-blue-600 rounded-full" />
                <span>
                  <b>VO2:</b> {currentMax.VO2?.toFixed(0)} ml/min
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-purple-600 rounded-full" />
                <span>
                  <b>VE:</b> {currentMax.VE_ergo?.toFixed(0)} L/min
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-black rounded-full" />
                <span>
                  <b>RQ:</b> {currentMax.RQ?.toFixed(2)}
                </span>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Clinical Markers:
            </h4>
            <ul className="text-xs text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">●</span>
                <span>
                  <b>VO2/kg:</b> {currentMax?.["VO2/kg"]?.toFixed(1)} mL/min/kg.
                  Top-tier aerobic power.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">●</span>
                <span>
                  <b>METS:</b> {(currentMax?.["VO2/kg"] / 3.5).toFixed(1)}.
                  Metabolic equivalent of task.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">●</span>
                <span>
                  <b>Breathing Reserve:</b> {currentMax?.BR?.toFixed(0)} L/min.
                  Ventilatory headroom.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Gauge className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              VeloGraph CPET Analytics
            </h1>
            <nav className="ml-8 flex space-x-4">
              <Link
                href="/"
                className="text-sm font-medium text-blue-600 border-b-2 border-blue-600"
              >
                CPET
              </Link>
              <Link
                href="/activities"
                className="text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center"
              >
                <Activity className="w-4 h-4 mr-1" />
                FIT Activities
              </Link>
            </nav>
          </div>
          {data && (
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setActiveTab("wasserman")}
                  className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeTab === "wasserman"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                  Wasserman 9-Panel
                </button>
                <button
                  onClick={() => setActiveTab("supplementary")}
                  className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeTab === "supplementary"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                  Metabolic & Cardiac
                </button>
                <button
                  onClick={() => setActiveTab("respiratory")}
                  className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeTab === "respiratory"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  Ventilatory Mechanics
                </button>
                <button
                  onClick={() => setActiveTab("analysis")}
                  className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeTab === "analysis"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                  Threshold Validation
                </button>
              </div>

              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setXAxisMode("minutes")}
                  className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    xAxisMode === "minutes"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  Time
                </button>
                <button
                  onClick={() => setXAxisMode("Speed")}
                  className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    xAxisMode === "Speed"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5 mr-1.5" />
                  Speed
                </button>
              </div>

              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setIsSteadyMode(false)}
                  className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    !isSteadyMode
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                  Full Test
                </button>
                <button
                  onClick={() => setIsSteadyMode(true)}
                  className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    isSteadyMode
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 mr-1.5" />
                  Stable State
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {!data && (
          <div className="py-12">
            <FileUploader onDataLoaded={handleDataLoaded} />
            <p className="mt-6 text-center text-gray-500 text-sm">
              Upload your <b>.xlsx</b> lab test file (sheet: &quot;Dane&quot;)
              to generate the 9-panel Wasserman plot.
            </p>
          </div>
        )}

        {data && (
          <div className="space-y-8">
            {activeTab !== "analysis" && renderThresholdMethodology()}

            {activeTab === "analysis" ? (
              renderThresholdAnalysis()
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activePanels.map((panel) => (
                  <WassermanChart
                    key={panel.id}
                    data={displayData || []}
                    title={panel.title}
                    description={panel.description}
                    config={panel.config}
                    isSteadyMode={isSteadyMode}
                    thresholds={thresholds || undefined}
                  />
                ))}
              </div>
            )}

            <div className="flex justify-center pt-4">
              <button
                onClick={() => setData(null)}
                className="text-sm text-gray-500 hover:text-red-600 underline underline-offset-4 decoration-gray-300 hover:decoration-red-300 transition-colors"
              >
                Upload different file
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-200 mt-8">
        <p className="text-center text-xs text-gray-400">
          CPET Analytics:{" "}
          {activeTab === "wasserman"
            ? "Standard 9-Panel Wasserman Layout"
            : activeTab === "supplementary"
              ? "Metabolic & Cardiac Substrate Analysis"
              : activeTab === "respiratory"
                ? "Ventilatory Mechanics & Efficiency"
                : "Comparative Threshold Validation"}
        </p>
      </footer>
    </div>
  );
}
