# 0021: Sysop DTI суурь initialize

- Огноо: 2026-09-10
- Төлөв: Баталсан (хэрэглэгчийн initialize хүсэлтийн хүрээ)
- Холбоотой баримт: [ADR 0004](0004-use-napp-libraries.md), [ADR 0009](0009-use-tsdown-for-shared-libraries.md), [TASK-05](../../docs.task.md#task-05-dti-validation-ба-api-ийн-нийтлэг-стандарт), [ашиглалтын заавар](../operations/sysop-dti.md)

## Нөхцөл байдал

Хэрэглэгч `sysop-dti`-г initialize хийж, `E:\projects\chip CRM\apps\dti`-ээс жишээ авахыг хүссэн. BigMotors-д shared API contract, TypeScript, `@napp` болон ESM tsdown суурь өмнө батлагдсан.

## Харьцуулсан хувилбарууд

- Chip CRM-ийг бүхэлд нь хуулах: CRM domain, UUID/pagination болон ESM+CJS тохиргоо шаардлагагүйгээр орж ирнэ.
- Contract бичих хэв маягийг авч, BigMotors-ийн батлагдсан ESM/shared заагт тааруулах: бизнес API нэмэхгүйгээр суурийг шалгах боломжтой.

## Шийдвэр

Хоёр дахь хувилбарыг хэрэгжүүлэв. `@napp/dti-core` 6.1.2-ийн `createAction`, түүний peer dependency-д нийцсэн Zod 4.4.3, domain namespace болон barrel export ашиглана. Zod нь schema болон inferred TypeScript type-ийн эх сурвалж байна.

Build нь ADR 0009-ийн дагуу tsdown ESM + declaration, `platform: neutral`. Tooling хувилбаруудыг server-тэй ижил авч, manifest/lockfile-д pin хийсэн. CJS build нэмээгүй.

Эхний contract нь серверт байгаа `GET /health` liveness payload. Шинэ бизнес endpoint, ID/pagination дүрэм, error envelope батлаагүй. `@napp/dti-server/client` холболт дараагийн ажил; HTTP handler-ууд энэ өөрчлөлтөөр schema validation хийхгүй.

## Үр дагавар

Browser/server талд ашиглаж болох, build/typecheck/test бүхий contract package үүссэн. DB, орчны тохиргоо, token болон ACL implementation contract package-д орохгүй. Contract ба handler/client-ийг дараа холбох, нийцлийг integration тестээр хамгаалах шаардлагатай. TASK-05 зөвхөн хэсэгчлэн батлагдсан хэвээр байна.
