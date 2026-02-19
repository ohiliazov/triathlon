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

interface WassermanChartProps {
  data: any[];
  title: string;
  description?: string;
  config: any;
  thresholds?: {
    at: number; // in minutes
    rc: number; // in minutes
  };
}

export default function WassermanChart({ data, title, description, config, thresholds }: WassermanChartProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const plotData = useMemo(() => {
    const traces = config.traces.map((trace: any) => {
      const baseTrace = {
        x: data.map((d) => d[trace.xKey]),
        y: data.map((d) => d[trace.yKey]),
        mode: trace.mode || "markers",
        name: trace.name,
        marker: {
          size: 6,
          opacity: 0.6,
          symbol: trace.marker?.symbol || "circle",
          ...(trace.marker || {}),
        },
        line: {
          width: 1,
          ...(trace.line || {}),
        },
        yaxis: trace.yaxis || "y",
        type: "scatter" as const,
      };

      // If trendline is requested, add another trace or change mode
      // For now, let's just use what's passed in mode
      return baseTrace;
    });

    // Special case: Linear Regression for Panel 4 (VE vs VCO2)
    if (config.id === 4 && thresholds?.rc) {
      const rcTime = thresholds.rc;
      const regressionData = data.filter((d) => d.minutes <= rcTime);
      if (regressionData.length > 1) {
        const x = regressionData.map((d) => d.VCO2);
        const y = regressionData.map((d) => d.VE_ergo);

        // Simple linear regression: y = mx + b
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
        const sumXX = x.reduce((a, b) => a + b * b, 0);

        const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const b = (sumY - m * sumX) / n;

        const xMin = Math.min(...x);
        const xMax = Math.max(...x);

        traces.push({
          x: [xMin, xMax],
          y: [m * xMin + b, m * xMax + b],
          mode: "lines",
          name: `Slope: ${m.toFixed(2)}`,
          line: { color: "#003300", width: 1 },
          type: "scatter",
        });
      }
    }

    // Special case: Diagonal reference line for Panel 5 (V-Slope)
    if (config.id === 5) {
      const xMax = Math.max(...data.map((d) => d.VO2 || 0));
      traces.push({
        x: [0, xMax],
        y: [0, xMax],
        mode: "lines",
        name: "Slope 1.0",
        line: { color: "#000000", width: 1, dash: "dash" },
        type: "scatter",
      });
    }

    // Special case: Horizontal reference lines for Panel 8 (RQ)
    if (config.id === 8) {
      const xMin = Math.min(...data.map((d) => d[config.traces[0].xKey] || 0));
      const xMax = Math.max(...data.map((d) => d[config.traces[0].xKey] || 0));
      traces.push({
        x: [xMin, xMax],
        y: [1.0, 1.0],
        mode: "lines",
        name: "RQ 1.00",
        line: { color: "#c00000", width: 1.5, dash: "dash" },
        showlegend: false,
        type: "scatter",
      });
      traces.push({
        x: [xMin, xMax],
        y: [1.1, 1.1],
        mode: "lines",
        name: "RQ 1.10",
        line: { color: "#c00000", width: 1, dash: "dot" },
        showlegend: false,
        type: "scatter",
      });
    }

    return traces;
  }, [data, config, thresholds]);

  const layout = useMemo(() => {
    const shapes: any[] = [];

    // Add vertical threshold lines for time-based charts
    const isTimeX = config.traces.some((t: any) => t.xKey === "minutes");
    if (isTimeX && thresholds) {
      shapes.push({
        type: "line",
        x0: thresholds.at,
        x1: thresholds.at,
        y0: 0,
        y1: 1,
        yref: "paper",
        line: { color: "#10b981", width: 2, dash: "dash" },
      });
      shapes.push({
        type: "line",
        x0: thresholds.rc,
        x1: thresholds.rc,
        y0: 0,
        y1: 1,
        yref: "paper",
        line: { color: "#f97316", width: 2, dash: "dash" },
      });
    }

    const baseLayout = {
      autosize: true,
      height: 350,
      margin: { l: 50, r: 50, t: 30, b: 50 },
      showlegend: true,
      legend: {
        orientation: "h" as const,
        y: -0.2,
        x: 0.5,
        xanchor: "center" as const,
        font: { size: 10 },
      },
      hovermode: "closest" as const,
      plot_bgcolor: "white",
      paper_bgcolor: "white",
      xaxis: {
        showgrid: true,
        gridcolor: "#f3f4f6",
        linecolor: "#d1d5db",
        ticks: "outside" as const,
        tickfont: { size: 10 },
        title: { font: { size: 11, color: "#374151" } },
        ...(config.layout?.xaxis || {}),
      },
      yaxis: {
        showgrid: true,
        gridcolor: "#f3f4f6",
        linecolor: "#d1d5db",
        ticks: "outside" as const,
        tickfont: { size: 10 },
        title: { font: { size: 11, color: "#374151" } },
        ...(config.layout?.yaxis || {}),
      },
      shapes,
    };

    // Merge additional layout properties (like yaxis2)
    return {
      ...baseLayout,
      ...Object.fromEntries(
        Object.entries(config.layout || {}).filter(([key]) => key !== "xaxis" && key !== "yaxis")
      ),
    };
  }, [title, config, thresholds]);

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-3 transition-all hover:shadow-md relative group">
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
              <Info className="w-4 h-4" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-[11px] leading-relaxed rounded-lg shadow-xl z-50">
                <div className="font-bold mb-1 border-b border-gray-700 pb-1 text-blue-400">Panel Explanation</div>
                {description}
                <div className="absolute right-2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900"></div>
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
