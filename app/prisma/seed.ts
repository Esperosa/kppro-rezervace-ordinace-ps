import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const doctor = await prisma.doctor.create({
    data: {
      firstName: "Petr",
      lastName: "Novák",
      specialty: "Praktický lékař",
      officeHours: {
        create: [
          { dayOfWeek: 0, startTime: "08:00", endTime: "16:00" }, // pondělí
          { dayOfWeek: 2, startTime: "08:00", endTime: "12:00" }, // středa
        ],
      },
    },
  });

  const patient = await prisma.patient.create({
    data: { firstName: "Jana", lastName: "Svobodová", email: "jana.svobodova@example.com" },
  });

  const procedure = await prisma.procedure.create({
    data: { name: "Preventivní prohlídka", code: "PREV01" },
  });

  console.log({ doctor, patient, procedure });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
