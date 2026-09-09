# Tech spec шийдвэрийн task бүртгэл

- Үүсгэсэн: 2026-09-08
- Хүрээ шинэчилсэн: 2026-09-09
- Хамрах хүрээ: Технологи, архитектур, сан, хөгжүүлэлтийн хэрэгсэл болон техникийн тохиргоо
- Батлагдсан суурь: [ADR бүртгэл](docs/adr/README.md)
- Бүрэн баталсан: 1 / 12
- Хэсэгчлэн баталсан: TASK-02, TASK-04

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

**Үлдсэн шийдвэр:** Package exports, workspace dependency protocol, build/dev/watch дараалал, pnpm-ийн хувилбар.

**Миний санал:** Дотоод холбоосыг `workspace:*` болгож, pnpm workspace script-ээр эхлээд shared library-уудыг build хийнэ. Дараа нь library watch болон app dev процессуудыг ажиллуулна. Нэмэлт build cache хэрэгслийг бодит хэрэгцээ гарвал үнэлнэ. [pnpm workspace](https://pnpm.io/workspaces)

**Үндэслэл ба сул тал:** Нэг workspace дотор package холболт тодорхой болно. Build дараалал, watch болон dependency циклгүй байдлыг тохируулах хэрэгтэй.

**Батлах шалгуур:** Package нэр/exports, dependency чиглэл, build/watch арга болон pnpm хувилбар батлагдсан байна.

**Гарах баримт:** Workspace ADR, `docs/operations/` хөгжүүлэлтийн тохиргоо.

## TASK-03: Authentication/session техникийн шийдэл

- Төлөв: Хүлээгдэж буй
- Хамаарал: TASK-12-ын proxy/cookie орчин
- Баталсан огноо: Байхгүй
- Батлагдсан: Шинэ сонголт батлаагүй

**Үлдсэн шийдвэр:** Auth сан/интеграц, session store, cookie/token дамжуулалт, authorization middleware болон хамгаалалтын техникийн механизм.

**Миний санал:** Express дээр server-side session, PostgreSQL session store, HttpOnly/Secure cookie бүхий бэлэн шийдлийг үнэлнэ. `express-session` болон нийцэх store-ийг эхний хувилбар болгон авч үзнэ. CSRF, session хүчингүй болгох, rate limiting болон эрх шалгах middleware-ийг энэ түвшинд тодорхойлно. Бэлэн identity provider ашиглах шаардлага байвал холболтын аргыг уялдуулна. [Express session](https://expressjs.com/en/resources/middleware/session/)

**Үндэслэл ба сул тал:** Backend дээр session болон эрхийн хяналтыг төвлөрүүлнэ. Store, proxy болон cookie тохиргооны нийцлийг шалгах шаардлагатай.

**Батлах шалгуур:** Auth/session хэрэгсэл, хадгалалт, дамжуулалт болон middleware-ийн техникийн зааг батлагдсан байна.

**Гарах баримт:** Auth ADR, `docs/operations/` орчны тохиргоо.

## TASK-04: DB package-ийн техникийн зохион байгуулалт

- Төлөв: Хэсэгчлэн баталсан
- Хамаарал: TASK-01, TASK-02
- Баталсан огноо: 2026-09-09 (хэсэгчилсэн)
- Батлагдсан: PostgreSQL, Drizzle ORM; `packages/db` нь schema, CRUD, migration, seed-ийг хариуцна. Website-ийн сервер тал болон sysop-server дундаа ашиглана. Scope нь `@bigmotors/*`. [ADR 0014](docs/adr/0014-use-bigmotors-scope-and-db-owned-migrations.md)

**Үлдсэн шийдвэр:** Driver/pool, package exports, дотоод файлын зохион байгуулалт, CRUD function-ийн нийтлэг хэлбэр, transaction/error handling, migration/seed script болон ажиллуулах техник.

**Миний санал:** `pg` driver болон connection pool ашиглана. DB package connection тохиргоог app-аас авч, transaction context дамжуулж болох CRUD function-ууд экспортлох саналтай. Migration/seed-ийг DB package-ийн script-ээр ажиллуулж, migration-ийг app startup бүрд бус release-ийн тусдаа ажиллагаа болгоно. [node-postgres pooling](https://node-postgres.com/features/pooling)

**Үндэслэл ба сул тал:** DB код нэг эзэнтэй, app-ийн connection lifecycle тодорхой болно. Transaction context, exports болон migration-ийн зэрэгцээ ажиллалтыг зохицуулах шаардлагатай.

**Батлах шалгуур:** Driver, connection/transaction API, CRUD-ийн техникийн convention, exports, файлын зохион байгуулалт болон migration/seed script-ийн арга батлагдсан байна. ERD, хүснэгт/талбар, бизнесийн status болон өгөгдлийн дүрэм энэ task-ийн шалгуурт орохгүй.

**Гарах баримт:** DB tooling ADR, `docs/db/` package заавар, `docs/operations/` migration техник.

## TASK-05: DTI, validation ба API-ийн нийтлэг стандарт

- Төлөв: Хүлээгдэж буй
- Хамаарал: TASK-03; `@napp` сангуудын бодит API/registry мэдээлэл
- Баталсан огноо: Байхгүй
- Батлагдсан: Үндсэн `@napp` сангууд болон `sysop/dti`-ийн contract үүрэг өмнөх ADR-уудаар тогтсон; нарийвчилсан холболт батлаагүй

**Үлдсэн шийдвэр:** DTI сангуудын холболт, validation хэрэгсэл, response/error envelope, pagination-ийн нийтлэг хэлбэр, contract өөрчлөлтийн нийцлийн дүрэм.

**Миний санал:** `@napp/dti-core`-ийг contract, `@napp/dti-server`-ийг backend, `@napp/dti-client`-ийг frontend талд холбох хувилбарыг бодит API-аар шалгана. Энэ зураглалын нийцэл батлагдаагүй. DTI-ийн бэлэн validation-ийг түрүүлж үнэлж, нэмэлт хэрэгцээнд Zod санал болгоно. `@napp/error`-тай уялдуулсан error code, message, field errors, request ID хэлбэр хэрэглэнэ. [Zod](https://zod.dev/)

**Үндэслэл ба сул тал:** Нийтлэг contract-ийг нэг газар хөтөлнө. DTI-ийн бэлэн бүтэцтэй давхар envelope/validation үүсгэхгүй байх шаардлагатай.

**Батлах шалгуур:** Сангийн холболт, validation болон envelope-ийн техникийн жишээ, contract нийцлийн дүрэм батлагдсан байна. Бодит бизнес endpoint, талбарын шаардлагагүйгээр техникийн жишээгээр шалгаж болно.

**Гарах баримт:** DTI/validation ADR болон contract-ийн техникийн заавар.

## TASK-06: Storage ба upload технологи

- Төлөв: Хүлээгдэж буй
- Хамаарал: TASK-03, TASK-12
- Баталсан огноо: Байхгүй
- Батлагдсан: Шинэ сонголт батлаагүй

**Үлдсэн шийдвэр:** Storage төрөл/SDK, upload transport, файл шалгах болон зураг боловсруулах сан, access control-ийн механизм.

**Миний санал:** S3-compatible object storage, backend-ийн эрхээр хянах upload, зураг боловсруулахад `sharp` ашиглах саналтай. Файл шалгах болон боловсруулах ажиллагааг дахин ашиглах server-side модульд хөтөлнө. Тоон хязгааруудыг тохиргоогоор дамжуулна. [sharp](https://sharp.pixelplumbing.com/)

**Үндэслэл ба сул тал:** Зургийн хадгалалт app серверийн локал дискнээс хамаарахгүй. Upload тасрах болон боловсруулах алдаанд техникийн цэвэрлэгээ, дахин оролдлогын арга хэрэгтэй.

**Батлах шалгуур:** Storage API/SDK, upload зам, файл шалгах арга, image processing хэрэгсэл болон серверийн зааг батлагдсан байна.

**Гарах баримт:** Storage ADR, `docs/operations/` холболтын тохиргоо.

## TASK-07: Frontend хэрэгслүүд

- Төлөв: Хүлээгдэж буй
- Хамаарал: TASK-05
- Баталсан огноо: Байхгүй
- Батлагдсан: Website нь Next.js; admin нь Mantine/Vite; хоёул Tabler icons ашиглах суурь шийдвэртэй

**Үлдсэн шийдвэр:** Styling арга, routing, form state, server-state/cache хэрэгсэл болон client-side state зохион байгуулалт.

**Миний санал:** Website-д CSS Modules/CSS variables, admin-д React Router, `@mantine/form`, TanStack Query ашиглана. Query-ийн request function нь DTI client-ийг дуудна. UI-ийн энгийн төлөвт React state хэрэглэж, global state санг хэрэгцээгээр үнэлнэ. [React Router](https://reactrouter.com/start/declarative/installation), [Mantine form](https://mantine.dev/form/schema-validation/), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview)

**Үндэслэл ба сул тал:** Form, routing, server state тус бүр зориулалтын хэрэгслээр шийдэгдэнэ. DTI client, router болон Query-ийн интеграцыг шалгах хэрэгтэй.

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

- Төлөв: Хүлээгдэж буй
- Хамаарал: TASK-02, TASK-05, TASK-07
- Баталсан огноо: Байхгүй
- Батлагдсан: TypeScript, Node.js 24.11.0-аас дээших 24.x, shared library-д tsdown, тусдаа type check өмнө батлагдсан

**Үлдсэн шийдвэр:** Express server-ийн builder/dev runtime, dependency хувилбарууд, registry, compiler болон lint/format тохиргоо.

**Миний санал:** Server-д tsdown, `platform: 'node'`, ESM output; production-д Node.js, development-д `tsx` watch саналтай. TypeScript strict тохиргоо, ESLint + Prettier, manifest/lockfile-д уялдсан хувилбарууд хэрэглэнэ. `@napp` registry-г орчны тохиргоогоор холбоно. [tsdown platform](https://tsdown.dev/options/platform)

**Үндэслэл ба сул тал:** Library/server build ойролцоо болно. ESM resolution, DTI module format болон compiler тохиргооны нийцлийг шалгах шаардлагатай.

**Батлах шалгуур:** Хувилбарын хүснэгт, server build/dev/start, tsconfig, lint/format, exports болон registry арга батлагдсан байна.

**Гарах баримт:** Tooling ADR, `docs/operations/` орчны шаардлага.

## TASK-11: Тест ба CI хэрэгслүүд

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

- 2026-09-09: Хэрэглэгч TASK-01-ийг бүрэн баталсан. Server-only dependency, app-owned connection/factory injection, website/admin-ийн тусдаа DB credentials болон сервер талын эрхийн заагийг [ADR 0015](docs/adr/0015-isolate-server-side-db-access.md)-д бүртгэсэн. Бусад task-ийн төлөв өөрчлөгдөөгүй; хэрэгжүүлэлт хийгдээгүй.

- 2026-09-09: Хэрэглэгчийн заавраар бүртгэлийг зөвхөн tech spec хүрээнд цэгцэлсэн. Task ID, батлагдсан шийдвэр, хэсэгчилсэн төлөвийг хадгалж, техникийн бус нарийвчлалыг [дараа хэлэлцэх бүртгэл](docs/deferred-decisions.md)-д шилжүүлсэн. Хүрээ цэгцэлсэн нь шинэ технологийн санал баталсан гэсэн үг биш.

- 2026-09-09: Бүх workspace package-ийн `@bigmotors/*` scope, migration/seed-ийг `packages/db` хариуцах шийдвэр [ADR 0014](docs/adr/0014-use-bigmotors-scope-and-db-owned-migrations.md)-өөр батлагдсан. TASK-02, TASK-04-ийг шинэчилж, schema-ийн дэлгэрэнгүй загварыг хойшлуулсан.

- 2026-09-09: TASK-02-ын pnpm workspace болон зургаан хавтасны бүтэц [ADR 0013](docs/adr/0013-use-pnpm-workspace-layout.md)-аар батлагдсан. DB код monorepo дотор `packages/db` болсноор ADR 0012 орлуулагдсан. TASK-01, TASK-04-ийн одоогийн шийдвэр, саналыг нийцүүлсэн. Task-уудын үлдсэн саналууд батлагдаагүй.

- 2026-09-09: TASK-01 болон TASK-04-ийн DB бүтэц/CRUD-ийн эзэмшил, хамтын хэрэглээг [ADR 0012](docs/adr/0012-share-drizzle-db-repository.md)-оор хэсэгчлэн баталсан. Monorepo дотор `packages/db` нэмэх өмнөх саналыг тусдаа shared repository ашиглах шийдвэрээр шинэчилсэн. Бусад саналыг батлаагүй.
