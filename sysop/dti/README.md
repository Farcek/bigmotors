# Sysop DTI

`@bigmotors/sysop-dti` нь admin frontend болон backend хоорондын API contract package.

`@napp/dti-core`-ийн `createAction`, Zod schema, domain namespace болон barrel export ашиглана. Browser/server shared package учраас DB, Express, environment, token, ACL хэрэгжүүлэлт агуулахгүй.

`Health.check` (`GET /health`), `Colors`, `Branches` contract-ууд байна. Лавлах бүр `list`, `create`, `update`, `remove` action болон input/output schema/type экспортолно. `color.ts`, `branch.ts` нь domain contract, `common.ts` нь дундын ID, pagination, лавлахын талбаруудыг хариуцна. `@bigmotors/core`-ийн текстийн хязгаарыг хэрэглэнэ; DB package импортлохгүй.

`Colors` нь `/colors`, `Branches` нь `/branches`; list `GET`, create `POST`, update `PATCH /:id`, remove `DELETE /:id`. API router mount prefix contract-ийн path-д ороогүй. List result нь массив; бичих/устгах үйлдэл тухайн мөрийг буцаана. `createdAt`/`updatedAt` нь ISO string, DB-ийн `Date` биш. Server handler, auth/ACL болон admin form-д хараахан холбоогүй.

Root хавтсаас:

```powershell
pnpm build:dti
pnpm typecheck:dti
pnpm test:dti
pnpm dev:dti
```

Root командууд `core`-ийг эхлээд build хийнэ. Build нь ESM `dist/index.mjs` болон declaration `dist/index.d.mts` үүсгэнэ. `dev:dti` нь library watch; HTTP сервер ажиллуулахгүй.

Дэлгэрэнгүй [хөгжүүлэлтийн заавар](../../docs/operations/sysop-dti.md), [ADR 0021](../../docs/adr/0021-initialize-sysop-dti.md).
