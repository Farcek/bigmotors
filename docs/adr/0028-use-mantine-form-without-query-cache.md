# 0028: Mantine useForm ашиглаж, нэмэлт cache үүсгэхгүй байх

- Огноо: 2026-09-12
- Төлөв: Баталсан
- Холбоотой баримт: [TASK-07](../../docs.task.md#task-07-frontend-хэрэгслүүд), [Admin UI kit](../ui/admin-ui-kit.md), [UI kit-ийн эзэмшил](0027-use-app-local-admin-ui-kit.md)

## Нөхцөл байдал

Admin-ийн form болон cache-ийн хэрэгслийг тусад нь хэлэлцсэн. Хэрэглэгч Mantine `useForm`-ийг сонгож, TanStack Query болон нэмэлт cache хэрэгжүүлэхээс татгалзсан.

## Харьцуулсан хувилбарууд

- Form утга бүрийг React state-аар тусад нь удирдах: demo-д ашигласан ч олон form-д validation/error/reset/dirty төлөв давтагдана.
- `@mantine/form`-ийн `useForm`: Mantine input-уудтай нэгтгэж form-ийн төлөвийг удирдана. Сонгосон.
- TanStack Query эсвэл өөр cache сан: одоогийн admin-д хэрэглэхгүй.
- Cache сангүй шууд API хандалт: шаардлагатай үед өгөгдөл уншиж, UI-ийн loading/error/data төлөвийг React state-аар удирдана. Сонгосон.

## Шийдвэр

- `sysop/app`-ийн form-ууд `@mantine/form`-ийн `useForm` ашиглана.
- Form-ийн утга, талбарын алдаа, dirty болон reset төлөвийг form эзэмшинэ. Серверийн алдааг талбар эсвэл form-ийн нийтлэг алдаа болгон харуулна.
- TanStack Query суулгахгүй. Орлуулах cache сан эсвэл өөрсдийн query cache abstraction мөн үүсгэхгүй.
- API хүсэлт өмнө сонгосон DTI client-ээр дамжина. Нэмэх/засах/устгах амжилттай бол шаардлагатай жагсаалт/мэдээллийг дахин уншина.
- Өмнөх саналын staleTime, cache retention, invalidation, optimistic cache update болон cache persistence тохиргоо хэрэгжихгүй.
- Хайлт/шүүлт/эрэмбэ/page URL-д байх routing дүрэм хэвээр. Бөглөж буй form утгыг дахин уншсан өгөгдлөөр автоматаар дарж солихгүй.
- Энэ шийдвэр зөвхөн admin frontend-д хамаарна. Website-ийн Next.js cache, HTTP cache, DB болон бусад системийн cache-ийн шийдвэрийг өөрчлөхгүй.

## Үр дагавар

- Form-ийн төлөв нэг хэрэгслээр удирдагдаж, cache-ийн нэмэлт dependency болон ажиллагаа үүсэхгүй.
- Өгөгдөл унших loading/error, хуучирсан хүсэлтийн хариу шинэ төлөвийг дарахаас хамгаалах болон шаардлагатай дахин уншилтыг тухайн integration хариуцна.
- DTI-ийн Zod contract хэвээр. Form mode, schema resolver болон UI-to-payload хөрвүүлэлтийн нарийвчлалыг хэрэгжүүлэлтийн үед тогтооно; API validation-ийг сулруулахгүй.
- Энэ удаад технологийн шийдвэрийг бүртгэсэн. `@mantine/form` суулгах, demo form шилжүүлэх болон API integration хийх кодын өөрчлөлт ороогүй.

## Хэрэгжилтийн тэмдэглэл

2026-09-12: [Өнгөний CRUD](../features/admin-colors.md)-д `@mantine/form` суулгаж, `useForm` болон DTI client холбоосыг хэрэгжүүлсэн. Энэ жижиг form controlled mode ашиглаж, DTI schema-аар validate/parse хийнэ. Cache нэмээгүй; demo form шилжүүлэх ажил энэ өөрчлөлтөд ороогүй.
