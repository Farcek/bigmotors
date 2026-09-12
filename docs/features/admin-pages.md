# Admin Page

Баталсан: 2026-09-12. [Page schema](../db/pages.md)-тай тусдаа агуулгын module. Puck холбоогүй, шинэ dependency нэмээгүй.

## Admin

- `/pages`: гарчиг/slug хайлт, төлөвөөр шүүх, хуудаслалт, refresh, нэмэх, мөрийн засах/устгах menu.
- `/pages/new`, `/pages/:id/edit`: Mantine useForm, Үндсэн / Агуулга / Meta tab.
- Үндсэн: гарчиг, slug, товч тайлбар, төлөв, үндсэн зураг upload/солих/хасах.
- Агуулга: `content` JSON input. Meta: `meta` JSON input. Хүчинтэй JSON object шаарддаг; builder/HTML editor биш.
- Ноорогт хоосон {} агуулга хадгалж болно. Published үед хоосон {} агуулгыг form болон DB хориглоно.
- Status өөрчлөөд хадгалах нь нийтлэх/ноорог болгох/архивлах үйлдэл. Тусдаа revision байхгүй; published мөрийн засвар шууд тухайн мөрд хадгалагдана.
- Хадгалах үед tab хэвээр; талбарын алдаа гарвал тохирох tab нээгдэнэ. API алдаа гарвал бөглөсөн утга үлдэнэ.
- Устгах үед confirmation авна. Хуудасны зураг холбоос сална, эх файл устахгүй.
- Upload амжилттай болсон ч form хадгалаагүй бол файл холбоогүй хэвээр үлдэнэ. Одоогийн file-management дүрэм үйлчилнэ.

## API

`Pages` DTI namespace, `PageService` DI service. Route prefix `/api`.

| Method | Path | Үйлдэл |
| --- | --- | --- |
| GET | /pages | search, status, limit 1..100, offset |
| GET | /pages/:id | Бүх талбар |
| POST | /pages | Үүсгэх |
| PATCH | /pages/:id | Өгсөн талбаруудыг засах |
| DELETE | /pages/:id | Устгах |

List response нь meta/content-ийг оруулахгүй. PATCH дээр meta/content объект нь бүхлээрээ солигдоно, deep merge хийхгүй. Огноо, id-г body-оор өөрчлөхгүй. Алдаа: 400 invalid input/publication, 404 missing page, 409 duplicate slug/missing image, 500 sanitized storage error.

Нэвтрэлт/ACL-ийн одоогийн тохиргоог өөрчлөөгүй. Permission matrix шинээр баталсан гэсэн үг биш.

## Дараагийн холболт

- Website page renderer, public HTTP route, navigation/menu, preview болон Puck энэ ажилд орохгүй.
- `meta.seoTitle`, `meta.seoDescription` өгөгдөөгүй бол renderer title/description-оос авна; noIndex болон share image-г website холбоход хэрэглэнэ. Одоогоор JSON-г хадгалж байгаа, website SEO render хийгдээгүй.
- Content block schema, versioning/migration, JSON доторх asset usage нь builder сонгох үед шийдэгдэнэ.
