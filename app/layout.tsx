import { Toaster } from "sonner";
import type { Metadata } from "next";
import { Mona_Sans, Geist } from "next/font/google"; // Added Geist for fallback

import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
  display: "swap", // Helps prevent layout shift
});

export const metadata: Metadata = {
  title: "SonicPrep | AI-Powered Mock Interviews",
  description: "Master your next job interview with real-time AI voice feedback and technical analysis.",
  icons: {
    icon: "/favicon.ico", 
    shortcut: "/logo3.png", // This will use your "Sonic Pulse" logo as the shortcut icon
    apple: "/logo3.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      className={cn("dark", geist.variable, monaSans.variable)}
      suppressHydrationWarning // Essential for font-hashing in Next.js 16
    >
      <body 
        className={cn(
          "min-h-screen bg-background antialiased pattern",
          monaSans.className
        )}
        suppressHydrationWarning // Fixes the hydration mismatch you saw earlier
      >
        {/* Main content container */}
        <main className="relative flex min-h-screen flex-col">
          {children}
        </main>

        {/* Improved Toaster for SonicPrep's dark theme */}
        <Toaster 
          position="bottom-right" 
          richColors 
          theme="dark" 
          closeButton 
        />
      </body>
    </html>
  );
}