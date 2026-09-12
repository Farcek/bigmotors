# Page schema

Баталсан: 2026-09-12. Puck болон бусад builder холбохгүйгээр Page module үүсгэсэн.

| Талбар | PostgreSQL | Дүрэм |
| --- | --- | --- |
| id | uuid | PK, auto UUID |
| title | varchar(255) | Required, хоосон биш |
| slug | varchar(255) | Required, unique, жижиг латин үсэг/тоо, үгсийг нэг дунд зураасаар холбоно |
| description | varchar(512) | Optional, товч тайлбар |
| main_image_id | uuid | Optional, files.id FK, restrict delete |
| meta | jsonb | Required JSON object, default {} |
| content | jsonb | Required JSON object, default {} |
| status | varchar(16) + CHECK | draft / published / archived, default draft |
| published_at | timestamptz | Анх нийтлэхэд автоматаар, дахин нийтлэхэд хэвээр |
| created_at | timestamptz | Үүссэн огноо |
| updated_at | timestamptz | UPDATE бүрд автоматаар |

## Бүрэн бүтэн байдал

- DB table нэр `pages`; schema `packages/db/src/schema/page.ts`, CRUD `PageService`.
- `meta`, `content` нь null, array эсвэл scalar биш JSON object байна. Nested JSON утгуудыг хадгална.
- `published` үед `content != {}` байна. Builder сонгоогүй тул block-ийн төрөл/утгыг шалгахгүй; `{ "blocks": [] }` зэрэг object-ийн утгын утгачилсан шалгалт дараа хийгдэнэ.
- `slug` нэг URL segment; slash, query, whitespace болон давхар/захын дунд зураас зөвшөөрөхгүй. Slug redirect болон reserved website path-ийн бодлого website routing хийх үед шийдэгдэнэ.
- Trigger нь эхний нийтэлсэн огноо, created_at болон page ID-г хамгаална. Нийтэлсэн хуудсыг хоослохын тулд draft/archived болгохтой хамт хадгална.
- `main_image_id` нэмэх/солих/хасах/хуудсыг устгах үед файлын usage дотор page.id-г атомикаар нэмж/хасна. Бусад ашиглагчийн key болон эх файл үлдэнэ.
- Одоогоор зөвхөн main_image_id нь файлын холбоос. JSON доторх дурын UUID-г файл гэж таамаглаж usage-д бүртгэхгүй; builder asset contract тусдаа.
- Website-д зориулсан `findPublishedBySlug` нь зөвхөн published мөр буцаана; admin `findById` бүх төлөвийг уншина.

## Migration

`0003_pages.sql` нь pages хүснэгт, FK/index/CHECK болон timestamp/usage trigger нэмнэ. Одоо байгаа хүснэгт, мөрүүдийг өөрчлөхгүй. `db:migrate`-ийг packages/db-ээс ажиллуулна; reset шаардлагагүй.

Автомат rollback байхгүй. Буцаах шаардлагатай бол page өгөгдлийг нөөцөлж, usage key-үүдийг цэвэрлэх болон хүснэгт/trigger/function устгах тусдаа migration гаргана. Хэрэгжсэн SQL history-г засахгүй.

Admin урсгал: [Admin Page](../features/admin-pages.md).
