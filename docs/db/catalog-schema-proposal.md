# Каталогийн батлагдсан schema

- Огноо: 2026-09-10
- Төлөв: Баталсан; одоогийн 24 хүснэгтийн schema болон trigger source хэрэгжсэн. `0003_shared_files` migration бэлдсэн, бодит DB-д ажиллуулаагүй; өмнөх migration-ийн төлөв [operations](../operations/db-migrations.md)-д байна.
- Баталсан огноо: 2026-09-10
- Үндэслэл: Хэрэглэгч нэгтгэсэн 22 хүснэгтийн schema, дагалдах техникийн болон эхний хувилбарын бизнес дүрмийн саналыг баталсан. Файлын анхны нэрийг холбоос хадгалах зорилгоор өөрчлөөгүй. [ADR 0023](../adr/0023-approve-catalog-schema.md).
- Батлагдсан суурь: [Products](products-schema.md), [12 лавлах + тоноглолын холбоос](reference-tables.md), [Зургийн хадгалалт](product-images.md), [Нийтлэг дүрэм](../features/product-common-rules.md)

## Батлагдсан шинэчлэл

`products.content` нь HTML хадгалах PostgreSQL `text`, nullable байна. Editor-ийн JSON хадгалахгүй. Rich text үндсэн агуулга учраас `description`-ийн 512 тэмдэгтийн хязгаар үйлчлэхгүй. Editor болон HTML sanitization сангийн сонголт тусдаа.

## Хүснэгтийн тойм

| Хүснэгт | Үүрэг | Төлөв |
| --- | --- | --- |
| `products` | Гурван төрлийн нийтлэг мэдээлэл | Логик бүтэц батлагдсан; физик нарийвчлалыг доор баталсан |
| 12 лавлах хүснэгт | Марк, загвар, ангилал, брэнд, өнгө, салбар, байршил, тоноглол | [Батлагдсан](reference-tables.md) |
| `vehicle_feature_links` | Машин ба тоноглолын холбоос | Бүтэц батлагдсан; PK/FK-г энд нарийвчлав |
| `vehicles` | Нэг бодит автомашин | Баталсан |
| `parts` | Сэлбэгийн бүтээгдэхүүн | Баталсан |
| `part_fitments` | Сэлбэгт тохирох машины хувилбарууд | Баталсан |
| `part_oem_numbers` | Сэлбэгийн олон OEM дугаар | Баталсан |
| `part_specifications` | Сэлбэгийн нэр/утга/нэгжтэй үзүүлэлт | Баталсан |
| `tires` | Дугуйн бүтээгдэхүүн, хэмжээ, индекс | Баталсан |
| `tire_markings` | Дугуйн олон нэмэлт тэмдэглэгээ | Баталсан |
| `files` | Зураг/файлын зам, metadata, ашиглагчдын UUID key | [ADR 0029](../adr/0029-use-shared-files.md)-өөр баталсан |
| `product_images` | Product ба file-ийн gallery холбоос, дараалал | 4 баганатай шинэ бүтэц баталсан |
| `admin_profiles` | Userly identity-ийн local projection | Аргачлал, багана баталсан |

Нийт **24 хүснэгт**. [ADR 0025](../adr/0025-separate-branches-and-locations.md)-аар салбар/байршил салж, [ADR 0029](../adr/0029-use-shared-files.md)-өөр files нэмэгдсэн. CRM, агуулахын үлдэгдэл/хөдөлгөөн, checkout, төлбөр, нийлүүлэлтийн batch, local password/session/role хүснэгт ороогүй. Компанийн бусад агуулгын CMS нь одоогийн каталогийн schema хүрээний гадна.

## Нийтлэг техникийн шийдвэр

- Бүх танигч UUID v4; үндсэн мөрийн ID-г DB default `gen_random_uuid()`-аар үүсгэнэ. Нэг-нэг өргөтгөлийн `product_id`-г шинээр үүсгэхгүй, product-ийн ID-г авна.
- Огноо агуулсан хүснэгтүүдэд `timestamptz`; `created_at` default `now()`, `updated_at`-ийг DB update trigger-ээр шинэчилнэ. Төрлийн мөр/хүүхэд мөр засах CRUD transaction нь `products.updated_at`-ийг мөн шинэчилнэ. `product_images` огнооны баганагүй; файлын metadata өөрчлөгдөхөд `files.updated_at` шинэчлэгдэнэ.
- Сонголтын баганууд `text + CHECK`, утгын source нь `packages/core` дахь тогтмолууд. Шинэ утга нэмэхэд DB CHECK migration-ийг хамт гаргана. TypeScript төрөл дангаараа DB constraint болохгүй.
- Ноорогт төрөл тус бүрийн бизнес талбарууд nullable. Бөглөсөн утгын төрөл, хязгаар, FK-г ноорогт ч шалгана; нийтлэх requiredness нь тусдаа. Доорх хүснэгтэд заавал гэж тусгайлан бичээгүй бизнес багана бүгд nullable.
- Дутуу optional энгийн текстийг `NULL` болгох гэж баталсан; item-ийн whitespace-only утгыг бөглөөгүй гэж үзнэ. VIN/арлын дугаарыг энэ normalization-аар хувиргахгүй, тусгай шалгалтгүй text хэвээр.
- Бизнес талбарын өөрчлөлт product-ийн төрлийг солихгүй. Анх үүсгэсэн `product_type`-ийг өөрчлөхгүй байх гэж баталсан.

Энэ хэсгийн суурь сонголтууд 2026-09-10-нд, files шинэчлэл 2026-09-12-нд батлагдсан. TypeScript schema, trigger source болон санах ойн PostgreSQL тест хэрэгжсэн. Бодит орчны төлөв: [Migration заавар](../operations/db-migrations.md). [Хөгжүүлэх заавар ба хэрэгжүүлэлтийн зааг](../operations/db-schema.md).

## Vehicles

`product_id UUID PRIMARY KEY` нь `products.id`-тай холбоотой. Доорх V дугаарууд нь [батлагдсан машины талбар](../features/vehicle-fields.md)-тай таарна. Үнэ, зураг, гарчиг, content, нийтлэлийн төлөвийг products-оос давтахгүй.

| Багана | DB төрөл | Эх талбар / холбоос |
| --- | --- | --- |
| `product_id` | uuid, PK/FK | Заавал; нэг бодит машины product |
| `brand_id` | uuid | V02 -> vehicle_brands |
| `model_id` | uuid | V03 -> vehicle_models |
| `variant_id` | uuid | V04 -> vehicle_variants |
| `manufacture_year` | smallint | V05 |
| `import_year` | smallint | V06 |
| `vin` | text | V07; nullable, unique/формат/урт/checksum шалгалтгүй |
| `body_type_id` | uuid | V08 -> vehicle_body_types |
| `fuel_type` | text | V09; батлагдсан E01 |
| `engine_capacity_cc` | integer | V10 |
| `transmission` | text | V11; E02 |
| `drivetrain` | text | V12; E03 |
| `steering_position` | text | V13; E04 |
| `exterior_color_id` | uuid | V14 -> colors |
| `interior_color_id` | uuid | V15 -> colors |
| `seat_count` | smallint | V16 |
| `condition` | text | V17; new/used |
| `mileage_km` | integer | V18 |
| `branch_id` | uuid | V19 -> branches; компанийн салбар, сонголттой |
| `location_id` | uuid | V34 -> locations; бодит байршил, in_stock нийтлэхэд заавал |
| `condition_description` | varchar(512) | V20 |
| `sale_status` | text | V24; available/sold |
| `arrival_status` | text | V25; expected/in_transit/in_stock |
| `financing_available` | boolean | V26; nullable, default false тавихгүй |

V29 тоноглол нь `vehicle_feature_links(product_id, feature_id)`-д байна. Composite PK `(product_id, feature_id)`, FK нь `vehicles.product_id`, `vehicle_features.id`. Ингэснээр сэлбэг/дугуйд машины тоноглол холбохгүй.

Батлагдсан тоон дүрэм: үйлдвэрлэсэн/импортын он 1900..тухайн он; импортын он үйлдвэрлэснээс өмнө биш; cc 1..30000; км 0..9999999; суудал 1..100. Тухайн оноос хамаарах шалгалтыг request validation-д, тогтмол хүрээ болон хоёр оны хамаарлыг DB CHECK-д хэрэгжүүлэх гэж баталсан. Бутархай input-ийг DB-д хүрэхээс өмнө буцаана.

Нийтлэх шаардлага өмнөх matrix-аар хэвээр: mark/model/year/body/fuel/drivetrain/steering/exterior color/condition/sale/arrival заавал; ICE/hybrid-д cc/transmission, used-д mileage, in_stock-д location заавал, branch сонголттой. Electric-ийн cc хоосон байна.

## Parts

| Багана | DB төрөл | Зориулалт |
| --- | --- | --- |
| `product_id` | uuid, PK/FK | Заавал; products.id |
| `category_id` | uuid | P02/P03 -> part_categories; сонгосон хамгийн нарийн ангилал |
| `brand_id` | uuid | P04 -> part_brands |
| `model_name` | varchar(255) | P05; эхний хувилбарт тусдаа лавлахгүй |
| `condition` | text | P06 |
| `sku` | text | P07; сэлбэгийн дотоод код |
| `part_number` | text | P08; үйлдвэрлэгчийн дугаар |
| `mounting_position` | text | P11; байрлалын нийлмэл код, жишээ front_left |
| `price_unit` | text | P16; нэг үнэ ямар нэгжид хамаарах |
| `package_description` | varchar(512) | P17; савлагааны агуулга, үлдэгдлийн тоо биш |
| `availability_status` | text | P18 |
| `branch_id` | uuid | P19 -> branches; компанийн нэг салбар, сонголттой |
| `location_id` | uuid | P26 -> locations; нэг бодит байршил, сонголттой |

Үндсэн/дэд ангиллын ID-г хоёул давхар хадгалахгүй; үндсэн ангиллыг category-ийн parent холбоосоор авна. Зөвхөн үндсэн ангилал сонгосон байж болно.

Нийтлэх нэмэлт шаардлага **батлагдсан**: category, brand, condition, price_unit, availability заавал; бусад нь сонголттой. SKU болон part number-ийг нийтлэхийн заавал нөхцөл болгохгүй. SKU бөглөсөн бол `parts` дотор давхцахгүй; part number глобал unique биш. Ижил гэж үзэх бизнес түлхүүр батлагдаагүй тул brand + part number-аар бүтээгдэхүүн автоматаар нэгтгэхгүй.

### Part fitments

| Багана | DB төрөл | Дүрэм |
| --- | --- | --- |
| `id` | uuid, PK | Заавал |
| `product_id` | uuid, FK | Заавал; parts.product_id |
| `brand_id` | uuid, FK | Заавал; vehicle_brands.id |
| `model_id` | uuid, FK | Заавал; vehicle_models.id, тухайн маркынх |
| `generation` | varchar(255) | Үеийн нэр; сонголттой текст |
| `body_code` | text | Кузовын код; кузовын төрлийн лавлах биш |
| `year_from` | smallint | Сонголттой оны эхлэл |
| `year_to` | smallint | Сонголттой оны төгсгөл |
| `engine_code` | text | Сонголттой хөдөлгүүрийн код |
| `description` | varchar(512) | Нийцлийн нэмэлт нөхцөл |
| `sort_order` | integer | Заавал; default 0 |

Нэг мөр нь нэг нийцлийн нөхцөл. Хоёр онтой бол `year_from <= year_to`; хоосон он/хөдөлгүүрийг бүх хувилбарт тохирно гэж ойлгохгүй. Хоосон fitment жагсаалт нь universal гэсэн үг биш. Universal тусдаа claim/автомат тохирох эсэхийн тооцоо одоохондоо нэмэхгүй байх гэж баталсан. Нэг fitment-ийг хэсэгчлэн хадгалахгүй; product өөрөө fitment-гүй ноорог байж болно.

### Part OEM numbers

`part_oem_numbers`: `id UUID PK`, `product_id UUID FK -> parts.product_id`, `oem_number text NOT NULL`, `sort_order integer NOT NULL default 0`.

Нэг product дотор `(product_id, oem_number)` давхцахгүй; өөр сэлбэгт ижил OEM дугаар байж болно. Дугаар дахь эхний тэг, тэмдэгтийг хадгална; тоон төрөлд хувиргахгүй.

### Part specifications

`part_specifications`: `id UUID PK`, `product_id UUID FK -> parts.product_id`, `name varchar(255) NOT NULL`, `value text NOT NULL`, `unit varchar(255) NULL`, `sort_order integer NOT NULL default 0`.

Энэ нь зөвхөн сэлбэгийн нэмэлт үзүүлэлтийн жагсаалт. Каталогийн үндсэн шүүлтүүдийг generic name/value бүтэц рүү шилжүүлэхгүй. `value` нь товч description биш учраас 512 хязгаар автоматаар хэрэглэхгүй.

## Tires

| Багана | DB төрөл | Эх талбар / зориулалт |
| --- | --- | --- |
| `product_id` | uuid, PK/FK | Заавал; products.id |
| `brand_id` | uuid | T02 -> tire_brands |
| `model_id` | uuid | T03 -> tire_models |
| `sku` | text | T04 |
| `manufacturer_code` | text | T05 |
| `condition` | text | T06 |
| `width_mm` | integer | T07; метр хэмжээнд |
| `aspect_ratio` | numeric(5,2) | T08; хувь |
| `rim_diameter_inch` | numeric(5,2) | T09; бутархай инч хадгалж болно |
| `construction` | text | T10 |
| `size_label` | text | T11; үйлдвэрлэгчийн бүрэн тэмдэглэгээ |
| `season` | text | T12 |
| `vehicle_application` | text | T13 |
| `tread_type` | text | T14 |
| `load_index` | text | T15; хос индексийг алдахгүй, кг биш |
| `speed_index` | text | T16; үйлдвэрлэгчийн тэмдэглэгээ |
| `load_marking` | text | T17; XL/HL зэрэг эх тэмдэглэгээ |
| `is_run_flat` | boolean | T18; nullable, default false тавихгүй |
| `stud_type` | text | T19 |
| `price_unit` | text | T24 |
| `package_description` | varchar(512) | T25 |
| `availability_status` | text | T26 |
| `branch_id` | uuid | T27 -> branches; компанийн нэг салбар, сонголттой |
| `location_id` | uuid | T34 -> locations; нэг бодит байршил, сонголттой |

SKU бөглөсөн бол `tires` дотор давхцахгүй; parts-тай global uniqueness шаардахгүй байх гэж баталсан. Үйлдвэрлэгчийн код болон хэмжээний тэмдэглэгээ unique биш. Numeric талбарт бөглөсөн утга эерэг, finite байна; ratio 0-ээс их, 100-аас ихгүй байх гэж баталсан. Баганын precision-оос илүү оронтой input-ийг автоматаар тоймлохгүй, validation-аар буцаана.

Нийтлэх нэмэлт шаардлага **батлагдсан**: brand, model, condition, size_label, season, price_unit, availability заавал. Метр хэмжээний эхний хүрээнд width/aspect/rim/construction мөн заавал. Бүрэн тэмдэглэгээг гараар оруулж эх утгаар хадгална; parser болон бусад хэмжээг таамгаар үүсгэхгүй.

Эхний хувилбарт нэг ижил хэмжээ/үзүүлэлттэй дугуйн бүтээгдэхүүн, түүний ижил хэмжээтэй хос/иж бүрдлийг дэмжих гэж баталсан. Метр бус хэмжээ, урд/хойд өөр хэмжээтэй багц, ширхэг бүрийн хуучин дугуйн элэгдэл/DOT/үйлдвэрлэсэн огноог энэ бүтэц бүрэн загварчлахгүй; шаардлагатай бол тусад нь өргөтгөнө. Эдгээрийг `package_description`-д бичээд бүх ширхэг нэг үзүүлэлттэй гэж үзэхгүй.

### Tire markings

`tire_markings`: `id UUID PK`, `product_id UUID FK -> tires.product_id`, `marking text NOT NULL`, `description varchar(512) NULL`, `sort_order integer NOT NULL default 0`.

T20-ийн үйлдвэрлэгчийн нэмэлт тэмдэглэгээ бүр нэг мөр; жишээ нь 3PMSF, M+S, OE код. `(product_id, marking)` давхцахгүй; энэ нь admin-managed лавлах эсвэл автоматаар баталгаажсан claim биш. Кодыг эхээр нь хадгална.

## Сэлбэг/дугуйн тогтмол утгууд

Энэ хүснэгтийн утгууд өмнөх enum бүлгийг нарийвчилж **батлагдсан**. Төрлүүдийн ялгаатай бүлгийг автоматаар нэгтгэхгүй.

| Бүлэг | Баталсан утга |
| --- | --- |
| Сэлбэг condition | new, used, refurbished |
| Дугуй condition | new, used; used-ийн ширхэг/багцын нарийвчлал батлагдтал used нийтлэхийг нээхгүй байх дүрэм |
| Сэлбэг mounting_position | front, rear, left, right, front_left, front_right, rear_left, rear_right; хамаарахгүй/тодорхойгүй үед NULL |
| Сэлбэг/дугуйн price_unit | piece, pair, set |
| Сэлбэг/дугуйн availability_status | in_stock, out_of_stock, incoming |
| Дугуй construction | radial, bias |
| Дугуй season | summer, winter, all_season |
| Дугуй vehicle_application | passenger, suv, light_truck |
| Дугуй tread_type | highway, all_terrain, mud_terrain |
| Дугуй stud_type | studded, studdable, non_studded |

Бодит бараанд жагсаалтад багтаагүй сонголт гарвал тааж ойролцоо утга оноохгүй, нийтлэхээс өмнө сонголтыг өргөтгөж батална. Тоо ширхэгийн үлдэгдэл хөтлөхгүй, бэлэн байдлын төлөвийг admin удирдана. Availability нь publication status-ийг автоматаар солихгүй.

## Product images

[Product images](product-images.md) нь `id`, `product_id`, `file_id`, `sort_order` гэсэн 4 баганатай. Бүгд NOT NULL; sort_order default 0, сөрөг биш; `(product_id, file_id)` UNIQUE. Metadata болон timestamp энд байхгүй.

[Files](files.md) нь `id`, `file_path`, `original_name`, `title`, `description`, `created_at`, `updated_at`, `usage uuid[]` гэсэн 8 баганатай. Title/description nullable; usage default хоосон array. Багана/нөхцөл files баримтад, usage transaction болон upload-ийн үндсэн эх сурвалж [нэгдсэн дүрэмд](../features/file-management.md) байна.

Main/item ID шууд `files.id` рүү FK; gallery-д заавал байх шаардлагагүй. Нэг файлыг олон product ашиглаж болно. Өмнөх product owner composite FK хүчингүй. Gallery холбоос устгах нь файлыг устгахгүй; usage хоосон биш эсвэл FK үлдсэн файлыг DB устгахгүй. Үндсэн зураг нийтлэхэд заавал, item fallback болон gallery render дүрэм хэвээр.

Upload нь product-оос хамааралгүй; бүрэн upload хийсэн файлыг files-д бүртгэж дараа нь хэрэглээнд холбоно. Формат, decode, браузерын дэмжлэг шалгахгүй. Upload/serve, usage sync, disk cleanup хэрэгжүүлэлт тусдаа.

## Admin profiles

| Багана | DB төрөл | Дүрэм |
| --- | --- | --- |
| `id` | uuid, PK | Заавал; local reference |
| `userly_sub` | text, UNIQUE | Заавал; баталгаажсан Userly identity-ийн stable sub |
| `display_name` | varchar(255) | Nullable; баталгаажсан identity-оос sync |
| `email` | text | Nullable; identity-оос sync; UNIQUE болон identity key биш |
| `created_at` | timestamptz | Заавал; default now() |
| `updated_at` | timestamptz | Заавал; update trigger |

Зөвшөөрөгдсөн identity-ийн анхны хандалтаар sub-аар idempotent upsert хийнэ. Password, access token, refresh token, session, role, permission policy болон ACL snapshot хадгалахгүй. Profile мөр байгаа нь эрх олгохгүй; Userly access цуцлагдвал local reference-г устгахгүй. Scope mapping, local metadata, created_by/updated_by ownership болон security audit persistence-ийг зохиомлоор нэмээгүй; шаардлагатай үед тусад нь батална.

## Нэг-нэг холбоос ба нийтлэх шалгалт

Шийдвэр: products мөр болон өөрийн төрлийн өргөтгөлийн мөрийг нэг transaction-д үүсгэнэ. Өргөтгөлийн PK нь product_id. Өөр төрлийн хүснэгтэд зэрэг орох, дэлгэрэнгүй мөргүй product commit хийхийг хориглоно.

DB хамгаалалтын шийдвэр: `products(id, product_type)` unique; өргөтгөл бүрд системийн тогтмол discriminator `product_type` багана (vehicle/part/tire), CHECK болон composite FK `(product_id, product_type)`. Энэ нэмэлт нь хэрэглэгч бөглөх бизнес талбар биш. PK нь давхардлыг, discriminator нь буруу төрлийг хаана; FK дангаараа дэлгэрэнгүй мөр заавал байхыг батлахгүй.

Заавал нэг дэлгэрэнгүй мөртэй байх дүрмийг commit үеийн deferred constraint trigger-ээр, өөрчлөлтөд product мөрийг lock хийж шалгах гэж баталсан. Триггер product болон гурван өргөтгөлийн insert/update/delete-ийг хамарч, өрсөлдөх transaction, rollback, dump/restore тест шаарддаг. Migration хэрэгжүүлэхээс өмнө энэ механизмыг тусад нь шалгана.

Марк/model, model/variant, tire brand/model болон fitment brand/model-ийг composite FK + шаардлагатай parent-not-null CHECK-ээр хамгаална. Идэвхгүй эсэхийг FK condition болгохгүй; өмнөх идэвхгүй сонголт хадгалагдах батлагдсан дүрмийг өөрчлөхгүй.

Нийтлэх болон published мэдээлэл засах ажиллагаа shared DB CRUD transaction-д бүтээгдэхүүн ба child мөрүүдийг хамтад нь шалгана. Нэг мөрийн range/enum дүрмийг DB CHECK-д, хүснэгт дамнасан publication дүрмийг shared validator/transaction-д байрлуулах гэж баталсан. Бүх дүрмийг энгийн CHECK-ээр баталгаажуулсан гэж үзэхгүй. [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).

## Index ба устгах дүрэм

- Products: `(product_type, first_published_at DESC, id)` зөвхөн published мөрүүдэд; `(product_type, price, id)` published + show_price мөрүүдэд. Ижил эрэмбэд id-г tie-breaker болгоно.
- Vehicles: `(brand_id, model_id)`, `manufacture_year`, `mileage_km`, `sale_status`; бусад FK баганад шаардлагатай index. Бүх filter-ийн комбинацид нийлмэл index нэмэхгүй.
- Parts: category_id, brand_id, nullable SKU unique, part_number; fitment brand/model, OEM number хайлтын index.
- Tires: brand/model, `(width_mm, aspect_ratio, rim_diameter_inch)`, season, nullable SKU unique.
- Child хүснэгтүүд: parent/product_id индекс; зурагт `(product_id, sort_order, id)`. Vehicle feature link-ийн reverse хайлтад feature_id индекс.
- Лавлахын нэрийг trim + case-insensitive харьцуулах, тухайн эцгийн хүрээнд unique index ашиглах гэж баталсан. Үндсэн part category-д parent_id IS NULL гэсэн тусдаа unique index хэрэгтэй. Хадгалах нэрийг lower-case болгож өөрчлөхгүй.
- Generic text-search index/extension-ийг substring/full-text хайлтын хэлбэр батлагдсаны дараа сонгоно. Index-үүдийг бодит query plan-аар хэмжиж нарийвчилна.
- Product-д эхний хувилбарт hard delete хийхгүй; батлагдсан archived төлөв ашиглана, deleted_at давхар нэмэхгүй байх гэж баталсан. Лавлах руу FK delete action RESTRICT. Зураг болон child мөрийн устгал shared CRUD-ийн хяналттай байна.

## Баталгаажуулалтын зааг

Сэлбэг/дугуйн нэг салбар, метр хэмжээтэй дугуй, ижил хэмжээтэй багц, SKU-ийн төрөл тус бүрийн uniqueness болон тусгай нийтлэх шаардлагыг энэ schema-ийн хамт баталсан. Доорх хүрээнээс гадуурх боломж болон хэрэгслийн сонголтыг батлаагүй.

Used дугуйн ширхэг/багц, mixed-size set, олон салбарын хуваарилалт, нэмэлт сэлбэгийн лавлахыг одоогийн 24 хүснэгт бүрэн дэмждэг гэж амлахгүй. Хэрэгтэй бол хүснэгтийн тоо өөрчлөгдөнө. Seed, frontend editor, HTML sanitizer, upload/serve tooling болон production тохиргоо schema-ийн энэ баталгаагаар сонгогдохгүй.

HTML-г шууд итгэж render хийхгүй; хадгалах/харуулах урсгалд аюулгүй HTML sanitization төлөвлөнө. Энэ нь зураг файл өөрчлөх тухай биш. [OWASP HTML sanitization](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).

PostgreSQL integer/numeric төрөл болон precision-ийн суурийг [албан ёсны тайлбартай](https://www.postgresql.org/docs/current/datatype-numeric.html) тулгасан. Одоогийн 24 хүснэгтийн schema нь эхний 22 хүснэгт дээр locations, files нэмсэн бүтэц. Trigger source нь нийтлэх requiredness-ийг commit дээр нэмэлтээр шалгана; каталогийн shared CRUD/request validator-ийн бүрэн хэрэгжүүлэлт хийгдээгүй. Migration-ийн орчны төлөвийг operations баримтаас харна.
