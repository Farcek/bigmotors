import { IconArrowRight, IconPhoto } from "@tabler/icons-react";
import { BodyContainer } from "../helper";

export type HomeProductGroupItem = {
  id: string;
  title: string;
  imageUrl: string | null;
  href: string;
  total: number;
};

const countFormat = new Intl.NumberFormat("en-US");

export default function HomeProductGroups({ items }: { items: HomeProductGroupItem[] }) {
  if (items.length === 0) return null;
  return <section aria-labelledby="home-product-groups-heading" className="bg-search-surface py-10 text-search-text sm:py-14 lg:py-16">
    <BodyContainer>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 sm:mb-8">
        <h2 id="home-product-groups-heading" className="text-xl font-semibold">Төрлөөр нь үзэх</h2>
        <a href="/vehicles" className="inline-flex min-h-11 items-center gap-3 rounded-md border border-search-border px-4 text-xs font-medium hover:bg-card-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-card-accent">
          Бүгдийг харах <IconArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {items.map((item) => <li key={item.id} className="min-w-0">
          <a href={item.href} className="group flex h-full flex-col overflow-hidden rounded-md border border-search-border p-1 transition-colors hover:border-card-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-card-accent">
            <div className="flex aspect-[2.15/1] shrink-0 items-center justify-center overflow-hidden rounded bg-card-subtle">
              {item.imageUrl
                ? <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain" />
                : <IconPhoto size={32} className="text-search-muted" aria-hidden="true" />}
            </div>
            <div className="flex flex-1 flex-col p-2.5">
              <h3 title={item.title} className="mb-3 line-clamp-2 min-h-12 break-words text-base leading-6 font-semibold">{item.title}</h3>
              <div className="mt-auto flex items-center justify-between gap-2">
                <span className="rounded bg-card-subtle px-2 py-1 text-xs">{countFormat.format(item.total)} Автомашин</span>
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-card-subtle group-hover:bg-primary"><IconArrowRight size={14} aria-hidden="true" /></span>
              </div>
            </div>
          </a>
        </li>)}
      </ul>
    </BodyContainer>
  </section>;
}
