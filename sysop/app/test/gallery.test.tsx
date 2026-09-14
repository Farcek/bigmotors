import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MantineProvider } from "@mantine/core";
import { GalleryForm } from "../src/pages/gallery/GalleryForm";
import { galleryError, galleryPage } from "../src/pages/gallery/model";
import { HtmlEditor } from "../src/ui/HtmlEditor";

test("gallery pagination is bounded and errors hide internal details", () => {
  for (const page of ["-1", "0", "NaN", "2.5"]) assert.equal(galleryPage(new URLSearchParams({page})), 1);
  assert.equal(galleryPage(new URLSearchParams("page=2")), 2);
  assert.ok(galleryPage(new URLSearchParams("page=999999999999"))*20 < 2147483647);
  assert.doesNotMatch(galleryError(new Error("private password")), /private|password/);
});
test("gallery and item forms render their own labelled fields", () => {
  for (const itemMode of [false, true]) {
    const html = renderToStaticMarkup(<MantineProvider env="test"><GalleryForm itemMode={itemMode} onBusy={() => {}} onSave={async () => {}} onCancel={() => {}} /></MantineProvider>);
    for (const label of itemMode ? ["Гарчиг", "Label", "Дараалал", "Тайлбар", "Холбоосын URL", "Холбоосын текст"] : ["Key", "Нэр", "Тайлбар"]) assert.ok(html.includes(label));
    assert.ok(!html.includes("Зургийн ID"));
    if (itemMode) {
      assert.doesNotMatch(html, />Key/);
      assert.ok(html.indexOf("Label") < html.indexOf("Гарчиг"));
      assert.ok(html.indexOf("Гарчиг") < html.indexOf("Тайлбар"));
      assert.doesNotMatch(html, /<textarea/i);
      assert.match(html, /Зураг upload/);
      assert.equal((html.match(/aria-label="Bold"/g) ?? []).length, 3);
    } else {
      assert.match(html, /maxlength="255"/i); assert.match(html, /maxlength="512"/i);
    }
  }
});

test("editing an item shows its image without upload or editable image ID", () => {
  const row = { id: "00000000-0000-4000-8000-000000000001", galleryId: "00000000-0000-4000-8000-000000000002", imageId: "00000000-0000-4000-8000-000000000003", originalName: "image.png", title: "Photo", label: "Label text", desc: "Description", sortOrder: 0, created: "2026-09-12T00:00:00Z", updated: "2026-09-12T00:00:00Z" };
  const html = renderToStaticMarkup(<MantineProvider env="test"><GalleryForm row={{ ...row, linkUrl: "/vehicles", linkLabel: "Catalog" }} itemMode onBusy={() => {}} onSave={async () => {}} onCancel={() => {}} /></MantineProvider>);
  assert.match(html, /value="\/vehicles"/); assert.match(html, /value="Catalog"/);
  assert.match(html, /<img/);
  assert.match(html, /\/image\?w=1280/);
  assert.match(html, /aspect-ratio:4 \/ 3/);
  assert.match(html, /--image-object-fit:cover/);
  assert.doesNotMatch(html, /Зураг upload|Зургийн ID|<textarea/);
});

test("HTML editor disables toolbar controls while saving and renders field errors", () => {
  const html = renderToStaticMarkup(<MantineProvider env="test"><HtmlEditor label="Label" value="" onChange={() => {}} disabled error="HTML хэт урт" /></MantineProvider>);
  const buttons = html.match(/<button\b[^>]*>/g) ?? [];
  assert.equal(buttons.length, 10);
  for (const button of buttons) assert.match(button, /disabled/);
  assert.match(html, /HTML хэт урт/);
});
