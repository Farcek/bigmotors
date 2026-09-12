# Settings

Хэрэглэгчийн баталсан key/value бүтэц. Хэрэгжүүлсэн: 2026-09-13.

| Талбар | Төрөл | Дүрэм |
| --- | --- | --- |
| key | varchar(255) | Primary key, хоосон/дан зай биш |
| value | varchar(255) | NOT NULL, хоосон string зөвшөөрнө |

- `settings` хүснэгт зөвхөн хоёр баганатай. ID, timestamps болон FK нэмээгүй.
- Key case-sensitive; key/value-г trim эсвэл өөр хэлбэрт хөрвүүлэхгүй. PostgreSQL text-д хадгалах боломжгүй NUL тэмдэгтийг API/service хориглоно.
- API ба `SettingsService` нь дурын key/value хадгална. Core дахь нэрлэсэн гурван key нь DB/API whitelist биш.
- `homepage` нь page UUID-г string байдлаар хадгална; FK биш. Page устах/архивлагдах үед утгыг автоматаар солихгүй.
- `save(entries)` нь нэг INSERT ... ON CONFLICT UPDATE ажиллагаа. Нэг удаад 1..100 ялгаатай key-г атомикаар хадгалж, ороогүй key-үүдийг хэвээр үлдээнэ.
- PATCH нь value-г солино. Key rename байхгүй; DELETE + POST ашиглана.
- `0004_settings.sql` migration зөвхөн хүснэгт, PK, nonblank CHECK нэмнэ. Одоогийн өгөгдөлд хүрэхгүй, seed/default утга автоматаар үүсгэхгүй. Буцаах бол өгөгдлийг нөөцлөөд тусдаа migration гаргана.

[Admin ба API](../features/admin-settings.md).
