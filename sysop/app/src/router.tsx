import type { RouteObject } from "react-router";
import { AdminLayout } from "./layout/AdminLayout";
import { HomePage } from "./pages/Home";
import { NotFoundPage } from "./pages/NotFound";
import { ReferencesPage } from "./pages/References";
import { RouteErrorPage } from "./pages/RouteError";
import { RouteLoading } from "./pages/RouteLoading";

export type PageHandle = { title: string };

export const routes: RouteObject[] = [
  {
    id: "admin",
    path: "/",
    Component: AdminLayout,
    ErrorBoundary: RouteErrorPage,
    HydrateFallback: RouteLoading,
    children: [
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
