import Image from "next/image";
import Link from "next/link";
import logo from "./logo.svg";
import searchIcon from "./icon.search.svg";
import menuIcon from "./icon.menu.svg";

const toolClassName = "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300 sm:w-[70px]";

export function SiteHeader() {
  return (
    <header className="flex h-[143px] shrink-0 items-center justify-between gap-4 bg-[#1b1b1b] px-4 sm:px-6 lg:px-8 xl:px-[120px]">
      <Link
        href="/"
        aria-label="BigMotors LLC нүүр хуудас"
        className="block w-[370.616px] min-w-0 shrink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
      >
        <Image src={logo} alt="BigMotors LLC" width={370.616} height={53.85} unoptimized loading="eager" className="h-auto w-full" />
      </Link>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <button type="button" className={toolClassName} aria-label="Хайлт" title="Хайлт">
          <Image src={searchIcon} alt="" width={24} height={24} unoptimized />
        </button>
        <button type="button" className={toolClassName} aria-label="Цэс" title="Цэс">
          <Image src={menuIcon} alt="" width={24} height={16} unoptimized />
        </button>
      </div>
    </header>
  );
}
