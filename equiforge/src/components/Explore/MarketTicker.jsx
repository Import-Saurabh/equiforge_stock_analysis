import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function MarketTicker({ data }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -150 : 150,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative w-full border-b bg-white overflow-hidden">
      {/* Left Scroll Button - Mobile only */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 bg-white p-1 rounded-full shadow md:hidden z-10"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide scroll-smooth px-4 py-2 space-x-8 text-sm font-medium"
      >
        {data.map((item) => (
          <div key={item.symbol} className="flex items-center gap-2 whitespace-nowrap">
            <span className="font-semibold text-gray-900">{item.symbol}</span>
            <span className="text-gray-600">{item.price}</span>
            <span
              className={`${
                item.change < 0 ? "text-red-500" : "text-green-500"
              }`}
            >
              {item.change} ({item.percentChange}%)
            </span>
          </div>
        ))}
      </div>

      {/* Right Scroll Button - Mobile only */}
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-white p-1 rounded-full shadow md:hidden z-10"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
