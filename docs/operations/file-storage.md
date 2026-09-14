# Файлын Хадгалалтын Тохиргоо

- Огноо: 2026-09-12
- Төлөв: Upload runtime болон path validation хэрэгжсэн. [ConfigFiles](../../packages/core/src/config.files.ts) environment утгыг уншина; [UploadStorage](../../sysop/server/src/files/upload-storage.ts) upload хийхэд тохиргоог шалгаж, хавтас үүсгэнэ. Бодит storage environment болон production volume тохируулаагүй.
- Үндсэн дүрэм: [Файл upload ба ашиглалт](../features/file-management.md)

## Root Ба Зам

- Суурь нь `ConfigFiles.FILES_ROOT`; repository root, `sysop/server` эсвэл terminal-ийн current directory биш. Энэ нь өмнөх repository-root-relative дүрмийг [ADR 0031](../adr/0031-use-files-root-for-storage-paths.md)-ээр орлоно.
- `FILES_UPLOADS` нь upload бичих disk хавтас. `files.file_path` нь эцсийн disk замыг **FILES_ROOT-оос харьцангуй** илэрхийлнэ; DB-д absolute path эсвэл public URL хадгалахгүй.
- Суурь тооцоо: `file_path = relative(FILES_ROOT, diskPath)`; унших/устгахдаа `diskPath = resolve(FILES_ROOT, file_path)`. DB-д separator-ийг `/` хэлбэрээр нэгтгэнэ.
- Жишээ: `FILES_ROOT=/files`, `FILES_UPLOADS=/files/uploads`, disk файл `/files/uploads/<generated-id>` бол DB file_path нь `uploads/<generated-id>`. `uploads` хэсгийг DB замаас хасахгүй; уншихдаа FILES_UPLOADS-тай дахин нийлүүлэхгүй.
- Local Windows жишээ: `FILES_ROOT=E:\bigmotors-data`, `FILES_UPLOADS=E:\bigmotors-data\uploads`, file_path `uploads/<generated-id>`. Төсөл хаана байгаагаас зам хамаарахгүй; энэ нь жишээ, бодит тохиргоо/хавтас үүсгээгүй.
- Path validation хэрэгжсэн: тохируулсан замууд тухайн OS-ийн absolute disk path байх; FILES_UPLOADS нь FILES_ROOT-ийн дэд хавтас байна, root-той ижил байж болохгүй. Харьцангуй эсвэл хоосон config-ийг cwd/repository руу тааж нөхөхгүй. Windows-д drive-тай absolute path тодорхой өгнө.
- Backend хадгалах нэрийг үүсгэнэ. Client/DB file_path-д absolute path, traversal болон root-оос гарах замыг зөвшөөрөхгүй. Resolve хийсний дараа storage хүрээнд үлдсэнийг шалгана; original_name-г зам болгохгүй. Symlink-ээр root/storage хүрээнээс гарахыг мөн зөвшөөрөхгүй. Энэ хамгаалалт нь файлын формат шалгах дүрэм биш.
- Container/build орчинд FILES_ROOT-ийг ил тод тохируулж, storage замд persistent volume холбоно. Өөр орчинд root солигдсон ч доторх харьцангуй бүтэц ижил бол DB file_path өөрчлөгдөхгүй.
- Өмнөх `0003_shared_files` migration замын утгыг өөрчлөхгүй, дискний файл зөөхгүй. Upload implementation хийхийн өмнө өмнөх өгөгдлийн замын суурийг шалгана; зөрвөл тусдаа шилжилт хэрэгтэй, автоматаар шинэ суурьтай гэж таахгүй.

## Одоогийн Config Код

| Утга | Кодын default | Үүрэг |
| --- | --- | --- |
| `FILES_ROOT` | `/files` | DB file_path-ийн суурь disk зам |
| `FILES_UPLOADS` | `/files/uploads` | Upload бичих disk хавтас |
| `FILE_UPLOAD_MAX_BYTES` | `20971520` | Нэг файлын byte хязгаар; ConfigFiles-аас DI-ээр авна, эерэг safe integer |

ConfigFiles constructor хоёр default-ийг тус тусад нь оноодог хэвээр. Зөвхөн FILES_ROOT солиход FILES_UPLOADS дагаж өөрчлөгдөхгүй; хоёуланг нь нийцүүлж өгнө. Absolute/containment болон symlink/junction-ийн хүрээг UploadStorage upload хийхээс өмнө шалгана. Constructor/import нь disk хавтас эсвэл DB холболт үүсгэхгүй.

`sysop/server/.env` эсвэл process environment-д Windows-ийн жишээ:

```dotenv
FILES_ROOT=E:/bigmotors-data
FILES_UPLOADS=E:/bigmotors-data/uploads
FILE_UPLOAD_MAX_BYTES=20971520
```

Жишээ тохиргоог [.env.example](../../sysop/server/.env.example)-д нэмсэн; хэрэглэгчийн `.env`-ийг өөрчлөөгүй. Backend хэрэглэгч storage-д бичих эрхтэй байна. Хэрэглэгчийн зөвшөөрлөөр upload нь production орчинд ч token шаардахгүй; орчны хоригийг авсан. Нийтэд нээлттэй бол хэн ч upload хийх боломжтой. Admin auth хэрэгжих үед upload/import эрхийг хамтад нь шийднэ.

Хэмжээний environment утга хоосон, 0/сөрөг, бутархай, тоо биш эсвэл safe integer-ээс их бол ConfigFiles алдаа өгнө; чимээгүй default авахгүй. Key огт байхгүй үед л default хэрэглэнэ. Тохиргоо сольсны дараа backend-ийг дахин асаана. DTI contract нь орчноос хамаарах maxBytes утга агуулахгүй; backend runtime-ийн ConfigFiles нь үндсэн эх сурвалж.

## Upload Хэрэгжүүлэлт

- Route: [POST /api/files/upload](../features/file-management.md#upload-route). `multer` 2.3.0, MIT лиценз; [Express-ийн баримт](https://expressjs.com/en/resources/middleware/multer/), [2026-08 security release](https://expressjs.com/en/blog/2026-08-31-security-releases/)-тэй тулгасан.
- Multer DiskStorage stream бичилт болон тасарсан upload-ийн file handle cleanup-г хариуцна. Шинэ request-owned private directory дотор UUID нэртэй файл бичнэ; extension хадгалахгүй. Original name нь UTF-8 metadata.
- FileService нь DB мөр, optional metadata normalization болон тодорхойгүй commit-ийн reconciliation-г хариуцна. Postgres INSERT амжилттай боловч response алдагдсан үед file ID-аар сэргээж үзнэ.
- Бичилт няцаагдсан нь тодорхой бол request-ийн directory-г хязгаарлагдсан retry-тай цэвэрлэнэ. Commit тодорхойгүй хэвээр бол disk файлыг хадгалж `file_upload_commit_uncertain` event + fileId логлоно. Цэвэрлэгээ бүтэлгүй бол `file_upload_cleanup_failed` + fileId логлоно. Дараа шалгахдаа ID-тай directory болон files мөрийг тулгана; логийн event нь retry queue биш.
- Backend runtime нь `0003_shared_files` хүртэлх schema шаарддаг. Энэ ажлаар шинэ migration үүсгээгүй, бодит DB-д migration ажиллуулаагүй.
- DB 79, server 69, DTI 55 тест тэнцсэн. HTTP → DI → PGlite + түр disk тест нь яг 20 MB/хэтрэлт, UTF-8 нэр, malformed/aborted upload, зэрэгцээ upload, metadata болон цэвэрлэгээг шалгана. Production disk, олон process-ийн filesystem race/permission, crash recovery болон backup/restore бүрэн шалгагдаагүй.

## Upload Хэмжээ Ба Алдаа

Нэг файлын хэмжээний үндсэн утга [feature дүрэмд](../features/file-management.md#upload) байна. Backend stream хүлээн авах явцад хязгаарлана. Proxy-ийн request limit нь multipart metadata/overhead-ийг тооцож, зөвшөөрөгдөх нэг файлыг хаахгүй байх ёстой; нийт request limit болон timeout-ийг transport сонгохдоо тогтооно.

Upload тасрах болон DB бүртгэл бүтэлгүйтэхэд дутуу файлыг цэвэрлэнэ. Commit-ийн дараах disk delete бүтэлгүйтвэл retry/reconciliation шаардлагатай. Энэ нь ашиглагдаагүй бүх файлыг автоматаар устгах cron биш.

## File Read

Sysop болон website-ийн нийтлэг URL нь `GET /files/:id/:originalName`; зөвхөн ID-аар DB бүртгэлийг олно. Нэр болон access шалгахгүй. Үндсэн contract, header болон үр дагавар нь [File Read Route](../features/file-management.md#file-read-route), шийдвэр нь [ADR 0032](../adr/0032-public-file-read-route.md)-д байна. Хоёр app-ийн GET/HEAD хэрэгжсэн; shared Node-only `@bigmotors/core/file-storage` нь path containment болон header дүрмийг эзэмшинэ.

Website-ийн `FILES_ROOT` нь sysop upload хийдэг ижил storage-г заана. Container-уудын зам өөр байж болно; файлын volume ижил байх ёстой. Website тал read-only mount ашиглана. Website өөрийн DBConfig/DI болон FileService-ээр шууд уншина; sysop API proxy эсвэл access шалгалт нэмээгүй. `FILES_UPLOADS` нь website read-д ашиглагдахгүй.

Sysop серверийн origin дээр `/files/...`-аар шууд уншина. Admin dev Vite `/files` proxy нь `http://127.0.0.1:64402` рүү дамжуулна; proxy тохиргоо ачаалагдаагүй бол dev app-ийг дахин асаана. Production reverse proxy мөн `/files`-ийг backend рүү дамжуулах шаардлагатай; Vite dev proxy нь production тохиргоо биш. FILES_ROOT доторх файлуудыг унших OS permission шаардлагатай, FILES_UPLOADS-тай дахин нийлүүлэхгүй.

Read-ийн HTTP тестүүд production DI, PGlite болон түр disk ашиглаж anonymous GET/HEAD, нэр үл тоох, upload → read byte хадгалалт, хоосон файл, 400/404/500, junction/traversal хамгаалалтыг шалгана. Upload-ийн production хоригийг авсны дараа anonymous upload болон content-type/metadata/хэмжээний validation-ийг production environment-д шалгана; live DB/storage-д хүрэхгүй.

Хоёр app ижил файлуудыг уншихын тулд ижил files бүртгэл болон тэдгээрийн file_path-д харгалзах storage-д хандана. Container доторх FILES_ROOT замууд өөр байж болох ч relative path нь ижил агуулгыг заана. Request-ийн originalName-г disk замд ашиглахгүй; root containment хамгаалалт хэвээр.

## Production-д Шийдэх Зүйл

Локал Docker Compose-д API read/write, Website read-only shared bind mount нэмсэн.
Зам, Linux permission болон production-ийн хязгаарлалтыг [Docker заавраас](docker.md) харна.

- Persistent volume болон олон instance-ийн ижил файлд хандах арга.
- DB metadata ба дискний файлыг хамтад нь backup/restore хийх төлөвлөгөө.
- Upload болон өөрчлөх/устгах эрхийн холболт; read нь public. Serve domain, response header болон cache тохиргоо.
- Disk багтаамж, permission, timeout, cleanup retry-ийн ажиллагаа.

Public read нь DB ID-аар файл олох route; бүх upload хавтсыг directory listing эсвэл disk path-аар шууд static нээх шийдвэр биш. Upload runtime хавтсыг шаардлагатай үед үүсгэнэ; одоогийн шалгалтууд зөвхөн түр storage ашигласан. Docker volume, хэрэглэгчийн environment болон бодит disk тохиргоог өөрчлөөгүй.
