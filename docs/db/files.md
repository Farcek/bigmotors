# Files

- Огноо: 2026-09-12
- Төлөв: Бүтэц баталсан; Drizzle schema болон өгөгдөл хадгалах `0003_shared_files` migration бэлдсэн. Бодит DB-д энэ migration-ийг ажиллуулаагүй.
- Холбоотой: [ADR 0029](../adr/0029-use-shared-files.md), [Product images](product-images.md), [Migration](../operations/db-migrations.md)

## Баганууд

Зураг болон бусад бүх файлын нийтлэг бүртгэл. Binary нь серверийн hard disk дээр эхээрээ байна.

| Багана | Төрөл / нөхцөл | Зориулалт |
| --- | --- | --- |
| `id` | uuid, PK, default gen_random_uuid() | Файлын танигч |
| `file_path` | text, NOT NULL, UNIQUE, хоосон биш | Upload root-оос харьцангуй зам; public URL эсвэл absolute path биш |
| `original_name` | text, NOT NULL | Upload үеийн нэр; дискний зам үүсгэхэд шууд ашиглахгүй |
| `title` | varchar(255), NULL | Файлын гарчиг |
| `description` | varchar(512), NULL | Файлын товч тайлбар |
| `created_at` | timestamptz, NOT NULL, default now() | Бүртгэсэн огноо |
| `updated_at` | timestamptz, NOT NULL, default now(), update trigger | Бүртгэл шинэчилсэн огноо |
| `usage` | uuid[], NOT NULL, default '{}' | Файлыг ашиглагчдын өөрсдийгөө төлөөлөх UUID key-үүд |

MIME, хэмжээ, өргөтгөл, өргөн/өндөр зэрэг нэмэлт багана оруулахгүй. Формат, decode, браузерын дэмжлэг шалгахгүй; хөрвүүлэхгүй. Зургийн тоонд бүтээгдэхүүний түвшний дээд хязгааргүй.

## Usage

- Ашиглагч өөрийн тогтвортой UUID key-г өгнө. Ашиглахдаа нэмнэ, ашиглахаа бүрэн болихдоо хасна; `usage` нь тоолуур биш.
- Нэг key-г давхар нэмэхгүй. Нэмэх/хасах ажиллагаа давтан дуудахад ижил үр дүнтэй байна.
- Нэг ашиглагч ижил файлыг main, item, gallery-д зэрэг ашиглавал нэг key хангалттай. Нэг холбоос салсан ч бусад холбоос үлдвэл key-г хасахгүй.
- Холбоосын өөрчлөлт ба usage шинэчлэл нэг DB transaction-д байна. Ижил ашиглагчийн зэрэгцээ өөрчлөлтийг serialize хийж, file мөрийн usage-г atomic SQL-аар шинэчилнэ; app дээр хуучин array уншаад бүхлээр нь дарж бичихгүй.
- `usage`-ийн key нь өөр өөр төрлийн ашиглагчийг төлөөлж болох тул FK биш. Key байгаа нь хандах эрх олгохгүй.
- Каталогийн migration нь хуучин зураг бүрийн `product_id`-ийг usage key болгон нэг удаа нөхнө. Каталогийн цаашдын холбоосын ажиллагаа мөн product ID ашиглана; бусад ашиглагч өөрийн UUID-г хэрэглэнэ.

Schema нь `uuid[]`, default болон NOT NULL-ийг хангана. Key нэмэх/хасах, давхардалгүй байлгах, холбоосуудтай sync хийх нь цаашдын shared CRUD-ийн үүрэг; одоогоор auto-sync service/trigger хэрэгжээгүй.

## Холбоос Ба Устгал

- `products.main_image_id`, `products.item_image_id`, `product_images.file_id` бүгд шууд `files.id` рүү FK, ON DELETE RESTRICT.
- Нэг файлыг олон product болон бусад ашиглагч хамтран хэрэглэж болно. `title`, `description` нь файлд харьяалагдах тул өөрчлөлт нь бүх хэрэглээнд адил харагдана; product бүрийн тусдаа caption биш.
- Gallery холбоос устгах нь files мөр болон дискний файл устгахгүй. Main/item нь gallery мөргүй файл зааж болно.
- `usage` хоосон биш бол DB delete trigger files мөрийн устгалыг хориглоно. Usage хоосон байсан ч бодит FK үлдвэл устгахгүй.
- Бүх холбоос салгаж, usage-г цэвэрлэсний дараа files мөрийг transaction-д устгана; commit-ийн дараа дискний файл устгана. Нийтлэгдсэн product-ийн main зураг заавал байх дүрэм хэвээр.
- Файлын upload нь product-оос хамааралгүй; эхлээд бүрэн бичиж дууссан файлыг files-д бүртгээд дараа нь хэрэглээнд холбоно. Upload/DB insert алдааны нөхөн цэвэрлэгээ, commit-ийн дараах disk delete retry шаардлагатай.

Upload endpoint, usage CRUD, file serve/access, cleanup/retry одоогоор хэрэгжээгүй. `usage=[]` гэдгээр файлыг автоматаар цэвэрлэхгүй. Disk root, upload/serve сан болон access бодлого тусдаа шийдвэр хэвээр.

## Шилжилт

`0003_shared_files` нь хуучин `product_images`-ийн файлын багануудыг files руу хуулна. Хуучин зургийн ID = шинэ files ID; main/item утга, файлын зам/нэр/гарчиг/тайлбар/огноо хадгалагдана. Gallery-ийн ID, product ID, sort order хэвээр, `file_id` нөхөгдөнө. Дискний файл зөөхгүй, нэр өөрчлөхгүй. Хуулсны дараа хуучин metadata баганууд болон owner composite FK-г хасна.
