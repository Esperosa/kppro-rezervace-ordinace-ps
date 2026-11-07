import { describe, it, expect } from "vitest";
import {
  calculateFreeSlots,
  parseTimeToMinutes,
  formatMinutesToHHMM,
} from "../src/application/dateUtils.js";

describe("parseTimeToMinutes & formatMinutesToHHMM", () => {
  it("správně převede HH:MM na minuty od půlnoci", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("08:30")).toBe(510);
    expect(parseTimeToMinutes("16:00")).toBe(960);
    expect(parseTimeToMinutes("23:59")).toBe(1439);
  });

  it("vyhodí chybu při neplatném formátu času", () => {
    expect(() => parseTimeToMinutes("25:00")).toThrow();
    expect(() => parseTimeToMinutes("08:65")).toThrow();
    expect(() => parseTimeToMinutes("invalid")).toThrow();
  });

  it("správně převede minuty od půlnoci na HH:MM", () => {
    expect(formatMinutesToHHMM(0)).toBe("00:00");
    expect(formatMinutesToHHMM(510)).toBe("08:30");
    expect(formatMinutesToHHMM(960)).toBe("16:00");
  });
});

describe("calculateFreeSlots", () => {
  const testDate = new Date(2026, 10, 9); // pondělí 9. 11. 2026

  it("vygeneruje 30minutové sloty pro jeden blok ordinačních hodin bez rezervací", () => {
    const slots = calculateFreeSlots({
      officeHours: [{ startTime: "08:00", endTime: "10:00" }],
      bookedDates: [],
      date: testDate,
      slotDurationMinutes: 30,
    });

    expect(slots.map((s) => s.formattedTime)).toEqual([
      "08:00",
      "08:30",
      "09:00",
      "09:30",
    ]);
  });

  it("odečte obsazené termíny z nabídky volných slotů", () => {
    const bookedDate = new Date(testDate);
    bookedDate.setHours(8, 30, 0, 0);

    const slots = calculateFreeSlots({
      officeHours: [{ startTime: "08:00", endTime: "10:00" }],
      bookedDates: [bookedDate],
      date: testDate,
      slotDurationMinutes: 30,
    });

    expect(slots.map((s) => s.formattedTime)).toEqual([
      "08:00",
      "09:00",
      "09:30",
    ]);
  });

  it("zvládne rozdělené ordinační hodiny (pauza na oběd)", () => {
    const slots = calculateFreeSlots({
      officeHours: [
        { startTime: "08:00", endTime: "10:00" },
        { startTime: "12:00", endTime: "13:30" },
      ],
      bookedDates: [],
      date: testDate,
      slotDurationMinutes: 30,
    });

    expect(slots.map((s) => s.formattedTime)).toEqual([
      "08:00",
      "08:30",
      "09:00",
      "09:30",
      "12:00",
      "12:30",
      "13:00",
    ]);
  });

  it("vrátí prázdné pole, pokud lékař nemá v daný den žádné ordinační hodiny", () => {
    const slots = calculateFreeSlots({
      officeHours: [],
      bookedDates: [],
      date: testDate,
    });

    expect(slots).toEqual([]);
  });

  it("nezahrne slot, který by přesahoval konec ordinačních hodin", () => {
    // 08:00 - 08:45 s 30min slotem: vejde se 08:00 (do 08:30), ale 08:30 by končil v 09:00
    const slots = calculateFreeSlots({
      officeHours: [{ startTime: "08:00", endTime: "08:45" }],
      bookedDates: [],
      date: testDate,
      slotDurationMinutes: 30,
    });

    expect(slots.map((s) => s.formattedTime)).toEqual(["08:00"]);
  });

  it("vyhodí výjimku pro neplatnou délku slotu", () => {
    expect(() =>
      calculateFreeSlots({
        officeHours: [{ startTime: "08:00", endTime: "12:00" }],
        bookedDates: [],
        date: testDate,
        slotDurationMinutes: 0,
      })
    ).toThrow();
  });
});
