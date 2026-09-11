# 0026: Sysop app-д React Router Data Mode ашиглах

- Огноо: 2026-09-12
- Төлөв: Баталсан
- Холбоотой баримт: [TASK-07](../../docs.task.md#task-07-frontend-хэрэгслүүд), [Mantine/Vite](0007-use-mantine-and-vite-for-sysop-app.md), [Ажиллуулах заавар](../operations/sysop-app.md)

## Нөхцөл байдал

Sysop app нь Vite + React SPA. Нүүр болон Лавлах дэлгэцийг `window.location.pathname`-аар сонгож байсан; URL history, unknown route болон нийтлэг layout-ийн routing суурь шаардлагатай.

## Харьцуулсан хувилбарууд

- Pathname гараар шалгах: жижиг эхлэлд хангалттай боловч nested route, history болон алдааны төлөвийг өөрсдөө хэрэгжүүлнэ.
- React Router Declarative Mode: үндсэн navigation-д хангалттай.
- React Router Data Mode: route object, nested layout, error boundary болон цаашдын route loader-ийг одоогийн Vite app-д холбоно.
- Framework Mode: энэ admin SPA-д SSR болон framework build нэмэх шаардлагагүй.

## Шийдвэр

- `react-router` Data Mode, `createBrowserRouter` + `RouterProvider` ашиглана. Browser router-ийг React render-ээс гадна нэг удаа үүсгэнэ.
- `src/router.tsx` route object-уудыг эзэмшинэ. `AdminLayout` нь `Outlet`-оор дэд дэлгэцээ харуулна.
- Sidebar нь React Router `NavLink` ашиглана. Active төлөв URL-аас тодорно; Mantine нь `aria-current`-ийг ашиглан идэвхтэй загвар харуулна.
- Эхний хэрэгжүүлэлт: `/`, `/references`, catch-all 404 болон route error boundary. CRUD дэлгэц болон login/ACL guard энэ хүрээнд нэмэхгүй.
- Цаашдын жагсаалтын хайлт, шүүлт, pagination-ийг URL query-д хадгална. Энэ удаад эдгээр control байхгүй, query утгыг router өөрчлөхгүй.
- API contract DTI-д хэвээр. Form, cache болон global state санг энэ шийдвэрээр батлаагүй.

## Үр дагавар

- Дотоод navigation нь бүтэн хуудас дахин ачаалахгүй. Шууд URL нээх, refresh, Back/Forward боломжтой.
- Production static server нь app URL-ийг `index.html` рүү fallback хийнэ; `/api` болон байхгүй static asset-ийг HTML болгохгүй. Deployment config дараа хийгдэнэ.
- Root error boundary нь дотоод алдааны дэлгэрэнгүйг харуулахгүй. Нүүр рүү дахин ачаалж сэргээх холбоостой.
- Frontend guard нь серверийн ACL-ийг орлохгүй; түр bypass-ийн хүрээ өөрчлөгдөөгүй.
- Суулгасан хувилбар `8.3.1`, MIT лицензтэй. Node `>=22.22.0`, React/React DOM `>=19.2.7` шаардлага нь төслийн Node24, React19.2.8-тай нийцнэ. Шууд dependency нь `cookie-es`; нэмэлт framework plugin суулгахгүй.

## Эх сурвалж

- [React Router Data Mode суулгах](https://reactrouter.com/start/data/installation)
- [Route object болон nested routing](https://reactrouter.com/start/data/routing)
- [NavLink](https://reactrouter.com/api/components/NavLink)

