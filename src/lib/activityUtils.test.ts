import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatPace,
  calculateMovingAverage,
  calculateBlockAverage,
  prepareActivityChartData,
} from "./activityUtils";
import { ProcessedActivity } from "./fitProcessor";

describe("activityUtils - Formatting", () => {
  describe("formatDuration", () => {
    it("formats seconds to MM:SS", () => {
      expect(formatDuration(0)).toBe("00:00");
      expect(formatDuration(59)).toBe("00:59");
      expect(formatDuration(60)).toBe("01:00");
      expect(formatDuration(3599)).toBe("59:59");
    });

    it("formats seconds to HH:MM:SS", () => {
      expect(formatDuration(3600)).toBe("1:00:00");
      expect(formatDuration(3661)).toBe("1:01:01");
      expect(formatDuration(36000)).toBe("10:00:00");
    });

    it("handles null and NaN", () => {
      expect(formatDuration(null)).toBe("--:--");
      expect(formatDuration(NaN)).toBe("--:--");
    });

    it("rounds seconds", () => {
      expect(formatDuration(60.4)).toBe("01:00");
      expect(formatDuration(60.6)).toBe("01:01");
    });
  });

  describe("formatPace", () => {
    it("formats decimal minutes to MM:SS", () => {
      expect(formatPace(5)).toBe("05:00");
      expect(formatPace(5.5)).toBe("05:30");
      expect(formatPace(10.25)).toBe("10:15");
    });

    it("formats decimal minutes to HH:MM:SS", () => {
      expect(formatPace(61)).toBe("1:01:00");
    });

    it("handles invalid values", () => {
      expect(formatPace(null)).toBe("--:--");
      expect(formatPace(NaN)).toBe("--:--");
      expect(formatPace(Infinity)).toBe("--:--");
      expect(formatPace(0)).toBe("--:--");
      expect(formatPace(-1)).toBe("--:--");
    });

    it("rounds to nearest second", () => {
      expect(formatPace(5.001)).toBe("05:00");
      expect(formatPace(5.01)).toBe("05:01");
    });
  });
});

describe("activityUtils - Averaging", () => {
  const records = [
    { hr: 100, speed: 10 },
    { hr: 110, speed: 11 },
    { hr: 120, speed: 12 },
    { hr: 130, speed: 13 },
    { hr: 140, speed: 14 },
  ];
  const times = [0, 1000, 2000, 3000, 4000]; // in ms

  describe("calculateMovingAverage", () => {
    it("returns raw values when window <= 1", () => {
      const result = calculateMovingAverage(records, times, "hr", 0);
      expect(result).toEqual([100, 110, 120, 130, 140]);
    });

    it("applies transform when window <= 1", () => {
      const result = calculateMovingAverage(records, times, "hr", 0, (v) => v * 2);
      expect(result).toEqual([200, 220, 240, 260, 280]);
    });

    it("calculates moving average correctly", () => {
      // 3-second window at t=1000ms: includes 0, 1000, 2000
      // (100+110+120)/3 = 110
      const result = calculateMovingAverage(records, times, "hr", 2);
      // halfWindowMs = 1000.
      // i=0: [0, 1000] -> (100+110)/2 = 105
      // i=1: [0, 1000, 2000] -> (100+110+120)/3 = 110
      // i=2: [1000, 2000, 3000] -> (110+120+130)/3 = 120
      expect(result[1]).toBe(110);
      expect(result[2]).toBe(120);
    });

    it("handles missing data in records", () => {
      const sparseRecords = [
        { hr: 100 },
        { hr: null },
        { hr: 120 },
      ];
      const sparseTimes = [0, 1000, 2000];
      const result = calculateMovingAverage(sparseRecords, sparseTimes, "hr", 2);
      // i=1: [0, 1000, 2000] -> (100 + null + 120) / 2 = 110
      expect(result[1]).toBe(110);
    });
  });

  describe("calculateBlockAverage", () => {
    it("returns raw values when window <= 1", () => {
      const result = calculateBlockAverage(records, times, "hr", 0);
      expect(result).toEqual([100, 110, 120, 130, 140]);
    });

    it("calculates block average correctly", () => {
      // 2-second blocks: [0, 1000], [2000, 3000], [4000]
      // Block 1: (100+110)/2 = 105
      // Block 2: (120+130)/2 = 125
      // Block 3: 140
      const result = calculateBlockAverage(records, times, "hr", 2);
      expect(result).toEqual([105, 105, 125, 125, 140]);
    });

    it("handles empty input", () => {
      expect(calculateBlockAverage([], [], "hr", 10)).toEqual([]);
    });
  });
});

describe("activityUtils - Chart Data Preparation", () => {
  const mockActivity: ProcessedActivity = {
    records: [
      {
        timestamp: "2025-02-25T12:00:00Z",
        heart_rate: 100,
        speed: 5,
        distance: 0,
        altitude: 100,
        cadence: 80,
      },
      {
        timestamp: "2025-02-25T12:00:01Z",
        heart_rate: 105,
        speed: 5.1,
        distance: 5,
        altitude: 101,
        cadence: 82,
      },
      {
        timestamp: "2025-02-25T12:00:02Z",
        heart_rate: 110,
        speed: 5.2,
        distance: 10,
        altitude: 102,
        cadence: 84,
      },
    ],
    laps: [],
    session: { sport: "running" },
  };

  const defaultSettings = {
    smoothingWindow: 0,
    intervalWindow: 0,
    usePace: true,
    overlayPaceOnHR: false,
    overlayElevationOnSpeed: false,
    xAxisType: "time" as const,
  };

  it("should generate valid traces for initial state", () => {
    const chartData = prepareActivityChartData(mockActivity, defaultSettings);

    expect(chartData).not.toBeNull();
    expect(chartData?.heartRate.data.length).toBeGreaterThan(0);
    expect(chartData?.paceSpeed.data.length).toBeGreaterThan(0);

    // Verify trace structure
    const hrTrace = chartData?.heartRate.data[0];
    expect(hrTrace?.x.length).toBe(3);
    expect(hrTrace?.y.length).toBe(3);
    expect(hrTrace?.y[0]).toBe(100);
  });

  it("should handle distance-based x-axis", () => {
    const settings = { ...defaultSettings, xAxisType: "distance" as const };
    const chartData = prepareActivityChartData(mockActivity, settings);

    const hrTrace = chartData?.heartRate.data[0];
    expect(hrTrace?.x[0]).toBe(0);
    expect(hrTrace?.x[1]).toBe(0.005); // 5m to km
  });

  it("should correctly toggle overlays", () => {
    // Toggle ON
    const settingsOn = { ...defaultSettings, overlayPaceOnHR: true, overlayElevationOnSpeed: true };
    const chartDataOn = prepareActivityChartData(mockActivity, settingsOn);

    // HR chart should now have 2 traces: HR and Pace overlay
    expect(chartDataOn?.heartRate.data.length).toBe(2);
    expect(chartDataOn?.heartRate.data[1].name).toContain("Pace");
    expect(chartDataOn?.heartRate.data[1].yaxis).toBe("y2");
    expect(chartDataOn?.heartRate.layout.yaxis2).toBeDefined();

    // Pace chart should have 2 traces: Pace and Elevation overlay
    expect(chartDataOn?.paceSpeed.data.length).toBe(2);
    expect(chartDataOn?.paceSpeed.data[1].name).toBe("Elevation");
    expect(chartDataOn?.paceSpeed.data[1].yaxis).toBe("y2");
    expect(chartDataOn?.paceSpeed.layout.yaxis2).toBeDefined();

    // Toggle OFF
    const settingsOff = { ...defaultSettings, overlayPaceOnHR: false, overlayElevationOnSpeed: false };
    const chartDataOff = prepareActivityChartData(mockActivity, settingsOff);

    // HR chart should have 1 trace
    expect(chartDataOff?.heartRate.data.length).toBe(1);
    expect(chartDataOff?.heartRate.layout.yaxis2).toBeUndefined();

    // Pace chart should have 1 trace
    expect(chartDataOff?.paceSpeed.data.length).toBe(1);
    expect(chartDataOff?.paceSpeed.layout.yaxis2).toBeUndefined();
  });

  it("should handle missing data gracefully", () => {
    const activityWithMissingData: ProcessedActivity = {
      records: [
        { timestamp: "2025-02-25T12:00:00Z", heart_rate: 100 },
        { timestamp: "2025-02-25T12:00:01Z" }, // Missing HR and speed
        { timestamp: "2025-02-25T12:00:02Z", heart_rate: 110 },
      ],
      laps: [],
      session: {},
    };
    const chartData = prepareActivityChartData(
      activityWithMissingData,
      defaultSettings,
    );
    expect(chartData).not.toBeNull();
    expect(chartData?.heartRate.data[0].y).toEqual([100, null, 110]);
  });

  it("should return null for empty records", () => {
    const emptyActivity: ProcessedActivity = {
      records: [],
      laps: [],
      session: {},
    };
    const chartData = prepareActivityChartData(emptyActivity, defaultSettings);
    expect(chartData).toBeNull();
  });
});
