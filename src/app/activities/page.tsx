"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Timer,
  MapPin,
  Heart,
  Zap,
  Settings,
  Activity,
  TrendingUp,
} from "lucide-react";
import { ProcessedActivity } from "@/lib/fitProcessor";
import {
  formatDuration,
  formatPace,
  ChartSettings,
  prepareActivityChartData,
} from "@/lib/activityUtils";
import FitFileUploader from "@/components/FitFileUploader";
import { ActivityChart } from "@/components/ActivityChart";

export default function ActivitiesPage() {
  const [activity, setActivity] = useState<ProcessedActivity | null>(null);
  const [settings, setSettings] = useState<ChartSettings>({
    smoothingWindow: 10,
    intervalWindow: 0,
    usePace: true,
    overlayPaceOnHR: true,
    overlayElevationOnSpeed: true,
    xAxisType: "time",
  });

  useEffect(() => {
    if (activity) {
      const isRunning =
        activity.session?.sport === "running" ||
        activity.session?.sport === "walking";
      setSettings((prev) => ({
        ...prev,
        usePace: isRunning,
      }));
    }
  }, [activity]);

  const reset = () => setActivity(null);

  const charts = useMemo(() => {
    return prepareActivityChartData(activity!, settings);
  }, [activity, settings]);

  // If no activity loaded, show upload view
  if (!activity) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center">
        <Link
          href="/"
          className="flex items-center text-sm text-gray-500 hover:text-blue-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>

        <div className="max-w-2xl w-full">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Activity Analysis
            </h1>
            <p className="text-lg text-gray-600">
              Upload your FIT file to see detailed performance metrics and
              charts.
            </p>
          </div>
          <FitFileUploader onActivityLoaded={setActivity} />
        </div>
      </div>
    );
  }

  if (!charts) return null;

  // Activity stats
  const stats = {
    distance: activity.session?.total_distance
      ? (activity.session.total_distance / 1000).toFixed(2)
      : "0.00",
    duration: activity.session?.total_timer_time
      ? formatDuration(activity.session.total_timer_time)
      : "0:00:00",
    avgHr: activity.session?.avg_heart_rate || "--",
    avgSpeed: activity.session?.avg_speed
      ? (activity.session.avg_speed * 3.6).toFixed(1)
      : "0.0",
    avgPace:
      activity.session?.avg_speed && activity.session.avg_speed > 0
        ? formatPace(1000 / (activity.session.avg_speed * 60))
        : "--:--",
    sport: activity.session?.sport || "Activity",
  };

  const hasPower = activity.records.some(
    (r) => r.power !== undefined && r.power !== null,
  );
  const hasCadence = activity.records.some(
    (r) => r.cadence !== undefined && r.cadence !== null,
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={reset}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
              title="Upload new file"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 capitalize">
              {stats.sport} Analysis
            </h1>
          </div>
          <div className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full capitalize">
            {activity.session?.sport || "N/A"}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Distance"
            value={stats.distance}
            unit="km"
            icon={<MapPin className="w-5 h-5 text-blue-500" />}
          />
          <StatCard
            label="Duration"
            value={stats.duration}
            icon={<Timer className="w-5 h-5 text-green-500" />}
          />
          <StatCard
            label="Avg Heart Rate"
            value={stats.avgHr}
            unit="bpm"
            icon={<Heart className="w-5 h-5 text-red-500" />}
          />
          <StatCard
            label={settings.usePace ? "Avg Pace" : "Avg Speed"}
            value={settings.usePace ? stats.avgPace : stats.avgSpeed}
            unit={settings.usePace ? "/km" : "km/h"}
            icon={<Zap className="w-5 h-5 text-yellow-500" />}
          />
        </div>

        {/* Controls Section */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-2 text-gray-800 font-semibold">
              <Settings className="w-5 h-5 text-gray-400" />
              <span>Display Settings</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Smoothing
                </label>
                <select
                  value={settings.smoothingWindow}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      smoothingWindow: Number(e.target.value),
                    })
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value={0}>None (Raw)</option>
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  X-Axis
                </label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() =>
                      setSettings({ ...settings, xAxisType: "time" })
                    }
                    className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                      settings.xAxisType === "time"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Time
                  </button>
                  <button
                    onClick={() =>
                      setSettings({ ...settings, xAxisType: "distance" })
                    }
                    className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                      settings.xAxisType === "distance"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Dist
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Metric
                </label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setSettings({ ...settings, usePace: false })}
                    className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                      !settings.usePace
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Speed
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, usePace: true })}
                    className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                      settings.usePace
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Pace
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Overlays
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1.5">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={settings.overlayPaceOnHR}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          overlayPaceOnHR: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">
                      HR+Pace
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={settings.overlayElevationOnSpeed}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          overlayElevationOnSpeed: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">
                      Speed+Elev
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <ActivityChart
            title={charts.heartRate.layout.title.text}
            data={charts.heartRate.data}
            layout={charts.heartRate.layout}
          />

          <ActivityChart
            title={charts.paceSpeed.layout.title.text}
            data={charts.paceSpeed.data}
            layout={charts.paceSpeed.layout}
          />

          {hasPower && (
            <ActivityChart
              title="Power"
              data={charts.power.data}
              layout={charts.power.layout}
            />
          )}

          <ActivityChart
            title="Elevation"
            data={charts.altitude.data}
            layout={charts.altitude.layout}
          />

          {hasCadence && (
            <ActivityChart
              title="Cadence"
              data={charts.cadence.data}
              layout={charts.cadence.layout}
            />
          )}
        </div>

        {/* Laps Table */}
        {activity.laps && activity.laps.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Laps</h2>
              <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded border">
                {activity.laps.length} Laps Total
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Lap</th>
                    <th className="px-6 py-3">Distance</th>
                    <th className="px-6 py-3">Duration</th>
                    <th className="px-6 py-3">Avg Pace/Speed</th>
                    <th className="px-6 py-3 text-right">Avg HR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activity.laps.map((lap, i) => {
                    const lapDist = lap.total_distance
                      ? (lap.total_distance / 1000).toFixed(2)
                      : "0.00";
                    const lapTime = formatDuration(lap.total_timer_time || 0);
                    const lapPace =
                      lap.avg_speed && lap.avg_speed > 0
                        ? settings.usePace
                          ? `${formatPace(1000 / (lap.avg_speed * 60))}/km`
                          : `${(lap.avg_speed * 3.6).toFixed(1)} km/h`
                        : "--";

                    return (
                      <tr
                        key={i}
                        className="hover:bg-blue-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {i + 1}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {lapDist} km
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {lapTime}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {lapPace}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-right">
                          {lap.avg_heart_rate || "--"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, unit, icon }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start space-x-4">
      <div className="p-3 bg-gray-50 rounded-lg shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500 mb-1 truncate">
          {label}
        </p>
        <div className="flex items-baseline space-x-1">
          <span className="text-2xl font-bold text-gray-900 truncate">
            {value}
          </span>
          {unit && (
            <span className="text-sm font-medium text-gray-500 shrink-0">
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
