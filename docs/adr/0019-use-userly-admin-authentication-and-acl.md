# 0019: Admin нэвтрэлт, хэрэглэгчийн удирдлага, ACL-д Userly ашиглах

- Огноо: 2026-09-10
- Төлөв: Баталсан
- Үндэслэл: Хэрэглэгч `E:\projects\chip CRM\docs` дахь admin login, user management, ACL-ийн аргачлалыг BigMotors-д ижил ашиглахыг хүссэн
- Холбоотой баримт: [Admin authentication ба ACL](../features/admin-authentication-access.md), [Userly ашиглалтын шаардлага](../operations/userly-authentication.md), [TASK-03](../../docs.task.md#task-03-authenticationsession-техникийн-шийдэл)

## Нөхцөл байдал

BigMotors-ийн admin authentication/session сонголт өмнө нь батлагдаагүй. TASK-03 дахь Express server-side session, PostgreSQL session store, cookie болон `express-session` нь зөвхөн санал байсан. Хэрэглэгч Chip CRM-ийн батлагдсан Userly аргачлалыг сонгосноор тэр санал үйлчлэхгүй болсон.

Эх төслийн ажиллаж буй код эсвэл DRAFT workflow-г production-ready баталгаа гэж үзэхгүй. Accepted security ADR-ууд болон тэдгээрт нийцсэн module баримтуудыг үндэс болгосон. Энэ нь CRM-ийн Customers, Sales, Tasks, HR, retention/purge эсвэл бүрэн audit viewer-ийг BigMotors-д нэмэх шийдвэр биш.

## Харьцуулсан хувилбарууд

- Local user/password, session store, role/permission management: identity болон эрхийн удирдлагыг давхар хэрэгжүүлнэ; сонгоогүй.
- Userly + browser refresh token: refresh token rotation, persistent lifecycle шаардана; эх төсөлтэй адил хэрэглэхгүй.
- Userly OAuth 2.0 / OIDC Authorization Code + PKCE, memory-only access token, Userly ACL snapshot: хэрэглэгчийн хүссэн эх төслийн аргачлал; сонгосон.

## Шийдвэр

### Identity ба session

- Account, invitation, identity verification, tenant membership, password/reset, suspend/remove, role, permission, ACL policy-г Userly удирдана. BigMotors local access-policy source of truth эсвэл invitation lifecycle үүсгэхгүй.
- `sysop/app` нь public OAuth client, `sysop/server` нь API resource server байна. BigMotors-д тусдаа client, audience/resource болон тохирох tenant context бүртгэнэ; Chip CRM-ийн credential, resource ID эсвэл permission grant-ийг хуулж ашиглахгүй.
- Authorization Code + PKCE `S256`, random `state`/`nonce`, exact registered HTTPS redirect URI, `openid profile email` болон BigMotors API resource/audience хэрэглэнэ. Browser-д client secret байхгүй; token endpoint client authentication method `none` байна.
- Callback transaction/state/issuer-ийг шалгаж, code-г `code_verifier`-тай солино; авсан OIDC identity/ID token-ийн nonce болон claim-уудыг баталгаажуулсны дараа нэвтрэлтийг зөвшөөрнө. Протоколыг гараар дахин бичихгүй; тохирох бэлэн сангийн сонголт TASK-03-т үлдэнэ.
- Access token болон ID token зөвхөн browser memory-д байна. `localStorage`, `sessionStorage`, IndexedDB эсвэл JavaScript-accessible persistent cookie-д token хадгалахгүй. API-д `Authorization: Bearer <access_token>` дамжуулна.
- Access token TTL нь Userly client registration дээр 900 секунд. BigMotors DB/runtime дээр тусдаа TTL хөтлөхгүй. `offline_access`, refresh token, background refresh, silent iframe refresh ашиглахгүй.
- Reload, token expiry эсвэл token-related `401` үед нэг top-level login flow эхлүүлнэ; single-flight болон redirect-loop guard заавал байна. Дахин нэвтрэлт бүтэлгүйтвэл signed-out/error төлөв үзүүлнэ, давталтгүй байна.
- Logout нь memory token/auth state-г цэвэрлэнэ; Userly end-session endpoint тохируулсан бол тийш шилжинэ. Дахин нууц үг асуух эсэхийг Userly SSO session шийднэ.

### Серверийн хамгаалалт

- Хамгаалагдсан API хүсэлт бүрт discovery/JWKS-ээр signature, зөвшөөрсөн algorithm, `kid`, `typ`, `iss`, `aud`, `exp`, `nbf`, `client_id`, `sub`, `jti` болон tenant/resource/subject нийцлийг шалгана. Unknown signing key үед controlled JWKS refresh хийнэ.
- Token valid байх нь дангаараа эрх олгохгүй. Active Userly tenant/resource access болон шаардлагатай action permission, data scope-г давхар шалгана.
- Backend `userly-acl` evaluator ашиглана. DTI `action.name -> permission` mapping нь `sysop/server` дээр төвлөрч, service/data access-аас өмнө шалгагдана. Mapping байхгүй үйлдэл default-deny байна.
- UI route/button guard нь хэрэглэгчийн туршлагын давхарга; серверийн ACL-ийг орлохгүй. Role нэр, hardcoded admin эсвэл anonymous bypass ашиглахгүй.
- Production-д development header adapter auth-ийг орлуулахгүй. Raw token, code, verifier, state, nonce, secret, authorization header, snapshot-г log/response-д задруулахгүй.
- Invalid/expired token: `401`; permission байхгүй: `403`; valid ACL snapshot байхгүй: `503` default-deny. Business error-ийг `@napp/error` болон DTI contract-той холбоно; OAuth protocol error-оос ялгана. Эцсийн error identifier TASK-05-д үлдэнэ.

### Local profile

- Valid, authorized Userly identity-ийн `sub`-аар local admin profile-г data access-аас өмнө idempotent lazy create/upsert хийнэ. Verified name/email-г token claim эсвэл UserInfo identity projection-оос авна.
- Userly identity key нь required/unique; email-ээр account холбохгүй. Concurrent first request нэг profile үүсгэнэ. Identity мэдээлэл дутуу эсвэл projection алдаатай бол бизнес өгөгдөлд хандахгүй.
- Profile нь identity cache болон дотоод reference болохоос login/access gate биш. Userly sync нь зөвхөн identity-owned name/email-г шинэчилж, local metadata-г дарж өөрчлөхгүй.
- Local profile-ийг arbitrary Userly ID-гаар нийтэд нээлттэй create action-аас үүсгэхгүй. Access revoke/suspend Userly дээр явагдана; түүхэн reference-г хадгална.
- Profile list/get/local metadata update нь permission-protected backend боломж байна; Userly account/role management болон full local user-management screen хийхгүй. Profile-ийн DB нэр/талбар, metadata болон action catalog-ийг schema/contract боловсруулах үед нарийвчилна.

### Data scope

- Chip CRM-ийн `action permission AND data scope AND scoped query` аргачлалыг авна. Record scope шаардсан үйлдэлд `all`, `branch`, `own` read/write scope-г Userly snapshot-ээс сервер талд resolve хийнэ; олон grant байвал `all > branch > own` байна.
- Client-ийн filter нь эрхийн зааг биш. Scoped query-г SQL түвшинд count/pagination-аас өмнө хэрэглэж, client filter-тэй `AND` хослуулна; detail/write нь ID болон scope нөхцөлтэй байна. Scope-оос гадуурх record-ийн оршин байгааг задруулахгүй (`404`).
- Branch scope шаардсан үед actor-ийн салбар байхгүй бол `403`; write validation болон өөрчлөлт atomic query эсвэл нэг transaction дотор байна.
- Foundation/admin үйлдэлд тусдаа action permission хэрэглэж, business record scope-г сохроор хэрэглэхгүй.
- BigMotors-ийн product/lookup/profile бүрийн scope mapping, `own`-ийн утга, permission code болон actor-ийн салбарын холбоосыг тусад нь батална. CRM-ийн `crm.scope.*`, owner/assignee, department, sales workflow болон хүснэгтүүдийг автоматаар хуулж нэмэхгүй. Mapping тодорхойгүйг unrestricted grant гэж үзэхгүй.
- Public website-ийн нийтлэгдсэн каталог унших урсгалд admin login шаардахгүй. Website-ийн сервер талын DB public-data хязгаарлалт болон тусдаа DB role хэвээр.

### ACL snapshot

- Dev/test-д validated normalized JSON file source байж болно. Production-д Userly `/authz/snapshot` fetch, valid memory, cold start-д valid last-known-good disk, valid reload-only default file гэсэн дараалал хэрэглэнэ. Аль ч valid source байхгүй бол `503` default-deny.
- `issuedAt + maxAgeSeconds` freshness-г provider шалгана; evaluator дангаараа хангахгүй. Stale/expired snapshot metadata харагдаж болох ч permission evaluation-д ашиглахгүй. Token болон subject invalidation шалгалтыг fallback тойрохгүй.
- Version header, `ETag`/`If-None-Match` contract хэрэглэнэ. Validate хийсний дараа memory cache-г atomic swap, disk-г temporary file + atomic rename-аар шинэчилнэ. Fetch алдаа current valid cache-г устгахгүй; singleton provider, single-flight refresh/reload байна.
- Default file нь organization-specific, read-only deployment artifact; зөвхөн `userly_acl.snapshot.reload` grant агуулна. Business/data-scope, wildcard, Settings read эсвэл бусад admin grant агуулахгүй. Recovery нь эрх нээх биш canonical snapshot-г сэргээх ганц үйлдэл байна.
- Эх төслийнхтэй адил review хийсэн Userly Top role catalog-оос reload-only child role projection үүсгэнэ. Application role нэр hardcode хийхгүй; unknown role-д recovery grant олгохгүй.
- Artifact schema/compatibility version, tenant/resource, generation/expiry, source catalog hash болон checksum-г шалгана. Validity хамгийн ихдээ 365 хоног; invalid, mismatched, expired эсвэл unsafe/writable artifact ашиглахгүй. Reusable app image-д bake хийхгүй.
- `userlyAclSnapshotGet` нь `settings.read`, `userlyAclSnapshotReload` нь `userly_acl.snapshot.reload` permission шаардана. Reload-only fallback үед get/Settings хаалттай, recovery command л боломжтой байна.
- Manual reload process-level single-flight; нэг deployment дээр 30 секундэд нэгээс олон external reload fetch эхлүүлэхгүй. Success-ийн дараа л шинэ valid snapshot-г идэвхжүүлнэ; failure бизнесийн хандалтыг нээхгүй.
- Reload requested/succeeded/failed/rate-limited үр дүнг actor `sub`, request ID, safe source/version/reason, timestamp-тай append-only security audit-д хадгална. Энэ нь CRM-ийн бүрэн audit viewer/retention module-г импортлохгүй.
- Startup/periodic refresh нь manual reload-оос үл хамаарна. Runtime metadata нь safe status/source/version/time/error summary; raw snapshot эсвэл Userly config засах admin UI хийхгүй.

## Үр дагавар

- BigMotors өөрийн password/session store, role editor болон invitation lifecycle давхар хэрэгжүүлэхгүй; Userly provisioning болон ажиллагаанаас хамаарна.
- Browser reload/15 минутын expiry дээр redirect гарна. Logout/revoke нь өмнөх token-ийг бүх сервер дээр тэр даруй хүчингүй болгоно гэж амлахгүй; token expiry, snapshot freshness болон invalidation-ын хүрээнд хэрэгжинэ.
- Recovery artifact, cache freshness, safe metadata болон auth/ACL integration tests хэрэгтэй. Multi-instance cache/invalidation, deployment-wide rate limit coordination-г production топологитой хамт шийднэ; stale access эсвэл bypass-аар орлуулахгүй.
- Userly URL, client/tenant/resource, credential, package version, SDK API, exact config key болон business permission matrix одоогоор бүрдээгүй. Аргачлал батлагдсан нь хэрэгжүүлэлт дууссан гэсэн үг биш.

## Эх баримтууд

2026-09-10-нд `E:\projects\chip CRM\docs`-оос уншсан эхүүд. Доорх замууд нь тэр хавтаст харьцангуй; BigMotors runtime dependency биш.

- `decisions/security/ADR-0003-standard-oauth2-oidc-authentication.md`: Accepted login/token validation.
- `decisions/security/ADR-0020-use-access-token-only-spa-session.md`: Accepted session/TTL/logout.
- `decisions/security/ADR-0021-use-userly-managed-employee-admission.md`: Accepted user lifecycle/profile projection.
- `decisions/security/ADR-0017-userly-authorization-snapshot-cache-and-fallback.md`: Accepted cache/freshness/fallback.
- `decisions/security/ADR-0024-use-reload-only-default-acl-snapshot.md`: Accepted recovery artifact/reload.
- `modules/authentication-access.md`, `modules/employees.md`, `modules/settings.md`, `development/data-access-scope.md`: module boundary ба scope enforcement.
- `workflows/WF-001-userly-login-employee-projection.md`, `workflows/WF-010-userly-acl-snapshot-reload.md`: DRAFT тул Accepted ADR-уудаас давсан нэмэлт шийдвэрийг автоматаар аваагүй. Жишээ нь snapshot service-client authentication-ийн `private_key_jwt` сонголтыг зөвхөн draft урсгалаар эцэслээгүй.
