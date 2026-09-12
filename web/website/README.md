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
- `src/app/globals.css`: Tailwind import.
- `package.json`: PostCSS plugin болон ажиллуулах командууд.

[Layout дүрэм](../../docs/ui/website-layout.md). Каталогийн өгөгдөл, website file-read route болон PWA хараахан хэрэгжээгүй.
