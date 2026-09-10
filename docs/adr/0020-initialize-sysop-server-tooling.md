# 0020: Sysop server-ийн суурь tooling

- Огноо: 2026-09-10
- Төлөв: Баталсан; backend initialize хүсэлтийн хүрээнд
- Холбоотой баримт: [Ажиллуулах заавар](../operations/sysop-server.md), [TASK-10](../../docs.task.md#task-10-server-build-хувилбарууд-typescript-lintformat), [Auth ADR](0019-use-userly-admin-authentication-and-acl.md)

## Нөхцөл байдал

Хэрэглэгч sysop backend initialize хийхийг хүссэн. Байршил болон package нэрийг өөрчлөхгүй: `sysop/server`, `@bigmotors/sysop-server`. Node.js 24, Express, TypeScript батлагдсан; server builder/dev runtime нь TASK-10-д санал байсан.

## Харьцуулсан хувилбарууд

- `tsc` emit: энгийн боловч shared library-ийн tsdown tooling-оос ялгаатай.
- tsdown ESM build + tsx watch + тусдаа tsc: өмнөх санал болон shared tooling-той нийцнэ; суурь ажилд сонгосон.
- Framework/DI/auth implementation нэмж бүрэн backend болгох: initialize хүрээнээс давна; сонгоогүй.

## Шийдвэр

- Express `5.2.1`, `@napp/error` `1.1.0`.
- tsdown `0.23.0`, Node platform/Node24 target, ESM `dist/main.mjs`, sourcemap; server entry-д declaration build хийхгүй.
- tsx `4.23.13` dev watch; TypeScript `6.0.3` strict/NodeNext, `tsc --noEmit` тусдаа. Latest major-г автоматаар авахгүй.
- Node24-т нийцсэн `@types/node` `24.13.3`, `@types/express` `5.0.6`; direct dependency хувилбарууд pinned, dependency graph root lockfile-д байна.
- pnpm `11.19.0`, workspace manifest болон root server script-үүд нэмсэн. Зөвхөн esbuild dependency build script зөвшөөрсөн; release-age шалгалтыг автоматаар exception нэмүүлэлгүй strict байлгана.
- Тест `node:test`, `node:assert/strict`, TypeScript-ийг tsx-аар ажиллуулна. HTTP integration-д Node built-in server/fetch хэрэглэнэ.
- Default loopback `127.0.0.1:4000`, Node-ийн `.env` loader, хязгаартай graceful shutdown. Health нь liveness л илэрхийлнэ.
- Userly/ACL болон DB/DTI холболтыг дүр эсгэхгүй; `/api` бүх хүсэлт fail-closed. Бусад package болон байгаа DB source-г өөрчлөхгүй.

## Үр дагавар

Backend-ийг dev/build/start/test хийж болно. Энэ нь TASK-02/10/11-ийн бүх шийдвэрийг баталсан гэсэн үг биш: бусад package-ийн build graph, lint/format, CI, auth integration болон production орчин нээлттэй. Root README болон ашиглалтын баримтыг бодит scaffold-тай нийцүүлсэн.

Хэрэглэсэн API-ийн лавлагаа: [Express](https://expressjs.com/en/5x/api.html), [tsdown Node platform](https://tsdown.dev/options/platform), [pnpm тохиргоо](https://pnpm.io/settings). Бодит dependency exports/types болон install/typecheck/test/build-аар нийцлийг шалгасан.
