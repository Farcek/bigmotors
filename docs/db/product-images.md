# Product images ба disk хадгалалт

- Огноо: 2026-09-10
- Төлөв: Хадгалах арга, багана, холбоос болон lifecycle баталсан; Drizzle schema хэрэгжсэн. Migration, upload/serve болон файл цэвэрлэх урсгал хийгдээгүй. [Хэрэгжүүлэлтийн зааг](../operations/db-schema.md).
- Холбоотой баримт: [Products](products-schema.md), [Нийтлэг дүрэм](../features/product-common-rules.md), [ADR 0022](../adr/0022-store-product-images-on-disk.md)

## Батлагдсан шийдвэр

- Upload хийсэн эх зургийн файл серверийн hard disk дээр өөрчлөлтгүй хадгалагдана.
- Зургийн бүртгэл, файлын зам болон metadata-г `product_images` хүснэгтэд хадгална; binary файлыг DB-д хадгалахгүй.
- Энэ бүтээгдэхүүний зургийн хүрээнд тусдаа `media_files` хүснэгт үүсгэх өмнөх саналыг хэрэглэхгүй.
- `products.main_image_id`, `products.item_image_id` нь `product_images.id` рүү холбоно. `item_image_id` сонголттой, render fallback хэвээр.
- Зургийн тоог хязгаарлахгүй, формат болон браузер харуулж чадах эсэхийг шалгахгүй; эх файл хөрвүүлэхгүй. Зураг бүрийн title/тайлбар сонголттой.

## Баганууд

Requiredness, FK эзэмшил, upload/устгалын дарааллыг [нэгтгэсэн schema](catalog-schema-proposal.md#product-images)-тай хамт 2026-09-10-нд баталсан.

Доорх 9 багана/төрөл батлагдсан. Title/description nullable; бусад нь NOT NULL. File path unique; sort_order default 0, сөрөг биш.

| Багана | Санал | Зориулалт |
| --- | --- | --- |
| `id` | UUID, PK | UUID v4; DB default gen_random_uuid() |
| `product_id` | UUID, FK | Эзэмшигч бүтээгдэхүүн |
| `file_path` | text | Тохируулсан upload root-оос харьцангуй зам; public URL эсвэл төхөөрөмжийн absolute path биш |
| `original_name` | text | Upload үеийн файлын нэр; дискний зам үүсгэхэд шууд ашиглахгүй |
| `title` | varchar(255), nullable | Зургийн сонголттой гарчиг |
| `description` | varchar(512), nullable | Зургийн сонголттой тайлбар; product.description-оос тусдаа |
| `sort_order` | integer | Нэмэлт зургийн харагдах дараалал |
| `created_at` | timestamptz | Бүртгэл үүсгэсэн огноо |
| `updated_at` | timestamptz | Metadata/дараалал өөрчилсөн огноо |

## Холбоос ба lifecycle

- Нэг product олон зурагтай; үндсэн болон item зураг нь тухайн product-ийн өөрийн зураг байх нөхцөлийг DB/API түвшинд баталгаажуулна. Composite FK-ийн арга нэгтгэсэн schema-д батлагдсан; migration-ийг хэрэгжүүлж шалгана.
- Ижил зургийг үндсэн болон item зураг болгон сонгоход нэг бүртгэл, нэг файл ашиглаж болно; давхар upload шаардахгүй.
- Upload хийхээс өмнө product-ийн ноорог үүсгэнэ; энэ дараалал батлагдсан.
- Upload/DB insert алдаанд файлыг нөхөн цэвэрлэнэ. Ашиглагдаж байгаа зургийн холбоосыг эхлээд transaction-д солих/цэвэрлэх, image мөр устгах, commit-ийн дараа файл устгах дараалал батлагдсан; retry/reconciliation tooling нээлттэй. Үндсэн зургийг устгаад нийтлэгдсэн product-ийг шаардлагагүй үлдээхгүй.
- Үндсэн зургийг gallery-д нэг удаа, бусдыг sort_order/id дарааллаар харуулна; зөвхөн item зураг gallery-д орохгүй. Нийтэд metadata харуулах нарийвчлал нээлттэй.
- Disk folder, upload сан/transport, serve route болон нийтлэгдээгүй product-ийн файлд хандах эрхийг дараа шийднэ. Бүх upload хавтсыг шууд public болгох шийдвэр гараагүй.

Энэ баримтаар хүснэгт, migration, upload endpoint эсвэл disk хавтас үүсгээгүй.
