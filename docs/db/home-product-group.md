# home_product_group

Нүүр хуудасны урьдчилан тохируулсан автомашины хайлтын бүлэг. Лавлах table биш; нэг автомашин олон бүлэгт багтаж болно.

| SQL талбар | Төрөл | Дүрэм |
| --- | --- | --- |
| id | uuid | PK, default random UUID, өөрчлөхгүй |
| title | varchar(255) | NOT NULL, хоосон биш |
| description | varchar(512) | NULL зөвшөөрнө |
| image_id | uuid | NULL зөвшөөрнө, files.id FK, DELETE RESTRICT |
| filters | jsonb | NOT NULL, default `{}`, JSON object |
| sort_order | integer | NOT NULL, default 0 |
| is_active | boolean | NOT NULL, default true |
| created_at | timestamptz | NOT NULL, default now, өөрчлөхгүй |
| updated_at | timestamptz | NOT NULL, default now, update trigger |

- Index: `(is_active, sort_order, id)`, `(image_id)`. Гарчиг unique биш.
- filters: `packages/core/src/vehicle-search.ts`-ийн зөвшөөрөгдсөн автомашины хайлтын талбарууд. JSON дахь UUID нь FK биш; service-д лавлахын оршин байгаа эсэх, parent хамаарлыг шалгана. Нөхцөл шинэчлэх нь object-ийг бүхлээр солино.
- JSONB object CHECK нь DB-д, нарийвчилсан filter validation нь service/DTI-д байна. Шууд SQL бичилт service validation-ийг орлохгүй.
- Зураг холбоход `files.usage`-д бүлгийн id нэмнэ; солих/хасах/бүлэг устгахад хуучин холбоосыг хасна. Trigger нэг transaction дотор файлд lock авч, давхар usage нэмэхгүй. Эх файлыг устгахгүй.
- Идэвхгүй болгосон бүлэг мөн зураг ашиглаж буйд тооцогдоно.
- Migration: `0008_home_product_group.sql`, table/index/FK болон timestamp/file usage trigger. Өмнөх бүтээгдэхүүний өгөгдлийг өөрчлөхгүй.
- [Admin боломж, contract](../features/admin-home-product-groups.md).
