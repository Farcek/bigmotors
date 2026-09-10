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
| `packages/db/Dockerfile` | Build/test болон production migration runner image |
| `packages/db/Dockerfile.dockerignore` | Зөвхөн DB/core build context; нууц болон local artifact-ийг хасна |

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

**`db:migrate` нь бодит DB-г өөрчилнө.** Ажиллуулахаас өмнө `DB_CONNECTION_STRING`-ийг зорьсон DB рүү тохируулна. Local-д `packages/db/.env` ашиглаж болно; загвар нь [.env.example](../../packages/db/.env.example). OS/deployment environment утга нь `.env`-ээс давуу. URL-ийг command argument, git, log-д оруулахгүй. Тохиргоогүй/буруу URL үед runner DB рүү холбогдохгүй, алдаатай exit code өгнө. App-ийн `DATABASE_URL` болон `PG*` утгаар URL-ийг орлуулахгүй.

`db:migrate` өмнө `pnpm build:db` шаардлагатай. Runner нь `dist/migrate.mjs`; SQL folder-ийг module-ийн байршлаас олно, ажиллуулсан current directory-оос хамаарахгүй. Root команд нь DB package-ийн команд руу дамжуулна.

Эхний migration **хоосон application schema**-д зориулагдсан. Хүснэгт нь өмнө өөр аргаар үүссэн DB дээр шууд ажиллуулахгүй, journal-д хуурамч applied мөр нэмж тааруулахгүй. Existing DB baseline/өгөгдөл шилжүүлэх шаардлагыг тусад нь төлөвлөнө.

## Production Docker Image

Repository root-оос Linux container image build хийнэ:

```powershell
docker build --file packages/db/Dockerfile --target runner --tag bigmotors-db-migrate:release .
```

Build context нь `packages/db` биш, **repository root** байна. Dockerfile нь Node.js `24-bookworm-slim`, pnpm `11.19.0` ашиглан зөвхөн DB/core workspace-ийг frozen lockfile-аар install, build, typecheck, test хийнэ. Тусдаа `prod-deps` stage нь `pnpm install --prod --frozen-lockfile` хийж, runtime-д pnpm workspace symlink-ийн бүтцийг хадгална. Runtime stage-д source/test, Drizzle Kit болон build dependency хэрэггүй; compiled runner, versioned SQL/journal, production dependency л байна. `node` хэрэглэгчээр, root эрхгүй ажиллана.

Release job-ийн environment-д migration эрхтэй credential бүхий `DB_CONNECTION_STRING`-ийг secrets manager-оос өгөөд:

```powershell
docker run --rm --env DB_CONNECTION_STRING bigmotors-db-migrate:release
```

Энэ нь environment дахь утгыг дамжуулна; connection string-ийг команд дотор бичихгүй. Image build-д credential дамжуулахгүй, `.env`/`.npmrc` файлыг image-д хуулахгүй. Container нь `node dist/migrate.mjs` ажиллуулж дуусаад exit хийнэ; порт, HTTP service эсвэл restart loop шаардлагагүй. Exit code `0` бол дараагийн deployment алхамд шилжинэ; бусад кодод job-ийг зогсооно.

DB нь контейнероос хүрэх network дээр, direct PostgreSQL endpoint-той байх ёстой. Container доторх `localhost` нь DB host биш, migration container өөрөө. Database container ашиглавал тусдаа user-defined Docker network дээр service нэрээр холбож, job эхлэхээс өмнө DB ready болсныг шалгана. Production DB рүү холбогдохын өмнө backup болон SQL review-ийн шаардлага хэвээр.

Image нь Node.js 24-ийн шинэ patch дагах tag ашиглаж байна. Release pipeline-д шалгасан image digest-ийг хадгалж, яг тэр artifact-ийг staging/production-д ашиглана. Runtime-д `DB_CONNECTION_STRING` заавал; өмнөх migration-specific хувьсагчийн нэрийг fallback болгон уншихгүй. Нэр нийтлэг болсон ч app runtime болон migration job-ийн **credential/DB эрх тусдаа** хэвээр.

Үндэслэл: [pnpm Docker workflow](https://pnpm.io/docker), [Docker multi-stage build](https://docs.docker.com/build/building/multi-stage/). Docker/Linux build нь төслийн pinned pnpm `11.19.0` дээр шалгагдсан.

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

Тест нь бодит SQL migration-ийг PGlite санах ойн PostgreSQL дээр ажиллуулдаг: бүх schema invariant, анхны trigger-үүд, давтан run, алдааны rollback болон credential-гүй CLI нөхцөлийг шалгана.

2026-09-10: Docker image build/typecheck болон 25 тест тэнцсэн. Эцсийн image-ийг тусгаарласан PostgreSQL 16.15 container дээр туршиж 22 хүснэгт, 203 багана, 31 FK, 29 trigger, нэг migration history мөр үүссэнийг шалгасан. Давтан run, дутуу detail мөртэй product-ийг хориглох, өөр session migration lock барьсан үед exit 1 өгөх, lock суллагдсаны дараа амжилттай ажиллах нөхцөл тэнцсэн. Runtime нь root бус хэрэглэгчтэй; source/test, `.env`, Drizzle Kit/tsx агуулаагүй. Түр DB/network-ийг тестийн дараа устгасан; existing local/staging/production DB өөрчлөөгүй.

Бүтээгдэхүүний бүх concurrent transaction, dump/restore болон production deploy job-ийн бүрэн шалгалт хийгдээгүй хэвээр.

Automatic down/rollback command нэмээгүй. Migration алдаатай үед шалтгааныг засаж дахин ажиллуулах; амжилттай боловч буруу өөрчлөлтөд шинэ forward-fix migration эсвэл шалгасан backup restore төлөвлөгөө хэрэглэнэ. App хувилбар буцаах нь DB-г автоматаар буцаахгүй. Бодит орчинд ажиллуулахын өмнө backup/restore болон concurrent transaction-ийн шалгалтыг хийнэ.

Албан ёсны эх сурвалж: [Drizzle generate](https://orm.drizzle.team/docs/drizzle-kit-generate), [migration workflow](https://orm.drizzle.team/docs/migrations). SQL/journal бүтэц болон transaction ажиллагааг суулгасан `0.31.10` / `0.45.2` хувилбарт тулгасан; шинэ хувилбарын баримтыг шууд хуулж хэрэглэхгүй.
