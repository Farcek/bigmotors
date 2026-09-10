# BigMotors sysop server

`@bigmotors/sysop-server`: admin backend-ийн Express + TypeScript суурь.

Repository root-оос `pnpm dev:server` ажиллуулна. Анхны хаяг `http://127.0.0.1:4000`; process health нь `/health` байна.

Ажиллуулах, build, тест болон хэрэгжээгүй хэсгийн заагийг [ашиглалтын заавар](../../docs/operations/sysop-server.md)-аас харна. Userly/ACL, DTI business action болон DB холболт хараахан хэрэгжээгүй; `/api/*` түр `503 AUTH_ACL_UNAVAILABLE` буцаана.
