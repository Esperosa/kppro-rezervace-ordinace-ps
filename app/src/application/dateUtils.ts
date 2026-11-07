export interface OfficeHoursRange {
  startTime: string; // "08:00"
  endTime: string;   // "16:00"
}

export interface SlotInfo {
  startsAt: Date;
  formattedTime: string; // "08:00"
}

export interface CalculateFreeSlotsParams {
  officeHours: OfficeHoursRange[];
  bookedDates: Date[];
  date: Date;
  slotDurationMinutes?: number;
}

/**
 * Převede JS getDay() (0=neděle) na 0=pondělí ... 6=neděle, jak používá OfficeHours.dayOfWeek.
 */
export function toMondayFirstDayOfWeek(jsDayOfWeek: number): number {
  return (jsDayOfWeek + 6) % 7;
}

/**
 * Vrátí "HH:MM" z Date objektu, stejný formát jako OfficeHours.startTime/endTime.
 */
export function toHHMM(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Převede časový řetězec "HH:MM" na počet minut od půlnoci.
 * Vyžaduje striktní formát HH:MM (např. "08:30").
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!/^\d{2}:\d{2}$/.test(timeStr)) {
    throw new Error(`Neplatný formát času: ${timeStr}`);
  }
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Neplatný čas: ${timeStr}`);
  }
  return hours * 60 + minutes;
}

/**
 * Převede počet minut od půlnoci na řetězec "HH:MM".
 */
export function formatMinutesToHHMM(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Čistá aplikační funkce pro výpočet volných slotů daného dne.
 * Vygeneruje všechny možné sloty z ordinačních hodin a odečte ty,
 * na kterých už existuje platná (nezrušená) rezervace.
 */
export function calculateFreeSlots({
  officeHours,
  bookedDates,
  date,
  slotDurationMinutes = 30,
}: CalculateFreeSlotsParams): SlotInfo[] {
  if (slotDurationMinutes <= 0) {
    throw new Error("Délka slotu v minutách musí být kladné číslo.");
  }

  // Vytvoříme množinu časů obsazených termínů (HH:MM) pro rychlé vyhledávání
  const bookedTimes = new Set<string>(
    bookedDates.map((b) => toHHMM(b))
  );

  const candidateSlotsMap = new Map<string, SlotInfo>();

  for (const interval of officeHours) {
    const startMin = parseTimeToMinutes(interval.startTime);
    const endMin = parseTimeToMinutes(interval.endTime);

    // Slot musí začínat i končit uvnitř ordinačních hodin
    for (
      let currentMin = startMin;
      currentMin + slotDurationMinutes <= endMin;
      currentMin += slotDurationMinutes
    ) {
      const timeStr = formatMinutesToHHMM(currentMin);

      // Pokud slot ještě není obsazený a ještě jsme ho nepřidali z jiného intervalu
      if (!bookedTimes.has(timeStr) && !candidateSlotsMap.has(timeStr)) {
        const slotDate = new Date(date);
        slotDate.setHours(Math.floor(currentMin / 60), currentMin % 60, 0, 0);

        candidateSlotsMap.set(timeStr, {
          startsAt: slotDate,
          formattedTime: timeStr,
        });
      }
    }
  }

  // Seřadíme chronologicky podle času
  return Array.from(candidateSlotsMap.values()).sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime()
  );
}
