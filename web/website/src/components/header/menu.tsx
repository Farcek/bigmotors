"use client";

import { HeaderOverlay, type HeaderOverlayProps } from "./overlay";
import { IconCar, IconHome, IconMapPin, IconSettings, IconUsers, IconWheel } from "@tabler/icons-react";
import { COMPANY_ADDRESS, COMPANY_DESCRIPTION } from "../company-info";

const links = [
  { label: "Нүүр хуудас", href: "/", icon: IconHome },
  { label: "Автомашин", href: "/vehicles", icon: IconCar },
  { label: "Сэлбэг хэрэгсэл", href: "/parts", icon: IconSettings },
  { label: "Дугуй", href: "/tires", icon: IconWheel },
  { label: "Бидний тухай", href: "#footer-about", icon: IconUsers },
  { label: "Хаяг, байршил", href: "#footer-address", icon: IconMapPin },
] as const;

export function HeaderMenu(props: HeaderOverlayProps) {
  return <HeaderOverlay {...props} label="Цэс" title="Үндсэн цэс">
    {({ close, id }) => <div className="flex min-h-full justify-end px-4 pb-12 sm:px-6 lg:px-8 xl:px-[120px]" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div className="w-full min-w-0 sm:max-w-80">
            <nav aria-label="Үндсэн цэсний холбоосууд">
              <ul className="divide-y divide-section-dark-text/20">
                {links.map(({ label, href, icon: Icon }) => <li key={href}>
                  <a href={href} onClick={close} className="flex min-h-12 items-center gap-4 py-3 text-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <Icon size={22} className="shrink-0" aria-hidden="true" /><span>{label}</span>
                  </a>
                </li>)}
              </ul>
            </nav>
            <section className="mt-9" aria-labelledby={`${id}-company`}>
              <h2 id={`${id}-company`} className="text-lg font-medium">BigMotors LLC</h2>
              <p className="mt-3 text-xs leading-6 text-section-dark-text/70">{COMPANY_DESCRIPTION}</p>
            </section>
            <section className="mt-7" aria-labelledby={`${id}-contact`}>
              <h2 id={`${id}-contact`} className="text-lg font-medium">Холбоо барих</h2>
              <address className="mt-3 flex items-start gap-4 text-xs leading-6 text-section-dark-text/70 not-italic">
                <IconMapPin size={20} className="mt-1 shrink-0 text-primary" aria-hidden="true" /><span>{COMPANY_ADDRESS}</span>
              </address>
            </section>
          </div>

    </div>}
  </HeaderOverlay>;
}
