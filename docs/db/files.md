# Files

- Огноо: 2026-09-12
- Төлөв: Бүтэц баталсан; Drizzle schema болон өгөгдөл хадгалах `0003_shared_files` migration бэлдсэн. Бодит DB-д энэ migration-ийг ажиллуулаагүй.
- Холбоотой: [ADR 0029](../adr/0029-use-shared-files.md), [Нэгдсэн ашиглалтын дүрэм](../features/file-management.md), [Storage тохиргоо](../operations/file-storage.md), [Product images](product-images.md), [Migration](../operations/db-migrations.md)

## Баганууд

Зураг болон бусад бүх файлын нийтлэг бүртгэл. Binary нь серверийн hard disk дээр эхээрээ байна.

| Багана | Төрөл / нөхцөл | Зориулалт |
| --- | --- | --- |
| `id` | uuid, PK, default gen_random_uuid() | Файлын танигч |
| `file_path` | text, NOT NULL, UNIQUE, хоосон биш | `ConfigFiles.FILES_ROOT`-оос харьцангуй зам; public URL эсвэл absolute path биш |
| `original_name` | text, NOT NULL | Upload үеийн нэр; дискний зам үүсгэхэд шууд ашиглахгүй |
| `title` | varchar(255), NULL | Файлын гарчиг |
| `description` | varchar(512), NULL | Файлын товч тайлбар |
| `created_at` | timestamptz, NOT NULL, default now() | Бүртгэсэн огноо |
| `updated_at` | timestamptz, NOT NULL, default now(), update trigger | Бүртгэл шинэчилсэн огноо |
| `usage` | uuid[], NOT NULL, default '{}' | Файлыг ашиглагчдын өөрсдийгөө төлөөлөх UUID key-үүд |

MIME, хэмжээ, өргөтгөл, өргөн/өндөр зэрэг нэмэлт багана оруулахгүй. Upload-ийн хэмжээ болон форматтай холбоотой шаардлагыг [нэгдсэн дүрэмд](../features/file-management.md#upload) хадгална; хэмжээний хязгаар нь DB багана шаардахгүй.

## Usage

Schema нь `uuid[]`, хоосон array default болон NOT NULL-ийг хангана; array-ийн key нь FK биш. Key нэмэх/хасах, давхардалгүй байлгах болон холбоосуудтай sync хийх transaction дүрмийн үндсэн эх сурвалж нь [File management: Usage](../features/file-management.md#usage). Автомашины VehicleService create/update нь холбоосуудтай usage-г нэг transaction-д sync хийнэ. Бусад ашиглагчийн service болон ерөнхий auto-sync trigger хэрэгжээгүй; шууд SQL өөрчлөлт usage-г автоматаар шинэчлэхгүй.

## Холбоос Ба Устгал

- `gallery_item.image_id` → `files.id`, ON DELETE RESTRICT. Gallery item-ийн usage key нь item.id; энэ module-ийн DB trigger шууд SQL болон cascade delete дээр ч usage sync хийнэ. [Gallery schema](gallery.md). Дээрх ерөнхий trigger-гүй тайлбар нь бусад хэрэглэгчид хамаарна.

- `products.main_image_id`, `products.item_image_id`, `product_images.file_id` бүгд шууд `files.id` рүү FK, ON DELETE RESTRICT.
- `usage` хоосон биш бол DB delete trigger files мөрийн устгалыг хориглоно. Usage хоосон байсан ч бодит FK үлдвэл устгахгүй.
- Metadata шинэчлэгдэхэд `files.updated_at` trigger ажиллана. Файлын агуулга солих, form save/cancel, холбоос салгах болон physical delete-ийн lifecycle нь [нэгдсэн дүрэмд](../features/file-management.md) байна.

`FileService.createUploadedFile`, `FileService.findById`, upload, sysop read endpoint болон автомашины usage sync хэрэгжсэн; бусад ашиглагчийн usage CRUD, website read route, ерөнхий delete/retry урсгал хийгдээгүй. Upload-ийн алдааны нөхөн цэвэрлэгээ болон commit reconciliation [storage зааварт](../operations/file-storage.md#upload-хэрэгжүүлэлт) байна. [File read](../features/file-management.md#file-read-route) нь `/files/:id/:originalName`, ID-аар lookup хийдэг, нэр болон access шалгахгүй public route; schema өөрчлөх шаардлагагүй. Persistence болон өөрчлөх үйлдлийн эрхийн нарийвчлал тусдаа хэвээр.

## Шилжилт

`0003_shared_files` нь хуучин `product_images`-ийн файлын багануудыг files руу хуулна. Хуучин зургийн ID = шинэ files ID; main/item утга, файлын зам/нэр/гарчиг/тайлбар/огноо хадгалагдана. Gallery-ийн ID, product ID, sort order хэвээр, `file_id` нөхөгдөнө. Дискний файл зөөхгүй, нэр өөрчлөхгүй. Хуулсны дараа хуучин metadata баганууд болон owner composite FK-г хасна.
## Page ашиглалт

`pages.main_image_id` нь files.id руу шууд заана. Page үүсгэх, зургийг солих/хасах, page устгах үед trigger нь files.usage дотор page.id-г атомикаар нэмж/хасна. Эх файл болон бусад ашиглагчийн key-г устгахгүй. JSONB доторх UUID утгуудад автомат usage tracking байхгүй. [Page schema](pages.md).
