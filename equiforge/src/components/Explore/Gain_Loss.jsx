import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Gain_Loss() {
  const [view, setView] = useState("gainers"); // gainers | losers
  const [capFilter, setCapFilter] = useState("All"); // All | Large | Mid | Small
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:8000/mkt/movers", {
          headers: { 
            "x-api-key": "supersecrettoken123",
            "Content-Type": "application/json"
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        
        const data = await res.json();
        
        // Process data similar to ExplorePage.jsx
        let combined = [];
        const categories = data.LargeCap
          ? ["LargeCap", "MidCap", "SmallCap"]
          : Object.keys(data);

        categories.forEach((cat) => {
          const categoryData = data[cat] || { gainers: [], losers: [] };
          const displayCategory = {
            LargeCap: "Large Cap",
            MidCap: "Mid Cap",
            SmallCap: "Small Cap",
          }[cat] || cat;

          // Add gainers and losers with their category
          combined = [
            ...combined,
            ...(categoryData.gainers || []).map((item) => ({
              ...item,
              category: displayCategory,
              name: item.name || item.symbol,
            })),
            ...(categoryData.losers || []).map((item) => ({
              ...item,
              category: displayCategory,
              name: item.name || item.symbol,
            })),
          ];
        });

        setStocks(combined);
      } catch (err) {
        console.error("❌ Error fetching gain/loss data:", err);
        setStocks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter stocks based on view and cap filter
  const filteredStocks = stocks
    .filter((stock) => {
      const isGainer = stock.change_percent > 0;
      const isLoser = stock.change_percent < 0;
      const capMatch = capFilter === "All" 
        ? true 
        : stock.category === `${capFilter} Cap`;

      if (view === "gainers") return isGainer && capMatch;
      if (view === "losers") return isLoser && capMatch;
      return false;
    })
    .sort((a, b) =>
      view === "gainers"
        ? b.change_percent - a.change_percent
        : a.change_percent - b.change_percent
    )
    .slice(0, 50); // Top 20

  if (loading) return <div className="text-center py-4">Loading market data...</div>;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      {/* View Tabs */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setView("gainers")}
          className={`px-4 py-2 rounded-full text-sm font-medium border ${
            view === "gainers"
              ? "bg-green-50 text-green-600 border-green-200"
              : "bg-white text-gray-700 border-gray-200"
          }`}
        >
          Top gainers
        </button>
        <button
          onClick={() => setView("losers")}
          className={`px-4 py-2 rounded-full text-sm font-medium border ${
            view === "losers"
              ? "bg-red-50 text-red-600 border-red-200"
              : "bg-white text-gray-700 border-gray-200"
          }`}
        >
          Top losers
        </button>
      </div>

      {/* Cap Filter Pills */}
      <div className="flex gap-3 mb-6">
        {["All", "Large", "Mid", "Small"].map((cap) => (
          <button
            key={cap}
            onClick={() => setCapFilter(cap)}
            className={`px-3 py-1 rounded-full text-sm font-medium border ${
              capFilter === cap
                ? "bg-blue-50 text-blue-600 border-blue-100"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            {cap === "All" ? "All Caps" : `${cap} Cap`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600 font-medium">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Change</th>
              <th className="px-4 py-3">Change %</th>
            </tr>
          </thead>
          <tbody>
            {filteredStocks.length > 0 ? (
              filteredStocks.map((stock, idx) => {
                const isPositive = stock.change_percent >= 0;
                return (
                  <tr
                    key={idx}
                    className="border-t border-gray-100 hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => navigate(`/stock/${stock.symbol || stock.name}`)}
                  >
                    {/* Company */}
                    <td className="px-4 py-3 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md text-xs font-semibold text-gray-600">
                          {stock.name?.[0] ?? "?"}
                        </div>
                        {stock.name}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-gray-600">
                      {stock.category}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-gray-900 font-semibold">
                      ₹{(stock.price || 0).toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    {/* Change */}
                    <td className="px-4 py-3">
                      <div className={`font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
                        {isPositive ? "+" : ""}
                        {((stock.price || 0) - (stock.price || 0) / (1 + (stock.change_percent || 0) / 100)).toFixed(2)}
                      </div>
                    </td>

                    {/* Change Percentage */}
                    <td className="px-4 py-3">
                      <div className={`font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
                        {isPositive ? "+" : ""}
                        {Number(stock.change_percent).toFixed(2)}%
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="px-4 py-4 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}