import type { RouteObject } from "react-router";
import { AdminLayout } from "./layout/AdminLayout";
import { HomePage } from "./pages/Home";
import { NotFoundPage } from "./pages/NotFound";
import { ReferencesPage } from "./pages/References";
import { RouteErrorPage } from "./pages/RouteError";
import { RouteLoading } from "./pages/RouteLoading";
import { referenceRoutes } from "./pages/references/routes";

export type PageHandle = { title: string };

export const routes: RouteObject[] = [
  {
    id: "admin",
    path: "/",
    Component: AdminLayout,
    ErrorBoundary: RouteErrorPage,
    HydrateFallback: RouteLoading,
    children: [
      { id: "pages", path: "pages", lazy: async () => ({ Component: (await import("./pages/pages/PagesPage")).PagesPage }), handle: { title: "Хуудас" } satisfies PageHandle },
      { id: "page-new", path: "pages/new", lazy: async () => ({ Component: (await import("./pages/pages/PageEditPage")).PageEditPage }), handle: { title: "Хуудас нэмэх" } satisfies PageHandle },
      { id: "page-edit", path: "pages/:id/edit", lazy: async () => ({ Component: (await import("./pages/pages/PageEditPage")).PageEditPage }), handle: { title: "Хуудас засах" } satisfies PageHandle },
      { id: "galleries", path: "galleries", lazy: async () => ({ Component: (await import("./pages/gallery/GalleryPage")).GalleryPage }), handle: { title: "Gallery" } satisfies PageHandle },
      { id: "gallery-items", path: "galleries/:id", lazy: async () => ({ Component: (await import("./pages/gallery/GalleryPage")).GalleryPage }), handle: { title: "Gallery зургууд" } satisfies PageHandle },
      { id: "vehicles", path: "vehicles", lazy: async () => ({ Component: (await import("./pages/vehicles/VehiclesPage")).VehiclesPage }), handle: { title: "Автомашин" } satisfies PageHandle },
      { id: "vehicle-new", path: "vehicles/new", lazy: async () => ({ Component: (await import("./pages/vehicles/VehicleEditPage")).VehicleEditPage }), handle: { title: "Автомашин нэмэх" } satisfies PageHandle },
      { id: "vehicle-edit", path: "vehicles/:id/edit", lazy: async () => ({ Component: (await import("./pages/vehicles/VehicleEditPage")).VehicleEditPage }), handle: { title: "Автомашин засах" } satisfies PageHandle },
      {
        id: "vehicle-hierarchy",
        path: "references/vehicle-hierarchy",
        lazy: async () => ({ Component: (await import("./pages/references/vehicle-hierarchy/VehicleHierarchyPage")).VehicleHierarchyPage }),
        handle: { title: "Марк / Загвар / Хувилбар" } satisfies PageHandle,
      },
      {
        id: "tire-hierarchy",
        path: "references/tire-hierarchy",
        lazy: async () => ({ Component: (await import("./pages/references/tire-hierarchy/TireHierarchyPage")).TireHierarchyPage }),
        handle: { title: "Дугуйн брэнд / Загвар" } satisfies PageHandle,
      },
      ...referenceRoutes,
      {
        id: "home",
        index: true,
        Component: HomePage,
        handle: { title: "Home" } satisfies PageHandle,
      },
      {
        id: "references",
        path: "references",
        Component: ReferencesPage,
        handle: { title: "Лавлах" } satisfies PageHandle,
      },
      {
        id: "colors",
        path: "references/colors",
        lazy: async () => ({ Component: (await import("./pages/colors/ColorsPage")).ColorsPage }),
        handle: { title: "Өнгө" } satisfies PageHandle,
      },
      {
        id: "demo",
        path: "demo",
        lazy: async () => ({ Component: (await import("./pages/demo/DemoLayout")).DemoLayout }),
        children: [
          { id: "demo-index", index: true, lazy: async () => ({ Component: (await import("./pages/demo/DemoIndex")).DemoIndexPage }), handle: { title: "UI Demo" } satisfies PageHandle },
          { id: "demo-list", path: "list", lazy: async () => ({ Component: (await import("./pages/demo/DemoList")).DemoListPage }), handle: { title: "Жишээ жагсаалт" } satisfies PageHandle },
          { id: "demo-form", path: "form", lazy: async () => ({ Component: (await import("./pages/demo/DemoForm")).DemoFormPage }), handle: { title: "Жишээ форм" } satisfies PageHandle },
        ],
      },
      {
        id: "not-found",
        path: "*",
        Component: NotFoundPage,
        handle: { title: "Хуудас олдсонгүй" } satisfies PageHandle,
      },
    ],
  },
];
