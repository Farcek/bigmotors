"use client";

import { useState } from "react";
import HomeSearcher from "../home.searcher";
import HomeSearchGrid from "../home.search.grid";
import type { GridColumns, HomeSearchFilters, VehicleConditionFilter } from "../home.searcher/model";

export default function HomeSearch() {
  const [filters, setFilters] = useState<HomeSearchFilters>({});
  const [page, setPage] = useState(1);
  const [columns, setColumns] = useState<GridColumns>(4);

  const changeFilters = (next: HomeSearchFilters) => {
    setFilters(next);
    setPage(1);
  };
  const changeCondition = (condition: VehicleConditionFilter) => changeFilters({ ...filters, condition });

  return <div className="relative mt-4 pb-12 lg:-mt-12 lg:pb-16">
    <HomeSearcher condition={(filters.condition ?? "") as VehicleConditionFilter} onConditionChange={changeCondition} onFiltersChange={changeFilters} onSearch={changeFilters} />
    <div className="mt-8 lg:mt-12">
      {/* Three pages are a UI preview until the vehicle query provides the actual count. */}
      <HomeSearchGrid filters={filters} page={page} pageCount={3} columns={columns} onConditionChange={changeCondition} onPageChange={setPage} onColumnsChange={(value) => { setColumns(value); setPage(1); }} />
    </div>
  </div>;
}
