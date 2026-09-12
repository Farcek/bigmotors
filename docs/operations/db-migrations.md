# DB Migration

- Огноо: 2026-09-10
- Төлөв: Тохиргоо, команд, SQL migration болон тест хэрэгжсэн. Local Compose PostgreSQL 18 дээр эхний болон өнгөний HEX migration ажилласан; staging/production-д ажиллуулаагүй.
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

## Docker Compose

[infra/docker-compose.yml](../../infra/docker-compose.yml)-д зөвхөн `bigmotors-db`, `bigmotors-migration` идэвхтэй. Хуулж оруулсан app service-үүд comment хэвээр; дахин идэвхжүүлэхийн өмнө тэдгээрийн тохиргоог тусад нь шинэчилнэ.

Repository root-оос DB-г асааж, migration image-ийг build хийгээд нэг удаа ажиллуулах:

```powershell
docker compose -f infra/docker-compose.yml up -d --wait bigmotors-db
docker compose -f infra/docker-compose.yml build bigmotors-migration
docker compose -f infra/docker-compose.yml run --rm bigmotors-migration
```

Migration нь DB healthcheck амжилттай болсны дараа ажиллана, дуусаад exit хийнэ, автоматаар restart хийхгүй. Команд нь бодит DB schema-г өөрчилнө; амжилтгүй exit code үед deployment-ийг үргэлжлүүлэхгүй.

Compose-ийн `postgres` user/password болон default URL нь зөвхөн local жишээ. Production-д DB credential-ийг сольж, тусдаа migration эрхтэй `DB_CONNECTION_STRING`-ийг environment-аар өгнө. Compose нь `packages/db/.env`-ийг автоматаар уншихгүй.

PostgreSQL `18-alpine` нь `infra/.docker/bigmotors_pgdata` хавтсыг container-ийн `/var/lib/postgresql` руу mount хийнэ; DB data нь дотроо `18/docker`-т хадгалагдана. Энэ хавтас Git-д орохгүй. Container устгасан ч host дээрх data үлдэнэ; migration хийхийн тулд data устгах шаардлагагүй. PostgreSQL 17 болон өмнөх хувилбарын data-г зөвхөн image tag/mount солих замаар upgrade хийхгүй; `pg_upgrade` эсвэл dump/restore шаардлагатай. [PostgreSQL Docker image-ийн PGDATA заавар](https://github.com/docker-library/docs/blob/master/postgres/README.md#pgdata).

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

2026-09-10: `0001_add_color_hex_code.sql` нь nullable `colors.hex_code varchar(7)` болон HEX формат шалгах CHECK нэмсэн. Local болон Docker build/typecheck, 28 тест тэнцсэн; өмнөх өнгө/машины холбоосыг хадгалсан upgrade, давтан run, зөв/буруу HEX, `NULL` болон Drizzle mapping-ийг шалгасан. Шинэ image-ээр local Compose PostgreSQL 18-д migration амжилттай ажилласан: 22 хүснэгт, 204 багана, 2 migration history мөр. Өмнөх migration файл болон өгөгдлийг устгаж/дахин үүсгээгүй.

2026-09-10: `0002_separate_product_locations.sql` local PostgreSQL 18-д ажилласан: 23 хүснэгт, 214 багана, 3 migration history мөр. Docker build/typecheck, 35 тест тэнцсэн. Өмнөх салбар/өнгө болон гурван төрлийн холбоос хадгалагдах, байршил автоматаар үүсгэхгүй байх, бэлэн машины байршил заавал байх нөхцөлийг шалгасан. Local DB-д шилжилтийн өмнө нийтлэгдсэн бэлэн машин байгаагүй. Өгөгдөлтэй өөр орчинд хуучин `branch_id`-аас байршил таахгүй; нийтлэгдсэн бэлэн машины бодит `location_id`-ийг нөхөх төлөвлөгөө шаардлагатай. [ADR 0025](../adr/0025-separate-branches-and-locations.md).

2026-09-12: `0003_shared_files.sql` бэлдсэн; local/staging/production DB-д ажиллуулаагүй. 24 хүснэгт, 217 багана, 35 FK бүхий schema; DB build/typecheck болон 74 PGlite тест тэнцсэн. Хуучин зурагтай upgrade нь файлын ID/metadata/огноо, main/item/gallery холбоос болон product updated_at-ийг хадгалдаг; usage-д product ID нөхнө. Дискний файл өөрчлөхгүй. Шинэ хүснэгтийн FK/устгалын хамгаалалт, дурын нэртэй файл, хоосон usage/default, давтан migration болон gallery update trigger-ийг шалгасан. Хуучин app нь хасагдсан product_images багануудыг ашигладаг бол migration-тай нийцсэн release шаардлагатай. [ADR 0029](../adr/0029-use-shared-files.md).

Бүтээгдэхүүний бүх concurrent transaction, dump/restore болон production deploy job-ийн бүрэн шалгалт хийгдээгүй хэвээр.

Automatic down/rollback command нэмээгүй. Migration алдаатай үед шалтгааныг засаж дахин ажиллуулах; амжилттай боловч буруу өөрчлөлтөд шинэ forward-fix migration эсвэл шалгасан backup restore төлөвлөгөө хэрэглэнэ. App хувилбар буцаах нь DB-г автоматаар буцаахгүй. Бодит орчинд ажиллуулахын өмнө backup/restore болон concurrent transaction-ийн шалгалтыг хийнэ.

Албан ёсны эх сурвалж: [Drizzle generate](https://orm.drizzle.team/docs/drizzle-kit-generate), [migration workflow](https://orm.drizzle.team/docs/migrations). SQL/journal бүтэц болон transaction ажиллагааг суулгасан `0.31.10` / `0.45.2` хувилбарт тулгасан; шинэ хувилбарын баримтыг шууд хуулж хэрэглэхгүй.
