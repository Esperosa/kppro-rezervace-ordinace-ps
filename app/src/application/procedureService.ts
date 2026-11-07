import { prisma } from "../infrastructure/db/prisma.js";

export class ProcedureNotFoundError extends Error {
  constructor(id: string) {
    super(`Lékařský výkon s ID ${id} nebyl nalezen.`);
    this.name = "ProcedureNotFoundError";
  }
}

export class DuplicateProcedureCodeError extends Error {
  constructor(code: string) {
    super(`Výkon s kódem '${code}' již existuje.`);
    this.name = "DuplicateProcedureCodeError";
  }
}

export interface CreateProcedureInput {
  name: string;
  code: string;
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}

export async function listProcedures() {
  return prisma.procedure.findMany({
    orderBy: { code: "asc" },
  });
}

export async function getProcedureById(id: string) {
  const procedure = await prisma.procedure.findUnique({
    where: { id },
  });

  if (!procedure) {
    throw new ProcedureNotFoundError(id);
  }

  return procedure;
}

export async function createProcedure(input: CreateProcedureInput) {
  try {
    return await prisma.procedure.create({
      data: {
        name: input.name.trim(),
        code: input.code.trim().toUpperCase(),
      },
    });
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      throw new DuplicateProcedureCodeError(input.code);
    }
    throw err;
  }
}
