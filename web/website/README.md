# BigMotors Website

Next.js App Router, TypeScript, Tailwind CSS 4 ашиглах public website-ийн суурь.

## Ажиллуулах

Repository root-оос:

```powershell
pnpm dev:website
pnpm typecheck:website
pnpm build:website
pnpm start:website
```

Dev болон production start: http://127.0.0.1:64400. `start:website`-ээс өмнө build хийнэ.
Package дотроос өөр порт сонгох жишээ: `pnpm exec next dev --hostname 127.0.0.1 --port 64404`.

## Бүтэц

- `src/app/layout.tsx`: нийтлэг header/main/footer, metadata, 1440px голлуулсан хүрээ.
- `src/app/page.tsx`: Page module/settings-ээс хамаарахгүй нүүр хуудас; `key="home"` Gallery-ийн HomeCarousel.
- `src/components/home.carousel/`: Embla + Tailwind carousel, responsive зураг/HTML текст/CTA, swipe болон keyboard navigation.
- `src/components/home.search/`: SSR анхны автомашин/лавлах, дараагийн API хайлт, 12 машин/хуудас, хамгийн ихдээ 3 хуудас. Card нь `car.card`, toolbar нь `home.search.grid`.
- `src/app/api/vehicles/route.ts`: public read-only хайлт; SSR-тэй ижил `PublicVehicleService` query ашиглана, admin API-аар дамжихгүй.
- `src/app/[slug]/page.tsx`: нийтэлсэн Page-ийг slug-аар уншиж content-г JSON string болгон харуулна.
- `src/server/`: server-only DI/DB холболт, Page slug болон Gallery key lookup.
- `src/app/vehicles`, `parts`, `tires`: жагсаалт болон `[id]` дэлгэрэнгүй хоосон route-ууд.
- `src/app/files/[id]/[originalName]/route.ts`: public GET/HEAD file-read route.
- `src/app/not-found.tsx`: нийтлэг 404.
- `src/app/error.tsx`: page runtime алдааны ерөнхий дэлгэц; дотоод мэдээлэлгүй, route-ийг дахин унших retry товчтой.
- `src/app/globals.css`: Tailwind import.
- `package.json`: PostCSS plugin болон ажиллуулах командууд.

[Layout дүрэм](../../docs/ui/website-layout.md). Нүүрийн автомашины хайлт өгөгдөлтэй холбогдсон; PWA хараахан хэрэгжээгүй.

## URL routing

2026-09-13: App Router-ийн замууд үүссэн. [URL routing-ийн төлөв](../../docs/features/website-routing.md).
Нүүр хуудас нь `key="home"` Gallery-г HomeCarousel-д харуулна. Gallery байхгүй эсвэл зураггүй бол ерөнхий алдааны дэлгэц харуулна. Settings/Page module-оос уншихгүй; хуучин `homepage` тохиргоог ашиглахгүй. Header/footer хэвээр. [Carousel дүрэм](../../docs/features/website-routing.md#homecarousel).
Page content нь JSON string, `/vehicles`, `/parts`, `/tires` page-үүдийн үндсэн агуулга хоосон. Нүүрийн хайлт ажиллана; Бүгдийг харах нь `/vehicles` рүү query-гаа авч явна, тухайн дэлгэц болон builder хараахан холбоогүй.
File-read нь ID-аар DB-ээс олоод FILES_ROOT-оос эх файлыг stream хийнэ. URL-ийн originalName болон access шалгахгүй; sysop-той ижил header/алдааны дүрэмтэй. Зургийн URL: `/files/${imageId}/${encodeURIComponent(originalName)}`.

## Route шалгалт

Dev эсвэл production server ажиллаж байх үед root-оос `pnpm --filter @bigmotors/website test:routes` ажиллуулна.
Default origin нь http://127.0.0.1:64400; өөр сервер шалгахдаа `WEBSITE_TEST_URL` тохируулна.
Тест нь зөвхөн HTTP уншилт болон file route-ийн дэмждэггүй method-ийг шалгана; DB-д бичихгүй.
Ердийн route тестэд дор хаяж нэг item-тай `key="home"` Gallery байх шаардлагатай. Gallery байхгүй/хоосон production алдааны нөхцөлийг шалгахдаа `WEBSITE_TEST_HOME_ERROR=1`, `WEBSITE_TEST_URL`-д production server-ийн хаягийг өгнө. Энэ горимд 500 хариу болон дотоод алдааны тайлбар response-д задраагүйг шалгана; retry болон алдааны дэлгэцийг браузераар шалгана.

Lookup, file read, carousel HTML sanitization болон SSR тест: `pnpm --filter @bigmotors/website test`.

## Database орчин

Website нь өөрийн `.env.local`-ийн `DATABASE_URL`, `DATABASE_POOL_MIN`, `DATABASE_POOL_MAX`-ийг DBConfig-оор уншина. `.env.example` нь placeholder жишээ. Нууц утгуудыг NEXT_PUBLIC_* тохиргоонд оруулахгүй.
Root-ийн dev/build/typecheck командууд shared dependency-уудыг эхэлж build хийнэ. Package дотроос шууд ажиллуулах бол core/db-ийн dist бэлэн байх шаардлагатай.
Production-д website-д зориулсан зөвхөн унших эрхтэй DB credential тохируулна. Build үед DB connection шаардахгүй; хүсэлт ирэхэд холбогдоно.

## Файлын орчин

`FILES_ROOT` нь тухайн OS-ийн absolute зам байна. Dev дээр sysop-той ижил хавтас заана. Production-д sysop upload хадгалдаг volume-ийг website container-д read-only mount хийж, тухайн container доторх замыг өгнө. Website-д `FILES_UPLOADS` хэрэггүй. [Storage дүрэм](../../docs/operations/file-storage.md).
