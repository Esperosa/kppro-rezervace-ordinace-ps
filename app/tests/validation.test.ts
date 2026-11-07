import { describe, it, expect } from "vitest";
import { parseTimeToMinutes, formatMinutesToHHMM, toMondayFirstDayOfWeek } from "../src/application/dateUtils.js";

describe("Business rule validations (Unit tests)", () => {
  describe("Ordinační hodiny a formátování času", () => {
    it("odmítne neplatné formáty času bez dvojtečky nebo bez dvou cifer", () => {
      expect(() => parseTimeToMinutes("0800")).toThrow("Neplatný formát času");
      expect(() => parseTimeToMinutes("8:00")).toThrow("Neplatný formát času");
      expect(() => parseTimeToMinutes("abc")).toThrow("Neplatný formát času");
    });

    it("odmítne neplatné hodiny a minuty", () => {
      expect(() => parseTimeToMinutes("24:00")).toThrow("Neplatný čas");
      expect(() => parseTimeToMinutes("12:60")).toThrow("Neplatný čas");
      expect(() => parseTimeToMinutes("99:99")).toThrow("Neplatný čas");
    });

    it("správně převede minuty od půlnoci na formát s vedoucími nulami", () => {
      expect(formatMinutesToHHMM(5)).toBe("00:05");
      expect(formatMinutesToHHMM(65)).toBe("01:05");
    });
  });

  describe("Mapování dnů v týdnu (pondělí = 0 ... neděle = 6)", () => {
    it("mapuje všechny dny správně", () => {
      // JS getDay(): 0=Ne, 1=Po, 2=Út, 3=St, 4=Čt, 5=Pá, 6=So
      expect(toMondayFirstDayOfWeek(1)).toBe(0); // Pondělí
      expect(toMondayFirstDayOfWeek(2)).toBe(1); // Úterý
      expect(toMondayFirstDayOfWeek(3)).toBe(2); // Středa
      expect(toMondayFirstDayOfWeek(4)).toBe(3); // Čtvrtek
      expect(toMondayFirstDayOfWeek(5)).toBe(4); // Pátek
      expect(toMondayFirstDayOfWeek(6)).toBe(5); // Sobota
      expect(toMondayFirstDayOfWeek(0)).toBe(6); // Neděle
    });
  });
});
