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

Бусад package-аас импортлохын өмнө DTI-г build хийнэ. Server нь `workspace:*` dependency ашиглаж, root-ийн server командууд shared package-уудаа эхлээд build хийнэ.

## Contract бичих бүтэц

- `src/<domain>.ts`: domain namespace дотор Zod schema, inferred type болон `createAction`.
- `src/index.ts`: нийтийн barrel export. NodeNext source import-д `.js` өргөтгөл ашиглана.
- `test/*.test.ts`: action metadata болон зөв/буруу payload шалгах тест.
- Бизнес enum/const нь `packages/core`-ийн хариуцлага; `@bigmotors/core` dependency-гаас текстийн хязгаарыг хэрэглэнэ. Root DTI командууд core-ийг эхлээд build хийнэ. DB schema/type-ийг эндээс импортлохгүй.

Үндсэн build нь `platform: neutral`, ESM, ES2022, declaration; dependency-г library дотор давхар bundle хийхгүй. [tsdown dependency зарчим](https://tsdown.dev/options/dependencies). Type checking нь тусдаа `tsc --noEmit`; Node type нь тест/build tooling-д хэрэглэгдэнэ, runtime Node dependency нэмэхгүй.

Zod schema-аас `z.infer` ашиглан type гаргана. `safeParse` нь validation-ийн үр дүнг буцаадаг; schema зарласан нь HTTP хүсэлт автоматаар шалгагдана гэсэн үг биш. [Zod basics](https://zod.dev/basics).

## Одоогийн contract ба зааг

`Health.check`: `healthCheck`, `GET /health`, body байхгүй, query нь хоосон object; result нь `{ status: "ok", service: "@bigmotors/sysop-server" }`. Schema нь нэмэлт key зөвшөөрөхгүй. Энэ нь DB/Userly readiness биш.

Серверийн одоо байгаа `/health` handler-ийг contract-той хараахан холбоогүй тул runtime schema enforcement хийгдээгүй. Userly/ACL-ийг хөгжүүлэлтийн үед хэрэглэгч түр алгассан; [одоогийн хамгаалалтын зааг](sysop-server.md).

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

Өнгө, салбар болон [6 энгийн лавлах](db-schema.md#flat-reference-services)-ын contract нь server service/route-д холбогдсон; огноо болон error mapping хэрэгжсэн. Ашиглагдсан мөрийг устгахгүй байх, нэрийн давхардлын хамгаалалт нь DB service/constraint дээр байна. Contract package-д DB, Express эсвэл auth хэрэгжүүлэлт оруулаагүй. Userly/ACL болон frontend client/form дараагийн ажил.

### Эцэгтэй Лавлахууд

`VehicleModels`, `VehicleVariants`, `TireModels`, `PartCategories` нэмэгдсэн; [service/namespace/path болон батлагдсан дүрэм](db-schema.md#parent-reference-services). Entity ба create нь `brandId`, `modelId` эсвэл `parentId`-тай. Update body нь зөвхөн нийтлэг засагдах талбаруудтай strict schema; эцэг солих key хүлээн авахгүй. Category create-ийн `parentId` default `null`; list-ийн `rootOnly` нь boolean болон `"true"`/`"false"` wire утга авна. `rootOnly=true` ба `parentId` зэрэг өгөхийг хориглоно. Эцэг байгаа/идэвхтэй эсэхийн DB шалгалтыг contract биш service хариуцна. Бүх 12 лавлахын action нэр болон HTTP method/path давхцахгүйг тестээр шалгана.

### Автомашин

2026-09-12: [Vehicles contract](../../sysop/dti/src/vehicle.ts) нэмсэн. Батлагдсан [талбар ба төлөвийн дүрэм](../features/vehicle-fields.md), product/vehicle DB schema, shared enum/const-д тулгуурласан. Энэ хэсэг **admin API**; public website-ийн response биш. Contract, input/output төрөл, VehicleService, backend handler, HTTP тест болон [admin UI](../features/admin-vehicles.md) бэлэн; ACL permission mapping хийгдээгүй. [Runtime ба алдааны зааг](sysop-server.md#автомашины-api). Доорх route/payload нь энэ хэрэгжүүлэлтийн сонголт; шинэ бизнесийн боломж нэмэхгүй.

| Action | Нэр | HTTP path | Input / Result |
| --- | --- | --- | --- |
| `Vehicles.list` | `vehicleList` | GET `/vehicles` | listQuery / ListResult |
| `Vehicles.get` | `vehicleGet` | GET `/vehicles/:id` | params / Entity |
| `Vehicles.create` | `vehicleCreate` | POST `/vehicles` | createBody / Entity |
| `Vehicles.update` | `vehicleUpdate` | PATCH `/vehicles/:id` | params, updateBody / Entity |
| `Vehicles.publish` | `vehiclePublish` | POST `/vehicles/:id/publish` | params, body-гүй / Entity |
| `Vehicles.hide` | `vehicleHide` | POST `/vehicles/:id/hide` | params, body-гүй / Entity |
| `Vehicles.archive` | `vehicleArchive` | POST `/vehicles/:id/archive` | params, body-гүй / Entity |
| `Vehicles.restore` | `vehicleRestore` | POST `/vehicles/:id/restore` | params, body-гүй / Entity |

Server API mount prefix нь `/api`; contract-ийн path-д prefix оруулахгүй. `params.id` нь product/vehicle-ийн нэг UUID. Шууд устгах action нэмээгүй; архивлах нь бүртгэлийг хадгална. Борлуулалтын болон ирэлтийн төлөвийг updateBody-оор өөрчилнө; нийтлэлийн төлөвийг зөвхөн тусдаа action-аар шилжүүлнэ.

#### Бичих Payload

Payload нь camelCase, нэг түвшний бүтээгдэхүүн + автомашины талбаруудтай. `createBody`-д зөвхөн `title` заавал; backend нь `draft`, `isFeatured=false` default, бусад хоосон талбарт NULL, холбоосуудад хоосон жагсаалт үүсгэнэ. Input дээр default утга шахаж нөхөхгүй.

| Бүлэг | Талбарууд |
| --- | --- |
| Агуулга | title, description, content, itemTitle, itemDesc, internalNote |
| Үнэ | price, currency, priceDisplayMode |
| Тэмдэглэгээ | isFeatured |
| Тодорхойлолт | brandId, modelId, variantId, manufactureYear, importYear, vin, bodyTypeId |
| Техник | fuelType, engineCapacityCc, transmission, drivetrain, steeringPosition, exteriorColorId, interiorColorId, seatCount |
| Нөхцөл | condition, mileageKm, conditionDescription |
| Салбар/байршил | branchId, locationId; хоёр тусдаа лавлах |
| Бэлэн байдал | saleStatus, arrivalStatus, financingAvailable |
| Файл ба тоноглол | mainImageId, itemImageId, images: [{ fileId, sortOrder }], featureIds: UUID[] |

- PATCH: орхисон талбарыг өөрчлөхгүй; `null` нь сонголттой scalar утгыг цэвэрлэнэ. `title`, `isFeatured` болон холбоосын array нь null биш. Хоосон PATCH болон зөвхөн undefined утгатай PATCH хориглоно.
- `images` болон `featureIds` өгвөл бүх жагсаалтыг орлоно; `[]` нь холбоосуудыг арилгана. Өгөөгүй бол өмнөхийг хадгална. Gallery-ийн нэг fileId, тоноглолын нэг featureId давхардахгүй. Зургийн тоонд дээд хязгаар нэмээгүй; sortOrder нь 0–2,147,483,647 бүхэл тоо.
- Image input-д link ID, productId, file metadata, file_path, usage оруулахгүй. Backend link ID-г үүсгэж, байгаа product/file холбоосын ID-г хадгалан update/upsert хийнэ; үндсэн/item зураг нь gallery-д заавал багтахгүй. Нэг file-ийг main/item/gallery-д зэрэг ашиглаж болно.
- title trim хийсний дараа 1–255. Сонголттой itemTitle 255, description/itemDesc/conditionDescription 512; whitespace утга NULL болно. `content` нь HTML string, `internalNote` болон VIN-д 255/512 хязгаар тавихгүй. VIN-г trim/normalize хийхгүй, давхардал болон формат шалгахгүй.
- Тоон утгууд JSON number, бүхэл байна; numeric string-ийг body дээр авахгүй. Үнэ, гүйлт, суудал, багтаамж нь shared CATALOG_LIMITS-ийн хүрээнд. Он 1900-аас шалгах үеийн UTC он хүртэл; schema import хийх үеийн оноор тогтмол хязгаарлахгүй. Backend-ийн цаг эцсийн шалгалтын эх сурвалж байна.
- Хоёр он зэрэг ирсэн бол importYear >= manufactureYear; fuelType=electric болон engineCapacityCc зэрэг ирсэн бол багтаамж NULL байна. Create дээр modelId-д brandId, variantId-д modelId шаардана. PATCH-ийн нэг талын өөрчлөлтийн эцсийн нийцлийг backend өмнөх мөртэй нийлүүлээд шалгана.
- id, productType, publicationStatus, firstPublishedAt, timestamps, usage болон response-only file object-уудыг body-д бичихгүй. Үл мэдэгдэх талбарыг strict schema буцаана.

Хамгийн бага createBody:

```json
{ "title": "Жишээ автомашин" }
```

Зураг/тоноглолын PATCH жишээ (UUID-ууд нь жишээ):

```json
{
  "mainImageId": "d4ea26c2-52a0-4223-8cc1-d649b84281d1",
  "itemTitle": null,
  "images": [
    { "fileId": "d4ea26c2-52a0-4223-8cc1-d649b84281d1", "sortOrder": 0 }
  ],
  "featureIds": []
}
```

#### Унших Payload

Entity нь products/vehicles-ийн талбаруудыг нэг түвшинд өгнө: `id`, `productType: vehicle`, нийтлэлийн төлөв, nullable firstPublishedAt, ISO createdAt/updatedAt болон дээрх бүх scalar талбарууд. ProductId-г давхар өгөхгүй. Admin дэлгэрэнгүйд VIN, internalNote болон inquire горимын хадгалсан үнийг авах боломжтой; public response болгон ашиглахгүй.

`mainImage`, `itemImage` нь nullable file metadata; `images` нь `{ id, fileId, sortOrder, file }[]`. File object нь `Files.UploadResult`-ийн id, originalName, title, description, createdAt, updatedAt талбаруудтай; disk path/usage байхгүй. File URL-ийг [батлагдсан public read дүрмээр](../features/file-management.md#file-read-route) байгуулна. Feature холбоос нь featureIds массиваар ирнэ. Лавлахын нэрүүдийг одоогийн lookup contract-уудаас авна.

`itemTitle`, `itemDesc`, `itemImageId` NULL үед fallback утгыг response/DB-д хуулж нөхөхгүй. Render нь title, description, mainImageId/mainImage-аас тус тус орлуулна; description байхгүй бол itemDesc fallback мөн хоосон байна.

ListResult нь `{ items: ListItem[], total, limit, offset }`. Total нь pagination-ээс өмнөх, тухайн admin filter-д таарсан нийт тоо. ListItem нь Entity-ээс content, internalNote, vin, images, featureIds-ийг хассан хэлбэр. Урт агуулга/gallery-г жагсаалтад давхар татахгүй; pagination болон үр дүнгийн тоо хэрэгтэй учраас лавлахын энгийн array result-оос ялгаатай.

#### Admin Хайлт

- limit: 1–100, default 50; offset: 0–2,147,483,647, default 0. Query нь typed number/boolean болон HTTP numeric string, `true`/`false` string-ийг зөв parse хийнэ; truthiness coercion хэрэглэхгүй.
- search: trim хийсэн 1–255 тэмдэгт; хайлтгүй үед key-г орхино. Handler нь title, itemTitle, марк/загвар/хувилбарын нэрээр case-insensitive хэсэгчилсэн хайлт хийнэ. `%`, `_`, backslash-ийг SQL wildcard бус энгийн тэмдэгт гэж үзнэ. Өгсөн текстийг бүхлээр хайна; олон үгт tokenization/fuzzy хайлт нэмээгүй. VIN болон internalNote хайлтад орохгүй.
- Нэг утгатай шүүлт: publicationStatus, isFeatured, brandId, modelId, variantId, bodyTypeId, branchId, locationId, condition, saleStatus, arrivalStatus, fuelType, transmission, drivetrain, steeringPosition, priceDisplayMode.
- Хүрээ: priceMin/priceMax, manufactureYearMin/manufactureYearMax, mileageKmMin/mileageKmMax. Доод <= дээд; оруулсан утгууд талбарын тоон хязгаарт багтана.
- sort: created_desc (default), updated_desc, title_asc, price_asc, price_desc, year_desc, mileage_asc. Ижил эрэмбийн утгад id-аар тогтвортой хоёрдогч эрэмбэ; nullable тоон утга сүүлд байна.
- Admin жагсаалт нь published/available-ээр автоматаар хязгаарлагдахгүй; archived болон sold бүртгэлийг хайх боломжтой. Шүүлтүүд AND; admin-ийн үнийн шүүлт нь хадгалсан price-д үйлчилнэ. Public каталогийн inquire үнэ нуух болон жагсаалтын дүрмийг admin query-д шууд хэрэглэхгүй.

#### Backend-ийн Үүрэг

Contract дангаараа DB дүрмийг хэрэгжүүлэхгүй. Доорх transaction, төлөв, лавлах болон file usage шалгалтууд VehicleService/backend handler-т хэрэгжсэн; HTML sanitization болон auth/ACL тусдаа үлдсэн:

- Create: products + vehicles + gallery/features + files.usage өөрчлөлтийг нэг transaction-д хадгална. Update: өмнөх мөртэй merge хийж, нийлсэн эцсийн утгыг шалгаад холбоос/usage-г хамтад нь шинэчилнэ.
- Нийтлэх болон published машиныг засахад бүх заавал/нөхцөлтэй шаардлагыг шалгана. Publish action нь body-гүй ч бүртгэлээс title, main image, марк/загвар, он, техникийн шаардлага, үнэ, used гүйлт, in_stock байршил зэрэг шалгалтыг алгасахгүй.
- Зөвхөн батлагдсан шилжилт: publish draft/hidden -> published; hide published -> hidden; archive draft/hidden/published -> archived; restore archived -> hidden. FirstPublishedAt-г анх нийтлэхэд нэг удаа онооно. Нийтлэлийн төлөвийг saleStatus/arrivalStatus өөрчлөлтөөс автоматаар солихгүй.
- Лавлах байгаа эсэх, марк/загвар/хувилбарын хамаарал, шинэ/солигдсон сонголтын идэвхтэй байдал болон өмнөх идэвхгүй сонголтыг хадгалах дүрмийг DB төлөвтэй тулгана. Эцэг өөрчлөгдвөл тохирохгүй хүүхдийг цэвэрлэнэ.
- Файл бүртгэл/эх файл хүчинтэй, main/item/gallery холбоос болон usage нийцтэй байна. File metadata засвар, file upload/delete нь автомашины action биш. Холбоос салгахад эх файлыг устгахгүй.
- HTML content-ийн аюулгүй хадгалах/харуулах механизм болон Userly/ACL-ийг тусдаа хэрэгжүүлнэ. Schema string хүлээн авсан нь HTML аюулгүй болсон гэсэн үг биш.

## Шалгалт

Contract тест нь action metadata, valid/invalid query/result-ийг шалгана. Browser smoke тест dependency-тай нь in-memory browser bundle үүсгэж, Node global-гүй JavaScript context-д validation ажиллуулна. Энэ нь бодит browser E2E тестийг орлохгүй.
