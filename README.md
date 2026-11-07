# Rezervace v ordinaci — KPPRO semestrální projekt

Zadání A ze `ZADANI-plny-text.md`. Třívrstvá architektura (API → aplikační logika → databáze),
TypeScript/Node.js + Express + Prisma + PostgreSQL, vše v Dockeru.

## Spuštění

```bash
cp .env.example .env
docker compose up -d
```

Aplikace běží na `http://localhost:3000` (viz `.env` → `APP_PORT`). Databázové migrace se
spouští automaticky při startu kontejneru `app` (`prisma migrate deploy` v `Dockerfile`).

- Health check: `GET http://localhost:3000/health`
- Podrobná technická dokumentace: [`docs/DOKUMENTACE.md`](docs/DOKUMENTACE.md)

## Stav projektu (Povinné minimum splněno)

- [x] **Tři vrstvy s jednosměrnými závislostmi:**
  - `src/api` (Express routery, Zod validace, mapování chyb na HTTP statusy)
  - `src/application` (doménové služby: `appointmentService`, `doctorService`, `patientService`, `procedureService`, `dateUtils`)
  - `src/infrastructure` (Prisma klient, žádný SQL/Prisma import v API vrstvě)
- [x] **Relační datový model (PostgreSQL + Prisma):**
  - 5 entit (`Patient`, `Doctor`, `OfficeHours`, `Appointment`, `Procedure`)
  - Vazba M:N `Appointment` ↔ `Procedure` přes `AppointmentProcedure`
  - Unikátní index `(doctorId, startsAt)` pro absolutní prevenci dvojitých rezervací
  - Verzované SQL migrace (`app/prisma/migrations/`)
- [x] **Kompletní CRUD a rezervační operace:**
  - Lékaři: `GET /doctors`, `GET /doctors/:id`, `POST /doctors`, `PUT /doctors/:id` (včetně ordinačních hodin)
  - Pacienti: `GET /patients`, `GET /patients/:id`, `POST /patients`, `PUT /patients/:id`
  - Výkony: `GET /procedures`, `GET /procedures/:id`, `POST /procedures`
  - Rezervace: `POST /appointments`, `GET /appointments`, `GET /appointments/:id`
  - Zrušení rezervace: `DELETE /appointments/:id` nebo `POST /appointments/:id/cancel`
  - Přesun rezervace: `POST /appointments/:id/reschedule`
  - Evidence výkonů u návštěvy: `POST /appointments/:id/procedures`
- [x] **Reálný výpočet volných termínů:**
  - `GET /appointments/doctor/:doctorId/day/:date` — generuje dostupné sloty z ordinačních hodin lékaře pro daný den a odečítá existující platné rezervace (podpora volitelné délky slotu `?slotDuration=30`).
- [x] **Automatizované testy (Vitest):**
  - Jednotkové testy (`tests/dateUtils.test.ts`, `tests/slotCalculation.test.ts`, `tests/validation.test.ts`) pokrývají výpočet slotů, dělenou pracovní dobu, okrajové stavy i validace bez nutnosti běžící DB (`npm run test:unit`).
  - Integrační testy (`tests/appointmentService.test.ts`, `tests/patientDoctorProcedure.test.ts`) ověřují operace proti PostgreSQL (`npm test`).
- [x] **Docker Compose & Dockerfile:**
  - PostgreSQL 16.4 s healthcheckem + Node.js 22-slim s instalací OpenSSL a `package.json` v runtime vrstvě.
  - Spuštění jediným příkazem `docker compose up -d`.
- [x] **Technická dokumentace:**
  - Kompletní dokumentace v [`docs/DOKUMENTACE.md`](docs/DOKUMENTACE.md) dle oddílu 5 zadání (ERD diagram, 3 vrstvy, technologie, návod).


## Rychlý přehled API

| Metoda | Endpoint | Popis |
|---|---|---|
| `GET` | `/health` | Healthcheck stavu služby |
| `GET` | `/doctors` | Seznam lékařů (volitelně `?specialty=`) |
| `POST` | `/doctors` | Vytvoření lékaře a ordinačních hodin |
| `PUT` | `/doctors/:id` | Aktualizace lékaře a ordinačních hodin |
| `GET` | `/patients` | Seznam pacientů (volitelně `?search=`) |
| `POST` | `/patients` | Registrace pacienta |
| `GET` | `/procedures` | Seznam lékařských výkonů |
| `POST` | `/procedures` | Nový výkon (kód, název) |
| `GET` | `/appointments/doctor/:doctorId/day/:date` | Volné termíny lékaře pro den (YYYY-MM-DD) |
| `POST` | `/appointments` | Vytvoření nové rezervace |
| `DELETE` | `/appointments/:id` | Zrušení rezervace (uvolní termín) |
| `POST` | `/appointments/:id/reschedule` | Přesun rezervace na jiný termín |
| `POST` | `/appointments/:id/procedures` | Záznam provedeného výkonu u návštěvy (M:N) |

## Struktura projektu

```
app/
  src/
    api/              - Express routery (prezentační vrstva)
      routes/         - appointments, doctors, patients, procedures
      app.ts          - sestavení Express aplikace
    application/      - business logika a doménové služby
      appointmentService.ts
      doctorService.ts
      patientService.ts
      procedureService.ts
      dateUtils.ts    - čisté výpočty volných slotů a formátování času
    infrastructure/   - databázová vrstva
      db/prisma.ts    - jediná instance PrismaClient
  prisma/
    schema.prisma     - datový model (5 entit + M:N vazba)
    migrations/       - verzované SQL migrace
    seed.ts           - vzorová data
  tests/              - jednotkové (unit) a integrační testy
docker-compose.yml     - orchestrace PostgreSQL + Node.js
.env.example           - vzor konfigurace prostředí
docs/                  - DOKUMENTACE.md a podklady pro odevzdání
```
