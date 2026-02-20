"use client";
import Link from "next/link";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Gauge, Activity } from "lucide-react";
import { ProcessedActivity } from "@/lib/fitProcessor";
import FitFileUploader from "@/components/FitFileUploader";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-gray-50 flex items-center justify-center rounded-lg border animate-pulse text-gray-400 text-sm">
      Loading Chart...
    </div>
  ),
});

export default function ActivitiesPage() {
  const [activity, setActivity] = useState<ProcessedActivity | null>(null);

  const handleActivityLoaded = (data: ProcessedActivity) => {
    setActivity(data);
  };

  const chartData = useMemo(() => {
    if (!activity || !activity.records || !activity.records.length) return null;

    const timestamps = activity.records.map((r) => r.timestamp);

    return {
      heartRate: {
        x: timestamps,
        y: activity.records.map((r) => r.heart_rate),
        name: "Heart Rate",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "#dc2626", width: 2 },
      },
      speed: {
        x: timestamps,
        y: activity.records.map((r) => (r.speed ? r.speed * 3.6 : null)),
        name: "Speed (km/h)",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "#2563eb", width: 2 },
      },
      pace: {
        x: timestamps,
        y: activity.records.map((r) => {
          if (!r.speed || r.speed < 0.2) return null;
          const decimalMinutes = 1000 / (r.speed * 60);
          if (decimalMinutes > 60) return null; // Cap chart at 60 min/km to avoid extreme outliers
          return decimalMinutes;
        }),
        name: "Pace (min/km)",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "#8b5cf6", width: 2 },
      },
      altitude: {
        x: timestamps,
        y: activity.records.map((r) => r.altitude),
        name: "Altitude",
        type: "scatter" as const,
        mode: "lines" as const,
        fill: "tozeroy" as const,
        line: { color: "#6b7280", width: 1 },
        fillcolor: "rgba(107, 114, 128, 0.2)",
      },
      cadence: {
        x: timestamps,
        y: activity.records.map((r) => r.cadence),
        name: "Cadence",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "#10b981", width: 2 },
      },
    };
  }, [activity]);

  const formatDuration = (seconds: number | null) => {
    if (seconds === null || isNaN(seconds)) return "--:--";
    const total = Math.round(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatPace = (decimalMinutes: number | null) => {
    if (decimalMinutes === null || isNaN(decimalMinutes) || decimalMinutes <= 0) return "--:--";
    const totalSeconds = Math.round(decimalMinutes * 60);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Gauge className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">VeloGraph CPET Analytics</h1>
            <nav className="ml-8 flex space-x-4">
              <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-700">CPET</Link>
              <Link href="/activities" className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 flex items-center">
                <Activity className="w-4 h-4 mr-1" />
                FIT Activities
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Activity Analytics</h1>
          <p className="text-gray-500">Upload and analyze your FIT activity data.</p>
        </header>

        <div className="space-y-8">
          {!activity && (
            <div className="py-12">
              <FitFileUploader onActivityLoaded={handleActivityLoaded} />
              <p className="mt-6 text-center text-gray-500 text-sm">
                Upload your <b>.fit</b> file to generate activity charts and summaries.
              </p>
            </div>
          )}

          {activity && (
            <div className="animate-in fade-in duration-500 space-y-8">
              {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Distance</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {activity.session?.total_distance ? (activity.session.total_distance / 1000).toFixed(2) : "0.00"}
                      <span className="text-sm font-normal text-gray-500 ml-1">km</span>
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Duration</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {activity.session?.total_timer_time ? formatDuration(activity.session.total_timer_time) : "00:00"}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Avg HR</p>
                    <p className="text-2xl font-bold text-red-600">
                      {activity.session?.avg_heart_rate || "--"}
                      <span className="text-sm font-normal text-gray-500 ml-1">bpm</span>
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Avg Pace</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {(() => {
                        const s = activity.session;
                        if (!s) return "--:--";
                        const hasTD = typeof s.total_timer_time === "number" && typeof s.total_distance === "number" && s.total_distance > 0;
                        const dec = hasTD
                          ? (s.total_timer_time / 60) / (s.total_distance / 1000)
                          : (typeof s.avg_speed === "number" && s.avg_speed > 0 ? 1000 / (s.avg_speed * 60) : null);
                        return dec !== null ? formatPace(dec) : "--:--";
                      })()}
                      <span className="text-sm font-normal text-gray-500 ml-1">/km</span>
                    </p>
                  </div>
                </div>

                {/* Charts */}
                {chartData && (
                  <div className="grid grid-cols-1 gap-6">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                        <Plot
                          data={[chartData.heartRate]}
                          layout={{
                            title: { text: "Heart Rate", font: { size: 14 } },
                            autosize: true,
                            margin: { t: 40, b: 40, l: 50, r: 20 },
                            xaxis: { showgrid: true, gridcolor: "#f3f4f6", tickformat: "%H:%M:%S" },
                            yaxis: { showgrid: true, gridcolor: "#f3f4f6", title: "bpm" },
                          }}
                          config={{ responsive: true, displayModeBar: false }}
                          className="w-full h-[300px]"
                        />
                    </div>

                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                      <Plot
                        data={[chartData.pace]}
                        layout={{
                          title: { text: "Pace", font: { size: 14 } },
                          autosize: true,
                          margin: { t: 40, b: 40, l: 60, r: 20 },
                          xaxis: { showgrid: true, gridcolor: "#f3f4f6", tickformat: "%H:%M:%S" },
                          yaxis: {
                            showgrid: true,
                            gridcolor: "#f3f4f6",
                            title: "min/km",
                            autorange: "reversed",
                            // Use tickvals and ticktext to show MM:SS on the Y axis
                            tickmode: "array",
                            tickvals: [4, 5, 6, 7, 8, 9, 10, 12, 15, 20],
                            ticktext: ["4:00", "5:00", "6:00", "7:00", "8:00", "9:00", "10:00", "12:00", "15:00", "20:00"],
                          },
                        }}
                        config={{ responsive: true, displayModeBar: false }}
                        className="w-full h-[300px]"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                        <Plot
                          data={[chartData.altitude]}
                          layout={{
                            title: { text: "Altitude", font: { size: 14 } },
                            autosize: true,
                            margin: { t: 40, b: 40, l: 50, r: 20 },
                            xaxis: { showgrid: true, gridcolor: "#f3f4f6", tickformat: "%H:%M:%S" },
                            yaxis: { showgrid: true, gridcolor: "#f3f4f6", title: "m" },
                          }}
                          config={{ responsive: true, displayModeBar: false }}
                          className="w-full h-[250px]"
                        />
                      </div>
                      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                        <Plot
                          data={[chartData.cadence]}
                          layout={{
                            title: { text: "Cadence", font: { size: 14 } },
                            autosize: true,
                            margin: { t: 40, b: 40, l: 50, r: 20 },
                            xaxis: { showgrid: true, gridcolor: "#f3f4f6", tickformat: "%H:%M:%S" },
                            yaxis: { showgrid: true, gridcolor: "#f3f4f6", title: "rpm" },
                          }}
                          config={{ responsive: true, displayModeBar: false }}
                          className="w-full h-[250px]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Laps Table */}
                {activity.laps && activity.laps.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                      <h2 className="font-semibold text-gray-700">Laps Summary</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100">
                            <th className="px-6 py-3 font-bold">Lap</th>
                            <th className="px-6 py-3 font-bold">Time</th>
                            <th className="px-6 py-3 font-bold">Distance</th>
                            <th className="px-6 py-3 font-bold">Avg HR</th>
                            <th className="px-6 py-3 font-bold">Avg Pace</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {activity.laps.map((lap, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-gray-900">{i + 1}</td>
                              <td className="px-6 py-4 text-gray-600">
                                {lap.total_timer_time ? formatDuration(lap.total_timer_time) : "00:00"}
                              </td>
                              <td className="px-6 py-4 text-gray-600">
                                {lap.total_distance ? (lap.total_distance / 1000).toFixed(2) : "0.00"} km
                              </td>
                              <td className="px-6 py-4 text-gray-600">{lap.avg_heart_rate || "--"}</td>
                              <td className="px-6 py-4 text-gray-600">
                                {(() => {
                                  const hasTD = typeof lap.total_timer_time === "number" && typeof lap.total_distance === "number" && lap.total_distance > 0;
                                  const dec = hasTD
                                    ? (lap.total_timer_time / 60) / (lap.total_distance / 1000)
                                    : (typeof lap.avg_speed === "number" && lap.avg_speed > 0 ? 1000 / (lap.avg_speed * 60) : null);
                                  return dec !== null ? `${formatPace(dec)}/km` : "--:--";
                                })()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-center pt-8">
                  <button
                    onClick={() => setActivity(null)}
                    className="text-sm text-gray-500 hover:text-red-600 underline underline-offset-4 decoration-gray-300 hover:decoration-red-300 transition-colors"
                  >
                    Upload different file
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
}
