# Sysop DTI

`@bigmotors/sysop-dti` нь admin frontend болон backend хоорондын API contract package.

`@napp/dti-core`-ийн `createAction`, Zod schema, domain namespace болон barrel export ашиглана. Browser/server shared package учраас DB, Express, environment, token, ACL хэрэгжүүлэлт агуулахгүй.

Одоогоор `Health.check` (`GET /health`) contract байна. Энэ нь одоо байгаа серверийн liveness response-г дүрсэлнэ; DTI router/client холболт болон каталогийн CRUD хараахан хийгдээгүй.

Root хавтсаас:

```powershell
pnpm build:dti
pnpm typecheck:dti
pnpm test:dti
pnpm dev:dti
```

Build нь ESM `dist/index.mjs` болон declaration `dist/index.d.mts` үүсгэнэ. `dev:dti` нь library watch; HTTP сервер ажиллуулахгүй.

Дэлгэрэнгүй [хөгжүүлэлтийн заавар](../../docs/operations/sysop-dti.md), [ADR 0021](../../docs/adr/0021-initialize-sysop-dti.md).
