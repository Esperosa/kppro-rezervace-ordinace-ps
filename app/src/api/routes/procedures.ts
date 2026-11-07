import { Router } from "express";
import { z } from "zod";
import {
  listProcedures,
  getProcedureById,
  createProcedure,
  ProcedureNotFoundError,
  DuplicateProcedureCodeError,
} from "../../application/procedureService.js";

export const proceduresRouter = Router();

const createProcedureSchema = z.object({
  name: z.string().min(1, "Název výkonu je povinný"),
  code: z.string().min(1, "Kód výkonu je povinný"),
});

// Seznam lékařských výkonů
proceduresRouter.get("/", async (_req, res) => {
  const procedures = await listProcedures();
  res.json(procedures);
});

// Detail výkonu
proceduresRouter.get("/:id", async (req, res) => {
  try {
    const procedure = await getProcedureById(req.params.id);
    res.json(procedure);
  } catch (err) {
    if (err instanceof ProcedureNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    throw err;
  }
});

// Vytvoření nového výkonu
proceduresRouter.post("/", async (req, res) => {
  const parsed = createProcedureSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const procedure = await createProcedure(parsed.data);
    res.status(201).json(procedure);
  } catch (err) {
    if (err instanceof DuplicateProcedureCodeError) {
      return res.status(409).json({ error: err.message });
    }
    throw err;
  }
});
