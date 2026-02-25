import { ProcessedActivity } from "./fitProcessor";

/**
 * Formats duration in seconds to HH:MM:SS or MM:SS.
 */
export const formatDuration = (seconds: number | null): string => {
  if (seconds === null || isNaN(seconds)) return "--:--";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

/**
 * Formats pace in decimal minutes per kilometer to HH:MM:SS/km or MM:SS/km.
 */
export const formatPace = (decimalMinutes: number | null) => {
  if (
    decimalMinutes === null ||
    isNaN(decimalMinutes) ||
    !isFinite(decimalMinutes) ||
    decimalMinutes <= 0
  )
    return "--:--";
  const totalSeconds = Math.round(decimalMinutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

/**
 * Calculates a time-based moving average for FIT records.
 */
export function calculateMovingAverage(
  records: any[],
  times: number[],
  yKey: string,
  windowSeconds: number,
  yTransform?: (val: number) => number | null,
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

/**
 * Calculates a block-based average for FIT records (non-overlapping windows).
 */
export function calculateBlockAverage(
  records: any[],
  times: number[],
  yKey: string,
  windowSeconds: number,
  yTransform?: (val: number) => number | null,
): (number | null)[] {
  if (windowSeconds <= 1) {
    return records.map((r) => {
      const val = r[yKey];
      if (val === undefined || val === null) return null;
      return yTransform ? yTransform(val) : val;
    });
  }

  const result: (number | null)[] = new Array(records.length).fill(null);
  if (times.length === 0) return [];

  const startTime = times[0];
  const windowMs = windowSeconds * 1000;

  let i = 0;
  while (i < records.length) {
    const currentIntervalStart =
      startTime + Math.floor((times[i] - startTime) / windowMs) * windowMs;
    const currentIntervalEnd = currentIntervalStart + windowMs;

    let sum = 0;
    let count = 0;
    let j = i;
    while (j < records.length && times[j] < currentIntervalEnd) {
      const val = records[j][yKey];
      if (val !== null && val !== undefined && !isNaN(val)) {
        sum += val;
        count++;
      }
      j++;
    }

    const avg = count > 0 ? sum / count : null;
    const transformedAvg = avg !== null && yTransform ? yTransform(avg) : avg;

    for (let k = i; k < j; k++) {
      result[k] = transformedAvg;
    }
    i = j;
  }
  return result;
}

/**
 * Interface for Activity Chart Settings.
 */
export interface ChartSettings {
  smoothingWindow: number;
  intervalWindow: number;
  usePace: boolean;
  overlayPaceOnHR: boolean;
  overlayElevationOnSpeed: boolean;
  xAxisType: "time" | "distance";
}

/**
 * Prepares the full configuration (data and layout) for all activity charts.
 */
export function prepareActivityChartData(
  activity: ProcessedActivity,
  settings: ChartSettings,
) {
  if (!activity || !activity.records || !activity.records.length) return null;

  const {
    smoothingWindow,
    intervalWindow,
    usePace,
    overlayPaceOnHR,
    overlayElevationOnSpeed,
    xAxisType,
  } = settings;

  const recordTimes = activity.records.map((r) =>
    new Date(r.timestamp).getTime(),
  );

  // Use ISO strings for time axis to ensure Plotly stability
  const xData =
    xAxisType === "distance"
      ? activity.records.map((r) => (r.distance || 0) / 1000)
      : activity.records.map((r) => r.timestamp);

  const createTrace = (
    name: string,
    yData: (number | null)[],
    color: string,
    units: string,
    isPace: boolean = false,
    precision: number = 1,
    yaxis: string = "y",
    dash: string = "solid",
    uid?: string,
  ) => {
    return {
      uid: uid || name,
      x: xData,
      y: yData,
      name: name,
      color,
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color, width: dash === "solid" ? 2 : 1.5, dash: dash as any },
      yaxis,
      connectgaps: true,
      text: isPace ? yData.map((p) => (p ? formatPace(p) : "")) : undefined,
      hovertemplate: isPace
        ? "%{text}/km<extra></extra>"
        : `%{y:.${precision}f} ${units}<extra></extra>`,
    };
  };

  // --- Workout Targets ---
  const hrTargetData: (number | null)[] = new Array(
    activity.records.length,
  ).fill(null);
  const speedTargetData: (number | null)[] = new Array(
    activity.records.length,
  ).fill(null);
  const paceTargetData: (number | null)[] = new Array(
    activity.records.length,
  ).fill(null);

  if (activity.workout_steps && activity.laps) {
    activity.laps.forEach((lap) => {
      if (typeof lap.wkt_step_index === "number") {
        const step = activity.workout_steps?.find(
          (s) => s.message_index === lap.wkt_step_index,
        );
        if (step) {
          let hrTarget: number | null = null;
          let speedTarget: number | null = null;

          if (step.target_type === "heart_rate" || step.target_type === 0) {
            if (
              typeof step.custom_target_heart_rate_low === "number" &&
              typeof step.custom_target_heart_rate_high === "number"
            ) {
              hrTarget =
                (step.custom_target_heart_rate_low +
                  step.custom_target_heart_rate_high) /
                2;
            }
          } else if (step.target_type === "speed" || step.target_type === 1) {
            if (
              typeof step.custom_target_speed_low === "number" &&
              typeof step.custom_target_speed_high === "number"
            ) {
              speedTarget =
                (step.custom_target_speed_low + step.custom_target_speed_high) /
                2;
            }
          }

          if (hrTarget || speedTarget) {
            const lapStart = new Date(lap.start_time).getTime();
            const lapEnd = new Date(lap.timestamp).getTime();
            activity.records.forEach((rec, idx) => {
              const recTime = recordTimes[idx];
              if (recTime >= lapStart && recTime <= lapEnd) {
                if (hrTarget) hrTargetData[idx] = hrTarget;
                if (speedTarget) {
                  speedTargetData[idx] = speedTarget * 3.6;
                  if (speedTarget > 0.2) {
                    paceTargetData[idx] = 1000 / (speedTarget * 60);
                  }
                }
              }
            });
          }
        }
      }
    });
  }

  // --- Common Layout Parts ---
  const commonLayout = {
    autosize: true,
    margin: { t: 40, b: 40, l: 50, r: 20 },
    xaxis: {
      type: xAxisType === "distance" ? "linear" : "date",
      showgrid: true,
      gridcolor: "#f3f4f6",
      tickformat: xAxisType === "distance" ? ".2f" : "%H:%M:%S",
      title: { text: xAxisType === "distance" ? "Distance (km)" : "" },
    },
    hovermode: "x unified" as const,
    legend: { orientation: "h" as const, y: -0.2 },
  };

  // --- Heart Rate Chart ---
  const heartRateTraces = [];
  if (smoothingWindow > 0 || intervalWindow === 0) {
    const data = calculateMovingAverage(
      activity.records,
      recordTimes,
      "heart_rate",
      smoothingWindow,
    );
    heartRateTraces.push(
      createTrace(
        smoothingWindow > 0 ? `HR (${smoothingWindow}s avg)` : "Heart Rate",
        data,
        "#dc2626",
        "bpm",
        false,
        0,
        "y",
        "solid",
        "hr-main",
      ),
    );
  }
  if (intervalWindow > 0) {
    const data = calculateBlockAverage(
      activity.records,
      recordTimes,
      "heart_rate",
      intervalWindow,
    );
    heartRateTraces.push(
      createTrace(
        `HR (${intervalWindow}s intervals)`,
        data,
        "#991b1b",
        "bpm",
        false,
        0,
        "y",
        "solid",
        "hr-interval",
      ),
    );
  }
  if (hrTargetData.some((v) => v !== null)) {
    heartRateTraces.push(
      createTrace(
        "Target HR",
        hrTargetData,
        "#000000",
        "bpm",
        false,
        0,
        "y",
        "dash",
        "hr-target",
      ),
    );
  }

  const paceTransform = (v: number) => {
    if (!v || v < 0.2) return null;
    const dec = 1000 / (v * 60);
    return dec > 60 ? null : dec;
  };
  const speedTransform = (v: number) => v * 3.6;

  if (overlayPaceOnHR) {
    const overlayMetricData = calculateMovingAverage(
      activity.records,
      recordTimes,
      "speed",
      smoothingWindow,
      usePace ? paceTransform : speedTransform,
    );
    if (overlayMetricData) {
      heartRateTraces.push(
        createTrace(
          usePace ? "Pace (Overlay)" : "Speed (Overlay)",
          overlayMetricData,
          usePace ? "#8b5cf6" : "#2563eb",
          usePace ? "min/km" : "km/h",
          usePace,
          1,
          "y2",
          "solid",
          "hr-overlay",
        ),
      );
    }
  }

  const hrChart = {
    data: heartRateTraces,
    layout: {
      ...commonLayout,
      title: {
        text: overlayPaceOnHR
          ? `Heart Rate & ${usePace ? "Pace" : "Speed"}`
          : "Heart Rate",
        font: { size: 14 },
      },
      margin: { ...commonLayout.margin, r: overlayPaceOnHR ? 60 : 20 },
      yaxis: {
        showgrid: true,
        gridcolor: "#f3f4f6",
        title: { text: "bpm" },
        autorange: true,
      },
      ...(overlayPaceOnHR
        ? {
            yaxis2: {
              title: { text: usePace ? "min/km" : "km/h" },
              overlaying: "y",
              side: "right" as const,
              autorange: usePace ? ("reversed" as const) : true,
              showgrid: false,
              tickmode: usePace ? ("array" as const) : ("auto" as const),
              tickvals: usePace ? [4, 5, 6, 7, 8, 10, 15] : undefined,
              ticktext: usePace
                ? ["4:00", "5:00", "6:00", "7:00", "8:00", "10:00", "15:00"]
                : undefined,
            },
          }
        : {}),
      shapes: calculateHRZoneShapes(activity),
    },
  };

  // --- Pace/Speed Chart ---
  const mainMetricTraces = [];
  if (usePace) {
    if (smoothingWindow > 0 || intervalWindow === 0) {
      const paceData = calculateMovingAverage(
        activity.records,
        recordTimes,
        "speed",
        smoothingWindow,
        paceTransform,
      );
      mainMetricTraces.push(
        createTrace(
          smoothingWindow > 0 ? `Pace (${smoothingWindow}s avg)` : "Pace",
          paceData,
          "#8b5cf6",
          "min/km",
          true,
          1,
          "y",
          "solid",
          "pace-main",
        ),
      );
    }
    if (intervalWindow > 0) {
      const paceData = calculateBlockAverage(
        activity.records,
        recordTimes,
        "speed",
        intervalWindow,
        paceTransform,
      );
      mainMetricTraces.push(
        createTrace(
          `Pace (${intervalWindow}s intervals)`,
          paceData,
          "#6d28d9",
          "min/km",
          true,
          1,
          "y",
          "solid",
          "pace-interval",
        ),
      );
    }
    if (paceTargetData.some((v) => v !== null)) {
      mainMetricTraces.push(
        createTrace(
          "Target Pace",
          paceTargetData,
          "#000000",
          "min/km",
          true,
          1,
          "y",
          "dash",
          "pace-target",
        ),
      );
    }
  } else {
    if (smoothingWindow > 0 || intervalWindow === 0) {
      const speedData = calculateMovingAverage(
        activity.records,
        recordTimes,
        "speed",
        smoothingWindow,
        speedTransform,
      );
      mainMetricTraces.push(
        createTrace(
          smoothingWindow > 0 ? `Speed (${smoothingWindow}s avg)` : "Speed",
          speedData,
          "#2563eb",
          "km/h",
          false,
          1,
          "y",
          "solid",
          "speed-main",
        ),
      );
    }
    if (intervalWindow > 0) {
      const speedData = calculateBlockAverage(
        activity.records,
        recordTimes,
        "speed",
        intervalWindow,
        speedTransform,
      );
      mainMetricTraces.push(
        createTrace(
          `Speed (${intervalWindow}s intervals)`,
          speedData,
          "#1e40af",
          "km/h",
          false,
          1,
          "y",
          "solid",
          "speed-interval",
        ),
      );
    }
    if (speedTargetData.some((v) => v !== null)) {
      mainMetricTraces.push(
        createTrace(
          "Target Speed",
          speedTargetData,
          "#000000",
          "km/h",
          false,
          1,
          "y",
          "dash",
          "speed-target",
        ),
      );
    }
  }

  const altitudeData = calculateMovingAverage(
    activity.records,
    recordTimes,
    "altitude",
    smoothingWindow,
  );

  if (overlayElevationOnSpeed) {
    const elevTrace = createTrace(
      "Elevation",
      altitudeData,
      "#6b7280",
      "m",
      false,
      0,
      "y2",
      "solid",
      "speed-elev-overlay",
    );
    mainMetricTraces.push({
      ...elevTrace,
      fill: "tozeroy" as const,
      fillcolor: "rgba(107, 114, 128, 0.15)",
      line: { color: "#6b7280", width: 1.5 },
    });
  }

  const paceSpeedChart = {
    data: mainMetricTraces,
    layout: {
      ...commonLayout,
      title: {
        text: usePace
          ? overlayElevationOnSpeed
            ? "Pace & Elevation"
            : "Pace"
          : overlayElevationOnSpeed
            ? "Speed & Elevation"
            : "Speed",
        font: { size: 14 },
      },
      margin: {
        ...commonLayout.margin,
        l: usePace ? 60 : 50,
        r: overlayElevationOnSpeed ? 60 : 20,
      },
      yaxis: {
        showgrid: true,
        gridcolor: "#f3f4f6",
        title: { text: usePace ? "min/km" : "km/h" },
        autorange: usePace ? ("reversed" as const) : true,
        tickmode: usePace ? ("array" as const) : ("auto" as const),
        tickvals: usePace ? [3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20] : undefined,
        ticktext: usePace
          ? [
              "3:00",
              "4:00",
              "5:00",
              "6:00",
              "7:00",
              "8:00",
              "9:00",
              "10:00",
              "12:00",
              "15:00",
              "20:00",
            ]
          : undefined,
      },
      ...(overlayElevationOnSpeed
        ? {
            yaxis2: {
              title: { text: "Altitude (m)" },
              overlaying: "y",
              side: "right" as const,
              showgrid: false,
            },
          }
        : {}),
    },
  };

  // --- Altitude Chart ---
  const altitudeTraces = [];
  const altTrace: any = createTrace(
    smoothingWindow > 0 ? `Altitude (${smoothingWindow}s avg)` : "Altitude",
    altitudeData,
    "#6b7280",
    "m",
    false,
    0,
    "y",
    "solid",
    "altitude-main",
  );
  altTrace.fill = "tozeroy" as const;
  altTrace.fillcolor = "rgba(107, 114, 128, 0.2)";
  altTrace.line.width = 1;
  altitudeTraces.push(altTrace);

  const altitudeChart = {
    data: altitudeTraces,
    layout: {
      ...commonLayout,
      title: { text: "Altitude", font: { size: 14 } },
      yaxis: { showgrid: true, gridcolor: "#f3f4f6", title: { text: "m" } },
    },
  };

  // --- Cadence Chart ---
  const cadenceTraces = [];
  const cadData = calculateMovingAverage(
    activity.records,
    recordTimes,
    "cadence",
    smoothingWindow,
  );
  cadenceTraces.push(
    createTrace(
      smoothingWindow > 0 ? `Cadence (${smoothingWindow}s avg)` : "Cadence",
      cadData,
      "#10b981",
      "rpm",
      false,
      0,
      "y",
      "solid",
      "cadence-main",
    ),
  );

  const cadenceChart = {
    data: cadenceTraces,
    layout: {
      ...commonLayout,
      title: { text: "Cadence", font: { size: 14 } },
      yaxis: { showgrid: true, gridcolor: "#f3f4f6", title: { text: "rpm" } },
    },
  };

  // --- Power Chart ---
  const powerTraces = [];
  const powData = calculateMovingAverage(
    activity.records,
    recordTimes,
    "power",
    smoothingWindow,
  );
  powerTraces.push(
    createTrace(
      smoothingWindow > 0 ? `Power (${smoothingWindow}s avg)` : "Power",
      powData,
      "#a855f7",
      "watts",
      false,
      0,
      "y",
      "solid",
      "power-main",
    ),
  );

  const powerChart = {
    data: powerTraces,
    layout: {
      ...commonLayout,
      title: { text: "Power", font: { size: 14 } },
      yaxis: { showgrid: true, gridcolor: "#f3f4f6", title: { text: "watts" } },
    },
  };

  return {
    heartRate: hrChart,
    paceSpeed: paceSpeedChart,
    altitude: altitudeChart,
    cadence: cadenceChart,
    power: powerChart,
  };
}

/**
 * Calculates shapes for HR zones to be used in Plotly layout.
 */
export function calculateHRZoneShapes(activity: ProcessedActivity) {
  if (!activity || !activity.records || !activity.records.length) return [];

  const hrValues = activity.records
    .map((r) => r.heart_rate as number | null)
    .filter((v): v is number => typeof v === "number" && !isNaN(v));
  if (!hrValues.length) return [];

  let minHR = Infinity;
  let maxHRFromData = -Infinity;
  for (const v of hrValues) {
    if (v < minHR) minHR = v;
    if (v > maxHRFromData) maxHRFromData = v;
  }

  // Prefer device-provided zones; otherwise, derive Garmin-style zones from HRmax
  const providedZones = (activity.hr_zones || []).filter(
    (z) => z.high_bpm !== null,
  ) as {
    high_bpm: number;
    name?: string | null;
  }[];

  let sorted: { high_bpm: number; name?: string | null }[];
  if (providedZones.length) {
    sorted = [...providedZones].sort((a, b) => a.high_bpm - b.high_bpm);
  } else {
    const hrMax =
      (activity.session?.max_heart_rate as number | undefined) || maxHRFromData;
    const upperBounds = [0.6, 0.7, 0.8, 0.9].map((p) => Math.round(hrMax * p));
    sorted = upperBounds.map((ub) => ({ high_bpm: ub }));
  }

  const colors = [
    "rgba(107, 114, 128, 0.05)", // Zone 0: gray-600 @5%
    "rgba(107, 114, 128, 0.2)", // Zone 1: gray-600 @20%
    "rgba(59, 130, 246, 0.15)", // Zone 2: blue-500 @15%
    "rgba(16, 185, 129, 0.15)", // Zone 3: emerald-500 @15%
    "rgba(245, 158, 11, 0.15)", // Zone 4: amber-500 @15%
    "rgba(239, 68, 68, 0.15)", // Zone 5: red-500 @15%
  ];

  const shapes: any[] = [];
  let lower = minHR;

  const getZoneColor = (
    z: { high_bpm: number; name?: string | null },
    index: number,
  ) => {
    if (z.name === "Zone 0") return colors[0];
    if (z.name === "Zone 1") return colors[1];
    if (z.name === "Zone 2") return colors[2];
    if (z.name === "Zone 3") return colors[3];
    if (z.name === "Zone 4") return colors[4];
    if (z.name === "Zone 5") return colors[5];

    // Fallback based on typical zone sets
    if (sorted.length === 6) return colors[index];
    if (sorted.length === 5) return colors[index + 1];
    if (sorted.length === 4) return colors[index + 1]; // Assume Z1-Z4
    return colors[Math.min(index + 1, colors.length - 1)];
  };

  sorted.forEach((z, idx) => {
    const upper = z.high_bpm;
    if (upper <= lower) {
      lower = upper;
      return;
    }
    const color = getZoneColor(z, idx);
    shapes.push({
      type: "rect",
      xref: "paper",
      x0: 0,
      x1: 1,
      yref: "y",
      y0: lower,
      y1: upper,
      fillcolor: color,
      line: { width: 0 },
      layer: "below",
    });
    lower = upper;
  });

  const finalUpper = providedZones.length
    ? Math.max(sorted[sorted.length - 1].high_bpm, maxHRFromData)
    : maxHRFromData;
  if (lower < finalUpper) {
    // Use the last zone's color (Zone 5) for anything above the highest boundary
    shapes.push({
      type: "rect",
      xref: "paper",
      x0: 0,
      x1: 1,
      yref: "y",
      y0: lower,
      y1: finalUpper,
      fillcolor: colors[5],
      line: { width: 0 },
      layer: "below",
    });
  }

  return shapes;
}
