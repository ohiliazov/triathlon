"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Info } from "lucide-react";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[350px] bg-gray-50 flex items-center justify-center rounded-lg border animate-pulse text-gray-400 text-sm">
      Loading Chart...
    </div>
  ),
});

// --- Chart Configuration Constants ---
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const HALF_WINDOW_DIVISOR = 2; // For calculating half window in minutes from seconds

const RAW_DATA_MARKER_SIZE = 4;
const RAW_DATA_MARKER_OPACITY = 0.2;
const TRENDLINE_SMOOTHING_WINDOW_SECONDS = 40;
const TRENDLINE_WIDTH = 2;
const TRENDLINE_OPACITY = 1;

const DEFAULT_TRACE_MARKER_SIZE = 6;
const DEFAULT_TRACE_MARKER_OPACITY = 0.7;
const DEFAULT_TRACE_LINE_WIDTH = 1.5;

const REGRESSION_LINE_WIDTH = 1.5;
const REFERENCE_LINE_WIDTH = 1;
const RQ_MAIN_LINE_WIDTH = 1.5;
const RQ_SECONDARY_LINE_WIDTH = 1;

const CHART_HEIGHT = 350;
const CHART_MARGIN_L = 10;
const CHART_MARGIN_R = 10;
const CHART_MARGIN_T = 40;
const CHART_MARGIN_B = 70;

const LEGEND_X = 0.5;
const LEGEND_Y = -0.25;
const LEGEND_FONT_SIZE = 10;
const AXIS_TITLE_FONT_SIZE = 11;
const AXIS_TICK_FONT_SIZE = 10;

const THRESHOLD_MARKER_WIDTH = 2;
const THRESHOLD_LABEL_SIZE = 10;
const THRESHOLD_ANNOTATION_Y_OFFSET = 10;
const THRESHOLD_CALC_ANNOTATION_Y_PAPER = 0.88;

// --- Panel ID Constants ---
const PANEL_VE_VS_VCO2 = 4;
const PANEL_VSLOPE = 5;
const PANEL_BREATHING_PATTERN = 7;
const PANEL_RQ = 8;

// --- Helper Functions ---

/**
 * Formats decimal minutes into MM:SS string
 */
const formatTime = (minutes: number): string => {
  if (isNaN(minutes) || minutes === null) return "00:00";
  const absMin = Math.abs(minutes);
  const m = Math.floor(absMin);
  const s = Math.round((absMin - m) * SECONDS_PER_MINUTE);
  return `${minutes < 0 ? "-" : ""}${m}:${s.toString().padStart(2, "0")}`;
};

/**
 * Calculates a time-based moving average (centered window)
 */
const calculateMovingAverage = (data: any[], xKey: string, yKey: string, windowSeconds: number): number[] => {
  if (data.length === 0) return [];
  const halfWindowMinutes = windowSeconds / (SECONDS_PER_MINUTE * HALF_WINDOW_DIVISOR);
  const result: number[] = [];
  let leftIdx = 0;
  let rightIdx = 0;
  let runningSum = 0;
  let count = 0;

  for (let i = 0; i < data.length; i++) {
    const curX = data[i][xKey];
    const targetLeftX = curX - halfWindowMinutes;
    const targetRightX = curX + halfWindowMinutes;

    // Expand right
    while (rightIdx < data.length && data[rightIdx][xKey] <= targetRightX) {
      const val = data[rightIdx][yKey];
      if (val !== null && val !== undefined && !isNaN(val)) {
        runningSum += val;
        count++;
      }
      rightIdx++;
    }

    // Shrink left
    while (leftIdx < rightIdx && data[leftIdx][xKey] < targetLeftX) {
      const val = data[leftIdx][yKey];
      if (val !== null && val !== undefined && !isNaN(val)) {
        runningSum -= val;
        count--;
      }
      leftIdx++;
    }

    result.push(count > 0 ? runningSum / count : 0);
  }
  return result;
};

/**
 * Calculates linear regression: y = mx + b
 */
const calculateLinearRegression = (data: any[], xKey: string, yKey: string) => {
  if (data.length < 2) return null;
  const x = data.map((d) => d[xKey]);
  const y = data.map((d) => d[yKey]);
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumXX = x.reduce((a, b) => a + b * b, 0);

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;

  const m = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;
  return { m, b, xMin: Math.min(...x), xMax: Math.max(...x) };
};

/**
 * Gets clinical standard color for a metric
 */
const getClinicalColor = (name: string, key: string): string | undefined => {
  const s = (name + " " + key).toLowerCase();
  if (s.includes("vo2") || s.includes("oxygen")) return "#0053a4";
  if (s.includes("vco2") || s.includes("co2")) return "#c00000";
  if (s.includes("hr") || s.includes("heart rate")) return "#8b0000";
  if (s.includes("ve") || s.includes("ventilation")) return "#003300";
  if (s.includes("fat")) return "#10b981";
  if (s.includes("cho") || s.includes("carbohydrate")) return "#f97316";
  return undefined;
};

interface WassermanChartProps {
  data: any[];
  title: string;
  description?: string;
  config: any;
  isSteadyMode?: boolean;
  thresholds?: {
    at: number; // in minutes
    rc: number; // in minutes
    max?: number; // in minutes
    fatMax?: number; // in minutes
    fatMaxHr?: number; // Heart rate at FatMax
    calculatedAt?: number;
    calculatedRc?: number;
    calculatedMax?: number;
  };
}

export function WassermanChart({data, title, description, config, isSteadyMode, thresholds}: WassermanChartProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const plotData = useMemo(() => {
    const traces: any[] = [];
    const isScatterVsScatter = [PANEL_VE_VS_VCO2, PANEL_VSLOPE, PANEL_BREATHING_PATTERN].includes(config.id);
    const isRQ = config.id === PANEL_RQ;

    config.traces.forEach((trace: any) => {
      const color = trace.marker?.color || trace.line?.color || getClinicalColor(trace.name, trace.yKey);
      const isTimeBased = ["minutes", "t"].includes(trace.xKey);
      const isPercentage = (trace.name || "").includes("%") || (trace.yKey || "").includes("%");

      // Map x values if time based for formatting (Plotly date type works best for MM:SS)
      const xData = isTimeBased
          ? data.map((d) => new Date((d[trace.xKey] || 0) * SECONDS_PER_MINUTE * MS_PER_SECOND).toISOString())
          : data.map((d) => d[trace.xKey]);

      if (isSteadyMode) {
        // 0. Steady State View: Prominent markers with connecting lines
        traces.push({
          x: xData,
          y: data.map((d) => d[trace.yKey]),
          mode: "markers+lines" as const,
          name: trace.name,
          marker: {
            size: 8,
            opacity: 1,
            color: color,
            symbol: trace.marker?.symbol || "circle",
          },
          line: {
            width: 1.5,
            color: color,
            dash: "dot",
          },
          yaxis: trace.yaxis || "y",
          type: "scatter" as const,
          hovertemplate: isPercentage ? "%{y:.2f}%" : "%{y:.2f}",
        });
        return;
      }

      if (!isScatterVsScatter && !isRQ) {
        // 1. Raw Data Trace
        traces.push({
          x: xData,
          y: data.map((d) => d[trace.yKey]),
          mode: "markers" as const,
          name: `${trace.name} (raw)`,
          marker: {
            size: RAW_DATA_MARKER_SIZE,
            opacity: RAW_DATA_MARKER_OPACITY,
            color: color,
            symbol: trace.marker?.symbol || "circle",
          },
          yaxis: trace.yaxis || "y",
          type: "scatter" as const,
          showlegend: false,
          hoverinfo: "skip" as const,
        });

        // 2. Smoothed Trendline Trace
        const smoothedY = calculateMovingAverage(data, trace.xKey, trace.yKey, TRENDLINE_SMOOTHING_WINDOW_SECONDS);
        const isPercentage = (trace.name || "").includes("%") || (trace.yKey || "").includes("%");

        traces.push({
          x: xData,
          y: smoothedY,
          mode: "lines" as const,
          name: trace.name,
          line: {
            width: TRENDLINE_WIDTH,
            opacity: TRENDLINE_OPACITY,
            color: color,
            shape: "spline" as const,
            ...(trace.line || {}),
          },
          yaxis: trace.yaxis || "y",
          type: "scatter" as const,
          showlegend: true,
          hovertemplate: isPercentage ? "%{y:.2f}%" : "%{y:.2f}",
        });
      } else {
        // Excluded panels (4, 5, 7, 8): Just the main trace
        const isPercentage = (trace.name || "").includes("%") || (trace.yKey || "").includes("%");

        traces.push({
          x: xData,
          y: data.map((d) => d[trace.yKey]),
          mode: trace.mode || "markers",
          name: trace.name,
          marker: {
            size: DEFAULT_TRACE_MARKER_SIZE,
            opacity: DEFAULT_TRACE_MARKER_OPACITY,
            color: color,
            symbol: trace.marker?.symbol || "circle",
          },
          line: {
            width: DEFAULT_TRACE_LINE_WIDTH,
            color: color,
            ...(trace.line || {}),
          },
          yaxis: trace.yaxis || "y",
          type: "scatter" as const,
          hovertemplate: isPercentage ? "%{y:.2f}%" : "%{y:.2f}",
        });
      }
    });

    // Special case: Linear Regression for Panel 4 (VE vs VCO2)
    if (config.id === PANEL_VE_VS_VCO2 && thresholds?.rc) {
      const rcTime = thresholds.rc;
      const regressionData = data.filter((d) => d.minutes <= rcTime);
      const result = calculateLinearRegression(regressionData, "VCO2", "VE_ergo");
      if (result) {
        traces.push({
          x: [result.xMin, result.xMax],
          y: [result.m * result.xMin + result.b, result.m * result.xMax + result.b],
          mode: "lines",
          name: `Slope: ${result.m.toFixed(2)}`,
          line: {color: "#003300", width: REGRESSION_LINE_WIDTH, dash: "dot"},
          type: "scatter",
        });
      }
    }

    // Special case: Diagonal reference line for Panel 5 (V-Slope)
    if (config.id === PANEL_VSLOPE) {
      const xMax = Math.max(...data.map((d) => d.VO2 || 0));
      traces.push({
        x: [0, xMax],
        y: [0, xMax],
        mode: "lines",
        name: "Slope 1.0",
        line: {color: "#374151", width: REFERENCE_LINE_WIDTH, dash: "dash"},
        type: "scatter",
      });
    }

    // Special case: Horizontal reference lines for Panel 8 (RQ)
    if (isRQ) {
      const firstTrace = config.traces[0];
      const isTimeBased = ["minutes", "t"].includes(firstTrace.xKey);
      const xMinVal = Math.min(...data.map((d) => d[firstTrace.xKey] || 0));
      const xMaxVal = Math.max(...data.map((d) => d[firstTrace.xKey] || 0));

      const xRange = isTimeBased
          ? [new Date(xMinVal * SECONDS_PER_MINUTE * MS_PER_SECOND).toISOString(), new Date(xMaxVal * SECONDS_PER_MINUTE * MS_PER_SECOND).toISOString()]
          : [xMinVal, xMaxVal];

      [1.0, 1.1].forEach((val) => {
        traces.push({
          x: xRange,
          y: [val, val],
          mode: "lines",
          name: `RQ ${val.toFixed(2)}`,
          line: {color: "#c00000", width: val === 1.0 ? RQ_MAIN_LINE_WIDTH : RQ_SECONDARY_LINE_WIDTH, dash: val === 1.0 ? "dash" : "dot"},
          showlegend: false,
          type: "scatter",
          hoverinfo: "skip",
        });
      });
    }

    return traces;
  }, [data, config, thresholds]);

  const layout = useMemo(() => {
    const shapes: any[] = [];
    const annotations: any[] = [];

    const xKey = config.traces[0]?.xKey || "minutes";
    const isTimeBased = ["minutes", "t"].includes(xKey);

    const getXValue = (timeMin: number) => {
      if (xKey === "minutes") {
        return isTimeBased ? new Date(timeMin * SECONDS_PER_MINUTE * MS_PER_SECOND).toISOString() : timeMin;
      }
      const row = data.reduce((prev, curr) => {
        return Math.abs(curr.minutes - timeMin) < Math.abs(prev.minutes - timeMin) ? curr : prev;
      });
      if (!row) return null;
      return isTimeBased ? new Date(row[xKey] * SECONDS_PER_MINUTE * MS_PER_SECOND).toISOString() : row[xKey];
    };

    if (thresholds) {
      const markers = [
        {val: thresholds.at, label: "AT", color: "#10b981"},
        {val: thresholds.rc, label: "RC", color: "#f97316"},
        {val: thresholds.max, label: "Max", color: "#dc2626"},
        {val: thresholds.fatMax, label: "FatMax", color: "#3b82f6"},
        {val: thresholds.calculatedAt, label: "calc AT", color: "#10b981", dash: "dot"},
        {val: thresholds.calculatedRc, label: "calc RC", color: "#f97316", dash: "dot"},
        {val: thresholds.calculatedMax, label: "calc Max", color: "#dc2626", dash: "dot"},
      ];

      markers.forEach((m) => {
        if (m.val === undefined || m.val === null) return;
        const xVal = getXValue(m.val);
        if (xVal === null) return;

        shapes.push({
          type: "line",
          x0: xVal,
          x1: xVal,
          y0: 0,
          y1: 1,
          yref: "paper",
          line: {color: m.color, width: THRESHOLD_MARKER_WIDTH, dash: (m as any).dash || "dash"},
        });

        annotations.push({
          x: xVal,
          y: (m as any).dash === "dot" ? THRESHOLD_CALC_ANNOTATION_Y_PAPER : 1,
          yref: "paper",
          text: m.label,
          showarrow: false,
          xanchor: "center",
          font: {size: THRESHOLD_LABEL_SIZE, color: m.color, weight: "bold"},
          bgcolor: "rgba(255, 255, 255, 0.8)",
          yshift: (m as any).dash === "dot" ? -THRESHOLD_ANNOTATION_Y_OFFSET : THRESHOLD_ANNOTATION_Y_OFFSET,
        });
      });
    }

    const baseLayout = {
      autosize: true,
      height: CHART_HEIGHT,
      margin: {l: CHART_MARGIN_L, r: CHART_MARGIN_R, t: CHART_MARGIN_T, b: CHART_MARGIN_B},
      showlegend: true,
      legend: {
        orientation: "h" as const,
        x: LEGEND_X,
        y: LEGEND_Y,
        xanchor: "center" as const,
        yanchor: "top" as const,
        bgcolor: "rgba(255, 255, 255, 0.7)",
        bordercolor: "#e5e7eb",
        borderwidth: 1,
        font: {size: LEGEND_FONT_SIZE},
      },
      hovermode: "x unified" as const,
      hoverlabel: {bgcolor: "rgba(255, 255, 255, 0.9)"},
      plot_bgcolor: "white",
      paper_bgcolor: "white",
      xaxis: {
        automargin: true,
        type: isTimeBased ? ("date" as const) : ("linear" as const),
        tickformat: isTimeBased ? "%M:%S" : undefined,
        hoverformat: isTimeBased ? "%M:%S" : undefined,
        showgrid: true,
        gridcolor: "#f3f4f6",
        linecolor: "#d1d5db",
        zeroline: false,
        ticks: "outside" as const,
        tickfont: {size: AXIS_TICK_FONT_SIZE},
        title: {font: {size: AXIS_TITLE_FONT_SIZE, color: "#374151"}},
        ...(config.layout?.xaxis || {}),
      },
      yaxis: {
        automargin: true,
        showgrid: true,
        gridcolor: "#f3f4f6",
        linecolor: "#d1d5db",
        zeroline: false,
        ticks: "outside" as const,
        tickfont: {size: AXIS_TICK_FONT_SIZE},
        tickformat: ".2f",
        title: {font: {size: AXIS_TITLE_FONT_SIZE, color: "#374151"}},
        ...(config.layout?.yaxis || {}),
      },
    };

    // Special handling for dual axes and custom shapes/annotations
    const additionalLayout = Object.fromEntries(
        Object.entries(config.layout || {}).filter(
            ([key]) => !["xaxis", "yaxis", "shapes", "annotations"].includes(key)
        )
    );

    // Transform external shapes/annotations to ISO dates if necessary
    const externalShapes = (config.layout?.shapes || []).map((s: any) => {
      if (!isTimeBased) return s;
      const newS = {...s};
      if (typeof s.x0 === "number") newS.x0 = new Date(s.x0 * SECONDS_PER_MINUTE * MS_PER_SECOND).toISOString();
      if (typeof s.x1 === "number") newS.x1 = new Date(s.x1 * SECONDS_PER_MINUTE * MS_PER_SECOND).toISOString();
      return newS;
    });

    const externalAnnotations = (config.layout?.annotations || []).map((a: any) => {
      if (!isTimeBased) return a;
      const newA = {...a};
      if (typeof a.x === "number") newA.x = new Date(a.x * SECONDS_PER_MINUTE * MS_PER_SECOND).toISOString();
      return newA;
    });

    // Apply dual axis cleanup
    Object.keys(additionalLayout).forEach((key) => {
      if (key.startsWith("yaxis") && key !== "yaxis") {
        additionalLayout[key] = {
          automargin: true,
          showgrid: false,
          zeroline: false,
          ticks: "outside" as const,
          tickfont: {size: AXIS_TICK_FONT_SIZE},
          tickformat: ".2f",
          ...(typeof additionalLayout[key] === "object" ? (additionalLayout[key] as object) : {}),
        };
      }
    });

    return {
      ...baseLayout,
      ...additionalLayout,
      shapes: [...shapes, ...externalShapes],
      annotations: [...annotations, ...externalAnnotations],
    };
  }, [title, config, thresholds, data]);

  return (
      <div
          className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-3 transition-all hover:shadow-md relative group">
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-sm font-semibold text-gray-900 truncate pr-6" title={title}>
            {title}
          </h3>
          {description && (
              <div className="relative">
                <button
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <Info className="w-4 h-4"/>
                </button>
                {showTooltip && (
                    <div
                        className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50">
                      <div className="font-bold mb-1 border-b border-gray-700 pb-1 text-blue-400 uppercase tracking-wider">Physiological Insight
                      </div>
                      <div className="leading-relaxed opacity-90">
                        {description}
                      </div>
                      <div
                          className="absolute right-2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900"></div>
                    </div>
                )}
              </div>
          )}
        </div>
        <Plot
            data={plotData}
            layout={layout}
            config={{
              responsive: true,
              displayModeBar: false,
            }}
            className="w-full"
        />
      </div>
  );
}
