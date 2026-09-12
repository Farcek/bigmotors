# Файлын Хадгалалтын Тохиргоо

- Огноо: 2026-09-12
- Төлөв: `FILES_ROOT` суурьтай замын зарчим батлагдсан. [ConfigFiles](../../packages/core/src/config.files.ts) нь environment утгыг уншдаг; upload runtime, path validation болон disk setup хараахан хэрэгжээгүй.
- Үндсэн дүрэм: [Файл upload ба ашиглалт](../features/file-management.md)

## Root Ба Зам

- Суурь нь `ConfigFiles.FILES_ROOT`; repository root, `sysop/server` эсвэл terminal-ийн current directory биш. Энэ нь өмнөх repository-root-relative дүрмийг [ADR 0031](../adr/0031-use-files-root-for-storage-paths.md)-ээр орлоно.
- `FILES_UPLOADS` нь upload бичих disk хавтас. `files.file_path` нь эцсийн disk замыг **FILES_ROOT-оос харьцангуй** илэрхийлнэ; DB-д absolute path эсвэл public URL хадгалахгүй.
- Суурь тооцоо: `file_path = relative(FILES_ROOT, diskPath)`; унших/устгахдаа `diskPath = resolve(FILES_ROOT, file_path)`. DB-д separator-ийг `/` хэлбэрээр нэгтгэнэ.
- Жишээ: `FILES_ROOT=/files`, `FILES_UPLOADS=/files/uploads`, disk файл `/files/uploads/<generated-id>` бол DB file_path нь `uploads/<generated-id>`. `uploads` хэсгийг DB замаас хасахгүй; уншихдаа FILES_UPLOADS-тай дахин нийлүүлэхгүй.
- Local Windows жишээ: `FILES_ROOT=E:\bigmotors-data`, `FILES_UPLOADS=E:\bigmotors-data\uploads`, file_path `uploads/<generated-id>`. Төсөл хаана байгаагаас зам хамаарахгүй; энэ нь жишээ, бодит тохиргоо/хавтас үүсгээгүй.
- Хэрэгжүүлэх path validation: тохируулсан замууд тухайн OS-ийн absolute disk path байх; FILES_UPLOADS нь FILES_ROOT дотор байна. Харьцангуй эсвэл хоосон config-ийг cwd/repository руу тааж нөхөхгүй. Windows-д drive-тай absolute path тодорхой өгнө.
- Backend хадгалах нэрийг үүсгэнэ. Client/DB file_path-д absolute path, traversal болон root-оос гарах замыг зөвшөөрөхгүй. Resolve хийсний дараа storage хүрээнд үлдсэнийг шалгана; original_name-г зам болгохгүй. Symlink-ээр root/storage хүрээнээс гарахыг мөн зөвшөөрөхгүй. Энэ хамгаалалт нь файлын формат шалгах дүрэм биш.
- Container/build орчинд FILES_ROOT-ийг ил тод тохируулж, storage замд persistent volume холбоно. Өөр орчинд root солигдсон ч доторх харьцангуй бүтэц ижил бол DB file_path өөрчлөгдөхгүй.
- Өмнөх `0003_shared_files` migration замын утгыг өөрчлөхгүй, дискний файл зөөхгүй. Upload implementation хийхийн өмнө өмнөх өгөгдлийн замын суурийг шалгана; зөрвөл тусдаа шилжилт хэрэгтэй, автоматаар шинэ суурьтай гэж таахгүй.

## Одоогийн Config Код

| Утга | Кодын default | Үүрэг |
| --- | --- | --- |
| `FILES_ROOT` | `/files` | DB file_path-ийн суурь disk зам |
| `FILES_UPLOADS` | `/files/uploads` | Upload бичих disk хавтас |

Одоогийн constructor хоёр default-ийг тус тусад нь оноодог. Зөвхөн `FILES_ROOT` солиход FILES_UPLOADS автоматаар дагаж өөрчлөгдөхгүй. Одоохондоо override хийхдээ хоёуланг нь нийцүүлж өгнө. Дээрх absolute/containment validation кодод байхгүй; upload хэрэгжүүлэхдээ нөхнө. Зөвхөн root өгсөн үед uploads-ийг түүнээс derive хийх эсэх нь дараагийн config хэрэгжүүлэлтийн санал; одоогийн кодыг энэ баримтаар өөрчлөөгүй.

## Upload Хэмжээ Ба Алдаа

Нэг файлын хэмжээний үндсэн утга [feature дүрэмд](../features/file-management.md#upload) байна. Backend stream хүлээн авах явцад хязгаарлана. Proxy-ийн request limit нь multipart metadata/overhead-ийг тооцож, зөвшөөрөгдөх нэг файлыг хаахгүй байх ёстой; нийт request limit болон timeout-ийг transport сонгохдоо тогтооно.

Upload тасрах болон DB бүртгэл бүтэлгүйтэхэд дутуу файлыг цэвэрлэнэ. Commit-ийн дараах disk delete бүтэлгүйтвэл retry/reconciliation шаардлагатай. Энэ нь ашиглагдаагүй бүх файлыг автоматаар устгах cron биш.

## Production-д Шийдэх Зүйл

- Persistent volume болон олон instance-ийн ижил файлд хандах арга.
- DB metadata ба дискний файлыг хамтад нь backup/restore хийх төлөвлөгөө.
- Хандах эрх, serve route/domain, public/private access бодлого.
- Disk багтаамж, permission, timeout, cleanup retry-ийн ажиллагаа.

Бүх upload хавтсыг шууд public static болгох шийдвэр гараагүй. Энэ баримтаар бодит хавтас, Docker volume эсвэл environment variable нэмээгүй.
