# Лавлах Seed

- Огноо: 2026-09-12
- Төлөв: Хэрэглэгчийн зөвшөөрлөөр эхний суурь жагсаалт, runner, команд болон тест бэлдсэн. Бодит DB-д ажиллуулаагүй.
- Эзэмшил: [ADR 0014](../adr/0014-use-bigmotors-scope-and-db-owned-migrations.md), [лавлах хүснэгтүүд](../db/reference-tables.md).

## Агуулга

Өгөгдөл: [src/seeds/data.ts](../../packages/db/src/seeds/data.ts). Энэ нь дэлхийн бүх марк, загвар, хувилбарын бүрэн каталог биш. BigMotors эдгээр брэндийг худалдаалдаг гэсэн баталгаа биш; каталог бүртгэхэд ашиглах суурь сонголтууд юм. Үйлдвэрлэсэн он, зах зээл, хөдөлгүүр болон тоноглолын нийцлийг seed автоматаар тогтоохгүй.

| Лавлах | Тоо | Хүрээ |
| --- | ---: | --- |
| `colors` | 14 | Үндсэн өнгө, дэлгэцийн жишиг HEX; үйлдвэрийн будгийн код биш |
| `vehicle_body_types` | 12 | Кузовын төрөл |
| `vehicle_features` | 34 | Нийтлэг тоноглол; машинд автоматаар холбохгүй |
| `vehicle_brands` | 14 | Автомашины марк |
| `vehicle_models` | 79 | Марктай холбоотой загвар; одоо болон өмнө үйлдвэрлэгдсэн нэрс |
| `vehicle_variants` | 3 | Toyota Land Cruiser 250-ийн Япон зах зээлийн 2024 GX, VX, ZX |
| `part_categories` | 68 | 13 үндсэн, 55 дэд ангилал |
| `part_brands` | 4 | DENSO, AISIN, Bosch, KYB |
| `tire_brands` | 3 | Bridgestone, Michelin, Yokohama |
| `tire_models` | 10 | Брэндтэй холбоотой загвар/цуврал |
| `branches` | 0 | Бодит мэдээлэл хүлээж байгаа |
| `locations` | 0 | Бодит мэдээлэл хүлээж байгаа |
| **Нийт** | **241** | |

`companySeeds` массив нь салбар, байршил оруулах бэлэн хэсэг. Компанийн зөвшөөрсөн нэр ирэхэд `branches`-д 8001-8999, `locations`-д 9001-9999 хүрээний давхцахгүй key нэмнэ. Эдгээр хоёр лавлах хоорондоо эцэг/хүүхдийн холбоогүй. Түр нэртэй салбар, байршил болон бодит бус компани үүсгэхгүй.

Enum/const, бүтээгдэхүүн, хэрэглэгч/ACL, файл, тоноглолын холбох хүснэгтэд өгөгдөл оруулахгүй. Schema өөрчлөхгүй; migration үүсгэхгүй.

## Ажиллуулах

Root-оос, migration-ууд хэрэгжсэн DB дээр:

```powershell
pnpm build:db
pnpm db:seed
```

`packages/db` дотроос мөн `pnpm db:seed` ажиллана. Runner нь `dist/seed.mjs`, холболт нь `DBConfig.DATABASE_URL`. Local файл нь `packages/db/.env`; OS environment давуу. Build өгөгдлийг bundle-д оруулдаг тул seed жагсаалт өөрчилсний дараа дахин build хийнэ.

Хоосон эсвэл reset хийсэн DB бол эхлээд `pnpm db:migrate`, дараа нь `pnpm db:seed`. Seed нь migration/reset/seed generate үйлдлийг автоматаар хийхгүй. App startup болон migration command seed дуудахгүй.

Production-д шалгасан DB image-ийн командыг тусад нь сонгож ажиллуулж болно:

```powershell
docker run --rm --env DATABASE_URL bigmotors-db-migrate:release node dist/seed.mjs
```

Image-ийг шинэ кодоор build хийсэн, DB network/credential тохируулсан байх шаардлагатай. Image-ийн default command migration хэвээр. Seed-д зөвхөн шаардлагатай лавлахын SELECT/INSERT болон row lock-д шаардлагатай UPDATE эрх өгнө; schema үүсгэх эрх хэрэггүй. Production image-ийн шинэ seed командыг бодит орчинд туршаагүй.

## Давтан Ажиллуулах

- Нэг transaction ашиглана. Аль нэг алхам алдаатай бол тухайн run-ийн бүх нэмэлт буцна; raw connection string болон driver error хэвлэхгүй.
- Тусдаа seed transaction lock авна. Migration/reset болон өөр төрлийн schema өөрчлөлттэй зэрэг ажиллуулахгүй.
- `key`-гээс тогтмол UUID гаргана. Key-г дахин дугаарлах, өөр бичлэгт дахин ашиглахгүй; нэр засахад key хэвээр байна.
- Эхлээд ID, дараа нь нэрийн `lower(btrim(name))` болон эцгийн хүрээгээр байгаа мөрийг олно. Шинээр нэмэхдээ constraint conflict-ийг `ON CONFLICT DO NOTHING`-оор шийднэ.
- Байгаа мөрийн нэр, тайлбар, HEX, дараалал, идэвхтэй төлөв, timestamp болон ID-г өөрчлөхгүй. Seed-ийн нэрийг засах нь өмнөх мөрийг шинэчлэх үйлдэл биш; admin дээр засна.
- Seed-ээр үүссэн мөрийг admin нэрлэж өөрчилсөн ч тогтмол ID-аар олно. Харин өмнө гараар үүсгэсэн мөрийг нэрээр нь ашигласан бол дараа нь нэр солиход seed-тэй холбоог тогтоох тусдаа mapping байхгүй; seed дахин хуучин нэрээр мөр нэмэх боломжтой. Ийм өөрчлөлтөд жагсаалтыг мөн шинэчилнэ.
- Марк -> загвар -> хувилбар, дугуйн брэнд -> загвар, ангиллын эцэг -> хүүхэд дарааллаар ажиллана. Одоо байгаа эцгийн бодит ID-г хэрэглэнэ.
- Идэвхгүй эцэг эсвэл дээд эцэгтэй салбарын бүх хүүхдийг алгасана. Өмнөх холбоосыг хадгална; дахин идэвхжүүлэхгүй. Алгассан тоог тайланд харуулна.
- Тогтмол ID-тай мөр өөр эцэгт холбогдсон байвал засаж зөөхгүй, run-ийг алдаатай буцаана.
- Байхгүй мөрийг нэмж оруулдаг тул seed-ээр оруулсан мөрийг устгавал дараагийн run дахин нэмнэ. Дахин нэмүүлэхгүй бол идэвхгүй болгох эсвэл seed жагсаалтаас хасна.
- Шинэ мөрийн `sort_order=0`, `is_active=true`; огноо DB default-аас авна. Төгсгөлд хүснэгт бүрийн `inserted`, `existing`, `skipped` тоог харуулна.

## Эх Сурвалж

Загварын нэр болон цувралын түвшнийг лавласан эх сурвалжууд; seed ажиллах үед сүлжээнээс өгөгдөл татахгүй:

- Toyota загварууд: [Toyota global gallery](https://global.toyota/en/mobility/toyota-brand/gallery/).
- GX/VX/ZX хувилбар: [Toyota Land Cruiser 250-ийн 2024 танилцуулга](https://global.toyota/jp/newsroom/toyota/40643833.html). Бусад загварт хувилбар тааж нэмээгүй.
- Bridgestone-ийн 6 нэр нь загварын дэд код биш, цувралын түвшний нэр: [Bridgestone tire brands](https://tires.bridgestone.com/en-us/automotive/tire-brand).
- Michelin-ийн 2 загвар: [Michelin каталог](https://www.michelinman.com/auto/browse-tires/all-tyres).
- Yokohama: [GEOLANDAR A/T G015](https://www.yokohamatire.com/tires/geolandar-a-t-g015), [iceGUARD G075](https://www.yokohamatire.com/tires/iceguard-g075).
- Сэлбэг: [DENSO](https://www.denso-am.eu/), [AISIN](https://aisinaftermarket.com/products), [Bosch](https://www.boschaftermarket.com/xrm/media/images/parts/filters_1/pdf_32/bosch_filters_brochure.pdf), [KYB](https://www.kyb.com/products/).

Өнгө, кузов, тоноглол, ангилал нь төслийн эхний ангиллын санал бөгөөд үйлдвэрлэгчийн бүрэн ангиллыг хуулсан биш. Нийцэл, баталгаа болон аюулгүй ажиллагааны үзүүлэлт seed-д байхгүй.

## Шалгалт

`test/seeds.test.ts` нь тусгаарласан PGlite DB болон одоогийн DI test adapter ашиглана. Бүх суурь өгөгдөл, давтан run, нэр/HEX/идэвх/огноог хадгалах, одоо байгаа нэр ба эцгийн ID-г ашиглах, олон түвшний идэвхгүй эцэг, тусдаа эцэгтэй ижил нэр, алдааны transaction rollback болон credential-гүй CLI-г шалгана. Бодит PostgreSQL-ийн олон session зэрэг ажиллах нөхцөл тусдаа integration шалгалт шаардлагатай.
