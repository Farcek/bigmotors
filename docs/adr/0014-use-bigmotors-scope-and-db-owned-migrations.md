# 0014: Package scope болон migration/seed-ийн эзэмшлийг тогтоох

- Огноо: 2026-09-09
- Төлөв: Баталсан
- Үндэслэл: Хэрэглэгчийн TASK-02, TASK-04-ийн тодруулга
- Холбоотой баримт: [Workspace бүтэц](0013-use-pnpm-workspace-layout.md), [Task бүртгэл](../../docs.task.md), [Өгөгдлийн сан](../db/README.md)

## Нөхцөл байдал

pnpm workspace болон хавтасны бүтэц батлагдсан. Package-ийн нийтлэг scope, migration болон seed-ийн хариуцлагыг тодорхой болгох шаардлагатай байсан.

## Харьцуулсан хувилбарууд

Хэрэглэгч `@bigmotors/*` нэршил болон DB package-ийн эзэмшлийг сонгосон. Өөр scope эсвэл migration/seed-ийг app бүрд хуваах хувилбарыг сонгоогүй.

## Шийдвэр

- Төслийн бүх workspace package-ийн нэр `@bigmotors/*` scope-той байна. Энэ нь `web/website`, `sysop/app`, `sysop/dti`, `sysop/server`, `packages/core`, `packages/db` бүгдэд хамаарна.
- Гаднын dependency-ийн нэршил (`@napp/*`, `@mantine/*` зэрэг) хэвээр байна.
- `packages/db` нь Drizzle schema болон CRUD-ээс гадна migration, seed-ийн файл, логик болон тэдгээрийн командыг хариуцна.
- App бүр migration болон seed-ийн тусдаа хуулбар хөтлөхгүй. Deployment үеийн ажиллуулах орчин, эрх болон дарааллыг operations баримтад тусад нь тодорхойлно.
- Schema-ийн дэлгэрэнгүй бүтэц буюу хүснэгт, талбар, холбоос, constraint болон индексийг дараа тогтооно. Одоогийн schema саналууд батлагдсан загвар болохгүй.

## Үр дагавар

- TASK-02-ын нийтлэг scope болон TASK-04-ийн migration/seed эзэмшил батлагдсан.
- TASK-04-ийн schema загвар боловсруулах хэсгийг хойшлуулсан. Driver, CRUD API, хандалтын эрх болон migration/seed ажиллуулах журмыг үргэлжлүүлэн шийдэж болно.
- Package-ийн export, дотоод файлын зам болон script-ийн яг нэрийг энэ шийдвэрээр тогтоогоогүй.
- Өмнөх pnpm, хавтасны бүтэц, PostgreSQL болон Drizzle сонголтыг хадгална. Dependency эсвэл schema хэрэгжүүлэлт үүсгээгүй.
