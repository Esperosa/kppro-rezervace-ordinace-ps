import { Router } from "express";
import { z } from "zod";
import {
  createAppointment,
  getAppointmentById,
  listAppointments,
  cancelAppointment,
  rescheduleAppointment,
  addProcedureToAppointment,
  findFreeSlots,
  DoubleBookingError,
  OutsideOfficeHoursError,
  AppointmentNotFoundError,
  AppointmentAlreadyCancelledError,
} from "../../application/appointmentService.js";

export const appointmentsRouter = Router();

const createSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  startsAt: z.coerce.date(),
  procedureIds: z.array(z.string().uuid()).default([]),
});

const rescheduleSchema = z.object({
  startsAt: z.coerce.date(),
});

const addProcedureSchema = z.object({
  procedureId: z.string().uuid(),
  note: z.string().optional(),
});

// Vytvoření rezervace
appointmentsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const appointment = await createAppointment(parsed.data);
    res.status(201).json(appointment);
  } catch (err) {
    if (
      err instanceof DoubleBookingError ||
      err instanceof OutsideOfficeHoursError
    ) {
      return res.status(409).json({ error: err.message });
    }
    throw err;
  }
});

// Seznam rezervací s možností filtrování
appointmentsRouter.get("/", async (req, res) => {
  const doctorId = typeof req.query.doctorId === "string" ? req.query.doctorId : undefined;
  const patientId = typeof req.query.patientId === "string" ? req.query.patientId : undefined;
  const status =
    req.query.status === "SCHEDULED" ||
    req.query.status === "COMPLETED" ||
    req.query.status === "CANCELLED"
      ? req.query.status
      : undefined;

  const appointments = await listAppointments({ doctorId, patientId, status });
  res.json(appointments);
});

// Volné termíny lékaře pro konkrétní den
appointmentsRouter.get("/doctor/:doctorId/day/:date", async (req, res) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(req.params.date);
  if (!match) {
    return res.status(400).json({ error: "date musí být ve tvaru YYYY-MM-DD" });
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  const slotDuration = req.query.slotDuration
    ? Number(req.query.slotDuration)
    : 30;

  try {
    const slots = await findFreeSlots(req.params.doctorId, date, slotDuration);
    res.json(slots);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Detail rezervace
appointmentsRouter.get("/:id", async (req, res) => {
  try {
    const appointment = await getAppointmentById(req.params.id);
    res.json(appointment);
  } catch (err) {
    if (err instanceof AppointmentNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    throw err;
  }
});

// Zrušení rezervace (přes DELETE i POST /:id/cancel)
appointmentsRouter.delete("/:id", async (req, res) => {
  try {
    const cancelled = await cancelAppointment(req.params.id);
    res.json(cancelled);
  } catch (err) {
    if (err instanceof AppointmentNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof AppointmentAlreadyCancelledError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

appointmentsRouter.post("/:id/cancel", async (req, res) => {
  try {
    const cancelled = await cancelAppointment(req.params.id);
    res.json(cancelled);
  } catch (err) {
    if (err instanceof AppointmentNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof AppointmentAlreadyCancelledError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

// Přesun rezervace na jiný termín
appointmentsRouter.post("/:id/reschedule", async (req, res) => {
  const parsed = rescheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const rescheduled = await rescheduleAppointment(req.params.id, parsed.data.startsAt);
    res.json(rescheduled);
  } catch (err) {
    if (err instanceof AppointmentNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof AppointmentAlreadyCancelledError) {
      return res.status(400).json({ error: err.message });
    }
    if (
      err instanceof DoubleBookingError ||
      err instanceof OutsideOfficeHoursError
    ) {
      return res.status(409).json({ error: err.message });
    }
    throw err;
  }
});

// Evidence provedeného výkonu u návštěvy (M:N vazba)
appointmentsRouter.post("/:id/procedures", async (req, res) => {
  const parsed = addProcedureSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const link = await addProcedureToAppointment(
      req.params.id,
      parsed.data.procedureId,
      parsed.data.note
    );
    res.status(201).json(link);
  } catch (err) {
    if (err instanceof AppointmentNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    throw err;
  }
});
