# 0012: DB бүтэц болон CRUD-ийг тусдаа shared repository-д төвлөрүүлэх

- Огноо: 2026-09-09
- Төлөв: Өөр шийдвэрээр орлуулсан
- Орлуулсан: [ADR 0013](0013-use-pnpm-workspace-layout.md), 2026-09-09. DB schema/CRUD-ийн үүрэг хадгалагдаж, байрлал нь monorepo доторх `packages/db` болсон. Доорх агуулга нь өмнөх шийдвэрийн түүх.
- Үндэслэл: Хэрэглэгчийн DB shared repository-ийн шийдвэр
- Холбоотой баримт: [Task бүртгэл](../../docs.task.md), [Өгөгдлийн сан](../db/README.md), [Monorepo](0001-use-monorepo.md), [PostgreSQL ба Drizzle](0005-use-postgresql-and-drizzle-migrations.md)

## Нөхцөл байдал

`website` болон `sysop-server` нь ижил өгөгдлийн сантай ажиллах тул DB бүтэц болон CRUD логикийг дундаа ашиглах шаардлагатай. Task бүртгэлд өмнө нь monorepo дотор `packages/db` нэмэх санал байсан бөгөөд батлагдаагүй.

## Харьцуулсан хувилбарууд

- Monorepo дотор `packages/db` байрлуулах: өмнөх батлагдаагүй санал.
- Тусдаа shared repository ашиглах: хэрэглэгчийн сонгосон хувилбар.

## Шийдвэр

- Drizzle ORM-д суурилсан тусдаа shared repository нь DB бүтэц (schema) болон CRUD буюу үүсгэх, унших, шинэчлэх, устгах өгөгдлийн үйлдлүүдийг хариуцна.
- `website`-ийн сервер тал болон `sysop-server` энэ shared кодыг хамт ашиглана.
- DB schema болон нийтлэг CRUD логикийг хоёр app-д тус тусад нь давхар хэрэгжүүлэхгүй.
- Энэ нь хамт ашиглах кодын repository; тусдаа HTTP API үйлчилгээ сонгосон гэсэн үг биш.
- `sysop-app` нь admin API-тай `sysop-dti` contract-оор харилцана. DB shared код browser bundle-д орохгүй.
- PostgreSQL, Drizzle ORM, Drizzle migration workflow болон TypeScript-ийн батлагдсан сонголтууд хэвээр байна.

## Үр дагавар

- DB schema болон CRUD-ийн өөрчлөлтийг нэг газар хөтөлж, хэрэглэгч хоёр app-тай нийцүүлнэ.
- Shared repository-ийн хувилбар, dependency хүргэх арга болон schema өөрчлөлтийн rollout-ийг тохирох шаардлагатай.
- Shared CRUD ашиглаж байгаа нь хоёр app ижил DB эрхтэй гэсэн үг биш. Website-ийн зөвшөөрөх үйлдэл, public талбар болон authorization-ийн зааг TASK-01-д нээлттэй үлдэнэ.
- TASK-01 болон TASK-04-ийн энэ хэсэг батлагдсан. Driver, хүснэгтийн загвар, migration/seed болон эрхийн өмнөх саналуудыг бүхэлд нь батлаагүй.

## Нээлттэй асуултууд

- Shared repository-ийн нэр, URL, экспортлох package нэр болон version/release журам юу байх вэ?
- Dependency-г registry, Git эсвэл өөр аргаар хэрхэн хүргэх вэ?
- Migration/seed файлуудын байршил, ажиллуулах эзэн болон schema/app хувилбаруудын нийцлийг хэрхэн удирдах вэ?
- Website болон sysop-server-ийн CRUD эрх, public өгөгдлийн зааг ямар байх вэ?
- CRUD API, transaction, connection/pool болон driver-ийн тохиргоо ямар байх вэ?
