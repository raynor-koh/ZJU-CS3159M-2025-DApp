import "./globals.css";

import Navbar from "@/components/Navbar";

export const metadata = { title: "ZJU-PolyMarket", description: "Decentralized Lottery" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
