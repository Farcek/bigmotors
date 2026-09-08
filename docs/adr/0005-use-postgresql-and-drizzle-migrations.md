# 0005: PostgreSQL болон Drizzle migration workflow ашиглах

- Огноо: 2026-09-08
- Төлөв: Баталсан
- Үндэслэл: Хэрэглэгчийн database болон migration сонголт
- Холбоотой баримт: [Drizzle ORM](0003-use-drizzle-orm.md), [Өгөгдлийн сан](../db/README.md), [Ашиглалт](../operations/README.md)

## Нөхцөл байдал

ADR 0003-аар Drizzle ORM сонгосон боловч database engine болон migration workflow нээлттэй үлдсэн. Энэ шийдвэр тэдгээрийг тодорхойлно.

## Харьцуулсан хувилбарууд

Хэрэглэгч PostgreSQL болон Drizzle migration workflow-ийг сонгосон. Бусад database болон migration аргачлалыг энэ шийдвэрийн хүрээнд харьцуулж үнэлээгүй.

## Шийдвэр

- Database: PostgreSQL
- ORM: Drizzle ORM
- Migration: Drizzle migration workflow ашиглана.

Энэ шийдвэр ADR 0003-ын ORM сонголтыг хэвээр хадгалж, database болон migration сонголтоор өргөтгөнө.

## Үр дагавар

- Өгөгдлийн загвар болон DB хандалтын хэрэгжүүлэлтийг PostgreSQL, Drizzle ORM-д нийцүүлнэ.
- Schema өөрчлөлтийг Drizzle migration workflow-оор хөтөлнө.
- Migration үүсгэх, шалгах, хэрэглэх болон алдаа гарсан үед сэргээх ажиллагааны бодит командыг тохиргоо бүрдсэний дараа баримтжуулна.

## Нээлттэй асуултууд

- PostgreSQL, Drizzle ORM болон migration хэрэгслийн яг хувилбар юу байх вэ?
- PostgreSQL driver, холболтын тохиргоо болон байршуулах орчин ямар байх вэ?
- Schema, migration файлууд аль package-д байрлах вэ?
- Migration-ийг ямар орчинд, хэн, ямар командаар ажиллуулах вэ?
- Өгөгдөл хувиргах, нөөцлөх болон сэргээх нарийвчилсан журам ямар байх вэ?
