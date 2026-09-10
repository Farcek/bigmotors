# Userly нэвтрэлт ба ACL-ийн ашиглалтын шаардлага

- Огноо: 2026-09-10
- Төлөв: Аргачлал баталсан; бодит орчны тохиргоо хийгдээгүй
- Холбоотой баримт: [ADR 0019](../adr/0019-use-userly-admin-authentication-and-acl.md), [Admin урсгал](../features/admin-authentication-access.md)

## Орчин бэлтгэх

1. Userly дээр BigMotors sysop SPA public client, API audience/resource болон зөв tenant context бүртгэнэ. Chip CRM-ийн client/credential-г ашиглахгүй.
2. Client authentication `none`, PKCE `S256`, `openid profile email`, exact production HTTPS redirect URI, access token TTL 900 секунд, refresh token/`offline_access` ашиглахгүй байх тохиргоог шалгана.
3. Эхний admin-ийг Userly operator зөв membership/resource/permission-тэй болгоно. BigMotors bootstrap password, local invitation эсвэл bootstrap bypass endpoint хэрэггүй.
4. Backend discovery/JWKS болон snapshot endpoint-д хандах runtime тохиргоо, credential, cache path-уудыг орчны тохиргооноос өгнө. Browser bundle-д backend credential оруулахгүй.
5. BigMotors-ийн review хийсэн tenant/resource/Top role catalog-оос зөвхөн reload recovery grant бүхий default artifact үүсгэж, read-only mount хийнэ. Role өөрчлөгдөх, rollout эсвэл expiry-ээс өмнө дахин үүсгэнэ; хүчинтэй хугацаа 365 хоногоос ихгүй.
6. Process-д тусгаарласан memory cache, last-known-good disk cache-ийн бичих эрх, atomic update, startup/periodic refresh болон manual reload-ийг шалгана.

Бодит URL, tenant/client/resource ID, env key, credential, package version, artifact CLI болон ажиллуулах команд хараахан тогтоогүй. Эдгээрийг зохиож бичихгүй; runtime config validation-ийн нэг заагаар уншина. Эх төслийн `readRuntimeEnv`-тэй ижил үүрэгтэй байна, яг function name-г энд тогтоохгүй.

## Тохиргооны эзэмшил

- Issuer, discovery/JWKS, client, tenant, audience/resource, snapshot credential болон path нь deployment/runtime config; DB эсвэл admin Settings-ээс засахгүй.
- Refresh interval, fetch timeout, dev/test file, production default artifact болон LKG cache path-ууд мөн runtime config байна.
- Provider-ийн snapshot contract болон service-client authentication-ийн бодит аргыг хэрэгжүүлэхээс өмнө шалгана. DRAFT workflow дахь `private_key_jwt`-г дангаар нь эцэслэсэн шийдвэр гэж үзэхгүй.
- Multi-instance үед deployment-wide 30 секундийн reload rate limit, cache/invalidation болон single-flight coordination-ыг тусад нь тогтооно. Нэг process-ийн lock-ийг deployment-wide хамгаалалт гэж тайлагнахгүй.

## Ажиллагааг шалгах

- Safe runtime metadata: `fresh`, `cached`, `fallback`, `stale`, `unavailable`; source: `userly`, `memory`, `disk`, `default_file`.
- Metadata-д scope/resource, snapshot version, issued/loaded/expiry/last refresh time, safe error summary орж болно. Raw token, role/permission/policy catalog, snapshot JSON болон secret харуулахгүй.
- `userlyAclSnapshotGet` нь `settings.read`, reload нь `userly_acl.snapshot.reload` permission-тэй байна. Reload-only fallback үед metadata/get/Settings data хаалттай байна.
- Reload requested/succeeded/failed/rate-limited event-ийг append-only security audit-д хадгална. Audit persistence/schema-г `packages/db` болон logging task-тай уялдуулна; бүрэн audit viewer нэмэхгүй.

## Доголдлоос сэргээх

1. Fetch алдаа гарвал ADR 0019-ийн дарааллаар хүчинтэй memory/LKG/default source-г хэрэглэнэ. Expired cache-г хүчээр зөвшөөрөхгүй.
2. Reload-only default artifact active үед танигдсан, valid Userly actor зөвхөн canonical snapshot reload эхлүүлнэ. Invalid artifact эсвэл ямар ч valid source байхгүй бол `503` default-deny байна.
3. Provider сэрсний дараа automatic refresh эсвэл permission-тэй manual reload шинэ valid snapshot-г идэвхжүүлнэ. Failure үед business permission нэмэхгүй.
4. Recovery actor танигдахгүй бол operator config/artifact-ийг засна; hardcoded admin, anonymous endpoint эсвэл ACL bypass үүсгэхгүй.
5. Login/logout, single-flight/redirect-loop, invalid token, stale cache, tenant mismatch болон reload-only isolation-ыг integration тестээр баталгаажуулсны дараа production-ready гэж үзнэ.

Userly болон token expiry/snapshot invalidation-тай холбоотой revoke хоцролтыг тэг гэж амлахгүй. Production орчны бодит хугацаа, provider behavior болон доголдлын туршилтыг deployment үед баталгаажуулна.
