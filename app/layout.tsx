import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Trip Planner – plan, travel and earn points";
const description =
  "Plan a whole trip on a map with times, live directions, weather and opening hours. Travel it step by step and earn points and badges.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: "Trip Planner",
  openGraph: { title, description, type: "website", siteName: "Trip Planner" },
  twitter: { card: "summary", title, description },
  appleWebApp: { capable: true, title: "Trip Planner", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
