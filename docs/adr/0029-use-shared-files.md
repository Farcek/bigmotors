# 0029: Зураг Болон Файлын Нэгдсэн Бүртгэл

- Огноо: 2026-09-12
- Төлөв: Баталсан
- Холбоотой: [Files](../db/files.md), [Product images](../db/product-images.md), [ADR 0022](0022-store-product-images-on-disk.md), [ADR 0023](0023-approve-catalog-schema.md)

## Нөхцөл Байдал

Хэрэглэгч бүх зураг/файлыг `files` хүснэгтээр хөтөлж, ашиглагчдын UUID key-г `usage` array-д нэмэх/хасах, бүтээгдэхүүний gallery-г тусдаа холбоос болгохоор шийдсэн.

## Харьцуулсан Хувилбарууд

- Өмнөх product_images дотор файл ба product ownership хадгалах: файл бүтээгдэхүүнээс хамааралтай, бусад хэрэглээнд хуваалцахгүй.
- Нэгдсэн files + product_images холбоос: файл, metadata-г давхардуулахгүй; usage болон бодит холбоосын transaction consistency шаардана.

## Шийдвэр

Хоёр дахь хувилбарыг баталсан. Files нь `id`, `file_path`, `original_name`, `title`, `description`, `created_at`, `updated_at`, `usage uuid[]`; product_images нь `id`, `product_id`, `file_id`, `sort_order`. Products main/item image ID шууд files руу заана. Баганын төрөл/нөхцөл, usage болон устгалын дүрмийн эх сурвалж нь дээрх DB баримтууд.

ADR 0022-ын metadata байрлал, тусдаа файлын хүснэгтгүй байх болон main/item холбоосын хэсэг; ADR 0023-ын image ownership/баганын хэсгийг орлоно. Эх файлыг disk дээр өөрчлөлтгүй хадгалах, формат/браузерын шалгалтгүй, тооны хязгааргүй шаардлага хэвээр.

## Үр Дагавар

- Файлыг олон product, өөр төрлийн ашиглагч хэрэглэнэ. Гарчиг/тайлбар нь нийтлэг file metadata болно.
- Usage нь FK болон ACL биш; caller-ийн key бүртгэл. Нэг ашиглагчийн сүүлийн холбоос салсны дараа л key-г хасна.
- DB delete guard нь nonempty usage-г, FK-ууд бодит холбоосыг хамгаална. Usage sync нь цаашдын CRUD transaction-ийн үүрэг.
- Шинэ migration хуучин файлын ID/metadata болон main/item/gallery холбоосыг хадгална; хуучин migration-уудыг өөрчлөхгүй, дискний файл зөөхгүй.
- Upload/serve, usage CRUD, physical cleanup, access бодлого болон tooling-ийг энэ schema өөрчлөлтөөр хэрэгжсэн гэж үзэхгүй.
