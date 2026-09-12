# Admin тохиргоо

Хэрэгжүүлсэн: 2026-09-13. `/settings` route, sidebar-ийн Тохиргоо menu идэвхтэй.

## Тохиргооны талбарууд

Эх сурвалж: `packages/core/src/settings.ts`; constant нэр болон key-г хэрэглэгчийн өгсөн хэвээр хадгалсан.

| Constant | Key | UI |
| --- | --- | --- |
| SETTINGS_KEY_SITE_TITLE | siteTitle | Сайтын гарчиг, text input |
| SETTINGS_KEY_ADMINEMAIL | adminEmail | Админы имэйл, email input |

- Бүгд optional; key байхгүй бол хоосон харагдана. Хадгалах үед хоосолсон талбар value="" болно.
- Нэг save хүсэлт зөвхөн эдгээр хоёр key-г явуулна. Дурын key нэмэх/устгах ерөнхий editor UI байхгүй.
- UI имэйлийн хэлбэр, 255 тэмдэгтийн хязгаарыг шалгана. API нь эдгээр key-д тусгай утгын validation хийхгүй.
- 2026-09-13: `homepage` тохиргоог хэрэглэхээ больсон. Core constant, нүүр хуудас сонгох талбар, Page жагсаалт ачаалах болон validation холболтыг арилгасан. DB-д хуучин key үлдсэн ч admin унших/хадгалахгүй, website ашиглахгүй.
- Mantine useForm, нэг PageBody, refresh, буцаах, хадгалах, loading/error/success төлөвтэй. Шинэ cache эсвэл custom CSS нэмээгүй.

## Dynamic API

`Settings` DTI namespace, `SettingsService` DI. Prefix `/api`.

| Method | Route | Үйлдэл |
| --- | --- | --- |
| GET | /settings | key exact filter, search key, limit/offset |
| GET | /settings/:key | Нэг key унших |
| POST | /settings | {key,value} нэмэх; давхардвал 409 |
| PATCH | /settings/:key | {value} шинэчлэх; байхгүй бол 404 |
| DELETE | /settings/:key | Устгах; байхгүй бол 404 |
| PUT | /settings | {entries:[{key,value}]} upsert; ороогүй key-г устгахгүй |

Path дахь key-г URL encode хийнэ. Unicode, зай, slash зэрэг тэмдэгттэй key боломжтой. key/value maximum 255; value null биш string. Алдаа 400/404/409/500 нь нийтлэг sanitized хэлбэртэй.

## Хамрахгүй

- Website `/` нь өөрийн нүүр хуудас; Page module болон settings-ээс хамаарахгүй. `/:slug` нь Page module-той хэвээр холбогдоно. [Website routing](website-routing.md).
- siteTitle-г metadata-д хэрэглэх, adminEmail-р захиа илгээх холболт тусдаа.
- Нэвтрэлт/ACL-ийн одоогийн бодлогыг өөрчлөөгүй. Нийтэд бүх тохиргоог задлах public endpoint үүсгээгүй. Нууц түлхүүр/password хадгалах зориулалттай secret store биш.

[DB schema](../db/settings.md).
