import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/Button";
import { Menu, X } from "lucide-react";
import { SignInButton, UserButton, useUser } from "@clerk/clerk-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isSignedIn } = useUser();

  return (
    <>
      {/* Top Navbar: full width fixed */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b shadow-sm bg-white px-4 md:px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link to="/" className="text-2xl font-bold text-orange-600">📈 EquiForge</Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link to="#">How it works</Link>
            <Link to="#">Blog</Link>
            <Link to="#">About</Link>
            <Link to="#">Contact</Link>
            <Link to="/explore">Explore</Link>

            {isSignedIn ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <SignInButton mode="modal">
                <Button className="ml-4">Login</Button>
              </SignInButton>
            )}
          </nav>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 rounded-md"
            onClick={() => setIsOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar (slides in from right) */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-white z-50 shadow-md transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <h2 className="text-lg font-semibold text-orange-600">EquiForge</h2>
          <button onClick={() => setIsOpen(false)} aria-label="Close menu">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex flex-col p-4 space-y-4 text-sm font-medium">
          <Link to="#" onClick={() => setIsOpen(false)}>How it works</Link>
          <Link to="#" onClick={() => setIsOpen(false)}>Blog</Link>
          <Link to="#" onClick={() => setIsOpen(false)}>About</Link>
          <Link to="#" onClick={() => setIsOpen(false)}>Contact</Link>
          <Link to="/explore" onClick={() => setIsOpen(false)}>Explore</Link>

          {isSignedIn ? (
            <div className="mt-4">
              <UserButton afterSignOutUrl="/" />
            </div>
          ) : (
            <SignInButton mode="modal">
              <Button className="mt-4 w-full" onClick={() => setIsOpen(false)}>Login</Button>
            </SignInButton>
          )}
        </nav>
      </div>
    </>
  );
}
