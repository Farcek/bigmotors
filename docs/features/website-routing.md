# Website URL routing

2026-09-14: Next.js App Router. Нүүр хуудас өөрийн агуулгатай; зөвхөн slug route Page module-той холбогдсон. Автомашины каталог бодит хайлттай; бусад каталог болон бүтээгдэхүүний дэлгэрэнгүй route-ууд хоосон хэвээр.

| URL | Одоогийн төлөв |
| --- | --- |
| / | Өөрийн нүүр хуудас (`src/app/page.tsx`), `key="home"` Gallery-ийн HomeCarousel |
| /:slug | Нийтэлсэн Page-ийг slug-аар олох; байхгүй/нийтлэгдээгүй бол 404 |
| /vehicles | SSR + client API хайлт, URL шүүлтүүр/эрэмбэ/хуудаслалттай автомашины каталог |
| /vehicles/:id | Хоосон автомашины дэлгэрэнгүй |
| /parts | Хоосон сэлбэгийн жагсаалт |
| /parts/:id | Хоосон сэлбэгийн дэлгэрэнгүй |
| /tires | Хоосон дугуйн жагсаалт |
| /tires/:id | Хоосон дугуйн дэлгэрэнгүй |
| /files/:id/:originalName | Public GET/HEAD; ID-аар DB lookup, FILES_ROOT-оос эх byte stream; Cache-Control: no-store |
| /api/vehicles | Public хайлт GET; 12 машин/хуудас, нүүрийн хамгийн ихдээ 3 хуудас |
| /api/vehicles/search | Каталогийн public GET; page_size=12/18/24/36, нийт үр дүнгээр хуудаслана, үнийн эрэмбэ болон маркын тоо |
| /api/vehicles/lookups | Public идэвхтэй лавлахууд GET |

## Хүрээ

- Header, footer, max-width 1440px хэвээр. `/:slug` дээр Page-ийн content JSONB-г JSON.stringify(content, null, 2) хэлбэрээр pre дотор render хийнэ. React текстийг escape хийнэ; HTML болон script ажиллуулахгүй.
- `/vehicles`-ээс бусад каталогийн route-ууд null агуулгатай. Түр noindex/nofollow metadata хэвээр; SEO/meta render тусдаа ажил.
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
- Desktop дээр зүүн талд label → title → description, төвд идэвхтэй зураг, баруун ард дараагийн зургийн томруулсан бүдэг preview байрлана. CTA нь идэвхтэй зургийн доод хэсэгт, navigation баруун доор байна. Desktop хамгийн бага өндөр 600/640px; текстийн хэсэг бүх slide-ийн агуулгаар тогтвортой өндөр авна.
- Mobile дээр текст дээрээ, идэвхтэй зураг доороо, дараагийн зургийн хэсэг баруун талд харагдана. Navigation зургийн доор байрлана. Арын preview нь тусдаа гоёлын давхарга тул сүүлийн slide дээр ч эхний зураг баруун талд харагдана.
- `label`, `title`, `desc` HTML-ийг `sanitize-html` 2.17.7-оор server талд цэвэрлэнэ. Paragraph, line break, bold, italic, underline, strike, list болон зөвшөөрсөн холбоос үлдэнэ. Script, iframe, SVG, image, event handler, style/class attribute ажиллуулахгүй; DB дахь эх HTML өөрчлөгдөхгүй.
- Зураг `/files/:imageId/:originalName` route-оор эх byte-аар ирнэ; originalName URL encode хийнэ. Next image optimizer, crop файл үүсгэх болон формат шалгахгүй. `object-cover` нь зөвхөн дэлгэц дээрх багтаалт. Эхний зураг eager/high priority, дараагийнх lazy. Ачаалж чадаагүй зураг placeholder-той; carousel болон текст хэвээр.
- `linkUrl` байхгүй/аюултай бол CTA харагдахгүй. URL байгаа боловч `linkLabel` хоосон бол **Дэлгэрэнгүй**. Холбоос нь тухайн tab-д нээгдэнэ; текстийг HTML гэж ажиллуулахгүй.
- Autoplay байхгүй. Swipe/drag, өмнөх/дараах сум, indicator, keyboard Left/Right/Home/End дэмжинэ. Олон зурагтай үед loop хийнэ; нэг зурагтай үед navigation нуугдана.
- 5 хүртэл зурагт indicator; түүнээс олонд хэт урт toolbar үүсгэхгүйгээр native select ашиглана.
- Идэвхгүй slide нь `inert`/`aria-hidden`; холбоос нь tab дараалалд орохгүй. Идэвхтэй дугаарыг screen reader-д мэдэгдэнэ. Reduced-motion үед шилжилтийн animation байхгүй.
- Unit/SSR тест: mapping, HTML safety, optional CTA, empty/single/many slide. Route тест carousel SSR болон JSON preview арилсныг шалгана. Mobile/desktop дээр navigation, keyboard, drag болон зураг ачаалалтыг нягтална.

Сангийн заавар: [Embla React](https://www.embla-carousel.com/docs/v8/get-started/react), [sanitize-html](https://github.com/apostrophecms/apostrophe/tree/main/packages/sanitize-html).

## Нүүр хуудасны хайлтын UI

- `src/components/home.searcher/index.tsx`: carousel-ийн доорх цагаан form. Марк, загвар, гүйлт болон хөдөлгүүрийн багтаамж үндсэн мөрөнд байна.
- Дэлгэрэнгүй товч нь form дотроо нэмэлт шүүлтүүдийг нээнэ/хураана. Хураахад утгууд хадгалагдана; нэмэлт идэвхтэй шүүлтийн тоо харагдана. Цэвэрлэх нь бүх утгыг анхны төлөвт оруулна.
- Mobile нэг, `sm` хоёр багана; `lg` дээр үндсэн мөр хэвтээ, нэмэлт шүүлтүүд дөрвөн багана. Доод/дээд утгууд хосоороо байна.
- `page.tsx` анхны үр дүн болон идэвхтэй лавлахуудыг server дээр уншиж `HomeSearch`-д өгнө. Mount дээр ижил өгөгдлийг дахин fetch хийхгүй. Лавлахуудыг хайлт бүрд татахгүй; марк солиход загвар/хувилбар, загвар солиход хувилбар цэвэрлэгдэнэ.
- Form-ийн өөрчлөлт нь draft төлөв. Хайх дарахад `/api/vehicles`-ээр нүүр хуудсан дотор үр дүн шинэчилнэ; `/vehicles` рүү шилжүүлэхгүй. Form-ийн Цэвэрлэх нь утгуудыг цэвэрлэнэ; дахин Хайх дарж хэрэглэнэ.

### Grid удирдлага

- `src/components/home.search.grid/index.tsx`: Хуучин / Шинэ / Бүгд шүүлт, хуудасны indicator, desktop 2/3/4/6 баганын сонголт, Бүгдийг харах холбоос. Машины card-уудыг гаднах `HomeSearch` нь `CarCardItem compactPrice`-аар render хийнэ.
- Нэг хуудас 12 машин, хамгийн ихдээ 3 хуудас. Бодит үр дүнгээс 0–3 indicator гарна. Баганын тоо зөвхөн layout сольж, fetch хийхгүй; mobile нэг, sm хоёр багана.
- `HomeSearch` form/grid-ийн нийтлэг төлөвийг эзэмшинэ. Toolbar-ийн Шинэ/Хуучин/Бүгд болон Хайх нь 1-р хуудаснаас API хайлт хийнэ. Хуудаслалт нь хэрэглэсэн query-гаар явна; form өөрчлөгдсөн бол шинэ шүүлтээр 1-р хуудаснаас эхэлнэ.
- Бүгдийг харах нь `/vehicles` рүү одоогийн form-ийн утгуудыг URL query-гаар дамжуулна. Хоосон утга, нүүрийн page болон баганын тоог дамжуулахгүй. Каталог эдгээр шүүлтүүрийг уншиж бодит үр дүн харуулна.
- Query нэрүүд: brand, model, mileage_min/max, engine_min/max, year_min/max, price_min/max, variant, category, condition, fuel, transmission, drivetrain, steering, color.
- `@bigmotors/core`-ийн `VehicleSearchParams` нь website form, URL, [нүүрний бүтээгдэхүүний бүлэг](admin-home-product-groups.md)-ийн admin/DTI/JSONB-д shared байна. Filter утгууд string; хоосныг орхиж `"0"`-г хадгална. URL болон form хөрвүүлэлтийг core helper-уудаар хийнэ; SQL query-д л тоон утгад хөрвүүлнэ. `page` filter object-д орохгүй.
- Mobile дээр баганын сонголт нуугдаж, үлдсэн удирдлагууд мөрлөж байрлана.

### Public query ба төлөв

- SSR болон API нь `packages/db`-ийн `PublicVehicleService` болон website-ийн нэг presenter ашиглана. Admin API/DTI client ашиглахгүй; шинэ schema/migration байхгүй.
- Зөвхөн `vehicle + published + available`. `first_published_at DESC, id ASC` тогтвортой эрэмбэ. Count/page нь нэг read-only repeatable-read transaction-д; хуучирсан page-ийг бодит сүүлийн хуудас руу хязгаарлана.
- Card-ийн зөвшөөрсөн талбаруудыг explicit select хийнэ. VIN, internalNote, content, usage, filePath болон admin төлөвүүд response-д байхгүй. `inquire` үнэ null; үнэний range шүүлтэд зөвхөн show_price орно.
- API нь дээрх filter-ууд болон page=1..3 л авна. UUID, enum, тоон хязгаар/эхлэх-дуусах утгыг шалгана; давхар query key, танихгүй параметр болон буруу утгад 400. DB алдаа нууц мэдээлэлгүй 500. Cache-Control: no-store; GET/HEAD, бусад өөрчлөх method 405.
- Loading үед өмнөх card-ууд бүдгэрч inert болно. Алдаа үед буруу үр дүн мэт хуучин card харуулахгүй, retry өгнө. Хоосон үр дүнд шүүлт цэвэрлэж дахин хайх товч гарна.
- Шинэ хүсэлт өмнөхөө abort хийнэ; sequence хамгаалалт хуучин хариугаар шинэ үр дүнг дарахгүй. Unmount дээр abort; 30 секундийн timeout. Нэмэлт cache сан байхгүй.

## Автомашины каталогийн хайлт

- `GET /api/vehicles/search` нь shared `vehicleListingQuery` contract хэрэглэнэ: `VehicleSearchParams` + string `page`, `page_size`, `sort`, `columns`. Page=1..999999, page_size=12/18/24/36; 3 хуудасны хязгаар байхгүй. Буруу/давхардсан/танихгүй параметр 400, хадгалалтын алдаа нууц мэдээлэлгүй 500; no-store.
- `PublicVehicleService.search` нь нүүр хуудасны list-тэй ижил visibility, filter, projection болон read-only transaction ашиглана. `newest`, `price_asc`, `price_desc` сонголттой; ижил утгад ID-аар эрэмбэлнэ. Нууц үнэ эрэмбэд нөлөөлөхгүй, inquire мөрүүд үнийн эрэмбийн сүүлд орно.
- Response: `items`, `total`, `page`, `pageCount`, `pageSize`, `brandCounts`. Маркын тоог одоогийн бусад шүүлтүүрээр тооцохдоо brand/model/variant-ийг хасна. DB schema/migration өөрчлөхгүй.
- Server эхний үр дүн, идэвхтэй лавлахуудыг өгнө. Дараа нь сонголт шууд, тоон input 400ms debounce-тай API хүсэлт явуулна. Desktop 2/3/4/6 баганад 12/18/24/36 машин; mobile 24. Шүүлтүүр, эрэмбэ эсвэл page size солигдвол 1-р хуудас руу буцна.
- URL, Refresh, Back/Forward, abort/хуучин хариуны хамгаалалт, 30 секундийн timeout, retry/empty төлөвтэй. Нэмэлт cache сан ашиглахгүй. [UI дүрэм](../ui/website-layout.md#vehicles-catalog).

## Нүүрний бүтээгдэхүүний бүлэг

- `src/components/home.product.groups/index.tsx`: зээлийн тооцоолуурын дараах цагаан section, "Төрлөөр нь үзэх" гарчигтай.
- `home_product_group`-ийн зөвхөн идэвхтэй бүлгүүдийг `sort_order ASC, id ASC` дарааллаар SSR render хийнэ. Mobile нэг, `sm` хоёр, `lg` дөрвөн багана. Нэмэлт client fetch/cache байхгүй.
- Card дээр зураг, гарчиг, бодит машины тоо, сум байна. Зураг нь `/files/:id/:originalName`; зураггүй бүлэгт placeholder icon. Гарчиг plain text байна.
- Машины тоо нь `PublicVehicleService.list`-тэй нэг шүүлтийн дүрэмтэй: published + available, inquiry үнэ range-д орохгүй. Олон бүлгийг нэг aggregate query-д (100 хүртэл багцаар) тоолно; card мэдээлэл татахгүй. 0 үр дүнтэй бүлгийг мөн харуулна.
- Бүлгийн холбоос нь shared `getVehicleSearchHref(filters)` ашиглаж `/vehicles?...` рүү нөхцөлийг дамжуулна. "Бүгдийг харах" нь нөхцөлгүй `/vehicles` рүү очно. Тус хуудасны хайлтын UI хараахан холбогдоогүй.
- Идэвхтэй бүлэг байхгүй бол section харагдахгүй. DB алдааг хоосон бүлэг/0 машин гэж нуухгүй, одоогийн page error boundary-д дамжуулна.

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
