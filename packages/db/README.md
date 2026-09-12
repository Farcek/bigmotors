# @bigmotors/db

Каталогийн 24 хүснэгтийн Drizzle schema болон сервер талын DB factory. Зөвхөн `web/website`-ийн сервер тал, `sysop/server` ашиглана. Browser, `sysop/dti`, `packages/core` руу импортлохгүй.

- `src/schema/`: хүснэгт, багана, PK/FK, CHECK, index; [батлагдсан schema](../../docs/db/catalog-schema-proposal.md).
- `src/schema-hooks.ts`: PostgreSQL trigger/function-ийн TypeScript дахь эх тодорхойлолт. Import хийхэд DB-д үйлдэл хийхгүй.
- `src/config.ts`: `DBConfig(env)` нь `DATABASE_URL`-ийг шаарддаг; `DATABASE_POOL_MIN` (default `0`), `DATABASE_POOL_MAX` (default `10`) нь safe integer, `0 <= min <= max`, `max > 0` байна. Хоосон утга, `NaN`, хязгааргүй болон бутархай тоог зөвшөөрөхгүй. DI нь `@bigmotors/core`-ийн `TKN_ENV` token-оор environment авна. Migration-ийн `DB_CONNECTION_STRING` тохиргоо өөрчлөгдөхгүй.
- `src/db.ts`: `createPgPool(config)`, `createDb(pool)`, `BigMotorsDb`. App pool-оо эзэмшиж, дахин ашиглаж, хаана.
- `src/service/color.ts`: `ColorService(db)` нь өнгөний list/create/update/delete, Zod validation болон `@napp/error` алдааны mapping-ийг хариуцна. `@bigmotors/db`-ээс импортлоно; [ашиглах дүрэм](../../docs/operations/db-schema.md#colorservice).
- `src/service/branch.ts`: `BranchService(db)` нь компанийн салбарын list/create/update/delete; өнгөтэй ижил validation, pagination, алдааны бүтэцтэй. [Ашиглах дүрэм](../../docs/operations/db-schema.md#branchservice).
- `drizzle.config.ts`, `migrations/`, `src/migrate.ts`: schema generate, versioned SQL болон тусдаа migration runner.
- `Dockerfile`: production migration-ийн one-shot image; repository root build context ашиглана. Runtime нь `DB_CONNECTION_STRING` шаарддаг.
- `test/`: PGlite санах ойн PostgreSQL тест; бодит DB болон файлд schema үүсгэхгүй. Service тестүүд `diDBServiceProviders()`-ийг бүртгүүлж, PGlite Drizzle adapter-ийг `TKN_DB`-д холбоод container-оос service авна. `diDBCoreProviders()`-ийн config/pool/DB бүртгэлийг холболт нээхгүйгээр тусдаа шалгана; тест бүр container болон өөрийн DB/pool-оо хаана.

Package exports: `@bigmotors/db`, `@bigmotors/db/schema`, `@bigmotors/db/schema-hooks`. ESM болон TypeScript declaration build-тэй.

Root-оос `pnpm build:db`, `pnpm typecheck:db`, `pnpm test:db` ажиллуулна. `core` dependency-г эдгээр команд эхэлж build хийнэ.

Root-оос `pnpm db:generate --name=change_name` нь SQL migration үүсгэнэ. `pnpm build:db`-ийн дараа `DB_CONNECTION_STRING`-тай `pnpm db:migrate` нь бодит DB-д хэрэгжүүлнэ. Local `.env` нь энэ package дотор байна. Website/backend startup migration ажиллуулахгүй. [Migration заавар](../../docs/operations/db-migrations.md).

Бүх 12 лавлахын shared CRUD, DTI болон API холболт хэрэгжсэн. [Энгийн лавлахууд](../../docs/operations/db-schema.md#flat-reference-services), [эцэгтэй лавлахууд](../../docs/operations/db-schema.md#parent-reference-services). Бүтээгдэхүүний CRUD, seed, upload болон admin form дараагийн ажил.
