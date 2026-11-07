import { prisma } from "../infrastructure/db/prisma.js";
import { parseTimeToMinutes } from "./dateUtils.js";

export class DoctorNotFoundError extends Error {
  constructor(id: string) {
    super(`Lékař s ID ${id} nebyl nalezen.`);
    this.name = "DoctorNotFoundError";
  }
}

export class InvalidOfficeHoursError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOfficeHoursError";
  }
}

export interface OfficeHoursInput {
  dayOfWeek: number; // 0 = pondělí ... 6 = neděle
  startTime: string; // "08:00"
  endTime: string;   // "16:00"
}

export interface CreateDoctorInput {
  firstName: string;
  lastName: string;
  specialty: string;
  officeHours?: OfficeHoursInput[];
}

export interface UpdateDoctorInput {
  firstName?: string;
  lastName?: string;
  specialty?: string;
  officeHours?: OfficeHoursInput[];
}

function validateOfficeHoursInput(items: OfficeHoursInput[]): void {
  for (const item of items) {
    if (item.dayOfWeek < 0 || item.dayOfWeek > 6) {
      throw new InvalidOfficeHoursError(
        `Neplatný den v týdnu (${item.dayOfWeek}). Hodnota musí být 0 (pondělí) až 6 (neděle).`
      );
    }
    const startMin = parseTimeToMinutes(item.startTime);
    const endMin = parseTimeToMinutes(item.endTime);
    if (startMin >= endMin) {
      throw new InvalidOfficeHoursError(
        `Začátek ordinačních hodin (${item.startTime}) musí předcházet konci (${item.endTime}).`
      );
    }
  }
}

export async function listDoctors(specialty?: string) {
  return prisma.doctor.findMany({
    where: specialty ? { specialty: { contains: specialty, mode: "insensitive" } } : undefined,
    include: {
      officeHours: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function getDoctorById(id: string) {
  const doctor = await prisma.doctor.findUnique({
    where: { id },
    include: {
      officeHours: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!doctor) {
    throw new DoctorNotFoundError(id);
  }

  return doctor;
}

export async function createDoctor(input: CreateDoctorInput) {
  if (input.officeHours && input.officeHours.length > 0) {
    validateOfficeHoursInput(input.officeHours);
  }

  return prisma.doctor.create({
    data: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      specialty: input.specialty.trim(),
      officeHours: input.officeHours
        ? {
            create: input.officeHours.map((oh) => ({
              dayOfWeek: oh.dayOfWeek,
              startTime: oh.startTime,
              endTime: oh.endTime,
            })),
          }
        : undefined,
    },
    include: {
      officeHours: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  });
}

export async function updateDoctor(id: string, input: UpdateDoctorInput) {
  await getDoctorById(id);

  if (input.officeHours) {
    validateOfficeHoursInput(input.officeHours);
  }

  return prisma.$transaction(async (tx) => {
    if (input.officeHours !== undefined) {
      // Při aktualizaci ordinačních hodin nahradíme staré záznamy novými
      await tx.officeHours.deleteMany({ where: { doctorId: id } });
      if (input.officeHours.length > 0) {
        await tx.officeHours.createMany({
          data: input.officeHours.map((oh) => ({
            doctorId: id,
            dayOfWeek: oh.dayOfWeek,
            startTime: oh.startTime,
            endTime: oh.endTime,
          })),
        });
      }
    }

    return tx.doctor.update({
      where: { id },
      data: {
        firstName: input.firstName?.trim(),
        lastName: input.lastName?.trim(),
        specialty: input.specialty?.trim(),
      },
      include: {
        officeHours: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });
  });
}
