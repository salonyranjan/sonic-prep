import Link from "next/link";
import Image from "next/image";
import { ReactNode, Suspense } from "react";
import { redirect } from "next/navigation";

import { isAuthenticated } from "@/lib/actions/auth.action";

const Layout = async ({ children }: { children: ReactNode }) => {
  let isUserAuthenticated = false;
  
  try {
    isUserAuthenticated = await isAuthenticated();
  } catch (error) {
    console.error("Authentication check failed:", error);
    redirect("/sign-in");
  }

  if (!isUserAuthenticated) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-purple-900/20 to-black">
      {/* Reduced py-4 to py-2 for a shorter height */}
      <nav className="flex justify-between items-center py-2 px-6 border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <Link 
          href="/" 
          className="flex items-center gap-2 hover:opacity-90 transition-all duration-300 group"
          aria-label="SonicPrep Home"
        >
         {/* Logo height set to h-12 to keep it clear but the nav slim */}
<Image 
  src="/logo4.png" 
  alt="SonicPrep Logo" 
  width={150} 
  height={100}
  // Changed h-30 to h-12 and added the fix for the aspect ratio warning
  className="object-contain w-auto h-20 group-hover:scale-105 transition-transform duration-300" 
  priority 
/>
          {/* Reduced text size from text-3xl to text-xl/2xl */}
          <h2 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
           A Real-Time Voice Agent Interview Platform
          </h2>
        </Link>

        {/* User menu - made slightly smaller (w-8 h-8) */}
        <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/20 transition-all">
          <span className="text-white/70 text-xs font-medium">U</span>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64 bg-black/20 rounded-xl animate-pulse">
            <div className="text-white/50 text-lg">Loading...</div>
          </div>
        }>
          {children}
        </Suspense>
      </main>
    </div>
  );
};

export default Layout;