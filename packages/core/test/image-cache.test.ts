import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import sharp, { type Sharp } from "sharp";
import { getFileImageUrl, parseFileImageWidth, FileImageError, FILE_IMAGE_WIDTHS } from "../src/file-image.js";
import { resizeStoredImage } from "../src/image-cache.js";

test("width contract and URL helper keep originals and unrelated URLs intact", () => {
  assert.equal(parseFileImageWidth(new URLSearchParams("other=1")), undefined);
  for (const width of FILE_IMAGE_WIDTHS) assert.equal(parseFileImageWidth(new URLSearchParams(`w=${width}`)), width);
  for (const query of ["w=", "w=0", "w=-480", "w=481", "w=0480", "w=480.0", "w=480&w=800", "w=../../secret"]) {
    assert.throws(() => parseFileImageWidth(new URLSearchParams(query)), FileImageError);
  }
  const url = "/files/abc/photo.jpg?other=1&w=240";
  assert.equal(getFileImageUrl(url, 480), "/files/abc/photo.jpg?other=1&w=480");
  for (const src of ["https://other/photo.jpg", "/logo.svg", "/files/abc/file.svg", "/files/abc/animation.gif"]) {
    assert.equal(getFileImageUrl(src, 480), src);
  }
});

test("image variants preserve sources, reuse disk cache and bound processing", async (t) => {
  const folder = await mkdtemp(path.join(tmpdir(), "bm-resize-"));
  t.after(async () => {
    assert.ok(path.resolve(folder).startsWith(path.resolve(tmpdir()) + path.sep));
    await rm(folder, { recursive: true, force: true, maxRetries: 3 });
  });
  const cache = path.join(folder, "separate-cache");
  const source = path.join(folder, "source");
  const bytes = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: "red" } }).jpeg().toBuffer();
  await writeFile(source, bytes);

  await t.test("single-flight requests produce one 480x360 WebP and never rewrite originals", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => resizeStoredImage(source, cache, 480)));
    assert.equal(new Set(results).size, 1);
    const result = results[0]!;
    const metadata = await sharp(result).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 480); assert.equal(metadata.height, 360);
    assert.equal(metadata.exif, undefined);
    assert.deepEqual(await readFile(source), bytes);
    assert.equal((await readdir(path.join(cache, "image-v1"))).length, 1);
    const previous = await stat(result);
    assert.equal(await resizeStoredImage(source, cache, 480), result);
    assert.equal((await stat(result)).mtimeMs, previous.mtimeMs);
  });

  await t.test("small images are not enlarged and EXIF orientation is applied", async () => {
    const small = path.join(folder, "small");
    await sharp({ create: { width: 120, height: 80, channels: 3, background: "blue" } }).jpeg().withMetadata({ orientation: 6 }).toFile(small);
    const metadata = await sharp(await resizeStoredImage(small, cache, 800)).metadata();
    assert.equal(metadata.width, 80); assert.equal(metadata.height, 120);
    assert.equal(metadata.orientation, undefined);
  });

  await t.test("a changed source selects a new cache entry; deleted sources do not serve stale cache", async () => {
    const before = await resizeStoredImage(source, cache, 480);
    await writeFile(source, await sharp({ create: { width: 1200, height: 800, channels: 3, background: "green" } }).png().toBuffer());
    const after = await resizeStoredImage(source, cache, 480);
    assert.notEqual(before, after);
    assert.equal((await sharp(after).metadata()).height, 320);
    await rm(source);
    await assert.rejects(resizeStoredImage(source, cache, 480), { code: "ENOENT" });
    await writeFile(source, bytes);
  });

  await t.test("invalid cache paths, unsupported files and excessive pixels fail safely", async () => {
    for (const cachePath of ["", "relative/cache"]) await assert.rejects(resizeStoredImage(source, cachePath, 480));
    for (const [name, content] of [["fake.jpg", "not an image"], ["vector.svg", '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"></svg>']]) {
      const file = path.join(folder, name!);
      await writeFile(file, content!);
      await assert.rejects(resizeStoredImage(file, cache, 480), { code: "FILE_IMAGE_UNSUPPORTED", status: 415 });
    }
    const huge = path.join(folder, "huge.png");
    await sharp({ create: { width: 7000, height: 6000, channels: 3, background: "black" } }).png().toFile(huge);
    await assert.rejects(resizeStoredImage(huge, cache, 480), { status: 415 });
    assert.ok((await readdir(path.join(cache, "image-v1"))).every((name) => name.endsWith(".webp")));
  });

  await t.test("cache namespace junctions cannot redirect generated writes", async () => {
    const otherCache = path.join(folder, "unsafe-cache");
    const outside = path.join(folder, "outside");
    await mkdir(otherCache); await mkdir(outside);
    await symlink(outside, path.join(otherCache, "image-v1"), process.platform === "win32" ? "junction" : "dir");
    await assert.rejects(resizeStoredImage(source, otherCache, 480));
    assert.deepEqual(await readdir(outside), []);
  });

  await t.test("unique requests have bounded concurrency and an overloaded queue can recover", async (context) => {
    const files = await Promise.all(Array.from({ length: 40 }, async (_, index) => {
      const file = path.join(folder, `queued-${index}`);
      await writeFile(file, bytes);
      return file;
    }));
    let release!: () => void, rejectOverload!: (error: Error) => void, reportOverload!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const overloaded = new Promise<void>((resolve, reject) => { reportOverload = resolve; rejectOverload = reject; });
    const encode = sharp.prototype.toBuffer as (this: Sharp) => Promise<Buffer>;
    let active = 0, maximum = 0;
    const mock = context.mock.method(sharp.prototype, "toBuffer", async function (this: Sharp) {
      maximum = Math.max(maximum, ++active);
      try { await gate; return await encode.call(this); }
      finally { active--; }
    });
    const results = Promise.allSettled(files.map((file) => resizeStoredImage(file, cache, 480).catch((error: unknown) => {
      if (error instanceof FileImageError && error.status === 503) reportOverload();
      throw error;
    })));
    const timeout = setTimeout(() => rejectOverload(new Error("Queue did not reject overload.")), 5000);
    try { await overloaded; }
    finally { clearTimeout(timeout); release(); }
    try {
      const outcomes = await results;
      assert.equal(maximum, 2);
      assert.ok(outcomes.some((result) => result.status === "rejected"));
      for (const [index, result] of outcomes.entries()) {
        if (result.status === "rejected") {
          assert.equal(result.reason.status, 503);
          assert.ok(await resizeStoredImage(files[index]!, cache, 480));
        }
      }
    } finally { mock.mock.restore(); }
  });
});
