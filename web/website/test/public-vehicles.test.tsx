import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicVehicleQueryError, type PublicVehicleService } from "@bigmotors/db";
import { publicVehicleResponse, readPublicVehicles } from "../src/server/public-vehicle-response";
import HomeSearch from "../src/components/home.search";
import { fetchHomeVehicles } from "../src/components/home.search/client";
import { EMPTY_LOOKUPS, type HomeVehicleResult } from "../src/components/home.searcher/model";

const result: HomeVehicleResult = { items: [{ id: "car", title: "SSR Vehicle", imageUrl: "/files/id/photo.jpg", priceDisplayMode: "inquire" }], total: 1, page: 1, pageCount: 1, pageSize: 12 };

test("initial server-provided results render immediately without a client request", () => {
  const html = renderToStaticMarkup(<HomeSearch initialResult={result} lookups={EMPTY_LOOKUPS} />);
  assert.match(html, /SSR Vehicle/); assert.doesNotMatch(html, /1 автомашин/);
  assert.doesNotMatch(html, /Ачаалж байна|2-р хуудас|3-р хуудас/);
  assert.equal((html.match(/<article/g) ?? []).length, 1);
});

test("public response uses one query presenter and never exposes file metadata", async () => {
  const service = { async list() { return { ...result, items: [{ id: "car", title: "Car", mainImageId: "image", mainImageName: "зураг 1.jpg", itemImageId: null, itemImageName: null }] }; } } as unknown as Pick<PublicVehicleService, "list">;
  const data = await readPublicVehicles(service, {});
  assert.equal(data.items[0]!.imageUrl, `/files/image/${encodeURIComponent("зураг 1.jpg")}`);
  assert.equal("mainImageName" in data.items[0]!, false);
  const response = await publicVehicleResponse(new Request("http://local/api/vehicles"), service);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), data);
  assert.equal((await publicVehicleResponse(new Request("http://local/api/vehicles?page=1&page=2"), service)).status, 400);
  assert.equal((await publicVehicleResponse(new Request("http://local/api/vehicles"), { async list() { throw new PublicVehicleQueryError(); } })).status, 400);
  const failed = await publicVehicleResponse(new Request("http://local/api/vehicles"), { async list() { throw new Error("SECRET DATABASE URL"); } });
  assert.equal(failed.status, 500); assert.doesNotMatch(await failed.text(), /SECRET/);
});

test("client sends current filters and page, handles errors and forwards cancellation", async () => {
  const controller = new AbortController();
  const fetcher = (async (input, init) => {
    assert.equal(String(input), "/api/vehicles?mileage_min=0&condition=new&page=2");
    assert.equal(init?.signal, controller.signal); assert.equal(init?.cache, "no-store");
    return Response.json(result);
  }) as typeof fetch;
  assert.deepEqual(await fetchHomeVehicles({ condition: "new", mileage_min: "0" }, 2, controller.signal, fetcher), result);
  await assert.rejects(fetchHomeVehicles({}, 1, controller.signal, (async () => new Response("private", { status: 400 })) as typeof fetch), /доод\/дээд/);
  await assert.rejects(fetchHomeVehicles({}, 1, controller.signal, (async () => new Response("private", { status: 500 })) as typeof fetch), /ачаалж чадсангүй/);
});
