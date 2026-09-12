# Product Images

- Огноо: 2026-09-12
- Төлөв: Шинэ бүтэц баталсан; schema болон `0003_shared_files` migration бэлдсэн, бодит DB-д ажиллуулаагүй.
- Холбоотой: [Files](files.md), [Products](products-schema.md), [ADR 0029](../adr/0029-use-shared-files.md)

## Баганууд

`product_images` нь бүтээгдэхүүн ба файлын gallery холбоос, дарааллыг л хадгална.

| Багана | Төрөл / нөхцөл | Зориулалт |
| --- | --- | --- |
| `id` | uuid, PK, default gen_random_uuid() | Gallery холбоосын танигч |
| `product_id` | uuid, NOT NULL, FK -> products.id | Бүтээгдэхүүн |
| `file_id` | uuid, NOT NULL, FK -> files.id | Зургийн файл |
| `sort_order` | integer, NOT NULL, default 0, >= 0 | Gallery дахь дараалал |

`(product_id, file_id)` UNIQUE; нэг product-ийн gallery-д нэг файл давхар орохгүй. Эрэмбэ `(sort_order, id)`; индекс `(product_id, sort_order, id)` болон `file_id`. FK-ууд ON DELETE RESTRICT. Gallery холбоосын `product_id` үүссэний дараа өөрчлөгдөхгүй.

Зам, эх нэр, гарчиг, тайлбар, огноо нь зөвхөн [files](files.md)-д байна. `product_images` дээр timestamp багана байхгүй; gallery insert/update/delete нь `products.updated_at`-ийг шинэчилнэ.

## Main, Item Ба Gallery

- `products.main_image_id`, `products.item_image_id` нь шууд `files.id` рүү заана. Тухайн файл gallery-д заавал байх шаардлагагүй; өмнөх same-product owner composite FK хүчингүй.
- Main/item нэг файл зааж болно; нэг файлыг олон product ашиглаж болно.
- Main нийтлэхэд заавал, item сонголттой. Item хоосон бол render үед main-ийг авна; DB-д fallback хуулж хадгалахгүй.
- Үндсэн зургийг gallery render дээр эхэнд нэг удаа харуулж, нэмэлт зургуудыг sort_order/id дарааллаар харуулна. Gallery дахь ижил main file_id-г давтаж харуулахгүй. Зөвхөн item-д холбосон файл gallery-д орохгүй; зориуд gallery-д холбосон бол харуулна.
- Gallery холбоос үүсгэхэд product болон file бүртгэл хоёул байна. Харин file upload нь product-оос өмнө байж болно.
- Gallery мөр устгах нь files мөр/дискний файл устгах үйлдэл биш. Product main/item эсвэл өөр gallery холбоосоор ашигласан хэвээр бол usage key-г хадгална.

Файлын нийтлэг шаардлага, usage transaction болон upload/устгалын lifecycle-ийн үндсэн эх сурвалж нь [File management](../features/file-management.md); DB хамгаалалт [Files](files.md)-д байна. Upload, usage CRUD, serve болон cleanup урсгал тусдаа хэрэгжүүлэлт хэвээр.
