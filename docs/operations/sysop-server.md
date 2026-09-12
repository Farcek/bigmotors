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
| `DATABASE_URL` | Байхгүй | DB provider resolve хийх үед шаардлагатай; migration мөн ижил нэр ашиглах ч production credential/эрх тусдаа |
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

Өнгө/салбараас гадна [6 энгийн лавлах](db-schema.md#flat-reference-services), [4 эцэгтэй лавлах](db-schema.md#parent-reference-services) CRUD endpoint-тэй. Тус бүр base path дээр GET/POST, `/:id` дээр PATCH/DELETE ашиглана; бүх амжилттай response `200`. `references-http.test.ts`, `parent-references-http.test.ts` нь CRUD, query, validation, FK болон error response-ийг шалгана. Эцэггүй/идэвхгүй лавлахаар шинээр үүсгэхийг хориглоно; category нь эцэггүй үндсэн ангилал байж болно. PATCH-аар эцэг солихгүй.

| Endpoint | Response | Утга |
| --- | --- | --- |
| `GET /health` | `200`, `status: ok` | Зөвхөн process liveness; DB/Userly readiness биш |
| `GET /api/colors` | `200` | Жагсаалт; `limit`, `offset`, `isActive` query |
| `POST /api/colors` | `200` | Өнгө үүсгэж entity буцаана |
| `PATCH /api/colors/:id` | `200` | Өгсөн талбаруудыг засаж entity буцаана |
| `DELETE /api/colors/:id` | `200` | Устгасан entity буцаана |
| `GET /api/branches` | `200` | Компанийн салбарын жагсаалт; `limit`, `offset`, `isActive` query |
| `POST /api/branches` | `200` | Салбар үүсгэж entity буцаана |
| `PATCH /api/branches/:id` | `200` | Өгсөн талбаруудыг засаж entity буцаана |
| `DELETE /api/branches/:id` | `200` | Устгасан entity буцаана; бүтээгдэхүүнд ашиглагдаж байвал `409 BRANCH_IN_USE` |
| `/api/vehicles` болон `/:id` action-ууд | `200` | Доорх автомашины API; DTI response |
| `POST /api/files/upload` | `201` | Multipart file upload; production auth холбогдох хүртэл 503 |
| `GET /files/:id/:originalName` | `200` | Public file read; ACL шалгахгүй |
| Бусад route | `404`, `NOT_FOUND` | JSON алдаа |

Өнгө, салбарын DTI response нь `{ success: true, data }`, алдаа нь `{ success: false, code, message }`. Validation алдаа `400`, олдоогүй бүртгэл `404`, нэрийн давхардал болон ашиглагдаж буй бүртгэлийг устгах үед `409`. Одоогийн mapping нь `NappError`-ийн code/message-ийг хадгална: DB алдаа `500 COLOR_STORAGE_ERROR` эсвэл `500 BRANCH_STORAGE_ERROR`; бусад unknown алдаа `500 UNKNOWN_ERROR`. Stack/cause/details-ийг дамжуулахгүй. Бүртгэлгүй route зэрэг Express алдаа `{ error: { code, message } }` хэлбэртэй. `x-powered-by` унтраалттай, response `no-store`, `nosniff`; proxy trust анх унтраалттай.

Userly token validation, permission/scope, login endpoint, CORS policy болон сэлбэг/дугуйн бүтээгдэхүүний CRUD **хэрэгжээгүй**. File upload/read болон автомашины API хэрэгжсэн. Userly/ACL-ийг хэрэглэгч түр алгассан: `/api` deny gate идэвхгүй, DTI auth нь түр `admin` context буцаана. Энэ нь баталгаажсан хэрэглэгч биш; API token шаардахгүй. **Зөвхөн хөгжүүлэлтэд ашиглана, production болон нийтэд нээлттэй орчинд байршуулахгүй.** Userly/ACL хамгаалалтыг дараа хэрэгжүүлнэ. Startup migration ажиллуулахгүй. `pool.end()`-ийг shutdown-д холбох ажил үлдсэн; container-ийн `destroy()` дангаараа `pg.Pool`-ийг хаадаггүй.

`SIGINT`/`SIGTERM` үед шинэ холболт авахаа зогсоож, хүсэлт дуусахыг 10 секунд хүлээнэ. Хугацаа хэтэрвэл холболтуудыг хааж алдааны exit code-той гарна. Порт ашиглагдаж байвал `EADDRINUSE`-тай зогсоно.

## Автомашины API

2026-09-12: [src/api/vehicles.ts](../../sysop/server/src/api/vehicles.ts) нь [Vehicles DTI](sysop-dti.md#автомашин)-г DI-ээр [VehicleService](../../packages/db/src/service/vehicle.ts)-тэй холбоно. Бүх амжилттай response 200 `{ success: true, data }`; list data нь `{ items, total, limit, offset }`, бусад нь Entity. Огноонууд ISO string; дотоод file_path/usage serialize хийхгүй.

| Endpoint | Үйлдэл |
| --- | --- |
| GET `/api/vehicles` | Admin хайлт, шүүлт, эрэмбэ, pagination |
| GET `/api/vehicles/:id` | Зураг/тоноглолтой дэлгэрэнгүй |
| POST `/api/vehicles` | Гарчигтай ноорог үүсгэх |
| PATCH `/api/vehicles/:id` | Өгсөн талбар, gallery/features-ийг шинэчлэх |
| POST `/api/vehicles/:id/publish` | draft/hidden -> published |
| POST `/api/vehicles/:id/hide` | published -> hidden |
| POST `/api/vehicles/:id/archive` | draft/hidden/published -> archived |
| POST `/api/vehicles/:id/restore` | archived -> hidden |

DELETE болон publicationStatus-ийг PATCH-аар солих боломжгүй. Зөвшөөрөгдөөгүй/давтан төлөв шилжилт 409. Sold/arrival төлөвийг PATCH-аар засаж болох ч нийтлэлийн төлөвийг автоматаар өөрчлөхгүй. Admin жагсаалт draft/hidden/archived/sold-ийг хамарна; public API биш.

### Transaction Ба Хадгалалт

- DB package нь DTI/Express импортлохгүй. `vehicle-input.ts` DB service-ийн оролтыг Zod/core enum/limits-ээр давхар шалгана; DTI нь HTTP transport-ийн validation-ийг хариуцна.
- Mutation эхлэхэд product мөрийг FOR UPDATE түгжинэ; эцсийн merge утгад тоон, нөхцөлтэй нийтлэх болон лавлахын шаардлагыг шалгана. Parent өөрчлөгдөхөд орхигдсон, тохирохгүй child сонголтыг цэвэрлэнэ; илэрхий өгсөн буруу child-ийг 400 буцаана.
- Лавлах мөрүүдийг FOR SHARE түгжиж шалгана. Өмнөх идэвхгүй сонголт хадгалагдана; шинээр сонгох model/variant-ийн ancestor идэвхтэй байх ёстой. Хассан идэвхгүй тоноглолыг дахин нэмэх нь шинэ сонголт тул хориглоно.
- Product, vehicle, gallery, feature links, usage нь нэг transaction. Gallery upsert нь хадгалагдсан file холбоосын ID-г өөрчлөхгүй. Arrays өгвөл орлоно; орхивол хадгална. Үндсэн/item нь gallery-д багтах албагүй.
- Хуучин/шинэ file ID-уудыг UUID дарааллаар FOR UPDATE түгжиж, тухайн product UUID-г atomic array_remove/array_append-аар нэмэх/хасна. Өөр ашиглагчийн key хэвээр; нэг product main/item/gallery-д зэрэг ашиглахад нэг л key байна. Archive/hide нь холбоос болон usage-г арилгахгүй.
- Create/update/publish үед handler-ийн `verifyFiles` callback нь FILES_ROOT болон DB file_path-аар эх файл байгаа, storage хүрээнд regular file эсэхийг шалгана. Public read-тэй ижил `resolveStoredFile` helper хэрэглэнэ. MIME, өргөтгөл, decode болон браузерын дэмжлэг шалгахгүй. Hide/archive/restore-д disk шалгалт хийхгүй; эвдэрсэн зурагтай бүртгэлийг нуух боломжтой байна.
- `VehicleWriteOptions.verifyFiles` нь app-owned storage hook. DB service шууд хэрэглэх өөр app нь өөрийн hook-ийг дамжуулна; callback байхгүй DB-only хэрэглээнд physical disk шалгалт хийгдэхгүй. DB FK, row lock болон usage дүрэм хэвээр хэрэгжинэ.
- Get/list нь repeatable-read, read-only transaction ашиглаж, aggregate болон total/items-ийг ижил snapshot-оос уншина. List нь content, VIN, internalNote болон gallery-г DB-ээс татахгүй; main/item metadata-г batch уншина.
- FirstPublishedAt-г байгаа DB trigger анх нийтлэхэд оноож, дахин нийтлэхэд хадгална. Schema/migration өөрчлөөгүй; runtime нь одоогийн `0003_shared_files` хүртэлх schema шаарддаг.

### Алдаа

| HTTP | Code | Нөхцөл |
| --- | --- | --- |
| 400 | DTI_BODY_VALIDATE_ERROR / DTI_QUERY_VALIDATE_ERROR / DTI_PATH_PARAMS_VALIDATE_ERROR | Transport schema зөрчсөн |
| 400 | VEHICLE_INVALID_INPUT | Service validation, нийлсэн он/цахилгаан хөдөлгүүрийн зөрчил, DB check constraint |
| 400 | VEHICLE_REFERENCE_NOT_FOUND / VEHICLE_REFERENCE_MISMATCH | Лавлах байхгүй эсвэл эцэг/хүүхэд зөрсөн |
| 400 | VEHICLE_FILE_NOT_FOUND | Сонгосон file бүртгэл байхгүй |
| 404 | VEHICLE_NOT_FOUND | ID байхгүй эсвэл өөр төрлийн бүтээгдэхүүн |
| 409 | VEHICLE_REFERENCE_INACTIVE | Шинэ/өөрчилсөн идэвхгүй сонголт |
| 409 | VEHICLE_PUBLICATION_INVALID / VEHICLE_INVALID_TRANSITION | Нийтлэх шаардлага эсвэл төлөв шилжилт зөрчсөн |
| 409 | VEHICLE_FILE_UNAVAILABLE | Сонгосон эх файл дискэнд байхгүй |
| 409 | VEHICLE_REFERENCE_CONFLICT / VEHICLE_WRITE_CONFLICT | FK/concurrent өөрчлөлт, serialization failure/deadlock |
| 500 | VEHICLE_STORAGE_ERROR | DB/storage алдаа; дотоод зам/SQL/credential задруулахгүй |

Тестүүд нь HTTP → DTI → DI → service → тусгаарласан PGlite + түр disk урсгалыг шалгана. Анхны/дахин нийтлэх, нөхцөлтэй талбар, parent цэвэрлэгээ, идэвхгүй лавлах, upload/read, usage, gallery ID/order, pagination, rollback, зэрэгцээ хүсэлт, safe errors хамрагдсан. Бодит PostgreSQL олон connection-ийн race/load, OS-level гаднын file өөрчлөлт, production ACL болон HTML sanitization шалгагдаагүй. HTTP зэрэгцээ тест нь PGlite-ийн нэг connection орчинд ажилладаг; PostgreSQL concurrency proof биш.

## Шалгалт

`test/branches-http.test.ts` нь `/api/branches`-ийн CRUD, ISO timestamp, pagination/filter, 400/404/409/500 болон машин, сэлбэг, дугуйн салбарын FK хамгаалалтыг DI + бодит `BranchService` + тусгаарласан PGlite-ээр шалгана. Салбарын үйлдэл бүтээгдэхүүний `location_id`-г өөрчлөхгүй.

`test/colors-http.test.ts` нь бодит HTTP хүсэлтээр DTI route, DI module, ColorService болон тусгаарласан PGlite DB-г хамтад нь шалгана. Одоо байгаа migration-уудыг зөвхөн санах ойн DB-д хэрэгжүүлнэ; шинэ migration үүсгэхгүй, local/production DB-д хүрэхгүй. CRUD, ISO timestamp, pagination/filter, validation, 404/409 болон safe 500 response-ийг хамарна. Бусад тестүүд health/404, config validation, DB/service module resolve болон lazy DB үүсгэлтийг шалгана. Тестүүд HTTP server, container, DB/pool-оо хаана. Бодит Userly/PostgreSQL network integration болон production load тест хийгдээгүй.
