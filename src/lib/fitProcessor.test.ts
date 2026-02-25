import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "fs";
import path from "path";
import { processFitFile } from "./fitProcessor";

function nodeBufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

describe("fitProcessor - FIT parsing", () => {
  const dir = path.resolve(__dirname, "../../data/fitfiles");
  const downloadsDir = path.resolve(__dirname, "../../downloads");

  it("should parse the specific regression activity and match zones", () => {
    const filePath = path.join(downloadsDir, "21977805641_ACTIVITY.fit");
    if (!existsSync(filePath)) {
      console.warn(`Regression file not found: ${filePath}`);
      return;
    }

    const buf = readFileSync(filePath);
    const result = processFitFile(nodeBufferToArrayBuffer(buf));

    expect(result.hr_zones).toBeDefined();
    expect(result.hr_zones?.length).toBeGreaterThanOrEqual(5);

    // Verify the specific zones from the issue description
    // Zone 1: 86 - 125 bpm -> high_bpm should be 125
    // Zone 2: 126 - 145 bpm -> high_bpm should be 145
    // Zone 3: 146 - 158 bpm -> high_bpm should be 158
    // Zone 4: 159 - 172 bpm -> high_bpm should be 172
    // Zone 5: > 173 bpm -> high_bpm should be 188 (max HR in file)

    const z1 = result.hr_zones?.find(z => z.name === "Zone 1");
    const z2 = result.hr_zones?.find(z => z.name === "Zone 2");
    const z3 = result.hr_zones?.find(z => z.name === "Zone 3");
    const z4 = result.hr_zones?.find(z => z.name === "Zone 4");
    const z5 = result.hr_zones?.find(z => z.name === "Zone 5");

    expect(z1?.high_bpm).toBe(125);
    expect(z2?.high_bpm).toBe(145);
    expect(z3?.high_bpm).toBe(158);
    expect(z4?.high_bpm).toBe(172);
    expect(z5?.high_bpm).toBe(188);
  });

  it("should parse workout steps if present", () => {
    const filePath = path.join(downloadsDir, "21977805641_ACTIVITY.fit");
    if (!existsSync(filePath)) return;

    const buf = readFileSync(filePath);
    const result = processFitFile(nodeBufferToArrayBuffer(buf));

    // This file might not have workout steps, but we should test the structure if it does
    if (result.workout_steps) {
      expect(Array.isArray(result.workout_steps)).toBe(true);
      expect(result.workout_steps.length).toBeGreaterThan(0);
      expect(result.workout_steps[0]).toHaveProperty("message_index");
    }
  });

  it("should parse at least one FIT file from data dir", () => {
    if (!existsSync(dir)) {
      console.warn(`Directory not found: ${dir}`);
      return; // Skip if directory does not exist in CI
    }

    const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".fit"));
    if (files.length === 0) {
      console.warn(`No .fit files in ${dir}`);
      return; // Skip if no files available
    }

    const filePath = path.join(dir, files[0]);
    const buf = readFileSync(filePath);
    const result = processFitFile(nodeBufferToArrayBuffer(buf));

    // Basic expectations
    expect(result).toBeTruthy();
    expect(Array.isArray(result.records)).toBe(true);
    expect(Array.isArray(result.laps)).toBe(true);

    if (result.records.length > 0) {
      const firstRecord = result.records[0];
      // Expect some common fields to be present and not null
      // We know heart_rate (8-bit) should be there, but now we expect speed/altitude (16/32-bit)
      const keys = Object.keys(firstRecord);
      const hasNumbers = keys.some(k => typeof firstRecord[k] === 'number' && firstRecord[k] !== null);
      expect(hasNumbers).toBe(true);

      // Check specifically for speed or distance if present
      if (firstRecord.speed !== undefined) {
        expect(firstRecord.speed).not.toBeNull();
      }
      if (firstRecord.distance !== undefined) {
        expect(firstRecord.distance).not.toBeNull();
      }
    }

    if (result.session) {
      expect(result.session.avg_speed).toBeDefined();
      expect(result.session.avg_speed).not.toBeNull();
    }
  });
});
