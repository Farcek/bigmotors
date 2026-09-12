# 0024: Migration-ийг DB package-ийн тусдаа release алхамд ажиллуулах

- Огноо: 2026-09-10
- Төлөв: Баталсан
- Холбоотой баримт: [ADR 0014](0014-use-bigmotors-scope-and-db-owned-migrations.md), [ADR 0023](0023-approve-catalog-schema.md), [ажиллуулах заавар](../operations/db-migrations.md)

## Нөхцөл байдал

Каталогийн schema код бэлэн. Хэрэглэгч migration файл, команд `packages/db` дотор байх, root-оос дуудах, local-д гараар, production-д deployment-ийн тусдаа нэг алхамд ажиллуулах саналыг баталж хэрэгжүүлэхийг хүссэн.

## Харьцуулсан хувилбарууд

- App startup бүрд migration ажиллуулах: олон instance зэрэг эхлэх үед зөрчилдөнө, app-д DDL credential шаарддаг.
- DB package-ийн тусдаа command/release job: schema өөрчлөлтийг хяналттай дарааллаар ажиллуулж, credential болон алдааны заагийг тусгаарлана.

## Шийдвэр

Хоёр дахь хувилбарыг сонгосон. `drizzle.config.ts`, `migrations/`, `db:generate`, `db:migrate` нь `packages/db`-ийн эзэмшил; root нь тэдгээрийг дуудах командтай. Website/backend startup migration ажиллуулахгүй. Production-д review хийсэн SQL-ийг тусдаа нэг release job хэрэгжүүлнэ.

Хэрэгжүүлэлтийн нарийвчлал: Drizzle Kit generate, Drizzle ORM migrator, migration job-д зориулсан `DB_CONNECTION_STRING`, dedicated `pg` session, advisory lock. Хэрэглэгчийн шинэчилсэн хүсэлтээр хувьсагчийн нэрийг `DB_CONNECTION_STRING` болгож, `packages/db/Dockerfile`-д production one-shot image нэмсэн. Нэр нь нийтлэг боловч migration credential нь app runtime credential-оос тусдаа хэвээр. Trigger/function-ийг versioned SQL-д хамт хадгална. Seed workflow болон production pipeline-ийн бодит provisioning энэ баталгаанд орохгүй.

2026-09-12 шинэчлэлт: хэрэглэгчийн хүсэлтээр `db:migrate` нь `db:reset` болон runtime-тай ижил `DBConfig.DATABASE_URL` ашиглана. Дээрх `DB_CONNECTION_STRING` нэр нь өмнөх хэрэгжүүлэлтийн түүх; одоо fallback байхгүй. Release job, dedicated session, lock болон тусдаа DDL credential-ийн шийдвэр өөрчлөгдөхгүй.

## Үр дагавар

- Эхний schema + trigger migration, snapshot/journal, built runner болон тест үүссэн; бодит DB дээр ажиллуулаагүй.
- Release artifact-д migration SQL/journal болон built runner заавал орно. Ажилласан migration-ийг буцааж засахгүй.
- Production job/role/TLS, backup/restore, PostgreSQL multi-session concurrency тест болон урт DDL-ийн ажиллагааг deployment-ээс өмнө баталгаажуулна.
