import { Toaster } from "sonner";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SonicPrep | AI-Powered Mock Interviews",
  description:
    "Practice realistic AI voice interviews and build confidence with actionable feedback.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 font-sans antialiased">
        <main className="relative flex min-h-screen flex-col">{children}</main>
        <Toaster position="bottom-right" richColors theme="dark" closeButton />
      </body>
    </html>
  );
}
