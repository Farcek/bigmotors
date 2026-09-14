# Docker Орчин

Website, Sysop server, Sysop app болон migration нь тусдаа multi-stage image.
Node runtime нь 24, pnpm нь 11.19.0. Admin-ийн static build-ийг Nginx үйлчилнэ.

**Энэ Compose нь localhost туршилтын орчин.** Sysop-ийн Userly/ACL одоогоор
холбогдоогүй учир production build болсон нь нийтэд нээхэд бэлэн гэсэн үг биш.
Нэвтрэлт, эрх, HTTPS болон production credential/backup тохируулах хүртэл нийтэд нээхгүй.

## Ажиллуулах

Repository root-оос Docker Desktop-ийн Linux containers болон Compose ашиглана:

```powershell
docker compose -f infra/docker-compose.yml config --quiet
docker compose -f infra/docker-compose.yml up -d --build
docker compose -f infra/docker-compose.yml ps -a
```

Windows-д root-ийн `docker.compose.cmd` мөн build/start хийнэ.
Одоо ажиллаж буй dev server-үүдтэй default порт давхцана; тэднийг зориуд зогсоох
эсвэл доорх environment-аар Docker портуудыг солино.

| Service | Default URL / порт |
| --- | --- |
| Website | http://127.0.0.1:64400 |
| Sysop app | http://127.0.0.1:64403 |
| Sysop server | http://127.0.0.1:64402 |
| PostgreSQL | 127.0.0.1:64401 |

DB healthy болсны дараа migration дуусна; амжилтгүй бол Website/API эхлэхгүй.
Admin нь API healthy болохыг хүлээнэ. Migration seed/reset ажиллуулахгүй.
Шинэ DB-д лавлах өгөгдөл, homepage-ийн `home` gallery-г тусад нь бүрдүүлнэ;
gallery байхгүй үед нүүр хуудас одоогийн error UI-г харуулна.

## Environment

`infra/.env.example` нь жишээ. Өөрийн `infra/.env` ашиглах бол командыг:

```powershell
docker compose --env-file infra/.env -f infra/docker-compose.yml up -d --build
```

App тус бүрийн `.env`, `.env.local` image-д орохгүй, Compose автоматаар уншихгүй.
`DATABASE_URL`, `MIGRATION_DATABASE_URL` нь runtime-д л очно.

- `WEBSITE_PORT`, `SYSOP_APP_PORT`, `SYSOP_SERVER_PORT`, `DB_PORT`: localhost порт.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: шинэ DB initialize хийх утга.
  Default нь зөвхөн локал жишээ. Байгаа DB-ийн нууц үгийг env солиход шинэчлэхгүй.
- `DATABASE_URL`: Website/API холболт; default нь Compose DB.
- `MIGRATION_DATABASE_URL`: тусдаа migration credential; байхгүй бол DATABASE_URL.
  Password тусгай тэмдэгттэй бол бүрэн URL-ийг percent-encode хийж хоёр URL-д өгнө.
- `SYSOP_NODE_ENV`: default `production`. Одоогийн хамгаалалтын дагуу upload **503**
  буцаана. Зөвхөн итгэлтэй локал туршилтад `development` өгч болно.
  Бусад admin CRUD нэвтрэлтгүй хэвээр тул production утга нь API-г хамгаалахгүй.
- `FILE_UPLOAD_MAX_BYTES`: default 20 MiB; Admin proxy нийт request-ийг 21 MiB-аар
  хязгаарлана. Нэмэгдүүлэх бол `sysop/app/nginx.conf`-ийн limit-ийг мөн шинэчилж build хийнэ.

Admin-ийн `/api`, `/files` нь Nginx-ээр `sysop-server:4000` руу дамжина.
SPA deep link нь `index.html` fallback-тай; API/file алдааг HTML болгон орлуулахгүй.
Website нь API proxy ашиглахгүй, PostgreSQL болон shared files-оос шууд уншина.

## Өгөгдөл Ба Файл

- `PGDATA_PATH`: default `infra/.docker/bigmotors_pgdata`.
  Өмнөх PostgreSQL 18 bind mount хэвээр; өөрчилбөл өөр DB харагдана.
- `FILES_DATA_PATH`: default `infra/.docker/files`. Relative зам нь Compose-ийн
  `infra/` хавтсаас тооцогдоно. Одоо ашиглаж буй storage өөр бол яг тэр замыг өгнө.
- API нь `/files`-д бичих, Website нь ижил mount-ийг read-only унших эрхтэй.
  Хоёр Node image UID/GID 1000 ашиглана. Linux host дээр хавтсыг урьдчилан үүсгэж
  энэ хэрэглэгчид тохирсон эзэмшил/эрх олгоно; бүх хавтаст 777 эрх өгөхгүй.
  Dockerfile доторх эзэмшил нь host bind mount-ийн эрхийг өөрчлөхгүй.
- DB болон файлыг хамтад нь backup/restore хийнэ. Compose backup үүсгэхгүй.
- Хуучин PostgreSQL major хувилбарын data directory-г 18 image-д шууд холбоно гэж үзэхгүй;
  [migration заавар](db-migrations.md)-ын upgrade дүрмийг мөрдөнө.

## Шинэчлэх Ба Шалгах

Шинэ release-ээс өмнө DB + storage backup авна. `up -d --build` нь schema migration
ажиллуулдаг тул live өгөгдөлд нөлөөлнө. Startup dependency нь rollout transaction биш:
ажиллаж буй хуучин app-уудыг автоматаар drain хийхгүй, schema rollback хийхгүй.
Зөрчилтэй migration-д maintenance window болон тусдаа release дараалал хэрэглэнэ.

```powershell
docker compose -f infra/docker-compose.yml logs --tail 100 bigmotors-migration sysop-server website
docker compose -f infra/docker-compose.yml stop
```

Health нь process-ийн liveness: Website `/api/health`, API/Admin `/health`.
DB connectivity, homepage content болон storage бүрэн эсэхийг health шалгахгүй.
Build үеэр DB credential эсвэл ажиллаж буй DB шаардахгүй.

## Тусгаарласан Smoke Test

Compose 2.24.4+ шаардлагатай (`!override`). Default DB/storage болон dev server-үүдэд
хүрэхгүй: тусдаа project, хоёр named volume, 65400/65402/65403 порт ашиглана.
Зөвхөн хоосон test DB дээр ажиллуулна.

```powershell
docker compose -p bigmotors-docker-check -f infra/docker-compose.yml -f infra/test/compose.yml up -d --build --wait --wait-timeout 120
node --test infra/test/docker.test.ts
docker compose -p bigmotors-docker-check -f infra/docker-compose.yml -f infra/test/compose.yml down -v
```

Сүүлийн команд **зөвхөн энэ test project-ийн** DB/files volume-ийг устгана.
Test project-д бодит өгөгдөл хэзээ ч холбохгүй. Smoke test нь health, SPA deep link,
bundled assets, API proxy, migration-ийн дараах DB read, file 404, production upload
хамгаалалтыг шалгана; production auth/load/backup шалгалт биш.
Node process-ийн UID 1000, shared storage read болон Website-ийн write хоригийг мөн шалгана.

2026-09-14: дөрвөн image build амжилттай. DB-ийн 99 тест, Website health-ийн нэг
unit test, тусгаарласан Compose-ийн 7 smoke test тэнцсэн. Website/API runtime-д
`.env` файл ороогүйг шалгасан. Бодит DB/storage өөрчлөөгүй.
Анхны зэрэгцээ build дээр санах ойн дарамтаас CLI тестийн timeout гарсан тул DB
Dockerfile-ийн PGlite тестийг хамгийн ихдээ хоёр process зэрэг ажиллахаар хязгаарласан.
Нөөц багатай орчинд image-үүдийг `build bigmotors-migration`, `build sysop-server`,
`build sysop-app`, `build website` гэсэн дарааллаар build хийж болно.

## Эх Сурвалж

- [Compose startup дараалал](https://docs.docker.com/compose/how-tos/startup-order/)
- [Nginx proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- Next-ийн тухайн суусан хувилбарын `output` гарын авлага:
  `web/website/node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`
