# Website-ийн суурь layout

- Баталсан: 2026-09-12.
- Styling: Tailwind CSS utility class. [ADR 0033](../adr/0033-use-tailwind-for-website.md).
- Website-ийн нийт хүрээ `width: 100%`, `max-width: 1440px`, `margin-inline: auto` байна. Header, main, footer нэг хүрээнд багтана.
- 1440px-ээс өргөн дэлгэц дээр хоёр талын гадна зай тэнцүү. Жижиг дэлгэц дээр viewport-оос хэтрэхгүй.
- Доторх хэвтээ зай: mobile 16px, `sm`-ээс 24px, `lg`-ээс 32px. Эдгээр зай 1440px хүрээн дотроо тооцогдоно.
- Нийтлэг хүрээг `web/website/src/app/layout.tsx` эзэмшинэ. Хуудас бүр дахин гадна container үүсгэхгүй.
- Custom CSS аль болох бичихгүй; utility class болон шаардлагатай үед Tailwind theme token ашиглана. Global CSS нь одоогоор зөвхөн Tailwind import агуулна.
- Website-ийн эцсийн palette, typography, каталогийн дэлгэцийн дизайн тусдаа шийдэгдэнэ. Одоогийн нүүр нь суурь хуудас; бүтээгдэхүүний өгөгдөл хараахан холбоогүй.

## Header

- Баталсан бүтэц: зүүн талд logo; баруун талд search, menu. Notification, user товч нэмэхгүй.
- Нийт өндөр бүх дэлгэц дээр 143px, үндсэн хүрээний 1440px дотор байрлана.
- Header хар фон (`#1b1b1b`), logo болон icon-ийн өнгийг хэрэглэгчийн SVG asset-аас авна.
- `xl` буюу 1280px-ээс хэвтээ зай 120px; бага дэлгэц дээр 16/24/32px. Энэ нь header-ийн тусгай зай, main/footer-ийн дүрмийг өөрчлөхгүй.
- Компонент: `web/website/src/components/header/index.tsx`. Хэрэглэгчийн байршуулсан `logo.svg`, `icon.search.svg`, `icon.menu.svg`-ийг нэг хавтаснаас static import хийж ашиглана; SVG файлыг өөрчлөхгүй.
- Logo-ийн үндсэн хэмжээ 370.616 x 53.85px; жижиг дэлгэц дээр харьцаагаа хадгалан багасна.
- Header дээр өгсөн SVG icon-уудыг ашиглана. Бусад UI-ийн Tabler сонголт хэвээр. Товч 44px-ээс багагүй, tooltip болон accessible нэртэй байна.
- Одоогийн үе шатанд зөвхөн UI байгуулна: search/menu дээр дарахад үйлдэл хийхгүй. Dialog, хайлтын талбар, event handler болон dialog-той холбоотой ARIA атрибут байхгүй.
