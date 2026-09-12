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
- `src/app/page.tsx`: эхний суурь хуудас.
- `src/app/[slug]/page.tsx`: Page module-ийн хоосон route.
- `src/app/vehicles`, `parts`, `tires`: жагсаалт болон `[id]` дэлгэрэнгүй хоосон route-ууд.
- `src/app/files/[id]/[originalName]/route.ts`: түр 501 хариутай file-read route.
- `src/app/not-found.tsx`: нийтлэг 404.
- `src/app/globals.css`: Tailwind import.
- `package.json`: PostCSS plugin болон ажиллуулах командууд.

[Layout дүрэм](../../docs/ui/website-layout.md). Каталогийн өгөгдөл, website file-read route болон PWA хараахан хэрэгжээгүй.

## URL routing

2026-09-13: App Router-ийн замууд үүссэн. [URL routing-ийн төлөв](../../docs/features/website-routing.md).
Нүүр хуудас/header/footer хэвээр; шинэ page-үүдийн үндсэн агуулга хоосон.
DB/service, settings.homepage, content renderer, хайлт/шүүлтийн query логик холбоогүй.
File-read-ийн URL үүссэн боловч бодит уншилт хараахан хэрэгжээгүй.

## Route шалгалт

Dev эсвэл production server ажиллаж байх үед root-оос `pnpm --filter @bigmotors/website test:routes` ажиллуулна.
Default origin нь http://127.0.0.1:64400; өөр сервер шалгахдаа `WEBSITE_TEST_URL` тохируулна.
Тест нь зөвхөн HTTP уншилт болон file route-ийн дэмждэггүй method-ийг шалгана; DB-д бичихгүй.
