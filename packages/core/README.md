# @bigmotors/core

Website болон admin хооронд хуваалцах, browser-д ашиглаж болох тогтмол утгууд ба төрлүүд.

`src/catalog.ts` нь бүтээгдэхүүний төрөл, нийтлэлийн төлөв, валют, үнийн хэлбэр, автомашин/сэлбэг/дугуйн enum сонголт болон тоон хязгаарын эх сурвалж. DB schema эдгээр утгаас `text + CHECK` үүсгэнэ; сонголт өөрчлөхөд ирээдүйн DB migration-ийг хамт төлөвлөнө.

Root-оос `pnpm build:core`, `pnpm typecheck:core`. Build нь ESM `dist/index.mjs` болон declaration `dist/index.d.mts` гаргана. DB driver, app config, environment болон серверийн нууц мэдээлэл агуулахгүй.
