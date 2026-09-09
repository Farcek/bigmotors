# 0001: Monorepo бүтэц ашиглах

- Огноо: 2026-09-08
- Төлөв: Баталсан
- Үндэслэл: Хэрэглэгчийн өгсөн төслийн бүтэц
- Холбоотой баримт: [Төслийн README](../../README.md), [Боломжууд ба хүрээ](../features/README.md)

## Нөхцөл байдал

Public website, admin backend, admin frontend болон тэдгээрийн дундын кодыг нэг repository дотор зохион байгуулна.

## Харьцуулсан хувилбарууд

Хэрэглэгч monorepo бүтцийг сонгосон. Тусдаа repository ашиглах хувилбарыг энэ шийдвэрийн хүрээнд харьцуулж үнэлээгүй.

## Шийдвэр

`bm-website` repository нь дараах логик хэсгүүдтэй monorepo байна.

| Хэсэг | Үүрэг |
| --- | --- |
| `website` | Public website |
| `sysop-server` | Admin backend |
| `sysop-app` | Admin frontend |
| `sysop-dti` | `sysop-server` болон `sysop-app` хооронд мэдээлэл дамжуулах бүтэц (API contract) |
| `core` | Website болон admin хооронд хуваалцах enum, const value, shared helper, functions |

Энэ жагсаалт нь анхны логик хэсгүүдийг тогтоосон. pnpm workspace, физик хавтасны бүтэц болон нэмэлт `packages/db`-ийн үүргийг [ADR 0013](0013-use-pnpm-workspace-layout.md)-д баталсан.

### sysop-dti-ийн үүрэг

`sysop-dti` нь `sysop-server` болон `sysop-app` хоорондын API request, response-д дамжуулах өгөгдлийн бүтцийг нэг дор тодорхойлно. Backend болон frontend нь энэ нийтлэг contract-ийг ашиглана. Website болон admin-ийн дундын enum, тогтмол утга, helper, functions нь `core`-ийн үүрэг хэвээр байна.

## Үр дагавар

- Public болон admin хэсгийн өөрчлөлтийг нэг repository дотор уялдуулна.
- Дундын enum, тогтмол утга, helper болон functions-ийг `core`-д төвлөрүүлнэ.
- Admin API-ийн өгөгдлийн бүтцийг `sysop-dti`-д хөтөлж, contract өөрчлөгдөхөд `sysop-server` болон `sysop-app`-д үзүүлэх нөлөөг хамт шалгана.
- Workspace тохиргоо, package хоорондын dependency болон build дарааллыг хэрэгжүүлэх үед тодорхойлно.

## Нээлттэй асуултууд

- pnpm workspace доторх package нэршил, dependency болон build/watch зохион байгуулалт ямар байх вэ?
- Website болон sysop-server-ийн shared DB package-ийн байршил/үүрэг [ADR 0013](0013-use-pnpm-workspace-layout.md), connection болон эрх тусгаарлах архитектур [ADR 0015](0015-isolate-server-side-db-access.md)-аар шийдэгдсэн. Өгөгдөл/үйлдэл тус бүрийн эрхийг дараа тодорхойлно.

## Тодруулгын түүх

- 2026-09-09: [ADR 0013](0013-use-pnpm-workspace-layout.md)-аар pnpm workspace болон зургаан хавтасны бүтцийг баталсан. DB кодыг monorepo доторх `packages/db` болгож, ADR 0012-ыг орлуулсан.

- 2026-09-09: [ADR 0012](0012-share-drizzle-db-repository.md)-оор DB бүтэц болон CRUD-ийг тусдаа shared repository-д хөтөлж, website болон sysop-server хамт ашиглахаар баталсан. Monorepo-ийн үндсэн таван хэсэг хэвээр.

- 2026-09-08: `sysop-server`-ийн framework-ийг Express.js гэж [ADR 0010](0010-use-express-for-sysop-server.md)-д баталж, холбогдох нээлттэй асуултыг шийдвэрлэсэн.

- 2026-09-08: `sysop-app`-ийн UI library-ийг Mantine, build хэрэгслийг Vite гэж [ADR 0007](0007-use-mantine-and-vite-for-sysop-app.md)-д баталсан. Энэ нь monorepo түвшний build зохион байгуулалтын сонголтыг тогтоохгүй.

- 2026-09-08: Хэрэглэгч `sysop-dti` нь `sysop-server` болон `sysop-app` хоорондын мэдээлэл дамжуулах бүтэц буюу API contract-ийг хариуцахыг тодруулсан. Өмнө нээлттэй байсан үүргийг тодорхой болгосон; monorepo шийдвэрийг орлоогүй.
