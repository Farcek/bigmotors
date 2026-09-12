# Архитектурын шийдвэрийн бүртгэл

2026-09-10: [ADR 0025: Салбар ба бүтээгдэхүүний байршлыг салгах](0025-separate-branches-and-locations.md) нь өмнөх салбар/байршлыг нэгтгэсэн хэсгийг орлоно. Бусад шийдвэр хэвээр.

ADR (Architecture Decision Record) нь техникийн чухал шийдвэр, түүний шалтгаан болон үр дагаврыг хадгална.

## Шийдвэрийн жагсаалт

| ADR | Огноо | Төлөв |
| --- | --- | --- |
| [0001: Monorepo бүтэц](0001-use-monorepo.md) | 2026-09-08 | Баталсан |
| [0002: Next.js болон Node.js 24](0002-use-nextjs-and-nodejs-24.md) | 2026-09-08 | Баталсан |
| [0003: Drizzle ORM](0003-use-drizzle-orm.md) | 2026-09-08 | Баталсан |
| [0004: Үндсэн @napp сангууд](0004-use-napp-libraries.md) | 2026-09-08 | Баталсан |
| [0005: PostgreSQL болон Drizzle migration workflow](0005-use-postgresql-and-drizzle-migrations.md) | 2026-09-08 | Баталсан |
| [0006: Бүх кодыг TypeScript дээр бичих](0006-use-typescript-for-all-code.md) | 2026-09-08 | Баталсан |
| [0007: sysop-app-д Mantine болон Vite ашиглах](0007-use-mantine-and-vite-for-sysop-app.md) | 2026-09-08 | Баталсан |
| [0008: Frontend хэсгүүдэд @tabler/icons-react ашиглах](0008-use-tabler-icons-react.md) | 2026-09-08 | Баталсан |
| [0009: Shared library-уудыг tsdown-оор build хийх](0009-use-tsdown-for-shared-libraries.md) | 2026-09-08 | Баталсан |
| [0010: sysop-server-д Express.js ашиглах](0010-use-express-for-sysop-server.md) | 2026-09-08 | Баталсан |
| [0011: Нийтлэг хэрэгцээнд тогтсон npm санг түлхүү ашиглах](0011-prefer-established-npm-libraries.md) | 2026-09-08 | Баталсан |
| [0012: DB бүтэц болон CRUD-ийн shared repository](0012-share-drizzle-db-repository.md) | 2026-09-09 | ADR 0013-аар орлуулсан |
| [0013: pnpm workspace болон хавтасны бүтэц](0013-use-pnpm-workspace-layout.md) | 2026-09-09 | Баталсан |
| [0014: @bigmotors scope болон DB migration/seed эзэмшил](0014-use-bigmotors-scope-and-db-owned-migrations.md) | 2026-09-09 | Баталсан |
| [0015: Сервер талын shared DB хандалтыг тусгаарлах](0015-isolate-server-side-db-access.md) | 2026-09-09 | Баталсан |
| [0016: Автомашины DB лавлах ба enum/const](0016-separate-vehicle-lookups-and-constants.md) | 2026-09-10 | Баталсан |
| [0017: Сэлбэгийн DB лавлах ба enum/const](0017-use-part-reference-data.md) | 2026-09-10 | Баталсан |
| [0018: Дугуйн DB лавлах ба enum/const](0018-use-tire-reference-data.md) | 2026-09-10 | Баталсан |
| [0019: Userly admin нэвтрэлт ба ACL](0019-use-userly-admin-authentication-and-acl.md) | 2026-09-10 | Баталсан |
| [0020: Sysop server суурь tooling](0020-initialize-sysop-server-tooling.md) | 2026-09-10 | Баталсан |
| [0021: Sysop DTI суурь initialize](0021-initialize-sysop-dti.md) | 2026-09-10 | Баталсан |
| [0022: Бүтээгдэхүүний зургийг hard disk дээр хадгалах](0022-store-product-images-on-disk.md) | 2026-09-10 | ADR 0029-өөр хэсэгчлэн орлуулсан |
| [0023: Каталогийн нэгтгэсэн schema](0023-approve-catalog-schema.md) | 2026-09-10 | ADR 0025, 0029-өөр хэсэгчлэн орлуулсан |
| [0024: Migration-ийг тусдаа release алхамд ажиллуулах](0024-run-db-migrations-as-release-step.md) | 2026-09-10 | Баталсан |
| [0026: Sysop app-д React Router Data Mode ашиглах](0026-use-react-router-data-mode.md) | 2026-09-12 | Баталсан |
| [0027: Admin UI kit-ийг app дотор нэгтгэх](0027-use-app-local-admin-ui-kit.md) | 2026-09-12 | Баталсан |
| [0028: Mantine useForm, нэмэлт cache-гүй admin](0028-use-mantine-form-without-query-cache.md) | 2026-09-12 | Баталсан |
| [0029: Зураг болон файлын нэгдсэн бүртгэл](0029-use-shared-files.md) | 2026-09-12 | Баталсан |
| [0030: Файлын upload ба ашиглалтыг нэгтгэх](0030-unify-file-management.md) | 2026-09-12 | Замын суурийг ADR 0031-ээр орлуулсан |
| [0031: Файлын замыг FILES_ROOT-оос тооцох](0031-use-files-root-for-storage-paths.md) | 2026-09-12 | Баталсан |

## Бүртгэх шийдвэрүүд

- Вебийн технологи, архитектурын сонголт
- Өгөгдлийн сан болон мэдээлэл удирдах арга
- Зураг, файл хадгалах шийдэл
- Нэвтрэлт, эрхийн зохицуулалт шаардлагатай бол түүний шийдэл
- Байршуулах орчин, гаднын системийн холболт

## Файлын нэр ба төлөв

Файлыг `0001-short-decision-title.md` хэлбэрээр дараалсан дугаартай үүсгэнэ. Дугаарыг дахин ашиглахгүй.

Төлөв: санал болгосон, баталсан, татгалзсан, хүчингүй болсон, өөр шийдвэрээр орлуулсан.

## ADR загвар

```markdown
# 0001: Шийдвэрийн нэр

- Огноо: YYYY-MM-DD
- Төлөв: Санал болгосон
- Холбоотой баримт:

## Нөхцөл байдал

Ямар асуудал, шаардлага, хязгаарлалтаас үүссэн бэ?

## Харьцуулсан хувилбарууд

Боломжит сонголтууд, давуу болон сул тал.

## Шийдвэр

Ямар хувилбарыг, яагаад сонгосон бэ?

## Үр дагавар

Давуу тал, сул тал, эрсдэл, цаашид хийх ажил.
```

Батлагдсан шийдвэрийг өөрчлөхдөө шинэ ADR үүсгэж, өмнөх ADR-ийн төлөв болон орлуулах баримтын холбоосыг шинэчилнэ. Өмнөх шийдвэрийн түүхийг хадгална.
