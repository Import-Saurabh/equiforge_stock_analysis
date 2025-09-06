import { Fragment, useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend
} from "recharts";

// ---------- helpers ----------
const INR = (n, digits = 2) =>
  Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: digits });

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const formatNumberLabel = (n) => {
  if (n === null || n === undefined) return "0";
  const abs = Math.abs(Number(n));
  if (abs >= 1) return Math.round(n).toLocaleString("en-IN");
  return Number(n).toFixed(2);
};

// ✅ Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 shadow rounded border text-xs sm:text-sm">
        <p className="text-gray-600">{label}</p>
        <p className="font-semibold text-black">₹{INR(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

// ✅ Financial Tooltip
const FinancialTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 shadow rounded border text-xs sm:text-sm">
        <p className="text-gray-600 font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="font-semibold" style={{ color: entry.color }}>
            {entry.name}: ₹{INR(entry.value)} Cr
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Label renderer for bars (value above the bar)
const BarValueLabel = (props) => {
  const { x, y, width, value } = props;
  const cx = x + width / 2;
  return (
    <text x={cx} y={y - 6} textAnchor="middle" className="text-xs fill-current text-gray-700" style={{ fontSize: 12 }}>
      {formatNumberLabel(value)}
    </text>
  );
};

// ✅ RangeBar for "Today's Range" / "52W Range"
const RangeBar = ({ low, high, current, color = "#16a34a" }) => {
  const span = Math.max(0, (high ?? 0) - (low ?? 0));
  const posPct =
    span === 0 ? 0 : clamp(((current - low) / span) * 100, 0, 100);
  return (
    <div className="flex-1 mx-3 h-1.5 bg-gray-200 rounded relative">
      <div
        className="absolute left-0 top-0 h-1.5 rounded"
        style={{ width: `${posPct}%`, background: color }}
      />
      <div
        className="absolute -top-1 h-3 w-[2px] bg-gray-700"
        style={{ left: `${posPct}%` }}
      />
    </div>
  );
};

// ----------------- BalanceSheetSection (updated to use bar chart) -----------------
// Update the safeNumber function to better handle currency formatting
const safeNumber = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number(v);
  
  // Handle rupee symbol, commas, and other non-numeric characters
  let str = String(v).trim();
  
  // Remove rupee symbol, commas, and any other non-numeric characters except decimal point and minus sign
  str = str.replace(/[^\d.-]/g, '');
  
  // Handle cases where value might be in parentheses (accounting format)
  if (str.startsWith('(') && str.endsWith(')')) {
    str = '-' + str.slice(1, -1);
  }
  
  const n = parseFloat(str);
  return Number.isFinite(n) ? n : null;
};

const findItemByName = (list = [], name) => {
  if (!list || !name) return null;
  for (const item of list) {
    if (item.item === name) return item;
    if (Array.isArray(item.children)) {
      const found = findItemByName(item.children, name);
      if (found) return found;
    }
  }
  return null;
};

const BalanceSheetSection = ({ years = [], data = [] }) => {
  const [expandedItems, setExpandedItems] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);

  const toggleItem = (itemName) => {
    // toggle expansion for top-level items
    setExpandedItems((prev) => ({ ...prev, [itemName]: !prev[itemName] }));
    setSelectedItem(itemName);
  };

  // When clicking a child row, select it but don't toggle parent expansion
  const selectRow = (itemName) => {
    setSelectedItem(itemName);
  };

  // chartData: find the clicked item anywhere in the tree
  const chartData = useMemo(() => {
    if (!selectedItem) return [];
    const found = findItemByName(data, selectedItem);
    const values = (found && Array.isArray(found.values) ? found.values : []);
    return values.map((value, index) => {
      const num = safeNumber(value);
      return {
        year: years[index] ?? String(index),
        value: num, // can be null if non-numeric
      };
    });
  }, [selectedItem, data, years]);

  // determine Y domain safely (ignore nulls)
  const yValues = chartData.map((d) => d.value).filter((v) => v !== null);
  const yMin = yValues.length ? Math.min(...yValues) : undefined;
  const yMax = yValues.length ? Math.max(...yValues) : undefined;

  return (
    <div className="bg-white text-black shadow-md rounded-2xl p-4 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Balance Sheet</h2>
        <span className="text-sm text-gray-500">(In Cr.)</span>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Balance Sheet Table */}
        <div className="flex-1 overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2 text-left font-semibold text-gray-700">Particulars</th>
                {years.map((year, idx) => (
                  <th key={idx} className="border px-4 py-2 font-semibold text-gray-700">{year}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <Fragment key={`row-${idx}`}>
                  <tr
                    className={`hover:bg-gray-50 cursor-pointer ${selectedItem === row.item ? 'bg-blue-50' : ''}`}
                    onClick={() => toggleItem(row.item)}
                  >
                    <td className="border px-4 py-2 font-medium text-gray-800 flex items-center">
                      <span className="mr-2">{expandedItems[row.item] ? '−' : '+'}</span>
                      {row.item}
                    </td>
                    {row.values.map((val, i) => (
                      <td key={i} className="border px-4 py-2 text-right font-medium">
                        {typeof val === 'string' ? val : val?.toLocaleString('en-IN')}
                      </td>
                    ))}
                  </tr>

                  {/* children (clickable) */}
                  {expandedItems[row.item] && Array.isArray(row.children) && row.children.map((child, cIdx) => (
                    <tr
                      key={`child-${idx}-${cIdx}`}
                      className={`bg-gray-50 hover:bg-gray-100 cursor-pointer ${selectedItem === child.item ? 'bg-blue-50' : ''}`}
                      onClick={() => selectRow(child.item)}
                    >
                      <td className="border px-4 py-2 font-medium text-gray-800 pl-8">
                        {child.item}
                      </td>
                      {child.values.map((val, j) => (
                        <td key={j} className="border px-4 py-2 text-right">
                          {typeof val === 'string' ? val : val?.toLocaleString('en-IN')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Graph Section - Updated to use BarChart */}
        <div className="md:w-1/2 bg-gray-50 p-4 rounded-lg">
          {selectedItem ? (
            <>
              <h3 className="text-lg font-semibold mb-4">{selectedItem} Trend</h3>

              {chartData.length === 0 || yValues.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <p>No numeric data available for this row to plot.</p>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="year" />
                      <YAxis domain={yMin !== undefined && yMax !== undefined ? [Math.min(yMin, 0), yMax] : ["auto", "auto"]} tickFormatter={(v) => v !== null ? INR(v) : "—"} />
                      <Tooltip
                        formatter={(value) => (value === null ? ["—", selectedItem] : [`₹${INR(value)} Cr`, selectedItem])}
                        labelFormatter={(year) => `Year: ${year}`}
                      />
                      <Bar
                        dataKey="value"
                        fill="#16a34a"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="mt-4 text-sm text-gray-600">
                <p>Showing historical trend of {selectedItem.toLowerCase()} from {years[0]} to {years[years.length - 1]}</p>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <p>Click any balance-sheet row to view its trend</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ----------------- Remaining StockDetail component (unchanged) -----------------
export default function StockDetail() {
  const { ticker } = useParams();
  const [fullData, setFullData] = useState([]);
  const [period, setPeriod] = useState("1d");
  const [chartType, setChartType] = useState("line");
  const [companyName, setCompanyName] = useState("");
  const [fundamentals, setFundamentals] = useState(null);
  const [loadingFundamentals, setLoadingFundamentals] = useState(false);
  const [financialData, setFinancialData] = useState(null);
  const [financialView, setFinancialView] = useState("quarterly");
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [loadingBalanceSheet, setLoadingBalanceSheet] = useState(false);

  const normalizedTicker = ticker?.includes(":1")
    ? ticker.replace(":1", ".NS")
    : ticker;

  useEffect(() => {
    if (!normalizedTicker) return;

    // Fetch historical chart data
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `http://localhost:8000/api/history/${normalizedTicker}?period=5y`
        );

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json = await res.json();

        if (json && json.candles) {
          const formatted = json.candles.map((d) => {
            const dt = new Date(d.date);
            return {
              date: dt,
              ts: dt.getTime(),
              dateLabel: dt.toLocaleDateString("en-IN"),
              open: Number(d.open ?? d.close),
              high: Number(d.high ?? d.close),
              low: Number(d.low ?? d.close),
              close: Number(d.close),
              volume: Number(d.volume ?? 0),
            };
          });
          setFullData(formatted);
        }

        setCompanyName(json?.info?.longName || ticker);
      } catch (err) {
        console.error("❌ Failed to fetch chart data:", err);
        setError(err.message);
        setCompanyName(ticker);

        // Fallback dummy data if API fails
        const dummyData = Array.from({ length: 100 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          ts: Date.now() - i * 24 * 60 * 60 * 1000,
          dateLabel: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN"),
          open: 100 + Math.random() * 20,
          high: 110 + Math.random() * 20,
          low: 95 + Math.random() * 15,
          close: 105 + Math.random() * 15,
          volume: 1000000 + Math.random() * 500000,
        })).reverse();
        setFullData(dummyData);
      } finally {
        setLoading(false);
      }
    };

    // ✅ Fetch fundamentals via FastAPI (no DB insertion)
    const fetchFundamentals = async () => {
      setLoadingFundamentals(true);
      try {
        const res = await fetch(
          `http://localhost:8000/api/fundamentals/${normalizedTicker}`
        );
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const json = await res.json();
        setFundamentals(json);
      } catch (err) {
        console.error("❌ Failed to fetch fundamentals:", err);
      } finally {
        setLoadingFundamentals(false);
      }
    };

    // Fetch financial data
    const fetchFinancialData = async () => {
      setLoadingFinancials(true);
      try {
        const res = await fetch(
          `http://localhost:8000/api/financials/${normalizedTicker}`
        );
        if (!res.ok) {
          console.warn(`Financials fetch failed with status ${res.status}`);
          setFinancialData(null);
          return;
        }

        const json = await res.json();

        if (json && (Array.isArray(json.quarterly) || Array.isArray(json.yearly))) {
          setFinancialData({
            quarterly: json.quarterly || [],
            yearly: json.yearly || []
          });
        } else {
          console.warn("Unexpected financials payload shape:", json);
          setFinancialData(null);
        }
      } catch (err) {
        console.error("❌ Failed to fetch financial data:", err);
        setFinancialData(null);
      } finally {
        setLoadingFinancials(false);
      }
    };

    // Fetch balance sheet data
    const fetchBalanceSheet = async () => {
      setLoadingBalanceSheet(true);
      try {
        const res = await fetch(
          `http://localhost:8000/api/balance-sheet/${normalizedTicker}`
        );
        if (res.ok) {
          const data = await res.json();
          // Expecting shape: { years: [...], data: [ { item: '...', values: [...], children: [...] }, ... ] }
          setBalanceSheet(data);
        } else {
          console.warn(`Balance sheet fetch failed with status ${res.status}`);
        }
      } catch (err) {
        console.error("❌ Failed to fetch balance sheet:", err);
      } finally {
        setLoadingBalanceSheet(false);
      }
    };

    fetchData();
    fetchFundamentals();
    fetchFinancialData();
    fetchBalanceSheet();
  }, [ticker, normalizedTicker]);

  // Filter data by period
  const filteredData = useMemo(() => {
    if (!fullData.length) return [];
    const endIdx = fullData.length - 1;
    let cutoffDays;

    switch (period) {
      case "1d": cutoffDays = 1; break;
      case "1w": cutoffDays = 7; break;
      case "1m": cutoffDays = 30; break;
      case "3m": cutoffDays = 90; break;
      case "6m": cutoffDays = 180; break;
      case "1y": cutoffDays = 365; break;
      case "3y": cutoffDays = 365 * 3; break;
      case "5y": cutoffDays = 365 * 5; break;
      default: cutoffDays = null;
    }

    if (!cutoffDays) return fullData;

    const endTs = fullData[endIdx].ts;
    const startTs = endTs - cutoffDays * 24 * 60 * 60 * 1000;
    return fullData.filter((d) => d.ts >= startTs);
  }, [fullData, period]);

  if (loading) {
    return <p className="text-center">Loading chart...</p>;
  }

  if (error) {
    return (
      <div className="p-3 sm:p-6 max-w-6xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <p className="mt-2">Showing dummy data for demonstration.</p>
        </div>
      </div>
    );
  }

  const latest = filteredData[filteredData.length - 1] || {};
  const baseline = filteredData.length > 1
    ? filteredData[0]
    : fullData[fullData.length - 2] || filteredData[0] || {};

  const change = (latest?.close ?? 0) - (baseline?.close ?? 0);
  const changePct = baseline?.close
    ? (((latest.close / baseline.close) - 1) * 100).toFixed(2)
    : "0.00";
  const lineColor = change >= 0 ? "#16a34a" : "#dc2626";

  // Today's values
  const dayLow = latest.low ?? latest.close ?? 0;
  const dayHigh = latest.high ?? latest.close ?? 0;
  const dayOpen = latest.open ?? baseline?.close ?? latest.close ?? 0;
  const dayPrevClose = fullData.length > 1
    ? fullData[fullData.length - 2].close
    : latest.open ?? latest.close ?? 0;
  const dayCurrent = latest.close ?? 0;

  // 52W range
  const oneYearAgoTs = (latest.ts ?? Date.now()) - 365 * 24 * 60 * 60 * 1000;
  const lastYearSlice = fullData.filter((d) => d.ts >= oneYearAgoTs);
  const hasYear = lastYearSlice.length > 0 ? lastYearSlice : fullData;
  const fiftyTwoWeekLow = Math.min(...hasYear.map((d) => d.low ?? d.close ?? Infinity));
  const fiftyTwoWeekHigh = Math.max(...hasYear.map((d) => d.high ?? d.close ?? -Infinity));

  // Totals
  const volume = latest.volume ?? 0;
  const tradedValueCr = ((latest.close ?? 0) * volume) / 1e7;

  const chartData = filteredData.map((d) => ({
    dateLabel: d.dateLabel,
    close: d.close,
  }));

  // Financials: derive data for current view & metric
  const currentFinancialList = financialData ? (financialData[financialView] || []) : [];
  const metricData = currentFinancialList.map((r) => ({
    period: r.period,
    revenue: Number(r.revenue || 0),
    profit: Number(r.profit || 0),
    netWorth: Number(r.netWorth || 0),
  }));

  const metricColor = selectedMetric === "revenue" ? "#00b894" : selectedMetric === "profit" ? "#6c5ce7" : "#ffc658";

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      {/* Stock Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4">
        <img
          src={`https://logo.clearbit.com/${ticker}.com`}
          alt={companyName}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-700">
            {companyName}
          </h2>
          <h3 className="text-xl sm:text-2xl font-bold">{ticker}</h3>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl sm:text-3xl font-semibold text-gray-900">
              ₹{INR(latest.close ?? 0)}
            </span>
            <span className={`text-base sm:text-lg font-medium ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
              {(change >= 0 ? "+" : "") + (change || 0).toFixed(2)} ({changePct}%)
            </span>
            <span className="text-xs sm:text-sm text-gray-500">
              {period.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-2 sm:p-4 mb-3">
        <ResponsiveContainer width="100%" height={300}>
          {chartType === "line" ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f3f3" />
              <XAxis dataKey="dateLabel" hide />
              <YAxis domain={["auto", "auto"]} hide />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: lineColor, strokeWidth: 2 }} />
              <Line type="monotone" dataKey="close" stroke={lineColor} dot={false} strokeWidth={2} activeDot={{ r: 4 }} />
            </LineChart>
          ) : (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f3f3" />
              <XAxis dataKey="dateLabel" hide />
              <YAxis domain={["auto", "auto"]} hide />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: lineColor, strokeWidth: 2 }} />
              <Area type="monotone" dataKey="close" stroke={lineColor} fill={lineColor} fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Period selector */}
      <div className="flex justify-center gap-1 sm:gap-2 mb-4 flex-wrap">
        {["1d", "1w", "1m", "3m", "6m", "1y", "3y", "5y", "all"].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-full border text-xs sm:text-sm font-medium ${
              period === p
                ? "bg-black text-white border-black"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Performance */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="text-lg text-black font-semibold mb-3">Performance</h3>

        {/* Today's Range */}
        <div className="mb-4">
          <div className="flex justify-between text-xs sm:text-sm text-gray-600">
            <span>Today's Low</span>
            <span>Today's High</span>
          </div>
          <div className="flex items-center">
            <span className="font-medium text-sm">₹{INR(dayLow)}</span>
            <RangeBar low={dayLow} high={dayHigh} current={dayCurrent} color="#16a34a" />
            <span className="font-medium text-sm">₹{INR(dayHigh)}</span>
          </div>
        </div>

        {/* 52 Week Range */}
        <div className="mb-4">
          <div className="flex justify-between text-xs sm:text-sm text-gray-600">
            <span>52W Low</span>
            <span>52W High</span>
          </div>
          <div className="flex items-center">
            <span className="font-medium text-sm">₹{INR(fiftyTwoWeekLow)}</span>
            <RangeBar low={fiftyTwoWeekLow} high={fiftyTwoWeekHigh} current={latest.close ?? 0} color="#2563eb" />
            <span className="font-medium text-sm">₹{INR(fiftyTwoWeekHigh)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Open</p>
            <p className="font-medium text-black">₹{INR(dayOpen)}</p>
          </div>
          <div>
            <p className="text-gray-500">Prev Close</p>
            <p className="font-medium text-black">₹{INR(dayPrevClose)}</p>
          </div>
          <div>
            <p className="text-gray-500">Volume</p>
            <p className="font-medium text-black">
              {Number(volume || 0).toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Total Traded Value</p>
            <p className="font-medium text-black">₹{tradedValueCr.toFixed(2)} Cr</p>
          </div>
        </div>
      </div>

      {/* Financials Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg text-black font-semibold">Financials</h3>
            <p className="text-xs text-gray-500 mt-1">*All values are in Rs. Cr</p>
          </div>

          {/* top metric tabs */}
          <div className="flex items-center gap-4">
            {["revenue", "profit", "netWorth"].map((m) => {
              const label = m === "revenue" ? "Revenue" : m === "profit" ? "Profit" : "Net Worth";
              const active = selectedMetric === m;
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMetric(m)}
                  className={`relative px-3 py-2 text-sm font-medium ${active ? "text-teal-600" : "text-gray-600"}`}
                >
                  <span>{label}</span>
                  {active && <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-10 h-1 rounded bg-teal-100"></div>}
                </button>
              );
            })}
          </div>
        </div>

        {loadingFinancials ? (
          <div className="py-10 text-center text-gray-500">Loading financials...</div>
        ) : metricData && metricData.length ? (
          <>
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis
                    tickFormatter={(value) => `${Number(value).toLocaleString("en-IN")}`}
                    label={{ value: '', angle: -90, position: 'insideLeft', offset: -10 }}
                  />
                  <Tooltip content={<FinancialTooltip />} />
                  <Bar
                    dataKey={selectedMetric}
                    fill={metricColor}
                    radius={[6, 6, 0, 0]}
                    label={<BarValueLabel />}
                    barSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex gap-4 items-center">
                <button
                  onClick={() => setFinancialView("quarterly")}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    financialView === "quarterly" ? "bg-teal-50 text-teal-600" : "bg-white text-gray-600 border border-gray-100"
                  }`}
                >
                  Quarterly
                </button>
                <button
                  onClick={() => setFinancialView("yearly")}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    financialView === "yearly" ? "bg-teal-50 text-teal-600" : "bg-white text-gray-600 border border-gray-100"
                  }`}
                >
                  Yearly
                </button>
              </div>

              <a href={`#/stock/${ticker}/financials`} className="text-teal-600 font-medium text-sm">
                See Details
              </a>
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-gray-500">No financial data available</div>
        )}
      </div>

      {/* Fundamentals */}
      {loadingFundamentals ? (
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-center">Loading fundamentals...</p>
        </div>
      ) : fundamentals ? (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg text-black font-semibold mb-3">Fundamentals</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {fundamentals.marketCap && (
              <div>
                <p className="text-gray-500">Market Cap</p>
                <p className="font-medium text-black">₹{INR((fundamentals.marketCap ?? 0) / 1e7)} Cr</p>
              </div>
            )}
            {fundamentals.roe && (
              <div>
                <p className="text-gray-500">ROE</p>
                <p className="font-medium text-black">{(fundamentals.roe * 100).toFixed(2)}%</p>
              </div>
            )}
            {fundamentals.peRatio && (
              <div>
                <p className="text-gray-500">P/E Ratio (TTM)</p>
                <p className="font-medium text-black">{fundamentals.peRatio.toFixed(2)}</p>
              </div>
            )}
            {fundamentals.eps && (
              <div>
                <p className="text-gray-500">EPS (TTM)</p>
                <p className="font-medium text-black">₹{fundamentals.eps.toFixed(2)}</p>
              </div>
            )}
            {fundamentals.pbRatio && (
              <div>
                <p className="text-gray-500">P/B Ratio</p>
                <p className="font-medium text-black">{fundamentals.pbRatio.toFixed(2)}</p>
              </div>
            )}
            {fundamentals.dividendYield && (
              <div>
                <p className="text-gray-500">Dividend Yield</p>
                <p className="font-medium text-black">{(fundamentals.dividendYield * 100).toFixed(2)}%</p>
              </div>
            )}
            {fundamentals.industryPE && (
              <div>
                <p className="text-gray-500">Industry P/E</p>
                <p className="font-medium text-black">{fundamentals.industryPE.toFixed(2)}</p>
              </div>
            )}
            {fundamentals.bookValue && (
              <div>
                <p className="text-gray-500">Book Value</p>
                <p className="font-medium text-black">₹{fundamentals.bookValue.toFixed(2)}</p>
              </div>
            )}
            {fundamentals.debtToEquity && (
              <div>
                <p className="text-gray-500">Debt to Equity</p>
                <p className="font-medium text-black">{fundamentals.debtToEquity.toFixed(2)}</p>
              </div>
            )}
            {fundamentals.faceValue && (
              <div>
                <p className="text-gray-500">Face Value</p>
                <p className="font-medium text-black">₹{fundamentals.faceValue}</p>
              </div>
            )}
            {fundamentals.profitMargin && (
              <div>
                <p className="text-gray-500">Profit Margin</p>
                <p className="font-medium text-black">{(fundamentals.profitMargin * 100).toFixed(2)}%</p>
              </div>
            )}
            {fundamentals.fiscalYear && (
              <div>
                <p className="text-gray-500">Fiscal Year</p>
                <p className="font-medium text-black">{fundamentals.fiscalYear}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-center text-gray-500">No fundamentals data available</p>
        </div>
      )}

      {/* Balance Sheet Section */}
      {loadingBalanceSheet ? (
        <div className="bg-white rounded-lg shadow p-4 mt-4">
          <p className="text-center">Loading balance sheet...</p>
        </div>
      ) : balanceSheet ? (
        <BalanceSheetSection years={balanceSheet.years || []} data={balanceSheet.data || []} />
      ) : (
        <div className="bg-white rounded-lg shadow p-4 mt-4">
          <p className="text-center text-gray-500">No balance sheet data available</p>
        </div>
      )}
    </div>
  );
}