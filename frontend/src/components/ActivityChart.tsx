"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect } from "react";
import { Maximize2, X } from "lucide-react";

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
  revision?: number;
  extraControls?: React.ReactNode;
}

export function ActivityChart({
  title,
  data,
  layout: customLayout,
  height = 300,
  revision,
  extraControls,
}: ActivityChartProps) {
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

  const mergedLayout = useMemo(() => {
    const baseLayout: any = {
      autosize: true,
      height: isExpanded ? undefined : height,
      margin: isExpanded
        ? { l: 60, r: 40, t: 60, b: 80 }
        : { l: 50, r: 20, t: 40, b: 40 },
      showlegend: true,
      legend: {
        orientation: "h" as const,
        x: 0.5,
        y: isExpanded ? -0.1 : -0.2,
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
      datarevision: revision,
    };

    return { ...baseLayout, ...customLayout, datarevision: revision };
  }, [height, customLayout, revision, isExpanded]);

  const chartContent = (
    <Plot
      data={data}
      layout={mergedLayout}
      revision={revision}
      config={{
        responsive: true,
        displayModeBar: isExpanded,
      }}
      className="w-full h-full"
      style={isExpanded ? { height: "calc(100vh - 120px)" } : {}}
    />
  );

  return (
    <>
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800">{title}</h3>
          <div className="flex items-center space-x-2">
            {extraControls && <div>{extraControls}</div>}
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
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
          <div className="bg-white w-full max-w-7xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
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
