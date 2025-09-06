import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-black pt-14">
      {/* Hero Section */}
      <section className="flex flex-col-reverse md:grid md:grid-cols-2 gap-10 px-6 md:px-20 py-12 items-center">
        {/* Left */}
        <div className="text-center md:text-left space-y-6">
          <h1 className="text-3xl sm:text-4xl font-bold">
            EquiForge: Your Stock Analysis Companion
          </h1>
          <p className="text-gray-600">
            EquiForge offers real-time stock insights and AI recommendations to help you invest smarter.
          </p>
          <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto">
              Explore Stocks
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">
              Get Recommendation
            </Button>
          </div>
        </div>

        {/* Right */}
        <div className="flex justify-center">
          <img
            src="https://images.pexels.com/photos/7948002/pexels-photo-7948002.jpeg"
            alt="Interactive stock analysis dashboard"
            className="w-full max-w-xs sm:max-w-md rounded-xl border"
            loading="lazy"
          />
        </div>
      </section>

      {/* Market Summary Section */}
      <section className="bg-gray-50 py-10 px-4 md:px-20">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 text-center">
          <div>
            <h3 className="text-gray-500 text-sm mb-1">Market Overview</h3>
            <p className="text-xl font-bold">Live Updates</p>
          </div>
          <div>
            <h3 className="text-gray-500 text-sm mb-1">Current Trends</h3>
            <p className="text-xl font-bold text-green-600">Bullish</p>
          </div>
          <div>
            <h3 className="text-gray-500 text-sm mb-1">Top Gainers</h3>
            <p className="text-xl font-bold text-blue-600">+5%</p>
          </div>
          <div>
            <h3 className="text-gray-500 text-sm mb-1">Market Sentiment</h3>
            <p className="text-xl font-bold text-green-500">Positive</p>
          </div>
        </div>
      </section>
    </div>
  );
}
