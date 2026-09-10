# Ашиглалт ба үйл ажиллагаа

Веб сайтыг ажиллуулах, шинэчлэх, хянах болон доголдлоос сэргээх зааврыг энд хадгална.

## Runtime-ийн шаардлага

Төслийн Node.js runtime нь **24.x** байна. Хөгжүүлэлт, build, CI болон Node.js ашиглах серверийн орчинд энэ үндсэн хувилбарыг баримтална. Шийдвэрийг [ADR 0002](../adr/0002-use-nextjs-and-nodejs-24.md)-д бүртгэсэн.

[ADR 0009](../adr/0009-use-tsdown-for-shared-libraries.md)-ийн дагуу доод хувилбар нь **24.11.0**: `>=24.11.0 <25`.

Package manager нь [ADR 0013](../adr/0013-use-pnpm-workspace-layout.md)-ийн дагуу **pnpm workspace** байна. Backend initialize хүрээнд pnpm `11.19.0`, server install/build/start командууд [ADR 0020](../adr/0020-initialize-sysop-server-tooling.md)-оор тогтсон. Node.js `24.14.0` дээр шалгасан; бусад app болон production deployment бэлэн гэсэн үг биш.

## Build ба type checking

| Хэсэг | Хэрэгсэл |
| --- | --- |
| `web/website` | Next.js |
| `sysop/app` | Vite |
| `sysop/server` | tsdown Node24 ESM; tsx dev watch |
| `packages/core`, `sysop/dti`, `packages/db` | tsdown, ESM + `.d.ts` |
| Type checking | `tsc --noEmit` |

Shared library сонголтыг [ADR 0009](../adr/0009-use-tsdown-for-shared-libraries.md)-д хөтөлнө. Server, DTI, core болон DB-ийн бодит script, strict TypeScript config, dependency үүссэн; website болон sysop/app-ийн setup нээлттэй хэвээр.

## Агуулга

- [DB schema хөгжүүлэх](db-schema.md): 22 хүснэгтийн TypeScript schema, core тогтмолууд, build/typecheck/test, trigger source болон хэрэгжээгүй integration-ийн зааг.
- [DB migration ажиллуулах](db-migrations.md): generate/migrate команд, эхний SQL, local тохиргоо, production Docker image, `DB_CONNECTION_STRING`, release job, lock/history болон алдаа сэргээх зааг.

- [Зургийн hard disk хадгалалтын шийдвэр](../adr/0022-store-product-images-on-disk.md): persistent disk, DB + файл backup, serve/access-ийн зааг; бодит хавтас болон upload setup хараахан хийгдээгүй.
- [Sysop server ажиллуулах](sysop-server.md): бодит scaffold, dev/build/start/test, environment, endpoint болон хэрэгжээгүй хэсгийн зааг.
- [Sysop DTI хөгжүүлэх](sysop-dti.md): contract бүтэц, ESM/declaration build, watch, validation болон тест.
- [Userly нэвтрэлт ба ACL-ийн ашиглалтын шаардлага](userly-authentication.md): тусдаа client/resource provisioning, runtime config, snapshot cache/recovery, нууц мэдээллийн зааг. Бодит орчны тохиргоо болон deployment хараахан хийгдээгүй.
- Database-ийн ашиглалтын сонголт: PostgreSQL, Drizzle ORM, Drizzle migration workflow. [ADR 0005](../adr/0005-use-postgresql-and-drizzle-migrations.md)-ыг баримтална.
- Migration болон seed-ийн файл, логик, командыг `packages/db` хариуцна. [ADR 0014](../adr/0014-use-bigmotors-scope-and-db-owned-migrations.md)-ыг баримтална; deployment дахь ажиллуулах эрх, цаг болон дараалал тусад нь шийдэгдэнэ.
- Migration команд болон тусдаа release алхмын арга [ADR 0024](../adr/0024-run-db-migrations-as-release-step.md)-өөр тогтсон; production job/credential болон backup/restore-ийн бодит тохиргоо тусдаа.

- Хөгжүүлэлт, туршилт, бодит ашиглалтын орчны тохиргоо
- Локал орчинд ажиллуулах шаардлага, алхмууд
- Орчны хувьсагчийн нэр, зориулалт, жишээ утга
- Хувилбар гаргах, серверт байршуулах, шинэчлэлтийг шалгах, өмнөх хувилбарт буцаах
- Домэйн, DNS, HTTPS гэрчилгээний тохиргоо
- Лог, ажиллагааны хяналт, алдааны мэдэгдэл
- Өгөгдөл болон зургийн нөөцлөлт, сэргээх заавар, сэргээх туршилт
- Доголдол шийдвэрлэх алхам, хариуцагч, холбоо барих суваг
- Автомашины мэдээлэл, үнэ, төлөв болон компанийн мэдээлэл шинэчлэх журам

## Зааврын бүтэц

Ажиллагаа бүрд зорилго, урьдчилсан нөхцөл, шаардлагатай эрх, гүйцэтгэх алхам, амжилтыг шалгах арга, алдаа гарвал авах арга хэмжээг бичнэ.

Байршуулах үйлчилгээ, ажиллуулах команд болон хариуцагч одоогоор тодорхойгүй. Шийдэгдсэн үед бодит тохиргоогоор шинэчилж, архитектурын сонголтыг [ADR](../adr/README.md)-тай холбоно. Нууц үг, API түлхүүр болон бусад нууц мэдээллийг баримтад хадгалахгүй.
