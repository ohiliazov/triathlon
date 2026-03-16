"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect } from "react";
import { Info, Maximize2, X } from "lucide-react";

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
const calculateMovingAverage = (
  data: any[],
  xKey: string,
  yKey: string,
  windowSeconds: number,
): number[] => {
  if (data.length === 0) return [];
  const halfWindowMinutes =
    windowSeconds / (SECONDS_PER_MINUTE * HALF_WINDOW_DIVISOR);
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
    at: number | null; // in minutes
    rc: number | null; // in minutes
    max?: number | null; // in minutes
    fatMax?: number | null; // in minutes
    fatMaxHr?: number | null; // Heart rate at FatMax
    calculatedAt?: number | null;
    calculatedRc?: number | null;
    calculatedMax?: number | null;
  };
}

export function WassermanChart({
  data,
  title,
  description,
  config,
  isSteadyMode,
  thresholds,
}: WassermanChartProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isExpanded]);

  const plotData = useMemo(() => {
    const traces: any[] = [];
    const isScatterVsScatter = [
      PANEL_VE_VS_VCO2,
      PANEL_VSLOPE,
      PANEL_BREATHING_PATTERN,
    ].includes(config.id);
    const isRQ = config.id === PANEL_RQ;

    config.traces.forEach((trace: any) => {
      const color =
        trace.marker?.color ||
        trace.line?.color ||
        getClinicalColor(trace.name, trace.yKey);
      const isTimeBased = ["minutes", "t"].includes(trace.xKey);
      const isPercentage =
        (trace.name || "").includes("%") || (trace.yKey || "").includes("%");

      // Map x values if time based for formatting (Plotly date type works best for MM:SS)
      const xData = isTimeBased
        ? data.map((d) =>
            new Date(
              (d[trace.xKey] || 0) * SECONDS_PER_MINUTE * MS_PER_SECOND,
            ).toISOString(),
          )
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
        const smoothedY = calculateMovingAverage(
          data,
          trace.xKey,
          trace.yKey,
          TRENDLINE_SMOOTHING_WINDOW_SECONDS,
        );
        const isPercentage =
          (trace.name || "").includes("%") || (trace.yKey || "").includes("%");

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
        const isPercentage =
          (trace.name || "").includes("%") || (trace.yKey || "").includes("%");

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
      const result = calculateLinearRegression(
        regressionData,
        "VCO2",
        "VE_ergo",
      );
      if (result) {
        traces.push({
          x: [result.xMin, result.xMax],
          y: [
            result.m * result.xMin + result.b,
            result.m * result.xMax + result.b,
          ],
          mode: "lines",
          name: `Slope: ${result.m.toFixed(2)}`,
          line: { color: "#003300", width: REGRESSION_LINE_WIDTH, dash: "dot" },
          type: "scatter",
        });
      }
    }

    // Special case: Diagonal reference line and V-Slope Piecewise for Panel 5 (V-Slope)
    if (config.id === PANEL_VSLOPE) {
      const xMin = Math.min(...data.map((d) => d.VO2 || 0));
      const xMax = Math.max(...data.map((d) => d.VO2 || 0));

      // 1. Reference Line (Slope 1.0) - Start from xMin instead of 0
      traces.push({
        x: [xMin, xMax],
        y: [xMin, xMax],
        mode: "lines",
        name: "Slope 1.0",
        line: { color: "#374151", width: REFERENCE_LINE_WIDTH, dash: "dash" },
        type: "scatter",
      });

      // 2. Piecewise V-Slope Regression
      if (thresholds) {
        const atTime = thresholds.calculatedAt || thresholds.at;
        if (atTime !== null) {
          const atPoint = data.find((d) => d.minutes >= atTime) || data[0];
          const atVO2 = atPoint.VO2 || 0;

          const leftData = data.filter(
            (d) => d.VO2 <= atVO2 && d.minutes <= atTime,
          );
          const rightData = data.filter(
            (d) =>
              d.VO2 >= atVO2 &&
              d.minutes >= atTime &&
              d.minutes <= (thresholds.max || 999),
          );

          const leftReg = calculateLinearRegression(leftData, "VO2", "VCO2");
          const rightReg = calculateLinearRegression(rightData, "VO2", "VCO2");

          if (leftReg) {
            traces.push({
              x: [leftReg.xMin, atVO2],
              y: [
                leftReg.m * leftReg.xMin + leftReg.b,
                leftReg.m * atVO2 + leftReg.b,
              ],
              mode: "lines",
              name: "V-Slope (Pre-AT)",
              line: {
                color: "#0053a4",
                width: REGRESSION_LINE_WIDTH,
                dash: "dot",
              },
              type: "scatter",
            });
          }
          if (rightReg) {
            traces.push({
              x: [atVO2, rightReg.xMax],
              y: [
                rightReg.m * atVO2 + rightReg.b,
                rightReg.m * rightReg.xMax + rightReg.b,
              ],
              mode: "lines",
              name: "V-Slope (Post-AT)",
              line: {
                color: "#c00000",
                width: REGRESSION_LINE_WIDTH,
                dash: "dot",
              },
              type: "scatter",
            });
          }
        }
      }
    }

    // Special case: Horizontal reference lines for Panel 8 (RQ)
    if (isRQ) {
      const firstTrace = config.traces[0];
      const isTimeBased = ["minutes", "t"].includes(firstTrace.xKey);
      const xMinVal = Math.min(...data.map((d) => d[firstTrace.xKey] || 0));
      const xMaxVal = Math.max(...data.map((d) => d[firstTrace.xKey] || 0));

      const xRange = isTimeBased
        ? [
            new Date(
              xMinVal * SECONDS_PER_MINUTE * MS_PER_SECOND,
            ).toISOString(),
            new Date(
              xMaxVal * SECONDS_PER_MINUTE * MS_PER_SECOND,
            ).toISOString(),
          ]
        : [xMinVal, xMaxVal];

      [1.0, 1.1].forEach((val) => {
        traces.push({
          x: xRange,
          y: [val, val],
          mode: "lines",
          name: `RQ ${val.toFixed(2)}`,
          line: {
            color: "#c00000",
            width: val === 1.0 ? RQ_MAIN_LINE_WIDTH : RQ_SECONDARY_LINE_WIDTH,
            dash: val === 1.0 ? "dash" : "dot",
          },
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

    // Normalize axis titles coming from external config to Plotly's expected object form
    const rawLayout = (config as any).layout || {};
    const normalizedConfigLayout: any = { ...rawLayout };
    if (
      normalizedConfigLayout.xaxis &&
      typeof normalizedConfigLayout.xaxis.title === "string"
    ) {
      normalizedConfigLayout.xaxis = {
        ...normalizedConfigLayout.xaxis,
        title: { text: normalizedConfigLayout.xaxis.title },
      };
    }
    if (
      normalizedConfigLayout.yaxis &&
      typeof normalizedConfigLayout.yaxis.title === "string"
    ) {
      normalizedConfigLayout.yaxis = {
        ...normalizedConfigLayout.yaxis,
        title: { text: normalizedConfigLayout.yaxis.title },
      };
    }

    const xKey = config.traces[0]?.xKey || "minutes";
    const isTimeBased = ["minutes", "t"].includes(xKey);

    const getXValue = (timeMin: number) => {
      if (xKey === "minutes") {
        return isTimeBased
          ? new Date(timeMin * SECONDS_PER_MINUTE * MS_PER_SECOND).toISOString()
          : timeMin;
      }
      const row = data.reduce((prev, curr) => {
        return Math.abs(curr.minutes - timeMin) <
          Math.abs(prev.minutes - timeMin)
          ? curr
          : prev;
      });
      if (!row) return null;
      return isTimeBased
        ? new Date(row[xKey] * SECONDS_PER_MINUTE * MS_PER_SECOND).toISOString()
        : row[xKey];
    };

    if (thresholds) {
      const markers = [
        { val: thresholds.at, label: "AT", color: "#10b981" },
        { val: thresholds.rc, label: "RC", color: "#f97316" },
        { val: thresholds.max, label: "Max", color: "#dc2626" },
        { val: thresholds.fatMax, label: "FatMax", color: "#3b82f6" },
        {
          val: thresholds.calculatedAt,
          label: "calc AT",
          color: "#10b981",
          dash: "dot",
        },
        {
          val: thresholds.calculatedRc,
          label: "calc RC",
          color: "#f97316",
          dash: "dot",
        },
        {
          val: thresholds.calculatedMax,
          label: "calc Max",
          color: "#dc2626",
          dash: "dot",
        },
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
          line: {
            color: m.color,
            width: THRESHOLD_MARKER_WIDTH,
            dash: (m as any).dash || "dash",
          },
        });

        annotations.push({
          x: xVal,
          y: (m as any).dash === "dot" ? THRESHOLD_CALC_ANNOTATION_Y_PAPER : 1,
          yref: "paper",
          text: m.label,
          showarrow: false,
          xanchor: "center",
          font: { size: THRESHOLD_LABEL_SIZE, color: m.color, weight: "bold" },
          bgcolor: "rgba(255, 255, 255, 0.8)",
          yshift:
            (m as any).dash === "dot"
              ? -THRESHOLD_ANNOTATION_Y_OFFSET
              : THRESHOLD_ANNOTATION_Y_OFFSET,
        });
      });
    }

    const baseLayout = {
      autosize: true,
      height: isExpanded ? undefined : CHART_HEIGHT,
      margin: isExpanded
        ? { l: 80, r: 40, t: 60, b: 120 }
        : {
            l: CHART_MARGIN_L,
            r: CHART_MARGIN_R,
            t: CHART_MARGIN_T,
            b: CHART_MARGIN_B,
          },
      showlegend: true,
      legend: {
        orientation: "h" as const,
        x: LEGEND_X,
        y: isExpanded ? -0.1 : LEGEND_Y,
        xanchor: "center" as const,
        yanchor: "top" as const,
        bgcolor: "rgba(255, 255, 255, 0.7)",
        bordercolor: "#e5e7eb",
        borderwidth: 1,
        font: { size: isExpanded ? 12 : LEGEND_FONT_SIZE },
      },
      hovermode: "x unified" as const,
      hoverlabel: { bgcolor: "rgba(255, 255, 255, 0.9)" },
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
        tickfont: { size: isExpanded ? 12 : AXIS_TICK_FONT_SIZE },
        title: {
          font: {
            size: isExpanded ? 14 : AXIS_TITLE_FONT_SIZE,
            color: "#374151",
          },
        },
        ...(normalizedConfigLayout?.xaxis || {}),
      },
      yaxis: {
        automargin: true,
        showgrid: true,
        gridcolor: "#f3f4f6",
        linecolor: "#d1d5db",
        zeroline: false,
        ticks: "outside" as const,
        tickfont: { size: isExpanded ? 12 : AXIS_TICK_FONT_SIZE },
        tickformat: ".2f",
        title: {
          font: {
            size: isExpanded ? 14 : AXIS_TITLE_FONT_SIZE,
            color: "#374151",
          },
        },
        ...(normalizedConfigLayout?.yaxis || {}),
      },
    };

    // Special handling for dual axes and custom shapes/annotations
    const additionalLayout: Record<string, any> = Object.fromEntries(
      Object.entries(normalizedConfigLayout || {}).filter(
        ([key]) => !["xaxis", "yaxis", "shapes", "annotations"].includes(key),
      ),
    );

    // Transform external shapes/annotations to ISO dates if necessary
    const externalShapes = (normalizedConfigLayout?.shapes || []).map(
      (s: any) => {
        if (!isTimeBased) return s;
        const newS = { ...s };
        if (typeof s.x0 === "number")
          newS.x0 = new Date(
            s.x0 * SECONDS_PER_MINUTE * MS_PER_SECOND,
          ).toISOString();
        if (typeof s.x1 === "number")
          newS.x1 = new Date(
            s.x1 * SECONDS_PER_MINUTE * MS_PER_SECOND,
          ).toISOString();
        return newS;
      },
    );

    const externalAnnotations = (normalizedConfigLayout?.annotations || []).map(
      (a: any) => {
        if (!isTimeBased) return a;
        const newA = { ...a };
        if (typeof a.x === "number")
          newA.x = new Date(
            a.x * SECONDS_PER_MINUTE * MS_PER_SECOND,
          ).toISOString();
        return newA;
      },
    );

    // Apply dual/multi-axis cleanup and normalize title strings to objects
    Object.keys(additionalLayout).forEach((key) => {
      if (key.startsWith("yaxis")) {
        const prev: any = additionalLayout[key];
        const merged: any = {
          automargin: true,
          showgrid: key === "yaxis" ? true : false,
          zeroline: false,
          ticks: "outside" as const,
          tickfont: { size: AXIS_TICK_FONT_SIZE },
          tickformat: ".2f",
          ...(typeof prev === "object" ? prev : {}),
        };
        if (merged && typeof merged.title === "string") {
          merged.title = { text: merged.title };
        }
        additionalLayout[key] = merged;
      } else if (key.startsWith("xaxis")) {
        const prev: any = additionalLayout[key];
        const merged: any = {
          automargin: true,
          showgrid: true,
          gridcolor: "#f3f4f6",
          linecolor: "#d1d5db",
          zeroline: false,
          ticks: "outside" as const,
          tickfont: { size: AXIS_TICK_FONT_SIZE },
          ...(typeof prev === "object" ? prev : {}),
        };
        if (merged && typeof merged.title === "string") {
          merged.title = { text: merged.title };
        }
        additionalLayout[key] = merged;
      }
    });

    return {
      ...baseLayout,
      ...additionalLayout,
      shapes: [...shapes, ...externalShapes],
      annotations: [...annotations, ...externalAnnotations],
    };
  }, [title, config, thresholds, data, isExpanded]);

  const chartContent = (
    <Plot
      data={plotData}
      layout={layout}
      config={{
        responsive: true,
        displayModeBar: isExpanded,
      }}
      className="w-full h-full"
      style={isExpanded ? { height: "calc(100vh - 180px)" } : {}}
    />
  );

  return (
    <>
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-3 transition-all hover:shadow-md relative group">
        <div className="flex items-center justify-between mb-2 px-1">
          <h3
            className="text-sm font-semibold text-gray-900 truncate pr-6"
            title={title}
          >
            {title}
          </h3>
          <div className="flex items-center space-x-2">
            {description && (
              <div className="relative">
                <button
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  className="text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>
                {showTooltip && (
                  <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50">
                    <div className="font-bold mb-1 border-b border-gray-700 pb-1 text-blue-400 uppercase tracking-wider">
                      Physiological Insight
                    </div>
                    <div className="leading-relaxed opacity-90">
                      {description}
                    </div>
                    <div className="absolute right-2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900"></div>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-600"
              title="Enlarge Chart"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {chartContent}
      </div>

      {isExpanded && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
          <div className="bg-white w-full max-w-7xl h-full max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex flex-col">
                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                {description && (
                  <p className="text-sm text-gray-500 mt-1">{description}</p>
                )}
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-hidden">
              <div className="w-full h-full">{chartContent}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
