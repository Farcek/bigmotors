# Admin: Нүүр хуудасны бүтээгдэхүүний бүлэг

- Огноо: 2026-09-13. Хэрэглэгч Website → Нүүр хуудас цэс, tab-тай хуудас болон `home_product_group` удирдлагыг баталсан.
- Route: `/website/home`. Эхний tab: Бүтээгдэхүүний бүлэг. Бусад tab-ийг шаардлага батлагдах үед нэмнэ.
- Gallery, Page, тохиргооны одоогийн route болон цэсийг өөрчлөөгүй.
- DB бүтэц: [home_product_group](../db/home-product-group.md).

## Боломж

- Гарчиг, тайлбар, зураг, дараалал, идэвхтэй эсэх, хайлтын нөхцөлөөр бүлэг үүсгэх/засах/устгах.
- Зургийг одоогийн FileUploadDialog-оор upload хийж, солих эсвэл бүлгээс хасаж болно. UUID-г гараар оруулахгүй. Зураггүй бүлэг хадгалж болно.
- Нөхцөлүүд: марк, загвар, хувилбар, кузов, гадна өнгө, шинэ/хуучин, түлш, хурдны хайрцаг, хөтлөгч, жолооны байрлал, хөдөлгүүр/гүйлт/он/үнийн доод ба дээд утга.
- Нөхцөлүүд AND холбоотой. `{}` бол бүх автомашин. Марк солиход загвар/хувилбар, загвар солиход хувилбар цэвэрлэгдэнэ.
- Admin нь JSON editor биш Mantine select, numeric input ашиглана. Form болон payload дахь filter утгууд string байна. Хоосон/зөвхөн зайтай нөхцөлийг хасна, `"0"`-г хадгална.
- `@bigmotors/core`-ийн `VehicleSearchParams` нь website form, URL, admin form, DTI, хадгалах JSONB-ийн нэг shared төрөл. `vehicleSearchParams` нийтлэг validation; numeric payload хүлээж авахгүй. DB query дотор л шалгасан утгыг number болгоно.
- `vehicleSearchToQuery`, `getVehicleSearchHref`, `readVehicleSearchParams`, `readVehicleSearchForm` нь нийтлэг URL/form helper. Filter дотор `page`, `limit`, publication status, дурын SQL/талбар оруулахгүй. Website API-ийн pagination нь filter-ээс тусдаа.
- Жагсаалт гарчгийн хайлт, төлөвийн шүүлт, 20 мөрийн pagination, refresh, row menu, устгах confirmation-тай. Query нь URL-д хадгалагдана.
- Хадгалсны дараа тухайн tab, хайлт, хуудас хэвээр үлдэж жагсаалтыг дахин уншина. Сүүлийн мөрийг устгавал өмнөх хуудас руу буцна.
- Mantine/useForm, Tabler, PageBody; нэмэлт cache, custom CSS ашиглаагүй.

## API

`@bigmotors/sysop-dti`: `HomeProductGroups` namespace.

| Үйлдэл | Route |
| --- | --- |
| List / create | GET / POST `/api/home-product-groups` |
| Get / update / delete | GET / PATCH / DELETE `/api/home-product-groups/:id` |

- Хариу нь одоогийн DTI envelope; Date нь ISO string.
- PATCH-д орхисон талбар хэвээр, `imageId: null` зураг хасна, `filters: {}` бүх нөхцөл цэвэрлэнэ. `filters`-ийг бүхлээр солино, дотроо merge хийхгүй.
- Серверт UUID, текстийн хязгаар, enum, range, лавлах оршин байгаа эсэх, марк-загвар-хувилбарын хамаарлыг шалгана.
- Одоо ашиглаж буй идэвхгүй лавлахыг form-д хадгалж харуулна; шинээр сонгохгүй. Лавлах устсан үед нөхцөлийг цэвэрлэж/солих шаардлагатай.
- API нэвтрэлт/ACL-ийн одоогийн түр bypass бодлогыг энэ ажлаар өөрчлөөгүй. Production эрхийн хамгаалалт дууссан гэсэн үг биш.

## Хүрээ

Энэ алхамд DB, DTI, API, admin удирдлага хийгдсэн. Public нүүрний бүлгийн card grid, машины тоолол, `/vehicles?...` холбоосыг хараахан холбоогүй; дараагийн frontend ажил. Сэлбэг/дугуйн бүлэг, динамик SQL engine, олон утгатай OR нөхцөл ороогүй.

## Шалгалт

- DB CRUD, зураг солих/устгах usage, rollback, буруу хамаарал, хоосон PATCH, шүүлт болон эрэмбэ.
- DTI болон HTTP CRUD, JSON-safe хариу, дурын нөхцөл/хуудаслалт оруулахаас хамгаалалт.
- Admin form mapping, цэс/route, desktop/mobile болон бодит create/edit урсгал.
