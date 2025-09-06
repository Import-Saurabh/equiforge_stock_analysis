import React from "react";

export default function StockCard({ stock }) {
  const { symbol, name, price, change_percent, sector, pe_ratio } = stock;
  const isPositive = change_percent >= 0;

  return (
    <div className="border rounded-xl p-4 shadow hover:shadow-md transition">
      <h2 className="text-lg font-bold text-orange-600">{symbol}</h2>
      <p className="text-sm text-gray-500 mb-2">{name}</p>
      <p className="text-md font-semibold">₹{price.toFixed(2)}</p>
      <p className={`text-sm ${isPositive ? "text-green-600" : "text-red-600"}`}>
        {isPositive ? "+" : ""}
        {change_percent.toFixed(2)}%
      </p>
      <p className="text-xs text-gray-400 mt-2">Sector: {sector}</p>
      <p className="text-xs text-gray-400">P/E Ratio: {pe_ratio?.toFixed(2)}</p>
    </div>
  );
}
