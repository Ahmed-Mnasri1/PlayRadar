import { describe, expect, it } from "vitest";
import { usd, pct, timeAgo, fmtDate, storeName, averagePrice, DAY } from "../lib.js";

describe("lib helpers", () => {
  it("formats US dollars and discounts", () => {
    expect(usd(59.99)).toBe("$59.99");
    expect(usd(5)).toBe("$5.00");
    expect(usd(null)).toBe("—");
    expect(pct(30)).toBe("−30%");
  });

  it("says how long ago something happened", () => {
    const now = Date.now();
    expect(timeAgo(now - 10_000, now)).toBe("just now");
    expect(timeAgo(now - 5 * 60_000, now)).toBe("5 min ago");
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe("3 h ago");
    expect(timeAgo(now - 2 * DAY, now)).toBe("2 d ago");
  });

  it("formats release dates, keeping year-only dates as they are", () => {
    expect(fmtDate("2027")).toBe("2027");
    expect(fmtDate("2022-02-24")).toBe("Feb 24, 2022");
  });

  it("names stores", () => {
    expect(storeName("steam")).toBe("Steam");
    expect(storeName("ggretail")).toBe("Best retail store");
    expect(storeName("unknown")).toBe("unknown");
  });

  it("averages a step price history over time", () => {
    const now = 100 * DAY;
    // $60 for 50 days, then $30 for 50 days: $45 on average
    const steps = [
      { t: 0, usd: 60 },
      { t: 50 * DAY, usd: 30 },
    ];
    expect(averagePrice(steps, 12, now)).toBeCloseTo(45, 5);
    expect(averagePrice([], 12, now)).toBe(null);
  });
});
