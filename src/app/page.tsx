"use client";

import { useMemo, useState } from "react";
import FileUploader from "@/components/FileUploader";
import WassermanChart from "@/components/WassermanChart";
import { Clock, Gauge, BarChart3, LayoutGrid, Info } from "lucide-react";

export default function Home() {
  const [data, setData] = useState<any[] | null>(null);
  const [thresholds, setThresholds] = useState<{ at: number; rc: number } | null>(null);
  const [xAxisMode, setXAxisMode] = useState<"minutes" | "Speed">("minutes");
  const [activeTab, setActiveTab] = useState<"wasserman" | "supplementary">("wasserman");

  const handleDataLoaded = (payload: any) => {
    setData(payload.data);
    setThresholds(payload.thresholds);
  };

  const currentLT1 = useMemo(() => {
    if (!data || !thresholds) return null;
    return data.find((d) => d.minutes >= thresholds.at) || data[0];
  }, [data, thresholds]);

  const currentLT2 = useMemo(() => {
    if (!data || !thresholds) return null;
    return data.find((d) => d.minutes >= thresholds.rc) || data[data.length - 1];
  }, [data, thresholds]);

  const wassermanPanels = useMemo(() => {
    if (!data) return [];

    const xLabel = xAxisMode === "minutes" ? "Time (min)" : "Speed (km/h)";

    return [
      {
        id: 1,
        title: "1. Ventilation vs. Time",
        description: "Tracks ventilatory demand. Look for the inflection point where VE_ergo increases out of proportion to Speed.",
        config: {
          id: 1,
          traces: [
            { xKey: xAxisMode, yKey: "VE_ergo", name: "VE", marker: { color: "#003300", symbol: "circle" } },
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
        description: "VO2/HR should rise and eventually plateau. HR should increase linearly with Speed/t. Sudden flattening or drops in VO2/HR during active work indicate cardiovascular limitation.",
        config: {
          id: 2,
          traces: [
            { xKey: xAxisMode, yKey: "HR", name: "HR", marker: { color: "#800000", symbol: "cross" }, yaxis: "y" },
            { xKey: xAxisMode, yKey: "VO2/HR", name: "VO2/HR", marker: { color: "#0053a4", symbol: "circle-open" }, yaxis: "y2" },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: { title: "HR (bpm)", titlefont: { color: "#800000" }, tickfont: { color: "#800000" } },
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
        description: "VO2 and VCO2 should rise linearly. Because there is no recovery data, the plot ends at peak values. Note: Units in this file are mL/min, not L/min.",
        config: {
          id: 3,
          traces: [
            { xKey: xAxisMode, yKey: "VO2", name: "VO2", marker: { color: "#0053a4", symbol: "circle-open" } },
            { xKey: xAxisMode, yKey: "VCO2", name: "VCO2", marker: { color: "#c00000", symbol: "triangle-up" } },
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
        description: "Evaluates dead space and V/Q mismatch. The slope (VE/VCO2 slope) is highly prognostic.",
        config: {
          id: 4,
          traces: [
            { xKey: "VCO2", yKey: "VE_ergo", name: "VE vs VCO2", marker: { color: "#003300", symbol: "circle" }, mode: "markers" },
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
        description: "Used to find Anaerobic Threshold (AT). Find where VCO2 slope steepens relative to VO2 slope (crossing 1.0). Cross-reference with 'AT' timestamp from 'Wyniki.csv' (00:08:00).",
        config: {
          id: 5,
          traces: [
            { xKey: "VO2", yKey: "VCO2", name: "VCO2", marker: { color: "#0053a4", symbol: "circle" }, mode: "markers", yaxis: "y" },
            { xKey: "VO2", yKey: "HR", name: "HR", marker: { color: "#800000", symbol: "cross" }, mode: "markers", yaxis: "y2" },
          ],
          layout: {
            xaxis: { title: "VO2 (mL/min)" },
            yaxis: { title: "VCO2 (mL/min)", titlefont: { color: "#0053a4" }, tickfont: { color: "#0053a4" } },
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
        description: "Pinpoints thresholds. AT (VT1) occurs when VE/VO2 rises while VE/VCO2 stays flat. RC (VT2) occurs when both rise simultaneously. Check 'Wyniki.csv' for expected timestamps (AT=00:08:00, RC=00:13:40).",
        config: {
          id: 6,
          traces: [
            { xKey: xAxisMode, yKey: "VE/VO2", name: "VE/VO2", marker: { color: "#0053a4", symbol: "circle" } },
            { xKey: xAxisMode, yKey: "VE/VCO2", name: "VE/VCO2", marker: { color: "#c00000", symbol: "circle" } },
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
        description: "Shows how the athlete achieves ventilation. VT usually rises linearly and then plateaus, after which further VE_ergo increases are achieved purely by breathing faster ('Rf' column).",
        config: {
          id: 7,
          traces: [
            { xKey: "VE_ergo", yKey: "VT", name: "VT vs VE", marker: { color: "#00008b", symbol: "circle" }, mode: "markers" },
          ],
          layout: {
            xaxis: { title: "VE (L/min)" },
            yaxis: { title: "VT (L)" },
          },
        },
      },
      {
        id: 8,
        title: "8. Respiratory Exchange Ratio",
        description: "Indicates fuel utilization. Peaking > 1.10 confirms a near-maximal or maximal effort.",
        config: {
          id: 8,
          traces: [
            { xKey: xAxisMode, yKey: "RQ", name: "RQ (RER)", marker: { color: "#000000", symbol: "circle" } },
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
        description: "PetCO2 normally rises to the AT, then falls post-RC. PetO2 falls initially, then rises after the AT.",
        config: {
          id: 9,
          traces: [
            { xKey: xAxisMode, yKey: "PetO2", name: "PetO2", marker: { color: "#0053a4", symbol: "circle-open" } },
            { xKey: xAxisMode, yKey: "PetCO2", name: "PetCO2", marker: { color: "#c00000", symbol: "circle" } },
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
    if (!data) return [];

    const xLabel = xAxisMode === "minutes" ? "Time (min)" : "Speed (km/h)";

  // Find FatMax
    let fatMaxVal = 0;
    let fatMaxX = 0;
    let fatMaxHR = 0;
    if (data.length > 0) {
      const maxFatRow = [...data].sort((a, b) => (b.FAT || 0) - (a.FAT || 0))[0];
      fatMaxVal = maxFatRow.FAT || 0;
      fatMaxX = maxFatRow[xAxisMode] || 0;
      fatMaxHR = maxFatRow.HR || 0;
    }

    return [
      {
        id: "S1",
        title: "S1. Substrate Utilization & HR",
        description: "Crucial for endurance nutrition. Shows the exact intensity where fat oxidation peaks (FatMax) and where carbohydrate oxidation overtakes fat (Crossover Point). Helps in planning race-day fueling.",
        config: {
          id: "S1",
          traces: [
            { xKey: xAxisMode, yKey: "FAT", name: "FAT", marker: { color: "#10b981", symbol: "circle" }, mode: "markers", yaxis: "y" },
            { xKey: xAxisMode, yKey: "CHO", name: "CHO", marker: { color: "#f97316", symbol: "circle" }, mode: "markers", yaxis: "y" },
            { xKey: xAxisMode, yKey: "HR", name: "HR", line: { color: "#800000", dash: "dash" }, mode: "lines", yaxis: "y2" },
          ],
          layout: {
            xaxis: { title: xLabel },
            yaxis: { title: "FAT, CHO (kcal/min)", rangemode: "tozero" },
            yaxis2: {
              title: "HR (bpm)",
              titlefont: { color: "#800000" },
              tickfont: { color: "#800000" },
              overlaying: "y",
              side: "right",
              showgrid: false,
            },
            shapes: [
              {
                type: "line",
                x0: fatMaxX,
                x1: fatMaxX,
                y0: 0,
                y1: 1,
                yref: "paper",
                line: { color: "black", width: 1, dash: "dash" },
              }
            ],
            annotations: [
              {
                x: fatMaxX,
                y: 1.05,
                xref: "x",
                yref: "paper",
                text: `FatMax HR: ${fatMaxHR.toFixed(0)}`,
                showarrow: false,
                font: { size: 10, color: "#800000", fontWeight: "bold" },
              }
            ]
          },
        },
      },
      {
        id: "S2",
        title: "S2. Running Economy & Cardiac Load",
        description: "Evaluates how much oxygen the athlete requires to run at a given speed. A flatter slope or lower VO2 at submaximal speeds indicates a highly economical runner.",
        config: {
          id: "S2",
          traces: [
            { xKey: xAxisMode, yKey: "VO2/kg", name: "VO2/kg", marker: { color: "#0053a4", symbol: "circle" }, yaxis: "y" },
            { xKey: xAxisMode, yKey: "HR", name: "HR", line: { color: "#800000", dash: "dash" }, mode: "lines", yaxis: "y2" },
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
        description: "Shows the exact caloric burn rate at different paces. Highly actionable for ultra-runners and Ironman triathletes to calculate total race calorie deficits.",
        config: {
          id: "S3",
          traces: [
            { xKey: xAxisMode, yKey: "EEm", name: "EEm", marker: { color: "#8b5cf6", symbol: "circle" }, yaxis: "y" },
            { xKey: xAxisMode, yKey: "HR", name: "HR", line: { color: "#800000", dash: "dash" }, mode: "lines", yaxis: "y2" },
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
        description: "Rare to have in standard tests! Shows actual heart pump efficiency. Stroke Volume (SV) typically rises and plateaus at around 40-50% of VO2max. Further increases in Cardiac Output (CO) are driven solely by Heart Rate.",
        config: {
          id: "S4",
          traces: [
            { xKey: xAxisMode, yKey: "CO", name: "CO", line: { color: "#0053a4", width: 2 }, mode: "lines", yaxis: "y" },
            { xKey: xAxisMode, yKey: "SV", name: "SV", marker: { color: "#10b981", symbol: "circle" }, yaxis: "y" },
            { xKey: xAxisMode, yKey: "HR", name: "HR", line: { color: "#800000", dash: "dash" }, mode: "lines", yaxis: "y2" },
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
  }, [data, xAxisMode]);

  const activePanels = activeTab === "wasserman" ? wassermanPanels : supplementaryPanels;

  const ThresholdMethodology = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <div className="flex items-center space-x-2 border-b pb-4">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Info className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Expert Detection Methodology</h2>
          <p className="text-xs text-gray-500">How physiological thresholds (LT1/LT2) are calculated from CPET data</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 rounded-full font-bold text-xs border border-green-200">LT1</span>
            <h3 className="font-bold text-green-700">Aerobic Threshold (AT / VT1)</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            The point where metabolic demand exceeds the body's ability to maintain resting lactate levels. Usually occurs at 50-60% of VO2max.
          </p>
          {currentLT1 && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-green-50 rounded-lg border border-green-100 text-[11px] font-medium text-green-800">
              <div className="flex items-center space-x-2">
                <Clock className="w-3 h-3 text-green-600" />
                <span><b>Time:</b> {Math.floor(thresholds?.at || 0)}:{( ((thresholds?.at || 0) % 1) * 60).toFixed(0).padStart(2, "0")}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Gauge className="w-3 h-3 text-green-600" />
                <span><b>Speed:</b> {currentLT1.Speed?.toFixed(1)} km/h</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-green-600 rounded-full" />
                <span><b>HR:</b> {currentLT1.HR?.toFixed(0)} bpm</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-blue-600 rounded-full" />
                <span><b>VO2:</b> {currentLT1.VO2?.toFixed(0)} ml/min</span>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Detection Methods:</h4>
            <ul className="text-xs text-gray-600 space-y-2">
              <li className="flex items-start"><span className="text-blue-500 mr-2">●</span><span><b>V-Slope:</b> The earliest increase in VCO2 relative to VO2 (linear slope breaks &gt; 1.0).</span></li>
              <li className="flex items-start"><span className="text-blue-500 mr-2">●</span><span><b>Ventilatory Equivalents:</b> The nadir (lowest point) of <b>VE/VO2</b> before it starts rising, while <b>VE/VCO2</b> remains stable.</span></li>
              <li className="flex items-start"><span className="text-blue-500 mr-2">●</span><span><b>End-Tidal Gases:</b> The point of the first rise in <b>PetO2</b> without a corresponding fall in PetCO2.</span></li>
            </ul>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-orange-100 text-orange-700 rounded-full font-bold text-xs border border-orange-200">LT2</span>
            <h3 className="font-bold text-orange-700">Respiratory Compensation (RC / VT2)</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            The point of critical metabolic acidosis where the respiratory system can no longer fully buffer CO2. Corresponds to maximal lactate steady state.
          </p>
          {currentLT2 && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100 text-[11px] font-medium text-orange-800">
              <div className="flex items-center space-x-2">
                <Clock className="w-3 h-3 text-orange-600" />
                <span><b>Time:</b> {Math.floor(thresholds?.rc || 0)}:{( ((thresholds?.rc || 0) % 1) * 60).toFixed(0).padStart(2, "0")}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Gauge className="w-3 h-3 text-orange-600" />
                <span><b>Speed:</b> {currentLT2.Speed?.toFixed(1)} km/h</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-orange-600 rounded-full" />
                <span><b>HR:</b> {currentLT2.HR?.toFixed(0)} bpm</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-blue-600 rounded-full" />
                <span><b>VO2:</b> {currentLT2.VO2?.toFixed(0)} ml/min</span>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Detection Methods:</h4>
            <ul className="text-xs text-gray-600 space-y-2">
              <li className="flex items-start"><span className="text-blue-500 mr-2">●</span><span><b>Ventilatory Equivalents:</b> Rapid and simultaneous increase in both <b>VE/VO2</b> and <b>VE/VCO2</b>.</span></li>
              <li className="flex items-start"><span className="text-blue-500 mr-2">●</span><span><b>End-Tidal Gases:</b> The point where <b>PetCO2</b> begins its final, precipitous decline after peaking.</span></li>
              <li className="flex items-start"><span className="text-blue-500 mr-2">●</span><span><b>VE vs VCO2:</b> The secondary deflection point (increased slope) in the linear relationship of ventilation to CO2 output.</span></li>
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
            <h1 className="text-xl font-bold tracking-tight">Triathlon Lab Visualizer</h1>
          </div>
          {data && (
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setActiveTab("wasserman")}
                  className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeTab === "wasserman" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                  Wasserman
                </button>
                <button
                  onClick={() => setActiveTab("supplementary")}
                  className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeTab === "supplementary" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                  Supplementary
                </button>
              </div>

              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setXAxisMode("minutes")}
                  className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    xAxisMode === "minutes" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  Time
                </button>
                <button
                  onClick={() => setXAxisMode("Speed")}
                  className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    xAxisMode === "Speed" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5 mr-1.5" />
                  Speed
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
              Upload your <b>.xlsx</b> lab test file (sheet: "Dane") to generate the 9-panel Wasserman plot.
            </p>
          </div>
        )}

        {data && (
          <div className="space-y-8">
            <ThresholdMethodology />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activePanels.map((panel) => (
                <WassermanChart
                  key={panel.id}
                  data={data}
                  title={panel.title}
                  description={panel.description}
                  config={panel.config}
                  thresholds={thresholds || undefined}
                />
              ))}
            </div>
            
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
          CPET Visualization: {activeTab === "wasserman" ? "Standard 9-Panel Wasserman Layout" : "Supplementary Physiological Charts"}
        </p>
      </footer>
    </div>
  );
}
