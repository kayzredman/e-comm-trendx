import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TrendMarga",
  description: "Shop the latest trends — fast delivery across Ghana",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "TrendMarga",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "TrendMarga",
    description: "Shop the latest trends — fast delivery across Ghana",
    type: "website",
  },
  icons: {
    apple: "/icons/icon-192.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} h-full`}>
        <head>
          <meta name="theme-color" content="#1A1A2E" />
          <meta name="mobile-web-app-capable" content="yes" />
        </head>
        <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
      </html>
    </ClerkProvider>
  );
}
