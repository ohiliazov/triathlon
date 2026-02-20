"use client";
import Link from "next/link";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Gauge, Activity, Clock } from "lucide-react";
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

/**
 * Calculates a time-based moving average for FIT records.
 */
function calculateMovingAverage(
  records: any[],
  yKey: string,
  windowSeconds: number,
  yTransform?: (val: number) => number | null
): (number | null)[] {
  if (windowSeconds <= 1) {
    return records.map((r) => {
      const val = r[yKey];
      if (val === undefined || val === null) return null;
      return yTransform ? yTransform(val) : val;
    });
  }

  const result: (number | null)[] = [];
  const halfWindowMs = (windowSeconds / 2) * 1000;

  let leftIdx = 0;
  let rightIdx = 0;
  let runningSum = 0;
  let count = 0;

  // Pre-calculate timestamps in ms for faster comparison
  const times = records.map((r) => new Date(r.timestamp).getTime());

  for (let i = 0; i < records.length; i++) {
    const curTime = times[i];
    const startTime = curTime - halfWindowMs;
    const endTime = curTime + halfWindowMs;

    // Expand right
    while (rightIdx < records.length && times[rightIdx] <= endTime) {
      const val = records[rightIdx][yKey];
      if (val !== null && val !== undefined && !isNaN(val)) {
        runningSum += val;
        count++;
      }
      rightIdx++;
    }

    // Shrink left
    while (leftIdx < rightIdx && times[leftIdx] < startTime) {
      const val = records[leftIdx][yKey];
      if (val !== null && val !== undefined && !isNaN(val)) {
        runningSum -= val;
        count--;
      }
      leftIdx++;
    }

    if (count > 0) {
      const avg = runningSum / count;
      result.push(yTransform ? yTransform(avg) : avg);
    } else {
      result.push(null);
    }
  }

  return result;
}

export default function ActivitiesPage() {
  const [activity, setActivity] = useState<ProcessedActivity | null>(null);
  const [smoothingWindow, setSmoothingWindow] = useState<number>(0);

  const handleActivityLoaded = (data: ProcessedActivity) => {
    setActivity(data);
  };

  const chartData = useMemo(() => {
    if (!activity || !activity.records || !activity.records.length) return null;

    const timestamps = activity.records.map((r) => r.timestamp);

    // Heart Rate
    const hrData = calculateMovingAverage(activity.records, "heart_rate", smoothingWindow);

    // Speed (m/s -> km/h)
    const speedData = calculateMovingAverage(activity.records, "speed", smoothingWindow, (v) => v * 3.6);

    // Pace (m/s -> min/km)
    const paceData = calculateMovingAverage(activity.records, "speed", smoothingWindow, (v) => {
      if (!v || v < 0.2) return null;
      const dec = 1000 / (v * 60);
      return dec > 60 ? null : dec;
    });

    // Altitude
    const altitudeData = calculateMovingAverage(activity.records, "altitude", smoothingWindow);

    // Cadence
    const cadenceData = calculateMovingAverage(activity.records, "cadence", smoothingWindow);

    return {
      heartRate: {
        x: timestamps,
        y: hrData,
        name: smoothingWindow > 0 ? `HR (${smoothingWindow}s avg)` : "Heart Rate",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "#dc2626", width: 2 },
        hovertemplate: "%{y:.0f} bpm<extra></extra>",
      },
      speed: {
        x: timestamps,
        y: speedData,
        name: smoothingWindow > 0 ? `Speed (${smoothingWindow}s avg)` : "Speed",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "#2563eb", width: 2 },
        hovertemplate: "%{y:.1f} km/h<extra></extra>",
      },
      pace: {
        x: timestamps,
        y: paceData,
        name: smoothingWindow > 0 ? `Pace (${smoothingWindow}s avg)` : "Pace",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "#8b5cf6", width: 2 },
        // Hover formatting for pace (MM:SS)
        text: paceData.map((p) => (p ? formatPace(p) : "")),
        hovertemplate: "%{text}/km<extra></extra>",
      },
      altitude: {
        x: timestamps,
        y: altitudeData,
        name: smoothingWindow > 0 ? `Altitude (${smoothingWindow}s avg)` : "Altitude",
        type: "scatter" as const,
        mode: "lines" as const,
        fill: "tozeroy" as const,
        line: { color: "#6b7280", width: 1 },
        fillcolor: "rgba(107, 114, 128, 0.2)",
        hovertemplate: "%{y:.1f} m<extra></extra>",
      },
      cadence: {
        x: timestamps,
        y: cadenceData,
        name: smoothingWindow > 0 ? `Cadence (${smoothingWindow}s avg)` : "Cadence",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "#10b981", width: 2 },
        hovertemplate: "%{y:.0f} rpm<extra></extra>",
      },
    };
  }, [activity, smoothingWindow]);


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

          {activity && (
            <div className="flex items-center space-x-4">
               <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <div className="flex items-center px-2 mr-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                   Smoothing:
                </div>
                {[0, 3, 5, 10, 30, 60].map((w) => (
                  <button
                    key={w}
                    onClick={() => setSmoothingWindow(w)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      smoothingWindow === w ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {w === 0 ? "Instant" : `${w}s`}
                  </button>
                ))}
              </div>
            </div>
          )}
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
                            yaxis: { showgrid: true, gridcolor: "#f3f4f6", title: { text: "bpm" } },
                            hovermode: "x unified",
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
                            title: { text: "min/km" },
                            autorange: "reversed",
                            // Use tickvals and ticktext to show MM:SS on the Y axis
                            tickmode: "array",
                            tickvals: [4, 5, 6, 7, 8, 9, 10, 12, 15, 20],
                            ticktext: ["4:00", "5:00", "6:00", "7:00", "8:00", "9:00", "10:00", "12:00", "15:00", "20:00"],
                          },
                          hovermode: "x unified",
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
                            yaxis: { showgrid: true, gridcolor: "#f3f4f6", title: { text: "m" } },
                            hovermode: "x unified",
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
                            yaxis: { showgrid: true, gridcolor: "#f3f4f6", title: { text: "rpm" } },
                            hovermode: "x unified",
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
