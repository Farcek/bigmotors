# 0031: Файлын Замыг FILES_ROOT-оос Тооцох

- Огноо: 2026-09-12
- Төлөв: Баталсан
- Холбоотой: [ConfigFiles](../../packages/core/src/config.files.ts), [Storage](../operations/file-storage.md), [Upload дүрэм](../features/file-management.md), [ADR 0030](0030-unify-file-management.md)

## Нөхцөл Байдал

Хэрэглэгч file_path-ийн суурь нь repository root биш, ConfigFiles дахь FILES_ROOT байх ёстой гэж тодруулсан. Кодод FILES_ROOT болон FILES_UPLOADS хоёр тохиргоо нэмсэн.

## Харьцуулсан Хувилбарууд

- Repository-root-relative: өмнөх тайлбар; storage-г repository байршилтай холбодог.
- FILES_ROOT-relative: storage суурийг environment-оор тогтоож, DB замыг deployment-ийн absolute path-аас салгана.

## Шийдвэр

FILES_ROOT-relative хувилбар баталсан. ADR 0030-ын repository root гэсэн хэсгийг орлоно. FILES_UPLOADS нь upload бичих хавтас; DB file_path нь түүнээс биш FILES_ROOT-оос харьцангуй байна. Бусад lifecycle, 20 MB болон эх файл өөрчлөхгүй дүрэм хэвээр.

## Үр Дагавар

- DB-д absolute path хадгалахгүй; унших/устгах үед FILES_ROOT + file_path хэрэглэнэ.
- Замын хүрээ болон config validation-ийг upload хэрэгжүүлэх үед хангана; одоогийн constructor үүнийг хараахан шалгахгүй.
- ConfigFiles болон түүний export-ийн хэрэглэгчийн кодыг өөрчлөөгүй. Upload API-ийн шинэ санал нь тусдаа батлах хэсэг; хэрэгжүүлсэн endpoint биш.
- Өмнөх migration path утгыг өөрчлөхгүй. Бодит файлтай орчинд storage path-ийн хуучин суурийг нягталж байж шилжүүлнэ.
