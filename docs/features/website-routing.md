# Website URL routing

2026-09-13: Next.js App Router. Нүүр хуудас өөрийн агуулгатай; зөвхөн slug route Page module-той холбогдсон. Каталогийн route-ууд хоосон хэвээр.

| URL | Одоогийн төлөв |
| --- | --- |
| / | Өөрийн нүүр хуудас (`src/app/page.tsx`), Page module/settings-ээс хамаарахгүй |
| /:slug | Нийтэлсэн Page-ийг slug-аар олох; байхгүй/нийтлэгдээгүй бол 404 |
| /vehicles | Хоосон автомашины жагсаалт |
| /vehicles/:id | Хоосон автомашины дэлгэрэнгүй |
| /parts | Хоосон сэлбэгийн жагсаалт |
| /parts/:id | Хоосон сэлбэгийн дэлгэрэнгүй |
| /tires | Хоосон дугуйн жагсаалт |
| /tires/:id | Хоосон дугуйн дэлгэрэнгүй |
| /files/:id/:originalName | GET/HEAD түр 501, Cache-Control: no-store |

## Хүрээ

- Header, footer, max-width 1440px хэвээр. `/:slug` дээр Page-ийн content JSONB-г JSON.stringify(content, null, 2) хэлбэрээр pre дотор render хийнэ. React текстийг escape хийнэ; HTML болон script ажиллуулахгүй.
- Каталогийн route-ууд null агуулгатай, түр noindex/nofollow metadata-тай. /:slug мөн түр noindex хэвээр; SEO/meta render энэ шатанд хийгдээгүй.
- Static каталог route нь /:slug-ээс тусдаа. /api, /files, /_next нэрийг Page route болгож харуулахгүй.
- Route-д таарахгүй олон segment-тэй URL нь нийтлэг 404 хуудас харуулна.
- /:slug нь PageService.findPublishedBySlug ашиглана. Буруу формат, байхгүй, draft/archived Page нь 404. Бүтээгдэхүүний id route-ууд л одоогоор дурын id-д хоосон 200 буцаана.
- `/` нь settings/Page lookup хийхгүй. `homepage` тохиргоо, Page нийтлэх/засах/устгах нь нүүр хуудсыг өөрчлөхгүй. Одоогийн нүүр хуудас DB холболтгүйгээр render хийгдэнэ; цаашдын нүүр хуудасны UI-г энэ route дотор хөгжүүлнэ.
- `/:slug`-ийн DB уншилт нь server-only module-д, request бүрд хийгдэнэ. React cache нь зөвхөн нэг render request дотор давхардлыг багасгана; хүсэлт хооронд агуулгыг cache хийхгүй. DB алдааг 404 гэж нуухгүй.
- Website өөрийн DATABASE_URL болон DBConfig-ийг хэрэглэнэ. DI container/connection pool нэг process-д дахин ашиглагдана; hot reload бүрд шинэ pool үүсгэхгүй.
- Header-ийн search/menu товчийг энэ ажлаар идэвхжүүлээгүй.

## Дараагийн холболт

- Бүтээгдэхүүний id-г DB/service-ээр шалгаж, байхгүй/нийтлэгдээгүйг 404 болгоно.
- Page CRUD дээр каталог болон системийн slug нэрийг нөөцөлж хориглоно; одоогоор admin schema өөрчлөөгүй.
- Website server тал packages/db ашиглаж байгаа; admin API-аар дамжуулахгүй.
- Query parameter хайлт/шүүлт/эрэмбэ, builder/content renderer, SEO metadata болон бодит file read тусдаа.
