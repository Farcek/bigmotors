# Sysop server ажиллуулах

- Огноо: 2026-09-10
- Төлөв: Backend суурь initialize хийсэн; production auth/DB бэлэн биш
- Package: `@bigmotors/sysop-server`, байршил `sysop/server`
- Холбоотой баримт: [ADR 0020](../adr/0020-initialize-sysop-server-tooling.md), [Userly шаардлага](userly-authentication.md)

## Шаардлага

- Node.js `>=24.11.0 <25`; шалгасан орчин `24.14.0`.
- pnpm `11.19.0`, root `packageManager`-аар тогтоосон.
- Root `pnpm-workspace.yaml` бүх зургаан package-г хамарна. Одоогоор backend бусад workspace package-г dependency болгон импортлохгүй.
- Registry package болон native build dependency суулгах network access; нууц credential-г repository-д оруулахгүй.

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

`pnpm build:server` зөвхөн bundle үүсгэнэ; typecheck болон test тусдаа. Production entry нь `sysop/server/dist/main.mjs`.

## Орчны тохиргоо

| Хувьсагч | Default | Дүрэм |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Хоосон биш; өөр хостоор сонсох бол илэрхий тохируулна |
| `PORT` | `4000` | Бүхэл тоо, 1–65535 |

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

Userly token validation, permission/scope, login endpoint, DTI business action, DB холболт, migration, CORS policy, upload болон бүтээгдэхүүний CRUD **хэрэгжээгүй**. `/api`-ийн deny gate-г зөвхөн батлагдсан Userly/ACL хамгаалалттай хамт солино; auth bypass болон demo account байхгүй.

`SIGINT`/`SIGTERM` үед шинэ холболт авахаа зогсоож, хүсэлт дуусахыг 10 секунд хүлээнэ. Хугацаа хэтэрвэл холболтуудыг хааж алдааны exit code-той гарна. Порт ашиглагдаж байвал `EADDRINUSE`-тай зогсоно.

## Шалгалт

Initialize хийхдээ 8 автомат тест, typecheck, build, frozen/offline install, build/dev HTTP smoke болон SIGINT shutdown шалгасан. Тестүүд health/404, бүх admin method-ийн fail-closed, safe error response болон config хязгаарыг хамарна. Бодит Userly/DB integration болон production load тест хийгдээгүй.
