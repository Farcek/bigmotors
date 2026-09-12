# 0033: Website-д Tailwind CSS ашиглах

- Огноо: 2026-09-12
- Төлөв: Баталсан
- Холбоотой баримт: [Next.js](0002-use-nextjs-and-nodejs-24.md), [Layout](../ui/website-layout.md), [TASK-07](../../docs.task.md#task-07-frontend-хэрэгслүүд)

## Нөхцөл байдал

Хэрэглэгч website хөгжүүлэлтийг эхлүүлж, CSS-д Tailwind ашиглахыг сонгосон.

## Харьцуулсан хувилбарууд

- Өмнө санал болгосон CSS Modules/CSS variables: custom CSS түлхүү шаардана; батлагдаагүй санал байсан.
- Tailwind CSS: utility class ашиглан layout болон responsive төлөвийг JSX дотор тодорхойлно. Хэрэглэгчийн сонголт.

## Шийдвэр

- `web/website` нь Next.js App Router, TypeScript болон Tailwind CSS 4 ашиглана.
- `@tailwindcss/postcss`-ийг package.json-ийн `postcss` тохиргоогоор холбоно; тусдаа JavaScript config үүсгэхгүй.
- Global CSS-д Tailwind import байрлана; custom CSS-ийг аль болох бичихгүй.
- Sysop app-ийн Mantine шийдвэр өөрчлөгдөхгүй.

## Үр дагавар

Website layout-ийн дээд өргөн 1440px, голлуулсан байна. Нийтлэг layout болон responsive зайг [UI баримт](../ui/website-layout.md)-д хөтөлнө. PWA, DB холболт, rendering/cache болон эцсийн дизайны үлдсэн шийдвэрийг энэ өөрчлөлтөөр баталсан гэж үзэхгүй.

## Эх сурвалж

- [Tailwind: Next.js installation](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [Next.js: PostCSS configuration](https://nextjs.org/docs/pages/guides/post-css)
