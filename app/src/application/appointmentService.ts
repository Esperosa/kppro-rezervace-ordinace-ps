import { prisma } from "../infrastructure/db/prisma.js";
import {
  toMondayFirstDayOfWeek,
  toHHMM,
  calculateFreeSlots,
  SlotInfo,
} from "./dateUtils.js";

export class DoubleBookingError extends Error {
  constructor() {
    super("Na tento termín už má lékař jinou rezervaci.");
    this.name = "DoubleBookingError";
  }
}

export class OutsideOfficeHoursError extends Error {
  constructor() {
    super("Termín je mimo ordinační hodiny zvoleného lékaře.");
    this.name = "OutsideOfficeHoursError";
  }
}

export class AppointmentNotFoundError extends Error {
  constructor(id: string) {
    super(`Rezervace s ID ${id} nebyla nalezena.`);
    this.name = "AppointmentNotFoundError";
  }
}

export class AppointmentAlreadyCancelledError extends Error {
  constructor() {
    super("Zrušenou rezervaci již nelze přesunout ani znovu rušit.");
    this.name = "AppointmentAlreadyCancelledError";
  }
}

export interface CreateAppointmentInput {
  patientId: string;
  doctorId: string;
  startsAt: Date;
  procedureIds?: string[];
}

export interface ListAppointmentsFilters {
  doctorId?: string;
  patientId?: string;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
}

/**
 * Aplikační logika rezervace: ověří ordinační hodiny, pak se spolehne na
 * unikátní index (doctorId, startsAt) v databázi jako na poslední pojistku
 * proti souběhu (race condition) dvou rezervací na stejný termín.
 */
export async function createAppointment(input: CreateAppointmentInput) {
  await assertWithinOfficeHours(input.doctorId, input.startsAt);

  try {
    return await prisma.appointment.create({
      data: {
        patientId: input.patientId,
        doctorId: input.doctorId,
        startsAt: input.startsAt,
        procedures: {
          create: (input.procedureIds ?? []).map((procedureId) => ({
            procedureId,
          })),
        },
      },
      include: {
        patient: true,
        doctor: true,
        procedures: {
          include: { procedure: true },
        },
      },
    });
  } catch (err: unknown) {
    if (isUniqueConstraintViolation(err)) {
      throw new DoubleBookingError();
    }
    throw err;
  }
}

export async function getAppointmentById(id: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: true,
      doctor: true,
      procedures: {
        include: { procedure: true },
      },
    },
  });

  if (!appointment) {
    throw new AppointmentNotFoundError(id);
  }

  return appointment;
}

export async function listAppointments(filters: ListAppointmentsFilters = {}) {
  return prisma.appointment.findMany({
    where: {
      doctorId: filters.doctorId,
      patientId: filters.patientId,
      status: filters.status,
    },
    include: {
      patient: true,
      doctor: true,
      procedures: {
        include: { procedure: true },
      },
    },
    orderBy: { startsAt: "asc" },
  });
}

/**
 * Zrušení rezervace - změní stav na CANCELLED.
 * Termín se tím uvolní pro ostatní pacienty ve findFreeSlots.
 */
export async function cancelAppointment(id: string) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) {
    throw new AppointmentNotFoundError(id);
  }
  if (existing.status === "CANCELLED") {
    throw new AppointmentAlreadyCancelledError();
  }

  return prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: {
      patient: true,
      doctor: true,
      procedures: {
        include: { procedure: true },
      },
    },
  });
}

/**
 * Přesun rezervace na jiný termín.
 * Ověří ordinační hodiny a unikátnost nového termínu.
 */
export async function rescheduleAppointment(id: string, newStartsAt: Date) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) {
    throw new AppointmentNotFoundError(id);
  }
  if (existing.status === "CANCELLED") {
    throw new AppointmentAlreadyCancelledError();
  }

  await assertWithinOfficeHours(existing.doctorId, newStartsAt);

  try {
    return await prisma.appointment.update({
      where: { id },
      data: { startsAt: newStartsAt },
      include: {
        patient: true,
        doctor: true,
        procedures: {
          include: { procedure: true },
        },
      },
    });
  } catch (err: unknown) {
    if (isUniqueConstraintViolation(err)) {
      throw new DoubleBookingError();
    }
    throw err;
  }
}

/**
 * Přiřazení výkonu k existující návštěvě (M:N vazba Appointment <-> Procedure).
 */
export async function addProcedureToAppointment(
  appointmentId: string,
  procedureId: string,
  note?: string
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment) {
    throw new AppointmentNotFoundError(appointmentId);
  }

  return prisma.appointmentProcedure.upsert({
    where: {
      appointmentId_procedureId: { appointmentId, procedureId },
    },
    update: { note },
    create: { appointmentId, procedureId, note },
    include: { procedure: true },
  });
}

async function assertWithinOfficeHours(doctorId: string, startsAt: Date) {
  const dayOfWeek = toMondayFirstDayOfWeek(startsAt.getDay());
  const time = toHHMM(startsAt);

  const matching = await prisma.officeHours.findFirst({
    where: {
      doctorId,
      dayOfWeek,
      startTime: { lte: time },
      endTime: { gt: time },
    },
  });

  if (!matching) {
    throw new OutsideOfficeHoursError();
  }
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}

/**
 * Vygeneruje volné termíny lékaře pro zadaný den.
 * Načte ordinační hodiny pro daný den v týdnu a odečte existující
 * aktivní (nezrušené) rezervace.
 */
export async function findFreeSlots(
  doctorId: string,
  date: Date,
  slotDurationMinutes: number = 30
): Promise<SlotInfo[]> {
  const dayOfWeek = toMondayFirstDayOfWeek(date.getDay());

  const officeHours = await prisma.officeHours.findMany({
    where: { doctorId, dayOfWeek },
    orderBy: { startTime: "asc" },
  });

  if (officeHours.length === 0) {
    return [];
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      startsAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        not: "CANCELLED",
      },
    },
    select: { startsAt: true },
  });

  const bookedDates = bookedAppointments.map((a) => a.startsAt);

  return calculateFreeSlots({
    officeHours,
    bookedDates,
    date,
    slotDurationMinutes,
  });
}
