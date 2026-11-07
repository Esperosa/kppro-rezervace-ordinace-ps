import { Router } from "express";
import { z } from "zod";
import {
  listPatients,
  getPatientById,
  createPatient,
  updatePatient,
  PatientNotFoundError,
  DuplicateEmailError,
} from "../../application/patientService.js";

export const patientsRouter = Router();

const createPatientSchema = z.object({
  firstName: z.string().min(1, "Jméno je povinné"),
  lastName: z.string().min(1, "Příjmení je povinné"),
  email: z.string().email("Neplatný formát e-mailu"),
  phone: z.string().optional(),
});

const updatePatientSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email("Neplatný formát e-mailu").optional(),
  phone: z.string().optional(),
});

// Seznam pacientů (volitelně vyhledávání jménem nebo e-mailem)
patientsRouter.get("/", async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const patients = await listPatients(search);
  res.json(patients);
});

// Detail pacienta včetně historie návštěv
patientsRouter.get("/:id", async (req, res) => {
  try {
    const patient = await getPatientById(req.params.id);
    res.json(patient);
  } catch (err) {
    if (err instanceof PatientNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    throw err;
  }
});

// Registrace nového pacienta
patientsRouter.post("/", async (req, res) => {
  const parsed = createPatientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const patient = await createPatient(parsed.data);
    res.status(201).json(patient);
  } catch (err) {
    if (err instanceof DuplicateEmailError) {
      return res.status(409).json({ error: err.message });
    }
    throw err;
  }
});

// Úprava údajů pacienta
patientsRouter.put("/:id", async (req, res) => {
  const parsed = updatePatientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const updated = await updatePatient(req.params.id, parsed.data);
    res.json(updated);
  } catch (err) {
    if (err instanceof PatientNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof DuplicateEmailError) {
      return res.status(409).json({ error: err.message });
    }
    throw err;
  }
});
