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
- Бизнес enum/const нь `packages/core`-ийн хариуцлага; шаардлагатай үед холбоно. DB schema/type-ийг эндээс импортлохгүй.

Үндсэн build нь `platform: neutral`, ESM, ES2022, declaration; dependency-г library дотор давхар bundle хийхгүй. [tsdown dependency зарчим](https://tsdown.dev/options/dependencies). Type checking нь тусдаа `tsc --noEmit`; Node type нь тест/build tooling-д хэрэглэгдэнэ, runtime Node dependency нэмэхгүй.

Zod schema-аас `z.infer` ашиглан type гаргана. `safeParse` нь validation-ийн үр дүнг буцаадаг; schema зарласан нь HTTP хүсэлт автоматаар шалгагдана гэсэн үг биш. [Zod basics](https://zod.dev/basics).

## Одоогийн contract ба зааг

`Health.check`: `healthCheck`, `GET /health`, body байхгүй, query нь хоосон object; result нь `{ status: "ok", service: "@bigmotors/sysop-server" }`. Schema нь нэмэлт key зөвшөөрөхгүй. Энэ нь DB/Userly readiness биш.

Серверийн одоо байгаа `/health` handler-ийг contract-той хараахан холбоогүй тул runtime schema enforcement хийгдээгүй. `/api/*`-ийн fail-closed хамгаалалт өөрчлөгдөөгүй.

Каталогийн CRUD, нийтлэг ID/pagination schema, error envelope, `@napp/dti-server` router, `@napp/dti-client` болон Userly/ACL холболт энэ initialize-д ороогүй. Ашиглаагүй `@napp/error`, `@bigmotors/core`, DB/server dependency нэмээгүй.

## Шалгалт

Contract тест нь action metadata, valid/invalid query/result-ийг шалгана. Browser smoke тест dependency-тай нь in-memory browser bundle үүсгэж, Node global-гүй JavaScript context-д validation ажиллуулна. Энэ нь бодит browser E2E тестийг орлохгүй.
