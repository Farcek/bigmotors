# 0009: Shared library-уудыг tsdown-оор build хийх

- Огноо: 2026-09-08
- Төлөв: Баталсан
- Үндэслэл: Хэрэглэгч shared library builder-ийн саналыг зөвшөөрсөн
- Холбоотой баримт: [Monorepo](0001-use-monorepo.md), [Node.js 24](0002-use-nextjs-and-nodejs-24.md), [TypeScript](0006-use-typescript-for-all-code.md), [Ашиглалт](../operations/README.md)

## Нөхцөл байдал

`core`, `sysop-dti` болон shared library-уудын TypeScript эх кодыг хэрэглэгч package-ууд ашиглах JavaScript болон төрлийн тодорхойлолт болгон build хийх нийтлэг хэрэгсэл шаардлагатай.

## Харьцуулсан хувилбарууд

- `tsdown`: library bundling, ESM output болон `.d.ts` үүсгэх боломжийг нэг build хэрэгслээр зохион байгуулна.
- `tsc`: bundle хийх шаардлагагүй үед TypeScript хөрвүүлэлт болон declaration output дангаараа хангалттай хувилбар.

Library build-ийг нэг стандартаар явуулахын тулд `tsdown` сонгосон.

## Шийдвэр

- `core`, `sysop-dti` болон төслийн shared library-уудын builder нь `tsdown` байна.
- Library build-ийн output нь ESM JavaScript болон `.d.ts` байна. Declaration output-ийг тохиргоонд илэрхий идэвхжүүлнэ.
- Browser болон server хоёул ашиглах shared кодод `platform: 'neutral'` хэрэглэнэ. Энэ тохиргоо нь кодын орчны нийцлийг өөрөө баталгаажуулахгүй тул shared кодын dependency-г мөн шалгана.
- Type checking-ийг `tsc --noEmit`-ээр тусад нь хийнэ.
- Төслийн Node.js 24.x сонголтын доод хязгаарыг **24.11.0** болгоно: `>=24.11.0 <25`. Яг хувилбарыг хэрэгжүүлэлтийн үед тогтооно.
- `website` нь Next.js, `sysop-app` нь Vite build ашиглах шийдвэр хэвээр байна.

Энэ шийдвэр нь `sysop-server`-ийн builder, package manager болон monorepo түвшний build дараалал, cache удирдах хэрэгслийг тогтоохгүй.

## Үр дагавар

- Shared package-уудын build тохиргоог TypeScript дээр бичиж, output болон package export-уудыг уялдуулна.
- Browser хэрэглэгчтэй shared кодын target-ийг дэмжих browser-ийн хүрээнд нийцүүлнэ; зөвхөн Node.js хувилбараар тогтоохгүй.
- Хөгжүүлэлт болон CI орчинд library build, type check хоёрыг шалгана.
- Node.js орчинд дээрх доод хувилбарыг баримталж, сонгох tsdown хувилбарын нийцлийг суулгах үед дахин шалгана.
- Энэ нь технологийн сонголтын баримт бөгөөд dependency, build script болон орчны тохиргоо одоогоор үүсгээгүй.

## Нээлттэй асуултууд

- tsdown, TypeScript болон Node.js-ийн яг хувилбарууд юу байх вэ?
- Package entry, exports, output хавтас болон browser target ямар байх вэ?
- Workspace package-уудын dependency, build/watch дарааллыг хэрхэн зохион байгуулах вэ?

## Эх сурвалж

- [tsdown build, output болон declaration тайлбар](https://tsdown.dev/guide/how-it-works)
- [tsdown platform тохиргоо](https://tsdown.dev/options/platform)
- [tsdown Node.js орчны шаардлага](https://tsdown.dev/guide/getting-started)
