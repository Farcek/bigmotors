# Файл Upload Ба Ашиглах Дүрэм

- Огноо: 2026-09-12
- Төлөв: Баталсан; upload, usage CRUD, serve болон cleanup хэрэгжүүлэлт хараахан хийгдээгүй.
- Хэрэглэгч: Admin; public website нь зөвшөөрөгдсөн файлыг харуулах/татах хэрэглэгч.
- Холбоотой: [Files schema](../db/files.md), [Product images](../db/product-images.md), [Storage тохиргоо](../operations/file-storage.md), [ADR 0030](../adr/0030-unify-file-management.md)

Энэ нь зураг болон бусад бүх файлын upload, ашиглалт, холбоос салгах, устгах дүрмийн нэг үндсэн эх сурвалж. DB баримт нь schema/constraint, operations нь зам/хадгалалт/backup-ийн тохиргоог хариуцна.

## Upload

- Product үүсээгүй байсан ч файл upload хийж болно.
- Нэг файл хамгийн ихдээ **20 MB**. Хэрэгжүүлэлтэд `20 * 1024 * 1024 = 20,971,520 byte` хэрэглэнэ; яг хязгаартай тэнцүүг зөвшөөрч, түүнээс ихийг буцаана. Энэ нь нэг файлын хэмжээ, нийт файлын тооны хязгаар биш.
- Backend бодитоор хүлээн авч буй byte-ийн хэмжээг шалгана; frontend-ийн урьдчилсан шалгалт дангаараа хангалтгүй.
- Эх файлыг өөрчлөхгүй. Формат, MIME, өргөтгөл, decode болон браузер харуулж чадах эсэхийг шалгахгүй; хөрвүүлэхгүй. Зургийн тоог хязгаарлахгүй.
- Дискэнд системээс үүсгэсэн давхцахгүй нэрээр хадгална. Анхны нэрийг `original_name`-д хадгалж, зам үүсгэхэд шууд ашиглахгүй.
- `files.file_path`-ийг `ConfigFiles.FILES_ROOT`-оос харьцангуй тооцно; repository root эсвэл terminal-ийн хавтаснаас тооцохгүй. Upload бичих хавтас нь `ConfigFiles.FILES_UPLOADS`. Нарийвчлал [storage тохиргоонд](../operations/file-storage.md), шинэчилсэн шийдвэр [ADR 0031](../adr/0031-use-files-root-for-storage-paths.md).
- Файлыг бүрэн бичиж, `files` мөр амжилттай үүссэний дараа `file.id` буцаана. Шинэ файлын `usage=[]`; upload нь ашиглаж эхэлсэн гэсэн үг биш.
- Хэмжээ хэтрэх, upload тасрах, disk бичилт эсвэл DB insert алдахад дутуу файл/бүртгэлийн үлдэгдлийг нөхөн цэвэрлэнэ.

## Upload-ийн Дараалал

1. Backend request-ийн upload эрх, тохируулсан storage зам болон metadata-ийн утгыг шалгана. Public/private болон permission mapping хараахан тогтоогүй; одоогийн түр ACL bypass-ийг production зөвшөөрөл гэж үзэхгүй.
2. Backend file ID болон давхцахгүй хадгалалтын нэр үүсгэнэ. Client file ID, file_path, usage болон timestamps оноохгүй; original_name нь зөвхөн эх нэрийн metadata.
3. `FILES_UPLOADS` доторх системийн замд эх byte-уудыг stream-ээр бичиж, нэг файлын хэмжээний хязгаарыг хүлээн авах явцад хянана. Байгаа файлыг дарж бичихгүй.
4. Бичилт бүрэн дуусах хүртэл файл сонгох ID/URL буцаахгүй. Файлын нэрээр формат шалгах, decode/resize/convert хийхгүй.
5. Эцсийн disk замаас `FILES_ROOT`-д харьцангуй file_path тооцож, `files` мөр үүсгэнэ: original_name, optional title/description, usage хоосон array. Тухайн алхам product_images эсвэл product main/item холбоос үүсгэхгүй.
6. Файл ба DB мөр хоёул амжилттай болсон үед upload амжилттай хариулна. Form save хийх дараагийн үйлдэл холбоос/usage-г transaction-д шинэчилнэ.

Файлын хэмжээ хэтэрсэн, request тасарсан, metadata буруу, disk эсвэл DB алдаатай үед upload амжилтгүй байна. DB commit хийгдээгүй нь тодорхой үед энэ request-ийн үүсгэсэн файлыг нөхөн цэвэрлэнэ; өөр request-ийн файлд хүрэхгүй. Commit-ийн үр дүн тодорхойгүй үед file ID-аар DB төлөвийг нягталж байж цэвэрлэнэ. Commit амжилттай боловч response тасарсан бол бүртгэлтэй файлыг шууд устгахгүй; ашиглагдаагүй файлаар үлдэж болно.

## Upload Route

Хэрэглэгчийн route тодорхойлох хүсэлтийн дагуу доорх HTTP contract-ийг тогтоов. Энэ нь хэрэгжсэн endpoint биш; multipart сан болон DTI adapter-ийн нарийвчлал тусдаа.

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
| `file` | Binary file part | Яг нэг; 20 MB хүртэл |
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

`id` UUID; огноо ISO string; title/description nullable. Response нь дээрх шууд JSON object, нэмэлт data wrapper-гүй. Usage болон disk зам буцаахгүй. Serve route/access одоогоор тусдаа учраас download URL зохиож нэмэхгүй. Response төрлийг `sysop/dti`-д тодорхойлно; DB record-ийг бүхлээр нь serialize хийхгүй.

### Алдаа

Одоогийн Express error response-той ижил `{"error":{"code":"...","message":"..."}}` хэлбэр хэрэглэнэ. HTTP status ба code тогтвортой; message нь дотоод storage мэдээлэл агуулахгүй.

| HTTP | Code | Нөхцөл |
| --- | --- | --- |
| 400 | `FILE_UPLOAD_INVALID_INPUT` | Файл дутуу/нэгээс олон, metadata буруу, давхардсан/нэмэлт field, эвдэрсэн multipart |
| 413 | `FILE_UPLOAD_TOO_LARGE` | Файлын хэмжээ 20,971,520 byte-аас их |
| 415 | `FILE_UPLOAD_UNSUPPORTED_MEDIA_TYPE` | Request нь multipart/form-data биш; энэ нь файлын MIME/форматын шалгалт биш |
| 500 | `FILE_UPLOAD_STORAGE_ERROR` | Disk бичилт эсвэл DB бүртгэлийн алдаа |

Production-д admin нэвтрэлт/эрхийн шалгалтын 401/403 урсгал үйлчилнэ; одоогийн bypass-ийг permanent public upload болгож батлаагүй. Request тасарсан үед response хүрэхгүй байж болох ч upload цэвэрлэгээний дүрэм хэвээр.

Сангийн сонголт, empty file, хадгалалтын нэрэнд extension үлдээх эсэх, өдрөөр дэд хавтас үүсгэх эсэхийг implementation хийхээс өмнө нарийвчилна. Эдгээр нь файлын форматыг зөвшөөрөх жагсаалт үүсгэх үндэслэл болохгүй.

## Form Дээр Ашиглах

- Шинээр upload хийх эсвэл өмнөх файлыг сонгох нэг нийтлэг компонент ашиглана.
- Form хадгалах үед л тухайн хэрэглээний холбоос болон usage-г хамтад нь шинэчилнэ.
- Form цуцлахад өмнөх холбоосууд өөрчлөгдөхгүй. Шинээр upload хийсэн файл ашиглагдаагүй хэвээр үлдэнэ.
- Frontend нь file ID дамжуулна; `file_path` эсвэл usage array-г шууд засахгүй. Backend хандах эрх болон холбоосын өөрчлөлтийг хариуцна.
- Файлын URL нь ID-д суурилсан байна; frontend дискний замаар URL байгуулахгүй. URL байгаа нь public access зөвшөөрөгдсөн гэсэн үг биш.

## Usage

- Ашиглагч өөрийгөө төлөөлөх тогтвортой UUID key өгнө. Каталогийн хувьд энэ нь `product.id`; бусад ашиглагч өөрийн UUID key-г хэрэглэнэ.
- Ашиглаж эхлэхэд key нэмнэ, ашиглахаа бүрэн болиход хасна. Нэг key давхар орохгүй; давтан нэмэх/хасахад ижил үр дүнтэй байна.
- Main, item, gallery-д нэг файлыг зэрэг ашиглавал product ID нэг удаа орно. Тухайн product-ийн хамгийн сүүлийн холбоос салсны дараа л key-г хасна.
- Бодит холбоос ба usage өөрчлөлт нэг DB transaction-д хийгдэнэ. Нэг ашиглагчийн зэрэгцээ өөрчлөлтийг serialize хийж, usage-г atomic SQL-аар шинэчилнэ; өмнө уншсан array-г бүхлээр нь дарж бичихгүй.
- Өөр ашиглагчийн key-г хасахгүй. Usage нь тоолуур, FK эсвэл ACL биш.

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
| `sysop/server` | Upload, disk бичих/устгах, file URL/serve болон хандах эрх |
| `sysop/dti` | Admin файлын response/error төрөл; multipart request-ийн contract |
| `sysop/app` | Нийтлэг upload/select компонент, form save/cancel урсгал |

Schema/guard байгаа нь эдгээр service, API болон UI хэрэгжсэн гэсэн үг биш. Нийтлэх үеийн бүтээгдэхүүний дүрэм, main/item fallback болон gallery дарааллыг [product images](../db/product-images.md)-ээс баримтална.

## Хүлээн Авах Шалгуур

1. Хязгаартай тэнцүү файл upload хийнэ; нэг byte-аар хэтэрснийг backend буцааж, дутуу файлыг цэвэрлэнэ.
2. Дурын форматтай файлыг эх byte-аар хадгалж, анхны нэрийг metadata-д үлдээнэ.
3. Ижил `FILES_ROOT`/`FILES_UPLOADS` тохиргоотой үед repository root болон `sysop/server` хавтаснаас ажиллуулахад ижил файл руу хандана; FILES_ROOT/storage хүрээнээс гарсан замыг зөвшөөрөхгүй.
4. Form цуцлахад холбоос өөрчлөгдөхгүй; амжилттай хадгалахад холбоос/usage хамт шинэчлэгдэнэ, алдахад хоёул буцна.
5. Main/item/gallery нэг файл ашиглах, хэсэгчилж салгах, хоёр product хамтран ашиглах болон давтан хүсэлтэд usage зөв байна.
6. Ашиглагдсан файл устахгүй; ашиглагдаагүй файл зөвхөн explicit delete-ээр устна. Disk алдааны үлдэгдлийг илрүүлэх/цэвэрлэх боломжтой байна.

## Нээлттэй Асуултууд

- Public/private хандалт болон upload/serve permission-ийн нарийвчлал.
- Multipart upload сан/DTI adapter, empty file, хадгалах нэр/дэд хавтасны загвар. Route нь дээрх contract-аар тодорхой болсон; тохиргооны нэр FILES_ROOT, FILES_UPLOADS гэж кодод байна.
- Production persistent volume, backup/restore болон disk cleanup retry-ийн бодит механизм.
