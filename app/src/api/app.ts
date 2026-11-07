import express from "express";
import { appointmentsRouter } from "./routes/appointments.js";
import { doctorsRouter } from "./routes/doctors.js";
import { patientsRouter } from "./routes/patients.js";
import { proceduresRouter } from "./routes/procedures.js";

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/appointments", appointmentsRouter);
  app.use("/doctors", doctorsRouter);
  app.use("/patients", patientsRouter);
  app.use("/procedures", proceduresRouter);

  return app;
}
