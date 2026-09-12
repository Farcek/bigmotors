# Migration файлууд

Энэ хавтасны SQL болон `meta/` snapshot/journal-ийг хамт version control-д хадгална.

- `0000_init.sql`: дахин үүсгэсэн baseline; одоогийн 24 хүснэгт, constraint/index болон FK. Drizzle Kit нь custom trigger/function-ийг автоматаар үүсгэдэггүй.
- `0001_restore_catalog_hooks.sql`: baseline-д дутсан 6 function, 31 trigger-ийг нэмнэ. Анхны нийтлэх огноо, updated_at, төлөв/устгалын хамгаалалт, detail бүрдэл, ангиллын cycle болон файлын устгалын хамгаалалтыг сэргээнэ. Өмнөх мөрүүдийг өөрчлөхгүй.
- `meta/`: Drizzle Kit-ийн үүсгэсэн snapshot болон migration дараалал. Гараар дараалал/огноо өөрчлөхгүй.

Ажилласан migration-ийг дахин засахгүй. Schema эсвэл trigger-ийн дараагийн өөрчлөлтөд шинэ migration үүсгэнэ. `schema-hooks.ts`-ийг өөрчлөх нь өмнө хэрэгжсэн DB trigger-ийг автоматаар шинэчлэхгүй.

Migration түүхийг дахин үүсгэхэд зөвхөн `db:generate` хангалтгүй: custom hook SQL болон `pnpm test:db` шалгалт заавал орно. Одоогийн baseline нь өмнөх устгасан migration түүхтэй DB-г шууд upgrade хийх зам биш; ийм орчинд тусдаа baseline нийцүүлэлт төлөвлөнө.

Root-оос `pnpm db:generate --name=change_name`; SQL-ээ шалгаж, тестлэсний дараа тусдаа `pnpm db:migrate` ажиллуулна. [Local болон deployment заавар](../../../docs/operations/db-migrations.md).
