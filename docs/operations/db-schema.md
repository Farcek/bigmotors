# DB schema хөгжүүлэх

- Огноо: 2026-09-10
- Төлөв: 24 хүснэгтийн TypeScript schema, migration болон тест хэрэгжсэн. 0000–0002 migration өмнө local PostgreSQL 18-д ажилласан; `0003_shared_files` бэлдсэн, бодит орчинд ажиллуулаагүй. Staging/production-д ажиллуулаагүй.
- Эх сурвалж: [каталогийн батлагдсан schema](../db/catalog-schema-proposal.md), [ADR 0023](../adr/0023-approve-catalog-schema.md).

## Бүтэц

| Байршил | Үүрэг |
| --- | --- |
| `packages/core/src/catalog.ts` | Батлагдсан тогтмол сонголт, хязгаар |
| `packages/db/src/schema/` | 24 хүснэгтийн Drizzle schema, constraint/index |
| `packages/db/src/schema-hooks.ts` | Timestamp, product identity/lifecycle, subtype, publication, category tree болон files delete guard trigger-ийн эх тодорхойлолт |
| `packages/db/src/db.ts` | App-аас өгсөн pool-ийг Drizzle-д холбоно |
| `packages/db/test/` | PGlite доторх schema/constraint/trigger тест, pool factory тест |

Runtime dependency нь `drizzle-orm` 0.45.2, `pg` 8.23.0; өнгөний service validation-д `zod` 4.4.3, алдаанд `@napp/error` 1.1.0 ашиглана. Тестийн `@electric-sql/pglite` 0.5.8 нь dev dependency; production DB driver биш. Build нь tsdown, strict typecheck нь TypeScript. Тодорхой хувилбарууд package.json болон pnpm lockfile-д байна.

## Команд

Node.js 24, pnpm 11.19.0 ашиглаж repository root-оос:

```powershell
pnpm install --frozen-lockfile
pnpm build:db
pnpm typecheck:db
pnpm test:db
```

Дээрх build/typecheck/test командууд эхэлж `@bigmotors/core`-ийг build хийнэ. Тестэнд PostgreSQL service, connection string, `.env` хэрэггүй. PGlite зөвхөн санах ойд ажиллана; version control-д хадгалсан бодит SQL migration-аар хүснэгт/trigger-үүдийг үүсгэж шалгана. Test helper нь production schema installer биш.

## Ашиглах зааг

App тохиргоо уншаад pool үүсгэж, `createDb(pool)`-д өгнө. Pool-ийг request бүрд шинээр үүсгэхгүй; app shutdown үед `pool.end()` дуудна. Pool-ийн TLS, timeout, хэмжээ болон website/admin тусдаа credential-ийг тухайн app тохируулна. Package import хийхэд DB холболт, schema install, migration ажиллахгүй.

Schema-г `@bigmotors/db/schema`, factory-г `@bigmotors/db`-ээс импортлоно. Хэрэгтэй select/insert төрлийг хүснэгтийн `$inferSelect`, `$inferInsert`-ээс авч болно. Үнэ `bigint` боловч батлагдсан дээд хэмжээ JS safe integer-ээс бага тул TypeScript `number`; дугуйн `numeric(5,2)` талбарууд precision хадгалах `string` mapping-тай.

Product ба төрлийн дэлгэрэнгүй мөрийг заавал нэг transaction-д үүсгэнэ. Commit дээр тохирох detail мөр байхгүй бол бүх өөрчлөлт буцна. Child өөрчлөлт parent мөрийг update/lock хийж `updated_at`-ийг шинэчилнэ. `first_published_at` анх нийтлэхэд автоматаар тогтож, дахин нийтлэхэд өөрчлөгдөхгүй. Publication-ийн requiredness нь нэмэлт deferred trigger хамгаалалттай; энэ нь API validation, authorization-ийг орлохгүй.

Category tree-ийн бичилт advisory transaction lock авна; `READ COMMITTED` эсвэл `SERIALIZABLE` ашиглана. `REPEATABLE READ`-ийн хуучин snapshot-аас буруу cycle шалгалт хийхээс хамгаалж бичилтийг буцаана. Serializable conflict/deadlock гарвал бүх transaction-ийг дахин эхлүүлэх бодлогыг CRUD integration-д хийнэ.

## ColorService

`ColorService`-ийг `@bigmotors/db`-ээс импортлож, `new ColorService(db)` гэж caller-ийн Drizzle instance-тай үүсгэнэ. Import/constructor нь connection, migration эсвэл pool lifecycle үйлдэл хийхгүй. Service нь ACL шалгахгүй; backend нь дуудлагын өмнө эрх шалгах үүрэгтэй. Одоогоор API route болон admin form-д холбоогүй.

| Method | Үр дүн / дүрэм |
| --- | --- |
| `list({ limit?, offset?, isActive? } = {})` | `Color[]`; default limit 50, offset 0; limit 1–100. `isActive` орхивол хоёр төлөв, өгвөл тухайн төлөв. `sortOrder`, `name`, `id` өсөх дараалал; total count буцаахгүй |
| `create({ name, description?, hexCode?, sortOrder?, isActive? })` | Үүссэн `Color`; UUID/огноо/default-ийг DB үүсгэнэ |
| `update(id, patch)` | Шинэчилсэн `Color`; зөвхөн өгсөн талбар өөрчлөгдөнө; хоосон patch зөвшөөрөхгүй |
| `delete(id)` | Устгасан `Color`; машинд гадна/салоны өнгөөр ашигласан бол FK устгал хориглоно |

Нэрийг trim хийнэ; хоосон нэр, 255-аас урт нэр, 512-аас урт тайлбар, буруу HEX болон integer бус sort order-ийг буцаана. `description`/`hexCode`-ийн хоосон эсвэл зөвхөн зайтай утгыг `null` болгоно; patch-д орхисон/`undefined` утга өмнөхийг хадгална. HEX том/жижиг үсгийг хадгалж, `#RRGGBB` шалгана. Sort order нь DB integer-ийн хүрээнд сөрөг байж болно. UUID болон pagination шалгалттай; input-ийн үл мэдэгдэх талбарыг хориглоно.

Алдаа нь `NappError`: `COLOR_INVALID_INPUT` (400), `COLOR_NOT_FOUND` (404), `COLOR_NAME_CONFLICT` (409), `COLOR_IN_USE` (409), `COLOR_STORAGE_ERROR` (500). Нэрийн давхардлыг DB unique index, ашиглагдаж байгаа эсэхийг FK эцэслэн хамгаална; шалгалт ба бичилтийн хоорондын race-д урьдчилсан SELECT-д найдахгүй. Ашиглагдсан өнгийг устгахын оронд `update(id, { isActive: false })` ашиглана; өмнөх машины холбоосыг өөрчлөхгүй.

## BranchService

`BranchService`-ийг `@bigmotors/db`-ээс импортлож, `new BranchService(db)` гэж үүсгэнэ. `ColorService`-тай ижил хэв маягтай; зөвхөн компанийн `branches` лавлахыг удирдана, `locations`-ийг өөрчлөхгүй.

| Method | Үр дүн / дүрэм |
| --- | --- |
| `list({ limit?, offset?, isActive? } = {})` | `Branch[]`; default limit 50, offset 0, limit 1–100; `sortOrder`, `name`, `id` өсөх дараалал; total count буцаахгүй |
| `create({ name, description?, sortOrder?, isActive? })` | Үүссэн `Branch`; UUID, огноо, default-ийг DB үүсгэнэ |
| `update(id, patch)` | Шинэчилсэн `Branch`; зөвхөн өгсөн талбар; хоосон patch хориглоно |
| `delete(id)` | Устгасан `Branch`; машин, сэлбэг, дугуйд ашиглагдсан бол FK устгал хориглоно |

Нэр trim хийсний дараа 1–255, тайлбар 512 хүртэл тэмдэгттэй. Хоосон тайлбар `null`, орхисон/`undefined` patch өмнөх утгыг хадгална. UUID, integer хүрээ, pagination, boolean болон үл мэдэгдэх input талбарыг Zod шалгана. `hexCode` салбарын талбар биш тул зөвшөөрөхгүй. Идэвхгүй болгох/эргүүлэн идэвхжүүлэхдээ `update(id, { isActive: false/true })` хэрэглэнэ; бүтээгдэхүүний холбоос хэвээр.

`NappError` код: `BRANCH_INVALID_INPUT` (400), `BRANCH_NOT_FOUND` (404), `BRANCH_NAME_CONFLICT` (409), `BRANCH_IN_USE` (409), `BRANCH_STORAGE_ERROR` (500). Давхардал болон ашиглагдсан эсэхийг DB constraint эцэслэн хамгаална. ACL, API route, admin form болон pool lifecycle service-ийн үүрэг биш; caller хариуцна. Энэ service-д шинэ migration шаардлагагүй.

## Flat Reference Services

Өнгө, салбарын загвараар доорх 6 лавлахын тусдаа service, DTI contract, API болон DI бүртгэл нэмсэн. Эдгээр 8 энгийн лавлахаас гадна доорх 4 эцэгтэй лавлах хэрэгжиж, нийт 12 лавлах CRUD-тай болсон; schema, migration, seed өөрчлөөгүй.

| Service | DTI namespace | API base path |
| --- | --- | --- |
| [VehicleBrandService](../../packages/db/src/service/vehicle-brand.ts) | `VehicleBrands` | `/api/vehicle-brands` |
| [VehicleBodyTypeService](../../packages/db/src/service/vehicle-body-type.ts) | `VehicleBodyTypes` | `/api/vehicle-body-types` |
| [VehicleFeatureService](../../packages/db/src/service/vehicle-feature.ts) | `VehicleFeatures` | `/api/vehicle-features` |
| [PartBrandService](../../packages/db/src/service/part-brand.ts) | `PartBrands` | `/api/part-brands` |
| [TireBrandService](../../packages/db/src/service/tire-brand.ts) | `TireBrands` | `/api/tire-brands` |
| [LocationService](../../packages/db/src/service/location.ts) | `Locations` | `/api/locations` |

Бүгд `BranchService`-тай ижил `list/create/update/delete` method, validation, pagination, эрэмбэ болон partial update дүрэмтэй. `diDBServiceProviders()`-д бүртгэлтэй; `TKN_DB` injection ашиглана. Нэмэлт parent талбар, HEX, search эсвэл tree endpoint байхгүй. List бүх төлөвийг буцааж, `isActive`-аар шүүнэ. API нь GET/POST base path, PATCH/DELETE `/:id`; result огноо ISO string байна.

Error prefix: `VEHICLE_BRAND`, `VEHICLE_BODY_TYPE`, `VEHICLE_FEATURE`, `PART_BRAND`, `TIRE_BRAND`, `LOCATION`. Suffix нь `INVALID_INPUT` (400), `NOT_FOUND` (404), `NAME_CONFLICT`/`IN_USE` (409), `STORAGE_ERROR` (500). Нэрийн давхардал болон устгах хамгаалалтыг одоогийн DB constraint шийднэ. Холбоотой бүтээгдэхүүн, загвар эсвэл тоноглолын холбоос байвал устгахгүй, идэвхгүй болгож болно. `LocationService` компанийн салбарыг өөрчлөхгүй.

`packages/db/test/reference-services.test.ts` нь DI, CRUD, validation болон FK хамгаалалт; `sysop/dti/test/references.test.ts` нь contract; `sysop/server/test/references-http.test.ts` нь HTTP → DI → service → PGlite урсгалыг шалгана.

## Parent Reference Services

2026-09-11: Хэрэглэгчийн баталсан хувилбараар үлдсэн 4 лавлахын service, DTI, API, DI болон HTTP тест хэрэгжсэн.

| Service | Namespace | API base path | Create талбар / list шүүлт |
| --- | --- | --- | --- |
| [VehicleModelService](../../packages/db/src/service/vehicle-model.ts) | `VehicleModels` | `/api/vehicle-models` | `brandId` create-д заавал, list-д сонголттой |
| [VehicleVariantService](../../packages/db/src/service/vehicle-variant.ts) | `VehicleVariants` | `/api/vehicle-variants` | `modelId` create-д заавал, list-д сонголттой |
| [TireModelService](../../packages/db/src/service/tire-model.ts) | `TireModels` | `/api/tire-models` | `brandId` create-д заавал, list-д сонголттой |
| [PartCategoryService](../../packages/db/src/service/part-category.ts) | `PartCategories` | `/api/part-categories` | `parentId` сонголттой, default null; list-д `rootOnly` нэмэгдэнэ |

- Бүгд GET/POST base path, PATCH/DELETE `/:id` ашиглана. Бусад нийтлэг талбар, list pagination/эрэмбэ болон ISO огноо өмнөх лавлахуудтай ижил.
- Create нь эцэг болон дээд эцгүүд байгаа, идэвхтэй эсэхийг шалгана. Variant нь model + brand, category нь бүх өвөг ангиллыг шалгана. Шалгалт болон INSERT нэг transaction-д; эцгийн мөрүүдийг `FOR SHARE`-аар commit хүртэл хамгаална.
- PATCH нь зөвхөн `name`, `description`, `sortOrder`, `isActive` авна. Эцгийн key-г ижил ID эсвэл `undefined` утгатай ч дамжуулбал буцаана. Үүсгэсэн бүртгэлийн эцэг солих API байхгүй; DB schema өөрчлөгдөөгүй тул энэ нь service/contract түвшний хориг.
- Идэвхгүй болсон эцэгтэй хуучин бүртгэлийг засаж болно; хүүхдийн `isActive` болон бүтээгдэхүүний холбоосыг автоматаар өөрчлөхгүй. List-ийн `isActive` нь тухайн мөрийн төлөвийг шүүнэ, өвгийн төлөвийг биш.
- Нэр тухайн эцгийн хүрээнд давхардахгүй; category-ийн эцэггүй үндсэн нэрүүд мөн давхардахгүй. DB unique index үүнийг эцэслэн хамгаална.
- Category-ийн `parentId` list filter нь шууд хүүхдүүдийг буцаана. `rootOnly=true` зөвхөн үндсэн ангилал; `rootOnly=false` эсвэл орхисон үед root-only хязгаарлалтгүй. `rootOnly=true` + `parentId` нь 400. Query-д `parentId=null` дамжуулахгүй, `rootOnly=true` хэрэглэнэ. Tree endpoint нэмээгүй.
- Бүтээгдэхүүн эсвэл хүүхэд лавлахтай мөрийг устгахгүй; 409 `*_IN_USE`. Cascade delete хийхгүй. Өөрийгөө/үр удмаа эцэг болгох нь immutable parent болон одоогийн DB category trigger-ээр хамгаалагдана.
- Error prefix: `VEHICLE_MODEL`, `VEHICLE_VARIANT`, `TIRE_MODEL`, `PART_CATEGORY`. Өмнөх нийтлэг suffix-ээс гадна `PARENT_NOT_FOUND` (400), `PARENT_INACTIVE` (409). DTI оролтын schema зөрчил нь 400 `DTI_BODY_VALIDATE_ERROR`/`DTI_QUERY_VALIDATE_ERROR`.

Service тест: `packages/db/test/parent-reference-services.test.ts`; contract: `sysop/dti/test/parent-references.test.ts`; HTTP: `sysop/server/test/parent-references-http.test.ts`. PGlite нь бодит PostgreSQL-ийн олон холболттой concurrency/deadlock тестийг орлохгүй.

## Migration

`packages/db/drizzle.config.ts`, `migrations/`, `db:generate`, `db:migrate` болон migration/snapshot-ууд бэлэн. Root-оос дуудах командтай; app startup-аас тусдаа. Seed болон push команд нэмээгүй. `0003_shared_files` нь хуучин зургийн metadata/ID/холбоосыг хадгалж files руу шилжүүлнэ; энэ migration бодит DB-д ажиллаагүй. [Migration ажиллуулах заавар](db-migrations.md).

Drizzle-ийн table metadata нь PostgreSQL trigger-үүдийг төлөөлөхгүй. Эхний migration-д function/trigger-үүдийг хамт хадгалсан. Дараагийн өөрчлөлтөд шинэ custom SQL migration шаардлагатай; source import дангаараа DB trigger шинэчлэхгүй.

## Дараагийн Ажил

- Shared CRUD transaction, request validation болон ойлгомжтой error mapping; backend/API-д холбоогүй.
- Тухайн оноор хязгаарлах шалгалт, бутархай integer/илүү precision-тай input-ийг DB тоймлохоос өмнө буцаах, optional текстийг NULL болгох; VIN-ийг хувиргахгүй.
- Өмнөх идэвхгүй лавлахыг хадгалах, шинэ сонголтод active лавлах шаардах дүрмийн before/after validation.
- Render fallback, HTML sanitization, disk upload/serve, orphan file cleanup; schema байгаа нь эдгээр урсгал бэлэн гэсэн үг биш.
- Userly profile upsert, ACL, website/admin DB role, connection lifecycle-ийн бодит integration.
- Бодит PostgreSQL дээр олон холболтын concurrent transaction, deadlock/retry, dump/restore тест. Одоогийн PGlite тест эдгээрийг нотлохгүй; migration хэрэглэхээс өмнө заавал нягтална.
