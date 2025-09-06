import { useEffect, useState } from "react";

export default function Nifty50Page() {
  const [niftyData, setNiftyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cachedData = localStorage.getItem("nifty50Data");
    const cacheTime = localStorage.getItem("nifty50CacheTime");

    const isCacheValid =
      cachedData && cacheTime && Date.now() - parseInt(cacheTime) < 10 * 60 * 1000;

    if (isCacheValid) {
      setNiftyData(JSON.parse(cachedData));
      setLoading(false);
      console.log("📦 Nifty50 loaded from cache");
    } else {
      fetch("/api/nifty50")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch Nifty 50 data");
          return res.json();
        })
        .then((data) => {
          localStorage.setItem("nifty50Data", JSON.stringify(data));
          localStorage.setItem("nifty50CacheTime", Date.now().toString());
          setNiftyData(data);
          setLoading(false);
          console.log("📡 Nifty50 fetched from API");
        })
        .catch((error) => {
          console.error("❌ Error fetching Nifty 50 data:", error);
          setLoading(false);
        });
    }
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">📈 Nifty 50 Stocks</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {niftyData.map((stock, index) => (
            <div
              key={index}
              className="border rounded-xl shadow p-4 hover:shadow-lg transition"
            >
              <h2 className="text-lg font-semibold">{stock.name}</h2>
              <p>Symbol: {stock.symbol}</p>
              <p>
                Change:{" "}
                <span className={stock.change_percent >= 0 ? "text-green-500" : "text-red-500"}>
                  {stock.change_percent?.toFixed(2)}%
                </span>
              </p>
              <p>PE Ratio: {stock.pe_ratio}</p>
              <p>Price: ₹{stock.price.toLocaleString()}</p>
              <p>Market Cap: ₹{(stock.market_cap / 1e9).toFixed(2)} B</p>
              <p>Sector: {stock.sector}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
