import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { logInfo } from "@/lib/logger";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Player Tracker",
  description: "Game player data tracking and analytics system",
};

// Log environment on server startup
if (typeof window === 'undefined') {
  logInfo('RootLayout', 'Server-side initialization', {
    nodeEnv: process.env.NODE_ENV,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    databaseUrlExists: !!process.env.DATABASE_URL,
    nextAuthSecretExists: !!process.env.NEXTAUTH_SECRET
  });
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Client-side logging
  if (typeof window !== 'undefined') {
    logInfo('RootLayout', 'Client-side render', {
      currentUrl: window.location.href
    });
  }
  
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
