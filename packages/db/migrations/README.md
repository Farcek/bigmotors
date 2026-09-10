# Migration файлууд

Энэ хавтасны SQL болон `meta/` snapshot/journal-ийг хамт version control-д хадгална.

- `0000_initial_catalog.sql`: 22 хүснэгт, constraint/index болон анхны trigger/function-үүд. Хоосон database-д зориулсан эхний migration.
- `0001_add_color_hex_code.sql`: `colors.hex_code` сонголттой багана, `#RRGGBB` CHECK; өмнөх өнгө болон холбоосуудыг хадгална.
- `0002_separate_product_locations.sql`: `locations`, гурван төрлийн `location_id`, FK/index, timestamp trigger; бэлэн машины нийтлэх шаардлагыг салбараас байршил руу шилжүүлнэ. Хуучин `branch_id` хадгалагдана, байршлыг тааж бөглөхгүй.
- `meta/`: Drizzle Kit-ийн үүсгэсэн snapshot болон migration дараалал. Гараар дараалал/огноо өөрчлөхгүй.

Ажилласан migration-ийг дахин засахгүй. Schema эсвэл trigger-ийн дараагийн өөрчлөлтөд шинэ migration үүсгэнэ. `schema-hooks.ts`-ийг өөрчлөх нь өмнө хэрэгжсэн DB trigger-ийг автоматаар шинэчлэхгүй.

Root-оос `pnpm db:generate --name=change_name`; SQL-ээ шалгаж, тестлэсний дараа тусдаа `pnpm db:migrate` ажиллуулна. [Local болон deployment заавар](../../../docs/operations/db-migrations.md).
