# 0032: Sysop Ба Website-ийн Public File Read Route

- Огноо: 2026-09-12
- Төлөв: Баталсан
- Холбоотой: [Нэгдсэн дүрэм](../features/file-management.md#file-read-route), [Storage](../operations/file-storage.md), [ADR 0030](0030-unify-file-management.md), [ADR 0031](0031-use-files-root-for-storage-paths.md)

## Нөхцөл байдал

Sysop болон website дээр файл унших URL, lookup болон access дүрмийг ижил болгох шаардлагатай. Хэрэглэгч URL-ийн нэр болон file read access шалгахгүй байхыг тодорхой баталсан.

## Харьцуулсан хувилбарууд

- App бүр тусдаа route/access хэрэглэх: холбоос болон унших дүрэм зөрөх эрсдэлтэй.
- Ижил route боловч нэр, ACL эсвэл бүтээгдэхүүний төлөв шалгах: private хэрэглээг ялгаж болох ч хэрэглэгчийн сонгосон энгийн public read дүрэмд нийцэхгүй.
- Ижил public route, зөвхөн ID-аар lookup хийх: сонгосон хувилбар.

## Шийдвэр

Хоёр app `GET /files/:id/:originalName` ашиглана. `files.id`-гаар бүртгэлийг олно; originalName-г шалгахгүй, DB нэртэй тулгахгүй, storage зам болгохгүй. File read нь нэвтрэлт/ACL, usage эсвэл бүтээгдэхүүний төлөвөөс хамаарахгүй public байна.

Дискний эх сурвалж нь зөвхөн DB file_path болон FILES_ROOT. Storage containment хамгаалалт хэвээр. Upload болон өөрчлөх/устгах үйлдлийн эрхийг энэ шийдвэр өөрчлөхгүй. ADR 0030-д нээлттэй байсан read route/access асуудлыг шийдэв; бусад lifecycle дүрэм хэвээр.

## Үр дагавар

- Хоёр app ижил хэлбэрийн URL байгуулна; нэр өөр байсан ч ID ижил бол нэг файлыг уншина.
- Ноорог, нуусан, ашиглагдаагүй файлын URL-ийг мэдсэн хүн уншиж чадна. Нууц/private файл энэ загварт хадгалахгүй; UUID нь access хамгаалалт биш.
- DB lookup болон storage хүрээний хамгаалалт хэвээр; хавтас жагсаах эсвэл дурын disk зам нээхгүй.
- Public read runtime хараахан хэрэгжээгүй. Идэвхтэй агуулгын response header, serve domain, cache болон shared storage тохиргоог тусад нь шийднэ.
