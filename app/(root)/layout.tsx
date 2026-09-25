import Link from "next/link";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AudioLines, LogOut } from "lucide-react";
import { getCurrentUser, signOut } from "@/lib/actions/auth.action";

export default async function Layout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav
        aria-label="Main navigation"
        className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-lg text-lg font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-primary-200"
          >
            <AudioLines
              className="text-primary-200"
              size={24}
              aria-hidden="true"
            />
            SonicPrep
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/interview"
              className="inline-flex min-h-11 items-center rounded text-sm text-zinc-300 hover:text-primary-200"
            >
              Practice
            </Link>
            <span className="hidden max-w-40 truncate text-sm text-zinc-400 sm:block">
              {user.name}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut();
                redirect("/sign-in");
              }}
            >
              <button
                type="submit"
                aria-label="Sign out"
                className="flex size-11 items-center justify-center rounded-xl border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-primary-200"
              >
                <LogOut size={18} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </nav>
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        {children}
      </div>
    </div>
  );
}
