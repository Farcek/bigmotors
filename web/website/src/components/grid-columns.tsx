"use client";

import { IconSquare, IconSquareFilled } from "@tabler/icons-react";
import type { GridColumns } from "./home.searcher/model";

const columnClasses = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 6: "grid-cols-6" } as const;

export function GridColumnControl({ columns, onChange }: { columns: GridColumns; onChange: (columns: GridColumns) => void }) {
  return <div role="group" aria-label="Grid баганын тоо" className="hidden items-center gap-1 lg:flex">
    {([2, 3, 4, 6] as const).map((value) => {
      const Square = columns === value ? IconSquareFilled : IconSquare;
      return <button key={value} type="button" aria-label={`${value} багана`} title={`${value} багана`} aria-pressed={columns === value} onClick={() => onChange(value)} className={`flex h-11 min-w-11 items-center justify-center rounded px-2 text-current hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${columns === value ? "opacity-100" : "opacity-60"}`}>
        <span aria-hidden="true" className={`grid gap-0.5 ${columnClasses[value]}`}>
          {Array.from({ length: value * 2 }, (_, index) => <Square key={index} size={7} stroke={1.5} />)}
        </span>
      </button>;
    })}
  </div>;
}
