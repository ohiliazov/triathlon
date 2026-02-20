import { describe, it, expect } from "vitest";
import { processLabTestExcel } from "./dataProcessor";
import fs from "fs";
import path from "path";

describe("dataProcessor - Real Data Validation", () => {
  const dataPath = path.resolve(__dirname, "../../data/Oleksandr_Hiliazov__Run__2025.xlsx");

  it("should accurately calculate thresholds for Oleksandr_Hiliazov__Run__2025.xlsx", () => {
    // 1. Read the real Excel file
    const buffer = fs.readFileSync(dataPath);

    // 2. Process it
    const result = processLabTestExcel(buffer);

    // 3. Extract thresholds
    const { at, rc, max, calculatedAt, calculatedRc } = result.thresholds;

    console.log(`Official AT: ${at}, Calculated AT: ${calculatedAt}`);
    console.log(`Official RC: ${rc}, Calculated RC: ${calculatedRc}`);
    console.log(`Max: ${max}`);

    // 4. Validation Assertions
    // We expect the calculated thresholds to be within 1 minute of official lab data
    // (given the step-based nature of the test, 1 minute is a reasonable clinical tolerance)

    expect(calculatedAt).toBeDefined();
    expect(calculatedRc).toBeDefined();

    if (calculatedAt !== undefined) {
      const atDiff = Math.abs(at - calculatedAt);
      expect(atDiff).toBeLessThanOrEqual(1.0); // 1 minute tolerance
    }

    if (calculatedRc !== undefined) {
      const rcDiff = Math.abs(rc - calculatedRc);
      expect(rcDiff).toBeLessThanOrEqual(1.5); // 1.5 minute tolerance for RC
    }
  });

  it("should have consistent data point counts", () => {
    const buffer = fs.readFileSync(dataPath);
    const result = processLabTestExcel(buffer);

    expect(result.data.length).toBeGreaterThan(100);
    expect(result.data[0]).toHaveProperty("VO2");
    expect(result.data[0]).toHaveProperty("minutes");
  });
});
