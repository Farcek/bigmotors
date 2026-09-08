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

Энэ жагсаалт нь хэсгүүдийн нэр, үүргийг тогтооно. Root түвшинд байрлуулах эсвэл `apps/`, `packages/` болгон бүлэглэх физик хавтасны бүтэц хараахан шийдэгдээгүй.

### sysop-dti-ийн үүрэг

`sysop-dti` нь `sysop-server` болон `sysop-app` хоорондын API request, response-д дамжуулах өгөгдлийн бүтцийг нэг дор тодорхойлно. Backend болон frontend нь энэ нийтлэг contract-ийг ашиглана. Website болон admin-ийн дундын enum, тогтмол утга, helper, functions нь `core`-ийн үүрэг хэвээр байна.

## Үр дагавар

- Public болон admin хэсгийн өөрчлөлтийг нэг repository дотор уялдуулна.
- Дундын enum, тогтмол утга, helper болон functions-ийг `core`-д төвлөрүүлнэ.
- Admin API-ийн өгөгдлийн бүтцийг `sysop-dti`-д хөтөлж, contract өөрчлөгдөхөд `sysop-server` болон `sysop-app`-д үзүүлэх нөлөөг хамт шалгана.
- Workspace тохиргоо, package хоорондын dependency болон build дарааллыг хэрэгжүүлэх үед тодорхойлно.

## Нээлттэй асуултууд

- Package manager, monorepo түвшний workspace/build зохион байгуулалт, физик хавтасны бүтэц ямар байх вэ?
- Website өгөгдлөө ямар сервер эсвэл API-аас авах вэ?

## Тодруулгын түүх

- 2026-09-08: `sysop-server`-ийн framework-ийг Express.js гэж [ADR 0010](0010-use-express-for-sysop-server.md)-д баталж, холбогдох нээлттэй асуултыг шийдвэрлэсэн.

- 2026-09-08: `sysop-app`-ийн UI library-ийг Mantine, build хэрэгслийг Vite гэж [ADR 0007](0007-use-mantine-and-vite-for-sysop-app.md)-д баталсан. Энэ нь monorepo түвшний build зохион байгуулалтын сонголтыг тогтоохгүй.

- 2026-09-08: Хэрэглэгч `sysop-dti` нь `sysop-server` болон `sysop-app` хоорондын мэдээлэл дамжуулах бүтэц буюу API contract-ийг хариуцахыг тодруулсан. Өмнө нээлттэй байсан үүргийг тодорхой болгосон; monorepo шийдвэрийг орлоогүй.
