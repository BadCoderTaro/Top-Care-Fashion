import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import NavBar from "@/components/NavBar";
import BackToTopButton from "@/components/BackToTopButton";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Initialize Geist fonts
const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: {
    default: "Top Care Fashion",
    template: "%s | Top Care Fashion"
  },
  description: "Discover your perfect style with Top Care Fashion - Your personal AI-powered fashion companion for outfit recommendations and style inspiration",
  keywords: ["fashion", "clothing", "style", "outfit", "wardrobe", "AI fashion", "fashion recommendation"],
  authors: [{ name: "Top Care Fashion Team" }],
  creator: "Top Care Fashion",
  publisher: "Top Care Fashion",
  icons: {
    icon: "/icon_14radius.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Top Care Fashion",
    title: "Top Care Fashion",
    description: "Your personal AI-powered fashion companion for outfit recommendations and style inspiration",
  },
  twitter: {
    card: "summary_large_image",
    title: "Top Care Fashion",
    description: "Your personal AI-powered fashion companion for outfit recommendations and style inspiration",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body
        className="antialiased"
      >
        <AuthProvider>
          <header>
            <NavBar />
          </header>
          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
          <BackToTopButton />
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}