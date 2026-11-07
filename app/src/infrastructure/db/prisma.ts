import { PrismaClient } from "@prisma/client";

// Jediná instance Prisma klienta pro celou aplikaci (databázová vrstva).
// Nic nad touto vrstvou nesmí importovat @prisma/client přímo - jen přes
// services v application/, jinak se poruší pravidlo "závislosti jen jedním
// směrem" z povinného minima.
export const prisma = new PrismaClient();
