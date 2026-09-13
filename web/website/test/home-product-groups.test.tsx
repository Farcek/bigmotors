import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { readVehicleSearchParams } from "@bigmotors/core";
import HomeProductGroups from "../src/components/home.product.groups";
import { readHomeProductGroups } from "../src/server/home-product-group-queries";

test("home groups preserve ordering, shared filters, zero counts and public file URLs", async () => {
  const items = await readHomeProductGroups({ async listPublic() { return [
    { id: "first", title: "Hybrid", filters: { fuel: "hybrid", mileage_min: "0" }, imageId: "image-id", imageName: "зураг 1.jpg" },
    { id: "second", title: "No match", filters: {}, imageId: null, imageName: null },
  ]; } }, { async countGroups(filters) {
    assert.deepEqual(filters, [{ fuel: "hybrid", mileage_min: "0" }, {}]); return [12, 0];
  } });
  assert.deepEqual(items.map((item) => item.id), ["first", "second"]);
  assert.equal(items[0]!.imageUrl, `/files/image-id/${encodeURIComponent("зураг 1.jpg")}`);
  assert.deepEqual(readVehicleSearchParams(new URL(items[0]!.href, "https://example.test").searchParams), { fuel: "hybrid", mileage_min: "0" });
  assert.equal(items[1]!.total, 0); assert.equal(items[1]!.imageUrl, null);
  assert.equal(items[1]!.href, "/vehicles");
  assert.deepEqual(Object.keys(items[0]!).sort(), ["href", "id", "imageUrl", "title", "total"]);
});

test("empty groups skip counts while database errors reach the page error boundary", async () => {
  assert.deepEqual(await readHomeProductGroups({ async listPublic() { return []; } }, { async countGroups() { assert.fail("No groups to count"); } }), []);
  await assert.rejects(readHomeProductGroups({ async listPublic() { throw new Error("db error"); } }, { async countGroups() { return []; } }), /db error/);
  await assert.rejects(readHomeProductGroups({ async listPublic() { return [{ id: "id", title: "Title", filters: {}, imageId: null, imageName: null }]; } }, { async countGroups() { throw new Error("count error"); } }), /count error/);
});

test("group grid renders accessible links, escaped titles, counts and optional images", () => {
  const html = renderToStaticMarkup(<HomeProductGroups items={[
    { id: "one", title: "<script>Example</script>", imageUrl: "/files/id/photo.jpg", href: "/vehicles?fuel=hybrid", total: 1200 },
    { id: "two", title: "No image", imageUrl: null, href: "/vehicles?engine_max=2000", total: 0 },
  ]} />);
  assert.match(html, /Төрлөөр нь үзэх/); assert.match(html, /Бүгдийг харах/);
  assert.match(html, /href="\/vehicles"/); assert.match(html, /href="\/vehicles\?fuel=hybrid"/);
  assert.match(html, /1,200 Автомашин/); assert.match(html, /0 Автомашин/);
  assert.equal((html.match(/<li /g) ?? []).length, 2);
  assert.equal((html.match(/<img /g) ?? []).length, 1);
  assert.doesNotMatch(html, /<script>|<button/);
  assert.equal(renderToStaticMarkup(<HomeProductGroups items={[]} />), "");
});
