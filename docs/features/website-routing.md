# Website URL routing

2026-09-13: Next.js App Router ашигласан хоосон route-ууд үүсгэсэн.

| URL | Одоогийн төлөв |
| --- | --- |
| / | Одоогийн нүүр хуудас хэвээр |
| /:slug | Хоосон Page route, нэг segment |
| /vehicles | Хоосон автомашины жагсаалт |
| /vehicles/:id | Хоосон автомашины дэлгэрэнгүй |
| /parts | Хоосон сэлбэгийн жагсаалт |
| /parts/:id | Хоосон сэлбэгийн дэлгэрэнгүй |
| /tires | Хоосон дугуйн жагсаалт |
| /tires/:id | Хоосон дугуйн дэлгэрэнгүй |
| /files/:id/:originalName | GET/HEAD түр 501, Cache-Control: no-store |

## Хүрээ

- Header, footer, max-width 1440px болон одоогийн нүүр хуудсыг өөрчлөөгүй.
- Шинэ page route-ууд null агуулгатай, түр noindex/nofollow metadata-тай.
- Static каталог route нь /:slug-ээс тусдаа. /api, /files, /_next нэрийг Page route болгож харуулахгүй.
- Route-д таарахгүй олон segment-тэй URL нь нийтлэг 404 хуудас харуулна.
- DB холбогдоогүй тул одоогоор дурын нэг segment slug, дурын бүтээгдэхүүний id нь хоосон 200 хуудас нээнэ. Энэ нь бодит бүртгэл эсвэл нийтлэгдсэн төлөвийг батлахгүй.
- Header-ийн search/menu товчийг энэ ажлаар идэвхжүүлээгүй.

## Дараагийн холболт

- / нь settings.homepage-аас нийтэлсэн Page уншина; fallback-ийг холбоно.
- /:slug болон бүтээгдэхүүний id-г DB/service-ээр шалгаж, байхгүй/нийтлэгдээгүйг 404 болгоно.
- Page CRUD дээр каталог болон системийн slug нэрийг нөөцөлж хориглоно; одоогоор admin schema өөрчлөөгүй.
- Website server тал packages/db ашиглана; admin API-аар дамжуулахгүй.
- Query parameter хайлт/шүүлт/эрэмбэ, content renderer болон бодит file read тусдаа.
