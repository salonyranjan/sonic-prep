import Link from "next/link";
import Image from "next/image";
import { ReactNode, Suspense } from "react";
import { redirect } from "next/navigation";
import { Zap, ShieldCheck } from "lucide-react";

import { isAuthenticated, getCurrentUser } from "@/lib/actions/auth.action";

const Layout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();

  if (!isUserAuthenticated) {
    redirect("/sign-in");
  }

  const user = await getCurrentUser();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-purple-900/20 to-black text-white">
      {/* Navbar – sticky, slim, with better visual hierarchy */}
      <nav className="flex justify-between items-center py-3 px-6 border-b border-white/10 bg-black/60 backdrop-blur-xl shadow-lg sticky top-0 z-50">
        {/* Logo + Brand (same as before) */}
        <Link
          href="/"
          className="flex items-center gap-3 hover:brightness-110 transition-all duration-300 group"
          aria-label="SonicPrep Home"
        >
          <div className="relative">
            <Image
              src="/logo4.png"
              alt="SonicPrep Logo"
              width={150}
              height={100}
              className="w-auto h-16 object-contain group-hover:scale-105 transition-transform duration-300"
              priority
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                SonicPrep
              </span>
            </h1>
            <p className="text-xs text-white/60 -mt-0.5">
              Real‑Time Voice Agent Interview Platform
            </p>
          </div>
        </Link>

        {/* Right Side Actions – only what you asked for */}
        <div className="flex items-center gap-5">
          <Link
            href="/interview"
            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            Practice
          </Link>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-xs font-semibold text-white">
                {user?.name?.split(" ")[0] || "Candidate"}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5" /> Verified
              </span>
            </div>

            <div className="w-9 h-9 rounded-full ring-1 ring-white/10 bg-gradient-to-tr from-zinc-800 to-zinc-900 flex items-center justify-center cursor-pointer hover:ring-purple-500/50 transition-all overflow-hidden">
              {user?.imageUrl ? (
                <Image src={user.imageUrl} alt="Profile" width={36} height={36} />
              ) : (
                <span className="text-xs font-bold text-zinc-400">
                  {user?.name?.charAt(0) || "U"}
                </span>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-20 bg-black/20 rounded-xl animate-pulse">
              <div className="w-12 h-12 rounded-full bg-white/20 mb-4"></div>
              <div className="text-white/50 text-lg">Loading interview data...</div>
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
    </div>
  );
};

export default Layout;