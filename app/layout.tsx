import ThemeToaster from "@/components/ThemeToaster";
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{if(localStorage.getItem("sonic-theme")==="light"){document.documentElement.classList.remove("dark");document.documentElement.classList.add("light")}}catch(e){}',
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <main className="relative flex min-h-screen flex-col">{children}</main>
        <ThemeToaster />
      </body>
    </html>
  );
}
