import { describe, expect, it } from "vitest";
import { resolveCalendarDateRange, resolveDateRange } from "../src/dateRange.js";

describe("resolveDateRange", () => {
  it("resolves hour windows", () => {
    const now = new Date("2026-05-08T01:00:00.000Z");
    const range = resolveDateRange("24h", "Asia/Shanghai", now);

    expect(range.since.toISOString()).toBe("2026-05-07T01:00:00.000Z");
    expect(range.until.toISOString()).toBe("2026-05-08T01:00:00.000Z");
    expect(range.reportDate).toBe("2026-05-08");
  });

  it("resolves full calendar days in Asia/Shanghai", () => {
    const range = resolveCalendarDateRange("2026-05-08", "Asia/Shanghai");

    expect(range.since.toISOString()).toBe("2026-05-07T16:00:00.000Z");
    expect(range.until.toISOString()).toBe("2026-05-08T16:00:00.000Z");
    expect(range.reportDate).toBe("2026-05-08");
    expect(range.label).toBe("2026-05-08 full day (Asia/Shanghai)");
  });
});
