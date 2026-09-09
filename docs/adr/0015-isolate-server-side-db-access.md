# 0015: Сервер талын shared DB хандалтыг тусгаарлах

- Огноо: 2026-09-09
- Төлөв: Баталсан
- Холбоотой баримт: [TASK-01](../../docs.task.md), [DB баримт](../db/README.md), [ADR 0013](0013-use-pnpm-workspace-layout.md), [ADR 0014](0014-use-bigmotors-scope-and-db-owned-migrations.md)

## Нөхцөл байдал

`packages/db` нь Drizzle schema, CRUD, migration болон seed-ийг эзэмшинэ. Website-ийн сервер тал болон admin backend үүнийг хамт ашиглах тул dependency, connection тохиргоо болон эрхийн зааг хэрэгтэй. Хэрэглэгч TASK-01-ийн техникийн саналыг бүрэн баталсан.

## Харьцуулсан хувилбарууд

- DB package нь app-ийн environment-ийг шууд уншиж, нийтлэг connection/credentials ашиглах: эхний тохиргоо бага боловч app-уудын орчин, lifecycle болон эрх хоорондоо холбогдоно.
- App бүр тохиргоогоо shared factory-д дамжуулж, тусдаа credentials ашиглах: shared CRUD-ийг хадгалж, орчин болон эрхийг тусгаарлана; connection lifecycle-ийг app бүрд зохион байгуулах шаардлагатай. Энэ хувилбарыг сонгосон.

## Шийдвэр

1. Dependency нь `web/website`-ийн сервер тал болон `sysop/server`-ээс `packages/db` рүү чиглэнэ. DB package нь app-уудаас хамаарахгүй.
2. Website-ийн client component, `sysop/app`, `sysop/dti`, browser/server shared `packages/core` нь DB runtime кодыг шууд болон дам импортлохгүй. DB код, driver болон credentials browser bundle-д орохгүй.
3. App бүр connection тохиргоогоо өөрийн environment/secrets-ээс авч, `packages/db`-ийн factory-д дамжуулна. DB package нь app-ийн environment-ийг өөрөө уншихгүй. App нь connection lifecycle буюу үүсгэх, дахин ашиглах, хаах ажиллагааг удирдана.
4. Website болон admin нь тусдаа PostgreSQL credentials/role ашиглана. Шаардлагатай хамгийн бага read/write эрхийг DB түвшинд хязгаарлаж, хэрэглэгчийн authorization-ийг сервер талд шалгана. Shared CRUD ашигласан нь ижил эсвэл бүрэн эрхтэй гэсэн үг биш.
5. Factory signature, driver/pool, transaction болон CRUD API-ийн нарийвчлалыг TASK-04-т шийднэ. Schema-ийн бүтэц, нийтэд харагдах талбар, үйлдэл тус бүрийн эрхийг дараа тодорхойлно. Эдгээр нь TASK-01-ийг батлахад шаардах нэмэлт шийдвэр биш.

## Үр дагавар

- Shared schema/CRUD хэвээр үлдэж, app-ийн secrets болон холболтын тохиргоо тусгаарлагдана.
- App бүрийн connection lifecycle, schema/app нийцэл, DB role-ийн зөвшөөрөл болон client bundle-д DB код орохгүйг хэрэгжүүлэлтийн үед шалгана.
- Энэ ADR нь 0013 болон 0014-ийг нэмэлтээр тодруулна; workspace бүтэц, migration/seed-ийн эзэмшлийг өөрчлөхгүй.
- Баталгаажуулалт нь код, DB role, connection эсвэл шалгалтын хэрэгжүүлэлт дууссан гэсэн үг биш. Бусад task-ийн санал батлагдаагүй хэвээр.
