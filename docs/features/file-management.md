# Файл Upload Ба Ашиглах Дүрэм

- Огноо: 2026-09-12
- Төлөв: Upload, sysop/website public read route, disk хадгалалт, files бүртгэл, автомашины холбоос/usage transaction, [автомашины form дахь upload/select UI](admin-vehicles.md) болон алдааны нөхөн цэвэрлэгээ хэрэгжсэн. Бүх файлын нэгдсэн browser болон ерөнхий delete/retry урсгал хараахан хийгдээгүй.
- Хэрэглэгч: Admin; файл унших нь sysop болон public website дээр нэвтрэлт шаардахгүй.
- Холбоотой: [Files schema](../db/files.md), [Product images](../db/product-images.md), [Storage тохиргоо](../operations/file-storage.md), [ADR 0030](../adr/0030-unify-file-management.md)

Энэ нь зураг болон бусад бүх файлын upload, ашиглалт, холбоос салгах, устгах дүрмийн нэг үндсэн эх сурвалж. DB баримт нь schema/constraint, operations нь зам/хадгалалт/backup-ийн тохиргоог хариуцна.

## Upload

- Product үүсээгүй байсан ч файл upload хийж болно.
- Нэг файлын хэмжээ `ConfigFiles.FILE_UPLOAD_MAX_BYTES`-оос авна. `FILE_UPLOAD_MAX_BYTES` environment key-ийн default нь **20 MB** (`20 * 1024 * 1024 = 20,971,520 byte`); орчин тус бүрд byte-аар өөрчилж болно. Эерэг safe integer заавал байна. Яг тохируулсан хязгаартай тэнцүүг зөвшөөрч, түүнээс ихийг буцаана. Энэ нь нэг файлын хэмжээ, нийт файлын тооны хязгаар биш.
- Backend бодитоор хүлээн авч буй byte-ийн хэмжээг шалгана; frontend-ийн урьдчилсан шалгалт дангаараа хангалтгүй.
- Эх файлыг өөрчлөхгүй. Формат, MIME, өргөтгөл, decode болон браузер харуулж чадах эсэхийг шалгахгүй; хөрвүүлэхгүй. Зургийн тоог хязгаарлахгүй.
- Дискэнд системээс үүсгэсэн давхцахгүй нэрээр хадгална. Анхны нэрийг `original_name`-д хадгалж, зам үүсгэхэд шууд ашиглахгүй.
- `files.file_path`-ийг `ConfigFiles.FILES_ROOT`-оос харьцангуй тооцно; repository root эсвэл terminal-ийн хавтаснаас тооцохгүй. Upload бичих хавтас нь `ConfigFiles.FILES_UPLOADS`. Нарийвчлал [storage тохиргоонд](../operations/file-storage.md), шинэчилсэн шийдвэр [ADR 0031](../adr/0031-use-files-root-for-storage-paths.md).
- Файлыг бүрэн бичиж, `files` мөр амжилттай үүссэний дараа `file.id` буцаана. Шинэ файлын `usage=[]`; upload нь ашиглаж эхэлсэн гэсэн үг биш.
- Хэмжээ хэтрэх, upload тасрах, disk бичилт эсвэл DB insert алдахад дутуу файл/бүртгэлийн үлдэгдлийг нөхөн цэвэрлэнэ.

## Upload-ийн Дараалал

1. Backend тохируулсан storage зам болон metadata-ийн утгыг шалгана. Upload permission mapping, auth хараахан холбогдоогүй; хэрэглэгчийн шийдвэрээр upload нь бүх орчинд нэвтрэлтгүй. Admin auth нэмэх үед upload болон import job-ийн эрхийг хамтад нь шийднэ.
2. Backend file ID болон давхцахгүй хадгалалтын нэр үүсгэнэ. Client file ID, file_path, usage болон timestamps оноохгүй; original_name нь зөвхөн эх нэрийн metadata.
3. `FILES_UPLOADS` доторх системийн замд эх byte-уудыг stream-ээр бичиж, нэг файлын хэмжээний хязгаарыг хүлээн авах явцад хянана. Байгаа файлыг дарж бичихгүй.
4. Бичилт бүрэн дуусах хүртэл файл сонгох ID/URL буцаахгүй. Файлын нэрээр формат шалгах, decode/resize/convert хийхгүй.
5. Эцсийн disk замаас `FILES_ROOT`-д харьцангуй file_path тооцож, `files` мөр үүсгэнэ: original_name, optional title/description, usage хоосон array. Тухайн алхам product_images эсвэл product main/item холбоос үүсгэхгүй.
6. Файл ба DB мөр хоёул амжилттай болсон үед upload амжилттай хариулна. Form save хийх дараагийн үйлдэл холбоос/usage-г transaction-д шинэчилнэ.

Файлын хэмжээ хэтэрсэн, request тасарсан, metadata буруу, disk эсвэл DB алдаатай үед upload амжилтгүй байна. DB commit хийгдээгүй нь тодорхой үед энэ request-ийн үүсгэсэн файлыг нөхөн цэвэрлэнэ; өөр request-ийн файлд хүрэхгүй. Commit-ийн үр дүн тодорхойгүй үед file ID-аар DB төлөвийг нягталж байж цэвэрлэнэ. Commit амжилттай боловч response тасарсан бол бүртгэлтэй файлыг шууд устгахгүй; ашиглагдаагүй файлаар үлдэж болно.

## Upload Route

Доорх HTTP contract `sysop/server/src/api/files.ts`-д хэрэгжсэн. Multipart нь Multer 2.3.0 болон тусдаа Express route; JSON DTI envelope-ийг хэрэглэхгүй. Shared schema/төрөл `sysop/dti/src/file.ts`-д байна.

| Асуудал | Contract |
| --- | --- |
| Endpoint | `POST /api/files/upload`, `multipart/form-data` |
| Нэг хүсэлт | Нэг `file`; олон сонголттой UI файл бүрийг тусдаа хүсэлтээр upload хийнэ. Нийт бүтээгдэхүүний зургийн тоог хязгаарлахгүй |
| Metadata | `title`, `description` сонголттой; 255/512 тэмдэгт. Хоосон утгыг NULL болгоно |
| Амжилт | 201; file ID, originalName, title, description, createdAt, updatedAt. Дискний absolute path болон usage-г UI засах payload болгон буцаахгүй |
| Input алдаа | Файл дутуу/нэгээс олон, буруу metadata эсвэл зөвшөөрөөгүй нэмэлт field: 400 |
| Хэмжээ | Нэг файл хязгаараас их: 413. Request overhead-ийн тусдаа хязгаарыг transport-той хамт тогтооно |
| Storage алдаа | 500; дискний зам, DB connection болон дотоод алдааг response-д задруулахгүй |
| Давтан upload | Шинэ бүртгэл үүсгэнэ; агуулгаар deduplicate болон upload idempotency автоматаар нэмэхгүй |

### Request

```http
POST /api/files/upload
Content-Type: multipart/form-data; boundary=<browser-generated-boundary>
```

| Multipart field | Төрөл | Нөхцөл |
| --- | --- | --- |
| `file` | Binary file part | Яг нэг; ConfigFiles.FILE_UPLOAD_MAX_BYTES хүртэл, default 20 MB |
| `title` | Text part | Сонголттой, 255 тэмдэгт хүртэл |
| `description` | Text part | Сонголттой, 512 тэмдэгт хүртэл |

Query болон path parameter байхгүй. `productId`, `usage`, `filePath`, `id`, `createdAt`, `updatedAt` зэрэг нэмэлт оролт хүлээн авахгүй. Metadata field тус бүр нэгээс олон удаа ирвэл 400. Original name нь file part-ийн filename-аас авна; замын зориулалтаар ашиглахгүй. Metadata файлтайгаа нэг request-д байна, part-ийн дарааллаас хамаарахгүй; metadata сүүлд ирээд буруу байвал бичсэн файлыг цэвэрлэнэ.

Frontend `FormData` ашиглаж, Content-Type/boundary-г browser-оор үүсгүүлнэ; гараар boundary-гүй multipart header тавихгүй. JSON/base64 body энэ route-ийн transport биш. Multipart part-ийн MIME/өргөтгөлөөр файлыг зөвшөөрөх/хориглохгүй.

### Response

`201 Created`, `application/json`; дараах нь жишээ payload:

```json
{
  "id": "d61fc439-90f7-48dd-86e7-20ca3625a421",
  "originalName": "vehicle.jpg",
  "title": null,
  "description": null,
  "createdAt": "2026-09-12T08:00:00.000Z",
  "updatedAt": "2026-09-12T08:00:00.000Z"
}
```

`id` UUID; огноо ISO string; title/description nullable. Response нь дээрх шууд JSON object, нэмэлт data wrapper-гүй. Usage болон disk зам буцаахгүй. URL-ийг доорх File Read Route дүрмээр байгуулна; upload response-д URL талбар нэмэхгүй. Response төрлийг `sysop/dti`-д тодорхойлно; DB record-ийг бүхлээр нь serialize хийхгүй.

### Алдаа

Одоогийн Express error response-той ижил `{"error":{"code":"...","message":"..."}}` хэлбэр хэрэглэнэ. HTTP status ба code тогтвортой; message нь дотоод storage мэдээлэл агуулахгүй.

| HTTP | Code | Нөхцөл |
| --- | --- | --- |
| 400 | `FILE_UPLOAD_INVALID_INPUT` | Файл дутуу/нэгээс олон, metadata буруу, давхардсан/нэмэлт field, эвдэрсэн multipart |
| 413 | `FILE_UPLOAD_TOO_LARGE` | Файлын хэмжээ ConfigFiles.FILE_UPLOAD_MAX_BYTES-аас их; message нь тохируулсан byte хязгаарыг хэлнэ |
| 415 | `FILE_UPLOAD_UNSUPPORTED_MEDIA_TYPE` | Request нь multipart/form-data биш; энэ нь файлын MIME/форматын шалгалт биш |
| 500 | `FILE_UPLOAD_STORAGE_ERROR` | Disk бичилт эсвэл DB бүртгэлийн алдаа |

Userly нэвтрэлт/эрхийн шалгалт хараахан холбогдоогүй. Хэрэглэгчийн зөвшөөрлөөр `NODE_ENV=production` upload хоригийг авсан; одоогоор бүх орчинд anonymous upload зөвшөөрнө. Орчны flag/token шинээр нэмэхгүй. API нийтэд нээлттэй бол хэн ч upload хийх боломжтойг тооцно. Цаашид Admin auth-ийн 401/403 урсгалд import job-ийг хамтад нь холбоно. Request тасарсан үед response хүрэхгүй байж болох ч upload цэвэрлэгээний дүрэм хэвээр.

Хэрэгжүүлэлтийн нарийвчлал: 0 byte файл зөвшөөрнө; UUID нэртэй, extension-гүй эх файл нь request бүрийн шинэ private дэд хавтаст хадгалагдана. Анхны UTF-8 нэр originalName-д үлдэнэ. Өдрөөр ангилах/форматаар шүүхгүй. Нэг request-д file 1, text field 2; metadata part бүрийн byte limit 4096, field нэрийн limit 32, nested field зөвшөөрөхгүй. Энэ нь текстийн 255/512 тэмдэгтийн шалгалтыг орлохгүй.

## File Read Route

2026-09-12-нд баталсан; [ADR 0032](../adr/0032-public-file-read-route.md). Sysop endpoint нь [read.ts](../../sysop/server/src/files/read.ts)-д хэрэгжсэн; `FileService.findById`-г DI-ээр ашиглана. `sysop/app`-ийн Vite `/files` proxy backend рүү дамжуулна. Website-ийн Next.js GET/HEAD route default-д өөрийн DI/FileService-ээр уншина. `FILES_API_BASE_URL` тохируулсан үед Sysop руу stream proxy хийж, Website shared disk шаардлагагүй болно. Public URL/access дүрэм өөрчлөгдөхгүй. [Proxy тохиргоо](../operations/file-storage.md#website-proxy). Local болон Sysop read-ийн path/header дүрмийг `@bigmotors/core/file-storage` эзэмшинэ.

- Sysop болон website ижил `GET /files/:id/:originalName` route ашиглана; `/api` prefix-гүй. Domain нь тухайн app-ийн domain байна.
- `files` хүснэгтээс зөвхөн `id`-гаар бүртгэлийг олно.
- `originalName` нь URL-ийн нэрийн хэсэг төдий. DB дахь нэртэй тулгах, формат/өргөтгөл шалгах, зөрсөн нэрийг redirect хийхгүй. Нэр өөр байсан ч ижил ID нь ижил файлыг буцаана.
- URL байгуулахдаа эх нэрийг `encodeURIComponent(originalName)`-ээр encode хийнэ. Request-ийн нэрийг disk зам эсвэл файлын төрлийг шийдэхэд ашиглахгүй.
- Дискний замыг олдсон мөрийн `file_path` болон `FILES_ROOT`-оос тооцно. Storage хүрээнээс гарах зам болон symlink-ийг хориглох хамгаалалт хэвээр; энэ нь хэрэглэгчийн access шалгалт биш.
- Нэвтрэлт, token, ACL, signed URL, usage болон бүтээгдэхүүний нийтлэгдсэн эсэхийг шалгахгүй. URL-ийг мэдсэн хүн ноорог, нуусан эсвэл ашиглагдаагүй файлыг ч уншиж болно. Энэ нь файлын жагсаалт болон бүтээгдэхүүний мэдээллийг нийтэд нээх шийдвэр биш.
- Эх файлыг өөрчлөхгүй буцаана. Файлын бүртгэл эсвэл дискний файл байхгүй бол 404; дотоод disk замыг response-д задруулахгүй.
- Upload, metadata засах, холбоос/usage өөрчлөх болон устгах эрхийн дүрэм хэвээр байна. Public read шийдвэр нь эдгээр үйлдлийг нийтэд нээхгүй.

### Read Response

- GET нь эх byte-уудыг stream-ээр буцаана; HEAD нь ижил header-тай, body-гүй. UUID биш ID 400 `FILE_INVALID_ID`; байхгүй мөр, дискний файл эсвэл directory нь 404 `FILE_NOT_FOUND`. Дотоод алдаа 500, storage зам задруулахгүй.
- Одоогийн хэрэгжүүлэлт DB дахь original_name-ийн jpg/jpeg, png, gif, webp, avif, bmp, ico өргөтгөлд харгалзах image Content-Type өгч inline харуулна. Бусад формат, HTML/SVG нь `application/octet-stream` болон `Content-Disposition: attachment`-тай; татах нэрийг DB metadata-аас авна. Энэ нь byte/MIME validation биш, ямар ч файлыг форматаар хориглохгүй.
- Request-ийн originalName нь header болон disk path-д нөлөөлөхгүй. `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox; default-src 'none'` хэрэглэнэ. Одоогоор Range болон Last-Modified/conditional cache идэвхжүүлэхгүй.
- Read нь public хэвээр. Admin auth хэрэгжих үед `/files`-ийг authorization middleware-ээс гадуур байлгаж, upload API болон import job-ийн эрхийг тусад нь холбоно.

## Form Дээр Ашиглах

- Шинээр upload хийх эсвэл өмнөх файлыг сонгох нэг нийтлэг компонент ашиглана.
- Form хадгалах үед л тухайн хэрэглээний холбоос болон usage-г хамтад нь шинэчилнэ.
- Form цуцлахад өмнөх холбоосууд өөрчлөгдөхгүй. Шинээр upload хийсэн файл ашиглагдаагүй хэвээр үлдэнэ.
- Frontend нь file ID дамжуулна; `file_path` эсвэл usage array-г шууд засахгүй. Backend хандах эрх болон холбоосын өөрчлөлтийг хариуцна.
- Файлын URL нь `/files/:id/:originalName`; frontend дискний замаар URL байгуулахгүй. Файл унших нь public байна.

## Usage

- Ашиглагч өөрийгөө төлөөлөх тогтвортой UUID key өгнө. Каталогийн хувьд энэ нь `product.id`; бусад ашиглагч өөрийн UUID key-г хэрэглэнэ.
- Ашиглаж эхлэхэд key нэмнэ, ашиглахаа бүрэн болиход хасна. Нэг key давхар орохгүй; давтан нэмэх/хасахад ижил үр дүнтэй байна.
- Main, item, gallery-д нэг файлыг зэрэг ашиглавал product ID нэг удаа орно. Тухайн product-ийн хамгийн сүүлийн холбоос салсны дараа л key-г хасна.
- Бодит холбоос ба usage өөрчлөлт нэг DB transaction-д хийгдэнэ. Нэг ашиглагчийн зэрэгцээ өөрчлөлтийг serialize хийж, usage-г atomic SQL-аар шинэчилнэ; өмнө уншсан array-г бүхлээр нь дарж бичихгүй.
- Өөр ашиглагчийн key-г хасахгүй. Usage нь тоолуур, FK эсвэл ACL биш.

Автомашины create/update дээр эдгээр дүрэм [VehicleService](../../packages/db/src/service/vehicle.ts)-д хэрэгжсэн. Archive/hide нь холбоос салгахгүй тул usage хэвээр. Сэлбэг/дугуй болон ерөнхий хэрэглээний sync service/trigger хараахан нэмээгүй; шууд SQL-аар холбоос засахад usage автоматаар sync болохгүй.

## Засах Ба Устгах

- `title` (255), `description` (512) нь сонголттой, засаж болно. Нийтлэг file metadata учраас бүх хэрэглээнд өөрчлөгдөнө.
- Файлын агуулгыг дарж солихгүй. Солихдоо шинэ файл upload хийж, холбоосыг transaction-д шинэчилнэ.
- Холбоос салгах нь файлыг устгах үйлдэл биш. Өөр холбоос үлдвэл usage-г хадгална.
- Файл устгах нь usage хоосон, бодит холбоосгүй үед л зөвшөөрөгдөнө. DB guard/FK-уудыг урьдчилсан шалгалтаар орлуулахгүй.
- Files мөрийг transaction-д устгаж commit хийсний дараа disk файлыг устгана. Disk delete алдахад дахин оролдох/нөхөн цэвэрлэх шаардлагатай; бүрэн амжилттай гэж тайлагнахгүй.
- Нийтлэгдсэн product-ийн main зураг заавал байх дүрэм хэвээр.
- Эхний хувилбарт ашиглагдаагүй файлыг автоматаар устгахгүй. Admin баталгаажуулж гараар устгана.

## Хэрэгжүүлэлтийн Зааг

| Хэсэг | Үүрэг |
| --- | --- |
| `packages/db` | Files бүртгэл, metadata, usage ажиллагаа болон хэрэглээний холбоостой хамтарсан transaction |
| `sysop/server` | Upload, disk бичих/устгах, public file read; өөрчлөх үйлдлийн хандах эрх |
| `web/website` | Sysop-той ижил URL болон дүрэмтэй public file read |
| `sysop/dti` | Admin файлын response/error төрөл; multipart request-ийн contract |
| `sysop/app` | Нийтлэг upload/select компонент, form save/cancel урсгал |

`FileService.createUploadedFile`, `FileService.findById`, `UploadStorage`, multipart upload, sysop/website public read болон DI холболт бэлэн. Upload нь usage-г зөвхөн хоосон default-оор үүсгэнэ; автомашины save/холбоос/usage sync нь VehicleService/backend API-д хэрэгжсэн. Автомашины form upload, metadata оруулах, холбоотой файлаа main/item/gallery-д сонгох UI бэлэн. Metadata edit, file delete, нэгдсэн file browser хийгдээгүй. Нийтлэх үеийн бүтээгдэхүүний дүрэм, main/item fallback болон gallery дарааллыг [product images](../db/product-images.md)-ээс баримтална.

## Хүлээн Авах Шалгуур

1. Хязгаартай тэнцүү файл upload хийнэ; нэг byte-аар хэтэрснийг backend буцааж, дутуу файлыг цэвэрлэнэ.
2. Дурын форматтай файлыг эх byte-аар хадгалж, анхны нэрийг metadata-д үлдээнэ.
3. Ижил `FILES_ROOT`/`FILES_UPLOADS` тохиргоотой үед repository root болон `sysop/server` хавтаснаас ажиллуулахад ижил файл руу хандана; FILES_ROOT/storage хүрээнээс гарсан замыг зөвшөөрөхгүй.
4. Form цуцлахад холбоос өөрчлөгдөхгүй; амжилттай хадгалахад холбоос/usage хамт шинэчлэгдэнэ, алдахад хоёул буцна.
5. Main/item/gallery нэг файл ашиглах, хэсэгчилж салгах, хоёр product хамтран ашиглах болон давтан хүсэлтэд usage зөв байна.
6. Ашиглагдсан файл устахгүй; ашиглагдаагүй файл зөвхөн explicit delete-ээр устна. Disk алдааны үлдэгдлийг илрүүлэх/цэвэрлэх боломжтой байна.
7. Sysop болон website дээр нэвтрээгүй хүсэлт ижил ID-тай файлыг уншина. Original name өөрчлөгдсөн ч ижил эх byte буцаана; usage болон бүтээгдэхүүний төлөв нөлөөлөхгүй.
8. Байхгүй бүртгэл/дискний файл 404 буцаана; URL-ийн нэрээр өөр disk файл нээхгүй, storage хүрээнээс гарахгүй.

## Нээлттэй Асуултууд

- Upload болон өөрчлөх/устгах үйлдлийн permission mapping; read нь public гэж батлагдсан.
- Production serve domain/cache-ийн нэмэлт хэрэгцээ; одоогийн хамгаалсан response header дээрх Read Response хэсэгт байна.
- Нэгдсэн file browser, сэлбэг/дугуй болон бусад хэрэглээний холбоос/usage CRUD. Автомашины form upload/select UI болон website read хэрэгжсэн.
- Production persistent volume, backup/restore болон disk cleanup retry-ийн бодит механизм.
