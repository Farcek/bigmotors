# Admin Gallery

Хэрэглэгчийн хүсэлт: 2026-09-12. Каталогоос тусдаа gallery болон item CRUD module.

## Admin

- `/galleries`: gallery жагсаалт, нэр/key-ээр хайлт, хуудаслалт, шинэчлэх, нэмэх, засах, устгах. Нэрийн доор key харагдана.
- `/galleries/:id`: тухайн gallery-ийн зурагтай item жагсаалт, хуудаслалт, нэмэх, засах, устгах.
- Sidebar-ийн Үндсэн хэсэгт Gallery холбоос байна.
- Item form: **Label → Гарчиг → Тайлбар → Дараалал**. Эхний гурван талбар Mantine RichTextEditor / Tiptap editor бөгөөд HTML string хадгална. Bold, italic, underline, жагсаалт, холбоос, undo/redo дэмжинэ. Хоосон editor optional утга болно. Image preview-тэй, image_id-г хэрэглэгчид харуулахгүй.
- Одоогийн schema-ийн 255/255/512 тэмдэгтийн хязгаарт HTML tag-ууд мөн тооцогдоно; schema/migration өөрчлөөгүй. Admin жагсаалт, зургийн alt болон үйлдлийн нэрд HTML-ийг ажиллуулахгүй, зөвхөн текстийг харуулна. Website HTML render хийхдээ тусдаа sanitization хэрэгтэй.
- Шинэ item дээр зураг upload хийнэ. Edit дээр зураг солих/upload хийхгүй; зөвхөн текст болон дарааллыг засна. Зургийг хасахдаа жагсаалтын item устгах үйлдлийг ашиглана; эх файл устахгүй.
- Item PATCH contract болон DB service imageId өөрчлөх оролдлогыг 400 алдаагаар буцаана; одоо байгаа өгөгдөл өөрчлөгдөхгүй.
- Upload нь одоогийн FileUploadDialog, хэмжээ болон FILES_ROOT дүрмийг ашиглана; шинэ upload endpoint үүсгэхгүй.
- Gallery form: Key → Нэр → Тайлбар. Key болон нэр required; key нь trim хийсэн 1–255 тэмдэгт, unique, том/жижиг үсэг ялгана. Key засаж болно; давхардлыг ойлгомжтой алдаагаар харуулна. Item дээр image required. Бусад текст optional. Нарийвчилсан [schema](../db/gallery.md).
- Мөр бүрийн үйлдэл menu-д; устгах үед confirmation харуулна. Gallery устгахад бүх item хамт устахыг тайлбарлана. Эх файлууд устахгүй.
- Mantine + useForm, PageBody, Tabler. Custom CSS/cache сан нэмээгүй. Mutation дараа API-гаас дахин уншина.
- Хайлт/page URL query-д; loading/error/empty/success, давхар submit хамгаалалттай.

## DTI / API

`sysop/dti/src/gallery.ts`: `Galleries`, `GalleryItems`. Доорх замууд `/api` prefix-тэй.

| Method | Path | Үйлдэл |
| --- | --- | --- |
| GET | /galleries | name/key хайлт, limit/offset |
| POST | /galleries | Gallery нэмэх |
| GET | /galleries/:id | Gallery авах |
| PATCH | /galleries/:id | Gallery засах |
| DELETE | /galleries/:id | Gallery болон item-уудыг устгах |
| GET | /galleries/:galleryId/items | Item жагсаалт, limit/offset |
| POST | /galleries/:galleryId/items | Item нэмэх |
| PATCH | /galleries/:galleryId/items/:id | Item засах |
| DELETE | /galleries/:galleryId/items/:id | Item устгах |

List limit 1–100, offset non-negative integer. Хайлт 255 тэмдэгтээс ихгүй; SQL wildcard-ийг literal гэж үзнэ. Item жагсаалт originalName-г file URL үүсгэхэд зориулан өгнө; file_path/usage буцаахгүй.

Gallery create body нь `key` заавал авна; PATCH дээр optional боловч хоосон/null болгож болохгүй. Gallery-ийн бүх entity response-д `key` орно. Item contract өөрчлөгдөхгүй.

Item өөр gallery-д харьяалагдсан бол засах/устгах 404. Алдаа: 400 invalid input, 404 missing row, 409 missing reference эсвэл `GALLERY_KEY_CONFLICT`, 500 sanitized storage error. Нэвтрэлт/ACL-ийн одоогийн API тохиргоог өөрчлөөгүй; шинэ эрхийн бодлого баталсан гэсэн үг биш.

## Хамрахгүй

Website дээр gallery render/сонгох, public endpoint, drag-and-drop эрэмбэ, нийтлэх workflow, файл автоматаар устгах/цэвэрлэх энэ ажилд ороогүй. Дарааллыг item form-ийн sort_order-оор удирдана.
