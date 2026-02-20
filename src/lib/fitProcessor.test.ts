import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "fs";
import path from "path";
import { processFitFile } from "./fitProcessor";

function nodeBufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("fitProcessor - FIT parsing smoke test", () => {
  const dir = path.resolve(__dirname, "../../data/fitfiles");

  it("should parse at least one FIT file and produce records or a session", () => {
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
