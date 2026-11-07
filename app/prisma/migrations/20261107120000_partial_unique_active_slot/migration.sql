-- Oprava: původní unikátní index (doctorId, startsAt) platil pro VŠECHNY
-- rezervace včetně zrušených, takže po zrušení rezervace nešlo termín znovu
-- obsadit (INSERT narazil na starý CANCELLED záznam se stejným termínem).
-- Nahrazeno parciálním unikátním indexem, který se vztahuje jen na aktivní
-- (nezrušené) rezervace.

DROP INDEX "Appointment_doctorId_startsAt_key";

CREATE UNIQUE INDEX "Appointment_doctorId_startsAt_active_key"
  ON "Appointment"("doctorId", "startsAt")
  WHERE "status" <> 'CANCELLED';

CREATE INDEX "Appointment_doctorId_startsAt_idx"
  ON "Appointment"("doctorId", "startsAt");
