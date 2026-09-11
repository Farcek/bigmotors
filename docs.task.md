# Tech spec шийдвэрийн task бүртгэл

- Үүсгэсэн: 2026-09-08
- Хүрээ шинэчилсэн: 2026-09-09
- Хамрах хүрээ: Технологи, архитектур, сан, хөгжүүлэлтийн хэрэгсэл болон техникийн тохиргоо
- Батлагдсан суурь: [ADR бүртгэл](docs/adr/README.md)
- Бүрэн баталсан: 1 / 12
- Хэсэгчлэн баталсан: TASK-02, TASK-03, TASK-04, TASK-05, TASK-06, TASK-07, TASK-10

## Хүрээ ба хөтлөх журам

Энэ файлд зөвхөн tech spec-ийн шийдвэрийг нэг нэгээр нь батална. Бизнесийн боломж, хэрэглэгчийн урсгал, role/үйлдлийн хүснэгт, schema-ийн хүснэгт/талбар, UI дизайн, агуулга болон ашиглалтын бизнес нөхцөлийг [дараа хэлэлцэх бүртгэл](docs/deferred-decisions.md)-д шилжүүлсэн. Тэдгээрийг шийдэх нь доорх техникийн task-уудыг батлах шалгуур биш.

1. Task ID болон өмнөх батлагдсан шийдвэрийг хадгална. Санал нь хэрэглэгч батлах хүртэл батлагдаагүй байна.
2. Нэг task эсвэл түүний хэсгийг батлахад зөвхөн тэр хүрээний төлөв, огноо, шийдвэр, ADR холбоосыг шинэчилнэ.
3. Архитектурын өөрчлөлтийг ADR-д, техникийн зааврыг холбогдох `docs/` хавтаст хөтөлнө. Хэрэглэгчийн баталсан шийдвэрийг хүрээ цэгцлэх явцад өөрчлөхгүй.
4. Технологийн сонголтыг бодит API, dependency болон орчны нийцлээр шалгана. Хэрэгжүүлэх боломжид шууд нөлөөлөх зайлшгүй нөхцөл байвал зөвхөн тэр нөхцөлийг тодруулна.
5. Шийдвэр батлагдах, хэрэгжүүлэлт дуусах, дараа хэлэлцэх ажил нь тусдаа төлөвтэй. Баталгаажуулалт нь код бичсэн эсвэл үйлчилгээ байршуулсан гэсэн үг биш.

Төлөв: `Хүлээгдэж буй`, `Хэлэлцэж буй`, `Хэсэгчлэн баталсан`, `Баталсан`, `Хойшлуулсан`.

## Дараалал

- [x] TASK-01: Өгөгдөлд хандах архитектур
- [ ] TASK-02: Workspace ба build зохион байгуулалт
- [ ] TASK-03: Authentication/session техникийн шийдэл
- [ ] TASK-04: DB package-ийн техникийн зохион байгуулалт
- [ ] TASK-05: DTI, validation ба API-ийн нийтлэг стандарт
- [ ] TASK-06: Storage ба upload технологи
- [ ] TASK-07: Frontend хэрэгслүүд
- [ ] TASK-08: Rendering, cache ба metadata технологи
- [ ] TASK-09: PWA хэрэгжүүлэх технологи
- [ ] TASK-10: Server build, хувилбарууд, TypeScript, lint/format
- [ ] TASK-11: Тест ба CI хэрэгслүүд
- [ ] TASK-12: Deployment ба ажиллагааны техникийн суурь

## TASK-01: Өгөгдөлд хандах архитектур

- Төлөв: Баталсан
- Хамаарал: TASK-04-ийн хэрэгжүүлэлтийн нарийвчлалтай уялдана
- Баталсан огноо: 2026-09-09
- Батлагдсан: Shared DB-ийн сервер талын хэрэглээ, app-owned connection тохиргоо, factory injection болон website/admin-ийн DB эрхийн тусгаарлалт. [ADR 0013](docs/adr/0013-use-pnpm-workspace-layout.md), [ADR 0015](docs/adr/0015-isolate-server-side-db-access.md)

**Шийдвэр:** Dependency нь `web/website`-ийн сервер тал болон `sysop/server`-ээс `packages/db` рүү чиглэнэ. DB package нь app-уудаас хамаарахгүй; browser, `sysop/app`, `sysop/dti`, browser/server shared `packages/core`-оор дамжин импортлогдохгүй.

**Баталсан санал:** App тус бүр connection тохиргоо болон lifecycle-аа эзэмшиж, тохиргоог `packages/db`-ийн factory-д дамжуулна. Website болон admin нь тусдаа DB credentials/role ашиглаж, шаардлагатай read/write эрхийг PostgreSQL түвшинд хязгаарлана; хэрэглэгчийн эрхийг сервер талд мөн шалгана. Яг аль өгөгдөл нийтэд харагдах, үйлдэл тус бүрийн эрхийг дараа тодорхойлно.

**Үндэслэл ба сул тал:** Shared schema/CRUD-ийг хадгалж, app-ийн орчны тохиргоог тусгаарлана. Connection lifecycle болон schema/app нийцлийг хоёр app-д шалгах шаардлагатай.

**Батлах шалгуур:** Import/dependency-ийн чиглэл, connection injection болон эрх тусгаарлах механизм тогтсон. Driver/pool, factory-ийн нарийн API болон transaction зохион байгуулалт нь TASK-04-т үлдэнэ. Энэ нь хэрэгжүүлэлт дууссан гэсэн үг биш.

**Баримт:** [ADR 0015](docs/adr/0015-isolate-server-side-db-access.md), [DB техникийн зааг](docs/db/README.md).

## TASK-02: Workspace ба build зохион байгуулалт

- Төлөв: Хэсэгчлэн баталсан
- Хамаарал: TASK-04-ийн package exports-той уялдуулна
- Баталсан огноо: 2026-09-09 (хэсэгчилсэн)
- Батлагдсан: pnpm workspace, бүх package-д `@bigmotors/*` scope, доорх хавтасны бүтэц. [ADR 0013](docs/adr/0013-use-pnpm-workspace-layout.md), [ADR 0014](docs/adr/0014-use-bigmotors-scope-and-db-owned-migrations.md)

```text
web/website
sysop/app
sysop/dti
sysop/server
packages/core
packages/db
```

**Хэрэгжүүлэлтийн тэмдэглэл:** Хэрэглэгчийн manifest үүсгэх хүсэлтээр root болон зургаан package-д минимал `package.json` нэмсэн. Одоогийн package нэршлийг [README](README.md)-д бүртгэсэн. Энэ нь TASK-02-ын үлдсэн саналыг бүхэлд нь баталсан гэсэн үг биш.

**Хэрэгжүүлсэн суурь:** 2026-09-10-ны backend initialize хүрээнд pnpm `11.19.0`, зургаан package хамарсан workspace manifest, root lockfile болон server script-үүд нэмсэн. [ADR 0020](docs/adr/0020-initialize-sysop-server-tooling.md)

**Үлдсэн шийдвэр:** Бусад package exports, workspace dependency protocol болон package хоорондын build/dev/watch дараалал. Server одоогоор бусад workspace package импортлохгүй.

**Миний санал:** Дотоод холбоосыг `workspace:*` болгож, pnpm workspace script-ээр эхлээд shared library-уудыг build хийнэ. Дараа нь library watch болон app dev процессуудыг ажиллуулна. Нэмэлт build cache хэрэгслийг бодит хэрэгцээ гарвал үнэлнэ. [pnpm workspace](https://pnpm.io/workspaces)

**Үндэслэл ба сул тал:** Нэг workspace дотор package холболт тодорхой болно. Build дараалал, watch болон dependency циклгүй байдлыг тохируулах хэрэгтэй.

**Батлах шалгуур:** Package нэр/exports, dependency чиглэл, build/watch арга болон pnpm хувилбар батлагдсан байна.

**Гарах баримт:** Workspace ADR, `docs/operations/` хөгжүүлэлтийн тохиргоо.

## TASK-03: Authentication/session техникийн шийдэл

- Төлөв: Хэсэгчлэн баталсан
- Хамаарал: TASK-05-ын DTI/error contract, TASK-10-ын package хувилбар, TASK-12-ын HTTPS/runtime болон cache орчин
- Баталсан огноо: 2026-09-10
- Батлагдсан: Chip CRM-ийн Userly аргачлал: OAuth 2.0 / OIDC Authorization Code + PKCE S256, memory-only access token, 900 секундийн provider TTL, refresh token ашиглахгүй, серверийн token validation, `userly-acl`, DTI action permission mapping, data scope enforcement, validated snapshot cache/fallback/reload-only recovery. [ADR 0019](docs/adr/0019-use-userly-admin-authentication-and-acl.md)

**Үлдсэн шийдвэр:** OAuth/OIDC client болон JWT verification-д ашиглах бодит сан/API; Userly integration-ийн package хувилбар/contract нийцэл; snapshot service-client authentication; runtime config key/schema; refresh/timeout/JWKS cache параметр болон multi-instance cache/invalidation, deployment-wide reload rate-limit coordination. Бизнес permission matrix болон local profile schema нь feature/DB баримтад тусдаа үлдэнэ.

**Баталсан аргачлал:** Userly нь identity/access policy-ийн эзэн; `sysop/app` Bearer token дамжуулж, `sysop/server` token, active authorization context, action permission болон шаардлагатай scope-г шалгана. Config нь runtime орчноос, snapshot нь valid memory/LKG/reload-only default дарааллаар байна. TTL, storage, re-login, logout болон хамгаалалтын заагийг ADR 0019-д тогтоосон. Local cookie session/store ашиглах өмнөх `express-session` санал үйлчлэхгүй.

**Миний санал:** Үлдсэн сан/API-г эх төслийн батлагдсан protocol boundary болон BigMotors-ийн Node.js 24, TypeScript, Express, Vite, DTI орчинтой нийцүүлэн шалгана. OAuth/JWT протоколыг гараар дахин бичихгүй; бэлэн санг сонгож тусад нь батална.

**Үндэслэл ба сул тал:** Userly-тэй ижил хэрэглэгч/ACL удирдлага ашиглаж, local password/session/invitation давхардахгүй. Provider availability, snapshot freshness/recovery artifact болон browser reload/expiry үеийн redirect-ийг хариуцна.

**Батлах шалгуур:** Батлагдсан architecture-г хадгалж, үлдсэн сан/API/config/cache техникийн нарийвчлалыг шийдсэн байна. Хэсэгчилсэн баталгаа нь хэрэгжүүлэлт дууссан гэсэн үг биш.

**Гарах баримт:** [ADR 0019](docs/adr/0019-use-userly-admin-authentication-and-acl.md), [Userly ашиглалтын шаардлага](docs/operations/userly-authentication.md). User management болон үйлдлийн хүрээ [feature баримтад](docs/features/admin-authentication-access.md) байна.

## TASK-04: DB package-ийн техникийн зохион байгуулалт

**2026-09-10-ны техникийн нэмэлт баталгаа:** UUID v4/DB default, timestamptz/update trigger, text + CHECK, composite FK/deferred constraint trigger болон transaction validation-ийн аргыг [ADR 0023](docs/adr/0023-approve-catalog-schema.md)-өөр баталсан. Driver/pool, package API, migration/seed workflow болон бодит implementation нээлттэй; task хэсэгчлэн батлагдсан хэвээр. Бизнес хүснэгт/талбарын баталгааг DB баримтад хөтөлнө.

**2026-09-10-ны migration нэмэлт баталгаа:** Config, migration файл болон `db:generate`/`db:migrate` команд `packages/db` дотор; root товчилсон командтай. Local-д гараар, production-д тусдаа нэг release job-оос ажиллуулна; app startup-д ажиллуулахгүй. [ADR 0024](docs/adr/0024-run-db-migrations-as-release-step.md). Эхний SQL + trigger, snapshot/journal, runner, тест хэрэгжсэн; бодит DB-д ажиллуулаагүй. `pg` factory болон package exports-ийн одоогийн хэрэгжүүлэлт [DB зааварт](docs/operations/db-schema.md) байна.

- Төлөв: Хэсэгчлэн баталсан
- Хамаарал: TASK-01, TASK-02
- Баталсан огноо: 2026-09-09 (хэсэгчилсэн)
- Батлагдсан: PostgreSQL, Drizzle ORM; `packages/db` нь schema, CRUD, migration, seed-ийг хариуцна. Website-ийн сервер тал болон sysop-server дундаа ашиглана. Scope нь `@bigmotors/*`. [ADR 0014](docs/adr/0014-use-bigmotors-scope-and-db-owned-migrations.md)

**Үлдсэн шийдвэр:** Production pool тохиргоо, CRUD function-ийн нийтлэг хэлбэр, transaction/error handling, seed workflow болон production migration job/role/TLS-ийн бодит provisioning. Migration эзэмшил, generate/migrate command болон тусдаа release алхмын арга батлагдсан; task бүхэлдээ дуусаагүй.

**Миний санал:** `pg` driver болон connection pool ашиглана. DB package connection тохиргоог app-аас авч, transaction context дамжуулж болох CRUD function-ууд экспортлох саналтай. Migration/seed-ийг DB package-ийн script-ээр ажиллуулж, migration-ийг app startup бүрд бус release-ийн тусдаа ажиллагаа болгоно. [node-postgres pooling](https://node-postgres.com/features/pooling)

**Үндэслэл ба сул тал:** DB код нэг эзэнтэй, app-ийн connection lifecycle тодорхой болно. Transaction context, exports болон migration-ийн зэрэгцээ ажиллалтыг зохицуулах шаардлагатай.

**Батлах шалгуур:** Driver, connection/transaction API, CRUD-ийн техникийн convention, exports, файлын зохион байгуулалт болон migration/seed script-ийн арга батлагдсан байна. ERD, хүснэгт/талбар, бизнесийн status болон өгөгдлийн дүрэм энэ task-ийн шалгуурт орохгүй.

**Гарах баримт:** DB tooling ADR, `docs/db/` package заавар, `docs/operations/` migration техник.

## TASK-05: DTI, validation ба API-ийн нийтлэг стандарт

- Төлөв: Хэсэгчлэн баталсан
- Хамаарал: TASK-03; `@napp` сангуудын бодит API/registry мэдээлэл
- Баталсан огноо: 2026-09-10 (DTI initialize хүрээ)
- Батлагдсан: Chip CRM DTI хэв маягийн `@napp/dti-core` + Zod schema, domain namespace, barrel export болон өмнө баталсан ESM/declaration tooling. [ADR 0021](docs/adr/0021-initialize-sysop-dti.md)

**Хэрэгжүүлсэн суурь:** `sysop/dti` manifest, build/watch/typecheck/test, ESM exports болон одоо байгаа `/health`-ийн contract нэмсэн. Backend/client runtime холболт болон бизнес action хийгдээгүй.

**Үлдсэн шийдвэр:** Backend/client DTI холболт, runtime validation/error mapping, response/error envelope, pagination-ийн нийтлэг хэлбэр, contract өөрчлөлтийн нийцлийн дүрэм.

**Миний санал:** Contract талд сонгосон `createAction` + Zod-ийг ашиглан `@napp/dti-server` backend болон `@napp/dti-client` frontend холболтыг бодит API-аар шалгана. Runtime холболтын нийцэл батлагдаагүй. `@napp/error`-тай уялдуулсан error code, message, field errors, request ID хэлбэрийг тусад нь батална.

**Үндэслэл ба сул тал:** Нийтлэг contract-ийг нэг газар хөтөлнө. DTI-ийн бэлэн бүтэцтэй давхар envelope/validation үүсгэхгүй байх шаардлагатай.

**Батлах шалгуур:** Сангийн холболт, validation болон envelope-ийн техникийн жишээ, contract нийцлийн дүрэм батлагдсан байна. Бодит бизнес endpoint, талбарын шаардлагагүйгээр техникийн жишээгээр шалгаж болно.

**Гарах баримт:** DTI/validation ADR болон contract-ийн техникийн заавар.

## TASK-06: Storage ба upload технологи

- Төлөв: Хэсэгчлэн баталсан
- Хамаарал: TASK-03, TASK-12
- Баталсан огноо: 2026-09-10 (disk хадгалалтын хүрээ)
- Батлагдсан: Эх зургийг серверийн hard disk дээр хадгална. [ADR 0022](docs/adr/0022-store-product-images-on-disk.md). DB бүртгэлийн бүтэц нь [product_images баримтын](docs/db/product-images.md) хүрээ; техникийн task-ийн батлах шалгуур биш.

**Үлдсэн шийдвэр:** Upload сан/transport, disk root/config, аюулгүй path/name, upload/serve access control, persistent volume, файл/DB-ийн алдааны цэвэрлэгээ болон backup/restore механизм.

**Миний санал:** Backend-ийн эрхээр хянах upload, тохируулдаг persistent disk root, системээс үүсгэсэн хадгалалтын нэр, хамгаалалттай serve болон файл/DB-ийн алдааны цэвэрлэгээ ашиглана. Сангийн сонголт хараахан батлаагүй. Өмнөх S3 болон `sharp` боловсруулалтын санал энэ урсгалд үйлчлэхгүй; эх файл өөрчлөхгүй, формат/browser render шалгахгүй байх батлагдсан дүрмийг хадгална.

**Үндэслэл ба сул тал:** External object storage хэрэггүй. Disk persistence, багтаамж, DB + файл backup болон олон instance-ийн файлын хандалтыг хариуцах шаардлагатай.

**Батлах шалгуур:** Disk config/persistence, upload сан/transport, аюулгүй хадгалах/serve, эрхийн шалгалт болон алдааны цэвэрлэгээний техник батлагдсан байна. Image conversion шаардахгүй.

**Гарах баримт:** Storage ADR, `docs/operations/` холболтын тохиргоо.

## TASK-07: Frontend хэрэгслүүд

- Төлөв: Хэсэгчлэн баталсан
- Хамаарал: TASK-05
- Баталсан огноо: 2026-09-12 (routing, admin UI kit, useForm болон нэмэлт cache-гүй зарчим)
- Батлагдсан: Website нь Next.js; admin нь Mantine/Vite; хоёул Tabler icons ашиглах суурь шийдвэртэй. Admin routing нь React Router Data Mode: createBrowserRouter, RouterProvider, nested Outlet, NavLink, 404/error boundary. [ADR 0026](docs/adr/0026-use-react-router-data-mode.md)

**Нэмэлт баталсан:** Admin нь Mantine theme/token ашиглаж, давтагдсан нийлмэл UI-г `sysop/app/src/ui/` дотор нэгтгэнэ. Давхар UI сан, Mantine компонент бүрийн wrapper болон тусдаа `packages/uikit` үүсгэхгүй. [ADR 0027](docs/adr/0027-use-app-local-admin-ui-kit.md). Харагдах байдлын дүрмийг [docs/ui](docs/ui/admin-ui-kit.md)-д хөтөлнө.

**Form/cache баталсан:** `@mantine/form`-ийн `useForm` ашиглана. TanStack Query болон өөр cache сан/давхарга хэрэглэхгүй; API өгөгдлийг шаардлагатай үед дахин уншина. [ADR 0028](docs/adr/0028-use-mantine-form-without-query-cache.md). Өмнөх TanStack Query, staleTime болон invalidation санал хэрэгжихгүй.

**Үлдсэн шийдвэр:** Website styling, CSS файлын зохион байгуулалтын нарийвчлал, form validation/mode integration болон global client-side state хэрэгцээ. Эдгээрийг form/cache сонголтоор бүхэлд нь батлагдсан гэж үзэхгүй.

**Үлдсэн санал:** Website-д CSS Modules/CSS variables ашиглаж, энгийн UI төлөвт React state, global state санг бодит хэрэгцээгээр үнэлнэ. Admin-ийн form болон cache-ийн дээрх батлагдсан шийдвэрийг дагана.

**Үндэслэл ба сул тал:** Form болон routing зориулалтын хэрэгсэлтэй; cache-ийн нэмэлт dependency байхгүй. API өгөгдлийн loading/error, хуучирсан хүсэлтийн хариу болон mutation-ийн дараах дахин уншилтыг integration хариуцна.

**Батлах шалгуур:** Сангууд болон тэдгээрийн хариуцлага, styling арга, state эзэмшил батлагдсан байна. Theme, өнгө, layout болон дэлгэцийн загвар шаардлагагүй.

**Гарах баримт:** Frontend tooling ADR.

## TASK-08: Rendering, cache ба metadata технологи

- Төлөв: Хүлээгдэж буй
- Хамаарал: TASK-01, TASK-07
- Баталсан огноо: Байхгүй
- Батлагдсан: Next.js суурь сонголттой; нэмэлт арга батлаагүй

**Үлдсэн шийдвэр:** Next.js router/rendering арга, cache abstraction, revalidation холбоос, metadata/sitemap үүсгэх механизм.

**Миний санал:** App Router болон server-side data access ашиглаж, cache шаардлагатай уншилтад Next.js-ийн механизмыг хэрэглэнэ. Admin өөрчлөлтөөс revalidation эхлүүлэх холбоосыг баталгаажуулсан сервер хоорондын ажиллагаа болгоно. Metadata/sitemap-ийг framework-ийн механизмаар үүсгэх саналтай. [Next.js caching](https://nextjs.org/docs/app/getting-started/caching)

**Үндэслэл ба сул тал:** Framework-ийн боломжийг нэг мөр ашиглана. Cache invalidation хүрэхгүй болсон үед retry болон fallback техникийн арга шаардлагатай.

**Батлах шалгуур:** Rendering/data access арга, cache/revalidation интерфейс, metadata механизм батлагдсан байна. Хуудас тус бүрийн SEO агуулга, URL болон cache хугацааг дараа тогтооно.

**Гарах баримт:** Rendering/cache ADR.

## TASK-09: PWA хэрэгжүүлэх технологи

- Төлөв: Хүлээгдэж буй
- Хамаарал: TASK-08, TASK-10-ын Next.js хувилбар
- Баталсан огноо: Байхгүй
- Батлагдсан: Public website PWA дэмжих шаардлага өмнө батлагдсан; хэрэгсэл батлаагүй

**Үлдсэн шийдвэр:** Next.js-д нийцэх PWA integration/service worker хэрэгсэл, manifest үүсгэх арга, cache versioning болон update/cleanup механизм.

**Миний санал:** Сонгосон Next.js хувилбартай нийцэх бэлэн PWA/service worker интеграцыг шалгаж сонгоно. Cache versioning болон хуучин cache цэвэрлэгээг төвлөрүүлж, runtime data cache-ийг илэрхий тохиргоогоор удирдана. Одоогоор тодорхой package санал болгож батлуулаагүй.

**Үндэслэл ба сул тал:** Service worker-ийн lifecycle-ийг тогтсон хэрэгслээр удирдана. Framework upgrade болон browser-ийн ялгаанд нийцлийг турших шаардлагатай.

**Батлах шалгуур:** Integration package/арга, хувилбарын нийцэл, manifest/service worker build болон update/cleanup техник батлагдсан байна. Offline боломж, push болон суулгах UI-ийн хүрээ тусдаа.

**Гарах баримт:** PWA технологийн ADR.

## TASK-10: Server build, хувилбарууд, TypeScript, lint/format

- Төлөв: Хэсэгчлэн баталсан
- Хамаарал: TASK-02, TASK-05, TASK-07
- Баталсан огноо: 2026-09-10 (backend initialize хүрээ)
- Батлагдсан: Өмнөх TypeScript/Node.js 24/shared tsdown суурь дээр server tsdown ESM + tsx watch, strict NodeNext typecheck, pinned server dependency болон pnpm lockfile нэмсэн. [ADR 0020](docs/adr/0020-initialize-sysop-server-tooling.md)

**Үлдсэн шийдвэр:** Бусад package-ийн compiler/dependency/exports, registry шаардлага, ESLint/Prettier болон repository-wide lint/format тохиргоо. Server-ийн яг хувилбарууд manifest/lockfile-д байна.

**Хэрэгжүүлсэн суурь:** Server-д tsdown Node24 ESM, development-д tsx watch, production-д Node.js, TypeScript strict/NodeNext ашиглаж build/typecheck/test шалгасан. `@napp/error` public registry-гээс суусан; бүх `@napp` сангийн registry-г үүгээр баталсан гэж үзэхгүй.

**Үлдсэн санал:** ESLint + Prettier, бусад package-ийн compiler/exports болон шаардлагатай registry-г орчны тохиргоогоор холбоно. [tsdown platform](https://tsdown.dev/options/platform)

**Үндэслэл ба сул тал:** Library/server build ойролцоо болно. ESM resolution, DTI module format болон compiler тохиргооны нийцлийг шалгах шаардлагатай.

**Батлах шалгуур:** Хувилбарын хүснэгт, server build/dev/start, tsconfig, lint/format, exports болон registry арга батлагдсан байна.

**Гарах баримт:** Tooling ADR, `docs/operations/` орчны шаардлага.

## TASK-11: Тест ба CI хэрэгслүүд

**Хэрэгжүүлэлтийн тэмдэглэл:** Backend initialize хүрээнд `node:test`/`node:assert/strict`, tsx ашигласан 8 тест ажиллаж байна. Энэ нь CI болон бусад module-ийн нийт тестийн хэрэгслийн сонголтыг бүхэлд нь баталсан гэсэн үг биш.

- Төлөв: Хүлээгдэж буй
- Хамаарал: TASK-02, TASK-05, TASK-10
- Баталсан огноо: Байхгүй
- Батлагдсан: TypeScript тест, одоогийн node:test суурь дүрэм; нэмэлт хэрэгсэл батлаагүй

**Үлдсэн шийдвэр:** Unit/integration/E2E хэрэгсэл, тусгаарласан test DB, fixture арга болон CI pipeline-ийн техникийн үе шат.

**Миний санал:** Shared/backend-д `node:test`, `node:assert/strict`; integration-д migration-тай тусгаарласан PostgreSQL; browser тестэд Playwright хэрэглэнэ. CI-д lockfile install, type check, lint/format check, тест болон app/library build ажиллуулна. [Playwright](https://playwright.dev/docs/intro)

**Үндэслэл ба сул тал:** Код, contract, DB интеграцыг давтагдах орчинд шалгана. Test DB lifecycle болон E2E-ийн хугацааг зохицуулах хэрэгтэй.

**Батлах шалгуур:** Test runner, fixture/test DB зохион байгуулалт, CI platform болон check дараалал батлагдсан байна. Бизнесийн бодит test case жагсаалт дараа гарна.

**Гарах баримт:** Test/CI ADR, `docs/operations/` pipeline заавар.

## TASK-12: Deployment ба ажиллагааны техникийн суурь

- Төлөв: Хүлээгдэж буй
- Хамаарал: TASK-01, TASK-03, TASK-04, TASK-06, TASK-08, TASK-10, TASK-11
- Баталсан огноо: Байхгүй
- Батлагдсан: Шинэ сонголт батлаагүй

**Үлдсэн шийдвэр:** Process/container арга, reverse proxy, environment/secrets, release/migration job, backup/restore механизм, log/health check/monitoring хэрэгсэл.

**Миний санал:** Website/Express-ийг тусдаа Node.js процесс эсвэл container, admin-ийг static build байдлаар байрлуулна. Admin API-д same-origin reverse proxy хэрэглэнэ. Migration-ийг нэг release job болгож, app rollback болон DB сэргээх механизмыг тусгаарлана. Structured log, request ID, health check болон автомат backup/restore хэрэгслийг сонгох саналтай.

**Үндэслэл ба сул тал:** App, өгөгдөл болон release-ийн техникийн зааг тодорхой болно. Сонгох hosting орчин эдгээр механизмыг дэмждэг эсэхийг шалгах шаардлагатай.

**Батлах шалгуур:** Deploy topology, proxy/env/secrets, release/migration, backup/restore болон observability-ийн техникийн арга батлагдсан байна. Төсөв, худалдан авалт, домэйны яг нэр, хүний хариуцлага, хадгалалтын хугацаа болон SLA-г энд батлахгүй.

**Гарах баримт:** Deployment ADR, `docs/operations/` техникийн тохиргоо.

## Баталгаажуулалтын түүх

- 2026-09-10: Хэрэглэгч зураг upload хийж hard disk дээр хадгалах, `product_images` хүснэгтэд бүртгэхээр шийдсэн. ADR 0022, DB баримт болон TASK-06-ын хэсэгчилсэн төлөвийг шинэчилсэн. Upload код, disk setup болон migration хийгдээгүй.
- 2026-09-10: Chip CRM DTI-ээс жишээ авч initialize хийх хүсэлтээр `sysop/dti`-ийн `createAction` + Zod contract болон shared tooling суурийг хэрэгжүүлж, ADR 0021-д бүртгэсэн. TASK-05 хэсэгчлэн батлагдсан; business contract, runtime router/client, envelope болон pagination батлаагүй.
- 2026-09-09: Хэрэглэгч TASK-01-ийг бүрэн баталсан. Server-only dependency, app-owned connection/factory injection, website/admin-ийн тусдаа DB credentials болон сервер талын эрхийн заагийг [ADR 0015](docs/adr/0015-isolate-server-side-db-access.md)-д бүртгэсэн. Бусад task-ийн төлөв өөрчлөгдөөгүй; хэрэгжүүлэлт хийгдээгүй.
- 2026-09-10: Хэрэглэгч Chip CRM-ийн admin login, user management, ACL аргачлалыг ижил ашиглахыг хүссэн. Userly auth/session/ACL аргачлалыг ADR 0019-д баталж, TASK-03-ыг хэсэгчлэн баталсан болгосон. Өмнөх local cookie/session-store санал үйлчлэхгүй; сан/API/config-ийн үлдсэн нарийвчлал нээлттэй. Код, Userly provisioning болон бусад task-ийн төлөв өөрчлөгдөөгүй.
- 2026-09-10: Sysop backend initialize хүсэлтээр server scaffold, pnpm workspace/lockfile, dev/build/start/typecheck/test болон fail-closed API суурь үүсгэсэн. TASK-10-ын server tooling хэсгийг ADR 0020-д баталсан. Auth/ACL integration, DB, DTI business action болон бусад package setup дуусаагүй.

- 2026-09-09: Хэрэглэгчийн заавраар бүртгэлийг зөвхөн tech spec хүрээнд цэгцэлсэн. Task ID, батлагдсан шийдвэр, хэсэгчилсэн төлөвийг хадгалж, техникийн бус нарийвчлалыг [дараа хэлэлцэх бүртгэл](docs/deferred-decisions.md)-д шилжүүлсэн. Хүрээ цэгцэлсэн нь шинэ технологийн санал баталсан гэсэн үг биш.

- 2026-09-09: Бүх workspace package-ийн `@bigmotors/*` scope, migration/seed-ийг `packages/db` хариуцах шийдвэр [ADR 0014](docs/adr/0014-use-bigmotors-scope-and-db-owned-migrations.md)-өөр батлагдсан. TASK-02, TASK-04-ийг шинэчилж, schema-ийн дэлгэрэнгүй загварыг хойшлуулсан.

- 2026-09-09: TASK-02-ын pnpm workspace болон зургаан хавтасны бүтэц [ADR 0013](docs/adr/0013-use-pnpm-workspace-layout.md)-аар батлагдсан. DB код monorepo дотор `packages/db` болсноор ADR 0012 орлуулагдсан. TASK-01, TASK-04-ийн одоогийн шийдвэр, саналыг нийцүүлсэн. Task-уудын үлдсэн саналууд батлагдаагүй.

- 2026-09-09: TASK-01 болон TASK-04-ийн DB бүтэц/CRUD-ийн эзэмшил, хамтын хэрэглээг [ADR 0012](docs/adr/0012-share-drizzle-db-repository.md)-оор хэсэгчлэн баталсан. Monorepo дотор `packages/db` нэмэх өмнөх саналыг тусдаа shared repository ашиглах шийдвэрээр шинэчилсэн. Бусад саналыг батлаагүй.
