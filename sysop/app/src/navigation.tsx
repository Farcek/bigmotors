import {
  IconCar,
  IconDatabase,
  IconHome,
  IconLayoutDashboard,
  IconPackage,
  IconPhoto,
  IconFileText,
  IconSettings,
  IconWheel,
} from "@tabler/icons-react";
import type { TablerIcon } from "@tabler/icons-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: TablerIcon;
  disabled?: boolean;
};

export type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

export const navigationSections = [
  {
    label: "Үндсэн",
    items: [
      { label: "Home", href: "/", icon: IconHome },
      { label: "Лавлах", href: "/references", icon: IconDatabase },
      { label: "Gallery", href: "/galleries", icon: IconPhoto },
      { label: "Хуудас", href: "/pages", icon: IconFileText },
    ],
  },
  {
    label: "Каталог",
    items: [
      { label: "Автомашин", href: "/vehicles", icon: IconCar },
      {
        label: "Сэлбэг хэрэгсэл",
        href: "/parts",
        icon: IconPackage,
        disabled: true,
      },
      { label: "Дугуй", href: "/tires", icon: IconWheel, disabled: true },
    ],
  },
  {
    label: "Website",
    items: [
      { label: "Нүүр хуудас", href: "/website/home", icon: IconHome },
    ],
  },
  {
    label: "Систем",
    items: [
      { label: "UI Demo", href: "/demo", icon: IconLayoutDashboard },
      {
        label: "Тохиргоо",
        href: "/settings",
        icon: IconSettings,
      },
    ],
  },
] as const satisfies readonly NavigationSection[];
