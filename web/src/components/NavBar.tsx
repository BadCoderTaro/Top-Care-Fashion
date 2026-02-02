"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import { useAuth } from "./AuthContext";

export default function NavBar() {
  const { user, isAuthenticated, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  return (
    <nav className="w-full bg-[var(--brand-color)] text-white relative z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="Top Care Fashion home">
          <Image src="/logo_white.svg" alt="Top Care Fashion" width={120} height={32} priority />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-5 text-sm font-medium">
          <Link href="/#features" className="hover:opacity-90">Features</Link>
          <Link href="/#community" className="hover:opacity-90">Community</Link>
          <Link href="/#pricing" className="hover:opacity-90">Pricing</Link>
          <Link href="/#download" className="hover:opacity-90">Download</Link>
          <Link href="/faq" className="hover:opacity-90">FAQ</Link>
          {!isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link href="/signin" className="hover:opacity-90">Login</Link>
              <Link href="/register" className="inline-flex items-center rounded-md bg-white text-[var(--brand-color)] px-3 py-1.5 font-semibold hover:opacity-90">Register</Link>
            </div>
          ) : (
            <div
              className="relative"
              onMouseEnter={() => {
                if (closeTimer.current) {
                  clearTimeout(closeTimer.current);
                  closeTimer.current = null;
                }
                setOpen(true);
              }}
              onMouseLeave={() => {
                if (closeTimer.current) clearTimeout(closeTimer.current);
                // delay close slightly to allow pointer to move into dropdown
                closeTimer.current = window.setTimeout(() => {
                  setOpen(false);
                  closeTimer.current = null;
                }, 150);
              }}
            >
              <button className="inline-flex items-center gap-2 rounded-md border border-white/25 px-3 py-1.5 hover:bg-white/10">
                <span className="font-semibold">{user?.username || user?.email}</span>
                <span className="text-xs">▾</span>
              </button>
              {open && (
                <div className="absolute right-0 mt-1 w-56 rounded-md border border-black/10 bg-white text-black shadow z-50">
                  <div className="px-3 py-2 text-xs text-black/60">Signed in as <span className="font-medium text-black">{user?.username || user?.email}</span></div>
                  <div className="py-1 text-xs text-black/50 border-t" />
                  <Link href="/profile" className="block px-3 py-2 text-sm hover:bg-black/5">Profile</Link>
                  {user?.actor === "Admin" && (
                    <>
                      <div className="py-1 text-xs text-black/50 border-t" />
                      <div className="px-3 py-1 text-xs font-medium text-black/70">Admin</div>
                      <Link href="/admin" className="block px-3 py-2 text-sm hover:bg-black/5">Admin Home</Link>
                      <Link href="/admin/dashboard" className="block px-3 py-2 text-sm hover:bg-black/5">Dashboard</Link>
                      <Link href="/admin/users" className="block px-3 py-2 text-sm hover:bg-black/5">Users</Link>
                      <Link href="/admin/conversations" className="block px-3 py-2 text-sm hover:bg-black/5">Conversations</Link>
                      <Link href="/admin/support" className="block px-3 py-2 text-sm hover:bg-black/5">TOP Support</Link>
                      <Link href="/admin/categories" className="block px-3 py-2 text-sm hover:bg-black/5">Categories</Link>
                      <Link href="/admin/listings" className="block px-3 py-2 text-sm hover:bg-black/5">Listings</Link>
                      <Link href="/admin/promotions" className="block px-3 py-2 text-sm hover:bg-black/5">Boosted Listings</Link>
                      <Link href="/admin/transactions" className="block px-3 py-2 text-sm hover:bg-black/5">Transactions</Link>
                      <Link href="/admin/reports" className="block px-3 py-2 text-sm hover:bg-black/5">Flags</Link>
                      <Link href="/admin/listing-images" className="block px-3 py-2 text-sm hover:bg-black/5">Listing Images</Link>
                      <Link href="/admin/feedback" className="block px-3 py-2 text-sm hover:bg-black/5">Feedback</Link>
                      <Link href="/admin/faq" className="block px-3 py-2 text-sm hover:bg-black/5">FAQ</Link>
                      <Link href="/admin/content" className="block px-3 py-2 text-sm hover:bg-black/5">Landing Page</Link>
                    </>
                  )}
                  <div className="py-1 text-xs text-black/50 border-t" />
                  <button className="block w-full text-left px-3 py-2 text-sm hover:bg-black/5" onClick={() => { setOpen(false); signOut(); }}>Sign out</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Hamburger Menu Button */}
        <button
          className="md:hidden p-2 hover:bg-white/10 rounded-md"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/20 bg-[var(--brand-color)]">
          <div className="px-4 py-3 space-y-3 text-sm font-medium">
            <Link href="/#features" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Features</Link>
            <Link href="/#community" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Community</Link>
            <Link href="/#pricing" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
            <Link href="/#download" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Download</Link>
            <Link href="/faq" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>FAQ</Link>

            {!isAuthenticated ? (
              <>
                <div className="border-t border-white/20 pt-3 mt-3">
                  <Link href="/signin" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                  <Link
                    href="/register"
                    className="block mt-2 text-center rounded-md bg-white text-[var(--brand-color)] px-4 py-2 font-semibold hover:opacity-90"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="border-t border-white/20 pt-3 mt-3">
                  <div className="py-2 font-semibold">{user?.username || user?.email}</div>
                  <Link href="/profile" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
                  {user?.actor === "Admin" && (
                    <>
                      <div className="border-t border-white/20 pt-3 mt-3">
                        <div className="py-1 text-xs font-medium opacity-70">Admin</div>
                        <Link href="/admin" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Admin Home</Link>
                        <Link href="/admin/dashboard" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                        <Link href="/admin/users" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Users</Link>
                        <Link href="/admin/conversations" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Conversations</Link>
                        <Link href="/admin/support" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>TOP Support</Link>
                        <Link href="/admin/categories" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Categories</Link>
                        <Link href="/admin/listings" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Listings</Link>
                        <Link href="/admin/promotions" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Boosted Listings</Link>
                        <Link href="/admin/transactions" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Transactions</Link>
                        <Link href="/admin/reports" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Flags</Link>
                        <Link href="/admin/listing-images" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Listing Images</Link>
                        <Link href="/admin/feedback" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Feedback</Link>
                        <Link href="/admin/faq" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>FAQ</Link>
                        <Link href="/admin/content" className="block py-2 hover:opacity-90" onClick={() => setMobileMenuOpen(false)}>Landing Page</Link>
                      </div>
                    </>
                  )}
                  <button
                    className="block w-full text-left py-2 hover:opacity-90 border-t border-white/20 mt-3 pt-3"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
