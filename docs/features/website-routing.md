# Website URL routing

2026-09-13: Next.js App Router. Нүүр хуудас өөрийн агуулгатай; зөвхөн slug route Page module-той холбогдсон. Каталогийн route-ууд хоосон хэвээр.

| URL | Одоогийн төлөв |
| --- | --- |
| / | Өөрийн нүүр хуудас (`src/app/page.tsx`), `key="home"` Gallery болон item-уудыг JSON болгон харуулна |
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
- `/` нь settings/Page lookup хийхгүй. `homepage` тохиргоо, Page нийтлэх/засах/устгах нь нүүр хуудсыг өөрчлөхгүй. `GalleryService.findByKey("home")` ашиглан яг тэнцүү key-ээр Gallery олно; бүх item-ийг `sort_order ASC, id ASC` дарааллаар уншиж `{ ...gallery, items }` JSON харуулна. Хоосон gallery бол `items: []`. Gallery олдохгүй үед lookup `null` буцаах боловч нүүр хуудас алдаа шиднэ; DB алдааг мөн нуухгүй.
- Нүүр хуудасны Gallery уншилт server-only, request бүрд хийгдэнэ. JSON нь React-ээр escape хийгдсэн текст; item-ийн HTML-г ажиллуулахгүй. Шинэ public API, зурагтай slider эсвэл Page renderer холбоогүй.
- `/:slug`-ийн DB уншилт нь server-only module-д, request бүрд хийгдэнэ. React cache нь зөвхөн нэг render request дотор давхардлыг багасгана; хүсэлт хооронд агуулгыг cache хийхгүй. DB алдааг 404 гэж нуухгүй.
- Website өөрийн DATABASE_URL болон DBConfig-ийг хэрэглэнэ. DI container/connection pool нэг process-д дахин ашиглагдана; hot reload бүрд шинэ pool үүсгэхгүй.
- Header-ийн search/menu товчийг энэ ажлаар идэвхжүүлээгүй.

## Алдааны дэлгэц

- `src/app/error.tsx` нь page болон nested route-ийн runtime алдааг барьж, header/footer дотор ерөнхий алдааны дэлгэц харуулна. Тусдаа `/error` URL биш.
- "Хуудас ачаалахад алдаа гарлаа", "Түр хүлээгээд дахин оролдоно уу." гэсэн мессеж болон "Дахин оролдох" товчтой.
- Next.js `retry()` ашиглан route-ийн өгөгдлийг дахин уншина. Хүлээх үед товч disabled/busy болно; алдаа арилахгүй бол дэлгэц хэвээр байна.
- Error message, stack болон дотоод key/DB мэдээллийг component UI-д гаргахгүй. Production Server Component-ийн алдааны дэлгэрэнгүй серверийн логт үлдэнэ. Development үед Next.js-ийн debug overlay тусдаа гарч болно.
- `notFound()`-ийн 404 хэвээр. Root layout-ийн алдаа болон route handler/API хариуг энэ boundary барихгүй; custom global-error энэ өөрчлөлтөд ороогүй.

## Дараагийн холболт

- Бүтээгдэхүүний id-г DB/service-ээр шалгаж, байхгүй/нийтлэгдээгүйг 404 болгоно.
- Page CRUD дээр каталог болон системийн slug нэрийг нөөцөлж хориглоно; одоогоор admin schema өөрчлөөгүй.
- Website server тал packages/db ашиглаж байгаа; admin API-аар дамжуулахгүй.
- Query parameter хайлт/шүүлт/эрэмбэ, builder/content renderer, SEO metadata болон бодит file read тусдаа.
