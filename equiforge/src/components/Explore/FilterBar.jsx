import React from "react";

export default function FilterBar({
  stocks,
  sector,
  setSector,
  sort,
  setSort,
  search,
  setSearch,
}) {
  const uniqueSectors = ["All", ...new Set(stocks.map((s) => s.sector))];

  return (
    <div className="mb-6 grid md:grid-cols-4 gap-4 items-center">
      {/* Search Input */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or symbol"
        className="px-4 py-2 border rounded-md w-full"
      />

      {/* Sector Dropdown */}
      <select
        value={sector}
        onChange={(e) => setSector(e.target.value)}
        className="px-4 py-2 border rounded-md w-full"
      >
        {uniqueSectors.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Sort Dropdown */}
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        className="px-4 py-2 border rounded-md w-full"
      >
        <option value="none">No Sort</option>
        <option value="gainers">Top Gainers</option>
        <option value="losers">Top Losers</option>
      </select>
    </div>
  );
}
