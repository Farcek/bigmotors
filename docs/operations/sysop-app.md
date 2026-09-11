# Sysop app ажиллуулах

## Хөгжүүлэлт

Repository root-оос Node24, pnpm11.19.0 ашиглана:

```powershell
pnpm install
pnpm dev:app
```

Одоогийн Vite config нь `127.0.0.1:64403`. Порт завгүй бол Vite өөр порт сонгож болох тул терминалд хэвлэсэн хаягийг харна. Server-ийг өөр терминалаас `pnpm dev:server` ажиллуулна.

```powershell
pnpm typecheck:app
pnpm test:app
pnpm build:app
```

Build output: `sysop/app/dist`. `pnpm preview:app` нь local build шалгах зориулалттай, production server биш.

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
| `/demo` | UI demo тойм |
| `/demo/list` | Жишээ жагсаалт |
| `/demo/form` | Жишээ нэмэх/засах form (`?id=...`) |
| Бусад | Layout доторх 404 |

Лавлахын CRUD болон бүтээгдэхүүний дэлгэц нэмээгүй. `/references/colors` зэрэг хэрэгжээгүй URL нь 404 харуулна. Цаашид шинэ route нэмэхэд component болон `handle.title` бүртгэж, бэлэн болсон үед цэсний холбоосыг идэвхжүүлнэ.

Дотоод navigation-д `Link`/`NavLink` ашиглана. Demo жагсаалтын хайлт/шүүлт/pagination URL query-д байна. Бодит каталогийн API data, filter control болон cache integration байхгүй. Login/ACL guard нэмээгүй.

## Demo хөгжүүлэх

`src/pages/demo/` дотор route layout, тойм, жагсаалт, form болон жишээ өгөгдөл байрлана. `DemoLayout` нь зөвхөн demo route-уудын санах ойн state-ийг эзэмшиж, `Outlet` context-оор дамжуулна. Demo component-ууд `route.lazy`-гаар тусдаа chunk болж ачаалагдана. Эхний ачаалалд fallback, шилжилтийн үед header loader харуулна.

`test/demo.test.tsx` нь нийлмэл шүүлт, эрэмбэ, pagination, unknown query, хоосон төлөв болон demo route-уудын шууд render-ийг шалгана. [UI demo-ийн хүрээ ба шалгуур](../features/admin-ui-demo.md).

2026-09-12: Demo нэмсний дараа app-ийн нийт 15 тест, TypeScript check болон Vite build тэнцсэн. Playwright/Edge дээр хайлт, шүүлт, эрэмбэ, pagination, query refresh, хоосон төлөв, form validation/reset, нэмэх/засах/устгах/болих, refresh-ээр жишээ өгөгдөл сэргээх болон үл мэдэгдэх edit ID-г шалгасан. 320/390/768/1440px өргөнд шалгаж, desktop/mobile screenshot нягталсан. Page error болон `/api/` хүсэлт гараагүй.

## Production fallback

App route-д шууд хандах болон refresh хийхэд static server `index.html` буцаах шаардлагатай. `/api` хүсэлтийг backend-д дамжуулж, static asset замд байхгүй файл бол 404 буцаана; тэдгээрийг SPA HTML рүү fallback хийхгүй.

Client-side 404 дэлгэц нь static hosting-ийн HTTP status-ийг автоматаар 404 болгохгүй. Энэ өөрчлөлтөөр production proxy/container тохиргоо нэмээгүй.

## Шалгалт

`sysop/app/test/router.test.tsx` нь `node:test`, `tsx`, React server renderer болон memory router ашиглана: route matching, цэсийн destination, active link, layout, query/history, 404 болон алдааны нууц мэдээлэлгүй fallback. Production SSR гэсэн үг биш; зөвхөн тестийн render.

Browser шалгалт: цэсээр шилжихэд document дахин ачаалахгүй байх, Back/Forward, `/references` refresh, unknown URL, гар утасны цэс нээгдэх/сонгосны дараа хаагдах. Production rewrite-ийг бодит deployment дээр дахин шалгана.

2026-09-12: 7 автомат тест, TypeScript check болон Vite build тэнцсэн. Ажиллаж буй local Vite дээр Playwright/Edge ашиглан дээрх browser урсгал, query refresh, 320/390/768/1440px өргөнд overflow шалгасан; page error гараагүй. Desktop/mobile/404 screenshot-ийг нягталсан. Production deployment шалгаагүй.
