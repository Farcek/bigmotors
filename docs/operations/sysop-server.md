# Sysop server ажиллуулах

- Огноо: 2026-09-10
- Төлөв: Backend суурь initialize хийсэн; production auth/DB бэлэн биш
- Package: `@bigmotors/sysop-server`, байршил `sysop/server`
- Холбоотой баримт: [ADR 0020](../adr/0020-initialize-sysop-server-tooling.md), [Userly шаардлага](userly-authentication.md)

## Шаардлага

- Node.js `>=24.11.0 <25`; шалгасан орчин `24.14.0`.
- pnpm `11.19.0`, root `packageManager`-аар тогтоосон.
- Root `pnpm-workspace.yaml` бүх package-г хамарна. Backend нь `@bigmotors/core`, `@bigmotors/db`, `@bigmotors/sysop-dti`-г `workspace:*` dependency болгон ашиглана.
- Registry package болон native build dependency суулгах network access; нууц credential-г repository-д оруулахгүй.
- `@napp/di` 1.0.10: `createContainer({ env })` нь `TKN_ENV`, `ConfigSysop`, `diDBCoreProviders()`, `diDBServiceProviders()`-ийг бүртгэнэ. DB provider-ууд resolve хийх хүртэл pool үүсгэхгүй; health/startup нь DB credential шаардахгүй.
- `@napp/dti-core` 6.1.2, `@napp/dti-server` 6.1.2, `zod` 4.4.3 ашиглана. DTI meta нь container дамжуулна; өнгөний CRUD handler-ууд `ColorService` ашиглаж, Date талбаруудыг ISO string болгон хөрвүүлнэ. Userly/ACL-ийг хэрэглэгчийн шийдвэрээр түр алгассан.

## Командууд

Repository root `bm-website`-оос:

```powershell
pnpm install --frozen-lockfile
pnpm typecheck:server
pnpm test:server
pnpm build:server
pnpm dev:server
```

`dev:server` нь watcher-тай үргэлжлэн ажиллана; `Ctrl+C`-ээр зогсооно. Build хийсэн хувилбарыг ажиллуулахдаа dev процессыг зогсоогоод:

```powershell
pnpm start:server
```

Root-ийн `dev:server`, `typecheck:server`, `test:server` нь workspace dependency-уудыг эхэлж build хийнэ. `build:server` нь dependency болон server bundle үүсгэнэ; typecheck болон test тусдаа. Production entry нь `sysop/server/dist/main.mjs`. Drizzle-ийн ашигладаггүй driver-уудын declaration-ийг шалгахгүй байхаар `db` package-тай ижил `skipLibCheck` ашиглана; өөрийн TypeScript кодын strict шалгалт хэвээр.

## Орчны тохиргоо

| Хувьсагч | Default | Дүрэм |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Хоосон биш; өөр хостоор сонсох бол илэрхий тохируулна |
| `PORT` | `4000` | Бүхэл тоо, 1–65535 |
| `DATABASE_URL` | Байхгүй | DB provider resolve хийх үед шаардлагатай; migration-ийн `DB_CONNECTION_STRING`-ээс тусдаа |
| `DATABASE_POOL_MIN` | `0` | Сөрөг биш safe integer, max-аас ихгүй |
| `DATABASE_POOL_MAX` | `10` | Эерэг safe integer |

`sysop/server/.env.example` нь жишээ. Dev/start команд `sysop/server/.env` байвал уншина; байхгүй бол default/env утгаар ажиллана. Process environment нь `.env`-ээс давуу. `.env` файлууд Git-д орохгүй.

4000 порт ашиглагдаж байвал өөрийн серверийг өөр порт дээр эхлүүлнэ; өмнөх процессыг автоматаар зогсоохгүй:

```powershell
$env:PORT = '4001'
pnpm dev:server
```

Энэ машинд Node registry TLS trust алдаа гарвал Windows-ийн итгэмжлэгдсэн CA-г ашиглуулж install хийж болно:

```powershell
$env:NODE_OPTIONS = "$env:NODE_OPTIONS --use-system-ca".Trim()
pnpm install --frozen-lockfile
```

SSL verification-г унтраахгүй. Энэ нь зөвхөн тухайн shell-ийн тохиргоо; repository эсвэл global npm тохиргоог өөрчлөхгүй.

## Endpoint ба аюулгүй зааг

| Endpoint | Response | Утга |
| --- | --- | --- |
| `GET /health` | `200`, `status: ok` | Зөвхөн process liveness; DB/Userly readiness биш |
| `GET /api/colors` | `200` | Жагсаалт; `limit`, `offset`, `isActive` query |
| `POST /api/colors` | `200` | Өнгө үүсгэж entity буцаана |
| `PATCH /api/colors/:id` | `200` | Өгсөн талбаруудыг засаж entity буцаана |
| `DELETE /api/colors/:id` | `200` | Устгасан entity буцаана |
| Бусад route | `404`, `NOT_FOUND` | JSON алдаа |

Өнгөний DTI response нь `{ success: true, data }`, алдаа нь `{ success: false, code, message }`. Validation алдаа `400`, олдоогүй өнгө `404`, нэрийн давхардал болон ашиглагдаж буй өнгийг устгах үед `409`; DB/internal алдаа `500 UNKNOWN_ERROR`. `@napp/error`-ийн 4xx алдааг status/code/message-ээр дамжуулж, stack/cause/details-ийг гаргахгүй. Бүртгэлгүй route зэрэг Express алдаа `{ error: { code, message } }` хэлбэртэй. `x-powered-by` унтраалттай, response `no-store`, `nosniff`; proxy trust анх унтраалттай.

Userly token validation, permission/scope, login endpoint, CORS policy, upload болон бүтээгдэхүүний CRUD **хэрэгжээгүй**. Userly/ACL-ийг хэрэглэгч түр алгассан: `/api` deny gate идэвхгүй, DTI auth нь түр `admin` context буцаана. Энэ нь баталгаажсан хэрэглэгч биш; API token шаардахгүй. **Зөвхөн хөгжүүлэлтэд ашиглана, production болон нийтэд нээлттэй орчинд байршуулахгүй.** Userly/ACL хамгаалалтыг дараа хэрэгжүүлнэ. Startup migration ажиллуулахгүй. `pool.end()`-ийг shutdown-д холбох ажил үлдсэн; container-ийн `destroy()` дангаараа `pg.Pool`-ийг хаадаггүй.

`SIGINT`/`SIGTERM` үед шинэ холболт авахаа зогсоож, хүсэлт дуусахыг 10 секунд хүлээнэ. Хугацаа хэтэрвэл холболтуудыг хааж алдааны exit code-той гарна. Порт ашиглагдаж байвал `EADDRINUSE`-тай зогсоно.

## Шалгалт

`test/colors-http.test.ts` нь бодит HTTP хүсэлтээр DTI route, DI module, ColorService болон тусгаарласан PGlite DB-г хамтад нь шалгана. Одоо байгаа migration-уудыг зөвхөн санах ойн DB-д хэрэгжүүлнэ; шинэ migration үүсгэхгүй, local/production DB-д хүрэхгүй. CRUD, ISO timestamp, pagination/filter, validation, 404/409 болон safe 500 response-ийг хамарна. Бусад тестүүд health/404, config validation, DB/service module resolve болон lazy DB үүсгэлтийг шалгана. Тестүүд HTTP server, container, DB/pool-оо хаана. Бодит Userly/PostgreSQL network integration болон production load тест хийгдээгүй.
