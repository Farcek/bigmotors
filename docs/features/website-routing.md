# Website URL routing

2026-09-13: Next.js App Router. Нүүр хуудас болон Page module DB-тэй холбогдсон; каталогийн route-ууд хоосон хэвээр.

| URL | Одоогийн төлөв |
| --- | --- |
| / | settings.homepage-ийн нийтэлсэн Page, эсвэл өмнөх нүүр хуудасны fallback |
| /:slug | Нийтэлсэн Page-ийг slug-аар олох; байхгүй/нийтлэгдээгүй бол 404 |
| /vehicles | Хоосон автомашины жагсаалт |
| /vehicles/:id | Хоосон автомашины дэлгэрэнгүй |
| /parts | Хоосон сэлбэгийн жагсаалт |
| /parts/:id | Хоосон сэлбэгийн дэлгэрэнгүй |
| /tires | Хоосон дугуйн жагсаалт |
| /tires/:id | Хоосон дугуйн дэлгэрэнгүй |
| /files/:id/:originalName | GET/HEAD түр 501, Cache-Control: no-store |

## Хүрээ

- Header, footer, max-width 1440px хэвээр. Page-ийн content JSONB-г JSON.stringify(content, null, 2) хэлбэрээр pre дотор render хийнэ. React текстийг escape хийнэ; HTML болон script ажиллуулахгүй.
- Каталогийн route-ууд null агуулгатай, түр noindex/nofollow metadata-тай. /:slug мөн түр noindex хэвээр; SEO/meta render энэ шатанд хийгдээгүй.
- Static каталог route нь /:slug-ээс тусдаа. /api, /files, /_next нэрийг Page route болгож харуулахгүй.
- Route-д таарахгүй олон segment-тэй URL нь нийтлэг 404 хуудас харуулна.
- /:slug нь PageService.findPublishedBySlug ашиглана. Буруу формат, байхгүй, draft/archived Page нь 404. Бүтээгдэхүүний id route-ууд л одоогоор дурын id-д хоосон 200 буцаана.
- / дээр SettingsService.findByKey('homepage') дараа PageService.findById ашиглана. Тохиргоо байхгүй/хоосон/буруу UUID, Page устсан/нийтлэгдээгүй бол өмнөх үндсэн нүүр хуудас fallback болно. DB алдааг fallback эсвэл 404 гэж нуухгүй.
- DB уншилт нь server-only module-д, request бүрд хийгдэнэ. React cache нь зөвхөн нэг render request дотор давхардлыг багасгана; хүсэлт хооронд агуулгыг cache хийхгүй.
- Website өөрийн DATABASE_URL болон DBConfig-ийг хэрэглэнэ. DI container/connection pool нэг process-д дахин ашиглагдана; hot reload бүрд шинэ pool үүсгэхгүй.
- Header-ийн search/menu товчийг энэ ажлаар идэвхжүүлээгүй.

## Дараагийн холболт

- Бүтээгдэхүүний id-г DB/service-ээр шалгаж, байхгүй/нийтлэгдээгүйг 404 болгоно.
- Page CRUD дээр каталог болон системийн slug нэрийг нөөцөлж хориглоно; одоогоор admin schema өөрчлөөгүй.
- Website server тал packages/db ашиглаж байгаа; admin API-аар дамжуулахгүй.
- Query parameter хайлт/шүүлт/эрэмбэ, builder/content renderer, SEO metadata болон бодит file read тусдаа.
