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
- `@napp/dti-core` 6.1.2, `@napp/dti-server` 6.1.2, `zod` 4.4.3 ашиглана. DTI meta нь container дамжуулна; өнгөний list handler `ColorService` ашиглаж, Date талбаруудыг ISO string болгон хөрвүүлнэ. Userly/ACL integration хараахан дуусаагүй.

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
| `/api`, `/api/*` бүх method | `503`, `AUTH_ACL_UNAVAILABLE` | Admin API initialize хийгдээгүй тул fail-closed |
| Бусад route | `404`, `NOT_FOUND` | JSON алдаа |

`@napp/error` ашиглана; stack/cause/details-ийг HTTP response-д serialization хийхгүй. Суурийн `{ error: { code, message } }` хэлбэр нь эцсийн DTI contract биш; DTI integration үед TASK-05-тай уялдуулна. `x-powered-by` унтраалттай, response `no-store`, `nosniff`; proxy trust анх унтраалттай.

Userly token validation, permission/scope, login endpoint, CORS policy, upload болон бүтээгдэхүүний CRUD **хэрэгжээгүй**. Өнгөний list handler бүртгэлтэй боловч `/api` deny gate-ийн ард байна; DTI auth өөрөө мөн `503` буцаана. Хамгаалалтыг зөвхөн батлагдсан Userly/ACL хэрэгжүүлэлтээр солино; auth bypass болон demo account байхгүй. Startup migration ажиллуулахгүй. DB pool ашиглаж эхлэх integration үед `pool.end()`-ийг shutdown-д холбох шаардлагатай; container-ийн `destroy()` дангаараа `pg.Pool`-ийг хаадаггүй.

`SIGINT`/`SIGTERM` үед шинэ холболт авахаа зогсоож, хүсэлт дуусахыг 10 секунд хүлээнэ. Хугацаа хэтэрвэл холболтуудыг хааж алдааны exit code-той гарна. Порт ашиглагдаж байвал `EADDRINUSE`-тай зогсоно.

## Шалгалт

Тестүүд health/404, бүх admin method болон DTI router-ийн fail-closed, safe error response, DI-ээр config validation, DB/service module resolve болон lazy DB үүсгэлтийг хамарна. Тестүүд pool-оо өөрсдөө хаана. Бодит Userly/DB integration болон production load тест хийгдээгүй.
