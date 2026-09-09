# 0013: pnpm workspace болон хавтасны бүтцийг тогтоох

- Огноо: 2026-09-09
- Төлөв: Баталсан
- Үндэслэл: Хэрэглэгчийн TASK-02-ын шийдвэр
- Орлуулах ADR: [0012](0012-share-drizzle-db-repository.md); DB schema/CRUD-ийн үүргийг хадгалж, байрлалыг monorepo дотор тодруулсан
- Холбоотой баримт: [Monorepo](0001-use-monorepo.md), [Task бүртгэл](../../docs.task.md), [Өгөгдлийн сан](../db/README.md)

## Нөхцөл байдал

Monorepo ашиглах нь батлагдсан боловч package manager болон физик хавтасны бүтэц нээлттэй байсан. Хэрэглэгч pnpm workspace болон дараах зургаан байршлыг заасан. Өмнөх ADR 0012-т DB кодыг тусдаа repository гэж бүртгэсэн байсныг `packages/db` байрлалаар шинэчилнэ.

## Харьцуулсан хувилбарууд

- `apps/*`, `packages/*` бүтэц: өмнөх батлагдаагүй санал.
- `web/*`, `sysop/*`, `packages/*` бүтэц: хэрэглэгчийн сонгосон хувилбар.

## Шийдвэр

Package manager болон workspace удирдлагад **pnpm workspace** ашиглана.

| Хавтас | Логик хэсэг | Үүрэг |
| --- | --- | --- |
| `web/website` | `website` | Next.js public website |
| `sysop/app` | `sysop-app` | Mantine, Vite admin frontend |
| `sysop/dti` | `sysop-dti` | Admin frontend/backend-ийн API contract |
| `sysop/server` | `sysop-server` | Express.js admin backend |
| `packages/core` | `core` | Shared enum, тогтмол утга, helper, functions |
| `packages/db` | `db` | Drizzle schema болон CRUD-ийн shared package |

`packages/db` нь энэ monorepo-ийн дотоод shared package байна. Үүнийг `web/website`-ийн сервер тал болон `sysop/server` хамт ашиглаж, schema болон нийтлэг CRUD-ийг нэг газар хөтөлнө. DB код browser bundle-д орохгүй; `sysop/app` нь `sysop/dti` contract-оор backend-тэй харилцана.

Хавтасны нэр нь `package.json` дахь package нэрийг автоматаар тогтоохгүй. Нийтлэг scope-ийг [ADR 0014](0014-use-bigmotors-scope-and-db-owned-migrations.md)-өөр `@bigmotors/*` гэж баталсан. Package-ийн бүтэн нэр, dependency protocol, build/watch дараалал болон pnpm-ийн яг хувилбарыг хэрэгжүүлэлтийн тохиргоотой уялдуулна.

## Үр дагавар

- DB код авах тусдаа Git repository эсвэл registry түгээлт шаардах өмнөх заалт хүчингүй болно.
- DB schema/CRUD-ийн дундын үүрэг, PostgreSQL, Drizzle, TypeScript болон бусад батлагдсан технологи хэвээр байна.
- TASK-02-ын package manager, хавтасны бүтэц батлагдсан. Бусад task-ийн эрх, migration, schema загвар болон build зохион байгуулалтын саналыг бүхэлд нь батлаагүй.
- 2026-09-09: Батлагдсан зургаан хавтсыг үүсгэж, дараагийн хүсэлтээр root болон package бүрд минимал `package.json` нэмсэн. Нэршил болон одоогийн хэрэгжүүлэлтийг [README](../../README.md)-д бүртгэсэн. Эдгээр нь нэг Git repository-ийн дотоод package; тусдаа Git repository биш. Workspace тохиргоо болон эх код хараахан үүсээгүй.

## Нээлттэй асуултууд

- `@bigmotors/*` scope доторх package-ийн бүтэн нэр болон дотоод dependency-ийн бичлэг ямар байх вэ?
- Build/dev/watch дараалал, cache зохион байгуулалт болон pnpm-ийн яг хувилбар юу байх вэ?
- Migration/seed-ийн эзэн `packages/db` болохыг ADR 0014, connection болон эрх тусгаарлах архитектурыг [ADR 0015](0015-isolate-server-side-db-access.md)-аар баталсан. Дотоод файлын бүтэц, ажиллуулах журам, CRUD API, driver болон өгөгдөл/үйлдэл тус бүрийн эрхийг цаашид тодорхойлно.
