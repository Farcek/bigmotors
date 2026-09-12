# 0030: Файлын Upload Ба Ашиглалтыг Нэгтгэх

- Огноо: 2026-09-12
- Төлөв: Хэсэгчлэн орлуулсан; замын repository root суурийг [ADR 0031](0031-use-files-root-for-storage-paths.md)-ээр FILES_ROOT болгосон. Доорх нь анхны шийдвэрийн түүх; бусад lifecycle хэвээр.
- Холбоотой: [Нэгдсэн дүрэм](../features/file-management.md), [Storage](../operations/file-storage.md), [Files](../db/files.md), [ADR 0029](0029-use-shared-files.md)

## Нөхцөл Байдал

Нэгдсэн files хүснэгтийг бүх хэсэг ижил зарчмаар ашиглах шаардлагатай. Хэрэглэгч upload/ашиглах/устгах саналыг баталж, нэг файл 20 MB, хадгалах замыг repository root-оос тооцохоор тогтоосон.

## Харьцуулсан Хувилбарууд

- Form бүрд upload/usage/устгалын өөр логик: холбоос, usage болон файл зөрөх эрсдэлтэй.
- Нэгдсэн дүрэм, shared DB ажиллагаа, backend disk удирдлага болон нийтлэг UI компонент: бүх хэрэглээнд ижил lifecycle мөрдөнө.

## Шийдвэр

Хоёр дахь хувилбар. Upload, хэрэглээнд холбох, холбоос салгах болон файл устгах нь тусдаа үйлдэл. Нарийвчилсан дүрмийн цорын ганц үндсэн эх сурвалж нь feature баримт; schema/constraint DB баримтад, орчны тохиргоо operations-д байна.

Нэг файл 20 MB; byte утгыг feature баримтад тодорхойлов. Замын суурь нь `bm-website` repository root, terminal-ийн current directory биш. Энэ нь ADR 0029-тэй холбоотой DB баримтын өмнөх upload-root-relative path дүрмийг орлоно; бусад schema шийдвэр хэвээр.

## Үр Дагавар

- Frontend usage-г шууд засахгүй; form save нь backend-ийн нэг transaction-аар холбоос/usage шинэчилнэ.
- Файлын агуулгыг дарж солихгүй; шинэ upload ба холбоос солих зарчим хэрэглэнэ.
- Ашиглагдаагүй файлыг эхний хувилбарт автоматаар устгахгүй.
- Upload/serve tooling, public/private access болон production storage/retry-ийн нарийвчлал тусдаа хэвээр.
- Энэ нь баримтын баталгаа; upload код, API, disk хавтас болон шинэ migration үүсгэх шийдвэр биш.
