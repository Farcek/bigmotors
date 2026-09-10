# @bigmotors/db

Каталогийн 22 хүснэгтийн Drizzle schema болон сервер талын DB factory. Зөвхөн `web/website`-ийн сервер тал, `sysop/server` ашиглана. Browser, `sysop/dti`, `packages/core` руу импортлохгүй.

- `src/schema/`: хүснэгт, багана, PK/FK, CHECK, index; [батлагдсан schema](../../docs/db/catalog-schema-proposal.md).
- `src/schema-hooks.ts`: PostgreSQL trigger/function-ийн TypeScript дахь эх тодорхойлолт. Import хийхэд DB-д үйлдэл хийхгүй.
- `src/db.ts`: `createPgPool(connectionString)`, `createDb(pool)`, `BigMotorsDb`. App pool-оо эзэмшиж, дахин ашиглаж, хаана.
- `test/`: PGlite санах ойн PostgreSQL тест; бодит DB болон файлд schema үүсгэхгүй.

Package exports: `@bigmotors/db`, `@bigmotors/db/schema`, `@bigmotors/db/schema-hooks`. ESM болон TypeScript declaration build-тэй.

Root-оос `pnpm build:db`, `pnpm typecheck:db`, `pnpm test:db` ажиллуулна. `core` dependency-г эдгээр команд эхэлж build хийнэ.

**Migration, snapshot, seed үүсгээгүй; бодит DB-д хэрэгжүүлээгүй.** CRUD, request validation, upload болон app integration дараагийн ажил. Trigger-гүйгээр хүснэгтүүдийг дангаар үүсгэвэл бүх invariant хамгаалагдахгүй. Дэлгэрэнгүй [хөгжүүлэх заавар](../../docs/operations/db-schema.md).
