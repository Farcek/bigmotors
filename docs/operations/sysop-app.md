# Sysop app ажиллуулах

## Хөгжүүлэлт

Repository root-оос Node24, pnpm11.19.0 ашиглана:

```powershell
pnpm install
pnpm dev:app
```

Одоогийн Vite config нь `127.0.0.1:64403`. Порт завгүй бол Vite өөр порт сонгож болох тул терминалд хэвлэсэн хаягийг харна. Server-ийг өөр терминалаас `pnpm dev:server` ажиллуулна.

Root-ийн app dev/build/typecheck/test script нь хамааралтай workspace package-уудыг эхэлж build хийнэ. API client-ийн анхны base URL `/api`; Vite үүнийг `http://127.0.0.1:64402` руу proxy хийнэ. Шаардлагатай бол app-ийн `VITE_API_BASE_URL` build-time env-ээр өөрчилж болно. Өөр origin ашиглавал backend-ийн CORS тохиргоог тусад нь хангана.

Backend-ийн `sysop/server/.env` дэх `DATABASE_URL` нь runtime DB холболт. Local Compose DB-ийн host порт `64401`; migration мөн `DATABASE_URL` нэр ашиглах боловч `packages/db/.env` эсвэл release job-ийн environment-оос авна. Env өөрчилсний дараа backend-ийг дахин асаана. Нууц утгыг repository-д commit хийхгүй.

```powershell
pnpm typecheck:app
pnpm test:app
pnpm build:app
```

Build output: `sysop/app/dist`. `pnpm preview:app` нь local build шалгах зориулалттай, production server биш.

Dockerfile нь static build-ийг root эрхгүй Nginx-ээр үйлчилж, `/api`, `/files`-ийг
Sysop server рүү proxy хийнэ. [Docker/Compose заавар](docker.md)-аас ажиллуулах
алхам болон production auth-ийн хязгаарлалтыг харна.

## Routing

[ADR 0026](../adr/0026-use-react-router-data-mode.md)-ийн дагуу React Router Data Mode ашиглана.

| Файл | Үүрэг |
| --- | --- |
| `sysop/app/src/router.tsx` | Route object, page component, handle.title, error boundary |
| `sysop/app/src/App.tsx` | Browser router-ийг нэг удаа үүсгэж RouterProvider-д өгөх |
| `sysop/app/src/layout/AdminLayout.tsx` | Нийтлэг layout, Outlet, route title болон NavLink |
| `sysop/app/src/navigation.tsx` | Sidebar-ийн label/icon/destination болон хэрэгжээгүй цэсийн disabled төлөв |

| URL | Дэлгэц |
| --- | --- |
| `/` | Нүүр |
| `/references` | Лавлахын нүүр |
| `/vehicles` | Автомашины жагсаалт, хайлт/шүүлт/эрэмбэ |
| `/vehicles/new` | Автомашин нэмэх |
| `/vehicles/:id/edit` | Автомашин засах, зураг болон төлөв удирдах |
| `/references/colors` | Өнгөний CRUD, нэмэх/засах modal |
| `/references/vehicle-hierarchy` | Марк → загвар → хувилбар, гурван баганатай удирдлага |
| `/references/tire-hierarchy` | Дугуйн брэнд → загвар, хоёр баганатай удирдлага |
| `/references/part-categories` | Хажуугийн ангиллын tree view болон CRUD жагсаалт |
| `/demo` | UI demo тойм |
| `/demo/list` | Жишээ жагсаалт |
| `/demo/form` | Жишээ нэмэх/засах form (`?id=...`) |
| Бусад | Layout доторх 404 |

Өнгө болон [үлдсэн 11 лавлахын CRUD](../features/admin-reference-crud.md#дэлгэцүүд), [автомашины удирдлага](../features/admin-vehicles.md) хэрэгжсэн. Нэмэлт лавлахын route-ууд `src/pages/references/routes.ts`-д бүртгэлтэй. Цаашид шинэ route нэмэхэд component болон `handle.title` бүртгэж, бэлэн болсон үед цэсний холбоосыг идэвхжүүлнэ.

Дотоод navigation-д `Link`/`NavLink` ашиглана. Demo жагсаалтын хайлт/шүүлт/pagination болон өнгөний шүүлт/page URL query-д байна. Өнгөний UI нь `Colors` contract-оор API-д хандана; mutation амжилттай бол жагсаалтыг дахин уншина. Cache болон login/ACL guard нэмээгүй. [Өнгөний CRUD-ийн дэлгэрэнгүй](../features/admin-colors.md).

Бусад лавлах мөн өөрийн DTI contract ашиглана. `definitions.ts` дотор талбар/parent тохиргоо болон typed API adapter байна; `ReferencePage`, `ReferenceForm` нь нийтлэг дүрмийг хэрэгжүүлнэ. Parent сонголт бүрэн ачаалахад list API-г 100 мөрөөр дараалан уншина. API/DB схем өөрчлөхгүй.

`src/pages/references/vehicle-hierarchy/` дотор автомашины [гурван баганатай лавлах](../features/admin-vehicle-hierarchy.md) байрлана. `ReferenceForm`-ийн fixed parent/context боломжийг дахин ашиглана. Хуучин гурван URL хэвээр; лавлахын нүүрээс шинэ нэгтгэсэн хуудсанд орно.

`src/pages/references/tire-hierarchy/` дотор дугуйн [хоёр баганатай лавлах](../features/admin-tire-hierarchy.md) байрлана. Автомашин болон дугуйн багана/өгөгдөл унших нийтлэг хэсэг `src/pages/references/hierarchy/` дотор байна. Дугуйн хуучин хоёр URL хэвээр.

`src/pages/references/category-tree/` нь [сэлбэгийн ангиллын tree view](../features/admin-part-category-tree.md)-ийг хариуцна. `routes.ts` зөвхөн `part-categories` дээр sidebar-ийг идэвхжүүлнэ; нийтлэг `ReferencePage`-ийн CRUD болон `useParentOptions`-ийн бүх ангиллын уншилтыг дахин ашиглана.

## Demo хөгжүүлэх

`src/pages/demo/` дотор route layout, тойм, жагсаалт, form болон жишээ өгөгдөл байрлана. `DemoLayout` нь зөвхөн demo route-уудын санах ойн state-ийг эзэмшиж, `Outlet` context-оор дамжуулна. Demo component-ууд `route.lazy`-гаар тусдаа chunk болж ачаалагдана. Эхний ачаалалд fallback, шилжилтийн үед header loader харуулна.

`test/demo.test.tsx` нь нийлмэл шүүлт, эрэмбэ, pagination, unknown query, хоосон төлөв болон demo route-уудын шууд render-ийг шалгана. [UI demo-ийн хүрээ ба шалгуур](../features/admin-ui-demo.md).

2026-09-12: Demo нэмсний дараа app-ийн нийт 15 тест, TypeScript check болон Vite build тэнцсэн. Playwright/Edge дээр хайлт, шүүлт, эрэмбэ, pagination, query refresh, хоосон төлөв, form validation/reset, нэмэх/засах/устгах/болих, refresh-ээр жишээ өгөгдөл сэргээх болон үл мэдэгдэх edit ID-г шалгасан. 320/390/768/1440px өргөнд шалгаж, desktop/mobile screenshot нягталсан. Page error болон `/api/` хүсэлт гараагүй.

## Өнгөний CRUD шалгалт

2026-09-12: App-ийн 22 тест, TypeScript check, Vite build болон colors API-ийн тусгаарласан DB ашиглах HTTP тестүүд тэнцсэн. Playwright/Edge дээр mocked API-тай нэмэх/засах/устгах, validation, duplicate/in-use алдаа, шүүлт, pagination/refresh, хоосон/алдаа/retry төлөвийг шалгасан. 320/390/1440px өргөнд form/list screenshot болон overflow нягталсан; page error гараагүй. Бодит local API-аас зөвхөн унших, form нээхийг давхар шалгасан; одоо байгаа DB-д туршилтын өгөгдөл бичээгүй.

## Бусад лавлахын шалгалт

2026-09-12: App-ийн нийт 38 тест, TypeScript check, Vite build тэнцсэн. Үлдсэн 11 лавлахын backend HTTP шалгалтын 38 тест тусгаарласан DB дээр тэнцсэн. Playwright/Edge дээр лавлах тус бүрийн нэмэх/засах/устгах, validation, идэвхтэй шүүлт болон immutable parent payload-ыг шалгасан. Ангиллын root/parent шүүлт, идэвхгүй ancestor сонголт, pagination/refresh болон хуудсын сүүлийн мөрийг устгах урсгал шалгагдсан. 320/390/1440px form screenshot, хуудасны overflow болон page error-ийг нягталсан. Browser mutation-ууд mocked API ашигласан; бодит local 11 endpoint-оос зөвхөн уншиж, DB-д тест өгөгдөл бичээгүй.

## Автомашины UI

`src/pages/vehicles/` нь Vehicles DTI contract ашиглах жагсаалт, form, lookup уншилт болон нийтлэлийн action-уудыг хариуцна. Cache сан нэмээгүй. Form-ийн HTML editor нь `@mantine/tiptap` 9.6.0, TipTap 3.31.3; Mantine 9.6/React 19-д нийцэх peer dependency болон MIT лицензийг шалгаж сонгосон implementation detail. [Mantine-ийн албан заавар](https://mantine.dev/x/tiptap/). Editor нь edit route-ийн lazy chunk-д орно; бусад route нээхэд ачаалахгүй. Тус chunk build дээр ойролцоогоор 463 KB, gzip 144 KB байсан.

`src/files/client.ts` нь multipart upload болон file URL үүсгэнэ. Dev орчинд `/api/files/upload`, `/files/:id/:originalName` proxy-г ашиглана. Тусдаа file origin хэрэгтэй бол `VITE_FILES_BASE_URL`; заагаагүй үед absolute VITE_API_BASE_URL-ийн origin эсвэл тухайн origin-ийг хэрэглэнэ. Env нь build-time утга, нууц мэдээлэл байж болохгүй.

Frontend/Backend-ийг тусдаа ажиллуулна. Upload gate, ConfigFiles-ийн хэмжээ болон disk хадгалалтыг [server заавраас](sysop-server.md) харна. Энэ өөрчлөлт schema/migration, ACL болон backend-ийн эрхийг өөрчлөхгүй.

`test/vehicles.test.tsx` нь mapping, өөрчлөгдсөн PATCH, field/publish validation, inactive lookup, URL, төлөвийн menu, upload metadata болон хэмжээний алдааг шалгана. Browser шалгалт нь mock API-тай; бодит DB-д туршилтын бүртгэл бичихгүй.

2026-09-12: App-ийн нийт 65 тест, TypeScript check, Vite production build тэнцсэн. Playwright/Chrome дээр нэмэх/засах, хамааралтай лавлах, rich text, upload metadata/хэмжээний алдаа/retry, галерейд дахин нэмэх, main/item сонголт, хадгалаагүй өөрчлөлтийн guard, нийтлэх алдаа, архивлах/сэргээх, хайлт/цэвэрлэх болон хоосон/алдааны төлөв шалгасан. 320/390/1440px өргөнд screenshot/overflow шалгасан; page error гараагүй. Бодит backend тухайн үед унтарсан байсан; live mutation болон production deployment шалгаагүй.

## Production fallback

App route-д шууд хандах болон refresh хийхэд static server `index.html` буцаах шаардлагатай. `/api` хүсэлтийг backend-д дамжуулж, static asset замд байхгүй файл бол 404 буцаана; тэдгээрийг SPA HTML рүү fallback хийхгүй.

Client-side 404 дэлгэц нь static hosting-ийн HTTP status-ийг автоматаар 404 болгохгүй. Энэ өөрчлөлтөөр production proxy/container тохиргоо нэмээгүй.

## Шалгалт

`sysop/app/test/router.test.tsx` нь `node:test`, `tsx`, React server renderer болон memory router ашиглана: route matching, цэсийн destination, active link, layout, query/history, 404 болон алдааны нууц мэдээлэлгүй fallback. Production SSR гэсэн үг биш; зөвхөн тестийн render.

Browser шалгалт: цэсээр шилжихэд document дахин ачаалахгүй байх, Back/Forward, `/references` refresh, unknown URL, гар утасны цэс нээгдэх/сонгосны дараа хаагдах. Production rewrite-ийг бодит deployment дээр дахин шалгана.

2026-09-12: 7 автомат тест, TypeScript check болон Vite build тэнцсэн. Ажиллаж буй local Vite дээр Playwright/Edge ашиглан дээрх browser урсгал, query refresh, 320/390/768/1440px өргөнд overflow шалгасан; page error гараагүй. Desktop/mobile/404 screenshot-ийг нягталсан. Production deployment шалгаагүй.
