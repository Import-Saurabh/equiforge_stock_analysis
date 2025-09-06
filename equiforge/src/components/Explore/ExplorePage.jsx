import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ added
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function Explore() {
  const [marketData, setMarketData] = useState([]);
  const [indexData, setIndexData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("gainers"); // gainers | losers
  const [capFilter, setCapFilter] = useState("All"); // All | Small | Mid | Large

  const navigate = useNavigate(); // ✅ navigation hook

  useEffect(() => {
    // Fetch Top Gainers / Losers
    const fetchMarketData = async () => {
      try {
        const res = await fetch("http://localhost:8000/mkt/movers", {
          headers: { 
            "x-api-key": "supersecrettoken123",
            "Content-Type": "application/json"
          },
          mode: "cors"
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`HTTP error! Status: ${res.status}, Response: ${errorText}`);
        }

        const data = await res.json();
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

        setMarketData(combined);
      } catch (error) {
        console.error("❌ Error fetching gainers/losers:", error);
        setMarketData([]);
      }
    };

    // Fetch Indices
    const fetchIndexData = async () => {
      try {
        const endpoints = [
          "/mkt/nifty50",
          "/mkt/sensex",
          "/mkt/banknifty",
          "/mkt/midcap",
        ];
        const promises = endpoints.map((ep) =>
          fetch(`http://localhost:8000${ep}`, {
            headers: { "x-api-key": "supersecrettoken123" },
          }).then((res) => res.json())
        );
        const results = await Promise.all(promises);

        const flattened = results
          .flatMap((r) => (Array.isArray(r) ? r : r.data ?? r))
          .map((idx) => {
            const rawValue =
              idx?.value ??
              idx?.lastPrice ??
              idx?.price ??
              idx?.close ??
              idx?.last ??
              0;
            const rawChange = idx?.change ?? idx?.delta ?? idx?.diff ?? 0;
            const rawPct =
              idx?.change_percent ??
              idx?.changePct ??
              idx?.change_percent_raw ??
              idx?.percent ??
              0;

            return {
              name: idx?.name ?? "—",
              symbol: idx?.symbol ?? idx?.ticker ?? "",
              value: Number(rawValue) || 0,
              change: Number(rawChange) || 0,
              change_percent: Number(rawPct) || 0,
            };
          });

        setIndexData(flattened);
        console.log("✅ Index data fetched successfully:", flattened.length, "indices");
      } catch (error) {
        console.error("❌ Error fetching index data:", error);
        setIndexData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
    fetchIndexData();

    const interval = setInterval(() => {
      fetchMarketData();
      fetchIndexData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // helpers
  const getInitials = (name) => {
    if (!name) return "–";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const formatPrice = (num) =>
    `₹${(Number(num) || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  const NextArrow = ({ onClick }) => (
    <div
      className="absolute top-1/2 right-0 transform -translate-y-1/2 z-10 cursor-pointer w-5 h-5 bg-white rounded-full flex items-center justify-center shadow"
      onClick={onClick}
    >
      <span className="text-black text-xs">{">"}</span>
    </div>
  );

  const PrevArrow = ({ onClick }) => (
    <div
      className="absolute top-1/2 left-0 transform -translate-y-1/2 z-10 cursor-pointer w-5 h-5 bg-white rounded-full flex items-center justify-center shadow"
      onClick={onClick}
    >
      <span className="text-black text-xs">{"<"}</span>
    </div>
  );

  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2500,
    arrows: true,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    responsive: [
      { breakpoint: 768, settings: { slidesToShow: 1, arrows: true } },
    ],
  };

  if (loading)
    return <div className="text-center py-4">Loading market data...</div>;

  // Filter data
  const filteredData = marketData
    .filter((stock) => {
      const isGainer = stock.change_percent > 0;
      const isLoser = stock.change_percent < 0;
      const capMatch =
        capFilter === "All" ? true : stock.category === `${capFilter} Cap`;

      if (view === "gainers") return isGainer && capMatch;
      if (view === "losers") return isLoser && capMatch;
      return false;
    })
    .sort((a, b) =>
      view === "gainers"
        ? b.change_percent - a.change_percent
        : a.change_percent - b.change_percent
    )
    .slice(0, 8);

  // --- Index ticker bar ---
  const IndexTickerBar = ({ items }) => {
    if (!items.length) return null;
    return (
      <div className="w-full bg-white border-t border-b border-gray-100 py-2 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-6 whitespace-nowrap">
            {items.map((it, i) => {
              const name = (it.name || "").toUpperCase();
              const value = Number(it.value) || 0;
              const ch = Number(it.change) || 0;
              const pct = Number(it.change_percent) || 0;
              const colorClass = pct >= 0 ? "text-green-500" : "text-red-500";

              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="text-xs font-semibold text-gray-500 tracking-wider">
                    {name}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <div className="text-sm font-bold text-gray-900">
                      {value.toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className={`text-sm font-medium ${colorClass}`}>
                      {ch >= 0 ? "+" : ""}
                      {ch.toFixed(2)}{" "}
                      <span className="text-xs opacity-80">
                        ({pct >= 0 ? "+" : ""}
                        {pct.toFixed(2)}%)
                      </span>
                    </div>
                  </div>

                  {i < items.length - 1 && (
                    <div className="h-6 border-l border-gray-200 ml-3" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 space-y-6">
      <IndexTickerBar items={indexData} />

      {/* Slider */}
      <Slider {...settings}>
        {filteredData.map((item, idx) => (
          <div key={idx} className="px-0.5">
            <div
              className="bg-white shadow-sm rounded-lg px-3 py-2 flex items-center justify-between border border-gray-200 w-[150px] sm:w-[180px] h-[50px] sm:h-[55px] mx-auto cursor-pointer hover:shadow-md"
              onClick={() => navigate(`/stock/${item.symbol || item.name}`)} // ✅ forward to detail
            >
              <span className="text-xs sm:text-sm font-semibold text-orange-600">
                {item.name}
              </span>
              <div className="flex items-center space-x-1">
                <span className="text-xs sm:text-sm font-bold text-gray-800">
                  {item.price?.toLocaleString("en-IN") ?? "—"}
                </span>
                <span
                  className={`text-xs font-medium ${
                    item.change_percent >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {item.change_percent >= 0
                    ? `+${item.change_percent}`
                    : item.change_percent}
                  %
                </span>
              </div>
            </div>
          </div>
        ))}
      </Slider>

      {/* Top Movers Card */}
      <div className="bg-white rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Top {view === "gainers" ? "Gainers" : "Losers"}
          </h2>
        </div>

        {/* View buttons */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setView("gainers")}
            className={`px-4 py-1 rounded-full text-sm font-medium border ${
              view === "gainers"
                ? "bg-green-50 text-green-600 border-green-100"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            Gainers
          </button>
          <button
            onClick={() => setView("losers")}
            className={`px-4 py-1 rounded-full text-sm font-medium border ${
              view === "losers"
                ? "bg-red-50 text-red-600 border-red-100"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            Losers
          </button>
        </div>

        {/* Cap pills */}
        <div className="flex gap-3 mb-6">
          {["Large", "Mid", "Small"].map((cap) => (
            <button
              key={cap}
              onClick={() => setCapFilter(cap)}
              className={`px-3 py-1 rounded-full text-sm font-medium border ${
                capFilter === cap
                  ? "bg-green-50 text-green-600 border-green-100"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              {cap}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {filteredData.map((stock, idx) => {
            const ch = Number(stock.change) || Number(stock.lastChange) || 0;
            const chPct = Number(stock.change_percent) || 0;
            return (
              <div
                key={idx}
                onClick={() => navigate(`/stock/${stock.symbol || stock.name}`)} // ✅ forward to detail
                className="bg-white border border-gray-100 rounded-md shadow-sm p-4 flex flex-col cursor-pointer hover:shadow-md transition"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-gray-50 flex items-center justify-center border border-gray-100">
                    <span className="text-sm font-semibold text-gray-700">
                      {getInitials(stock.name)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">
                      {stock.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {stock.category}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-lg font-bold text-gray-900">
                    {formatPrice(stock.price ?? stock.value ?? stock.last ?? 0)}
                  </div>
                  <div
                    className={`mt-1 text-sm font-medium ${
                      chPct >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    <span className="font-semibold">
                      {ch >= 0 ? "+" : ""}
                      {Number(ch).toFixed(2)}
                    </span>
                    <span className="ml-2 opacity-80">
                      ({chPct >= 0 ? "+" : ""}
                      {Number(chPct).toFixed(2)}%)
                    </span>
                    
                  </div>
                </div>
                
              </div>
            );
          })}
        </div>
        <div className="pt-8 justify-end ">
          <button onClick={() => navigate("/gain-loss")}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 transition"
          >see</button> 
        </div>
      </div>
    </div>
  );
}
