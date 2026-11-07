import { prisma } from "../infrastructure/db/prisma.js";

export class PatientNotFoundError extends Error {
  constructor(id: string) {
    super(`Pacient s ID ${id} nebyl nalezen.`);
    this.name = "PatientNotFoundError";
  }
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`Pacient s e-mailem '${email}' již existuje.`);
    this.name = "DuplicateEmailError";
  }
}

export interface CreatePatientInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface UpdatePatientInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}

export async function listPatients(search?: string) {
  return prisma.patient.findMany({
    where: search
      ? {
          OR: [
            { lastName: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function getPatientById(id: string) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: {
        include: {
          doctor: true,
          procedures: { include: { procedure: true } },
        },
        orderBy: { startsAt: "desc" },
      },
    },
  });

  if (!patient) {
    throw new PatientNotFoundError(id);
  }

  return patient;
}

export async function createPatient(input: CreatePatientInput) {
  try {
    return await prisma.patient.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone?.trim(),
      },
    });
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      throw new DuplicateEmailError(input.email);
    }
    throw err;
  }
}

export async function updatePatient(id: string, input: UpdatePatientInput) {
  await getPatientById(id);

  try {
    return await prisma.patient.update({
      where: { id },
      data: {
        firstName: input.firstName?.trim(),
        lastName: input.lastName?.trim(),
        email: input.email?.trim().toLowerCase(),
        phone: input.phone !== undefined ? input.phone.trim() : undefined,
      },
    });
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      throw new DuplicateEmailError(input.email ?? "");
    }
    throw err;
  }
}
