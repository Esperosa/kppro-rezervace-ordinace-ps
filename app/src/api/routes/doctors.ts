import { Router } from "express";
import { z } from "zod";
import {
  listDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  DoctorNotFoundError,
  InvalidOfficeHoursError,
} from "../../application/doctorService.js";

export const doctorsRouter = Router();

const officeHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Čas musí být ve tvaru HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Čas musí být ve tvaru HH:MM"),
});

const createDoctorSchema = z.object({
  firstName: z.string().min(1, "Jméno je povinné"),
  lastName: z.string().min(1, "Příjmení je povinné"),
  specialty: z.string().min(1, "Specializace je povinná"),
  officeHours: z.array(officeHoursSchema).optional(),
});

const updateDoctorSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  specialty: z.string().min(1).optional(),
  officeHours: z.array(officeHoursSchema).optional(),
});

// Seznam lékařů (volitelně filtrováno podle specializace)
doctorsRouter.get("/", async (req, res) => {
  const specialty = typeof req.query.specialty === "string" ? req.query.specialty : undefined;
  const doctors = await listDoctors(specialty);
  res.json(doctors);
});

// Detail lékaře včetně ordinačních hodin
doctorsRouter.get("/:id", async (req, res) => {
  try {
    const doctor = await getDoctorById(req.params.id);
    res.json(doctor);
  } catch (err) {
    if (err instanceof DoctorNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    throw err;
  }
});

// Vytvoření lékaře
doctorsRouter.post("/", async (req, res) => {
  const parsed = createDoctorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const doctor = await createDoctor(parsed.data);
    res.status(201).json(doctor);
  } catch (err) {
    if (err instanceof InvalidOfficeHoursError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

// Úprava lékaře a jeho ordinačních hodin
doctorsRouter.put("/:id", async (req, res) => {
  const parsed = updateDoctorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const updated = await updateDoctor(req.params.id, parsed.data);
    res.json(updated);
  } catch (err) {
    if (err instanceof DoctorNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof InvalidOfficeHoursError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});
