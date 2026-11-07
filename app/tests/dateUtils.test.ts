import { describe, it, expect } from "vitest";
import { toMondayFirstDayOfWeek, toHHMM } from "../src/application/dateUtils.js";

// Jednotkový test na čistou aplikační logiku, bez databáze (povinné minimum bod 3).
describe("toMondayFirstDayOfWeek", () => {
  it("převede neděli (JS 0) na 6", () => {
    expect(toMondayFirstDayOfWeek(0)).toBe(6);
  });
  it("převede pondělí (JS 1) na 0", () => {
    expect(toMondayFirstDayOfWeek(1)).toBe(0);
  });
  it("převede sobotu (JS 6) na 5", () => {
    expect(toMondayFirstDayOfWeek(6)).toBe(5);
  });
});

describe("toHHMM", () => {
  it("zformátuje čas jako HH:MM", () => {
    const d = new Date();
    d.setHours(9, 5, 0, 0);
    expect(toHHMM(d)).toBe("09:05");
  });
});
