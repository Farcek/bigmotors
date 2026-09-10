# Sysop DTI хөгжүүлэлт

## Суурь

`sysop/dti` (`@bigmotors/sysop-dti`) нь `sysop/app` болон `sysop/server` хоорондын API contract-ийг эзэмшинэ. `E:\projects\chip CRM\apps\dti`-ийн `createAction`, Zod schema, namespace болон barrel export хэв маягаас жишээ авсан. CRM-ийн бизнес contract-уудыг хуулаагүй.

Сонголт: [ADR 0021](../adr/0021-initialize-sysop-dti.md). Node.js 24.11.0+ (24.x), pnpm 11.19.0 ашиглана. Яг dependency хувилбарууд [package.json](../../sysop/dti/package.json) болон root lockfile-д байна.

## Командууд

Repository root-оос:

```powershell
pnpm install --frozen-lockfile
pnpm build:dti
pnpm typecheck:dti
pnpm test:dti
pnpm dev:dti
```

`dev:dti` нь өөрчлөлт бүрд library-г дахин build хийнэ; HTTP сервер биш. Build үр дүн нь `dist/index.mjs`, `dist/index.d.mts` болон source map. `dist` болон `node_modules` нь Git-д орохгүй.

Бусад package-аас импортлохын өмнө DTI-г build хийнэ. Consumer-ийн dependency-г `workspace:*`-оор холбох санал TASK-02-т нээлттэй; энэ initialize нь app/server manifest-д DTI dependency эсвэл автомат build дараалал нэмээгүй.

## Contract бичих бүтэц

- `src/<domain>.ts`: domain namespace дотор Zod schema, inferred type болон `createAction`.
- `src/index.ts`: нийтийн barrel export. NodeNext source import-д `.js` өргөтгөл ашиглана.
- `test/*.test.ts`: action metadata болон зөв/буруу payload шалгах тест.
- Бизнес enum/const нь `packages/core`-ийн хариуцлага; `@bigmotors/core` dependency-гаас текстийн хязгаарыг хэрэглэнэ. Root DTI командууд core-ийг эхлээд build хийнэ. DB schema/type-ийг эндээс импортлохгүй.

Үндсэн build нь `platform: neutral`, ESM, ES2022, declaration; dependency-г library дотор давхар bundle хийхгүй. [tsdown dependency зарчим](https://tsdown.dev/options/dependencies). Type checking нь тусдаа `tsc --noEmit`; Node type нь тест/build tooling-д хэрэглэгдэнэ, runtime Node dependency нэмэхгүй.

Zod schema-аас `z.infer` ашиглан type гаргана. `safeParse` нь validation-ийн үр дүнг буцаадаг; schema зарласан нь HTTP хүсэлт автоматаар шалгагдана гэсэн үг биш. [Zod basics](https://zod.dev/basics).

## Одоогийн contract ба зааг

`Health.check`: `healthCheck`, `GET /health`, body байхгүй, query нь хоосон object; result нь `{ status: "ok", service: "@bigmotors/sysop-server" }`. Schema нь нэмэлт key зөвшөөрөхгүй. Энэ нь DB/Userly readiness биш.

Серверийн одоо байгаа `/health` handler-ийг contract-той хараахан холбоогүй тул runtime schema enforcement хийгдээгүй. `/api/*`-ийн fail-closed хамгаалалт өөрчлөгдөөгүй.

### Өнгө Ба Салбар

2026-09-10: `Colors`, `Branches` namespace бүхий contract нэмсэн; `@bigmotors/sysop-dti`-ээс импортлоно.

| Action | HTTP path | Input | Result |
| --- | --- | --- | --- |
| `Colors.list` / `Branches.list` | GET `/colors` / `/branches` | `listQuery` | `Entity[]` |
| `Colors.create` / `Branches.create` | POST `/colors` / `/branches` | `createBody` | `Entity` |
| `Colors.update` / `Branches.update` | PATCH `/colors/:id` / `/branches/:id` | `params`, `updateBody` | `Entity` |
| `Colors.remove` / `Branches.remove` | DELETE `/colors/:id` / `/branches/:id` | `params`, body байхгүй | Устгасан `Entity` |

Action name: `colorList`, `colorCreate`, `colorUpdate`, `colorDelete`, мөн `branch` угтвартай ижил 4 нэр. Эдгээр нь permission code автоматаар баталсан гэсэн үг биш. `/api` зэрэг router mount prefix contract path-д ороогүй. `remove` нь service-ийн `delete(id)`-д харгалзана.

`listQuery` нь `limit` (default 50, 1–100), `offset` (default 0), сонголттой `isActive`-тай. HTTP query-ийн тоон string болон boolean `"true"`/`"false"`, typed client-ийн number/boolean-ийг хоёуланг зөв уншина. Хоосон тоо, null, array/object, буруу boolean зөвшөөрөхгүй. Service-тэй адил list result нь массив, total/page wrapper байхгүй.

Бичих талбарууд: `name` (trim, 1–255), `description` (сонголттой, nullable, 512), `sortOrder` (сонголттой int32), `isActive` (сонголттой boolean). Өнгөнд нэмэлт сонголттой, nullable `hexCode` (`#RRGGBB`) байна. Хоосон тайлбар/HEX нь `null` болно. Patch-д орхисон/`undefined` талбар өмнөхийг хадгална; хоосон patch хориглоно. ID/огноог body-д бичих, үл мэдэгдэх field дамжуулахыг strict schema буцаана. `params.id` нь UUID.

`entity` нь DB-ийн camelCase талбаруудтай боловч `createdAt`, `updatedAt` нь ISO timestamp string. Handler DB `Date`-ийг `.toISOString()` болгон хувиргаж байж result validation-д өгнө. HTTP response envelope-ийг DTI adapter хариуцна; `entity` дотор `{ success, data }` wrapper давхарлахгүй.

Namespace бүр `entity`, `createBody`, `updateBody`, `params`, `listQuery`, `listResult` schema болон `Entity`, `CreateBody`, `UpdateBody`, `Params`, `ListQuery`, `ListResult` төрөлтэй. Input төрөл `z.input`, parsed/result төрөл `z.infer` ашиглана. Ингэснээр query-ийн wire string болон parse хийсний дараах number/boolean-ийг ялгана.

Энэ өөрчлөлт зөвхөн contract: DB service-ийг route-д холбох, огнооны mapping, DTI error mapping, `@napp/dti-client`, Userly/ACL болон admin form дараагийн ажил. Өнгө/салбарын ашиглагдсан мөрийг устгахгүй байх, нэрийн давхардлыг хамгаалах дүрэм нь DB service/constraint дээр хэвээр. Contract package-д DB, Express, token эсвэл нэвтрэх хэрэгжүүлэлт оруулаагүй.

## Шалгалт

Contract тест нь action metadata, valid/invalid query/result-ийг шалгана. Browser smoke тест dependency-тай нь in-memory browser bundle үүсгэж, Node global-гүй JavaScript context-д validation ажиллуулна. Энэ нь бодит browser E2E тестийг орлохгүй.
