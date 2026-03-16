"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import {
  ComputedHRZones,
  HRZoneRange,
  HRZonesInput,
  LabTestConfig,
  UserHRSettings,
} from "@/types/hrZones";
import {
  computeZonesFromAge,
  computeZonesFromHRR,
  computeZonesFromLTHR,
  computeZonesFromLab,
  computeZonesFromMax,
} from "@/lib/hrZoneUtils";
import { AlertTriangle, Info, Settings, Heart } from "lucide-react";

const defaultLabConfig: LabTestConfig = {
  z1End: 110,
  lt1: 130,
  lt2: 170,
  maxHr: 190,
  fatMax: null,
};

function ZonesTable({ zones }: { zones: HRZoneRange[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Zone
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Range (bpm)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {zones.map((z) => (
            <tr key={z.name}>
              <td className="px-4 py-2 text-sm font-medium text-gray-900">
                {z.name}
              </td>
              <td className="px-4 py-2 text-sm text-gray-700">
                {z.low} – {z.high}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProfilePage() {
  const { userHRSettings, setUserHRSettings } = useAppContext();

  // Local editable copy for form manipulation
  const [input, setInput] = useState<HRZonesInput>(
    userHRSettings?.input ?? { method: "LTHR", payload: { lthr: 170 } },
  );

  const computed: ComputedHRZones | null = useMemo(() => {
    switch (input.method) {
      case "LAB_TEST":
        return computeZonesFromLab(input.payload);
      case "LTHR":
        return computeZonesFromLTHR(input.payload);
      case "HRR":
        return computeZonesFromHRR(input.payload);
      case "%MAX":
        return computeZonesFromMax(input.payload.maxHr);
      case "AGE":
        return computeZonesFromAge(input.payload);
      default:
        return null;
    }
  }, [input]);

  useEffect(() => {
    // When stored settings change elsewhere, sync
    if (userHRSettings && userHRSettings.input.method !== input.method) {
      setInput(userHRSettings.input);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userHRSettings?.input.method]);

  const persist = () => {
    const next: UserHRSettings = { input, computed: computed ?? undefined };
    setUserHRSettings(next);
  };

  const method = input.method;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-rose-100">
              <Heart className="w-5 h-5 text-rose-600" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">
              Profile · Heart Rate Zones
            </h1>
          </div>
          <button
            onClick={persist}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm"
          >
            Save Settings
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-gray-800 font-semibold">
              <Settings className="w-5 h-5 text-gray-400" />
              <span>Calculation Method</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Choose your HR Zones calculation method
              </label>
              <select
                value={method}
                onChange={(e) => {
                  const m = e.target.value as HRZonesInput["method"];
                  let payload: any;
                  switch (m) {
                    case "LAB_TEST":
                      payload = defaultLabConfig;
                      break;
                    case "LTHR":
                      payload = { lthr: 170 };
                      break;
                    case "HRR":
                      payload = { maxHr: 190, restingHr: 55 };
                      break;
                    case "%MAX":
                      payload = { maxHr: 190 };
                      break;
                    case "AGE":
                      payload = { dobISO: "" };
                      break;
                  }
                  setInput({ method: m, payload } as HRZonesInput);
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="LAB_TEST">
                  Direct Lab Testing (Recommended)
                </option>
                <option value="LTHR">Lactate Threshold HR (Field Test)</option>
                <option value="HRR">Heart Rate Reserve (Karvonen)</option>
                <option value="%MAX">% of Maximum HR</option>
                <option value="AGE">Age-Based Formula (220 - Age)</option>
              </select>
            </div>
          </div>

          {/* Method-specific inputs */}
          {method === "LAB_TEST" && (
            <div className="space-y-4">
              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <Info className="w-4 h-4 mt-0.5 text-blue-500" />
                <div className="space-y-1">
                  <p>
                    Coach's Note: The Gold Standard. Enter the exact values from
                    your clinical VO2max or Lactate test.
                  </p>
                  <p className="text-xs text-gray-500 italic">
                    Zones are derived from your threshold markers: Z1 ends at
                    your specified point, Z2 ends at LT1, Z4 ends at LT2. Z3 is
                    the midpoint between LT1 and LT2.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: "z1End", label: "Z1 End (bpm)" },
                  { key: "lt1", label: "LT1 / AT (bpm)" },
                  { key: "lt2", label: "LT2 / RCP (bpm)" },
                  { key: "maxHr", label: "Max HR (bpm)" },
                  { key: "fatMax", label: "FatMax (bpm)", optional: true },
                ].map(({ key, label, optional }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">
                      {label}
                    </label>
                    <input
                      type="number"
                      value={
                        (input.payload as LabTestConfig)[
                          key as keyof LabTestConfig
                        ] ?? ""
                      }
                      onChange={(e) => {
                        const val =
                          e.target.value === ""
                            ? optional
                              ? null
                              : 0
                            : Number(e.target.value);
                        const next = {
                          ...(input.payload as LabTestConfig),
                          [key]: val,
                        };
                        setInput({ method, payload: next } as HRZonesInput);
                      }}
                      className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder={optional ? "Optional" : "--"}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {method === "LTHR" && (
            <div className="space-y-3">
              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <Info className="w-4 h-4 mt-0.5 text-blue-500" />
                <p>
                  Coach's Note: Based on a 30-minute all-out field test. Highly
                  accurate for field data.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    LTHR (bpm)
                  </label>
                  <input
                    type="number"
                    value={(input.payload as any).lthr}
                    onChange={(e) =>
                      setInput({
                        method,
                        payload: { lthr: Number(e.target.value) || 0 },
                      } as HRZonesInput)
                    }
                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {method === "HRR" && (
            <div className="space-y-3">
              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <Info className="w-4 h-4 mt-0.5 text-blue-500" />
                <p>
                  Coach's Note: Accounts for your cardiovascular fitness by
                  using your resting heart rate.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Max HR (bpm)
                  </label>
                  <input
                    type="number"
                    value={(input.payload as any).maxHr}
                    onChange={(e) =>
                      setInput({
                        method,
                        payload: {
                          ...(input.payload as any),
                          maxHr: Number(e.target.value) || 0,
                        },
                      } as HRZonesInput)
                    }
                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Resting HR (bpm)
                  </label>
                  <input
                    type="number"
                    value={(input.payload as any).restingHr}
                    onChange={(e) =>
                      setInput({
                        method,
                        payload: {
                          ...(input.payload as any),
                          restingHr: Number(e.target.value) || 0,
                        },
                      } as HRZonesInput)
                    }
                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {method === "%MAX" && (
            <div className="space-y-3">
              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <Info className="w-4 h-4 mt-0.5 text-blue-500" />
                <p>
                  Coach's Note: Standard method. Make sure you use a tested Max
                  HR, not an estimated one.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Max HR (bpm)
                  </label>
                  <input
                    type="number"
                    value={(input.payload as any).maxHr}
                    onChange={(e) =>
                      setInput({
                        method,
                        payload: { maxHr: Number(e.target.value) || 0 },
                      } as HRZonesInput)
                    }
                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {method === "AGE" && (
            <div className="space-y-3">
              <div className="flex items-start space-x-2 text-sm text-yellow-700">
                <AlertTriangle className="w-4 h-4 mt-0.5" />
                <p>
                  Warning: This is a statistical average and can be highly
                  inaccurate for individual athletes. We highly recommend using
                  one of the other methods for your training.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={(input.payload as any).dobISO || ""}
                    onChange={(e) =>
                      setInput({
                        method,
                        payload: { dobISO: e.target.value },
                      } as HRZonesInput)
                    }
                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">
            Resulting Zones
          </h2>
          {computed ? (
            <ZonesTable zones={computed.zones} />
          ) : (
            <p className="text-sm text-gray-500">
              Provide the required inputs to see your zones.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
