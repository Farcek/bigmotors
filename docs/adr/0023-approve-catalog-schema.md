# 0023: Каталогийн нэгтгэсэн schema-г батлах

2026-09-10: [ADR 0025: Салбар ба бүтээгдэхүүний байршлыг салгах](0025-separate-branches-and-locations.md) нь өмнөх салбар/байршлыг нэгтгэсэн хэсгийг орлоно. Бусад шийдвэр хэвээр.

- Огноо: 2026-09-10
- Төлөв: Хэсэгчлэн орлуулсан; салбар/байршил ADR 0025, файлын бүтэц/эзэмшил [ADR 0029](0029-use-shared-files.md)-өөр шинэчлэгдсэн. Бусад шийдвэр хэвээр.
- Холбоотой баримт: [Каталогийн schema](../db/catalog-schema-proposal.md), [Products](../db/products-schema.md), [Лавлах](../db/reference-tables.md), [Зураг](../db/product-images.md), [ADR 0019](0019-use-userly-admin-authentication-and-acl.md)

## Нөхцөл байдал

Хэрэглэгч `products`, лавлах, зургийн хадгалалтын өмнөх шийдвэрүүд дээр тулгуурласан үлдсэн хүснэгтүүдийн саналыг бүхэлд нь баталсан.

## Харьцуулсан хувилбарууд

- Бүх бүтээгдэхүүний мэдээллийг нэг өргөн хүснэгтэд хадгалах: төрөл тус бүрийн өгөгдөл, nullable талбар болон хамаарал холилдоно.
- Нийтлэг products, төрлийн нэг-нэг өргөтгөл, олон утгад child хүснэгт: батлагдсан 22 хүснэгтийн бүтэц; transaction болон холбоосын хяналт шаарддаг.

## Шийдвэр

Хоёр дахь хувилбарыг сонгосон. Хүснэгт/багана болон бизнес шаардлагын үндсэн эх сурвалж нь DB schema баримт; энэ ADR-д давхар жагсаахгүй.

Техникийн сонголт: UUID v4, DB default `gen_random_uuid()`; огноо `timestamptz`, created_at default now(), updated_at DB trigger; тогтмол сонголт text + CHECK; subtype PK/composite FK/discriminator болон ганц өргөтгөлийн мөрийг хамгаалах deferred constraint trigger/transaction. HTML content нь nullable text байна.

Лавлахын нэр trim + case-insensitive, эцгийн хүрээнд давхардалгүй; сэлбэг/дугуйн SKU өөрийн хүснэгтдээ unique. Нийтлэх validation shared CRUD transaction-д; тогтмол range/enum хязгаар DB CHECK-д байна. Эхний индекс, архивлах болон зураг устгах дарааллыг нэгтгэсэн schema-ийн дагуу хэрэгжүүлнэ.

Сэлбэг/дугуйн эхний хүрээ нь нэг салбар, агуулахын тоогүй каталог; дугуйн метр хэмжээ, ижил хэмжээтэй хос/иж бүрдэл. Used дугуйн нарийвчлал батлагдтал used нийтлэхгүй. Нэмэлт бизнес боломжийг автоматаар батлаагүй.

## Үр дагавар

- Schema баримт батлагдсан боловч SQL/Drizzle, migration, seed болон runtime integration хийгдээгүй.
- Product/image ownership, parent-child хамаарал, concurrency, rollback болон backup/restore-ийн тест хэрэгтэй.
- Text search хэлбэр/индекс, seed өгөгдөл, HTML sanitizer/editor, upload/serve tooling, audit persistence болон scope mapping тусдаа шийдвэр хэвээр.
- Local profile нь Userly identity projection; password, token/session, role/permission policy болон CRM хадгалахгүй.
- TASK-04-ийн schema-тэй холбоотой техникийн хэсгийг нарийвчилсэн; driver/pool, package API, migration/seed workflow зэрэг үлдсэн шийдвэрийг бүхэлд нь батлаагүй.
