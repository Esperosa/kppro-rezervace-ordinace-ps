import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../src/infrastructure/db/prisma.js";
import {
  createAppointment,
  cancelAppointment,
  rescheduleAppointment,
  addProcedureToAppointment,
  findFreeSlots,
  DoubleBookingError,
  OutsideOfficeHoursError,
  AppointmentAlreadyCancelledError,
} from "../src/application/appointmentService.js";

// Integrační test proti databázi (povinné minimum bod 3). Potřebuje běžící
// Postgres podle DATABASE_URL (viz docker-compose.yml, služba "db").

let patientId: string;
let doctorId: string;
let procedureId: string;

beforeAll(async () => {
  const patient = await prisma.patient.create({
    data: { firstName: "Jana", lastName: "Testová", email: "jana.test@example.com" },
  });
  patientId = patient.id;

  const doctor = await prisma.doctor.create({
    data: { firstName: "Petr", lastName: "Doktor", specialty: "Praktický lékař" },
  });
  doctorId = doctor.id;

  await prisma.officeHours.create({
    data: { doctorId, dayOfWeek: 0, startTime: "08:00", endTime: "16:00" }, // pondělí
  });

  const procedure = await prisma.procedure.create({
    data: { name: "Odběr krve", code: "BLD01" },
  });
  procedureId = procedure.id;
});

afterAll(async () => {
  await prisma.appointmentProcedure.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.officeHours.deleteMany();
  await prisma.procedure.delete({ where: { id: procedureId } });
  await prisma.doctor.delete({ where: { id: doctorId } });
  await prisma.patient.delete({ where: { id: patientId } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.appointmentProcedure.deleteMany();
  await prisma.appointment.deleteMany();
});

describe("createAppointment", () => {
  it("vytvoří rezervaci v rámci ordinačních hodin", async () => {
    const monday8am = nextWeekdayAt(1, "09:00");
    const appointment = await createAppointment({
      patientId,
      doctorId,
      startsAt: monday8am,
      procedureIds: [],
    });
    expect(appointment.doctorId).toBe(doctorId);
    expect(appointment.status).toBe("SCHEDULED");
  });

  it("odmítne druhou rezervaci na stejný termín (DoubleBookingError)", async () => {
    const slot = nextWeekdayAt(1, "10:00");
    await createAppointment({ patientId, doctorId, startsAt: slot, procedureIds: [] });

    await expect(
      createAppointment({ patientId, doctorId, startsAt: slot, procedureIds: [] })
    ).rejects.toBeInstanceOf(DoubleBookingError);
  });

  it("odmítne termín mimo ordinační hodiny (OutsideOfficeHoursError)", async () => {
    const lateAtNight = nextWeekdayAt(1, "23:00");
    await expect(
      createAppointment({ patientId, doctorId, startsAt: lateAtNight, procedureIds: [] })
    ).rejects.toBeInstanceOf(OutsideOfficeHoursError);
  });
});

describe("cancelAppointment & rescheduleAppointment", () => {
  it("zruší existující rezervaci a uvolní termín", async () => {
    const slot = nextWeekdayAt(1, "11:00");
    const appt = await createAppointment({ patientId, doctorId, startsAt: slot, procedureIds: [] });

    const cancelled = await cancelAppointment(appt.id);
    expect(cancelled.status).toBe("CANCELLED");

    // Po zrušení by mělo jít termín znovu zarezervovat jinou rezervací
    const newAppt = await createAppointment({ patientId, doctorId, startsAt: slot, procedureIds: [] });
    expect(newAppt.id).not.toBe(appt.id);
    expect(newAppt.status).toBe("SCHEDULED");
  });

  it("odmítne opakované rušení již zrušené rezervace", async () => {
    const slot = nextWeekdayAt(1, "11:30");
    const appt = await createAppointment({ patientId, doctorId, startsAt: slot, procedureIds: [] });
    await cancelAppointment(appt.id);

    await expect(cancelAppointment(appt.id)).rejects.toBeInstanceOf(
      AppointmentAlreadyCancelledError
    );
  });

  it("přesune rezervaci na nový platný termín", async () => {
    const originalSlot = nextWeekdayAt(1, "12:00");
    const newSlot = nextWeekdayAt(1, "12:30");

    const appt = await createAppointment({ patientId, doctorId, startsAt: originalSlot, procedureIds: [] });
    const moved = await rescheduleAppointment(appt.id, newSlot);

    expect(moved.startsAt.getTime()).toBe(newSlot.getTime());
  });

  it("odmítne přesun na obsazený termín", async () => {
    const slot1 = nextWeekdayAt(1, "13:00");
    const slot2 = nextWeekdayAt(1, "13:30");

    const appt1 = await createAppointment({ patientId, doctorId, startsAt: slot1, procedureIds: [] });
    await createAppointment({ patientId, doctorId, startsAt: slot2, procedureIds: [] });

    await expect(rescheduleAppointment(appt1.id, slot2)).rejects.toBeInstanceOf(
      DoubleBookingError
    );
  });
});

describe("addProcedureToAppointment (M:N vazba)", () => {
  it("přiřadí provedený výkon k návštěvě", async () => {
    const slot = nextWeekdayAt(1, "14:00");
    const appt = await createAppointment({ patientId, doctorId, startsAt: slot, procedureIds: [] });

    const linked = await addProcedureToAppointment(appt.id, procedureId, "Standardní kontrola");
    expect(linked.procedureId).toBe(procedureId);
    expect(linked.appointmentId).toBe(appt.id);
    expect(linked.note).toBe("Standardní kontrola");
  });
});

describe("findFreeSlots s reálnou DB", () => {
  it("vrátí volné sloty a nezahrne obsazený termín", async () => {
    const mondayDate = nextWeekdayAt(1, "00:00");
    const bookedSlot = nextWeekdayAt(1, "08:30");

    await createAppointment({ patientId, doctorId, startsAt: bookedSlot, procedureIds: [] });

    const slots = await findFreeSlots(doctorId, mondayDate);
    const times = slots.map((s) => s.formattedTime);

    expect(times).toContain("08:00");
    expect(times).not.toContain("08:30");
    expect(times).toContain("09:00");
  });
});

function nextWeekdayAt(jsDayOfWeek: number, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setDate(d.getDate() + ((7 + jsDayOfWeek - d.getDay()) % 7 || 7));
  d.setHours(h, m, 0, 0);
  return d;
}
