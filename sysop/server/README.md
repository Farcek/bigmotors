# BigMotors sysop server

`@bigmotors/sysop-server`: admin backend-ийн Express + TypeScript суурь.

`/api/vehicles`: list/get/create/update, publish/hide/archive/restore нь [Vehicles handler](src/api/vehicles.ts) → DI → [VehicleService](../../packages/db/src/service/vehicle.ts)-ээр холбогдсон. Машин, gallery, тоноглол болон files.usage-г нэг transaction-д хадгална. [Endpoint, алдаа, transaction ба тестийн тайлбар](../../docs/operations/sysop-server.md#автомашины-api). Одоогийн түр auth/ACL bypass хэвээр; public production-д нээхгүй.

`GET /files/:id/:originalName` (мөн HEAD): public file read. `FileService.findById`-аар олж, FILES_ROOT + DB file_path-аас эх byte-уудыг stream хийнэ. URL-ийн нэр, нэвтрэлт, ACL, usage болон нийтлэлийн төлөв шалгахгүй; production дээр ч public. [Read contract болон response header](../../docs/features/file-management.md#file-read-route). Sysop app dev `/files` proxy нэмсэн; website route нь Next.js initialize хүртэл холбогдоогүй.

`POST /api/files/upload`: Multer multipart upload, нэг file 20 MB хүртэл, optional title/description; flat 201 response. [Route contract](../../docs/features/file-management.md#upload-route), [FILES_ROOT/FILES_UPLOADS тохиргоо](../../docs/operations/file-storage.md). FileService + UploadStorage DI ашиглана. Userly холболт хүртэл production орчинд route 503 буцаана; development bypass хэвээр. Usage sync, UI болон serve энэ endpoint-д орохгүй.

Repository root-оос `pnpm dev:server` ажиллуулна. Анхны хаяг `http://127.0.0.1:4000`; process health нь `/health` байна.

Ажиллуулах, build, тест болон хэрэгжээгүй хэсгийн заагийг [ашиглалтын заавар](../../docs/operations/sysop-server.md)-аас харна. DI container нь `ConfigSysop`, DB core/service module-уудыг бүртгэнэ. Өнгөний list/create/update/delete handler container-оос `ColorService` авна. Хэрэглэгчийн шийдвэрээр Userly/ACL-ийг түр алгассан: API нэвтрэлт шаардахгүй, зөвхөн хөгжүүлэлтийн орчинд ашиглана; production-д нээхгүй.

`test/colors-http.test.ts` нь HTTP → DTI → DI → ColorService → PGlite урсгалыг шалгана. Root-оос `pnpm test:server` ажиллуулна; бодит DB-д хүрэхгүй, шинэ migration үүсгэхгүй.

`src/api/branches.ts` нь компанийн салбарын list/create/update/delete-г `BranchService`-тэй DI-ээр холбоно. Endpoint нь `/api/branches`, `/api/branches/:id`; бүтээгдэхүүний байршилтай тусдаа. `test/branches-http.test.ts` нь CRUD, pagination/filter, validation, 404/409/500 болон машин/сэлбэг/дугуйн FK хамгаалалтыг HTTP түвшинд шалгана.

Үүнээс гадна [6 энгийн лавлах](../../docs/operations/db-schema.md#flat-reference-services) болон [4 эцэгтэй лавлах](../../docs/operations/db-schema.md#parent-reference-services)-ын service → DTI → API → DI холболт бэлэн. `test/references-http.test.ts`, `test/parent-references-http.test.ts` нь бодит HTTP + PGlite-ээр шалгана; production DB-д хүрэхгүй. Эцэгтэй лавлах үүсгэхэд өвгүүдийн идэвхтэй эсэхийг шалгана, PATCH-аар эцэг солихгүй.
