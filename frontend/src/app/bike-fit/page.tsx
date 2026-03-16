"use client";

import React, { useState } from "react";
import {
  Ruler,
  Info,
  ChevronRight,
  Bike,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";

// Defining types for inputs and results
type Discipline = "Gravel" | "Road" | "Aero-Road" | "TT / Tri";

interface BikeFitInputs {
  inseam: string;
  trunkHeight: string;
  femurLength: string;
  kneeHeight: string;
  shoulderWidth: string;
  discipline: Discipline;
  stemLength: string;
  currentStack: string;
  currentReach: string;
}

interface BikeFitResults {
  saddleHeight: number;
  frameStack: number;
  frameReach: number;
  saddleToBarDrop?: number;
  saddleToPadDrop?: number;
  padsWidth?: number;
  saddleToHandlebar?: number;
  saddleToStemCap?: number;
  aeroBarsTilt?: number;
  currentStack: number;
  currentReach: number;
}

export default function BikeFitCalculator() {
  const [inputs, setInputs] = useState<BikeFitInputs>({
    inseam: "910",
    trunkHeight: "660",
    femurLength: "635",
    kneeHeight: "587",
    shoulderWidth: "380",
    discipline: "TT / Tri",
    stemLength: "100",
    currentStack: "590",
    currentReach: "385",
  });

  const [results, setResults] = useState<BikeFitResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bodyExpanded, setBodyExpanded] = useState(true);
  const [frameExpanded, setFrameExpanded] = useState(true);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const calculateFit = () => {
    const inseam = parseFloat(inputs.inseam);
    const trunkHeight = parseFloat(inputs.trunkHeight);
    const femurLength = parseFloat(inputs.femurLength);
    const kneeHeight = parseFloat(inputs.kneeHeight);
    const shoulderWidth = parseFloat(inputs.shoulderWidth);
    const stemLength = parseFloat(inputs.stemLength);
    const currentStack = parseFloat(inputs.currentStack);
    const currentReach = parseFloat(inputs.currentReach);

    // Validation
    if (
      isNaN(inseam) ||
      isNaN(trunkHeight) ||
      isNaN(femurLength) ||
      isNaN(kneeHeight) ||
      isNaN(shoulderWidth) ||
      isNaN(stemLength) ||
      isNaN(currentStack) ||
      isNaN(currentReach)
    ) {
      setError("Please enter valid numeric measurements.");
      return;
    }

    if (inseam < 100 || trunkHeight < 100 || femurLength < 50) {
      setError(
        "Some measurements seem unrealistically small. Please double-check your data."
      );
      return;
    }

    // Formulas
    const saddleHeight = Math.round(inseam * 0.883);
    let frameStack = 0;
    let frameReach = 0;
    let saddleToBarDrop = undefined;
    let saddleToPadDrop = undefined;
    let padsWidth = undefined;
    let saddleToHandlebar = undefined;
    let saddleToStemCap = undefined;
    let aeroBarsTilt = undefined;

    if (inputs.discipline === "Gravel") {
      frameStack = Math.round(inseam * 0.70);
      frameReach = Math.round(trunkHeight * 0.56);
      saddleToBarDrop = Math.round(inseam * 0.04);
    } else if (inputs.discipline === "Road") {
      frameStack = Math.round(inseam * 0.68);
      frameReach = Math.round(trunkHeight * 0.57);
      saddleToBarDrop = Math.round(inseam * 0.06);
    } else if (inputs.discipline === "Aero-Road") {
      frameStack = Math.round(inseam * 0.66);
      frameReach = Math.round(trunkHeight * 0.58);
      saddleToBarDrop = Math.round(inseam * 0.07);
    } else if (inputs.discipline === "TT / Tri") {
      frameStack = Math.round(inseam * 0.65);
      frameReach = Math.round(trunkHeight * 0.583);
      saddleToPadDrop = Math.round(inseam * 0.082);
      saddleToHandlebar = Math.round(trunkHeight * 0.6 + femurLength * 0.23);
      saddleToStemCap = Math.round(saddleToHandlebar - 116);
      padsWidth = Math.round(shoulderWidth * 0.5);
      aeroBarsTilt = 14;
    }

    setResults({
      saddleHeight,
      frameStack,
      frameReach,
      saddleToBarDrop,
      saddleToPadDrop,
      padsWidth,
      saddleToHandlebar,
      saddleToStemCap,
      aeroBarsTilt,
      currentStack,
      currentReach,
    });
  };

  const resetForm = () => {
    setInputs({
      inseam: "910",
      trunkHeight: "660",
      femurLength: "635",
      kneeHeight: "587",
      shoulderWidth: "380",
      discipline: "TT / Tri",
      stemLength: "100",
      currentStack: "590",
      currentReach: "385",
    });
    setResults(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-3xl mb-4 shadow-xl shadow-blue-200">
            <Bike className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight italic uppercase">
            Bike Fit <span className="text-blue-600">Lab</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto font-medium">
            Professional aerodynamic position optimizer. Compare your current setup with recommended biomechanical targets.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Inputs Section */}
          <div className="lg:col-span-5 space-y-4">
            {/* Section 1: Body Measurements */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300">
              <button
                onClick={() => setBodyExpanded(!bodyExpanded)}
                className="w-full bg-gray-50/80 hover:bg-gray-100/80 border-b px-6 py-4 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center">
                  <Ruler className="w-5 h-5 mr-3 text-blue-600" />
                  <h2 className="text-lg font-bold tracking-tight">Rider Body Measurements</h2>
                </div>
                {bodyExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              <div className={`p-6 space-y-5 transition-all duration-300 ${bodyExpanded ? 'block' : 'hidden'}`}>
                <MeasurementInput
                  label="Inseam (pressed)"
                  name="inseam"
                  value={inputs.inseam}
                  onChange={handleInputChange}
                  tooltip="Measure from your crotch to the floor while barefoot, applying pressure with a book or ruler as if sitting on a saddle."
                />
                <MeasurementInput
                  label="Trunk height (seated)"
                  name="trunkHeight"
                  value={inputs.trunkHeight}
                  onChange={handleInputChange}
                  tooltip="Seated measurement from the stool surface to your sternal notch (the U-shaped dip at the top of your breastbone)."
                />
                <MeasurementInput
                  label="Femur length"
                  name="femurLength"
                  value={inputs.femurLength}
                  onChange={handleInputChange}
                  tooltip="Measure from the wall behind your buttocks to the front of your kneecap while seated with legs at 90 degrees."
                />
                <MeasurementInput
                  label="Knee height"
                  name="kneeHeight"
                  value={inputs.kneeHeight}
                  onChange={handleInputChange}
                  tooltip="Measurement from the floor to the top of your kneecap while standing upright."
                />
                <MeasurementInput
                  label="Shoulder width"
                  name="shoulderWidth"
                  value={inputs.shoulderWidth}
                  onChange={handleInputChange}
                  tooltip="The distance between your acromion processes (the bony tips of your shoulders)."
                />
              </div>
            </div>

            {/* Section 2: Bike Discipline & Current Frame */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300">
              <button
                onClick={() => setFrameExpanded(!frameExpanded)}
                className="w-full bg-gray-50/80 hover:bg-gray-100/80 border-b px-6 py-4 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center">
                  <Settings className="w-5 h-5 mr-3 text-blue-600" />
                  <h2 className="text-lg font-bold tracking-tight">Discipline & Frame</h2>
                </div>
                {frameExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              <div className={`p-6 space-y-5 transition-all duration-300 ${frameExpanded ? 'block' : 'hidden'}`}>
                {/* Discipline Toggle */}
                <div className="space-y-2 mb-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic">Riding Discipline</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(["Gravel", "Road", "Aero-Road", "TT / Tri"] as Discipline[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          setInputs(prev => ({ ...prev, discipline: d }));
                          setResults(null);
                        }}
                        className={`py-2 px-1 text-[9px] font-black rounded-xl border-2 transition-all uppercase tracking-tighter ${
                          inputs.discipline === d
                          ? "border-blue-600 bg-blue-50 text-blue-600 shadow-sm"
                          : "border-gray-50 bg-gray-50/50 text-gray-400 hover:border-gray-200"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <MeasurementInput
                  label="Stem length"
                  name="stemLength"
                  value={inputs.stemLength}
                  onChange={handleInputChange}
                  tooltip="The length of your current stem, measured center-to-center."
                />
                <MeasurementInput
                  label="Current Frame Stack"
                  name="currentStack"
                  value={inputs.currentStack}
                  onChange={handleInputChange}
                  tooltip="The vertical distance from your bottom bracket to the top center of the head tube."
                />
                <MeasurementInput
                  label="Current Frame Reach"
                  name="currentReach"
                  value={inputs.currentReach}
                  onChange={handleInputChange}
                  tooltip="The horizontal distance from your bottom bracket to the top center of the head tube."
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-2xl flex items-start text-sm shadow-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <div className="pt-4 flex gap-4">
              <button
                onClick={calculateFit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black h-14 rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98] uppercase tracking-widest italic"
              >
                Calculate Fit
              </button>
              <button
                onClick={resetForm}
                className="h-14 w-14 flex items-center justify-center rounded-2xl border-2 border-gray-200 hover:bg-gray-50 transition-colors bg-white shadow-sm"
              >
                <RotateCcw className="w-6 h-6 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Outputs Section */}
          <div className="lg:col-span-7">
            {results ? (
              <div className="space-y-8 animate-in fade-in duration-700 slide-in-from-right-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl font-black text-gray-900 flex items-center italic uppercase tracking-tight">
                    <ChevronRight className="w-8 h-8 text-blue-600 mr-1" />
                    Recommendations
                  </h3>
                  <div className="flex space-x-2">
                     <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Optimal</span>
                     <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">Acceptable</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <ResultCard
                    label="Saddle Height"
                    value={results.saddleHeight}
                    unit="mm"
                    tooltip="Measured from the center of the bottom bracket to the top center of the saddle along the seat tube."
                  />

                  {/* Comparison: Stack */}
                  <ComparisonCard
                    label="Frame Stack"
                    recommended={results.frameStack}
                    current={results.currentStack}
                    tooltip="Vertical distance from BB to head tube. Ideal for your torso length and flexibility."
                  />

                  {/* Comparison: Reach */}
                  <ComparisonCard
                    label="Frame Reach"
                    recommended={results.frameReach}
                    current={results.currentReach}
                    tooltip="Horizontal distance from BB to head tube. Crucial for proper weight distribution and handling."
                  />

                  {inputs.discipline === "TT / Tri" ? (
                    <>
                      <ResultCard
                        label="Saddle to Handlebar"
                        value={results.saddleToHandlebar!}
                        unit="mm"
                        tooltip="Horizontal distance from the tip of the saddle to the center of the handlebar."
                      />
                      <ResultCard
                        label="Saddle to Stem Cap"
                        value={results.saddleToStemCap!}
                        unit="mm"
                        tooltip="Horizontal distance from the tip of the saddle to the center of the stem top cap (assuming a standard 116mm offset)."
                      />
                      <ResultCard
                        label="Saddle to Pad Drop"
                        value={results.saddleToPadDrop!}
                        unit="mm"
                        tooltip="Vertical distance from the top of the saddle down to the top of the armrest pads."
                      />
                      <ResultCard
                        label="Pads Width"
                        value={results.padsWidth!}
                        unit="mm"
                        tooltip="Center-to-center width between the aero bar armrest pads."
                      />
                      <ResultCard
                        label="Aero Bars Tilt"
                        value={results.aeroBarsTilt!}
                        unit="°"
                        tooltip="The upward angle of the aero extensions (high-hands position)."
                      />
                    </>
                  ) : (
                    <ResultCard
                      label="Saddle to Bar Drop"
                      value={results.saddleToBarDrop!}
                      unit="mm"
                      tooltip="Vertical distance from the top of the saddle down to the top of the handlebar."
                    />
                  )}
                </div>

                <div className="bg-white border-l-4 border-blue-600 rounded-2xl p-8 shadow-sm">
                  <h4 className="font-black text-gray-900 mb-3 flex items-center italic uppercase tracking-wider">
                    <Info className="w-5 h-5 mr-3 text-blue-600" />
                    Pro Analytics
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed font-medium">
                    Calculations are optimized for your selected riding discipline.
                    The <span className="text-blue-600 font-bold">Comparison Cards</span> highlight the delta between your current bike geometry and the biomechanical ideal.
                    A green indicator means you are within the 10mm "sweet spot" for high-performance handling.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-[40px] bg-white text-gray-300 transition-colors hover:border-blue-100 group">
                <div className="bg-gray-50 p-8 rounded-full mb-6 group-hover:bg-blue-50 transition-colors">
                    <Bike className="w-20 h-20 opacity-20 group-hover:opacity-40 transition-opacity" />
                </div>
                <h3 className="text-xl font-bold text-gray-400 group-hover:text-blue-400 transition-colors">Ready for Analysis</h3>
                <p className="text-center font-medium mt-2 max-w-sm">
                  Enter your body measurements and current bike geometry to generate your professional fit report.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MeasurementInput({
  label,
  name,
  value,
  onChange,
  tooltip,
  unit = "mm"
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tooltip: string;
  unit?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={name}
          className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center italic"
        >
          {label}
        </label>
        <div className="group relative">
          <Info className="w-4 h-4 text-gray-300 cursor-help hover:text-blue-500 transition-colors" />
          <div className="absolute bottom-full right-0 mb-3 w-72 p-4 bg-gray-900 text-white text-xs rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-2xl font-medium leading-relaxed">
            {tooltip}
            <div className="absolute top-full right-1.5 -mt-1 border-8 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>
      <div className="relative group">
        <input
          type="number"
          step="any"
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className="w-full pr-14 h-12 bg-gray-50/50 border-2 border-transparent focus:bg-white focus:ring-0 focus:border-blue-500 outline-none rounded-2xl transition-all font-bold text-gray-900 px-5 group-hover:bg-gray-50"
          placeholder="0"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
          <span className="text-gray-400 text-[10px] font-black uppercase tracking-tighter bg-white px-2 py-1 rounded-lg border border-gray-100">
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  unit,
  tooltip,
}: {
  label: string;
  value: number;
  unit: string;
  tooltip: string;
}) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full opacity-50 -mr-6 -mt-6"></div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-blue-600 transition-colors italic">
          {label}
        </span>
        <div className="group/tooltip relative">
          <Info className="w-4 h-4 text-gray-200 cursor-help hover:text-gray-400" />
          <div className="absolute bottom-full right-0 mb-3 w-56 p-3 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-20 shadow-2xl font-semibold leading-relaxed">
            {tooltip}
            <div className="absolute top-full right-1.5 border-8 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>
      <div className="flex items-baseline space-x-1">
        <span className="text-4xl font-black text-gray-900 tracking-tighter">{value}</span>
        <span className="text-xs font-black text-gray-400 italic uppercase">{unit}</span>
      </div>
    </div>
  );
}

function ComparisonCard({
  label,
  recommended,
  current,
  tooltip,
}: {
  label: string;
  recommended: number;
  current: number;
  tooltip: string;
}) {
  const diff = Math.abs(recommended - current);
  let colorClass = "bg-red-500";
  let textColorClass = "text-red-600";
  let bgClass = "bg-red-50";
  let borderClass = "border-red-100";
  let statusText = "High Deviation";

  if (diff <= 10) {
    colorClass = "bg-green-500";
    textColorClass = "text-green-600";
    bgClass = "bg-green-50";
    borderClass = "border-green-100";
    statusText = "Perfect Fit";
  } else {
    colorClass = "bg-red-500";
    textColorClass = "text-red-600";
    bgClass = "bg-red-50";
    borderClass = "border-red-100";
    statusText = "Highly Deviated";
  }

  return (
    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-blue-600 transition-colors italic">
            {label}
          </span>
          <div className="group/tooltip relative">
            <Info className="w-4 h-4 text-gray-200 cursor-help" />
            <div className="absolute bottom-full right-0 mb-3 w-64 p-3 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-20 shadow-2xl font-semibold leading-relaxed">
              {tooltip}
              <div className="absolute top-full right-1.5 border-8 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-[9px] font-black uppercase text-gray-400 block mb-1 tracking-tighter">Recommended</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-black text-gray-900 tracking-tighter">{recommended}</span>
              <span className="text-[10px] font-bold text-gray-400">mm</span>
            </div>
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-gray-400 block mb-1 tracking-tighter">Current</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-black text-gray-700 tracking-tighter">{current}</span>
              <span className="text-[10px] font-bold text-gray-400">mm</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`mt-2 ${bgClass} ${borderClass} border px-4 py-2 rounded-2xl flex items-center justify-between`}>
        <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full ${colorClass} mr-2 shadow-sm`}></div>
            <span className={`text-[10px] font-black uppercase italic ${textColorClass}`}>{statusText}</span>
        </div>
        <span className={`text-[10px] font-black ${textColorClass}`}>
            {recommended > current ? `+${diff}` : `-${diff}`} mm
        </span>
      </div>
    </div>
  );
}
