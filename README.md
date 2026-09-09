# BigMotors LLC Website

BigMotors LLC-ийн автомашин, сэлбэг хэрэгсэл, дугуйн каталог болон компанийн танилцуулгын веб сайт.

## Зорилго

Энэ төсөл нь BigMotors LLC-ийн борлуулж буй автомашин, сэлбэг хэрэгсэл, дугуйг хэрэглэгчдэд ойлгомжтой байдлаар танилцуулах, компанийн мэдээлэл, үйлчилгээ, холбоо барих сувгийг нэг дор төвлөрүүлэх зорилготой.

**Сайт нь каталог; сайтаар бүтээгдэхүүн худалдахгүй.** Энэ зааг автомашин, сэлбэг хэрэгсэл, дугуйд бүгдэд нь хамаарна. Сагс, checkout, онлайн худалдааны захиалга болон төлбөр хэрэгжүүлэхгүй. Батлагдсан зааг болон цааш хэлэлцэх боломжийг [бүтээгдэхүүний хүрээ](docs/features/scope.md)-д тодорхойлсон.

## Үндсэн хэсгүүд

- Нүүр хуудас
- Компанийн танилцуулга
- Автомашины каталог
- Сэлбэг хэрэгслийн каталог
- Дугуйн каталог
- Бүтээгдэхүүний дэлгэрэнгүй мэдээлэл
- Үйлчилгээний мэдээлэл
- Холбоо барих

## Каталогийн боломжууд

Үндсэн бүтээгдэхүүний төрлүүд нь автомашин, сэлбэг хэрэгсэл, дугуй. Доорх автомашины мэдээлэл нь нарийвчлан батлах анхны санал; харуулах талбар болон шүүлт бүрийн хүрээ хараахан эцэслээгүй. Сэлбэг хэрэгсэл, дугуйн талбар болон шүүлтийг тусад нь тодорхойлно.

- Автомашины зураг, марк, модель, он, үнэ, төлөвийг харуулах
- Түлшний төрөл, хурдны хайрцаг, явсан км, хөдөлгүүрийн багтаамж зэрэг үзүүлэлтүүдийг харуулах
- Марк, үнэ, он, төлөвөөр шүүх боломж
- Онцлох болон шинээр нэмэгдсэн автомашинуудыг ялгаж харуулах

## Компанийн танилцуулга

Сайт нь BigMotors LLC-ийн тухай товч мэдээлэл, үйл ажиллагааны чиглэл, давуу тал, хэрэглэгчдэд санал болгох үнэ цэнийг тодорхой харуулна.

## Хөгжүүлэлтийн тэмдэглэл

Одоогийн ажил автомашин, сэлбэг хэрэгсэл, дугуйн каталог болон бүтээгдэхүүний мэдээллийн admin удирдлагад төвлөрнө. CRM-ийг тусдаа системээр боловсруулна; энэ repository-д CRM модуль хөгжүүлэхгүй. CRM-тэй холболт одоогийн хүрээнд ороогүй.

Үндсэн хүрээ нь компанийн танилцуулга болон автомашин, сэлбэг хэрэгсэл, дугуйн каталог. Төрөл бүрийн жагсаалт, дэлгэрэнгүй хуудас болон холбоо барих үйлдлийн нарийвчлалыг features баримтад батална.

Validation, helper function болон бусад нийтлэг хэрэгцээнд стандарт, тогтсон npm санг аль болох түлхүү ашиглана. Сонгох болон хэрэглэх зарчмыг [ADR 0011](docs/adr/0011-prefer-established-npm-libraries.md)-д тодорхойлсон.

## Архитектур ба технологи

Төсөл нь pnpm workspace ашигласан monorepo байна. Батлагдсан хавтасны бүтэц болон хэсгүүдийн үүргийг [ADR 0013](docs/adr/0013-use-pnpm-workspace-layout.md)-д тодорхойлсон. Бүх workspace package нь [@bigmotors/* scope](docs/adr/0014-use-bigmotors-scope-and-db-owned-migrations.md)-той байна.

```text
web/website
sysop/app
sysop/dti
sysop/server
packages/core
packages/db
```

- Public website: Next.js, PWA дэмжлэгтэй
- Admin frontend (`sysop-app`): [Mantine UI, Vite build](docs/adr/0007-use-mantine-and-vite-for-sysop-app.md)
- Admin backend (`sysop-server`): [Express.js](docs/adr/0010-use-express-for-sysop-server.md)
- Icon library (`sysop-app`, `website`): [@tabler/icons-react](docs/adr/0008-use-tabler-icons-react.md)
- Програмчлалын хэл: бүх кодыг [TypeScript дээр бичнэ](docs/adr/0006-use-typescript-for-all-code.md)
- Shared library builder (`core`, `sysop-dti` болон бусад shared library): [tsdown, ESM + `.d.ts`](docs/adr/0009-use-tsdown-for-shared-libraries.md)
- Type checking: `tsc --noEmit`
- Node.js runtime: 24.x, хамгийн багадаа 24.11.0 (`>=24.11.0 <25`)
- Database: PostgreSQL
- ORM: Drizzle ORM
- DB бүтэц ба CRUD: `web/website`-ийн сервер тал болон `sysop/server` дундаа ашиглах `packages/db`
- Migration: Drizzle migration workflow; migration болон seed-ийг `packages/db` хариуцна
- Үндсэн сангууд: `@napp/error` (error handling), `@napp/dti-core`, `@napp/dti-server`, `@napp/dti-client`

Сангуудын сонголтыг [ADR 0004](docs/adr/0004-use-napp-libraries.md), database болон migration сонголтыг [ADR 0005](docs/adr/0005-use-postgresql-and-drizzle-migrations.md)-д бүртгэсэн.

Root болон зургаан package-д минимал `package.json` үүсгэсэн. Root нэр нь `@bigmotors/bm-website`; дотоод package-ууд нь `@bigmotors/website`, `@bigmotors/sysop-app`, `@bigmotors/sysop-dti`, `@bigmotors/sysop-server`, `@bigmotors/core`, `@bigmotors/db`. Бүгд `private: true`, эхний хувилбар `0.0.0`, Node.js шаардлага `>=24.11.0 <25` байна. Shared library manifest-ууд ESM (`type: module`) ашиглана.

Эх код, dependency, script, package exports болон `pnpm-workspace.yaml` хараахан үүсээгүй; build болон ажиллуулах орчин тохируулагдаагүй.

## Баримт бичиг

- [Tech spec task-ууд](docs.task.md): технологи, архитектур, tooling, техникийн тохиргооны санал, батлах шалгуур болон төлөв
- [Дараа хэлэлцэх асуудлууд](docs/deferred-decisions.md): бизнесийн боломж, schema загвар, UI дизайн болон ашиглалтын нөхцөл
- [UI / UX](docs/ui/README.md): дизайн, хэрэглэгчийн урсгал, харагдах байдлын дүрэм
- [Боломжууд ба хүрээ](docs/features/README.md): шаардлага, багтах болон багтахгүй ажил, хүлээн авах шалгуур
- [ADR](docs/adr/README.md): архитектурын шийдвэр, үндэслэл, үр дагавар
- [Өгөгдлийн сан](docs/db/README.md): өгөгдлийн загвар, схем, өөрчлөлт
- [Ашиглалт](docs/operations/README.md): ажиллуулах, байршуулах, хянах, нөөцлөх, сэргээх заавар
