# BigMotors Sysop App

Mantine + React + Vite admin frontend. Routing нь React Router Data Mode.

- [Ажиллуулах, route нэмэх болон шалгах заавар](../../docs/operations/sysop-app.md)
- [Routing шийдвэр](../../docs/adr/0026-use-react-router-data-mode.md)
- [Марк / Загвар / Хувилбар](../../docs/features/admin-vehicle-hierarchy.md): гурван баганатай нэгтгэсэн удирдлага, автоматаар бөглөх харьяалал.

Нүүр, Лавлахын нүүр, [Өнгөний CRUD](../../docs/features/admin-colors.md), [бусад 11 лавлахын CRUD](../../docs/features/admin-reference-crud.md), 404, route error болон [UI demo](../../docs/features/admin-ui-demo.md) дэлгэцтэй. Лавлахын CRUD нь Mantine `useForm` болон DTI client-ээр бодит API-д холбогдоно; нэмэлт cache байхгүй. `/demo`, `/demo/list`, `/demo/form` нь зөвхөн санах ойн жишээ өгөгдөлд ажиллана. Login/ACL guard-ийн integration хийгдээгүй.
