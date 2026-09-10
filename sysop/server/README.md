# BigMotors sysop server

`@bigmotors/sysop-server`: admin backend-ийн Express + TypeScript суурь.

Repository root-оос `pnpm dev:server` ажиллуулна. Анхны хаяг `http://127.0.0.1:4000`; process health нь `/health` байна.

Ажиллуулах, build, тест болон хэрэгжээгүй хэсгийн заагийг [ашиглалтын заавар](../../docs/operations/sysop-server.md)-аас харна. DI container нь `ConfigSysop`, DB core/service module-уудыг бүртгэнэ. Өнгөний list/create/update/delete handler container-оос `ColorService` авна. Хэрэглэгчийн шийдвэрээр Userly/ACL-ийг түр алгассан: API нэвтрэлт шаардахгүй, зөвхөн хөгжүүлэлтийн орчинд ашиглана; production-д нээхгүй.

`test/colors-http.test.ts` нь HTTP → DTI → DI → ColorService → PGlite урсгалыг шалгана. Root-оос `pnpm test:server` ажиллуулна; бодит DB-д хүрэхгүй, шинэ migration үүсгэхгүй.
