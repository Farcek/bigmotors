import Link from "next/link";
import { IconArrowRight, IconHome } from "@tabler/icons-react";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-card-accent";

export default function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-title" className="flex min-h-[min(640px,calc(100svh-143px))] items-center justify-center bg-search-surface px-4 py-16 text-center text-search-text sm:px-6 sm:py-20">
      <div className="w-full max-w-lg">
        <p aria-hidden="true" className="select-none text-[104px] leading-none font-semibold text-catalog-border sm:text-[160px]">404</p>
        <h1 id="not-found-title" className="mt-5 text-2xl leading-tight font-semibold sm:text-3xl">Хуудас олдсонгүй</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-catalog-muted sm:text-base sm:leading-7">Таны хайсан хуудас байхгүй эсвэл холбоос өөрчлөгдсөн байна.</p>
        <div className="mx-auto mt-8 flex max-w-xs flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center sm:gap-5">
          
          <Link href="/" className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-catalog-muted hover:text-search-text ${focus}`}>
            <IconHome size={18} aria-hidden="true" />Нүүр хуудас
          </Link>
        </div>
      </div>
    </section>
  );
}
