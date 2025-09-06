import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import { useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import axios from "axios";

export default function App() {
  const { user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    const syncUserToDB = async () => {
      if (!user) return;

      try {
        const token = await getToken();
        if (!token) return;

        console.log("🪪 Token sending to backend:", token);

        await axios.post("http://localhost:5001/api/clerk/save-user", {
          name: user.fullName,
          email: user.primaryEmailAddress.emailAddress,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true,
        });

        console.log("✅ Clerk user synced to DB");
      } catch (error) {
        console.error("❌ Failed to sync Clerk user:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config
        });

        if (error.message === "Network Error") {
          console.error("⚠️ CORS Issue Detected. Check backend CORS configuration.");
          console.error("Ensure backend allows: http://localhost:5173");
        }
      }
    };

    if (user) syncUserToDB();
  }, [user, getToken]);

  return (
    // App shell: full width + white background
    <div className="w-full min-h-screen bg-white">
      <Navbar />
      {/* Add top padding so content doesn't go under the fixed navbar.
          Adjust pt-16/pt-20 depending on navbar height. */}
      <main className="min-h-screen pt-20">
        <Outlet />
      </main>
    </div>
  );
}
