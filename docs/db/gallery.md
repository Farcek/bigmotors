# Gallery schema

- Огноо: 2026-09-12. Хэрэглэгчийн хүсэлтээр шинэ тусдаа module.
- Код: `packages/db/src/schema/gallery.ts`, CRUD: `GalleryService` (DI).
- Migration: `0002_gallery.sql`. Хоёр хүснэгт болон timestamp/usage trigger нэмнэ; хуучин өгөгдөл хувиргахгүй.
- 2026-09-13: `0005_gallery_key.sql` нь unique key нэмнэ. Одоо байгаа мөрүүдэд `gallery-<id>` утга нөхөөд NOT NULL/UNIQUE constraint тавина. Gallery/item болон file холбоос устахгүй.
- 2026-09-13: `0006_gallery_item_links.sql` нь item бүрийн optional холбоосын хоёр багана нэмнэ. Хуучин мөрүүдэд NULL; өгөгдөл болон зураг өөрчлөхгүй.

## Gallery

SQL нэр: `gallery`. TypeScript export: `gallery`.

| Талбар | Төрөл | Дүрэм |
| --- | --- | --- |
| id | uuid | PK, автоматаар үүснэ |
| key | varchar(255) | Required, trim хийсний дараа хоосон биш, UNIQUE; том/жижиг үсэг ялгана |
| name | varchar(255) | Required, trim хийсний дараа хоосон биш |
| desc | varchar(512) | Nullable, хоосон string-ийг null болгоно |
| created | timestamptz | Required, default now() |
| updated | timestamptz | Required, default now(), update trigger |

## Gallery Item

SQL нэр: `gallery_item`. TypeScript export: `galleryItem`.

| Талбар | Төрөл | Дүрэм |
| --- | --- | --- |
| id | uuid | PK, автоматаар үүснэ |
| gallery_id | uuid | Required FK → gallery.id, ON DELETE CASCADE |
| sort_order | integer | Required, default 0, signed 32-bit integer |
| created | timestamptz | Required, default now() |
| updated | timestamptz | Required, default now(), update trigger |
| title | varchar(255) | Nullable |
| label | varchar(255) | Nullable |
| desc | varchar(512) | Nullable |
| image_id | uuid | Required FK → files.id, ON DELETE RESTRICT |
| link_url | varchar(2048) | Nullable; дотоод `/...` зам эсвэл http/https URL |
| link_label | varchar(255) | Nullable; холбоосын энгийн текст, HTML editor биш |

API дээр `galleryId`, `sortOrder`, `imageId`, `linkUrl`, `linkLabel` camelCase байна. `desc`, `created`, `updated` нэрийг хүсэлтийн дагуу хэвээр хадгална. Огноо JSON дээр ISO string.

Холбоосын талбарууд trim хийгдэж, хоосон утга NULL болно. Хосоор бөглөх шаардлагагүй. Service/DTI нь script/data scheme, `//` URL, backslash, control/space тэмдэгт болон credential-тэй URL зөвшөөрөхгүй. HomeCarousel-д item-ийн холбоос болгон ашиглана; [render дүрэм](../features/website-routing.md#homecarousel).

## Холбоос ба бүрэн бүтэн байдал

- `gallery_item(gallery_id, sort_order, id)` дарааллын индекс, `image_id` FK индекс.
- Item-ийн эрэмбэ `sort_order ASC, id ASC`; ижил дараалал зөвшөөрнө. Admin form-оос sort_order-ийг засна.
- Gallery-ийн нэр болон image_id давхцахыг хориглоогүй. Нэг файлыг олон item/gallery ашиглаж болно.
- Gallery `key` нь давхцахгүй. API/service захын зайг trim хийнэ; lowercase болон slug формат шаардахгүй. Засаж болно; давхардсан create/update нь `GALLERY_KEY_CONFLICT` (409). UUID id болон item холбоос өөрчлөгдөхгүй.
- `GalleryService.findByKey(key)` нь яг тэнцүү, том/жижиг үсэг ялгасан key-ээр нэг Gallery олно. Байхгүй бол `GALLERY_NOT_FOUND`. Website нүүр хуудас `home` key-г ашиглана; admin-ийн UUID route-ууд хэвээр.
- `files.usage`-д ашиглагчийн key нь **gallery_item.id**, gallery.id биш.
- Item нэмэх/зураг солих/устгах, gallery cascade delete хийхэд DB trigger usage-г тухайн transaction дотроо sync хийнэ. Бусад ашиглагчийн key-г хадгална; файлын lock-ийг UUID дарааллаар авна.
- Item өөрчлөгдөхөд gallery.updated мөн шинэчлэгдэнэ. Item-ийн id болон gallery_id өөрчлөхгүй.
- Admin болон service/API-ийн edit үйлдлээр image_id-г солихгүй. Зураг өөрчлөхөд хуучин item-ийг устгаж шинээр нэмнэ; PATCH нь title, label, desc, sort_order, link_url, link_label авна. Өмнөх migration өөрчлөгдөөгүй.
- Gallery/item устгах нь холбоосын устгал; эх file row, disk файлыг устгахгүй. Upload хийсний дараа form цуцалсан бол файл usage-гүй хадгалагдана.
- Файлын MIME, өргөтгөл, browser харуулж чадах эсэхийг шалгахгүй. Нийтлэг upload/read дүрмийг дагана.
- Нийтлэх төлөв, slug, website placement болон public gallery API энэ module-д нэмээгүй.

Admin/API ажиллагаа: [Gallery удирдлага](../features/admin-gallery.md).
