import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/infrastructure/db/prisma.js";
import {
  createDoctor,
  getDoctorById,
  listDoctors,
  updateDoctor,
  InvalidOfficeHoursError,
} from "../src/application/doctorService.js";
import {
  createPatient,
  getPatientById,
  updatePatient,
  DuplicateEmailError,
} from "../src/application/patientService.js";
import {
  createProcedure,
  listProcedures,
  DuplicateProcedureCodeError,
} from "../src/application/procedureService.js";

let createdDoctorId: string;
let createdPatientId: string;
let createdProcedureId: string;

beforeAll(async () => {
  // Připravíme čistý stav pro testovací entity
});

afterAll(async () => {
  if (createdDoctorId) {
    await prisma.officeHours.deleteMany({ where: { doctorId: createdDoctorId } });
    await prisma.doctor.delete({ where: { id: createdDoctorId } }).catch(() => {});
  }
  if (createdPatientId) {
    await prisma.patient.delete({ where: { id: createdPatientId } }).catch(() => {});
  }
  if (createdProcedureId) {
    await prisma.procedure.delete({ where: { id: createdProcedureId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe("DoctorService (CRUD & validace)", () => {
  it("vytvoří lékaře s ordinačními hodinami", async () => {
    const doc = await createDoctor({
      firstName: "Martin",
      lastName: "Kovář",
      specialty: "Kardiologie",
      officeHours: [
        { dayOfWeek: 0, startTime: "08:00", endTime: "14:00" },
        { dayOfWeek: 2, startTime: "09:00", endTime: "15:00" },
      ],
    });

    createdDoctorId = doc.id;
    expect(doc.firstName).toBe("Martin");
    expect(doc.officeHours).toHaveLength(2);
  });

  it("odmítne ordinační hodiny, kde začátek je po konci", async () => {
    await expect(
      createDoctor({
        firstName: "Test",
        lastName: "Chybný",
        specialty: "Chirurgie",
        officeHours: [{ dayOfWeek: 1, startTime: "14:00", endTime: "08:00" }],
      })
    ).rejects.toBeInstanceOf(InvalidOfficeHoursError);
  });

  it("vyhledá lékaře podle ID a podle specializace", async () => {
    const doc = await getDoctorById(createdDoctorId);
    expect(doc.id).toBe(createdDoctorId);

    const list = await listDoctors("kardio");
    expect(list.some((d) => d.id === createdDoctorId)).toBe(true);
  });

  it("aktualizuje údaje lékaře a jeho ordinační hodiny", async () => {
    const updated = await updateDoctor(createdDoctorId, {
      specialty: "Invazivní kardiologie",
      officeHours: [{ dayOfWeek: 0, startTime: "07:30", endTime: "13:00" }],
    });

    expect(updated.specialty).toBe("Invazivní kardiologie");
    expect(updated.officeHours).toHaveLength(1);
    expect(updated.officeHours[0].startTime).toBe("07:30");
  });
});

describe("PatientService (CRUD & unikátnost e-mailu)", () => {
  const email = `karel.test.${Date.now()}@example.com`;

  it("vytvoří pacienta", async () => {
    const patient = await createPatient({
      firstName: "Karel",
      lastName: "Černý",
      email,
      phone: "+420123456789",
    });

    createdPatientId = patient.id;
    expect(patient.email).toBe(email);
  });

  it("odmítne duplicitní e-mail pacienta (DuplicateEmailError)", async () => {
    await expect(
      createPatient({
        firstName: "Jiný",
        lastName: "Karel",
        email,
      })
    ).rejects.toBeInstanceOf(DuplicateEmailError);
  });

  it("aktualizuje telefon pacienta", async () => {
    const updated = await updatePatient(createdPatientId, {
      phone: "+420987654321",
    });
    expect(updated.phone).toBe("+420987654321");
  });
});

describe("ProcedureService (CRUD & unikátnost kódu)", () => {
  const code = `TEST_${Date.now().toString().slice(-5)}`;

  it("vytvoří lékařský výkon", async () => {
    const proc = await createProcedure({
      name: "EKG vyšetření",
      code,
    });

    createdProcedureId = proc.id;
    expect(proc.code).toBe(code);
  });

  it("odmítne duplicitní kód výkonu (DuplicateProcedureCodeError)", async () => {
    await expect(
      createProcedure({
        name: "Opakované EKG",
        code,
      })
    ).rejects.toBeInstanceOf(DuplicateProcedureCodeError);
  });

  it("vrátí seznam výkonů obsahující vytvořený výkon", async () => {
    const list = await listProcedures();
    expect(list.some((p) => p.id === createdProcedureId)).toBe(true);
  });
});
