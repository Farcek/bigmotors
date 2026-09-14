# Demo Автомашин Import

- Огноо: 2026-09-12
- Зориулалт: хэрэглэгчийн сонгосон API-д зурагтай 20 машины бүртгэлээр form, жагсаалт, хайлт, шүүлтийг турших. Орчноос хамаарсан хориггүй; зөвхөн гараар ажиллуулна.
- Өгөгдөл болон зураг бүрийн эх сурвалж: [vehicle-data.ts](../../sysop/server/src/dev/vehicle-data.ts).
- Runner: [seed-vehicles.ts](../../sysop/server/src/dev/seed-vehicles.ts).
- Шалгасан: local орчинд 20 ноорог, 20 өөр эх зураг, 20 gallery болон usage холбоос үүссэн. Зургийн нийт хэмжээ ойролцоогоор 134 MiB. Эх bytes-ийн hash, браузерт 20/20 зураг уншигдах, давтан run шинэ бүртгэл нэмэхгүй байх нөхцөл тэнцсэн. Backend-ийн 97 тест болон typecheck амжилттай.

## Ажиллуулах

Local DB-д migration болон лавлах seed хийгдсэн, sysop-server ажиллаж байх шаардлагатай. Repository root-оос:

```powershell
pnpm dev:seed:vehicles
```

`DEMO_API_BASE_URL` өгвөл тэр API origin-ийг ашиглана; байхгүй үед local команд нь `sysop/server/.env`-ийн `PORT`-оор `127.0.0.1` рүү хандана. URL нь `http://` эсвэл `https://`, credential/path/query/fragment-гүй байна; `/api` залгахгүй. Илэрхий хоосон эсвэл буруу URL-ийг local default болгож таахгүй.

`NODE_ENV=production` үед ч ажиллана. `APP_ENV`, `DEMO_IMPORT_ENABLED`, token шаардахгүй. Хэрэглэгчийн зөвшөөрлөөр import болон upload-ийн production хоригийг авсан; Admin API auth хэрэгжих үед job-ийн эрхийг хамтад нь шийднэ. Нийтэд нээлттэй Admin API-д бусад хүн ч өөрчлөлт/upload хийх боломжтой хэвээр.

DB рүү шууд INSERT хийхгүй: автомашины CRUD болон `/api/files/upload` API-г ашигладаг тул validation, files usage, gallery холбоос болон disk хадгалалтын одоогийн дүрэм үйлчилнэ. `DBConfig`, `FILES_ROOT`, persistent storage болон бичих эрхийг ажиллаж буй backend эзэмшинэ. Job нь DB credential, volume, public domain болон HTTP healthcheck шаардахгүй.

## Railway Job

Эхлээд ижил environment-ийн DB migration, лавлах seed-ийг дуусгаж Sysop server-ийг асаана. Тусдаа `demo-import` service үүсгэж дараах тохиргоог өгнө:

| Тохиргоо | Утга |
| --- | --- |
| Root Directory | repository root `/` |
| Dockerfile | `sysop/server/Dockerfile.demo` |
| Start Command | хоосон; image-ийн `node --use-system-ca dist/demo-import.mjs` командыг хэрэглэнэ |
| Restart Policy | `Never` |
| Replicas | `1` |
| GitHub automatic deploy | унтраана; import хийхдээ гараар Deploy/Redeploy |
| Cron, public domain, healthcheck, volume | нэмэхгүй |

Variables жишээ (service нэр/порт бодит тохиргоотой таарна):

```dotenv
DEMO_API_BASE_URL=http://sysop-server.railway.internal:4000
FILE_UPLOAD_MAX_BYTES=20971520
```

Dockerfile замыг сонгохдоо Railway-ийн `RAILWAY_DOCKERFILE_PATH` variable ашиглаж болно.
Job image-ийн URL default нь хоосон тул заагаагүй үед API-д хүрэхээс өмнө алдаа өгнө.
`FILE_UPLOAD_MAX_BYTES` нь Sysop-ийн upload limit-тэй ижил байна. `NODE_ENV`-ийг өөрчлөх шаардлагагүй.
API private network-оор хүрэхийн тулд хоёр service ижил project/environment-д байна;
[Railway private networking](https://docs.railway.com/networking/private-networking)-ийг ашиглана.

Build нь compiled CLI болон dependency-г багтаана; import нь build үеэр биш, container start үед ажиллана.
Exit `0` бол амжилттай, exit `1` бол алдаатай. Логийн `created`, `resumed`, `skipped`, `failed` нь
амжилттай дууссан шинэ/үргэлжлүүлсэн машин, алгассан машин болон тасалдсан run-ийн тоог харуулна.
Алдаа гарвал дараагийн машинуудыг боловсруулахгүй; өмнө амжилттай хадгалагдсан мөрүүд үлдэнэ.
Автоматаар дахин оролдохгүй, шалтгааныг засаад гараар дахин ажиллуулна.

Зургийг job-ийн disk-д хадгалахгүй, API руу дамжуулна. Sysop-ийн volume persistent,
бичих эрхтэй байх ёстой. Website service-д `FILES_API_BASE_URL` тохируулж
[Sysop file proxy](file-storage.md#website-proxy)-г ашиглана; Website-д volume хэрэггүй.
Энэ тохиргоог demo job өөрөө үүсгэхгүй.

## Docker Compose Job

`demo-import` нь `demo` profile-д байгаа тул ердийн `up` үед ажиллахгүй. Migration болон
лавлах seed хийгдсэн DB/API дээр repository root-оос:

```powershell
docker compose -f infra/docker-compose.yml build demo-import
docker compose -f infra/docker-compose.yml run --rm demo-import
```

Job нь Compose-ийн Sysop API руу хандана; DB reset/seed автоматаар хийхгүй.

2026-09-14 шинэчлэл: server-ийн 103 тест, typecheck/build болон тусгаарласан Docker орчны
7 smoke тест тэнцсэн. Production anonymous upload-ийн bytes-ийг API болон Website-ээр
буцааж уншиж шалгасан. Job-ийн compiled CLI нь сонгосон API-д холбогдож, лавлах seed
дутуу үед өгөгдөл үүсгэлгүй зогсохыг шалгасан. Энэ шинэчлэлээр Railway deploy болон
20 машины бодит import ажиллуулаагүй.

Node.js нь `--use-system-ca` ашиглана; системийн итгэмжлэгдсэн CA-г уншдаг, TLS шалгалтыг унтраахгүй. Зураг татахад интернет хэрэгтэй. Wikimedia 429/503 өгвөл Retry-After болон хүлээлттэй, хязгаартай дахин оролдоно.

## Өгөгдлийн Зааг

- 20 өөр загвар, тус бүр нэг эх зураг, `main_image_id` болон нэг gallery холбоос.
- Бүгд **ноорог**; автоматаар нийтлэхгүй. Гарчиг `[DEMO-01]` ... `[DEMO-20]` гэсэн тэмдэглэгээтэй.
- Үнэ, он, гүйлт, өнгө, тоноглолын үзүүлэлт, ирэлтийн нөхцөл нь synthetic development утга. Зураг дээрх машины бодит тохиргоо, компанийн нөөц эсвэл бодит санал биш. Энэ тайлбарыг short description, HTML content, internal note-д хадгална.
- Компанийн салбар, бодит байршил, VIN болон харилцагчийн мэдээлэл зохиохгүй. Нийтлэгдсэн болон өмнө байсан машиныг өөрчлөхгүй.
- Зураг нь Wikimedia Commons-ийн CC BY-SA / CC0 эх сурвалжаас. Татсан эх JPEG-ийг resize, recompress хийхгүй; файлын хэмжээ, SHA-256 болон local read route-аар буцаж ирсэн bytes-ийг тулгана.
- Зургийн зохиогч, эх хуудас, лицензийн нэр/холбоос нь файлын тайлбар, машины content/internal note болон source manifest-д байна. Зураг нийтэд ашиглахдаа credit, лицензийг хамт харуулах үүрэг хэвээр.

## Давтан Ажиллуулах

`internalNote`-ийн эхний мөр дэх `bigmotors-demo-vehicles-v1:NN` marker-аар өмнө үүссэн машиныг олно. Нэрийг зассан ч marker хэвээр бол дахин үүсгэхгүй. Үндсэн зурагтай мөрүүдийг өөрчлөхгүй; зураггүй үлдсэн ноорогийн upload-ийг үргэлжлүүлнэ. Marker-ийг устгавал давтан run түүнийг танихгүй. Командыг зэрэг ажиллуулахгүй.

Нийт 20 машиныг нэг DB transaction-д оруулахгүй: тус бүр API transaction-тай. Сүлжээ тасарвал өмнөх амжилттай бүртгэлүүд үлдэнэ. Upload амжилттай боловч машины PATCH амжилтгүй болсон бол ашиглаагүй файл үлдэж болно; script uncertain write-ийн дараа файл автоматаар устгахгүй. Existing зурагтай бүртгэлийн файлыг сольж засахгүй.

Дискний JPEG болон DB-г Git-д оруулахгүй. Fixture-ийн metadata болон import код л repository-д хадгалагдана. Жагсаалтаас `DEMO` гэж хайж жишээ машинуудыг ялгана.
