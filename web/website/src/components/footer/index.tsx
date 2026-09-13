import { getVehicleSearchHref } from "@bigmotors/core";
import { IconMapPin } from "@tabler/icons-react";
import { BodyContainer } from "../helper";
import { COMPANY_ADDRESS, COMPANY_DESCRIPTION } from "../company-info";

const sections = [
  { title: "Каталог", links: [
    { label: "Автомашин", href: "/vehicles" },
    { label: "Сэлбэг хэрэгсэл", href: "/parts" },
    { label: "Дугуй", href: "/tires" },
  ] },
  { title: "Автомашин", links: [
    { label: "Бүх автомашин", href: "/vehicles" },
    { label: "Шинэ автомашин", href: getVehicleSearchHref({ condition: "new" }) },
    { label: "Хуучин автомашин", href: getVehicleSearchHref({ condition: "used" }) },
  ] },
  { title: "Түлшний төрөл", links: [
    { label: "Бензин", href: getVehicleSearchHref({ fuel: "gasoline" }) },
    { label: "Дизель", href: getVehicleSearchHref({ fuel: "diesel" }) },
    { label: "Хайбрид", href: getVehicleSearchHref({ fuel: "hybrid" }) },
    { label: "Цахилгаан", href: getVehicleSearchHref({ fuel: "electric" }) },
  ] },
  { title: "Компани", links: [
    { label: "Нүүр хуудас", href: "/" },
    { label: "Бидний тухай", href: "#footer-about" },
    { label: "Хаяг, байршил", href: "#footer-address" },
  ] },
] as const;

export function SiteFooter() {
  return <footer id="site-footer" className="bg-section-dark-bg py-10 text-section-dark-text sm:py-14 lg:py-16">
    <BodyContainer>
      <nav aria-label="Footer цэс" className="grid grid-cols-1 gap-x-8 gap-y-8 min-[360px]:grid-cols-2 lg:grid-cols-4">
        {sections.map((section) => <div key={section.title} className="min-w-0">
          <h2 className="mb-3 text-sm font-medium">{section.title}</h2>
          <ul className="space-y-1">
            {section.links.map((link) => <li key={link.label}>
              <a href={link.href} className="inline-flex min-h-10 items-center break-words text-sm leading-6 text-section-dark-text/65 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">{link.label}</a>
            </li>)}
          </ul>
        </div>)}
      </nav>
      <div className="mt-10 border-b border-section-dark-text/15 pb-5 sm:mt-14">
        <a href="/" className="text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">BigMotors LLC</a>
      </div>
      <address id="footer-address" className="mt-5 flex scroll-mt-6 items-start gap-2 text-xs leading-6 text-section-dark-text/65 not-italic">
        <IconMapPin size={16} className="mt-1 shrink-0" aria-hidden="true" />
        <span>{COMPANY_ADDRESS}</span>
      </address>
      <p id="footer-about" className="mt-5 scroll-mt-6 text-xs leading-6 text-section-dark-text/65">
        {COMPANY_DESCRIPTION}
      </p>
    </BodyContainer>
  </footer>;
}
