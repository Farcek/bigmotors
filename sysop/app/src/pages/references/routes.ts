import type { RouteObject } from "react-router";
import { createElement } from "react";

export const referenceRoutes: RouteObject[] = [
  { slug: "branches", title: "Салбар" },
  { slug: "locations", title: "Бүтээгдэхүүний байршил" },
  { slug: "vehicle-brands", title: "Автомашины марк" },
  { slug: "vehicle-models", title: "Автомашины загвар" },
  { slug: "vehicle-variants", title: "Хувилбар" },
  { slug: "vehicle-body-types", title: "Кузовын төрөл" },
  { slug: "vehicle-features", title: "Тоноглол" },
  { slug: "part-brands", title: "Сэлбэгийн брэнд" },
  { slug: "part-categories", title: "Сэлбэгийн ангилал" },
  { slug: "tire-brands", title: "Дугуйн брэнд" },
  { slug: "tire-models", title: "Дугуйн загвар" },
].map(({ slug, title }) => ({
  id: slug,
  path: `references/${slug}`,
  handle: { title },
  lazy: async () => {
    const { ReferencePage } = await import("./ReferencePage");
    const { referenceDefinitions } = await import("./definitions");
    return { Component: () => createElement(ReferencePage, { key: slug, definition: referenceDefinitions[slug] }) };
  },
}));
