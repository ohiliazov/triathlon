"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-gray-50 flex items-center justify-center rounded-lg border animate-pulse text-gray-400 text-sm">
      Loading Chart...
    </div>
  ),
});

interface ActivityChartProps {
  title: string;
  data: any[];
  layout?: any;
  height?: number;
}

export function ActivityChart({
  title,
  data,
  layout: customLayout,
  height = 300,
}: ActivityChartProps) {
  const mergedLayout = useMemo(() => {
    const baseLayout: any = {
      autosize: true,
      height: height,
      margin: { l: 50, r: 20, t: 40, b: 40 },
      showlegend: true,
      legend: {
        orientation: "h" as const,
        x: 0.5,
        y: -0.2,
        xanchor: "center" as const,
      },
      hovermode: "x unified" as const,
      plot_bgcolor: "white",
      paper_bgcolor: "white",
      xaxis: {
        showgrid: true,
        gridcolor: "#f3f4f6",
        linecolor: "#d1d5db",
      },
      yaxis: {
        showgrid: true,
        gridcolor: "#f3f4f6",
        linecolor: "#d1d5db",
      },
    };

    return { ...baseLayout, ...customLayout };
  }, [height, customLayout]);

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-medium text-gray-800 mb-4">{title}</h3>
      <Plot
        data={data}
        layout={mergedLayout}
        config={{
          responsive: true,
          displayModeBar: false,
        }}
        className="w-full"
      />
    </div>
  );
}
