# @bigmotors/db

Каталогийн 22 хүснэгтийн Drizzle schema болон сервер талын DB factory. Зөвхөн `web/website`-ийн сервер тал, `sysop/server` ашиглана. Browser, `sysop/dti`, `packages/core` руу импортлохгүй.

- `src/schema/`: хүснэгт, багана, PK/FK, CHECK, index; [батлагдсан schema](../../docs/db/catalog-schema-proposal.md).
- `src/schema-hooks.ts`: PostgreSQL trigger/function-ийн TypeScript дахь эх тодорхойлолт. Import хийхэд DB-д үйлдэл хийхгүй.
- `src/db.ts`: `createPgPool(connectionString)`, `createDb(pool)`, `BigMotorsDb`. App pool-оо эзэмшиж, дахин ашиглаж, хаана.
- `drizzle.config.ts`, `migrations/`, `src/migrate.ts`: schema generate, versioned SQL болон тусдаа migration runner.
- `Dockerfile`: production migration-ийн one-shot image; repository root build context ашиглана. Runtime нь `DB_CONNECTION_STRING` шаарддаг.
- `test/`: PGlite санах ойн PostgreSQL тест; бодит DB болон файлд schema үүсгэхгүй.

Package exports: `@bigmotors/db`, `@bigmotors/db/schema`, `@bigmotors/db/schema-hooks`. ESM болон TypeScript declaration build-тэй.

Root-оос `pnpm build:db`, `pnpm typecheck:db`, `pnpm test:db` ажиллуулна. `core` dependency-г эдгээр команд эхэлж build хийнэ.

Root-оос `pnpm db:generate --name=change_name` нь SQL migration үүсгэнэ. `pnpm build:db`-ийн дараа `DB_CONNECTION_STRING`-тай `pnpm db:migrate` нь бодит DB-д хэрэгжүүлнэ. Local `.env` нь энэ package дотор байна. Website/backend startup migration ажиллуулахгүй. [Migration заавар](../../docs/operations/db-migrations.md).

**Эхний migration болон snapshot/journal үүссэн; бодит DB-д ажиллуулаагүй.** Seed, CRUD, request validation, upload болон app integration дараагийн ажил. Дэлгэрэнгүй [хөгжүүлэх заавар](../../docs/operations/db-schema.md).
