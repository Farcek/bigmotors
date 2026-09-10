# Admin нэвтрэлт, хэрэглэгч ба ACL

- Огноо: 2026-09-10
- Төлөв: Аргачлал ба үндсэн хүрээ баталсан; каталогийн permission/scope matrix нээлттэй
- Үндэслэл: Chip CRM-ийн Userly аргачлалыг ижил ашиглах хэрэглэгчийн хүсэлт
- Холбоотой баримт: [ADR 0019](../adr/0019-use-userly-admin-authentication-and-acl.md), [Ашиглалтын шаардлага](../operations/userly-authentication.md), [Хүрээ](scope.md)

## Хариуцлагын зааг

| Хэсэг | Хариуцах систем |
| --- | --- |
| Account үүсгэх, урих, identity verification, нууц үг/reset | Userly |
| Tenant membership, resource access, role, permission, ACL policy | Userly |
| Access suspend/remove, эхний admin-ийн эрх олгох | Userly admin/operator |
| Login redirect/callback, memory token, logout, route/button guard | `sysop/app` |
| Token validation, action ACL, data scope, profile projection | `sysop/server` |
| Local profile persistence болон schema/migration | `packages/db`; login/password source биш |
| Typed admin API contract | `sysop/dti`; secret эсвэл DB runtime агуулахгүй |

BigMotors дотор local password login, user invitation, account suspend/remove, role/permission editor эсвэл full user-management screen хийхгүй. Userly console-оос хэрэглэгчийн эрхийг удирдана; BigMotors-оос console deep link/proxy invitation нэмэх бол тусад нь шийднэ.

## Нэвтрэх урсгал

1. Admin нээхэд valid memory token байхгүй бол Userly Authorization Code + PKCE login руу шилжинэ.
2. Callback/token validation амжилттай бол token-ийг зөвхөн memory-д хадгалж, API-д Bearer header-аар илгээнэ.
3. Backend token, active tenant/resource, action permission болон шаардлагатай data scope-г шалгана.
4. Эрхтэй identity-ийн `sub`-аар local profile-г data access-аас өмнө idempotent үүсгэх/шинэчлэх; profile байхгүйг invitation gate болгохгүй.
5. Зөвшөөрөгдсөн үйлдэл үргэлжилнэ. Identity/projection/ACL алдаатай бол каталогийн admin өгөгдөлд хандахгүй.
6. Reload, 15 минутын token expiry эсвэл token-related `401` үед нэг дахин нэвтрэлт эхэлнэ. Давталт үүсвэл signed-out/error төлөв харуулна; `403`-ийг login loop болгохгүй.
7. Logout memory auth state-г цэвэрлэж, тохируулсан бол Userly end-session руу шилжинэ.

## Дотоод profile

2026-09-10: [Admin profiles schema](../db/catalog-schema-proposal.md#admin-profiles) батлагдсан: id, unique userly_sub, nullable display_name/email, created_at/updated_at. Local metadata, scope mapping болон audit persistence-ийн нэмэлт бүтэц энэ баталгаанд ороогүй. Runtime integration хийгдээгүй.

- Local profile нь Userly account биш; identity cache болон дотоод reference байна. Userly stable `sub`-тай unique холбоно, email-г холбоосын key болгохгүй.
- Name/email зөвхөн баталгаажсан Userly identity-оос sync хийнэ. BigMotors-owned metadata байвал sync түүнийг дарж өөрчлөхгүй.
- Permission-тэй backend profile list/get/local metadata update боломжтой байна; яг action/талбарын жагсаалт тусдаа шийдэгдэнэ.
- Arbitrary Userly ID оруулаад account/profile үүсгэх public action байхгүй. Local profile state нь Userly access-г нээх эсвэл орлохгүй.
- Userly access цуцлахад түүхэн local reference-г устгахгүй. CRM-ийн owner/assignee, department, HR болон profile retention/purge module-г хуулж нэмэхгүй.

## Эрх шалгах зарчим

- Product, зураг, лавлах, нийтлэх/нуух/архивлах, төлөв солих болон бусад admin үйлдэл бүр сервер дээр permission шалгалттай байна. Нэвтэрсэн гэдгээр бүх эрх олгохгүй.
- `all`, `branch`, `own` scope resolve болон SQL enforcement аргачлалыг ADR 0019-өөр авсан. Ямар product/profile/lookup-д ямар scope хэрэглэх, `own`-ийг юугаар тогтоох, action permission code-уудыг дараа батална.
- Батлагдсан нийтлэх validation болон төлөв шилжилтийн дүрмийг permission хүчингүй болгохгүй. Permission нь үйлдэл хийх эрх, бизнес validation нь зөв өгөгдөл/шилжилтийг тус тус шалгана.
- ACL runtime metadata харах болон reload хийх нь ялгаатай эрхтэй. Recovery fallback зөвхөн reload хийх боломжтой; бизнесийн өгөгдөл болон Settings metadata харуулахгүй.
- Public website хэрэглэгчид admin нэвтрэлт шаардахгүй; өмнө баталсан public талбар, нийтлэлийн дүрэм хэвээр.

## Хүлээн авах шалгуур

1. Өөр tenant/client/resource-ийн token, invalid signature болон expired token-оор protected API ашиглаж чадахгүй.
2. Valid token боловч permission/scope байхгүй үед хандалт хаагдана; UI guard-ийг тойроод API шууд дуудах нь эрх нээхгүй.
3. Browser persistent storage-д access/ID token байхгүй; reload болон expiry үед нэг login flow, алдаа давтагдвал зогсоно.
4. Concurrent first authorized request нэг local profile үүсгэнэ. Identity мэдээлэл дутуу эсвэл profile үүсгэх алдаатай үед data service ажиллахгүй.
5. Snapshot refresh алдаатай ч valid memory/LKG cache байвал түүнийг ашиглана; stale/invalid cache эрх олгохгүй.
6. Reload-only default snapshot бизнес/admin data read/write grant өгөхгүй. Unknown role эсвэл invalid token-той actor reload хийж чадахгүй.
7. Reload success л cache-г солино; failure current valid cache-г устгахгүй. Reload audit-д raw token/snapshot орохгүй.
8. Scope шаардсан query-ийн client filter эрхийг өргөжүүлэхгүй; count/detail/write дээр ижил зааг үйлчилнэ.
9. Userly access удирдлага local profile update-ээр солигдохгүй; catalog public read нь Userly login руу шилжихгүй.

## Нээлттэй асуудал

- Каталогийн DTI action -> permission matrix; scope mapping болон local profile metadata/schema.
- Userly дээр олгох бодит role composition, admin/operator-ууд; application code role нэр hardcode хийхгүй.
- Runtime metadata/recovery дэлгэцийн эцсийн UI болон safe error text.
- Userly provisioning-ийн бодит утгууд, package/API нийцэл болон multi-instance deployment-ын техникийн нарийвчлал.

Энэ нь шаардлагын бүртгэл; ажилладаг login, Userly registration, account, ACL grant эсвэл DB schema үүсгээгүй.
