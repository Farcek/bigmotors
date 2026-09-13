"use client";

import { IconArrowRight } from "@tabler/icons-react";
import { GridColumnControl } from "../grid-columns";
import { getVehicleSearchHref, homePageCount, type GridColumns, type HomeSearchFilters, type VehicleConditionFilter } from "../home.searcher/model";

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";


export default function HomeSearchGrid({ filters, page, pageCount, columns, onConditionChange, onPageChange, onColumnsChange }: {
  filters: HomeSearchFilters;
  page: number;
  pageCount: number;
  columns: GridColumns;
  onConditionChange: (condition: VehicleConditionFilter) => void;
  onPageChange: (page: number) => void;
  onColumnsChange: (columns: GridColumns) => void;
}) {
  const count = homePageCount(pageCount);
  const currentPage = Math.min(count, Math.max(1, page));

  return <div aria-label="Автомашины жагсаалтын удирдлага" className="grid grid-cols-1 items-center gap-x-6 gap-y-3 text-section-dark-text sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_1fr]">
    <div role="group" aria-label="Машины төлөв" className="flex min-w-0 items-center gap-6">
      {([["used", "Хуучин"], ["new", "Шинэ"], ["", "Бүгд"]] as const).map(([value, label]) => <button
        key={value} type="button" aria-pressed={(filters.condition ?? "") === value}
        onClick={() => onConditionChange(value)}
        className={`min-h-11 rounded text-sm transition-colors hover:text-section-dark-text ${focusClass} ${(filters.condition ?? "") === value ? "font-semibold text-section-dark-text" : "text-section-dark-text/55"}`}
      >{label}</button>)}
    </div>

    <nav aria-label="Нүүр хуудасны автомашины хуудаслалт" className="flex min-h-11 items-center sm:justify-end lg:justify-center">
      {Array.from({ length: count }, (_, index) => index + 1).map((value) => <button
        key={value} type="button" aria-label={`${value}-р хуудас`} title={`${value}-р хуудас`}
        aria-current={currentPage === value ? "page" : undefined} onClick={() => onPageChange(value)}
        className={`group flex h-11 w-8 items-center justify-center rounded ${focusClass}`}
      ><span aria-hidden="true" className={`h-0.5 w-6 transition-colors group-hover:bg-primary ${currentPage === value ? "bg-primary" : "bg-section-dark-text/25"}`} /></button>)}
    </nav>

    <div className="flex min-w-0 items-center justify-between gap-3 sm:col-span-2 sm:justify-end lg:col-span-1">
      <GridColumnControl columns={columns} onChange={onColumnsChange} />
      <a href={getVehicleSearchHref(filters)} className={`flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-section-dark-text/20 px-4 text-sm transition-colors hover:border-primary hover:text-primary sm:w-auto ${focusClass}`}>
        Бүгдийг харах<IconArrowRight size={18} aria-hidden="true" />
      </a>
    </div>
  </div>;
}
