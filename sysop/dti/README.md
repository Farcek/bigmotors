# Sysop DTI

`@bigmotors/sysop-dti` нь admin frontend болон backend хоорондын API contract package.

`Vehicles`: автомашины `list`, `get`, `create`, `update`, `publish`, `hide`, `archive`, `restore` action-ууд [src/vehicle.ts](src/vehicle.ts)-д байна. [Payload, route болон validation-ийн зааг](../../docs/operations/sysop-dti.md#автомашин). Contract нь VehicleService болон backend handler-т холбогдсон; [HTTP хэрэгжүүлэлт](../../docs/operations/sysop-server.md#автомашины-api). Admin UI болон ACL холболт үлдсэн.

`@napp/dti-core`-ийн `createAction`, Zod schema, domain namespace болон barrel export ашиглана. Browser/server shared package учраас DB, Express, environment, token, ACL хэрэгжүүлэлт агуулахгүй.

`Health.check` (`GET /health`), `Colors`, `Branches`, `VehicleBrands`, `VehicleBodyTypes`, `VehicleFeatures`, `PartBrands`, `TireBrands`, `Locations` contract-ууд байна. Лавлах бүр тусдаа файл/namespace, `list`, `create`, `update`, `remove` action болон input/output schema/type экспортолно. `common.ts` нь дундын ID, pagination, лавлахын талбаруудыг хариуцна. `@bigmotors/core`-ийн текстийн хязгаарыг хэрэглэнэ; DB package импортлохгүй.

`Colors` нь `/colors`, `Branches` нь `/branches`; list `GET`, create `POST`, update `PATCH /:id`, remove `DELETE /:id`. [Шинэ 6 лавлахын namespace/path](../../docs/operations/db-schema.md#flat-reference-services). API router mount prefix contract-ийн path-д ороогүй. List result нь массив; бичих/устгах үйлдэл тухайн мөрийг буцаана. `createdAt`/`updatedAt` нь ISO string, DB-ийн `Date` биш. Лавлахууд server handler-т холбогдсон; Userly/ACL түр алгассан, admin form хийгдээгүй.

Root хавтсаас:

```powershell
pnpm build:dti
pnpm typecheck:dti
pnpm test:dti
pnpm dev:dti
```

Root командууд `core`-ийг эхлээд build хийнэ. Build нь ESM `dist/index.mjs` болон declaration `dist/index.d.mts` үүсгэнэ. `dev:dti` нь library watch; HTTP сервер ажиллуулахгүй.

Дэлгэрэнгүй [хөгжүүлэлтийн заавар](../../docs/operations/sysop-dti.md), [ADR 0021](../../docs/adr/0021-initialize-sysop-dti.md).

`VehicleModels`, `VehicleVariants`, `TireModels`, `PartCategories` нь эцэгтэй 4 лавлахын CRUD contract. Parent key зөвхөн create/entity/list query-д байна; update body-д зөвшөөрөхгүй. Ангилалд `rootOnly` query нэмэгдэнэ. [Дүрэм болон endpoint](../../docs/operations/db-schema.md#parent-reference-services).
