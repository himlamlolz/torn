import { describe, it, expect } from "vitest";
import { parseTimestamp, computeSpell, MS_PER_DAY } from "./drySpell.js";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Build a drop with a Torn-format timestamp, rarity, etc. */
function drop(timestamp, rarity = "Yellow", doubleBonus = false) {
  return { timestamp, rarity, doubleBonus };
}

// ─── parseTimestamp ──────────────────────────────────────────────────────────

describe("parseTimestamp", () => {
  it("parses a valid Torn timestamp to a UTC Date", () => {
    const d = parseTimestamp("08:16:00 - 21/04/26");
    expect(d).toBeInstanceOf(Date);
    expect(d.toISOString()).toBe("2026-04-21T08:16:00.000Z");
  });

  it("returns null for null input", () => {
    expect(parseTimestamp(null)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseTimestamp("")).toBeNull();
  });

  it("returns null when the separator is missing", () => {
    expect(parseTimestamp("08:16:00 21/04/26")).toBeNull();
  });

  it("returns null for a malformed date part", () => {
    expect(parseTimestamp("08:16:00 - 21/04")).toBeNull();
  });
});

// ─── computeSpell – basic ───────────────────────────────────────────────────

describe("computeSpell – drop counts", () => {
  it("returns zeros / nulls for an empty array", () => {
    const result = computeSpell([], () => true);
    expect(result.current).toBe(0);
    expect(result.max).toBe(0);
    expect(result.worstDays).toBeNull();
    expect(result.currentDays).toBeNull();
    expect(result.since).toBeNull();
  });

  it("counts consecutive non-qualifying drops correctly", () => {
    const drops = [
      drop("00:00:00 - 01/01/26", "Orange"),
      drop("00:00:00 - 02/01/26", "Yellow"),
      drop("00:00:00 - 03/01/26", "Yellow"),
      drop("00:00:00 - 04/01/26", "Yellow"),
    ];
    const result = computeSpell(drops, d => d.rarity === "Orange");
    expect(result.current).toBe(3);  // three trailing non-orange
    expect(result.max).toBe(3);
  });

  it("resets current streak when a qualifying drop appears", () => {
    const drops = [
      drop("00:00:00 - 01/01/26", "Yellow"),
      drop("00:00:00 - 02/01/26", "Orange"),
      drop("00:00:00 - 03/01/26", "Yellow"),
    ];
    const result = computeSpell(drops, d => d.rarity === "Orange");
    expect(result.current).toBe(1);   // one trailing non-orange
    expect(result.max).toBe(1);       // max gap was 1 (before first orange)
  });

  it("tracks the longest consecutive drop run", () => {
    const drops = [
      drop("00:00:00 - 01/01/26", "Orange"),  // qualifying
      drop("00:00:00 - 02/01/26", "Yellow"),
      drop("00:00:00 - 03/01/26", "Yellow"),  // gap of 2
      drop("00:00:00 - 04/01/26", "Orange"),  // qualifying
      drop("00:00:00 - 05/01/26", "Yellow"),  // gap of 1 trailing
    ];
    const result = computeSpell(drops, d => d.rarity === "Orange");
    expect(result.max).toBe(2);
    expect(result.current).toBe(1);
  });
});

// ─── computeSpell – worstDays (the bug fix) ─────────────────────────────────

describe("computeSpell – worstDays (bug fix)", () => {
  /**
   * The leading gap (time from the first drop in the dataset to the first
   * qualifying drop) CAN be the longest dry spell and must be included.
   *
   * Scenario:
   *   – Dataset starts 2026-01-01 with many non-orange drops (~110 days).
   *   – First orange: 2026-04-21.
   *   – Second (last) orange: 2026-05-11.
   *
   * Longest dry spell = Jan 1 → Apr 21 ≈ 110 days (the leading period).
   * The gap between the two oranges (~20 days) is shorter.
   */
  it("includes the leading span (before the first qualifying drop) in worstDays", () => {
    const drops = [
      // many non-orange drops at the start of the dataset (≈110 days before first orange)
      drop("00:00:00 - 01/01/26", "Yellow"),
      drop("00:00:00 - 15/02/26", "Yellow"),
      drop("00:00:00 - 01/04/26", "Yellow"),
      // first orange
      drop("08:16:00 - 21/04/26", "Orange"),
      // non-orange between the two oranges
      drop("12:00:00 - 25/04/26", "Yellow"),
      drop("12:00:00 - 05/05/26", "Yellow"),
      // second (last) orange — ends the dry spell
      drop("02:47:09 - 11/05/26", "Orange"),
    ];

    const result = computeSpell(drops, d => d.rarity === "Orange");

    // Leading gap Jan 1 → Apr 21 ≈ 110 days IS the longest dry spell.
    expect(result.worstDays).toBeGreaterThanOrEqual(109);
    expect(result.worstDays).toBeLessThanOrEqual(111);

    // The gap between the two oranges is only ~20 days, not the worst.
    expect(result.worstDays).toBeGreaterThan(20);
  });

  it("uses the leading gap when it is the largest (leading > inter-occurrence > trailing)", () => {
    // Leading gap of 20 days, then oranges close together, then small trailing gap.
    const drops = [
      drop("00:00:00 - 01/01/26", "Yellow"),   // leading non-qualifying
      drop("00:00:00 - 21/01/26", "Orange"),   // first qualifying, 20 days after start
      drop("00:00:00 - 24/01/26", "Orange"),   // +3 days gap
      drop("00:00:00 - 26/01/26", "Yellow"),   // +2 days trailing
    ];
    const result = computeSpell(drops, d => d.rarity === "Orange");
    // leading: 20d, inter: 3d, trailing: 2d → worstDays = 20
    expect(result.worstDays).toBe(20);
  });

  it("measures the largest gap between consecutive qualifying drops", () => {
    // Qualifying every 5 days, then a 10-day gap, then every 2 days
    const drops = [
      drop("00:00:00 - 01/01/26", "Orange"),
      drop("00:00:00 - 06/01/26", "Orange"),  // +5 days
      drop("00:00:00 - 11/01/26", "Orange"),  // +5 days
      drop("00:00:00 - 21/01/26", "Orange"),  // +10 days  ← longest gap
      drop("00:00:00 - 23/01/26", "Orange"),  // +2 days
      drop("00:00:00 - 25/01/26", "Orange"),  // +2 days (last qualifying)
      drop("00:00:00 - 26/01/26", "Yellow"),  // +1 day trailing (current streak)
    ];

    const result = computeSpell(drops, d => d.rarity === "Orange");
    // Longest between-drop gap is 10 days; trailing gap is 1 day → worstDays = 10
    expect(result.worstDays).toBe(10);
  });

  it("uses the trailing (current) gap when it is the largest", () => {
    const drops = [
      drop("00:00:00 - 01/01/26", "Orange"),
      drop("00:00:00 - 03/01/26", "Orange"),  // +2 days gap
      // 15 trailing non-orange days
      drop("00:00:00 - 18/01/26", "Yellow"),
    ];

    const result = computeSpell(drops, d => d.rarity === "Orange");
    // Inter-occurrence gap: 2 days; trailing: 15 days → worstDays = 15
    expect(result.worstDays).toBe(15);
  });

  it("returns correct worstDays when there is only one qualifying drop", () => {
    // One orange, then 10 days of non-orange; but there are 4 leading non-orange days too.
    const drops = [
      drop("00:00:00 - 01/01/26", "Yellow"),
      drop("00:00:00 - 05/01/26", "Orange"),  // only qualifying drop (4 days after start)
      drop("00:00:00 - 15/01/26", "Yellow"),  // 10 days after orange
    ];

    const result = computeSpell(drops, d => d.rarity === "Orange");
    // Leading gap: 4 days; trailing gap: 10 days → worstDays = 10
    expect(result.worstDays).toBe(10);
  });

  it("returns the full dataset span when there are no qualifying drops at all", () => {
    const drops = [
      drop("00:00:00 - 01/01/26", "Yellow"),
      drop("00:00:00 - 11/01/26", "Yellow"),  // 10 days after
    ];

    const result = computeSpell(drops, d => d.rarity === "Orange");
    // No orange at all → gap = firstDropTime to lastDropTime = 10 days
    expect(result.worstDays).toBe(10);
  });
});

// ─── computeSpell – currentDays ─────────────────────────────────────────────

describe("computeSpell – currentDays", () => {
  it("is null when there is no current dry spell", () => {
    const drops = [
      drop("00:00:00 - 01/01/26", "Yellow"),
      drop("00:00:00 - 05/01/26", "Orange"),
    ];
    const result = computeSpell(drops, d => d.rarity === "Orange");
    expect(result.current).toBe(0);
    expect(result.currentDays).toBeNull();
  });

  it("counts days from last qualifying drop to the last loaded drop", () => {
    const drops = [
      drop("00:00:00 - 01/01/26", "Orange"),
      drop("00:00:00 - 11/01/26", "Yellow"),  // 10 days after last orange
    ];
    const result = computeSpell(drops, d => d.rarity === "Orange");
    expect(result.current).toBe(1);
    expect(result.currentDays).toBe(10);
  });
});

// ─── computeSpell – since ────────────────────────────────────────────────────

describe("computeSpell – since", () => {
  it("is null when there is no current dry spell", () => {
    const drops = [drop("00:00:00 - 01/01/26", "Orange")];
    const result = computeSpell(drops, d => d.rarity === "Orange");
    expect(result.since).toBeNull();
  });

  it("is the day AFTER the last qualifying drop (midnight UTC)", () => {
    const drops = [
      drop("06:00:00 - 05/01/26", "Orange"),
      drop("00:00:00 - 10/01/26", "Yellow"),
    ];
    const result = computeSpell(drops, d => d.rarity === "Orange");
    expect(result.since).toBeInstanceOf(Date);
    // Day after 2026-01-05 → 2026-01-06 00:00:00 UTC
    expect(result.since.toISOString()).toBe("2026-01-06T00:00:00.000Z");
  });
});
