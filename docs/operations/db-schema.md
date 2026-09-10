# DB schema хөгжүүлэх

- Огноо: 2026-09-10
- Төлөв: TypeScript schema, build, typecheck, санах ойн тест хэрэгжсэн; migration болон бодит DB provisioning хийгдээгүй.
- Эх сурвалж: [каталогийн батлагдсан schema](../db/catalog-schema-proposal.md), [ADR 0023](../adr/0023-approve-catalog-schema.md).

## Бүтэц

| Байршил | Үүрэг |
| --- | --- |
| `packages/core/src/catalog.ts` | Батлагдсан тогтмол сонголт, хязгаар |
| `packages/db/src/schema/` | 22 хүснэгтийн Drizzle schema, constraint/index |
| `packages/db/src/schema-hooks.ts` | Timestamp, product identity/lifecycle, subtype, publication болон category tree trigger-ийн эх тодорхойлолт |
| `packages/db/src/db.ts` | App-аас өгсөн pool-ийг Drizzle-д холбоно |
| `packages/db/test/` | PGlite доторх schema/constraint/trigger тест, pool factory тест |

Runtime dependency нь `drizzle-orm` 0.45.2, `pg` 8.23.0. Тестийн `@electric-sql/pglite` 0.5.8 нь dev dependency; production DB driver биш. Build нь tsdown, strict typecheck нь TypeScript. Тодорхой хувилбарууд package.json болон pnpm lockfile-д байна.

## Команд

Node.js 24, pnpm 11.19.0 ашиглаж repository root-оос:

```powershell
pnpm install --frozen-lockfile
pnpm build:db
pnpm typecheck:db
pnpm test:db
```

DB командууд эхэлж `@bigmotors/core`-ийг build хийнэ. Тестэнд PostgreSQL service, connection string, `.env` хэрэггүй. PGlite зөвхөн санах ойд ажиллана; Drizzle metadata-аас хүснэгтүүд болон trigger source-ийг туршаад хаана. Test helper нь production schema installer эсвэл migration generator биш.

## Ашиглах зааг

App тохиргоо уншаад pool үүсгэж, `createDb(pool)`-д өгнө. Pool-ийг request бүрд шинээр үүсгэхгүй; app shutdown үед `pool.end()` дуудна. Pool-ийн TLS, timeout, хэмжээ болон website/admin тусдаа credential-ийг тухайн app тохируулна. Package import хийхэд DB холболт, schema install, migration ажиллахгүй.

Schema-г `@bigmotors/db/schema`, factory-г `@bigmotors/db`-ээс импортлоно. Хэрэгтэй select/insert төрлийг хүснэгтийн `$inferSelect`, `$inferInsert`-ээс авч болно. Үнэ `bigint` боловч батлагдсан дээд хэмжээ JS safe integer-ээс бага тул TypeScript `number`; дугуйн `numeric(5,2)` талбарууд precision хадгалах `string` mapping-тай.

Product ба төрлийн дэлгэрэнгүй мөрийг заавал нэг transaction-д үүсгэнэ. Commit дээр тохирох detail мөр байхгүй бол бүх өөрчлөлт буцна. Child өөрчлөлт parent мөрийг update/lock хийж `updated_at`-ийг шинэчилнэ. `first_published_at` анх нийтлэхэд автоматаар тогтож, дахин нийтлэхэд өөрчлөгдөхгүй. Publication-ийн requiredness нь нэмэлт deferred trigger хамгаалалттай; энэ нь API validation, authorization-ийг орлохгүй.

Category tree-ийн бичилт advisory transaction lock авна; `READ COMMITTED` эсвэл `SERIALIZABLE` ашиглана. `REPEATABLE READ`-ийн хуучин snapshot-аас буруу cycle шалгалт хийхээс хамгаалж бичилтийг буцаана. Serializable conflict/deadlock гарвал бүх transaction-ийг дахин эхлүүлэх бодлогыг CRUD integration-д хийнэ.

## Migration Хийгээгүй

Хэрэглэгчийн хүсэлтээр migration, snapshot, seed болон migrate/push команд үүсгээгүй. Бодит DB schema, өгөгдөл өөрчлөөгүй.

Drizzle-ийн table metadata нь PostgreSQL trigger-үүдийг төлөөлөхгүй. Ирээдүйн migration боловсруулахдаа хүснэгт/FK-ийн дараа `schema-hooks.ts` дахь function/trigger-үүдийг тусад нь оруулах шаардлагатай. Ердийн Drizzle table generation эдгээрийг автоматаар нэмнэ гэж үзэхгүй. Source import дангаараа хамгаалалтыг DB дээр идэвхжүүлэхгүй.

## Дараагийн Ажил

- Shared CRUD transaction, request validation болон ойлгомжтой error mapping; backend/API-д холбоогүй.
- Тухайн оноор хязгаарлах шалгалт, бутархай integer/илүү precision-тай input-ийг DB тоймлохоос өмнө буцаах, optional текстийг NULL болгох; VIN-ийг хувиргахгүй.
- Өмнөх идэвхгүй лавлахыг хадгалах, шинэ сонголтод active лавлах шаардах дүрмийн before/after validation.
- Render fallback, HTML sanitization, disk upload/serve, orphan file cleanup; schema байгаа нь эдгээр урсгал бэлэн гэсэн үг биш.
- Userly profile upsert, ACL, website/admin DB role, connection lifecycle-ийн бодит integration.
- Бодит PostgreSQL дээр олон холболтын concurrent transaction, deadlock/retry, dump/restore тест. Одоогийн PGlite тест эдгээрийг нотлохгүй; migration хэрэглэхээс өмнө заавал нягтална.
