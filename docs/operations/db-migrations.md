# DB Migration

- Огноо: 2026-09-10
- Төлөв: Тохиргоо, команд, эхний SQL migration болон тест хэрэгжсэн. Бодит local/staging/production DB дээр ажиллуулаагүй.
- Шийдвэр: [ADR 0024](../adr/0024-run-db-migrations-as-release-step.md).

## Байршил

| Байршил | Үүрэг |
| --- | --- |
| `packages/db/drizzle.config.ts` | PostgreSQL, `src/schema/index.ts`, `migrations/` output |
| `packages/db/migrations/` | SQL болон Drizzle snapshot/journal |
| `packages/db/src/migrate.ts` | Зөвхөн migration хийх тусдаа entry point |
| `packages/db/src/migrations.ts` | Migration folder/history тохиргоо, credential validation |
| `packages/db/.env.example` | Нууц биш local connection загвар |

Drizzle Kit `0.31.10` нь dev dependency, migration runner нь одоо ашиглаж буй Drizzle ORM `0.45.2` болон `pg`-ийн migrator/client ашиглана. `core`-ийн `default` export мөн ESM файл руу заана; энэ нь Kit-ийн CommonJS schema loader-той нийцүүлэх тохиргоо, тусдаа CommonJS build биш.

## Local Ажиллагаа

Repository root-оос:

```powershell
pnpm install --frozen-lockfile
pnpm db:generate --name=change_name
pnpm typecheck:db
pnpm test:db
pnpm build:db
pnpm db:migrate
```

`db:generate` нь зөвхөн файл үүсгэнэ, DB connection хэрэггүй. `core`-ийг эхлээд build хийж одоогийн TypeScript schema-г уншина. SQL diff байхгүй бол шинэ migration үүсгэхгүй. Эхний `0000_initial_catalog.sql` аль хэдийн байгаа тул анхны setup-д дахин generate хийх шаардлагагүй.

**`db:migrate` нь бодит DB-г өөрчилнө.** Ажиллуулахаас өмнө `MIGRATION_DATABASE_URL`-ийг зорьсон DB рүү тохируулна. Local-д `packages/db/.env` ашиглаж болно; загвар нь [.env.example](../../packages/db/.env.example). OS/deployment environment утга нь `.env`-ээс давуу. URL-ийг command argument, git, log-д оруулахгүй. Тохиргоогүй/буруу URL үед runner DB рүү холбогдохгүй, алдаатай exit code өгнө. App-ийн `DATABASE_URL` болон `PG*` утгаар URL-ийг орлуулахгүй.

`db:migrate` өмнө `pnpm build:db` шаардлагатай. Runner нь `dist/migrate.mjs`; SQL folder-ийг module-ийн байршлаас олно, ажиллуулсан current directory-оос хамаарахгүй. Root команд нь DB package-ийн команд руу дамжуулна.

Эхний migration **хоосон application schema**-д зориулагдсан. Хүснэгт нь өмнө өөр аргаар үүссэн DB дээр шууд ажиллуулахгүй, journal-д хуурамч applied мөр нэмж тааруулахгүй. Existing DB baseline/өгөгдөл шилжүүлэх шаардлагыг тусад нь төлөвлөнө.

## Trigger Өөрчлөх

Анхны migration-д хүснэгт/FK/index-ийн дараа `schema-hooks.ts`-ийн trigger/function тодорхойлолтыг SQL хэлбэрээр оруулж хадгалсан. Runtime нь TypeScript hook source-ийг дахин уншиж, өөрчилж хэрэгжүүлэхгүй.

Drizzle Kit эдгээр trigger-ийг schema diff-ээр автоматаар гаргахгүй. Дараагийн өөрчлөлтөд:

```powershell
pnpm db:generate --custom --name=update_catalog_triggers
```

Үүссэн шинэ SQL-д тухайн өөрчлөлтийн `CREATE OR REPLACE FUNCTION`, шаардлагатай trigger DDL болон өгөгдөлтэй нийцэх алхмыг хяналттай бичнэ. Source болон тестийг хамт шинэчилнэ. Өмнө ажилласан SQL/snapshot/journal-ийг буцааж засахгүй. `db:push` command нэмээгүй.

## Deployment

1. CI/build үеэр dependency install, DB build болон тест хийнэ. Generate-ийг deployment дээр хийхгүй; review хийгдсэн SQL/journal-ийг release-д оруулна.
2. Migration job-д `packages/db/dist/`, `packages/db/migrations/`, package manifest болон шаардлагатай production dependency-г өгнө. Runner-д Drizzle Kit, tsx эсвэл TypeScript compiler шаардлагагүй.
3. Нөөцлөлт, staging тест, schema/app нийцлийг баталгаажуулсны дараа **тусдаа нэг release job**-оос `db:migrate` ажиллуулна. Website/backend start script үүнийг дуудахгүй.
4. Job амжилттай дууссаны дараа шинэ app хувилбарыг байршуулна. Migration алдаатай бол deployment-ийг зогсооно. Шинэ schema нь ажиллаж байгаа хуучин app-тай нийцэх expand/contract дарааллыг өөрчлөлт бүрд төлөвлөнө.

Migration-д тусдаа DDL эрхтэй credential ашиглана; website/admin runtime credential-д DDL эрх нэмэхгүй. Database өөрөө урьдчилан үүссэн байх ёстой. Job нь direct PostgreSQL холболт ашиглана; session lock шаарддаг тул transaction-pooling proxy ашиглахгүй. TLS шаардлагатай орчинд баталгаажуулалттай TLS болон итгэмжлэгдсэн CA тохируулна, verification унтраахгүй.

Runner нэг dedicated session-д `pg_try_advisory_lock(724001, 2)` авна. Ижил runner давхар ажиллавал хоёр дахь нь хүлээлгүй алдаатай зогсоно; session хаагдахад lock суллагдана. Энэ хамгаалалтыг ашиглахгүй raw SQL/өөр migrator-тай зэрэг ажиллуулж болохгүй. Connect timeout нь 10 секунд; migration statement-ийн гүйцэтгэх хугацааны production хязгаарыг job/DB тохиргоонд тусад нь шийднэ.

Drizzle history нь `drizzle.__drizzle_migrations`. Хүлээгдэж буй SQL migration-ууд нэг transaction-д хэрэгжинэ; алдаа гарвал тухайн transaction буцаж, applied history нэмэгдэхгүй. History schema/table анх үүссэн хэвээр байж болно. Давтан ажиллуулахад өмнө хэрэгжсэн migration-ийг дахин ажиллуулахгүй. `CREATE INDEX CONCURRENTLY` зэрэг transaction дотор ажилладаггүй DDL-д энэ runner шууд тохирохгүй; тусдаа ажиллагааг урьдчилан төлөвлөнө.

## Шалгалт Ба Сэргээх

Тест нь бодит SQL migration-ийг PGlite санах ойн PostgreSQL дээр ажиллуулдаг: бүх schema invariant, анхны trigger-үүд, давтан run, алдааны rollback болон credential-гүй CLI нөхцөлийг шалгана. Бодит PostgreSQL-ийн олон session lock/concurrency, dump/restore болон production deploy job одоогоор туршаагүй.

Automatic down/rollback command нэмээгүй. Migration алдаатай үед шалтгааныг засаж дахин ажиллуулах; амжилттай боловч буруу өөрчлөлтөд шинэ forward-fix migration эсвэл шалгасан backup restore төлөвлөгөө хэрэглэнэ. App хувилбар буцаах нь DB-г автоматаар буцаахгүй. Бодит орчинд ажиллуулахын өмнө backup/restore болон concurrent transaction-ийн шалгалтыг хийнэ.

Албан ёсны эх сурвалж: [Drizzle generate](https://orm.drizzle.team/docs/drizzle-kit-generate), [migration workflow](https://orm.drizzle.team/docs/migrations). SQL/journal бүтэц болон transaction ажиллагааг суулгасан `0.31.10` / `0.45.2` хувилбарт тулгасан; шинэ хувилбарын баримтыг шууд хуулж хэрэглэхгүй.
