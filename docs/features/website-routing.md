# Website URL routing

2026-09-13: Next.js App Router. Нүүр хуудас өөрийн агуулгатай; зөвхөн slug route Page module-той холбогдсон. Каталогийн route-ууд хоосон хэвээр.

| URL | Одоогийн төлөв |
| --- | --- |
| / | Өөрийн нүүр хуудас (`src/app/page.tsx`), `key="home"` Gallery-ийн HomeCarousel |
| /:slug | Нийтэлсэн Page-ийг slug-аар олох; байхгүй/нийтлэгдээгүй бол 404 |
| /vehicles | Хоосон автомашины жагсаалт |
| /vehicles/:id | Хоосон автомашины дэлгэрэнгүй |
| /parts | Хоосон сэлбэгийн жагсаалт |
| /parts/:id | Хоосон сэлбэгийн дэлгэрэнгүй |
| /tires | Хоосон дугуйн жагсаалт |
| /tires/:id | Хоосон дугуйн дэлгэрэнгүй |
| /files/:id/:originalName | Public GET/HEAD; ID-аар DB lookup, FILES_ROOT-оос эх byte stream; Cache-Control: no-store |

## Хүрээ

- Header, footer, max-width 1440px хэвээр. `/:slug` дээр Page-ийн content JSONB-г JSON.stringify(content, null, 2) хэлбэрээр pre дотор render хийнэ. React текстийг escape хийнэ; HTML болон script ажиллуулахгүй.
- Каталогийн route-ууд null агуулгатай, түр noindex/nofollow metadata-тай. /:slug мөн түр noindex хэвээр; SEO/meta render энэ шатанд хийгдээгүй.
- Static каталог route нь /:slug-ээс тусдаа. /api, /files, /_next нэрийг Page route болгож харуулахгүй.
- Route-д таарахгүй олон segment-тэй URL нь нийтлэг 404 хуудас харуулна.
- /:slug нь PageService.findPublishedBySlug ашиглана. Буруу формат, байхгүй, draft/archived Page нь 404. Бүтээгдэхүүний id route-ууд л одоогоор дурын id-д хоосон 200 буцаана.
- `/` нь settings/Page lookup хийхгүй. `homepage` тохиргоо, Page нийтлэх/засах/устгах нь нүүр хуудсыг өөрчлөхгүй. `GalleryService.findByKey("home")` ашиглан яг тэнцүү key-ээр Gallery олно; бүх item-ийг `sort_order ASC, id ASC` дарааллаар HomeCarousel-д харуулна. Gallery байхгүй эсвэл item-гүй үед нүүр хуудасны одоогийн алдааны дэлгэц гарна; DB алдааг мөн нуухгүй.
- Нүүр хуудасны Gallery уншилт server-only, request бүрд хийгдэнэ. Server дээр HTML цэвэрлээд зөвхөн carousel-д хэрэгтэй талбаруудыг client component-д өгнө. Шинэ public Gallery API эсвэл Page renderer нэмээгүй.
- `/:slug`-ийн DB уншилт нь server-only module-д, request бүрд хийгдэнэ. React cache нь зөвхөн нэг render request дотор давхардлыг багасгана; хүсэлт хооронд агуулгыг cache хийхгүй. DB алдааг 404 гэж нуухгүй.
- Website өөрийн DATABASE_URL болон DBConfig-ийг хэрэглэнэ. Connection pool нэг process-д global байдлаар дахин ашиглагдана; hot reload бүрд шинэ pool үүсгэхгүй. DI container нь server module бүрд local: Next RSC болон route handler-ийн ялгаатай token instance-уудыг global container-д холихгүй.
- Header-ийн search/menu товчийг энэ ажлаар идэвхжүүлээгүй.
- Файл уншихад нэвтрэлт/ACL болон URL-ийн originalName шалгахгүй. Invalid ID 400, DB/disk дээр байхгүй бол 404, бусад алдаа нууц мэдээлэлгүй 500 JSON. HEAD body-гүй; POST 405. Sysop/website нь `@bigmotors/core/file-storage`-ийн path/header helper-ийг ашиглана. [Read дүрэм](file-management.md#file-read-route).

## HomeCarousel

- Компонент: `src/components/home.carousel/index.tsx`; өгөгдөл бэлтгэх: `src/server/home-slides.ts`.
- Embla Carousel React 8.6.0, Tailwind utility болон Tabler icon ашиглана. Header, SectionDark, BodyContainer болон 1440px гадна хүрээг хэвээр хадгална; carousel-ийн хамгийн их өргөн 1200px.
- Slide бүр эх зургийг дэвсгэрт, label → title → description → холбоос дарааллаар харуулна. Responsive хамгийн бага өндөр 440/520/580px; урт агуулгад өсөх бөгөөд бүх slide ижил өндөртэй. Текст болон control давхцахгүй.
- `label`, `title`, `desc` HTML-ийг `sanitize-html` 2.17.7-оор server талд цэвэрлэнэ. Paragraph, line break, bold, italic, underline, strike, list болон зөвшөөрсөн холбоос үлдэнэ. Script, iframe, SVG, image, event handler, style/class attribute ажиллуулахгүй; DB дахь эх HTML өөрчлөгдөхгүй.
- Зураг `/files/:imageId/:originalName` route-оор эх byte-аар ирнэ; originalName URL encode хийнэ. Next image optimizer, crop файл үүсгэх болон формат шалгахгүй. `object-cover` нь зөвхөн дэлгэц дээрх багтаалт. Эхний зураг eager/high priority, дараагийнх lazy. Ачаалж чадаагүй зураг placeholder-той; carousel болон текст хэвээр.
- `linkUrl` байхгүй/аюултай бол CTA харагдахгүй. URL байгаа боловч `linkLabel` хоосон бол **Дэлгэрэнгүй**. Холбоос нь тухайн tab-д нээгдэнэ; текстийг HTML гэж ажиллуулахгүй.
- Autoplay байхгүй. Swipe/drag, өмнөх/дараах сум, indicator, keyboard Left/Right/Home/End дэмжинэ. Олон зурагтай үед loop хийнэ; нэг зурагтай үед navigation нуугдана.
- 5 хүртэл зурагт indicator; түүнээс олонд хэт урт toolbar үүсгэхгүйгээр native select ашиглана. Mobile дээр текст, зураг нэг full-width slide байна.
- Идэвхгүй slide нь `inert`/`aria-hidden`; холбоос нь tab дараалалд орохгүй. Идэвхтэй дугаарыг screen reader-д мэдэгдэнэ. Reduced-motion үед шилжилтийн animation байхгүй.
- Unit/SSR тест: mapping, HTML safety, optional CTA, empty/single/many slide. Route тест carousel SSR болон JSON preview арилсныг шалгана. Mobile/desktop дээр navigation, keyboard, drag болон зураг ачаалалтыг нягтална.

Сангийн заавар: [Embla React](https://www.embla-carousel.com/docs/v8/get-started/react), [sanitize-html](https://github.com/apostrophecms/apostrophe/tree/main/packages/sanitize-html).

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
- Query parameter хайлт/шүүлт/эрэмбэ, builder/content renderer, SEO metadata тусдаа.
