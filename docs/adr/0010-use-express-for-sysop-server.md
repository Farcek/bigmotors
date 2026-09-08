# 0010: sysop-server-д Express.js ашиглах

- Огноо: 2026-09-08
- Төлөв: Баталсан
- Үндэслэл: Хэрэглэгчийн admin backend-ийн framework сонголт
- Холбоотой баримт: [Monorepo бүтэц](0001-use-monorepo.md), [TypeScript](0006-use-typescript-for-all-code.md), [Үндсэн сангууд](0004-use-napp-libraries.md)

## Нөхцөл байдал

Admin backend болох `sysop-server`-ийн framework-ийг тогтооно.

## Харьцуулсан хувилбарууд

Хэрэглэгч Express.js-ийг сонгосон. Бусад backend framework-ийг энэ шийдвэрийн хүрээнд харьцуулж үнэлээгүй.

## Шийдвэр

- `sysop-server`-ийг Express.js дээр хэрэгжүүлнэ.
- Эх кодыг TypeScript дээр бичиж, төслийн батлагдсан Node.js 24.x орчинд ажиллуулна.
- `sysop-app`-тай мэдээлэл солилцох API contract-ийг `sysop-dti`-д хөтөлнө.

## Үр дагавар

- Admin backend-ийн route болон middleware зохион байгуулалтыг Express.js-д нийцүүлнэ.
- Алдаа боловсруулах болон DTI сангуудын холболтыг тэдгээрийн бодит API-д тулгуурлан хэрэгжүүлэлтийн үед тодорхойлно.
- Энэ шийдвэр нь framework-ийн сонголтыг бүртгэсэн бөгөөд серверийн код, dependency болон ажиллуулах тохиргоо одоогоор үүсээгүй.

## Нээлттэй асуултууд

- Express.js-ийн яг хувилбар юу байх вэ?
- `sysop-server`-ийн builder, хөгжүүлэлтийн болон production ажиллуулах команд ямар байх вэ?
- Route, middleware болон DTI холболтын нарийвчилсан бүтэц ямар байх вэ?
